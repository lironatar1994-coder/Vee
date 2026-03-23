import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, Sun, LayoutDashboard, Store, Settings, LogOut } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';

const Navbar = () => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useUser();
    const location = useLocation();

    if (!user) return null;

    const navLinks = [
        { path: '/', label: 'היומי שלי', icon: LayoutDashboard },
        { path: '/store', label: 'תבניות', icon: Store },
        { path: '/admin', label: 'ניהול', icon: Settings },
    ];

    return (
        <nav style={{
            padding: '0.6rem 1.2rem',
            margin: '0.5rem 0.5rem 1rem 0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: 'calc(100% - 1rem)',
            boxSizing: 'border-box',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-full)',
            boxShadow: 'none',
            border: '1px solid var(--border-color)',
        }}>
            {/* LEFT icons — pushed to far left */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button onClick={toggleTheme} className="btn-icon-soft" title="החלף עיצוב">
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                <button onClick={logout} className="btn-icon-soft" title="התנתק" style={{ color: 'var(--danger-color)' }}>
                    <LogOut size={20} />
                </button>
            </div>

            {/* CENTER nav links */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
                {navLinks.map((link) => {
                    const Icon = link.icon;
                    const isActive = location.pathname === link.path;
                    return (
                        <Link
                            key={link.path}
                            to={link.path}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)',
                                background: isActive ? 'var(--primary-color)' : 'transparent',
                                color: isActive ? 'var(--bg-secondary)' : 'var(--text-primary)',
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '0.92rem',
                                transition: 'var(--transition)'
                            }}
                        >
                            <Icon size={16} />
                            <span className="desktop-only">{link.label}</span>
                        </Link>
                    );
                })}
            </div>

            {/* RIGHT — username pushed to far right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                    padding: '0.35rem 1rem',
                    borderRadius: 'var(--radius-full)', border: '1px solid var(--border-color)',
                    fontSize: '0.88rem', color: 'var(--text-secondary)',
                    background: 'var(--bg-color)',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                }}>
                    שלום, <b style={{ color: 'var(--text-primary)' }}>{user.username}</b>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
