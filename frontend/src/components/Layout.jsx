import React, { useState, useEffect, Suspense, useMemo, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import PageSkeleton from './PageSkeleton';

import { HeaderProvider, useHeader, useHeaderScroll } from '../context/HeaderContext';

// Memoize Header so it only rerenders when its specific props change
const MemoizedHeader = React.memo(Header);

const LayoutContent = () => {
    const location = useLocation();
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

    // Config values from HeaderContext: No longer consumed here to avoid rerendering on header updates
    // const { title, breadcrumb, headerActions, onCompletedToggle, isCompletedActive, showCompletedToggle } = useHeader();

    // LayoutContent no longer consumes useHeaderScroll directly to avoid rerendering on scroll

    useEffect(() => {
        if (isMobile && isSidebarOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none';
        } else {
            // Delay cleanup slightly to avoid layout jump during the closing animation
            const timer = setTimeout(() => {
                document.body.style.overflow = '';
                document.body.style.touchAction = '';
            }, 300); // Matches sidebar transition duration
            return () => clearTimeout(timer);
        }
    }, [isMobile, isSidebarOpen]);

    // Close sidebar on mobile after navigation with a deliberate delay
    useEffect(() => {
        if (isMobile && isSidebarOpen) {
            const timer = setTimeout(() => {
                setIsSidebarOpen(false);
            }, 400); // Delay until the page "loads" (or skeleton is visible)
            return () => clearTimeout(timer);
        }
    }, [location.pathname, isMobile]); // Only trigger on navigation/resize

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
        toggleSidebar,
        isMobile
    }), [isSidebarOpen, toggleSidebar, isMobile]);

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
                    isMobile={isMobile}
                    isSidebarOpen={isSidebarOpen}
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
                            filter: 'brightness(0) saturate(100%) invert(35%) sepia(13%) saturate(1200%) hue-rotate(182deg) brightness(95%) contrast(88%)',
                            opacity: 0.8,
                            transition: 'all 0.3s ease',
                            display: 'block'
                        }}
                    />
                </button>

                <main className="main-content">
                    <Suspense fallback={<PageSkeleton />}>
                        <div key={location.pathname} className="fade-in">
                            <Outlet context={outletContextValue} />
                        </div>
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
