const crypto = require('crypto');

/**
 * Basic SHA256 password hashing
 */
const hashPassword = (pw) => crypto.createHash('sha256').update(pw).digest('hex');

module.exports = {
    hashPassword
};
