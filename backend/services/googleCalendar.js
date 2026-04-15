const { google } = require('googleapis');

function getGoogleClient() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/calendar?sync=true`
    );
}

// Ensure the prompt='consent' forces a refresh token to be issued on first login (and subsequent relogins if needed)
function getAuthUrl(userId) {
    const oauth2Client = getGoogleClient();
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent', // Critical to always get refresh token
        scope: [
            'https://www.googleapis.com/auth/calendar.readonly',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        state: userId.toString() // Pass back user id safely
    });
}

// Exchange short-lived code for tokens
async function exchangeCodeAndSave(db, code, userId) {
    const oauth2Client = getGoogleClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Fetch user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || null;

    db.prepare(`
        UPDATE users 
        SET google_access_token = ?, google_refresh_token = ?, google_token_expiry = ?, google_calendar_email = ? 
        WHERE id = ?
    `).run(
        tokens.access_token, 
        tokens.refresh_token, 
        tokens.expiry_date, 
        email, 
        userId
    );

    return { tokens, email };
}

// Construct credentials from db, optionally refresh automatically via googleapis if expired
function getClientForUser(user) {
    if (!user.google_access_token) return null;
    
    const oauth2Client = getGoogleClient();
    oauth2Client.setCredentials({
        access_token: user.google_access_token,
        refresh_token: user.google_refresh_token,
        expiry_date: user.google_token_expiry
    });

    // Event listener to automatically save newly refreshed tokens. googleapis does this under the hood.
    oauth2Client.on('tokens', (tokens) => {
        let updateQuery = 'UPDATE users SET google_access_token = ?, google_token_expiry = ?';
        const params = [tokens.access_token, tokens.expiry_date];
        
        // Sometimes refresh_token is not returned if not forced
        if (tokens.refresh_token) {
            updateQuery += ', google_refresh_token = ?';
            params.push(tokens.refresh_token);
        }
        updateQuery += ' WHERE id = ?';
        params.push(user.id);
        
        try {
            const dbRef = require('../database');
            dbRef.prepare(updateQuery).run(...params);
        } catch(e) {
            console.error('Failed to update refreshed Google token in DB', e);
        }
    });

    return oauth2Client;
}

async function getEvents(db, userId, timeMin, timeMax) {
    const user = db.prepare('SELECT id, google_access_token, google_refresh_token, google_token_expiry FROM users WHERE id = ?').get(userId);
    if (!user || !user.google_access_token) {
        return []; // Not connected
    }

    const oauth2Client = getClientForUser(user);
    if (!oauth2Client) return [];

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    try {
        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true, // Crucial: expands recurring events perfectly for FullCalendar
            orderBy: 'startTime',
            maxResults: 250 // reasonable boundary for one month view
        });

        const items = response.data.items || [];
        
        // Map raw Google events to exactly match the format expected by our FullCalendar 
        return items.map(gEvent => {
            const start = gEvent.start.dateTime || gEvent.start.date;
            const end = gEvent.end.dateTime || gEvent.end.date;
            
            return {
                id: `google-${gEvent.id}`,
                title: gEvent.summary || '(ללא כותרת)',
                start: start,
                end: end, // optionally map end time
                allDay: !gEvent.start.dateTime, // if no dateTime, it's an all day event
                extendedProps: {
                    completed: 0, // Google events are read-only
                    priority: 5, // A neutral state (to be styled distinctively via priority=5)
                    isGoogleEvent: true,
                    originalUrl: gEvent.htmlLink // Link to external google cal
                },
                originalTask: { 
                   id: `google-${gEvent.id}`,
                   content: gEvent.summary || '(ללא כותרת)',
                   completed: 0,
                   isGoogleEvent: true
                }
            };
        });
    } catch (e) {
        console.error('Failed fetching Google Calendar Events for user', userId, e.message);
        // If error is related to revoked access (400 invalid_grant), we should probably nullify the tokens.
        if (e.response && e.response.status === 400 && e.message.includes('invalid_grant')) {
            db.prepare('UPDATE users SET google_access_token = NULL, google_refresh_token = NULL, google_token_expiry = NULL, google_calendar_email = NULL WHERE id = ?').run(userId);
        }
        throw e; 
    }
}

module.exports = {
    getAuthUrl,
    exchangeCodeAndSave,
    getEvents
};
