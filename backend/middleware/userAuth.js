const { verifyToken } = require('../utils/authUtils');
const db = require('../database');

/**
 * Middleware to verify a regular user's JWT
 */
const userAuth = (req, res, next) => {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    try {
        // Optional: Verify user still exists in DB
        const user = db.prepare('SELECT id, username, email FROM users WHERE id = ?').get(decoded.id);
        if (!user) {
            return res.status(403).json({ error: 'Forbidden: User no longer exists' });
        }

        // Attach user info to request object
        req.user = user;
        next();
    } catch (err) {
        console.error('User Auth Middleware Error:', err);
        return res.status(500).json({ error: 'Server error during authentication' });
    }
};

module.exports = userAuth;
