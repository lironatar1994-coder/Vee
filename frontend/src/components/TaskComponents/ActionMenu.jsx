import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Trash2, Edit3, CheckCircle } from 'lucide-react';

const ActionMenu = ({ onDelete, onSetDate, onEdit, onComplete, onOpenChange, itemDate, label = "אפשרויות", setDateLabel = "הגדר תאריך יעד" }) => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (onOpenChange) onOpenChange(isOpen);
    }, [isOpen, onOpenChange]);
    const menuRef = React.useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDelete = (e) => {
        e.stopPropagation();
        setIsOpen(false);
        onDelete(e);
    };

    return (
        <div className="action-menu-container" ref={menuRef} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="btn-icon-soft"
                title={label}
                style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--text-secondary)', letterSpacing: '1px', fontWeight: 'bold' }}
            >
                ...
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    boxShadow: '6px 8px 25px rgba(0,0,0,0.1), 3px 0 10px rgba(0,0,0,0.02)',
                    minWidth: '200px',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    direction: 'rtl',
                    animation: 'slideDown 0.15s ease-out'
                }}>
                    <div style={{ padding: '0.4rem' }}>
                        {onEdit && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); onEdit(); }}
                                className="action-menu-item"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                                    width: '100%', textAlign: 'right',
                                    padding: '0.6rem 1rem', background: 'transparent',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                                    borderRadius: '8px', fontSize: '0.95rem'
                                }}
                            >
                                <Edit3 size={16} color="var(--text-secondary)" /> עריכה
                            </button>
                        )}
                        {onComplete && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsOpen(false); onComplete(); }}
                                className="action-menu-item"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.8rem',
                                    width: '100%', textAlign: 'right',
                                    padding: '0.6rem 1rem', background: 'transparent',
                                    border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                                    borderRadius: '8px', fontSize: '0.95rem'
                                }}
                            >
                                <CheckCircle size={16} color="var(--success-color)" /> סמן הכל כהושלם
                            </button>
                        )}
                        {onSetDate && (
                            <div style={{ position: 'relative', width: '100%' }}>
                                <button
                                    className="action-menu-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.8rem',
                                        width: '100%', textAlign: 'right',
                                        padding: '0.6rem 1rem', background: 'transparent',
                                        border: 'none', cursor: 'pointer', color: 'var(--text-primary)',
                                        borderRadius: '8px', fontSize: '0.95rem'
                                    }}
                                >
                                    <CalendarIcon size={16} color="var(--text-secondary)" /> {setDateLabel}
                                </button>
                                <input
                                    type="date"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                    value={itemDate || ''}
                                    onChange={(e) => { onSetDate(e.target.value); setIsOpen(false); }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}
                        {(onEdit || onComplete || onSetDate) && (
                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.3rem 0.5rem' }} />
                        )}
                        <button
                            onClick={handleDelete}
                            className="action-menu-item action-menu-item-danger"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.8rem',
                                width: '100%', textAlign: 'right',
                                padding: '0.6rem 1rem', background: 'transparent',
                                border: 'none', cursor: 'pointer', color: 'var(--danger-color)',
                                borderRadius: '8px', fontSize: '0.95rem'
                            }}
                        >
                            <Trash2 size={16} /> מחיקה
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionMenu;
