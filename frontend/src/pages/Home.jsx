import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useUser } from '../context/UserContext';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus, Trash2, Repeat, Target, ListChecks, ArrowRight, ChevronDown, X, Search, ChevronLeft } from 'lucide-react';
import TaskPageLayout from '../components/TaskPageLayout';
import cache from '../utils/cache';
import PageSkeleton from '../components/PageSkeleton';

const CreateProjectModal = lazy(() => import('../components/CreateProjectModal'));
const TemplateStoreModal = lazy(() => import('../components/TemplateStoreModal'));

const API_URL = '/api';

const Home = () => {
    const { user, authFetch } = useUser();
    const navigate = useNavigate();
    const [projects, setProjects] = useState(() => cache.get('home_projects') || []);
    const [loading, setLoading] = useState(!cache.get('home_projects'));

    // New Add Project states
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [scrollTop, setScrollTop] = useState(0);

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/users/current/projects`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data);
                cache.set('home_projects', data);
            }
        } catch (err) {
            console.error('Error fetching projects:', err);
        }
        setLoading(false);
    }, [user.id]);

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user, fetchProjects]);

    // Click outside listener for the dropdown menu
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isAddMenuOpen && !e.target.closest('.add-dropdown-container')) {
                setIsAddMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isAddMenuOpen]);

    const handleDeleteProject = async (id, e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה ואת כל התבניות שבתוכו?')) return;
        try {
            await authFetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
            setProjects(projects.filter(p => p.id !== id));
        } catch (err) {
            console.error('Error deleting project:', err);
        }
    };


    if (loading && projects.length === 0) {
        return (
            <TaskPageLayout title="טוען...">
                <PageSkeleton />
            </TaskPageLayout>
        );
    }


    return (
        <TaskPageLayout
            title="הפרויקטים שלי"
            titleContent={
                <div style={{
                    transition: 'all 0.35s ease',
                    opacity: Math.max(0, 1 - Math.max(0, scrollTop) / 60),
                    transform: `translateY(${Math.max(0, scrollTop) * 0.15}px)`
                }}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.5px',
                            display: 'inline-block'
                        }}
                    >
                        הפרויקטים שלי
                    </h1>
                </div>
            }
            externalScrollTop={scrollTop}
            onScroll={setScrollTop}
        >
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '5rem' }}>

                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
                    <div className="add-dropdown-container" style={{ position: 'relative' }}>
                        <button
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                padding: '0.35rem 0.6rem',
                                color: 'var(--text-primary)',
                                fontWeight: 500,
                                fontSize: '0.9rem',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Plus size={16} style={{ opacity: 0.6 }} />
                            הוסף
                            <ChevronDown size={14} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: isAddMenuOpen ? 'rotate(180deg)' : 'none' }} />
                        </button>

                        {isAddMenuOpen && (
                            <div
                                className="action-menu-dropdown fade-in slide-down"
                                style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                    width: '200px', zIndex: 100, background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                                    boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
                                }}
                            >
                                <button
                                    className="action-menu-item"
                                    onClick={() => { setShowCreateModal(true); setIsAddMenuOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', textAlign: 'right', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                    <Folder size={16} style={{ color: 'var(--primary-color)' }} />
                                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>פרויקט חדש</div>
                                </button>
                                <button
                                    className="action-menu-item"
                                    onClick={() => { setShowTemplateModal(true); setIsAddMenuOpen(false); }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', width: '100%', textAlign: 'right', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
                                >
                                    <ListChecks size={16} style={{ color: 'var(--success-color)' }} />
                                    <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>בחר מתבנית</div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <Suspense fallback={null}>
                    {showCreateModal && (
                        <CreateProjectModal
                            isOpen={showCreateModal}
                            onClose={() => setShowCreateModal(false)}
                            onCreated={(newProject) => {
                                setProjects([newProject, ...projects]);
                                navigate(`/project/${newProject.id}`);
                            }}
                            existingProjects={projects}
                            userId={user.id}
                            apiUrl={API_URL}
                        />
                    )}
                </Suspense>

                <Suspense fallback={null}>
                    {showTemplateModal && (
                        <TemplateStoreModal
                            isOpen={showTemplateModal}
                            onClose={() => setShowTemplateModal(false)}
                            onCreated={(newProject) => {
                                setProjects([newProject, ...projects]);
                                const isMagic = newProject._fromTemplateMagic;
                                navigate(`/project/${newProject.id}`, isMagic ? { state: { magicReveal: true } } : undefined);
                            }}
                            userId={user.id}
                            apiUrl={API_URL}
                        />
                    )}
                </Suspense>

                {projects.length === 0 ? (
                    <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', border: 'none', borderRadius: 'var(--radius-lg)', background: 'var(--bg-secondary)', boxShadow: 'var(--card-shadow)', transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <div style={{ width: '80px', height: '80px', background: 'var(--sidebar-active-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', transform: 'scale(1.1)' }}>
                            <Folder size={40} style={{ color: 'var(--primary-color)', strokeWidth: 2 }} />
                        </div>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>אין לך פרויקטים עדיין</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 2.5rem' }}>התחיל/י על ידי יצירת פרויקט חדש לדוגמה "Vee".</p>
                        <button onClick={() => setIsAddMenuOpen(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 2rem', borderRadius: 'var(--radius-full)', fontWeight: 600, boxShadow: '0 4px 12px rgba(226, 123, 88, 0.3)' }}>
                            הוסף פרויקט חדש <ChevronDown size={16} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ paddingBottom: '0.8rem', borderBottom: '2px dashed var(--border-color)', marginBottom: '1.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>{projects.length} פרויקטים</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {projects.map((project) => (
                                <Link
                                    key={project.id}
                                    to={`/project/${project.id}`}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1.25rem 1.5rem',
                                        textDecoration: 'none',
                                        color: 'var(--text-primary)',
                                        transition: 'var(--transition)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--bg-secondary)',
                                        boxShadow: 'var(--card-shadow)',
                                        border: '1px solid transparent'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'translateY(-3px)';
                                        e.currentTarget.style.boxShadow = 'var(--float-hover-shadow)';
                                        e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.15)';
                                        e.currentTarget.querySelector('.project-arrow').style.transform = 'translateX(-4px)';
                                        e.currentTarget.querySelector('.project-arrow').style.opacity = '1';
                                        e.currentTarget.querySelector('.project-icon').style.color = 'var(--primary-color)';
                                        e.currentTarget.querySelector('.project-icon').style.background = 'var(--sidebar-active-bg)';
                                        
                                        // Intelligent Pre-fetching
                                        cache.prefetch(`project_data_${project.id}`, `${API_URL}/users/current/projects/${project.id}`, authFetch);
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'var(--card-shadow)';
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.querySelector('.project-arrow').style.transform = 'translateX(0)';
                                        e.currentTarget.querySelector('.project-arrow').style.opacity = '0';
                                        e.currentTarget.querySelector('.project-icon').style.color = 'var(--text-secondary)';
                                        e.currentTarget.querySelector('.project-icon').style.background = 'transparent';
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div className="project-icon" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'all 0.3s ease' }}>
                                            <Folder size={18} strokeWidth={2} />
                                        </div>
                                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>{project.title}</span>
                                    </div>
                                    <ArrowRight className="project-arrow" size={18} style={{ color: 'var(--primary-color)', opacity: 0, transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </TaskPageLayout>
    );
};

export default Home;
