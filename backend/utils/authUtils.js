const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Legacy SHA256 hashing (for migration purposes)
 */
const legacyHash = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

/**
 * Secure BCrypt password hashing
 */
const hashPassword = async (pw) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(pw, salt);
};

/**
 * Verify password against hash (supports legacy migration)
 */
const verifyPassword = async (pw, hash) => {
    if (!hash) return false;
    
    // BCrypt hashes start with $2a$, $2b$, or $2y$
    if (hash.startsWith('$2')) {
        return await bcrypt.compare(pw, hash);
    }
    
    // Fallback to legacy SHA256 check
    return legacyHash(pw) === hash;
};

/**
 * JWT Utilities
 */
const tokenConfig = {
    user: {
        secret: process.env.JWT_SECRET || 'fallback-user-secret',
        expiresIn: '30d'
    },
    admin: {
        secret: process.env.JWT_ADMIN_SECRET || 'fallback-admin-secret',
        expiresIn: '30d'
    }
};

const generateToken = (payload) => {
    return jwt.sign(payload, tokenConfig.user.secret, { expiresIn: tokenConfig.user.expiresIn });
};

const generateAdminToken = (payload) => {
    return jwt.sign(payload, tokenConfig.admin.secret, { expiresIn: tokenConfig.admin.expiresIn });
};

const verifyToken = (token) => {
    try {
        return jwt.verify(token, tokenConfig.user.secret);
    } catch (err) {
        return null;
    }
};

const verifyAdminToken = (token) => {
    try {
        return jwt.verify(token, tokenConfig.admin.secret);
    } catch (err) {
        return null;
    }
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    generateAdminToken,
    verifyToken,
    verifyAdminToken
};
