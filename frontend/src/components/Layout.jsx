import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PageSkeleton from './PageSkeleton';

import { HeaderProvider, useHeader, useHeaderScroll } from '../context/HeaderContext';

// Memoize Header so it only rerenders when its specific props change
const MemoizedHeader = React.memo(Header);

const LayoutContent = () => {
    // Initial state from localStorage or default to true on desktop
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        // On mobile, the default is always closed
        if (window.innerWidth <= 992) return false;

        const saved = localStorage.getItem('sidebarOpen');
        if (saved !== null) return saved === 'true';

        // Default to open on first login (or first time visiting)
        return true;
    });

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

    // Config values from HeaderContext
    const { title, breadcrumb, headerActions, onCompletedToggle, isCompletedActive, showCompletedToggle } = useHeader();

    // LayoutContent no longer consumes useHeaderScroll directly to avoid rerendering on scroll

    useEffect(() => {
        if (isMobile && isSidebarOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        }
    }, [isMobile, isSidebarOpen]);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 992;
            setIsMobile(mobile);

            // On mobile, sidebar is usually closed unless manually opened
            // On desktop transition, we respect the saved preference
            if (mobile) {
                setIsSidebarOpen(false);
            } else {
                const saved = localStorage.getItem('sidebarOpen');
                setIsSidebarOpen(saved !== null ? saved === 'true' : true);
            }
        };
        const handleToggleSidebar = () => {
            setIsSidebarOpen(prev => {
                const newState = !prev;
                localStorage.setItem('sidebarOpen', newState);
                return newState;
            });
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('toggleSidebar', handleToggleSidebar);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('toggleSidebar', handleToggleSidebar);
        };
    }, []);

    const toggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => {
            const newState = !prev;
            // Only persist if we are on desktop
            if (window.innerWidth > 992) {
                localStorage.setItem('sidebarOpen', newState);
            }
            return newState;
        });
    }, []);

    const sidePadding = isMobile ? '3.25rem' : '2.5rem';
    const hPadding = isMobile ? "3.25rem" : sidePadding;

    // Memoize context value for Outlet to prevent children rerendering on parent state changes
    const outletContextValue = useMemo(() => ({
        isSidebarOpen,
        toggleSidebar
    }), [isSidebarOpen, toggleSidebar]);

    return (
        <div className={`app-layout ${!isSidebarOpen ? 'sidebar-closed' : 'sidebar-open'} ${isMobile ? 'is-mobile' : 'is-desktop'}`} style={{ overscrollBehavior: 'none' }}>
            {/* Sidebar Overlay for Mobile/Tablet */}
            <div
                className={`sidebar-overlay ${isSidebarOpen && isMobile ? 'visible' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

            <div className="content-wrapper">
                <MemoizedHeader
                    hPadding={hPadding}
                    breadcrumb={breadcrumb}
                    title={title}
                    isMobile={isMobile}
                    isSidebarOpen={isSidebarOpen}
                    headerActions={headerActions}
                    onCompletedToggle={onCompletedToggle}
                    isCompletedActive={isCompletedActive}
                    showCompletedToggle={showCompletedToggle}
                />

                <button
                    onClick={toggleSidebar}
                    className={`btn-icon-soft menu-toggle-btn ${!isSidebarOpen ? 'toggle-visible' : 'toggle-hidden'}`}
                    title="פתח סרגל"
                    style={{
                        position: 'fixed',
                        top: '0.45rem',
                        right: isMobile && !isSidebarOpen ? 'calc(0.75rem - 4px)' : '0.75rem',
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1100,
                        background: 'transparent',
                        boxShadow: 'none',
                        border: 'none',
                        borderRadius: '0',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        color: 'var(--text-primary)',
                        pointerEvents: !isSidebarOpen ? 'auto' : 'none',
                        opacity: !isSidebarOpen ? 1 : 0,
                    }}
                >
                    <img
                        src="/sidebar_is_closed.svg"
                        alt="sidebar toggle"
                        style={{
                            width: '32px',
                            height: 'auto',
                            filter: 'var(--invert-icon)',
                            transition: 'all 0.3s ease',
                            display: 'block'
                        }}
                    />
                </button>

                <main className="main-content">
                    <Suspense fallback={<PageSkeleton />}>
                        <Outlet context={outletContextValue} />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

const Layout = () => (
    <HeaderProvider>
        <LayoutContent />
    </HeaderProvider>
);

export default Layout;
