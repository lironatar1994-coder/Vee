const rateLimit = require('express-rate-limit');

// General rate limiter for all requests
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        error: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 login/register requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Too many authentication attempts, please try again after an hour'
    }
});

module.exports = {
    generalLimiter,
    authLimiter
};
