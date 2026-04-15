const express = require('express');
const router = express.Router();
const db = require('../database');
const googleCalendarService = require('../services/googleCalendar');

// GET /api/google/auth-url
router.get('/auth-url', (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'Missing userId' });
    try {
        const url = googleCalendarService.getAuthUrl(userId);
        res.redirect(url);
    } catch (e) {
        console.error('Error generating Google Auth URL', e);
        res.status(500).json({ error: 'Failed to generate auth url' });
    }
});

// GET /api/google/callback
router.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    if (error) {
        return res.redirect(`${frontendUrl}/calendar?google_error=${error}`);
    }
    const userId = state; 
    try {
        await googleCalendarService.exchangeCodeAndSave(db, code, userId);
        res.redirect(`${frontendUrl}/calendar?google_success=true`);
    } catch (e) {
        console.error('Google Callback Error:', e);
        res.redirect(`${frontendUrl}/calendar?google_error=exchange_failed`);
    }
});

// GET /api/users/:id/google/events
router.get('/users/:id/google/events', async (req, res) => {
    const { id } = req.params;
    const { timeMin, timeMax } = req.query;
    try {
        const events = await googleCalendarService.getEvents(db, id, timeMin, timeMax);
        res.json(events); 
    } catch (e) {
        console.error('Failed bringing google events to user', id);
        res.json([]); 
    }
});

// DELETE /api/users/:id/google
router.delete('/users/:id/google', (req, res) => {
    const { id } = req.params;
    try {
        db.prepare('UPDATE users SET google_access_token = NULL, google_refresh_token = NULL, google_token_expiry = NULL, google_calendar_email = NULL WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to disconnect Google Calendar' });
    }
});

module.exports = router;
