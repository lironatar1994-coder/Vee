const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const db = require('./database');
const geminiService = require('./gemini-service');

const STATUS_FILE = path.join(__dirname, 'whatsapp_status.json');

// Admin Alert Service setup
const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY || 'fake_key' // Don't crash if loading config separately, it handles gracefully below
    }
});

function sendAdminAlert(subject, text) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY not set. Cannot send admin alert.');
        return;
    }
    transporter.sendMail({
        from: process.env.EMAIL_FROM || 'Vee Alerts <onboarding@resend.dev>',
        to: 'lironatar94@gmail.com',
        subject: subject,
        text: text
    }).catch(err => console.error('[WhatsApp Worker] Failed to send admin alert', err));
}

// Helper to write status to JSON for the main server.js to read
function updateStatus(status, qrDataUrl = null) {
    const payload = {
        status: status, // 'INITIALIZING', 'NEEDS_SCAN', 'READY', 'ERROR'
        qr: qrDataUrl,
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2));
    console.log(`[WhatsApp Worker] Status updated: ${status}`);
}

updateStatus('INITIALIZING');

const client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '.wwebjs_auth') }),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', async (qr) => {
    console.log('[WhatsApp Worker] QR Code received, needs scanning.');
    try {
        const qrDataUrl = await qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' });
        updateStatus('NEEDS_SCAN', qrDataUrl);
        sendAdminAlert('Vee Alert: WhatsApp Disconnected', 'The Vee WhatsApp integration was disconnected and requires a new QR code scan. Please visit the admin dashboard to scan it.');
    } catch (err) {
        console.error('Failed to generate QR Data URL', err);
    }
});

client.on('ready', () => {
    console.log('[WhatsApp Worker] Client is ready!');
    updateStatus('READY');
});

client.on('authenticated', () => {
    console.log('[WhatsApp Worker] Authenticated successfully!');
});

client.on('auth_failure', (msg) => {
    console.error('[WhatsApp Worker] Authentication failure:', msg);
    updateStatus('ERROR');
});

client.on('disconnected', (reason) => {
    console.log('[WhatsApp Worker] Client was logged out or disconnected:', reason);
    updateStatus('NEEDS_SCAN');
    sendAdminAlert('Vee Alert: WhatsApp Logged Out', `The WhatsApp client disconnected. Reason: ${reason}`);
});

// helper to clean up puppeteer locks on linux
try {
    const sessionDir = path.join(__dirname, '.wwebjs_auth', 'session');
    if (fs.existsSync(sessionDir)) {
        const lockFile = path.join(sessionDir, 'SingletonLock');
        if (fs.existsSync(lockFile)) {
            console.log('[WhatsApp Worker] Removing stale SingletonLock...');
            fs.unlinkSync(lockFile);
        }
    }
} catch (err) {
    console.warn('[WhatsApp Worker] Failed to clean up SingletonLock (might not exist):', err.message);
}

// --- Incoming Message Handler ---
client.on('message', async msg => {
    // 1. Ignore system/group messages
    if (msg.from.includes('@g.us') || msg.isStatus) return;

    // 2. Format phone number & lookup user
    let phoneNum = msg.from.split('@')[0];
    if (phoneNum.startsWith('972')) phoneNum = '0' + phoneNum.substring(3);
    
    // Look for user with this phone AND whatsapp_enabled
    const user = db.prepare('SELECT id, username FROM users WHERE phone = ? AND whatsapp_enabled = 1').get(phoneNum);
    if (!user) return; // Unregistered or disabled user

    // Check if task adder globally enabled
    const enabledSetting = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_task_adder_enabled'").get();
    const isEnabled = enabledSetting ? enabledSetting.value !== 'false' : true;
    
    if (!isEnabled) {
        try {
            const msgSetting = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_task_adder_disabled_msg'").get();
            const disabledMsg = msgSetting ? msgSetting.value.replace(/\\n/g, '\n') : 'יצירת משימות דרך וואטסאפ מושבתת כרגע.';
            await msg.reply(disabledMsg);
        } catch(e) {
            console.error('[WhatsApp Worker] Failed to send disabled msg', e);
        }
        return;
    }

    try {
        // 3. Call Gemini Service
        const taskData = await geminiService.parseTaskMessage(msg.body);

        // 4. Find Inbox (project_id IS NULL)
        let inbox = db.prepare('SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL LIMIT 1').get(user.id);
        if (!inbox) {
            const res = db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('Inbox', ?, NULL)").run(user.id);
            inbox = { id: res.lastInsertRowid };
        }

        // 5. Calculate Order Index
        const maxOrder = db.prepare('SELECT MAX(order_index) as maxIdx FROM checklist_items WHERE checklist_id = ?').get(inbox.id);
        const order_index = (maxOrder && maxOrder.maxIdx !== null) ? maxOrder.maxIdx + 1 : 0;

        // 6. DB Insertion
        db.prepare(`
            INSERT INTO checklist_items 
            (checklist_id, content, order_index, target_date, time, duration) 
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(inbox.id, taskData.content, order_index, taskData.target_date || null, taskData.time || null, taskData.duration || 15);

        // 7. Construct Server-Side Confirmation Message (Hebrew)
        let replyMsg = `המשימה הבאה נוצרה: *${taskData.content}*`;
        
        if (taskData.target_date && taskData.target_date !== 'null') {
            const dateObj = new Date(taskData.target_date);
            const hebrewDay = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(dateObj);
            const formattedDate = new Intl.DateTimeFormat('he-IL').format(dateObj);
            replyMsg += `\nמתי: ${hebrewDay} (${formattedDate})`;
        }
        
        if (taskData.time && taskData.time !== 'null') {
            replyMsg += `\nשעה: ${taskData.time}`;
        }

        if (taskData.duration && taskData.duration !== 15) { 
            replyMsg += `\nמשך זמן: ${taskData.duration} דקות`;
        }

        // 8. Reply
        await msg.reply(replyMsg);
    } catch (e) {
        console.error("[WhatsApp Worker] Error creating task via WhatsApp", e);
    }
});

client.initialize();

// --- Cron Scheduler ---
// Run every 60 seconds to check for due reminders
setInterval(() => {
    if (client.info === undefined || !client.info.wid) {
        // Not ready yet
        return;
    }

    try {
        const now = new Date();
        const currentDateStr = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

        // 1. Get all incomplete tasks with a valid time and a specified reminder, joined with users who have WhatsApp enabled
        // Also checking ci.whatsapp_last_sent_date != currentDateStr to ensure we only send ONE reminder per day for recurring tasks (or single tasks).
        const query = `
            SELECT 
                ci.id, ci.content, ci.time, ci.target_date, ci.reminder_minutes, ci.whatsapp_last_sent_date,
                u.id as user_id, u.phone, u.username
            FROM checklist_items ci
            JOIN checklists c ON ci.checklist_id = c.id
            JOIN users u ON c.user_id = u.id
            WHERE ci.time IS NOT NULL 
              AND ci.time != ''
              AND ci.target_date IS NOT NULL
              AND ci.reminder_minutes IS NOT NULL
              AND (ci.whatsapp_last_sent_date IS NULL OR ci.whatsapp_last_sent_date != ?)
              AND ci.target_date = ?
              AND u.whatsapp_enabled = 1
              AND u.phone IS NOT NULL
              AND u.phone != ''
        `;

        const tasks = db.prepare(query).all(currentDateStr, currentDateStr);

        for (const task of tasks) {
            // Task time string is typically "HH:MM"
            const [hours, minutes] = task.time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) continue;

            const taskDateTime = new Date(); // In Israel Timezone now
            taskDateTime.setHours(hours, minutes, 0, 0);

            // Calculate when the reminder SHOULD fire
            const reminderTime = new Date(taskDateTime.getTime() - task.reminder_minutes * 60000);

            // If the current time is at or strictly AFTER the reminder time
            if (now.getTime() >= reminderTime.getTime()) {
                // Formatting phone number
                let phoneNum = task.phone.replace(/[^0-9]/g, ''); // strip non-digits
                
                // Default to Israel code +972 if it's a 10 digit local cellular (05X...)
                if (phoneNum.startsWith('05') && phoneNum.length === 10) {
                    phoneNum = '972' + phoneNum.substring(1);
                }
                const chatId = phoneNum + '@c.us';

                // Fetch dynamic template from settings
                let templateSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('whatsapp_template');
                let templateStr = templateSetting ? templateSetting.value : "*_Vee Reminder_*\nשלום {user_name},\n\nתזכורת למשימה: *{task_name}*\nנקבע לשעה: {task_time}\n\nבהצלחה!";

                // Safe interpolation of dynamic variables
                const reminderMsg = templateStr
                    .replace(/{user_name}/g, task.username || '')
                    .replace(/{task_name}/g, task.content || '')
                    .replace(/{task_time}/g, task.time || '')
                    // Support converting literal \n to actual line breaks if saved escaped in some UI
                    .replace(/\\n/g, '\n');

                client.sendMessage(chatId, reminderMsg).then(() => {
                    console.log(`[WhatsApp Worker] Sent reminder for task ${task.id} to ${phoneNum}`);
                    // Log success
                    db.prepare('INSERT INTO whatsapp_logs (user_id, phone, message, status) VALUES (?, ?, ?, ?)').run(
                        task.user_id, phoneNum, reminderMsg, 'success'
                    );
                    // Mark as sent for today
                    db.prepare('UPDATE checklist_items SET whatsapp_last_sent_date = ? WHERE id = ?').run(currentDateStr, task.id);
                }).catch(err => {
                    console.error(`[WhatsApp Worker] Error sending message to ${phoneNum}:`, err);
                    // Log failure
                    db.prepare('INSERT INTO whatsapp_logs (user_id, phone, message, status, error) VALUES (?, ?, ?, ?, ?)').run(
                        task.user_id, phoneNum, reminderMsg, 'failed', err.message
                    );
                });
            }
        }

        // --- Process Outbox (Broadcasts) ---
        const outboxItems = db.prepare("SELECT * FROM whatsapp_outbox WHERE status = 'pending' LIMIT 50").all();
        for (const outboxMsg of outboxItems) {
            let phoneNum = outboxMsg.to_phone;
            if (phoneNum.startsWith('0')) {
                phoneNum = '972' + phoneNum.substring(1);
            }
            const chatId = phoneNum + '@c.us';
            
            client.sendMessage(chatId, outboxMsg.message).then(() => {
                console.log(`[WhatsApp Worker] Sent broadcast ${outboxMsg.id} to ${phoneNum}`);
                db.prepare("UPDATE whatsapp_outbox SET status = 'sent' WHERE id = ?").run(outboxMsg.id);
            }).catch(err => {
                console.error(`[WhatsApp Worker] Failed broadcast ${outboxMsg.id} to ${phoneNum}:`, err);
                db.prepare("UPDATE whatsapp_outbox SET status = 'failed' WHERE id = ?").run(outboxMsg.id);
            });
        }

    } catch (err) {
        console.error('[WhatsApp Worker] Cron interval error:', err);
    }
}, 60000);

console.log('[WhatsApp Worker] Initialized wrapper and cron scheduler. Connecting to WhatsApp...');
