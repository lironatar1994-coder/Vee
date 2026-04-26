import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, ChevronDown } from 'lucide-react';
import useHistoryModal from '../../hooks/useHistoryModal';

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

const ProjectSettingsModal = ({ isOpen, onClose, project, onSave }) => {
    const [settingsTitle, setSettingsTitle] = useState('');
    const [settingsColor, setSettingsColor] = useState('#6366f1');
    const [settingsDescription, setSettingsDescription] = useState('');
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const colorPickerRef = useRef(null);

    useHistoryModal(isOpen, onClose, 'project-settings');

    useEffect(() => {
        if (isOpen && project) {
            setSettingsTitle(project.title || '');
            setSettingsColor(project.color || '#6366f1');
            setSettingsDescription(project.description || '');
        }
    }, [isOpen, project]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setIsColorPickerOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            title: settingsTitle,
            color: settingsColor,
            description: settingsDescription
        });
    };

    return createPortal(
        <div 
            className="sidebar-backdrop fade-in" 
            onClick={onClose}
            style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.3)' }}
        >
            <div 
                className="card animate-pop" 
                style={{ width: '90%', maxWidth: '480px', padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-2xl)', background: 'var(--bg-color)' }} 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ background: 'var(--hover-bg)', padding: '0.5rem', borderRadius: '8px' }}>
                            <Settings size={22} color="var(--primary-color)" />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>הגדרות פרויקט</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft" style={{ borderRadius: '8px' }}><X size={20} /></button>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <form id="edit-project-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Title Field */}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>שם הפרויקט</label>
                            <input
                                type="text"
                                value={settingsTitle}
                                onChange={(e) => setSettingsTitle(e.target.value)}
                                className="form-control"
                                placeholder="לדוגמה: משימות אישיות"
                                style={{ height: '42px', borderRadius: '10px' }}
                                autoFocus
                            />
                        </div>

                        {/* Color Selector */}
                        <div className="form-group" style={{ position: 'relative' }} ref={colorPickerRef}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>צבע אייקון</label>
                            <button
                                type="button"
                                onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                style={{
                                    width: '100%', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '0 1rem', borderRadius: '10px', border: '1px solid var(--border-color)',
                                    background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: settingsColor, boxShadow: `0 0 0 2px var(--bg-color), 0 0 0 3px ${settingsColor}` }}></div>
                                    <span style={{ fontWeight: 500 }}>{PROJECT_COLORS.find(c => c.value === settingsColor)?.label || 'מותאם'}</span>
                                </div>
                                <ChevronDown size={16} />
                            </button>

                            {isColorPickerOpen && (
                                <div className="dropdown-menu fade-in slide-down" style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem',
                                    background: 'var(--bg-color)', borderRadius: '12px', border: '1px solid var(--border-color)',
                                    boxShadow: 'var(--shadow-xl)', zIndex: 100, maxHeight: '200px', overflowY: 'auto', padding: '0.4rem'
                                }}>
                                    {PROJECT_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => { setSettingsColor(c.value); setIsColorPickerOpen(false); }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.8rem',
                                                border: 'none', background: settingsColor === c.value ? 'var(--hover-bg)' : 'transparent',
                                                cursor: 'pointer', textAlign: 'right', borderRadius: '8px'
                                            }}
                                        >
                                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: c.value }}></div>
                                            <span style={{ flex: 1, fontWeight: settingsColor === c.value ? 600 : 400 }}>{c.label}</span>
                                            {settingsColor === c.value && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary-color)' }}></div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Description Field */}
                        <div className="form-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>תיאור פרויקט</label>
                            <textarea
                                value={settingsDescription}
                                onChange={(e) => setSettingsDescription(e.target.value)}
                                className="form-control"
                                placeholder="הוסף פרטים נוספים על הפרויקט..."
                                style={{ height: '100px', borderRadius: '10px', padding: '0.75rem', resize: 'none' }}
                            />
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-start', gap: '0.75rem' }}>
                    <button 
                        type="submit" 
                        form="edit-project-form"
                        className="btn btn-primary" 
                        style={{ padding: '0.6rem 1.5rem', borderRadius: '10px', fontWeight: 600 }}
                        disabled={!settingsTitle.trim()}
                    >
                        שמור שינויים
                    </button>
                    <button 
                        onClick={onClose} 
                        className="btn-icon-soft" 
                        style={{ padding: '0.6rem 1.25rem', borderRadius: '10px', height: 'auto', fontSize: '0.95rem' }}
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProjectSettingsModal;
