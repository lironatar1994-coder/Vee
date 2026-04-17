import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import Logo from '../assets/Logo.png';

const API_URL = '/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('קישור לא תקין. נא לבקש קישור איפוס חדש.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים');
            return;
        }

        if (password !== confirmPassword) {
            setError('הסיסמאות אינן תואמות');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, new_password: password }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
                // Redirect after 3 seconds
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setError(data.error || 'שגיאה באיפוס הסיסמה');
            }
        } catch {
            setError('שגיאת רשת, נא לנסות שוב');
        } finally {
            setLoading(false);
        }
    };

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
            {/* Background decorations */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--primary-color) 12%, transparent), transparent)',
                pointerEvents: 'none',
            }} />

            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', maxWidth: '420px',
                padding: '1rem',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '84px', height: '84px', margin: '0 auto 1.25rem' }}>
                        <img src={Logo} alt="Vee Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{
                        margin: '0 0 0.5rem',
                        fontSize: '2.2rem',
                        fontWeight: 900,
                        color: 'var(--text-primary)',
                        background: 'linear-gradient(135deg, var(--text-primary), var(--primary-color))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        בחירת סיסמה חדשה
                    </h1>
                </div>

                <div style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--card-shadow)',
                    padding: '2.5rem',
                    animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                }}>
                    {success ? (
                        <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>הסיסמה עודכנה!</h2>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>הסיסמה שלך שונתה בהצלחה. מיד תועבר לדף ההתחברות...</p>
                            <Link to="/" style={{ color: 'var(--primary-color)', fontWeight: 700, textDecoration: 'none' }}>
                                לחץ כאן אם לא הועברת אוטומטית
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--bg-inset)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                                <ShieldCheck size={20} color="var(--primary-color)" />
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    נא לבחור סיסמה חזקה וקלה לזכירה
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>סיסמה חדשה</label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="לפחות 6 תווים"
                                        dir="ltr"
                                        disabled={!!error && !token}
                                        style={{
                                            width: '100%',
                                            padding: '0.9rem 1.25rem 0.9rem 3.5rem',
                                            borderRadius: '16px',
                                            background: 'var(--bg-color)',
                                            border: '1px solid var(--border-color)',
                                            color: 'var(--text-primary)',
                                            fontSize: '1.05rem',
                                            textAlign: 'right'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>אימות סיסמה</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="הקלידו שוב את הסיסמה"
                                    dir="ltr"
                                    disabled={!!error && !token}
                                    style={{
                                        width: '100%',
                                        padding: '0.9rem 1.25rem',
                                        borderRadius: '16px',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)',
                                        fontSize: '1.05rem',
                                        textAlign: 'right'
                                    }}
                                />
                            </div>

                            {error && (
                                <div style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    padding: '0.8rem',
                                    borderRadius: '12px',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.9rem'
                                }}>
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || (!!error && !token)}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    borderRadius: '16px',
                                    border: 'none',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.75rem',
                                    transition: 'all 0.2s',
                                    opacity: (loading || (!!error && !token)) ? 0.6 : 1
                                }}
                            >
                                {loading ? (
                                    <div style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                ) : (
                                    <>עדכון סיסמה <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /></>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
