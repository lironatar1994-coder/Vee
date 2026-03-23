import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import { X, Users, UserPlus, Check, Mail, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = '/api';

const FriendsModal = ({ isOpen, onClose }) => {
    const { user } = useUser();
    const [isVisible, setIsVisible] = useState(false);
    const [friends, setFriends] = useState([]);

    // Invitation State
    const [inviteInput, setInviteInput] = useState('');
    const [emailsTarget, setEmailsTarget] = useState([]);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setIsVisible(true));
            fetchFriends();
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const fetchFriends = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/friends`);
            if (res.ok) setFriends(await res.json());
        } catch (e) {
            console.error('Error fetching friends', e);
        }
    };

    const acceptFriendRequest = async (requestId) => {
        try {
            const res = await fetch(`${API_URL}/friends/accept/${requestId}`, { method: 'PUT' });
            if (res.ok) {
                toast.success('בקשת חברות אושרה!');
                fetchFriends();
            }
        } catch (error) {
            toast.error('שגיאה באישור חברות');
        }
    };

    // Handle Email Chips Input
    const handleEmailKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault();
            addEmailTarget(inviteInput);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const paste = e.clipboardData.getData('text');
        const emails = paste.match(/[\w.-]+@[\w.-]+\.\w+/g);
        if (emails) {
            let newTargets = [...emailsTarget];
            emails.forEach(em => {
                if (!newTargets.includes(em) && newTargets.length < 10) {
                    newTargets.push(em);
                }
            });
            setEmailsTarget(newTargets);
            if (emails.length > 10) toast.warning('ניתן לשלוח עד 10 הזמנות בלבד. חלק מהאימיילים הוסרו.');
        }
    };

    const addEmailTarget = (email) => {
        const cleanEmail = email.trim().replace(/,/g, '');
        if (!cleanEmail) return;

        const isValid = /^[^@]+@[^@]+\.[^@]+$/.test(cleanEmail);

        if (!isValid) {
            toast.error('כתובת אימייל לא תקינה');
            return;
        }

        if (emailsTarget.includes(cleanEmail)) {
            setInviteInput('');
            return;
        }

        if (emailsTarget.length >= 10) {
            toast.error('ניתן לשלוח עד 10 הזמנות בלבד בכל פעם');
            return;
        }

        setEmailsTarget([...emailsTarget, cleanEmail]);
        setInviteInput('');
    };

    const removeEmailTarget = (emailToRemove) => {
        setEmailsTarget(emailsTarget.filter(e => e !== emailToRemove));
    };

    const handleSendInvites = async () => {
        if (inviteInput.trim()) {
            addEmailTarget(inviteInput);
        }

        // Wait a tick for state to update if we just added one from input
        setTimeout(async () => {
            const targetsToSend = inviteInput.trim() && /^[^@]+@[^@]+\.[^@]+$/.test(inviteInput.trim()) && !emailsTarget.includes(inviteInput.trim())
                ? [...emailsTarget, inviteInput.trim()]
                : emailsTarget;

            if (targetsToSend.length === 0) {
                toast.error('אנא הזן לפחות כתובת אימייל אחת להזמנה');
                return;
            }

            setIsSending(true);
            try {
                const res = await fetch(`${API_URL}/invitations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        inviter_id: user.id,
                        emails: targetsToSend
                    })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    toast.success(`נשלחו ${data.sent} הזמנות בהצלחה!`);

                    if (data.failed && data.failed.length > 0) {
                        data.failed.forEach(f => {
                            if (f.reason === 'Already registered') {
                                toast.info(`${f.email} כבר רשום למערכת`);
                            } else {
                                toast.error(`נכשל עבור ${f.email}`);
                            }
                        });
                    }

                    setEmailsTarget([]);
                    setInviteInput('');
                } else {
                    toast.error(data.error || 'שגיאה בשליחת הזמנות');
                }
            } catch (error) {
                toast.error('שגיאה בשליחת ההזמנות, אנא נסה שוב');
            }
            setIsSending(false);
        }, 50);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="sidebar-backdrop" onClick={onClose}>
            <div
                className={`card slide-up`}
                style={{
                    width: '90%',
                    maxWidth: '550px',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    padding: 0,
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.25rem 1.5rem',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(var(--primary-rgb, 36, 111, 224), 0.3)'
                        }}>
                            <Users size={20} />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>חברים והזמנות</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft" title="סגור">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Invite Section */}
                        <div style={{
                            background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '16px',
                            padding: '1.5rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '100px', opacity: 0.03, pointerEvents: 'none' }}>
                                ✨
                            </div>

                            <h3 style={{ fontSize: '1.15rem', margin: '0 0 0.5rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Mail size={18} /> הזמן חברים למערכת
                            </h3>
                            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1.25rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
                                שלח הזמנה אישית לחברים כדי לבנות איתם פרויקטים משותפים. <br />
                                כאשר הם ירשמו דרך הקישור, הם יתווספו אוטומטית לרשימת החברים שלך!
                            </p>

                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '12px',
                                padding: '0.75rem',
                                transition: 'border-color 0.2s, box-shadow 0.2s',
                                ...(emailsTarget.length > 0 ? { borderColor: 'var(--success-color)', boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)' } : {})
                            }}>

                                {emailsTarget.length > 0 && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                        {emailsTarget.map((email) => (
                                            <div key={email} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.35rem',
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: 'var(--success-color)',
                                                padding: '0.35rem 0.6rem',
                                                borderRadius: '20px',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                animation: 'fadeIn 0.2s ease-out'
                                            }}>
                                                {email}
                                                <button
                                                    onClick={() => removeEmailTarget(email)}
                                                    style={{ background: 'none', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', display: 'flex', opacity: 0.7 }}
                                                >
                                                    <XCircle size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                                    <input
                                        type="email"
                                        placeholder={emailsTarget.length === 0 ? "הכנס דוא״ל והקש Enter..." : "הוסף דוא״ל נוסף..."}
                                        value={inviteInput}
                                        onChange={(e) => setInviteInput(e.target.value)}
                                        onKeyDown={handleEmailKeyDown}
                                        onPaste={handlePaste}
                                        onBlur={() => { if (inviteInput.trim()) addEmailTarget(inviteInput) }}
                                        disabled={isSending || emailsTarget.length >= 10}
                                        style={{
                                            border: 'none',
                                            boxShadow: 'none',
                                            background: 'transparent',
                                            width: '100%',
                                            padding: '0.5rem',
                                            fontSize: '0.95rem',
                                            color: 'var(--text-primary)',
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <span style={{ fontSize: '0.8rem', color: emailsTarget.length >= 10 ? 'var(--danger-color)' : 'var(--text-tertiary)' }}>
                                    {emailsTarget.length}/10 הזמנות קיימות
                                </span>

                                <button
                                    onClick={handleSendInvites}
                                    disabled={isSending || (emailsTarget.length === 0 && !inviteInput.trim())}
                                    className="btn btn-primary"
                                    style={{
                                        borderRadius: '50px',
                                        padding: '0.6rem 1.25rem',
                                        background: 'var(--success-color)',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        opacity: (isSending || (emailsTarget.length === 0 && !inviteInput.trim())) ? 0.6 : 1
                                    }}
                                >
                                    {isSending ? (
                                        <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></span>
                                    ) : (
                                        <Send size={16} style={{
                                            transform: 'rotate(180deg)' // RTL adjustment for Send icon
                                        }} />
                                    )}
                                    {isSending ? 'שולח הזמנות...' : 'שלח לחברים'}
                                </button>
                            </div>
                        </div>

                        {/* Pending Invites */}
                        {friends.filter(f => f.status === 'pending' && f.receiver_id === user.id).length > 0 && (
                            <div>
                                <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    בקשות חברות ממתינות
                                </h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {friends.filter(f => f.status === 'pending' && f.receiver_id === user.id).map(f => (
                                        <div key={f.request_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: f.profile_image ? `url(/api${f.profile_image}) center/cover` : 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                                    {!f.profile_image && f.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{f.username}</span>
                                            </div>
                                            <button onClick={() => acceptFriendRequest(f.request_id)} className="btn hover-scale" style={{ padding: '0.5rem 1rem', background: 'var(--success-color)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Check size={16} /> אשר חברות
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friend List */}
                        <div>
                            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                החברים שלי ({friends.filter(f => f.status === 'accepted').length})
                            </h3>
                            {friends.filter(f => f.status === 'accepted').length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
                                    <Users size={32} style={{ color: 'var(--text-tertiary)', marginBottom: '0.5rem', opacity: 0.5 }} />
                                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                        עדיין אין לך חברים במערכת.
                                        <br /> הזמן אותם להצטרף אליך באמצעות דוא״ל!
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                                    {friends.filter(f => f.status === 'accepted').map(f => (
                                        <div key={f.request_id} className="card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: 'none', border: '1px solid var(--border-color)' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: f.profile_image ? `url(/api${f.profile_image}) center/cover` : 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                                                {!f.profile_image && f.username.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{f.username}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FriendsModal;
