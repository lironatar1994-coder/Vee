const { Boom } = require('@hapi/boom');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const db = require('./database');
const geminiService = require('./gemini-service');

const STATUS_FILE = path.join(__dirname, 'whatsapp_status.json');
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const logger = pino({ level: 'silent' });

let sock = null;
let reconnectTimer = null;
let isConnecting = false;
let isConnected = false;
let isProcessingCycle = false;
let sendCycleTimerStarted = false;

const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY || 'fake_key'
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
        subject,
        text
    }).catch(err => console.error('[WhatsApp Worker] Failed to send admin alert', err));
}

function updateStatus(status, qrDataUrl = null, extra = {}) {
    const payload = {
        status,
        qr: qrDataUrl,
        updatedAt: new Date().toISOString(),
        ...extra
    };

    fs.writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2));
    console.log(`[WhatsApp Worker] Status updated: ${status}`);
}

function normalizePhoneNumber(rawPhone) {
    let phoneNum = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (phoneNum.startsWith('0')) {
        phoneNum = '972' + phoneNum.substring(1);
    }
    return phoneNum;
}

function normalizeIncomingPhone(rawPhone) {
    let phoneNum = String(rawPhone || '').replace(/[^0-9]/g, '');
    if (phoneNum.startsWith('972')) {
        phoneNum = '0' + phoneNum.substring(3);
    }
    return phoneNum;
}

function extractMessageText(message) {
    const content =
        message?.ephemeralMessage?.message ||
        message?.viewOnceMessage?.message ||
        message?.viewOnceMessageV2?.message ||
        message?.viewOnceMessageV2Extension?.message ||
        message;

    return (
        content?.conversation ||
        content?.extendedTextMessage?.text ||
        content?.imageMessage?.caption ||
        content?.videoMessage?.caption ||
        content?.documentMessage?.caption ||
        ''
    ).trim();
}

function getRecipientJid(phoneNum) {
    const normalized = normalizePhoneNumber(phoneNum);
    if (!normalized) return null;
    return `${normalized}@s.whatsapp.net`;
}

async function resolveRecipientJid(phoneNum) {
    const jid = getRecipientJid(phoneNum);
    if (!jid || !sock?.onWhatsApp) {
        return jid;
    }

    try {
        const [result] = await sock.onWhatsApp(jid);
        if (result?.exists && result?.jid) {
            return result.jid;
        }
        return null;
    } catch (error) {
        console.error(`[WhatsApp Worker] Failed to resolve recipient ${phoneNum}:`, error);
        return null;
    }
}

async function sendReply(remoteJid, text, quoted = undefined) {
    if (!sock || !remoteJid) return;
    await sock.sendMessage(remoteJid, { text }, quoted ? { quoted } : undefined);
}

async function handleIncomingMessage(message) {
    if (!message?.message) return;
    if (message.key?.fromMe) return;

    const remoteJid = message.key?.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
        return;
    }

    const text = extractMessageText(message.message);
    if (!text) return;

    if (process.env.WHATSAPP_ECHO_TEST === 'true') {
        await sendReply(remoteJid, `Echo: ${text}`, message);
        return;
    }

    const incomingPhone = normalizeIncomingPhone(remoteJid.split('@')[0]);
    const user = db.prepare('SELECT id, username FROM users WHERE phone = ? AND whatsapp_enabled = 1').get(incomingPhone);
    if (!user) return;

    const enabledSetting = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_task_adder_enabled'").get();
    const isEnabled = enabledSetting ? enabledSetting.value !== 'false' : true;

    if (!isEnabled) {
        const msgSetting = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp_task_adder_disabled_msg'").get();
        const disabledMsg = msgSetting ? msgSetting.value.replace(/\\n/g, '\n') : 'יצירת משימות דרך וואטסאפ מושבתת כרגע.';
        await sendReply(remoteJid, disabledMsg, message);
        return;
    }

    try {
        const taskData = await geminiService.parseTaskMessage(text);

        let inbox = db.prepare('SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL LIMIT 1').get(user.id);
        if (!inbox) {
            const inserted = db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('Inbox', ?, NULL)").run(user.id);
            inbox = { id: inserted.lastInsertRowid };
        }

        const maxOrder = db.prepare('SELECT MAX(order_index) as maxIdx FROM checklist_items WHERE checklist_id = ?').get(inbox.id);
        const orderIndex = maxOrder && maxOrder.maxIdx !== null ? maxOrder.maxIdx + 1 : 0;

        db.prepare(`
            INSERT INTO checklist_items
            (checklist_id, content, order_index, target_date, time, duration)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            inbox.id,
            taskData.content,
            orderIndex,
            taskData.target_date || null,
            taskData.time || null,
            taskData.duration || 15
        );

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

        await sendReply(remoteJid, replyMsg, message);
    } catch (error) {
        console.error('[WhatsApp Worker] Error creating task via WhatsApp', error);
        await sendReply(remoteJid, 'אירעה שגיאה ביצירת המשימה. נסה שוב מאוחר יותר.', message).catch(() => {});
    }
}

async function processSendCycle() {
    if (isProcessingCycle || !sock || !isConnected) {
        return;
    }

    isProcessingCycle = true;

    try {
        const now = new Date();
        const currentDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        const reminderQuery = `
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

        const tasks = db.prepare(reminderQuery).all(currentDateStr, currentDateStr);

        for (const task of tasks) {
            const [hours, minutes] = String(task.time).split(':').map(Number);
            if (Number.isNaN(hours) || Number.isNaN(minutes)) continue;

            const taskDateTime = new Date();
            taskDateTime.setHours(hours, minutes, 0, 0);
            const reminderTime = new Date(taskDateTime.getTime() - task.reminder_minutes * 60000);

            if (now.getTime() < reminderTime.getTime()) continue;

            const recipientJid = await resolveRecipientJid(task.phone);
            const reminderTemplate = db.prepare('SELECT value FROM settings WHERE key = ?').get('whatsapp_template');
            const templateStr = reminderTemplate ? reminderTemplate.value : `*_Vee Reminder_*\nHello {user_name},\n\nReminder: *{task_name}*\nTime: {task_time}\n\nThanks!`;
            const reminderMsg = templateStr
                .replace(/{user_name}/g, task.username || '')
                .replace(/{task_name}/g, task.content || '')
                .replace(/{task_time}/g, task.time || '')
                .replace(/\\n/g, '\n');

            if (!recipientJid) {
                console.error(`[WhatsApp Worker] Skipping reminder for task ${task.id}: recipient ${task.phone} is not reachable on WhatsApp`);
                db.prepare('INSERT INTO whatsapp_logs (user_id, phone, message, status, error) VALUES (?, ?, ?, ?, ?)').run(
                    task.user_id,
                    normalizePhoneNumber(task.phone),
                    reminderMsg,
                    'failed',
                    'Recipient is not available on WhatsApp'
                );
                continue;
            }

            try {
                await sock.sendMessage(recipientJid, { text: reminderMsg });
                db.prepare('INSERT INTO whatsapp_logs (user_id, phone, message, status) VALUES (?, ?, ?, ?)').run(
                    task.user_id,
                    normalizePhoneNumber(task.phone),
                    reminderMsg,
                    'success'
                );
                db.prepare('UPDATE checklist_items SET whatsapp_last_sent_date = ? WHERE id = ?').run(currentDateStr, task.id);
                console.log(`[WhatsApp Worker] Sent reminder for task ${task.id} to ${task.phone}`);
            } catch (error) {
                console.error(`[WhatsApp Worker] Error sending reminder to ${task.phone}:`, error);
                db.prepare('INSERT INTO whatsapp_logs (user_id, phone, message, status, error) VALUES (?, ?, ?, ?, ?)').run(
                    task.user_id,
                    normalizePhoneNumber(task.phone),
                    reminderMsg,
                    'failed',
                    error.message
                );
            }
        }

        const outboxItems = db.prepare("SELECT * FROM whatsapp_outbox WHERE status = 'pending' LIMIT 50").all();
        for (const outboxMsg of outboxItems) {
            const recipientJid = await resolveRecipientJid(outboxMsg.to_phone);
            if (!recipientJid) {
                db.prepare("UPDATE whatsapp_outbox SET status = 'failed' WHERE id = ?").run(outboxMsg.id);
                console.error(`[WhatsApp Worker] Failed broadcast ${outboxMsg.id} to ${outboxMsg.to_phone}: recipient not available on WhatsApp`);
                continue;
            }

            try {
                await sock.sendMessage(recipientJid, { text: outboxMsg.message });
                db.prepare("UPDATE whatsapp_outbox SET status = 'sent' WHERE id = ?").run(outboxMsg.id);
                console.log(`[WhatsApp Worker] Sent broadcast ${outboxMsg.id} to ${outboxMsg.to_phone}`);
            } catch (error) {
                console.error(`[WhatsApp Worker] Failed broadcast ${outboxMsg.id} to ${outboxMsg.to_phone}:`, error);
                db.prepare("UPDATE whatsapp_outbox SET status = 'failed' WHERE id = ?").run(outboxMsg.id);
            }
        }
    } catch (error) {
        console.error('[WhatsApp Worker] Cron interval error:', error);
    } finally {
        isProcessingCycle = false;
    }
}

function scheduleSendCycle() {
    if (sendCycleTimerStarted) {
        return;
    }

    sendCycleTimerStarted = true;
    void processSendCycle();
    setInterval(() => {
        void processSendCycle();
    }, 60000);
}

async function startWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            auth: state,
            logger,
            version,
            printQRInTerminal: true,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            getMessage: async () => null
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                try {
                    const qrDataUrl = await qrcode.toDataURL(qr, { errorCorrectionLevel: 'H' });
                    updateStatus('NEEDS_SCAN', qrDataUrl);
                } catch (error) {
                    console.error('[WhatsApp Worker] Failed to generate QR data URL', error);
                    updateStatus('NEEDS_SCAN');
                }
                return;
            }

            if (connection === 'open') {
                isConnected = true;
                updateStatus('READY');
                console.log('[WhatsApp Worker] Connected to WhatsApp');
                return;
            }

            if (connection === 'close') {
                isConnected = false;
                const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
                const loggedOut = statusCode === DisconnectReason.loggedOut;

                sock = null;
                updateStatus(loggedOut ? 'LOGGED_OUT' : 'DISCONNECTED', null, {
                    reason: lastDisconnect?.error?.message || lastDisconnect?.error?.toString?.() || 'unknown'
                });

                console.warn('[WhatsApp Worker] Connection closed:', lastDisconnect?.error?.message || lastDisconnect?.error || 'unknown');

                if (loggedOut) {
                    sendAdminAlert(
                        'Vee Alert: WhatsApp Logged Out',
                        'The WhatsApp client logged out. A new QR scan is required.'
                    );
                    return;
                }

                if (!reconnectTimer) {
                    reconnectTimer = setTimeout(() => {
                        reconnectTimer = null;
                        void startWhatsApp();
                    }, 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ type, messages }) => {
            if (type !== 'notify') return;

            for (const message of messages) {
                await handleIncomingMessage(message).catch(error => {
                    console.error('[WhatsApp Worker] Failed handling incoming message', error);
                });
            }
        });

        console.log('[WhatsApp Worker] Baileys socket initialized');
    } catch (error) {
        console.error('[WhatsApp Worker] Startup failed:', error);
        isConnected = false;
        sock = null;
        updateStatus('ERROR', null, { reason: error.message });

        if (!reconnectTimer) {
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                void startWhatsApp();
            }, 5000);
        }
    } finally {
        isConnecting = false;
    }
}

async function shutdown(signal) {
    console.log(`[WhatsApp Worker] Received ${signal}, shutting down...`);

    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    try {
        await sock?.end?.(undefined);
    } catch (error) {
        console.error('[WhatsApp Worker] Shutdown error:', error);
    } finally {
        process.exit(0);
    }
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

updateStatus('INITIALIZING');
scheduleSendCycle();
void startWhatsApp();
