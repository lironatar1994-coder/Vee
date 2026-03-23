import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import UserDetailsModal from '../../components/admin/UserDetailsModal';
import { Search, Mail, Phone, Calendar, ArrowUpRight, MoreVertical } from 'lucide-react';

const API_URL = '/api';

import Header from '../../components/Header';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API_URL}/admin/users`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Admin-Token': token
                }
            });

            if (res.status === 401) {
                toast.error('פג תוקף ההתחברות. אנא התחבר מחדש.');
                return;
            }

            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בטעינת משתמשים');
        }
        setLoading(false);
    };

    const filteredUsers = users.filter(u => {
        const term = searchTerm.toLowerCase();
        return (
            u.id.toString().includes(term) ||
            u.username.toLowerCase().includes(term) ||
            (u.email && u.email.toLowerCase().includes(term))
        );
    });

    const getConnectionStatus = (lastActiveAt) => {
        if (!lastActiveAt) return { color: '#1f2937', title: 'לא התחבר מעולם (או לפני יותר מ-7 ימים)' }; // almost black

        const now = new Date();
        const active = new Date(lastActiveAt);
        const diffMs = now - active;
        const diffMins = diffMs / 1000 / 60;
        const diffDays = diffMs / 1000 / 60 / 60 / 24;

        if (diffMins <= 15) return { color: 'var(--success-color)', title: 'מחובר כעת (ב-15 דקות האחרונות)' };
        if (diffDays <= 1) return { color: '#eab308', title: 'התחבר ב-24 שעות האחרונות' }; // yellow
        if (diffDays <= 7) return { color: 'var(--error-color)', title: 'התחבר בשבוע האחרון' }; // red
        return { color: '#1f2937', title: 'התחברות אחרונה לפני יותר מ-7 ימים' }; // almost black
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>טוען משתמשים...</div>;

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Header 
                scrollTop={scrollTop}
                hPadding={isMobile ? '1.5rem' : '2.5rem'}
                title="ניהול משתמשים"
                isMobile={isMobile}
                isSidebarOpen={true}
            />

            <div 
                className="page-content" 
                style={{ flex: 1, overflowY: 'auto', padding: '4rem 0 2rem 0' }}
                onScroll={(e) => setScrollTop(e.target.scrollTop)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1 style={{ color: 'var(--primary-color)', margin: 0 }}>ניהול משתמשים</h1>
                        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>חיפוש וניהול כל המשתמשים במערכת</p>
                    </div>

                    <div style={{ position: 'relative', width: '300px', maxWidth: '100%' }}>
                        <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="חיפוש לפי ID, שם משתמש, או אימייל..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.75rem 2.5rem 0.75rem 1rem',
                                borderRadius: 'var(--radius-full)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-color)',
                                fontSize: '0.9rem'
                            }}
                        />
                    </div>
                </div>


                <div className="card shadow-lg" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                    <th style={{ padding: '1.25rem 1.5rem', width: '60px', fontWeight: 600, fontSize: '0.9rem' }}>חיבור</th>
                                    <th style={{ padding: '1.25rem 1rem', width: '80px', fontWeight: 600, fontSize: '0.9rem' }}>ID</th>
                                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600, fontSize: '0.9rem' }}>משתמש</th>
                                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600, fontSize: '0.9rem' }}>אימייל</th>
                                    <th style={{ padding: '1.25rem 1rem', fontWeight: 600, fontSize: '0.9rem' }}>טלפון</th>
                                    <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.9rem' }}>הצטרפות</th>
                                    <th style={{ padding: '1.25rem 1.5rem', width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((u, idx) => (
                                    <tr
                                        key={u.id}
                                        onClick={() => setSelectedUser(u)}
                                        style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            background: 'var(--bg-color)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        className="table-row-hover"
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-color)'; }}
                                    >
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                                            {(() => {
                                                const status = getConnectionStatus(u.last_active_at);
                                                return (
                                                    <div
                                                        title={status.title}
                                                        style={{
                                                            width: '12px',
                                                            height: '12px',
                                                            borderRadius: '50%',
                                                            backgroundColor: status.color,
                                                            margin: '0 auto',
                                                            boxShadow: status.color === 'var(--success-color)' ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
                                                            border: status.color === '#1f2937' ? '2px solid var(--border-color)' : '2px solid transparent'
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem', color: 'var(--text-secondary)', fontFamily: 'monospace', fontWeight: 600 }}>#{u.id}</td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                {u.profile_image ? (
                                                    <img src={u.profile_image} alt={u.username} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--bg-secondary)' }} />
                                                ) : (
                                                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold', color: 'white', border: '2px solid var(--bg-secondary)' }}>
                                                        {u.username.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{u.username}</span>
                                                    {!u.is_active && <span style={{ fontSize: '0.75rem', color: 'var(--error-color)', fontWeight: 600 }}>מושהה</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            {u.email ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                    <Mail size={14} />
                                                    <span style={{ fontFamily: 'monospace' }}>{u.email}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>לא מוגדר</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem 1rem' }}>
                                            {u.phone ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                                                    <Phone size={14} />
                                                    <span style={{ fontFamily: 'monospace' }}>{u.phone}</span>
                                                </div>
                                            ) : (
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)' }}>לא מוגדר</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                <Calendar size={14} />
                                                <span dir="ltr">{new Date(u.created_at).toLocaleDateString('he-IL')}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'left' }}>
                                            <button className="btn-icon-soft" style={{ padding: '0.4rem', color: 'var(--primary-color)' }}>
                                                <ArrowUpRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                                            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                                <Search size={32} />
                                            </div>
                                            <h3 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>{searchTerm ? 'לא נמצאו תוצאות' : 'אין משתמשים במערכת'}</h3>
                                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{searchTerm ? 'נסה לחפש מונח אחר' : 'משתמשים שיירשמו יופיעו כאן'}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {selectedUser && (
                <UserDetailsModal
                    userBasicInfo={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onUserUpdated={fetchUsers}
                />
            )}
        </div>
    );
};

export default AdminUsers;
