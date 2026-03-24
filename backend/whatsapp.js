const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

let ready = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-extensions']
    }
});

client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('[WhatsApp] PLEASE SCAN THIS QR CODE TO AUTHENTICATE:');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('[WhatsApp] Client is ready!');
    ready = true;
});

client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Client was logged out. Reason:', reason);
    ready = false;
});

// We catch initialization errors so it doesn't crash the main server if Chromium is missing
client.initialize().catch(err => {
    console.error('[WhatsApp] Initialization error:', err);
});

const sendReminder = async (phone, message) => {
    if (!ready) {
        console.error('[WhatsApp] Cannot send message: Client is not authenticated or ready');
        return false;
    }
    
    try {
        // Clean up the phone number to digits only
        let formattedPhone = phone.replace(/\D/g, '');
        // Default Israeli phone number handling (05X -> 9725X)
        if (formattedPhone.startsWith('0') && formattedPhone.length === 10) {
            formattedPhone = '972' + formattedPhone.substring(1);
        }
        
        const chatId = `${formattedPhone}@c.us`;
        console.log(`[WhatsApp] Attempting to send message to ${chatId}`);
        await client.sendMessage(chatId, message);
        console.log(`[WhatsApp] Successfully sent to ${chatId}`);
        return true;
    } catch (err) {
        console.error('[WhatsApp] Failed to send message:', err);
        return false;
    }
};

module.exports = { client, sendReminder, isReady: () => ready };
