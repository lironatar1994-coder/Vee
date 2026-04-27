const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const logger = require('../utils/logger');
const db = require('../database');
const { hashPassword, verifyPassword, generateToken, generateAdminToken } = require('../utils/authUtils');
const { generateResetPasswordEmailHtml, parseTemplate } = require('../utils/emailUtils');

/**
 * Shared logic to send verification email and respond with success
 */
async function sendVerificationAndRespond(user, res, req, inviteId = null, inviterId = null) {
    const verificationToken = db.prepare('SELECT verification_token FROM users WHERE id = ?').get(user.id).verification_token || crypto.randomBytes(32).toString('hex');
    
    // Ensure token is stored
    db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);

    if (user.email && req.transporter) {
        const verifyLink = `${process.env.BACKEND_URL || 'https://vee-app.co.il/api'}/auth/verify/${verificationToken}`;
        let template = "שלום {user_name},\n\nברוכים הבאים ל-Vee! כדי לאמת את החשבון שלכם ולהתחיל להשתמש באפליקציה, לחצו על הקישור הבא:\n{verify_link}\n\nבהצלחה!\nצוות Vee";
        const customTpl = db.prepare('SELECT value FROM settings WHERE key = ?').get('tpl_email_verify');
        if (customTpl) template = customTpl.value;

        const htmlContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; direction: rtl; text-align: right;">
                <h2 style="color: #4f46e5;">אמת את חשבון ה-Vee שלך</h2>
                <div style="white-space: pre-wrap; line-height: 1.6; color: #1e293b; margin-bottom: 25px;">
                    ${template.replace('{user_name}', user.username).replace('{verify_link}', `<a href="${verifyLink}" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">לחצו כאן</a>`)}
                </div>
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${verifyLink}" style="display: inline-block; padding: 12px 35px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);">אמת את החשבון שלי</a>
                </div>
            </div>
        `;
        req.transporter.sendMail({
            from: process.env.EMAIL_FROM_ADDRESS || 'Vee <onboarding@resend.dev>',
            to: user.email,
            subject: 'אמת את חשבון ה-Vee שלך',
            html: htmlContent
        }).catch(err => logger.error('Failed to send verification email:', err));
    }

    // Default Inbox
    db.transaction(() => {
        const hasInbox = db.prepare('SELECT id FROM checklists WHERE user_id = ? AND project_id IS NULL').get(user.id);
        if (!hasInbox) {
            db.prepare("INSERT INTO checklists (title, user_id, project_id) VALUES ('', ?, NULL)").run(user.id);
        }
        if (inviteId && inviterId) {
            db.prepare('UPDATE invitations SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(inviteId);
            db.prepare("INSERT OR IGNORE INTO friends (requester_id, receiver_id, status) VALUES (?, ?, 'accepted')").run(inviterId, user.id);
        }
    })();

    return res.json({ success: true, user: { id: user.id, username: user.username, email: user.email } });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    const { identifier, password, display_name, invite_token } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });

    const RESERVED_NAMES = ['admin', 'administrator', 'system', 'root', 'vee', 'support', 'management'];
    const chosenName = (display_name || '').toLowerCase().trim();
    if (RESERVED_NAMES.includes(chosenName)) {
        return res.status(400).json({ error: 'זהו שם שמור במערכת. בחר שם אחר.' });
    }
    
    const isEmail = /^[^@]+@[^@]+\.[^@]+$/.test(identifier);
    const isPhone = /^[0-9+\-() ]{7,15}$/.test(identifier.replace(/\s/g, ''));
    const username = display_name || identifier.split('@')[0].replace(/[^a-zA-Z0-9א-ת]/g, '');
    const email = isEmail ? identifier : null;
    const phone = isPhone && !isEmail ? identifier : null;
    
    try {
        const hash = await hashPassword(password);

        // Check invite token if provided
        let inviterId = null;
        let inviteId = null;
        if (invite_token) {
            const invite = db.prepare('SELECT id, inviter_id, expires_at, used_at FROM invitations WHERE token = ?').get(invite_token);
            if (invite && !invite.used_at && new Date() <= new Date(invite.expires_at)) {
                inviterId = invite.inviter_id;
                inviteId = invite.id;
            }
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');

        const result = db.prepare(
            'INSERT INTO users (username, email, phone, password_hash, invited_by, verification_token) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(username, email, phone, hash, inviterId, verificationToken);

        const newUserId = result.lastInsertRowid;
        const newUser = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(newUserId);

        // Success log
        try {
            db.prepare('INSERT INTO user_logs (user_id, admin_id, action, details) VALUES (?, ?, ?, ?)').run(
                newUserId, null, 'ACCOUNT_CREATED', 'חשבון המשתמש נוצר בהצלחה'
            );
        } catch (e) {
            logger.error('Failed to log account creation:', e);
        }
        
        // After success, we also send verification
        return sendVerificationAndRespond(newUser, res, req, inviteId, inviterId);
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(409).json({ error: 'המשתמש כבר קיים. נסה להתחבר.' });
        }
        console.error('Registration error:', err);
        res.status(500).json({ error: 'שגיאת שרת', details: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    const { identifier, password } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!identifier || !password) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        // 1. Find user by any identifier
        const user = db.prepare(
            'SELECT id, username, email, phone, password_hash, profile_image, invited_by, whatsapp_enabled, is_onboarded, failed_login_attempts, lockout_until, is_deleted, quick_add_settings FROM users WHERE email = ? OR phone = ? OR username = ?'
        ).get(identifier, identifier, identifier);

        if (!user) {
            return res.status(401).json({ error: 'פרטי התחברות שגויים' });
        }

        if (user.is_deleted) {
            return res.status(403).json({ error: 'החשבון נמחק. פנה לתמיכה לשחזור.' });
        }

        // 2. Check Lockout Status
        if (user.lockout_until && new Date() < new Date(user.lockout_until)) {
            const diff = Math.ceil((new Date(user.lockout_until) - new Date()) / 60000);
            return res.status(403).json({ error: `החשבון נעול זמנית עקב ניסיונות כושלים. נסה שוב בעוד ${diff} דקות.` });
        }

        // 3. Verify password
        const isValid = await verifyPassword(password, user.password_hash);
        if (!isValid) {
            const newAttempts = (user.failed_login_attempts || 0) + 1;
            let lockoutUntil = null;
            
            if (newAttempts >= 5) {
                lockoutUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                logger.warn(`[Security] Account lockout triggered for user ${user.id} (${identifier})`);
            }

            db.prepare('UPDATE users SET failed_login_attempts = ?, lockout_until = ? WHERE id = ?').run(newAttempts, lockoutUntil, user.id);
            db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(user.id, identifier, 'failed', ip);
            
            if (newAttempts >= 5) {
                return res.status(403).json({ error: 'החשבון ננעל ל-15 דקות עקב ריבוי ניסיונות כושלים.' });
            }
            return res.status(401).json({ error: 'פרטי התחברות שגויים' });
        }

        // 4. Reset Lockout/Attempts on success
        db.prepare('UPDATE users SET failed_login_attempts = 0, lockout_until = NULL WHERE id = ?').run(user.id);

        // 3. Migration Trigger: If the stored hash was legacy (SHA256), upgrade it to BCrypt on the fly
        if (!user.password_hash.startsWith('$2')) {
            const newHash = await hashPassword(password);
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);
            logger.info(`[Security] Upgraded user ${user.id} to BCrypt hashing`);
        }

        // 4. Finalize login
        db.prepare('INSERT INTO login_logs (user_id, identifier_attempted, status, ip_address) VALUES (?, ?, ?, ?)').run(user.id, identifier, 'success', ip);
        db.prepare('UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        try {
            user.invited_users = db.prepare('SELECT id, username, profile_image, created_at FROM users WHERE invited_by = ? ORDER BY created_at DESC').all(user.id);
        } catch (e) {
            user.invited_users = [];
        }

        // Don't send the hash back to the client
        delete user.password_hash;
        
        const token = generateToken({ id: user.id });
        res.json({ success: true, user, token });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// Admin Login
router.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        const admin = db.prepare('SELECT id, email, password_hash FROM admins WHERE email = ?').get(email);
        if (!admin) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        const isValid = await verifyPassword(password, admin.password_hash);
        if (!isValid) return res.status(401).json({ error: 'פרטי התחברות שגויים' });

        // Upgrade admin hash if legacy
        if (!admin.password_hash.startsWith('$2')) {
            const newHash = await hashPassword(password);
            db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, admin.id);
        }

        const token = generateAdminToken({ id: admin.id });
        db.prepare('UPDATE admins SET token = ? WHERE id = ?').run(token, admin.id);

        res.json({ success: true, token, admin: { id: admin.id, email: admin.email } });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
    const { identifier } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    if (!identifier) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        // 1. Rate Limiting Check (max 1 request per 5 mins per identifier or IP)
        const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const recentRequest = db.prepare(`
            SELECT id FROM rate_limit_logs 
            WHERE (ip_address = ? OR identifier = ?) 
              AND action = 'password_reset_request' 
              AND created_at > ?
        `).get(ip, identifier, fiveMinsAgo);

        if (recentRequest) {
            return res.status(429).json({ error: 'נשלחה כבר בקשה לאחרונה. נסה שוב בעוד כמה דקות.' });
        }

        // Log the request attempt
        db.prepare('INSERT INTO rate_limit_logs (ip_address, identifier, action) VALUES (?, ?, ?)').run(
            ip, identifier, 'password_reset_request'
        );

        // 2. Look for user
        const user = db.prepare('SELECT id, username, email, phone FROM users WHERE email = ? OR phone = ? OR username = ?').get(identifier, identifier, identifier);
        
        // Security: Always return generic success to prevent enumeration
        const genericSuccess = { success: true, message: 'אם החשבון קיים, נשלחה הודעה עם קישור לאיפוס.' };
        
        if (!user) {
            return res.json(genericSuccess);
        }

        // 3. Generate secure token (64 hex chars)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

        db.prepare('INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

        const resetLink = `${process.env.FRONTEND_URL || 'https://vee-app.co.il'}/reset-password?token=${token}`;

        // 4. Determine primary contact method based on provided identifier
        const isEmailInput = /^[^@]+@[^@]+\.[^@]+$/.test(identifier);
        const isPhoneInput = /^[0-9+\-() ]{7,15}$/.test(identifier.replace(/\s/g, ''));

        if (isPhoneInput && user.phone) {
            // Priority: WhatsApp if phone was provided
            const customTpl = db.prepare('SELECT value FROM settings WHERE key = ?').get('tpl_wa_reset');
            let message;
            if (customTpl) {
                message = parseTemplate(customTpl.value.replace(/\\n/g, '\n'), {
                    user_name: user.username,
                    reset_link: resetLink
                });
            } else {
                message = `*Vee* - איפוס סיסמה \n\nהיי ${user.username}, לחץ על הקישור הבא כדי לאפס את הסיסמה שלך:\n${resetLink}\n\nהקישור תקף ל-15 דקות.`;
            }
            db.prepare('INSERT INTO whatsapp_outbox (to_phone, message) VALUES (?, ?)').run(user.phone, message);
        } else if (user.email) {
            // Fallback or explicit Email request
            if (req.transporter) {
                const customTpl = db.prepare('SELECT value FROM settings WHERE key = ?').get('tpl_email_reset');
                let htmlContent;
                if (customTpl) {
                    const customText = parseTemplate(customTpl.value, {
                        user_name: user.username,
                        reset_link: resetLink
                    })
                    .replace(/\\n/g, '<br>') // Convert literal \n to HTML breaks
                    .replace(/\n/g, '<br>');  // Convert real newlines to HTML breaks
                    
                    // We'll replace the main paragraph with the custom text
                    htmlContent = generateResetPasswordEmailHtml(resetLink).replace(
                        /<p id="main-content"[\s\S]*?<\/p>/,
                        `<p id="main-content" style="font-size: 19px; color: #1e293b; line-height: 1.6; margin-bottom: 35px; font-weight: 400;">${customText}</p>`
                    );
                } else {
                    htmlContent = generateResetPasswordEmailHtml(resetLink);
                }

                req.transporter.sendMail({
                    from: process.env.EMAIL_FROM_ADDRESS || 'Vee Alerts <onboarding@resend.dev>',
                    to: user.email,
                    subject: 'איפוס סיסמה עבור חשבון ה-Vee שלך',
                    html: htmlContent
                }).catch(err => logger.error('Failed to send reset email:', err));
            } else {
                logger.error('Email transporter not available for password reset');
            }
        }

        res.json(genericSuccess);
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ error: 'חסרים פרטים' });

    try {
        const resetRow = db.prepare('SELECT * FROM password_resets WHERE token = ? AND used_at IS NULL').get(token);
        
        if (!resetRow || new Date() > new Date(resetRow.expires_at)) {
            return res.status(400).json({ error: 'הקישור לא תקף או שפג תוקפו' });
        }

        const newHash = await hashPassword(new_password);
        
        db.transaction(() => {
            db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, resetRow.user_id);
            db.prepare('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(resetRow.id);
            db.prepare('INSERT INTO user_logs (user_id, action, details) VALUES (?, ?, ?)').run(
                resetRow.user_id, 'PASSWORD_RESET', 'סיסמת המשתמש אופסה בהצלחה'
            );
        })();

        res.json({ success: true, message: 'הסיסמה עודכנה בהצלחה' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
    // This route should be protected by userAuth middleware or we get user from token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { verifyToken } = require('../utils/authUtils');
    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: 'Invalid token' });

    try {
        const user = db.prepare('SELECT id, username, email, is_verified, verification_token FROM users WHERE id = ?').get(decoded.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.is_verified) {
            // If already verified, return the user object so frontend can sync
            return res.json({ success: true, alreadyVerified: true, user });
        }

        const verificationToken = user.verification_token || crypto.randomBytes(32).toString('hex');
        if (!user.verification_token) {
            db.prepare('UPDATE users SET verification_token = ? WHERE id = ?').run(verificationToken, user.id);
        }

        if (user.email && req.transporter) {
            // Hit the backend API directly for verification
            const verifyLink = `${process.env.BACKEND_URL || 'https://vee-app.co.il/api'}/auth/verify/${verificationToken}`;
            let template = "שלום {user_name},\n\nברוכים הבאים ל-Vee! כדי לאמת את החשבון שלכם ולהתחיל להשתמש באפליקציה, לחצו על הקישור הבא:\n{verify_link}\n\nבהצלחה!\nצוות Vee";
            const customTpl = db.prepare('SELECT value FROM settings WHERE key = ?').get('tpl_email_verify');
            if (customTpl) template = customTpl.value;

            const htmlContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; direction: rtl; text-align: right;">
                    <h2 style="color: #4f46e5;">אמת את חשבון ה-Vee שלך</h2>
                    <div style="white-space: pre-wrap; line-height: 1.6; color: #1e293b; margin-bottom: 25px;">
                        ${template.replace('{user_name}', user.username).replace('{verify_link}', `<a href="${verifyLink}" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">לחצו כאן</a>`)}
                    </div>
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="${verifyLink}" style="display: inline-block; padding: 12px 35px; background: #4f46e5; color: #fff; text-decoration: none; border-radius: 12px; font-weight: bold; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);">אמת את החשבון שלי</a>
                    </div>
                </div>
            `;
            await req.transporter.sendMail({
                from: process.env.EMAIL_FROM_ADDRESS || 'Vee <onboarding@resend.dev>',
                to: user.email,
                subject: 'אמת את חשבון ה-Vee שלך',
                html: htmlContent
            });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

// GET /api/auth/verify/:token
router.get('/verify/:token', (req, res) => {
    const { token } = req.params;
    try {
        const user = db.prepare('SELECT id FROM users WHERE verification_token = ?').get(token);
        if (!user) {
            return res.status(400).json({ error: 'קוד אימות לא תקין' });
        }

        db.prepare('UPDATE users SET is_verified = 1, verification_token = NULL WHERE id = ?').run(user.id);
        
        // Redirect to login or success page
        res.send(`
            <div style="font-family: sans-serif; text-align: center; margin-top: 100px;">
                <h1 style="color: #4f46e5;">החשבון אומת בהצלחה!</h1>
                <p>עכשיו תוכלו להתחבר לאפליקציה.</p>
                <a href="${process.env.FRONTEND_URL || 'https://vee-app.co.il'}" style="color: #4f46e5; font-weight: bold;">חזרה להתחברות</a>
            </div>
        `);
    } catch (err) {
        console.error('Verification error:', err);
        res.status(500).json({ error: 'שגיאת שרת' });
    }
});

module.exports = router;
