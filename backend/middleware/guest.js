const mongoose = require('mongoose');

/**
 * guestAuth — A parallel authentication middleware for Vercel.
 * If GUEST_MODE is enabled, it injects a mock user even if no token is present.
 * This ensures the app remains functional even if the DB/Auth system is struggling.
 */
async function guestAuth(req, res, next) {
    if (process.env.GUEST_MODE !== 'true') return next();

    // If we already have a user from real auth, keep it
    if (req.user) return next();

    // Inject a hardcoded Guest User
    req.user = {
        _id: new mongoose.Types.ObjectId('000000000000000000000001'),
        username: 'Guest_User',
        email: 'guest@musiccloud.internal',
        likedSongs: []
    };

    next();
}

module.exports = { guestAuth };
