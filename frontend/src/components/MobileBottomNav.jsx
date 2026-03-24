import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, FolderOpen, CheckCircle2, Calendar } from 'lucide-react';

const MobileBottomNav = () => {
    const navItems = [
        { icon: Home, label: 'Home', path: '/today' },
        { icon: FolderOpen, label: 'Projects', path: '/projects' },
        { icon: CheckCircle2, label: 'Tasks', path: '/upcoming' },
        { icon: Calendar, label: 'Calendar', path: '/calendar' },
    ];

    return (
        <nav className="mobile-bottom-nav">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    {({ isActive }) => (
                        <>
                            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                            <span>{item.label}</span>
                        </>
                    )}
                </NavLink>
            ))}
        </nav>
    );
};

export default MobileBottomNav;
