const { verifyAdminToken } = require('../utils/authUtils');
const db = require('../database');

/**
 * Middleware to verify admin JWT
 */
const adminAuth = (req, res, next) => {
    // Check Authorization header first, then fallback to legacy Admin-Token header
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        token = req.header('Admin-Token');
    }

    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const decoded = verifyAdminToken(token);
    
    // Fallback for legacy database-stored hex tokens (until all admins re-login)
    if (!decoded) {
        try {
            const admin = db.prepare('SELECT id, email FROM admins WHERE token = ?').get(token);
            if (admin) {
                req.admin = admin;
                return next();
            }
        } catch (err) {
            console.error('Legacy Admin Auth Error:', err);
        }
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    try {
        const admin = db.prepare('SELECT id, email FROM admins WHERE id = ?').get(decoded.id);
        if (!admin) return res.status(401).json({ error: 'Unauthorized' });
        req.admin = admin;
        next();
    } catch (err) {
        console.error('Admin Auth Middleware Error:', err);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
};

module.exports = adminAuth;
