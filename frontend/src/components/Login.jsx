import { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { BookOpen, Eye, EyeOff, ArrowLeft, Sparkles, MailOpen } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Logo from '../assets/Logo.png';

const API_URL = '/api';

export default function Login() {
    const { login } = useUser();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('invite');

    const [mode, setMode] = useState(inviteToken ? 'register' : 'login'); // Default to register if invited
    const [identifier, setIdentifier] = useState(searchParams.get('email') || ''); // pre-fill email if provided
    const [password, setPassword] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Detect type of identifier
    const identifierType = () => {
        if (/^[^@]+@[^@]+\.[^@]+$/.test(identifier)) return 'email';
        if (/^[0-9+\-() ]{7,}$/.test(identifier.trim())) return 'phone';
        if (identifier.trim().length > 0) return 'username';
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!identifier.trim()) { setError('נא להזין אימייל, טלפון או שם משתמש'); return; }
        if (!password) { setError('נא להזין סיסמה'); return; }
        setLoading(true);

        if (mode === 'register') {
            try {
                const res = await fetch(`${API_URL}/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password, invite_token: inviteToken }),
                });
                const data = await res.json();
                if (res.ok) {
                    // Auto-login after register using UserContext 
                    // Now includes the JWT token returned from backend
                    await login(data.user.username, data.user.email, data.user, data.token);
                } else {
                    setError(data.error || 'שגיאה בהרשמה');
                }
            } catch {
                setError('שגיאת רשת, נסה שוב');
            }
        } else {
            try {
                const res = await fetch(`${API_URL}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password, invite_token: inviteToken }),
                });
                const data = await res.json();
                if (res.ok) {
                    // Includes the JWT token returned from backend
                    await login(data.user.username, data.user.email, data.user, data.token);
                } else {
                    setError(data.error || 'שגיאה בהתחברות');
                }
            } catch {
                setError('שגיאת רשת, נסה שוב');
            }
        }
        setLoading(false);
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (!identifier.trim()) { setError('נא להזין אימייל, טלפון או שם משתמש'); return; }
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier }),
            });
            const data = await res.json();
            if (res.ok) {
                setForgotSuccess(true);
            } else {
                setError(data.error || 'שגיאה בשליחת בקשת איפוס');
            }
        } catch {
            setError('שגיאת רשת, נסה שוב');
        }
        setLoading(false);
    };

    const idType = identifierType();
    const idPlaceholder = idType === 'email' ? '📧 אימייל' : idType === 'phone' ? '📱 טלפון' : 'אימייל, טלפון, או שם משתמש';

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--app-bg)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background decorations - slightly more subtle */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--primary-color) 12%, transparent), transparent)',
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '-10%', right: '-5%',
                width: '400px', height: '400px', borderRadius: '50%',
                background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-color) 8%, transparent), transparent)',
                pointerEvents: 'none',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '420px',
                padding: '1rem',
            }}>
                {/* Logo / Header / Invite Notification */}
                <div style={{ textAlign: 'center', marginBottom: '2rem', animation: 'fadeInDown 0.8s ease' }}>
                    {inviteToken && (
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.6rem',
                            background: 'rgba(16, 185, 129, 0.12)',
                            backdropFilter: 'blur(8px)',
                            border: '1px solid var(--success-color)',
                            color: 'var(--success-color)',
                            padding: '0.6rem 1.25rem',
                            borderRadius: '50px',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            marginBottom: '1.75rem',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.15)',
                            animation: 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}>
                            <MailOpen size={18} />
                            <span>קיבלת הזמנה בלעדית להצטרף ל-Vee!</span>
                        </div>
                    )}

                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '84px', height: '84px', borderRadius: '24px',
                        background: 'transparent', marginBottom: '1.25rem',
                        filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.1))',
                    }}>
                        <img src={Logo} alt="Vee Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{
                        margin: '0 0 0.4rem',
                        fontSize: '2.5rem',
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        letterSpacing: '-1px',
                        background: 'linear-gradient(135deg, var(--text-primary), var(--primary-color))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        Vee
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 500 }}>
                        {mode === 'login' ? 'ברוך שובך' : mode === 'forgot' ? 'איפוס סיסמה' : 'הירשמו'}
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--bg-secondary)', // Use standard secondary bg for the card
                    borderRadius: '24px', // Slightly less rounded for a more professional look
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)', // Use theme shadow
                    overflow: 'hidden',
                    animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    minHeight: mode === 'forgot' && forgotSuccess ? '300px' : 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Tabs - Hidden in forgot mode */}
                    {mode !== 'forgot' && (
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                            background: 'var(--bg-inset)', // Use inset bg for tabs container
                            padding: '0.5rem',
                            borderBottom: '1px solid var(--border-color)'
                        }}>
                            {[['login', 'התחברות'], ['register', 'הרשמה']].map(([m, label]) => (
                                <button
                                    key={m}
                                    onClick={() => { setMode(m); setError(''); setForgotSuccess(false); }}
                                    style={{
                                        padding: '0.85rem',
                                        background: mode === m ? 'var(--bg-secondary)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '16px',
                                        color: mode === m ? 'var(--text-primary)' : 'var(--text-secondary)',
                                        fontWeight: mode === m ? 800 : 500,
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        fontFamily: 'inherit',
                                        boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    }}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'forgot' && forgotSuccess ? (
                        <div style={{ padding: '3rem 2rem', textAlign: 'center', animation: 'fadeIn 0.5s ease', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1.5rem' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>הבקשה נשלחה!</h3>
                                <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    אם החשבון קיים, נשלחה כעת הודעה ל<b>וואטסאפ</b> או ל<b>אימייל</b> שלך עם קישור לאיפוס הסיסמה.
                                </p>
                            </div>
                            <button
                                onClick={() => { setMode('login'); setForgotSuccess(false); }}
                                style={{
                                    background: 'var(--bg-inset)',
                                    border: '1px solid var(--border-color)',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                חזרה להתחברות
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleSubmit} style={{ padding: '2rem 2.5rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {mode === 'forgot' && (
                                <button 
                                    type="button" 
                                    onClick={() => { setMode('login'); setError(''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0, cursor: 'pointer', alignSelf: 'flex-start', marginBottom: '0.5rem' }}
                                >
                                    <ArrowLeft size={18} style={{ transform: 'scaleX(-1)' }} />
                                    חזרה
                                </button>
                            )}

                        {/* Identifier field */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', paddingRight: '0.25rem' }}>
                                {mode === 'register' ? 'אימייל או מספר טלפון' : 'פרטי זיהוי'}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={idPlaceholder}
                                    value={identifier}
                                    onChange={e => setIdentifier(e.target.value)}
                                    autoFocus
                                    autoComplete="username"
                                    dir="ltr"
                                    style={{
                                        width: '100%',
                                        fontSize: '1.05rem',
                                        padding: '0.9rem 1.25rem',
                                        borderRadius: '16px',
                                        textAlign: 'right',
                                        background: 'var(--bg-color)', // Use base bg for inputs
                                        border: '1px solid var(--border-color)', // Standard border
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                                {identifier && idType && (
                                    <div style={{ position: 'absolute', top: '-10px', left: '15px', background: 'var(--bg-secondary)', padding: '0 8px', fontSize: '0.75rem', color: 'var(--success-color)', fontWeight: 700, borderRadius: '4px' }}>
                                        {idType === 'email' && 'אימייל זוהה'}
                                        {idType === 'phone' && 'טלפון זוהה'}
                                        {idType === 'username' && 'משתמש זוהה'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Password - Hidden in forgot mode */}
                        {mode !== 'forgot' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '0.25rem' }}>
                                    <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                        סיסמה
                                    </label>
                                    {mode === 'login' && (
                                        <button 
                                            type="button"
                                            onClick={() => { setMode('forgot'); setError(''); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                        >
                                            שכחת סיסמה?
                                        </button>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-control"
                                        placeholder={mode === 'register' ? 'סיסמה חזקה ומאובטחת' : 'הסיסמה שלך'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                                        dir="ltr"
                                        style={{
                                            width: '100%',
                                            fontSize: '1.05rem',
                                            padding: '0.9rem 3.5rem 0.9rem 1.25rem',
                                            borderRadius: '16px',
                                            textAlign: 'right',
                                            background: 'var(--bg-color)', // Use base bg
                                            border: '1px solid var(--border-color)', // Standard border
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                            color: 'var(--text-secondary)', padding: '0.5rem', display: 'flex', alignItems: 'center',
                                            borderRadius: '10px', transition: 'all 0.2s'
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div style={{
                                background: 'color-mix(in srgb, var(--danger-color) 12%, transparent)',
                                border: '1px solid color-mix(in srgb, var(--danger-color) 30%, transparent)',
                                borderRadius: '14px',
                                padding: '0.8rem 1.25rem',
                                color: 'var(--danger-color)',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                animation: 'shake 0.4s ease-in-out'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>⚠️</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                borderRadius: '16px',
                                marginTop: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                opacity: loading ? 0.7 : 1,
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? (
                                <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                            ) : mode === 'login' ? (
                                <><ArrowLeft size={22} /> כניסה למערכת </>
                            ) : mode === 'forgot' ? (
                                <><MailOpen size={22} /> שליחת קישור איפוס </>
                            ) : (
                                <><Sparkles size={22} /> הצטרפות עכשיו </>
                            )}
                        </button>

                        {/* Switch mode - Hidden in forgot mode */}
                        {mode !== 'forgot' && (
                            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>
                                {mode === 'login' ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <span>עוד לא חבר?</span>
                                        <button type="button" onClick={() => { setMode('register'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', padding: 0 }}>הירשם כאן</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <span>כבר יש לך חשבון?</span>
                                        <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', padding: 0 }}>התחבר עכשיו</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                )}
                </div>
            </div>
        </div>
    );
}
