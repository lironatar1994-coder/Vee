import React, { useState, useEffect } from 'react';
import { Users, ListTodo, CheckSquare, Activity, PieChart, MessageCircle, QrCode, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import UserDetailsModal from '../../components/admin/UserDetailsModal';

const API_URL = '/api';

import Header from '../../components/Header';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [whatsappStatus, setWhatsappStatus] = useState('INITIALIZING');
    const [whatsappQr, setWhatsappQr] = useState(null);

    useEffect(() => {
        fetchAdminData();
        fetchWhatsappStatus();
        
        // Poll WhatsApp status every 5 seconds
        const interval = setInterval(fetchWhatsappStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchWhatsappStatus = async () => {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/admin/whatsapp/status`, {
                headers: { 'Admin-Token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setWhatsappStatus(data.status);
                setWhatsappQr(data.qr);
            }
        } catch (e) {
            console.error('Error fetching WA status', e);
        }
    };

    const fetchAdminData = async () => {
        const token = localStorage.getItem('adminToken');
        const headers = {
            'Content-Type': 'application/json',
            'Admin-Token': token
        };

        try {
            const [statsRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/admin/stats`, { headers }),
                fetch(`${API_URL}/admin/users`, { headers })
            ]);

            if (statsRes.status === 401 || usersRes.status === 401) {
                toast.error('פג תוקף ההתחברות. אנא התחבר מחדש.');
                // Will be handled by layout redirect optionally, or explicit logic
                return;
            }

            const statsData = await statsRes.json();
            const usersData = await usersRes.json();

            setStats(statsData);
            setUsers(usersData);
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בטעינת נתוני ניהול');
        }
        setLoading(false);
    };

    const [scrollTop, setScrollTop] = useState(0);

    if (loading || !stats) return <div style={{ textAlign: 'center', padding: '3rem' }}>טוען נתונים...</div>;

    const statCards = [
        { label: 'משתמשים רשומים', value: stats.totalUsers, icon: Users, color: 'var(--primary-color)' },
        { label: 'משתמשים פעילים היום', value: stats.activeUsersToday, icon: Activity, color: 'var(--success-color)' },
        { label: 'סה"כ רשימות', value: stats.totalChecklists, icon: ListTodo, color: 'var(--accent-color)' },
        { label: 'סה"כ משימות שהושלמו', value: stats.totalCompletedTasks, icon: CheckSquare, color: '#8b5cf6' },
    ];

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Header 
                scrollTop={scrollTop}
                hPadding={isMobile ? '1.5rem' : '2.5rem'}
                title="פאנל ניהול"
                isMobile={isMobile}
                isSidebarOpen={true} // Defaulting for admin for now
            />


            <div
                className="page-content"
                style={{ flex: 1, overflowY: 'auto', padding: '4rem 0 2rem 0' }}
                onScroll={(e) => setScrollTop(e.target.scrollTop)}
            >
                {/* Removed Large Hero Banner */}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    {statCards.map((stat, idx) => {
                        const Icon = stat.icon;
                        return (
                            <div key={idx} className="card" onClick={() => stat.label.includes('משתמשים') ? window.location.href = '/admin/users' : null} style={{
                                padding: '1.25rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '1rem',
                                borderTop: `4px solid ${stat.color}`,
                                boxShadow: '0 2px 10px -2px rgba(0,0,0,0.05)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                                cursor: 'pointer',
                                background: 'var(--bg-secondary)'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 8px 15px -5px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 10px -2px rgba(0,0,0,0.05)';
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ background: `${stat.color}15`, color: stat.color, padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                                        <Icon size={20} />
                                    </div>
                                    <h3 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-primary)', fontWeight: 800 }}>{stat.value}</h3>
                                </div>
                                <div>
                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, lineHeight: 1.2 }}>{stat.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Expanded Activity Area */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                    <div className="card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', background: 'linear-gradient(135deg, var(--bg-color) 0%, var(--bg-secondary) 100%)', boxShadow: 'inset 0 0 50px rgba(0,0,0,0.02)' }}>
                        <div style={{ background: 'var(--primary-color)10', color: 'var(--primary-color)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1.25rem' }}>
                            <Activity size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: 800 }}>המערכת בפעולה</h2>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5, margin: 0 }}>
                            הכל זמין ופועל. נווט למשתמשים דרך התפריט.
                        </p>
                    </div>

                    <div className="card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', background: 'var(--bg-secondary)', border: `1px solid ${whatsappStatus === 'READY' ? 'var(--success-color)' : 'var(--border-color)'}` }}>
                        <div style={{ padding: '1rem', borderRadius: '50%', marginBottom: '1rem', background: whatsappStatus === 'READY' ? 'var(--success-color)20' : 'var(--primary-color)10', color: whatsappStatus === 'READY' ? 'var(--success-color)' : 'var(--primary-color)' }}>
                            <MessageCircle size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontWeight: 700 }}>חיבור ל-WhatsApp סנטר</h2>
                        
                        {whatsappStatus === 'INITIALIZING' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <Loader2 size={24} className="spin" style={{ color: 'var(--text-secondary)' }} />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>מאתחל את שרת הווסטאפ...</span>
                            </div>
                        )}

                        {whatsappStatus === 'NEEDS_SCAN' && whatsappQr && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                                <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                                    <img src={whatsappQr} alt="WhatsApp QR Code" style={{ width: '200px', height: '200px' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                    <Smartphone size={18} />
                                    <span>סרוק את הברקוד דרך "מכשירים מקושרים" בוואטסאפ</span>
                                </div>
                            </div>
                        )}

                        {whatsappStatus === 'READY' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', background: 'var(--success-color)10', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 600 }}>
                                    <CheckCircle2 size={18} />
                                    <span>הבוט מחובר ופעיל</span>
                                </div>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px' }}>
                                    הודעות תזכורת ישלחו למשתמשים שהגדירו מספר פלאפון בהגדרות האישיות.
                                </span>
                            </div>
                        )}
                        
                        {whatsappStatus === 'ERROR' && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', color: 'var(--danger-color)' }}>
                                <span>שגיאת התחברות לבוט. בדוק את השרת.</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <UserDetailsModal
                    userBasicInfo={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUserUpdated={fetchAdminData}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
