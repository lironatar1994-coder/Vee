import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PieChart, Users, Settings, LogOut, Activity, SidebarClose } from 'lucide-react';

const AdminSidebar = ({ isOpen, onToggle }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        navigate('/admin/login');
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)', boxShadow: '5px 0 25px rgba(0,0,0,0.05)' }}>
            <div className="sidebar-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', color: 'var(--primary-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)', color: 'white', padding: '0.65rem', borderRadius: '1rem', boxShadow: '0 4px 15px rgba(var(--primary-color-rgb, 33, 107, 165), 0.3)' }}>
                            <Settings size={28} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Vee</h2>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>מרכז ניהול ובקרה</span>
                        </div>
                    </div>

                    {/* Toggle button mirroring the main app sidebar */}
                    <button className="btn-icon-soft" onClick={onToggle} style={{ padding: '0.35rem', color: 'var(--text-secondary)' }}>
                        <SidebarClose size={18} strokeWidth={1.8} />
                    </button>
                </div>
            </div>

            <nav className="sidebar-nav" style={{ padding: '1.5rem 1rem' }}>
                <div className="nav-section" style={{ marginBottom: '2rem' }}>
                    <h3 className="nav-section-title" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', paddingRight: '1rem' }}>ניווט ראשי</h3>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>
                            <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '1rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: 500, fontSize: '1.05rem' }}>
                                <PieChart size={22} />
                                <span>דשבורד ראשי</span>
                            </NavLink>
                        </li>
                        <li>
                            <NavLink to="/admin/users" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '1rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: 500, fontSize: '1.05rem' }}>
                                <Users size={22} />
                                <span>ניהול משתמשים</span>
                            </NavLink>
                        </li>
                    </ul>
                </div>

                <div className="nav-section" style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>
                            <NavLink to="/" className="admin-nav-item" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '1rem', color: 'var(--text-secondary)', textDecoration: 'none', transition: 'all 0.2s', fontWeight: 500, fontSize: '1.05rem' }}>
                                <Activity size={22} />
                                <span>חזרה לאפליקציה</span>
                            </NavLink>
                        </li>
                        <li>
                            <button onClick={handleLogout} className="admin-nav-item" style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--error-color)', textAlign: 'right', transition: 'all 0.2s', fontWeight: 500, fontSize: '1.05rem' }}>
                                <LogOut size={22} />
                                <span style={{ fontFamily: 'inherit' }}>התנתקות ממערכת</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </nav>
        </aside>
    );
};

export default AdminSidebar;
