const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

/**
 * requireAuth — protects routes that require a logged-in user.
 * Reads JWT from httpOnly cookie `token` OR Authorization: Bearer header.
 * Attaches req.user on success.
 */
async function requireAuth(req, res, next) {
    try {
        // Prefer cookie (httpOnly, XSS-safe), fall back to header
        const token = req.cookies?.token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null);

        if (!token) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const payload = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(payload.userId);

        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, error: 'Session expired — please log in again' });
        }
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
}

/**
 * optionalAuth — attaches req.user if token present, but doesn't block if not.
 * Used for routes that behave differently for logged-in users (e.g. isLiked field).
 */
async function optionalAuth(req, res, next) {
    try {
        const token = req.cookies?.token ||
            (req.headers.authorization?.startsWith('Bearer ')
                ? req.headers.authorization.slice(7)
                : null);
        if (!token) return next();

        const payload = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(payload.userId);
    } catch (_) { /* ignore */ }
    next();
}

module.exports = { requireAuth, optionalAuth };
