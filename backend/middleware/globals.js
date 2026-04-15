/**
 * Global Dependency Injection Middleware
 * Attaches singleton instances (io, transporter, webpush) to the request object
 * so routers can access them without circular dependencies.
 */
const injectGlobals = (io, transporter, webpush) => {
    return (req, res, next) => {
        req.io = io;
        req.transporter = transporter;
        req.webpush = webpush;
        next();
    };
};

module.exports = injectGlobals;
