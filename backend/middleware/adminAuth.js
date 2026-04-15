const db = require('../database');

/**
 * Middleware to verify admin token
 */
const adminAuth = (req, res, next) => {
    const token = req.header('Admin-Token');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const admin = db.prepare('SELECT id, email FROM admins WHERE token = ?').get(token);
        if (!admin) return res.status(401).json({ error: 'Unauthorized' });
        req.admin = admin;
        next();
    } catch (err) {
        console.error('Admin Auth Middleware Error:', err);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
};

module.exports = adminAuth;
