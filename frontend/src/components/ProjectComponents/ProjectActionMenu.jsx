import React from 'react';
import { Pencil, Copy, Trash2, Plus } from 'lucide-react';

const ProjectActionMenu = ({ show, onClose, onEdit, onDuplicate, onDelete, onAddSection, theme, menuRef }) => {
    if (!show) return null;

    return (
        <div 
            ref={menuRef}
            style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '0.6rem',
                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: theme === 'dark' ? '0 20px 50px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
                width: '220px',
                zIndex: 10000,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                padding: '0.4rem 0',
                direction: 'rtl',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
            }}
        >
            <button
                onClick={() => {
                    onAddSection();
                    onClose();
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'right', width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    <Plus size={18} />
                </div>
                <span>הוסף רשומה</span>
            </button>

            <button
                onClick={() => {
                    onEdit();
                    onClose();
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'right', width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    <Pencil size={18} />
                </div>
                <span>עריכה</span>
            </button>

            <button
                onClick={() => {
                    onDuplicate();
                    onClose();
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'right', width: '100%', color: 'var(--text-primary)',
                    fontSize: '0.95rem', fontWeight: 500, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--dropdown-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
                    <Copy size={18} />
                </div>
                <span>שכפול פרויקט</span>
            </button>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.2rem 0' }} />

            <button
                onClick={() => {
                    onDelete();
                    onClose();
                }}
                style={{
                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                    padding: '0.7rem 1rem', background: 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'right',
                    width: '100%', color: 'var(--danger-color)',
                    fontSize: '0.95rem', fontWeight: 600, fontFamily: 'inherit',
                    transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'var(--danger-color-soft, rgba(239, 68, 68, 0.1))'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.8 }}>
                    <Trash2 size={18} />
                </div>
                <span>מחיקת פרויקט</span>
            </button>
        </div>
    );
};

export default ProjectActionMenu;
