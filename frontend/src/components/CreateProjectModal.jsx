import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Folder, Check, ChevronDown, Repeat, Target } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';

const PROJECT_COLORS = [
    { label: 'לבן', value: '#ffffff' },
    { label: 'סגול', value: '#6366f1' },
    { label: 'כחול', value: '#3b82f6' },
    { label: 'ציאן', value: '#06b6d4' },
    { label: 'ירוק', value: '#22c55e' },
    { label: 'ליים', value: '#84cc16' },
    { label: 'צהוב', value: '#eab308' },
    { label: 'כתום', value: '#f97316' },
    { label: 'אדום', value: '#ef4444' },
    { label: 'ורוד', value: '#ec4899' },
    { label: 'אפור', value: '#6b7280' },
];

export default function CreateProjectModal({ isOpen, onClose, onCreated, existingProjects = [], userId, apiUrl }) {
    const { authFetch } = useUser();
    const [title, setTitle] = useState('');
    const [color, setColor] = useState('#6b7280'); // Default to Gray (אפור)
    const [parentId, setParentId] = useState('');
    const [loading, setLoading] = useState(false);

    // Dropdown states
    const [isColorOpen, setIsColorOpen] = useState(false);
    const [isParentOpen, setIsParentOpen] = useState(false);

    const colorRef = useRef(null);
    const parentRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (colorRef.current && !colorRef.current.contains(e.target)) setIsColorOpen(false);
            if (parentRef.current && !parentRef.current.contains(e.target)) setIsParentOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        try {
            const res = await authFetch(`${apiUrl}/users/current/projects`, {
                method: 'POST',
                body: JSON.stringify({
                    title: title.trim(),
                    color,
                    parent_id: parentId ? Number(parentId) : null
                }),
            });
            if (res.ok) {
                const newProject = await res.json();
                onCreated(newProject);
                toast.success('הפרויקט נוצר בהצלחה');
                setTitle('');
                setColor('#6b7280');
                setParentId('');
                onClose();
            }
        } catch (err) {
            console.error('Failed to create project:', err);
        }
        setLoading(false);
    };

    const rootProjects = existingProjects.filter(p => !p.parent_id);
    const selectedColorObj = PROJECT_COLORS.find(c => c.value === color) || PROJECT_COLORS[0];
    const selectedParent = existingProjects.find(p => p.id === Number(parentId));

    return createPortal(
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '1rem',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="card animate-pop"
                style={{
                    background: 'var(--bg-color)',
                    borderRadius: '12px',
                    width: '100%',
                    maxWidth: '450px',
                    maxHeight: '85vh',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Sticky Header */}
                <div style={{
                    padding: '0.75rem 1.25rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    flexShrink: 0,
                    background: 'var(--bg-color)',
                    zIndex: 2
                }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 500 }}>פרויקט חדש</h3>
                    <button onClick={onClose} className="btn-icon-soft" style={{ padding: '0.2rem', color: 'var(--text-primary)' }}>
                        <X size={26} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Content (Scrollable) */}
                <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flexGrow: 1 }}>
                    <form id="create-project-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        {/* Name */}
                        <div className="form-group" style={{ position: 'relative' }}>
                            <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                שם
                            </label>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type="text"
                                    autoFocus
                                    className="form-control"
                                    placeholder=""
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={120}
                                    style={{
                                        height: '36px',
                                        paddingRight: '0.6rem',
                                        paddingLeft: '3.5rem',
                                        border: '1px solid #ddd',
                                        borderRadius: '6px',
                                        background: 'var(--bg-color)',
                                        fontSize: '0.9rem',
                                        fontWeight: 400,
                                        width: '100%',
                                        direction: 'rtl'
                                    }}
                                />

                            </div>
                        </div>

                        {/* Color Dropdown */}
                        <div className="form-group" style={{ position: 'relative' }} ref={colorRef}>
                            <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                צבע
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsColorOpen(!isColorOpen)}
                                style={{
                                    width: '100%',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #ddd',
                                    background: 'var(--bg-color)',
                                    cursor: 'pointer',
                                    transition: '0.1s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedColorObj.value }}></div>
                                    <span style={{ fontWeight: 400, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedColorObj.label}</span>
                                </div>
                                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                            </button>

                            {isColorOpen && (
                                <div className="dropdown-menu fade-in slide-down" style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.2rem',
                                    background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '180px', overflowY: 'auto',
                                    padding: '0.2rem'
                                }}>
                                    {PROJECT_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => { setColor(c.value); setIsColorOpen(false); }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem',
                                                border: 'none', background: color === c.value ? 'var(--hover-bg)' : 'transparent',
                                                cursor: 'pointer', textAlign: 'right', borderRadius: '4px'
                                            }}
                                        >
                                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.value }}></div>
                                            <span style={{ flex: 1, fontWeight: 400, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{c.label}</span>
                                            {color === c.value && <Check size={12} color="var(--primary-color)" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Parent Selector */}
                        <div className="form-group" style={{ position: 'relative' }} ref={parentRef}>
                            <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                פרויקט אב
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsParentOpen(!isParentOpen)}
                                style={{
                                    width: '100%',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '0 0.6rem',
                                    borderRadius: '6px',
                                    border: '1px solid #ddd',
                                    background: 'var(--bg-color)',
                                    cursor: 'pointer',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <span style={{ fontWeight: 400, color: selectedParent ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                        {selectedParent ? selectedParent.title : 'ללא פרויקט אב'}
                                    </span>
                                </div>
                                <ChevronDown size={14} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                            </button>

                            {isParentOpen && (
                                <div className="dropdown-menu fade-in slide-down" style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.2rem',
                                    background: 'var(--bg-color)', borderRadius: '6px', border: '1px solid var(--border-color)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '150px', overflowY: 'auto',
                                    padding: '0.2rem'
                                }}>
                                    <button
                                        type="button"
                                        onClick={() => { setParentId(''); setIsParentOpen(false); }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', padding: '0.5rem 0.6rem',
                                            border: 'none', background: !parentId ? 'var(--hover-bg)' : 'transparent',
                                            cursor: 'pointer', textAlign: 'right', borderRadius: '4px'
                                        }}
                                    >
                                        <span style={{ flex: 1, fontWeight: 400, color: 'var(--text-primary)', fontSize: '0.85rem' }}>ללא פרויקט אב</span>
                                        {!parentId && <Check size={12} color="var(--primary-color)" />}
                                    </button>
                                    {rootProjects.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => { setParentId(p.id.toString()); setIsParentOpen(false); }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.6rem',
                                                border: 'none', background: Number(parentId) === p.id ? 'var(--hover-bg)' : 'transparent',
                                                cursor: 'pointer', textAlign: 'right', borderRadius: '4px'
                                            }}
                                        >
                                            <div style={{ width: 8, height: 8, borderRadius: '2px', background: p.color || 'var(--text-secondary)' }}></div>
                                            <span style={{ flex: 1, fontWeight: 400, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{p.title}</span>
                                            {Number(parentId) === p.id && <Check size={12} color="var(--primary-color)" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {/* Sticky Footer */}
                <div style={{
                    padding: '0.85rem 1.5rem',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    gap: '0.85rem',
                    flexShrink: 0,
                    background: 'var(--bg-color)',
                    zIndex: 2
                }}>
                    <button
                        type="submit"
                        form="create-project-form"
                        disabled={!title.trim() || loading}
                        style={{
                            padding: '0.5rem 1.4rem',
                            fontSize: '0.92rem',
                            fontWeight: 600,
                            background: 'var(--primary-color)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: 'var(--btn-text-primary, #1a1a1a)',
                            opacity: !title.trim() || loading ? 0.5 : 1
                        }}
                    >
                        {loading ? 'יוצר...' : 'הוספה'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '0.5rem 1.4rem',
                            fontSize: '0.92rem',
                            fontWeight: 600,
                            background: '#f4f4f4',
                            border: 'none',
                            borderRadius: '4px',
                            color: '#1a1a1a',
                            cursor: 'pointer'
                        }}
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

