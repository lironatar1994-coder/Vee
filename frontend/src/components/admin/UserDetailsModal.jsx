import React, { useState, useEffect } from 'react';
import { X, Key, History, Activity, ShieldAlert, CheckCircle, Ban, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthFetch } from '../../services/adminAuthService';

const API_URL = '/api';

const UserDetailsModal = ({ userBasicInfo, onClose, onUserUpdated }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [userDetails, setUserDetails] = useState(null);
    const [userLogs, setUserLogs] = useState([]);
    const [loginLogs, setLoginLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [newPassword, setNewPassword] = useState(null);

    useEffect(() => {
        fetchUserData();
    }, [userBasicInfo.id]);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const [detailsRes, logsRes, loginLogsRes] = await Promise.all([
                adminAuthFetch(`${API_URL}/admin/users/${userBasicInfo.id}`),
                adminAuthFetch(`${API_URL}/admin/users/${userBasicInfo.id}/logs`),
                adminAuthFetch(`${API_URL}/admin/users/${userBasicInfo.id}/login-logs`)
            ]);

            if (detailsRes.ok && logsRes.ok && loginLogsRes.ok) {
                setUserDetails(await detailsRes.json());
                setUserLogs(await logsRes.json());
                setLoginLogs(await loginLogsRes.json());
            } else {
                toast.error('שגיאה בטעינת פרטי משתמש');
            }
        } catch (error) {
            toast.error('שגיאת תקשורת');
        }
        setLoading(false);
    };

    const handleResetPassword = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך לאפס את סיסמת המשתמש?')) return;

        setActionLoading(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/users/${userBasicInfo.id}/reset-password`, {
                method: 'POST'
            });
            const data = await res.json();

            if (res.ok) {
                setNewPassword(data.newPassword);
                toast.success('הסיסמה אופסה בהצלחה');
                fetchUserData(); // Refresh logs
            } else {
                toast.error(data.error || 'שגיאה באיפוס סיסמה');
            }
        } catch (error) {
            toast.error('שגיאת תקשורת');
        }
        setActionLoading(false);
    };

    const handleToggleStatus = async () => {
        const newStatus = !userDetails.is_active;
        const actionName = newStatus ? 'להפעיל' : 'להשעות';
        if (!window.confirm(`האם אתה בטוח שברצונך ${actionName} את חשבון המשתמש?`)) return;

        setActionLoading(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/users/${userBasicInfo.id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ is_active: newStatus })
            });

            if (res.ok) {
                toast.success(`חשבון המשתמש ${newStatus ? 'הופעל' : 'הושעה'} בהצלחה`);
                fetchUserData();
                if (onUserUpdated) onUserUpdated();
            } else {
                const data = await res.json();
                toast.error(data.error || 'שגיאה בעדכון סטטוס');
            }
        } catch (error) {
            toast.error('שגיאת תקשורת');
        }
        setActionLoading(false);
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ padding: '3rem', textAlign: 'center' }}>
                    <RefreshCw className="spin" size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                    <p>טוען נתונים...</p>
                </div>
            </div>
        );
    }

    if (!userDetails) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200, backdropFilter: 'blur(5px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{
                maxWidth: '650px',
                width: '95%',
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                borderRadius: '1.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>

                {/* Header */}
                <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, var(--bg-color), var(--bg-secondary))' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        {userDetails.profile_image ? (
                            <img src={userDetails.profile_image} alt="Profile" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--bg-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} />
                        ) : (
                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', border: '3px solid var(--bg-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                                {userDetails.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-primary)' }}>
                                {userDetails.username}
                                {!userDetails.is_active && <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem', background: 'var(--error-color)15', color: 'var(--error-color)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>מושהה</span>}
                            </h2>
                            <p style={{ margin: '0.25rem 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: #{userDetails.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft" style={{ borderRadius: '50%', padding: '0.5rem', background: 'var(--bg-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)', padding: '0 2.5rem', flexWrap: 'nowrap', overflowX: 'auto', gap: '0.5rem', WebkitOverflowScrolling: 'touch' }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        style={{ padding: '1.25rem 1rem', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'overview' ? 'var(--primary-color)' : 'transparent'}`, color: activeTab === 'overview' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: activeTab === 'overview' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
                    >
                        <Activity size={18} /> סקירה
                    </button>
                    <button
                        onClick={() => setActiveTab('logins')}
                        style={{ padding: '1.25rem 1rem', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'logins' ? 'var(--primary-color)' : 'transparent'}`, color: activeTab === 'logins' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: activeTab === 'logins' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
                    >
                        <RefreshCw size={18} /> התחברויות
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        style={{ padding: '1.25rem 1rem', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'history' ? 'var(--primary-color)' : 'transparent'}`, color: activeTab === 'history' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: activeTab === 'history' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
                    >
                        <History size={18} /> היסטוריה
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        style={{ padding: '1.25rem 1rem', background: 'none', border: 'none', borderBottom: `3px solid ${activeTab === 'security' ? 'var(--primary-color)' : 'transparent'}`, color: activeTab === 'security' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: activeTab === 'security' ? 600 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s ease', fontSize: '1.05rem', whiteSpace: 'nowrap' }}
                    >
                        <ShieldAlert size={18} /> הגדרות ואבטחה
                    </button>
                </div>

                {/* Content Area */}
                <div style={{ padding: '2.5rem', overflowY: 'auto', flex: 1, background: 'var(--bg-color)' }}>

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '1rem' }}>
                                    <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>אימייל אישי</p>
                                    <p style={{ margin: 0, fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{userDetails.email || 'לא הוזן למערכת'}</p>
                                </div>
                                <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: 'none', borderRadius: '1rem' }}>
                                    <p style={{ margin: '0 0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>מספר טלפון</p>
                                    <p style={{ margin: 0, fontWeight: 600, fontFamily: 'monospace', fontSize: '1.1rem' }}>{userDetails.phone || 'לא הוזן טלפון'}</p>
                                </div>
                            </div>

                            <div style={{ padding: '2rem', background: 'var(--bg-secondary)', borderRadius: '1.5rem', border: '1px solid var(--border-color)' }}>
                                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: 'var(--text-primary)' }}>פעילות באפליקציה</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
                                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--primary-color)15', borderRadius: '1rem' }}>
                                        <h2 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '2.5rem', fontWeight: 800 }}>{userDetails.projectsCount}</h2>
                                        <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.5rem', display: 'block' }}>פרויקטים</span>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--accent-color)15', borderRadius: '1rem' }}>
                                        <h2 style={{ margin: 0, color: 'var(--accent-color)', fontSize: '2.5rem', fontWeight: 800 }}>{userDetails.checklistsCount}</h2>
                                        <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.5rem', display: 'block' }}>רשימות פעילות</span>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--success-color)15', borderRadius: '1rem' }}>
                                        <h2 style={{ margin: 0, color: 'var(--success-color)', fontSize: '2.5rem', fontWeight: 800 }}>{userDetails.totalCompleted}</h2>
                                        <span style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 500, marginTop: '0.5rem', display: 'block' }}>משימות שהושלמו</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="card" style={{ padding: '2rem', border: '1px solid var(--border-color)', borderRadius: '1.5rem', background: 'var(--bg-secondary)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                                    <div style={{ background: 'var(--accent-color)', color: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 10px 20px -5px rgba(var(--accent-color-rgb, 200, 100, 200), 0.3)' }}>
                                        <Key size={32} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>איפוס סיסמה מאולץ</h3>
                                        <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
                                            פעולה זו תייצר סיסמה אקראית חדשה והמשתמש ינותק מכל המכשירים באופן מיידי. אידיאלי למקרי אובדן גישה או חששות אבטחה.
                                        </p>

                                        {newPassword ? (
                                            <div style={{ background: 'var(--success-color)15', border: '2px dashed var(--success-color)', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center' }}>
                                                <p style={{ margin: '0 0 0.5rem', color: 'var(--success-color)', fontWeight: 600, fontSize: '1.1rem' }}>הסיסמה אופסה בהצלחה. שמור אותה כעת:</p>
                                                <h2 style={{ margin: 0, fontFamily: 'monospace', letterSpacing: '4px', color: 'var(--text-primary)', fontSize: '2.5rem', background: 'var(--bg-color)', display: 'inline-block', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>{newPassword}</h2>
                                            </div>
                                        ) : (
                                            <button
                                                className="btn"
                                                onClick={handleResetPassword}
                                                disabled={actionLoading}
                                                style={{ background: 'var(--accent-color)', color: 'white', fontSize: '1rem', padding: '0.75rem 2rem' }}
                                            >
                                                {actionLoading ? 'מעדכן שרתים...' : 'בצע איפוס סיסמה עכשיו'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card" style={{ padding: '2rem', border: `2px solid ${userDetails.is_active ? 'var(--error-color)40' : 'var(--success-color)40'}`, borderRadius: '1.5rem', background: userDetails.is_active ? 'var(--error-color)05' : 'var(--success-color)05' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                                    <div style={{ background: userDetails.is_active ? 'var(--error-color)' : 'var(--success-color)', color: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: userDetails.is_active ? '0 10px 20px -5px rgba(239, 68, 68, 0.3)' : '0 10px 20px -5px rgba(34, 197, 94, 0.3)' }}>
                                        {userDetails.is_active ? <Ban size={32} /> : <CheckCircle size={32} />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem' }}>{userDetails.is_active ? 'השעיית חשבון' : 'הפעלת חשבון'}</h3>
                                        <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
                                            {userDetails.is_active
                                                ? 'השעיית החשבון תחסום גישה מיידית לאפליקציה. נתונים קיימים לא יימחקו וניתן יהיה לשחזר את הגישה בהמשך.'
                                                : 'הפעלת החשבון תחזיר את המשתמש למצב פעיל ותאפשר לו להתחבר באופן רגיל תוך שחזור כל נתוניו.'}
                                        </p>
                                        <button
                                            className="btn"
                                            onClick={handleToggleStatus}
                                            disabled={actionLoading}
                                            style={{
                                                background: userDetails.is_active ? 'var(--error-color)' : 'var(--success-color)',
                                                color: 'white',
                                                fontSize: '1rem',
                                                padding: '0.75rem 2rem'
                                            }}
                                        >
                                            {actionLoading ? 'מסנכרן...' : (userDetails.is_active ? 'השעה משתמש זה' : 'הפעל משתמש זה')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Logins Tab */}
                    {activeTab === 'logins' && (
                        <div style={{ padding: '0.5rem' }}>
                            {loginLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '1.5rem', border: '1px dashed var(--border-color)' }}>
                                    <Activity size={48} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '1rem' }} />
                                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>אין נתוני התחברות</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>היסטוריית בקשות ההתחברות (מוצלחות וכושלות) תופיע כאן.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {loginLogs.map(log => {
                                        const isSuccess = log.status === 'success';
                                        return (
                                            <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.25rem', border: `1px solid ${isSuccess ? 'var(--success-color)40' : 'var(--error-color)40'}`, background: isSuccess ? 'var(--success-color)05' : 'var(--error-color)05', borderRadius: '1rem' }}>
                                                <div style={{ flexShrink: 0, color: isSuccess ? 'var(--success-color)' : 'var(--error-color)' }}>
                                                    {isSuccess ? <CheckCircle size={28} /> : <Ban size={28} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                        <strong style={{ fontSize: '1.1rem', color: isSuccess ? 'var(--success-color)' : 'var(--error-color)' }}>
                                                            {isSuccess ? 'התחברות מוצלחת' : 'ניסיון התחברות כושל'}
                                                        </strong>
                                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }} dir="ltr">{new Date(log.created_at).toLocaleString('he-IL')}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                        <span><strong>זיהוי שניסו:</strong> {log.identifier_attempted}</span>
                                                        <span><strong>IP:</strong> <span dir="ltr">{log.ip_address || 'לא ידוע'}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div style={{ padding: '0.5rem' }}>
                            {userLogs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '1.5rem', border: '1px dashed var(--border-color)' }}>
                                    <History size={48} style={{ color: 'var(--text-secondary)', opacity: 0.5, marginBottom: '1rem' }} />
                                    <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>טרם נרשמה פעילות</h3>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)' }}>היסטוריית עדכוני הפרופיל ופעולות הניהול תופיע כאן.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative', paddingRight: '1rem' }}>
                                    <div style={{ position: 'absolute', right: '35px', top: '20px', bottom: '20px', width: '3px', background: 'var(--border-color)', zIndex: 0, borderRadius: '1rem' }}></div>

                                    {userLogs.map(log => (
                                        <div key={log.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1, alignItems: 'flex-start' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-color)', border: '4px solid var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '5px', zIndex: 2 }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                                            </div>
                                            <div className="card" style={{ flex: 1, padding: '1.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', borderRadius: '1rem', boxShadow: '0 4px 15px -5px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>{log.action}</strong>
                                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }} dir="ltr">{new Date(log.created_at).toLocaleString('he-IL')}</span>
                                                </div>
                                                <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{log.details}</p>
                                                {log.admin_id && <p style={{ margin: '1rem 0 0', fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, display: 'inline-block', background: 'var(--primary-color)10', padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-full)' }}>בוצע ע"י אדמין #{log.admin_id}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default UserDetailsModal;
