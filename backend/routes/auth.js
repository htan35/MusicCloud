const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const COOKIE_OPTS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days
};

function signToken(userId) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

// ── Validation chains ──────────────────────────────────────────────────────────
const validateRegister = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('username')
        .trim()
        .isLength({ min: 2, max: 30 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 2-30 chars (letters, numbers, _)'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
];

const validateLogin = [
    body('username').trim().notEmpty().withMessage('Username required'),
    body('password').notEmpty().withMessage('Password required'),
];

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post('/register', validateRegister, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, username, password } = req.body;

    try {
        // Check duplicates
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            const field = existing.email === email ? 'Email' : 'Username';
            return res.status(409).json({ success: false, error: `${field} already in use` });
        }

        const user = new User({ email, username, passwordHash: password });
        await user.save();

        const token = signToken(user._id);
        res.cookie('token', token, COOKIE_OPTS);
        res.status(201).json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post('/login', validateLogin, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username }).select('+passwordHash');
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const valid = await user.comparePassword(password);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid username or password' });
        }

        const token = signToken(user._id);
        res.cookie('token', token, COOKIE_OPTS);

        // Don't leak passwordHash
        const { passwordHash: _, ...userObj } = user.toObject();
        res.json({ success: true, user: userObj });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    });
    res.json({ success: true, message: 'Logged out' });
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
    res.json({ success: true, user: req.user });
});

module.exports = router;
