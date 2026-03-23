import React, { useState, useEffect } from 'react';
import { Users, ListTodo, CheckSquare, Activity, PieChart } from 'lucide-react';
import { toast } from 'sonner';
import UserDetailsModal from '../../components/admin/UserDetailsModal';

const API_URL = '/api';

import Header from '../../components/Header';

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        fetchAdminData();
    }, []);

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

                    <div className="card" style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', border: '1px dashed var(--border-color)', background: 'transparent' }}>
                        <div style={{ color: 'var(--text-secondary)', padding: '1.25rem', borderRadius: '50%', marginBottom: '1.25rem', background: 'var(--bg-secondary)' }}>
                            <PieChart size={32} />
                        </div>
                        <h2 style={{ fontSize: '1.3rem', margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>תצוגה עתידית</h2>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '300px', fontSize: '0.95rem', margin: 0 }}>
                            גרפים ופילוח שעות וימים ישולבו כאן בעדכון הבא.
                        </p>
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
