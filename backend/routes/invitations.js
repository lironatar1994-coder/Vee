const express = require('express');
const router = express.Router();
const db = require('../database');
const crypto = require('crypto');
const { generateInvitationEmailHtml } = require('../utils/emailUtils');

// POST /api/invitations
router.post('/', async (req, res) => {
    const { inviter_id, emails } = req.body;
    const { transporter } = req; // Injected by globals middleware

    if (!inviter_id || !emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (emails.length > 10) {
        return res.status(400).json({ error: 'ניתן לשלוח עד 10 הזמנות בכל פעם' });
    }

    try {
        const inviter = db.prepare('SELECT username FROM users WHERE id = ?').get(inviter_id);
        if (!inviter) return res.status(404).json({ error: 'User not found' });

        const baseUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';
        const successfulEmails = [];
        const failedEmails = [];

        for (const email of emails) {
            const cleanEmail = email.trim();
            if (!/^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail)) {
                failedEmails.push({ email: cleanEmail, reason: 'Invalid email format' });
                continue;
            }

            const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
            if (existingUser) {
                failedEmails.push({ email: cleanEmail, reason: 'Already registered' });
                continue;
            }

            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            db.prepare('INSERT INTO invitations (inviter_id, email, token, expires_at) VALUES (?, ?, ?, ?)').run(
                inviter_id,
                cleanEmail,
                token,
                expiresAt.toISOString()
            );

            const inviteLink = `${baseUrl}/?invite_token=${token}`;
            const html = generateInvitationEmailHtml(inviter.username, inviteLink);

            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_FROM || 'Vee <onboarding@resend.dev>',
                    to: cleanEmail,
                    subject: `${inviter.username} הזמין/ה אותך להצטרף ל-Vee!`,
                    html: html
                });
                successfulEmails.push(cleanEmail);
            } catch (emailErr) {
                console.error('Nodemailer send failed for', cleanEmail, emailErr);
                failedEmails.push({ email: cleanEmail, reason: 'Email delivery failed' });
            }
        }

        res.json({ success: true, sent: successfulEmails.length, successful: successfulEmails, failed: failedEmails });
    } catch (err) {
        console.error('Invitation generation error:', err);
        res.status(500).json({ error: 'שגיאת שרת ביצירת ההזמנות' });
    }
});

// GET /api/invitations/verify/:token
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    try {
        const invite = db.prepare(`
            SELECT i.*, u.username as inviter_name, u.profile_image as inviter_image 
            FROM invitations i
            JOIN users u ON i.inviter_id = u.id
            WHERE i.token = ?
        `).get(token);

        if (!invite) {
            return res.status(404).json({ error: 'הזמנה זו לא קיימת או שגויה.' });
        }

        if (invite.used_at) {
            return res.status(400).json({ error: 'כבר נעשה שימוש בהזמנה זו.' });
        }

        const now = new Date();
        const expires = new Date(invite.expires_at);
        if (now > expires) {
            return res.status(400).json({ error: 'פג תוקפה של ההזמנה.' });
        }

        res.json({
            valid: true,
            email: invite.email,
            inviter: {
                id: invite.inviter_id,
                name: invite.inviter_name,
                image: invite.inviter_image
            }
        });
    } catch (err) {
        console.error('Verify token err:', err);
        res.status(500).json({ error: 'שגיאת שרת בבדיקת ההזמנה' });
    }
});

module.exports = router;
