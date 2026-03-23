import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogIn, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = '/api';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'שגיאה בהתחברות מנהל');
                setLoading(false);
                return;
            }

            // Save token and navigate
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.admin));
            toast.success('ברוך שובך, מנהל');
            navigate('/admin');
        } catch (error) {
            toast.error('שגיאה בתקשורת עם השרת');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)',
            padding: '2rem'
        }}>
            <div className="card" style={{
                maxWidth: '400px',
                width: '100%',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                borderTop: '4px solid var(--primary-color)'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'var(--primary-color)15',
                        color: 'var(--primary-color)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <Settings size={32} />
                    </div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>כניסת מנהלים</h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>התחבר כדי לגשת לפאנל הניהול</p>
                </div>

                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error-color)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.9rem' }}>
                    <ShieldAlert size={20} style={{ flexShrink: 0 }} />
                    <p style={{ margin: 0 }}>אזור זה מוגבל למנהלי המערכת בלבד. הגישה מתועדת.</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>אימייל מנהל</label>
                        <input
                            type="email"
                            required
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            dir="ltr"
                            style={{ width: '100%' }}
                            placeholder="admin@example.com"
                        />
                    </div>

                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>סיסמה</label>
                        <input
                            type="password"
                            required
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            dir="ltr"
                            style={{ width: '100%' }}
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ width: '100%', marginTop: '0.5rem', padding: '0.875rem' }}
                    >
                        {loading ? 'מתחבר...' : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <LogIn size={20} />
                                <span>התחברות מאובטחת</span>
                            </div>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="btn btn-secondary"
                        style={{ width: '100%' }}
                    >
                        חזרה לאפליקציה
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
