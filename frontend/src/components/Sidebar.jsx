import { useState, useEffect, useRef, useCallback, useTransition, memo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Moon, Sun, LayoutDashboard, Layers, Settings, LogOut, BookOpen, Plus, Folder, X, User as UserIcon, ChevronDown, ChevronUp, ListChecks, ArrowRight, Repeat, Target, CalendarDays, Calendar, Users, Hash, Bell, HelpCircle, PlusCircle, Search, Activity, CheckCircle, Inbox } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import LogoSmall from '../assets/Logo_small_size.png';
import {
    DndContext,
    pointerWithin,
    KeyboardSensor,
    MouseSensor,
    useSensor,
    useSensors,
    TouchSensor
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableProjectItem from './SortableProjectItem';
import SettingsModal from './SettingsModal';
import FriendsModal from './FriendsModal';
import CreateProjectModal from './CreateProjectModal';
import TemplateStoreModal from './TemplateStoreModal';
import GlobalAddTaskModal from './GlobalAddTaskModal';
import DynamicTodayIcon from './DynamicTodayIcon';
import UserMenuDropdown from './UserMenuDropdown';
import cache from '../utils/cache';

const API_URL = '/api';

const Sidebar = ({ isOpen, onToggle }) => {
    const { theme, toggleTheme } = useTheme();
    const { user, logout, authFetch } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [, startTransition] = useTransition();

    const [projects, setProjects] = useState([]);
    const [counts, setCounts] = useState({ todayCount: 0, inboxCount: 0, projectCounts: {} });
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isFriendsOpen, setIsFriendsOpen] = useState(false);
    const [initialSettingsTab, setInitialSettingsTab] = useState('account');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGlobalAddModal, setShowGlobalAddModal] = useState(false);

    // Template modal states
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    const userMenuRef = useRef(null);
    const addMenuRef = useRef(null);

    useEffect(() => {
        const handleOpenFriends = () => setIsFriendsOpen(true);
        const handleOpenGlobalAdd = () => {
            const path = window.location.pathname;
            // List of pages that handle 'fabAddTask' (Add Task via GlobalFAB/Click) inline
            // We only want the Global Modal if we are NOT on one of these pages.
            // Exception: Calendar always uses the Modal.
            const isCalendar = path === '/calendar';
            const isInlinePage = path === '/today' || path === '/inbox' || path.startsWith('/project/');

            if (isCalendar || !isInlinePage) {
                setShowGlobalAddModal(true);
            }
        };

        window.addEventListener('openFriendsModal', handleOpenFriends);
        window.addEventListener('fabAddTask', handleOpenGlobalAdd);
        return () => {
            window.removeEventListener('openFriendsModal', handleOpenFriends);
            window.removeEventListener('fabAddTask', handleOpenGlobalAdd);
        };
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 50, tolerance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchProjects = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/users/current/projects`);
            if (res.ok) setProjects(await res.json());
        } catch (error) {
            console.error('Error fetching projects:', error);
        }
    }, [user.id]);

    const fetchCounts = useCallback(async () => {
        try {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const res = await authFetch(`${API_URL}/users/current/sidebar-counts?date=${todayStr}`);
            if (res.ok) {
                const data = await res.json();
                setCounts(data);
                // Broadcast granular counts for DynamicTitle component
                window.dispatchEvent(new CustomEvent('taskCountUpdated', {
                    detail: {
                        today: data.todayCount || 0,
                        inbox: data.inboxCount || 0
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching counts:', error);
        }
    }, [user.id]);

    useEffect(() => {
        if (user) {
            fetchProjects();
            fetchCounts();
        }
    }, [user, location.pathname, fetchProjects, fetchCounts]);

    // Handle "on-hot" updates via shared events
    useEffect(() => {
        const handleRefresh = () => {
            fetchCounts();
            fetchProjects();
        };
        window.addEventListener('refreshSidebarCounts', handleRefresh);
        return () => window.removeEventListener('refreshSidebarCounts', handleRefresh);
    }, [fetchCounts, fetchProjects]);

    // Update whenever the sidebar is opened (user clicks/swipes it open)
    useEffect(() => {
        if (isOpen && user) {
            // Delay fetching slightly to allow the opening animation to be ultra-smooth
            const timer = setTimeout(() => {
                fetchCounts();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, user, fetchCounts]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target)) setIsUserMenuOpen(false);
            if (addMenuRef.current && !addMenuRef.current.contains(event.target)) setIsAddMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleNav = (path) => {
        // Start route transition
        startTransition(() => {
            navigate(path);
        });

        // Sidebar close is now handled by Layout.jsx logic to wait for page load
    };

    const openTemplateModal = () => {
        setShowTemplateModal(true);
        if (window.innerWidth <= 992) onToggle(); // Close sidebar on mobile
        setIsAddMenuOpen(false);
    };

    if (!user) return null;

    const navLinks = [
        { action: () => setShowGlobalAddModal(true), label: 'הוסף משימה', icon: Plus, isAddTask: true },
        { path: '/inbox', label: 'תיבת המשימות', icon: Inbox, badge: counts.inboxCount > 0 ? counts.inboxCount.toString() : null },
        { path: '/today', label: 'היום', icon: DynamicTodayIcon, badge: counts.todayCount > 0 ? counts.todayCount.toString() : null },
        { path: '/calendar', label: 'לו"ז', icon: Calendar },
        { path: '/history', label: 'פעילות', icon: CheckCircle },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const isProjectPage = location.pathname.startsWith('/project/');

    return (
        <>
            <aside className={`sidebar ${!isOpen ? 'closed' : 'open'}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>
                        {/* User Selector */}
                        <div ref={userMenuRef} style={{ position: 'relative', flexGrow: 1, minWidth: 0, paddingRight: '0.25rem', zIndex: 50 }}>
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    background: isUserMenuOpen ? 'var(--dropdown-hover)' : 'transparent',
                                    border: 'none', cursor: 'pointer',
                                    padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-md)',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)', width: '100%',
                                    color: 'var(--text-primary)',
                                    boxShadow: isUserMenuOpen ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                }}
                                onMouseEnter={e => !isUserMenuOpen && (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                                onMouseLeave={e => !isUserMenuOpen && (e.currentTarget.style.background = 'transparent')}
                                className="sidebar-menu-item"
                            >
                                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                    <div style={{
                                        width: '30px', height: '30px', borderRadius: '50%',
                                        background: user.profile_image ? `url(${API_URL}${user.profile_image}) center/cover` : 'var(--primary-color)',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0,
                                        border: '1.5px solid var(--border-color)',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        {!user.profile_image && <UserIcon size={14} />}
                                    </div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</span>
                                <ChevronDown size={14} style={{ opacity: 0.6, transform: isUserMenuOpen ? 'rotate(180deg)' : 'none', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginTop: '1px', marginRight: 'auto' }} />
                            </button>

                            {isUserMenuOpen && (
                                <UserMenuDropdown
                                    theme={theme}
                                    toggleTheme={toggleTheme}
                                    logout={logout}
                                    setIsFriendsOpen={setIsFriendsOpen}
                                    setIsUserMenuOpen={setIsUserMenuOpen}
                                    setInitialSettingsTab={setInitialSettingsTab}
                                    setIsSettingsOpen={setIsSettingsOpen}
                                    onToggle={onToggle}
                                />
                            )}
                        </div>

                        {/* Top Utility Icons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0, paddingLeft: '0.5rem' }}>
                            <button className="btn-icon-soft" style={{ width: '36px', height: '36px', position: 'relative' }}>
                                <Bell size={20} strokeWidth={1.8} />
                                <span style={{ position: 'absolute', top: 8, left: 8, width: 8, height: 8, background: 'var(--primary-color)', borderRadius: '50%', border: '2px solid var(--sidebar-bg)', boxShadow: '0 0 0 1px rgba(0,0,0,0.05)' }}></span>
                            </button>
                            {isOpen && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                                    className="btn-icon-soft"
                                    style={{ width: '36px', height: '36px' }}
                                    title="סגור סרגל"
                                >
                                    <img src="/sidebar_is_open.svg" alt="close sidebar" style={{ width: '30px', height: 'auto', filter: 'brightness(0) saturate(100%) invert(35%) sepia(13%) saturate(1200%) hue-rotate(182deg) brightness(95%) contrast(88%)', opacity: 0.8, display: 'block', transition: 'transform 0.2s ease' }} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            if (link.isSearch) {
                                return (
                                    <Link
                                        key={link.label}
                                        to="/search"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleNav('/search');
                                        }}
                                        className="nav-link sidebar-menu-item"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <Icon size={18} strokeWidth={1.8} className="nav-icon" />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            }
                            if (link.action) {
                                return (
                                    <button
                                        key={link.label}
                                        onClick={() => { link.action(); if (window.innerWidth <= 992) onToggle(); }}
                                        className="nav-link sidebar-menu-item"
                                        style={{
                                            width: '100%',
                                            textAlign: 'right',
                                            background: 'transparent',
                                            border: 'none',
                                            fontFamily: 'inherit',
                                            cursor: 'pointer',
                                            color: link.isAddTask ? 'var(--primary-color)' : 'inherit',
                                            fontWeight: link.isAddTask ? 700 : 500
                                        }}
                                    >
                                        <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                            {link.isAddTask ? (
                                                <div style={{
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: 'var(--radius-sm)',
                                                    backgroundColor: 'var(--primary-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'transform 0.2s',
                                                }}>
                                                    <Plus size={16} style={{ color: 'var(--sidebar-bg)' }} strokeWidth={2.5} />
                                                </div>
                                            ) : (
                                                <Icon
                                                    size={18}
                                                    strokeWidth={1.8}
                                                    color="currentColor"
                                                    className="nav-icon"
                                                />
                                            )}
                                        </div>
                                        <span>{link.label}</span>
                                        {link.badge && <span className="sidebar-badge">{link.badge}</span>}
                                    </button>
                                );
                            }
                            const isActive = link.path === '/' ? location.pathname === '/' : location.pathname.startsWith(link.path);
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleNav(link.path);
                                    }}
                                    className={`nav-link sidebar-menu-item ${isActive ? 'active' : ''}`}
                                >
                                    <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                        <Icon size={18} strokeWidth={1.8} className="nav-icon" />
                                    </div>
                                    <span>{link.label}</span>
                                    {link.badge && <span className="sidebar-badge">{link.badge}</span>}
                                </Link>
                            );
                        })}
                    </div>


                    {/* Projects section */}
                    <div className="nav-section projects-section" style={{ marginTop: '0.2rem' }}>
                        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0', marginBottom: '0', color: 'var(--text-primary)', position: 'relative' }} ref={addMenuRef}>
                            <Link
                                autoFocus={false}
                                to="/projects"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleNav('/projects');
                                }}
                                className="nav-link sidebar-menu-item"
                                style={{ flexGrow: 1 }}
                            >
                                <Folder size={18} strokeWidth={2} style={{ color: 'var(--text-primary)' }} />
                                <span style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '-0.3px', cursor: 'pointer' }}>הפרויקטים שלי</span>
                            </Link>
                            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                <button
                                    className="btn-icon-soft"
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        padding: '0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: isAddMenuOpen ? 'var(--hover-bg)' : 'transparent',
                                        color: isAddMenuOpen ? 'var(--primary-color)' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                                    title="אפשרויות הוספה"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                </button>
                                <button className="btn-icon-soft" style={{ width: '24px', height: '24px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ChevronDown size={16} />
                                </button>
                            </div>

                            {isAddMenuOpen && (
                                <div className="action-menu-dropdown fade-in slide-down" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.4rem', zIndex: 100, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', padding: '0.2rem' }}>
                                    <button className="action-menu-item" onClick={() => { setShowCreateModal(true); setIsAddMenuOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.85rem', width: '100%', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}>
                                        <Folder size={18} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontWeight: 500, fontSize: '1rem' }}>פרויקט חדש</span>
                                    </button>
                                    <button className="action-menu-item" onClick={openTemplateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 0.85rem', width: '100%', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}>
                                        <Layers size={18} style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ fontWeight: 500, fontSize: '1rem' }}>גלה תבניות</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="projects-list">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={pointerWithin}
                                onDragEnd={async (event) => {
                                    const { active, over } = event;
                                    if (active.id !== over?.id) {
                                        const oldIndex = projects.findIndex(p => p.id === active.id);
                                        const newIndex = projects.findIndex(p => p.id === over.id);
                                        const newProjects = arrayMove(projects, oldIndex, newIndex);
                                        setProjects(newProjects);

                                        try {
                                            await authFetch(`${API_URL}/users/current/projects/reorder`, {
                                                method: 'PUT',
                                                body: JSON.stringify({ projectIds: newProjects.map(p => p.id) })
                                            });
                                        } catch (err) {
                                            console.error('Failed to save project order', err);
                                        }
                                    }
                                }}
                            >
                                <SortableContext
                                    items={projects.filter(p => !p.parent_id).map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {(() => {
                                        const rootProjects = projects.filter(p => !p.parent_id);
                                        const getChildren = (parentId) => projects.filter(p => Number(p.parent_id) === Number(parentId));
                                        
                                        // Recursive function to get total sum of tasks for a project and its children
                                        const getProjectTotalCount = (projectId) => {
                                            let sum = counts.projectCounts?.[projectId] || 0;
                                            const children = getChildren(projectId);
                                            children.forEach(child => {
                                                sum += getProjectTotalCount(child.id);
                                            });
                                            return sum;
                                        };

                                        return rootProjects.map(proj => {
                                            const isProjActive = location.pathname === `/project/${proj.id}`;
                                            const totalCount = getProjectTotalCount(proj.id);
                                            return (
                                                <div
                                                    key={proj.id}
                                                    onMouseEnter={() => {
                                                        cache.prefetch(`project_data_${proj.id}`, `${API_URL}/projects/${proj.id}`, authFetch);
                                                    }}
                                                >
                                                    <SortableProjectItem
                                                        proj={proj}
                                                        isProjActive={isProjActive}
                                                        onToggle={onToggle}
                                                        getChildren={getChildren}
                                                        location={location}
                                                        startTransition={startTransition}
                                                        handleNav={handleNav}
                                                        taskCount={totalCount}
                                                        getProjectTotalCount={getProjectTotalCount}
                                                    />
                                                </div>
                                            );
                                        });
                                    })()}
                                </SortableContext>
                            </DndContext>
                        </div>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="nav-link sidebar-menu-item" style={{ border: 'none', background: 'transparent', width: '100%', cursor: 'pointer', padding: '0.5rem' }}>
                        <HelpCircle size={18} style={{ opacity: 0.6 }} strokeWidth={2} className="nav-icon" />
                        <span style={{ fontSize: '0.9rem' }}>עזרה ומשאבים</span>
                    </button>
                </div>
            </aside>

            {/* Template Store Modal */}
            <TemplateStoreModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onCreated={(newProject) => {
                    setProjects(prev => [newProject, ...prev]);
                    setShowTemplateModal(false);
                    if (window.innerWidth <= 992) onToggle();
                    const isMagic = newProject._fromTemplateMagic;
                    navigate(`/project/${newProject.id}`, isMagic ? { state: { magicReveal: true } } : undefined);
                }}
                userId={user.id}
                apiUrl={API_URL}
            />

            {/* Create Project Modal */}
            <CreateProjectModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={(newProject) => {
                    setProjects(prev => [newProject, ...prev]);
                    setShowCreateModal(false);
                    if (window.innerWidth <= 992) onToggle();
                    navigate(`/project/${newProject.id}`);
                }}
                existingProjects={projects}
                userId={user.id}
                apiUrl={API_URL}
            />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} initialTab={initialSettingsTab} />
            <FriendsModal isOpen={isFriendsOpen} onClose={() => setIsFriendsOpen(false)} />

            <GlobalAddTaskModal isOpen={showGlobalAddModal} onClose={() => setShowGlobalAddModal(false)} />
        </>
    );
};

export default memo(Sidebar);
