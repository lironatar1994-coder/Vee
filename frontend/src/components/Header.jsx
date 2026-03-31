import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useHeader, useHeaderScroll } from '../context/HeaderContext';

const Header = ({
    hPadding,
    isMobile,
    isSidebarOpen
}) => {
    const { scrollTop } = useHeaderScroll();
    const { 
        title, 
        breadcrumb, 
        headerActions, 
        onCompletedToggle, 
        isCompletedActive, 
        showCompletedToggle,
        forceShowTitle
    } = useHeader();

    return (
        <div
            className="app-header"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                padding: `0.75rem ${hPadding} 0.45rem ${isMobile ? '2rem' : hPadding}`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: (scrollTop > 30 || forceShowTitle) ? 'var(--glass-bg)' : 'transparent',
                backdropFilter: (scrollTop > 30 || forceShowTitle) ? 'blur(12px) saturate(180%)' : 'none',
                WebkitBackdropFilter: (scrollTop > 30 || forceShowTitle) ? 'blur(12px) saturate(180%)' : 'none',
                boxShadow: 'none',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                height: '56px',
                borderBottom: (scrollTop > 30 || forceShowTitle) ? '1px solid var(--border-color)' : 'none'
            }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                }}>
                    {breadcrumb && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: '13.5px',
                            opacity: 0.8,
                            paddingRight: (isMobile || !isSidebarOpen) ? '42px' : '0',
                            transition: 'padding-right 0.3s ease'
                        }}>
                            <span>{breadcrumb}</span>
                            <span style={{ opacity: 0.4, fontSize: '10px' }}>/</span>
                        </div>
                    )}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        opacity: forceShowTitle ? 1 : Math.min(1, Math.max(0, (scrollTop - 32) / 25)),
                        transform: forceShowTitle ? 'translateY(0)' : `translateY(${Math.max(0, 8 - (scrollTop - 32) / 2)}px)`,
                        pointerEvents: (scrollTop > 25 || forceShowTitle) ? 'auto' : 'none',
                        transition: 'opacity 0.2s ease, transform 0.1s linear',
                        paddingRight: (!breadcrumb && (isMobile || !isSidebarOpen)) ? '42px' : '0'
                    }}>
                        <h1 style={{
                            margin: 0,
                            fontSize: '16.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.2,
                            letterSpacing: '-0.2px'
                        }}>{title}</h1>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridAutoFlow: 'column',
                    alignItems: 'center',
                    marginLeft: '-8px',
                    transition: 'transform 0.3s ease'
                }}>
                    {showCompletedToggle && (
                        <button
                            onClick={onCompletedToggle}
                            className="btn-icon-soft"
                            title={isCompletedActive ? 'משימות' : 'הושלמו'}
                            style={{
                                padding: '0.4rem',
                                color: isCompletedActive ? 'var(--success-color)' : 'var(--text-secondary)'
                            }}
                        >
                            <CheckCircle2
                                size={20}
                                strokeWidth={1.5}
                                style={{ transition: 'all 0.3s ease' }}
                            />
                        </button>
                    )}
                    {headerActions}
                </div>
            </div>
        </div>
    );
};

export default Header;
