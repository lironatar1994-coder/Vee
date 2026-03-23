import React, { useState, useEffect, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 992);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 992);

    // Provide auth check here or in individual pages. For layout, simple check:
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
        return <Navigate to="/admin/login" replace />;
    }

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth <= 992;
            setIsMobile(mobile);
            if (mobile && isSidebarOpen) setIsSidebarOpen(false);
            if (!mobile && !isSidebarOpen) setIsSidebarOpen(true);
        };
        const handleToggleSidebar = () => setIsSidebarOpen(prev => !prev);

        window.addEventListener('resize', handleResize);
        window.addEventListener('toggleSidebar', handleToggleSidebar);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('toggleSidebar', handleToggleSidebar);
        };
    }, [isSidebarOpen]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className={`app-layout ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
            {/* Sidebar Overlay for Mobile/Tablet */}
            <div
                className={`sidebar-overlay ${isSidebarOpen && isMobile ? 'visible' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            <AdminSidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

            <div className="content-wrapper">
                {/* Sidebar Reopen Button - Visible when sidebar is closed */}
                {!isSidebarOpen && (
                    <button
                        onClick={toggleSidebar}
                        className="btn-icon-soft menu-toggle-btn"
                        title="פתח תפריט"
                        style={{
                            position: 'fixed',
                            top: '1rem',
                            right: '1rem',
                            zIndex: 1100,
                            background: 'var(--bg-secondary)',
                            boxShadow: 'none',
                            border: '1px solid var(--border-color)',
                            padding: '0.45rem',
                            transition: 'var(--transition)'
                        }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                            <line x1="15" x2="15" y1="3" y2="21" />
                        </svg>
                    </button>
                )}

                <main className="main-content fade-in">
                    <Suspense fallback={<></>}>
                        <Outlet context={{ isSidebarOpen, toggleSidebar }} />
                    </Suspense>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
