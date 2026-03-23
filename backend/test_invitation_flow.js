const db = require('./database');

async function runTest() {
    console.log('--- Starting Invitation Flow Test ---\\n');

    // 1. Create an Inviter
    const inviterIdentifier = `inviter_${Date.now()}@test.com`;
    let res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: inviterIdentifier, password: 'password123', display_name: 'Test Inviter' })
    });

    if (!res.ok) {
        console.error('Failed to create inviter', await res.text());
        return;
    }
    const inviterData = await res.json();
    const inviterId = inviterData.user.id;
    console.log(`✅ Inviter created: ${inviterIdentifier} (ID: ${inviterId})`);

    // 2. Generate an Invitation
    const targetEmail = `friend_${Date.now()}@test.com`;
    res = await fetch('http://localhost:3001/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviter_id: inviterId, emails: [targetEmail] })
    });

    const inviteResult = await res.json();
    console.log(`✅ Invitations request sent to API. Result:`, JSON.stringify(inviteResult));

    // 3. Grab the token directly from local SQLite DB just for testing
    const inviteRecord = db.prepare('SELECT * FROM invitations WHERE inviter_id = ? ORDER BY created_at DESC LIMIT 1').get(inviterId);
    if (!inviteRecord) {
        console.error('❌ Failed to find invitation record in DB');
        return;
    }
    const inviteToken = inviteRecord.token;
    console.log(`✅ Invitation created in DB. Token: ${inviteToken}`);

    // 4. Register the new friend using the token
    const friendIdentifier = targetEmail;
    res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            identifier: friendIdentifier,
            password: 'password123',
            display_name: 'Test Friend',
            invite_token: inviteToken
        })
    });

    if (!res.ok) {
        console.error('❌ Failed to register friend with token', await res.text());
        return;
    }
    const friendData = await res.json();
    const friendId = friendData.user.id;
    console.log(`✅ Friend registered using token: ${friendIdentifier} (ID: ${friendId})`);

    // 5. Verify Affiliation & Friendship
    // Check affiliation via user API
    res = await fetch(`http://localhost:3001/api/users/${inviterId}`);
    const updatedInviter = await res.json();
    const isAffiliated = updatedInviter.invited_users && updatedInviter.invited_users.some(u => u.id === friendId);
    console.log(`✅ Inviter's profile contains the new friend in 'invited_users': ${isAffiliated}`);

    if (!isAffiliated) {
        console.error('❌ Affiliation check failed! Inviter profile:', JSON.stringify(updatedInviter, null, 2));
    }

    // Check Friendship API
    res = await fetch(`http://localhost:3001/api/users/${inviterId}/friends`);
    const friendsList = await res.json();
    const isFriend = friendsList.some(f =>
        (f.user_id === friendId) &&
        (f.status === 'accepted')
    );
    console.log(`✅ Automatic friendship established (status: 'accepted'): ${isFriend}`);

    if (isAffiliated && isFriend) {
        console.log('\\n🎉 All tests passed successfully!');
    } else {
        console.log('\\n⚠️ Some checks failed.');
    }
}

runTest().catch(console.error);
