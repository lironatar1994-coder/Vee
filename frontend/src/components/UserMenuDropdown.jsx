import React from 'react';
import { Users, Settings, Moon, Sun, LogOut } from 'lucide-react';

const UserMenuDropdown = ({
    theme,
    toggleTheme,
    logout,
    setIsFriendsOpen,
    setIsUserMenuOpen,
    setInitialSettingsTab,
    setIsSettingsOpen,
    onToggle
}) => {
    const isMobile = window.innerWidth <= 992;

    const handleAction = (callback) => {
        callback();
        setIsUserMenuOpen(false);
        if (isMobile && onToggle) onToggle();
    };

    return (
        <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.6rem',
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: theme === 'dark' ? '0 20px 50px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
            width: '280px',
            zIndex: 10000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.4rem 0',
            direction: 'rtl',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        }}>
            <button
                onClick={() => handleAction(() => setIsFriendsOpen(true))}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'right', width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    <Users size={18} />
                </div>
                <span>חברים</span>
            </button>

            <button
                onClick={() => handleAction(() => { setInitialSettingsTab('account'); setIsSettingsOpen(true); })}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'right', width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    <Settings size={18} />
                </div>
                <span>הגדרות חשבון</span>
            </button>

            <button
                onClick={() => handleAction(toggleTheme)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'right',
                    width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <span>{theme === 'light' ? 'מצב לילה' : 'מצב יום'}</span>
            </button>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.2rem 0' }} />

            <button
                onClick={() => handleAction(logout)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'right',
                    width: '100%', color: 'var(--danger-color)',
                    fontSize: '0.95rem', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--danger-color-soft, rgba(239, 68, 68, 0.1))'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.8 }}>
                    <LogOut size={18} />
                </div>
                <span>התנתקות</span>
            </button>
        </div>
    );
};

export default UserMenuDropdown;
