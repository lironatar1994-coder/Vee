import React, { useEffect, useState, useRef } from 'react';
import { useUser } from '../context/UserContext';
import TaskPageLayout from '../components/TaskPageLayout';
import { ChevronDown } from 'lucide-react';
import cache from '../utils/cache';

const API_URL = '/api';

const History = () => {
    const { user, authFetch } = useUser();
    const [activities, setActivities] = useState(() => (user && cache.get(`history_data_${user.id}`)) || []);
    const [loading, setLoading] = useState(user ? !cache.get(`history_data_${user.id}`) : true);
    const [scrollTop, setScrollTop] = useState(0);
    const [projects, setProjects] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [selectedFilter, setSelectedFilter] = useState({
        type: 'all',
        id: null,
        label: 'כל הפרויקטים',
    });
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        let cancelled = false;

        const loadHistory = async () => {
            if (!cache.get(`history_data_${user.id}`)) {
                setLoading(true);
            }
            try {
                const res = await authFetch(`${API_URL}/users/current/activity`);
                if (res.ok) {
                    const data = await res.json();
                    if (!cancelled) {
                        setActivities(Array.isArray(data) ? data : []);
                        cache.set(`history_data_${user.id}`, data);
                    }
                } else if (!cancelled) {
                    setActivities(createFallbackActivities(user));
                }
            } catch (e) {
                if (!cancelled) {
                    setActivities(createFallbackActivities(user));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        loadHistory();

        return () => {
            cancelled = true;
        };
    }, [user]);

    useEffect(() => {
        if (!user) return;

        const loadProjects = async () => {
            try {
                const res = await authFetch(`${API_URL}/users/current/projects`);
                if (res.ok) {
                    const data = await res.json();
                    setProjects(Array.isArray(data) ? data : []);
                }
            } catch (_) {
                // Ignore project load errors; history still works without them
            }
        };

        loadProjects();
    }, [user]);

    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownOpen]);

    if (!user) return null;

    const filteredActivities = applyActivityFilter(activities, selectedFilter);
    const grouped = groupActivitiesByDate(filteredActivities);

    return (
        <TaskPageLayout
            title="היסטוריית פעילות"
            titleContent={
                <div
                    style={{
                        transition: 'all 0.35s ease',
                        opacity: Math.max(0, 1 - scrollTop / 60),
                        transform: `translateY(${scrollTop * 0.15}px)`,
                        maxWidth: '800px',
                        margin: '0 auto',
                        display: 'flex',
                        justifyContent: 'flex-start'
                    }}
                >
                    <div
                        ref={dropdownRef}
                        style={{ position: 'relative', display: 'inline-block' }}
                    >
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen((prev) => !prev)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '999px',
                                border: '1px solid transparent',
                                background: 'transparent',
                                cursor: 'pointer',
                                color: 'var(--text-primary)',
                                fontSize: '1.1rem',
                                fontWeight: 700,
                                letterSpacing: '-0.5px',
                                fontFamily: 'inherit',
                            }}
                        >
                            <span>פעילות: {selectedFilter.label}</span>
                            <ChevronDown
                                size={18}
                                style={{
                                    transition: 'transform 0.2s ease',
                                    transform: isDropdownOpen ? 'rotate(180deg)' : 'none',
                                }}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div
                                className="card fade-in"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '260px',
                                    maxWidth: '80vw',
                                    padding: '0.75rem',
                                    zIndex: 1200,
                                    background: 'var(--bg-secondary)',
                                    boxShadow: '0 10px 25px -8px rgba(0,0,0,0.25)',
                                }}
                            >
                                <input
                                    type="text"
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    placeholder="הקלד שם פרויקט"
                                    style={{
                                        width: '100%',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        padding: '0.4rem 0.6rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border-color)',
                                        background: 'var(--bg-color)',
                                        direction: 'rtl',
                                        fontFamily: 'inherit',
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFilter({ type: 'all', id: null, label: 'כל הפרויקטים' });
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 0.4rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        background: selectedFilter.type === 'all' ? 'var(--hover-bg)' : 'transparent',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-primary)',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    <span style={{ whiteSpace: 'nowrap' }}>כל הפרויקטים</span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>#</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedFilter({ type: 'inbox', id: null, label: 'תיבת המשימות' });
                                        setIsDropdownOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem 0.4rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '0.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: 'none',
                                        background: selectedFilter.type === 'inbox' ? 'var(--hover-bg)' : 'transparent',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        color: 'var(--text-primary)',
                                        marginBottom: '0.4rem',
                                    }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span
                                            style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '4px',
                                                background: '#e5e7eb',
                                            }}
                                        />
                                        <span>תיבת המשימות</span>
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inbox</span>
                                </button>

                                <div
                                    style={{
                                        padding: '0.35rem 0.2rem 0.2rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-secondary)',
                                        fontWeight: 600,
                                    }}
                                >
                                    הפרויקטים שלי
                                </div>

                                <div
                                    style={{
                                        maxHeight: '220px',
                                        overflowY: 'auto',
                                        paddingInline: '0.1rem',
                                    }}
                                >
                                    {projects
                                        .filter((p) =>
                                            projectSearch
                                                ? (p.title || '').toLowerCase().includes(projectSearch.toLowerCase())
                                                : true
                                        )
                                        .map((project) => {
                                            const isActive =
                                                selectedFilter.type === 'project' && selectedFilter.id === project.id;
                                            const color =
                                                project.color && project.color !== '#ffffff'
                                                    ? project.color
                                                    : 'var(--text-secondary)';
                                            return (
                                                <button
                                                    key={project.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedFilter({
                                                            type: 'project',
                                                            id: project.id,
                                                            label: project.title,
                                                        });
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.45rem 0.4rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '0.5rem',
                                                        borderRadius: 'var(--radius-md)',
                                                        border: 'none',
                                                        background: isActive ? 'var(--hover-bg)' : 'transparent',
                                                        cursor: 'pointer',
                                                        fontSize: '0.9rem',
                                                        color: 'var(--text-primary)',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '0.45rem',
                                                            minWidth: 0,
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                width: '10px',
                                                                height: '10px',
                                                                borderRadius: '50%',
                                                                background: color,
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <span
                                                            style={{
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {project.title}
                                                        </span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                </div>
                    </div>
                </div>
            }
            onScroll={setScrollTop}
            externalScrollTop={scrollTop}
        >
            <div
                style={{
                    maxWidth: '800px',
                    margin: '0 auto',
                    paddingBottom: '2.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2rem'
                }}
            >
                {loading && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '2.5rem 1rem',
                            color: 'var(--text-secondary)',
                            fontSize: '0.95rem'
                        }}
                    >
                        טוען היסטוריית פעילות...
                    </div>
                )}

                {!loading && grouped.length === 0 && (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '3rem 1rem',
                            borderRadius: 'var(--radius-lg)',
                            border: '2px dashed var(--border-color)',
                            background: 'var(--bg-secondary)',
                            fontSize: '0.95rem',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        עדיין אין היסטוריית פעילות. ברגע שתשלים משימות, הן יופיעו כאן.
                    </div>
                )}

                {grouped.map(({ date, items }) => (
                    <section key={date}>
                        <header
                            style={{
                                marginBottom: '0.5rem',
                                paddingBottom: '0.5rem',
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                fontWeight: 800,
                                borderBottom: '1px solid var(--border-color)',
                                marginTop: '1.5rem'
                            }}
                        >
                            {formatDateHeader(date)}
                        </header>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.5rem'
                            }}
                        >
                            {items.map((activity) => (
                                <article
                                    key={activity.id}
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '1rem',
                                        background: 'transparent',
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background 0.2s ease',
                                        cursor: 'default'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Avatar */}
                                    <div
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            flexShrink: 0,
                                            background: user.profile_image
                                                ? `url(${API_URL}${user.profile_image}) center/cover`
                                                : 'var(--primary-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: '0.9rem',
                                            fontWeight: 700,
                                            marginTop: '0.2rem'
                                        }}
                                    >
                                        {!user.profile_image && (user.username?.[0] || 'א')}
                                    </div>

                                    {/* Text and meta */}
                                    <div
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '0.35rem'
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: '1rem',
                                                color: 'var(--text-primary)',
                                                lineHeight: 1.4,
                                                fontWeight: 500
                                            }}
                                        >
                                            {activity.message}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.6rem',
                                                fontSize: '0.85rem',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            {activity.project_name && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {activity.project_name} 🏷️
                                                </span>
                                            )}
                                            <span>#</span>
                                            <span>{formatTime(activity.date)}</span>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </TaskPageLayout>
    );
};

function createFallbackActivities(user) {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(now.getDate() - 2);

    const displayName = user?.username || 'אתה';

    return [
        {
            id: '1',
            date: now.toISOString(),
            message: `${displayName} השלמת משימה חדשה`,
            project_name: 'בית'
        },
        {
            id: '2',
            date: now.toISOString(),
            message: `${displayName} השלמת סקירה שבועית של המשימות והמטרות`,
            project_name: 'בית'
        },
        {
            id: '3',
            date: yesterday.toISOString(),
            message: `${displayName} השלמת סקירה שבועית של המשימות והמטרות`,
            project_name: 'בית'
        },
        {
            id: '4',
            date: yesterday.toISOString(),
            message: `${displayName} השלמת משימה`,
            project_name: 'תיבת המשימות'
        },
        {
            id: '5',
            date: twoDaysAgo.toISOString(),
            message: `${displayName} השלמת משימה`,
            project_name: 'עבודה'
        }
    ];
}

function applyActivityFilter(allActivities, filter) {
    if (!allActivities || allActivities.length === 0) return [];
    if (!filter || filter.type === 'all') return allActivities;

    if (filter.type === 'inbox') {
        return allActivities.filter((activity) => {
            const name = (activity.project_name || '').toLowerCase();
            const isInboxName = name === 'inbox' || name === 'תיבת המשימות';
            const noProject = activity.project_id === null || typeof activity.project_id === 'undefined';
            return isInboxName || noProject;
        });
    }

    if (filter.type === 'project' && filter.id != null) {
        return allActivities.filter((activity) => {
            if (typeof activity.project_id !== 'undefined' && activity.project_id !== null) {
                return activity.project_id === filter.id;
            }
            return activity.project_name === filter.label;
        });
    }

    return allActivities;
}

function groupActivitiesByDate(activities) {
    if (!activities || activities.length === 0) return [];

    const sorted = [...activities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const byDate = new Map();

    sorted.forEach((activity) => {
        if (!activity.date) return;
        const key = activity.date.split('T')[0];
        if (!byDate.has(key)) {
            byDate.set(key, []);
        }
        byDate.get(key).push(activity);
    });

    return Array.from(byDate.entries()).map(([date, items]) => ({ date, items }));
}

function formatDateHeader(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return '';

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    const day = date.getDate();
    const month = date
        .toLocaleDateString('he-IL', { month: 'short' })
        .replace('.', '');
    const weekday = date.toLocaleDateString('he-IL', { weekday: 'long' });

    let middle = '';
    if (isSameDay(date, today)) {
        middle = 'היום';
    } else if (isSameDay(date, yesterday)) {
        middle = 'אתמול';
    }

    if (middle) {
        return `${day} ${month} · ${middle} · ${weekday}`;
    }
    return `${day} ${month} · ${weekday}`;
}

function formatTime(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('he-IL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default History;

