import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell } from 'lucide-react';

const ReminderSelectorDropdown = ({ isOpen, onClose, anchorRef, reminderMinutes, onSelect }) => {
    const dropdownRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0, visible: false });

    const reminderOptions = [
        { value: null, label: 'ללא תזכורת' },
        { value: 0, label: 'בזמן האירוע' },
        { value: 5, label: '5 דקות לפני' },
        { value: 15, label: '15 דקות לפני' },
        { value: 30, label: '30 דקות לפני' },
        { value: 60, label: 'שעה לפני' },
        { value: 1440, label: 'יום לפני' }
    ];

    useEffect(() => {
        if (!isOpen) {
            setPos(p => ({ ...p, visible: false }));
            return;
        }

        const updatePosition = () => {
            if (anchorRef?.current && dropdownRef.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                const menuRect = dropdownRef.current.getBoundingClientRect();
                const PANEL_W = menuRect.width || 180;
                const PANEL_H = menuRect.height || 280;

                // Horizontal: Try to align right edges (RTL), clamp to viewport
                let left = rect.right - PANEL_W;
                if (left < 8) left = 8;
                if (left + PANEL_W > window.innerWidth - 8) {
                    left = window.innerWidth - PANEL_W - 8;
                }

                // Vertical: Check space below vs above
                const spaceBelow = window.innerHeight - rect.bottom - 16;
                const spaceAbove = rect.top - 16;

                let top;
                if (spaceBelow >= PANEL_H || spaceBelow >= spaceAbove) {
                    top = rect.bottom + 6;
                } else {
                    top = rect.top - PANEL_H - 6;
                }

                if (top < 8) top = 8;
                
                setPos({ top, left, visible: true });
            }
        };

        updatePosition();
        const timer = setTimeout(updatePosition, 10);
        return () => clearTimeout(timer);
    }, [isOpen, anchorRef]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                minWidth: '180px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: 'var(--card-shadow)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                padding: '4px',
                visibility: pos.visible ? 'visible' : 'hidden',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                animation: 'slideUpFade 0.2s var(--ease-premium)',
                direction: 'rtl'
            }}
            onClick={e => e.stopPropagation()}
        >
            {reminderOptions.map(opt => (
                <button
                    key={opt.value === null ? 'null' : opt.value}
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onSelect(opt.value);
                        onClose();
                    }}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                        width: '100%', padding: '0.6rem 0.8rem', border: 'none',
                        background: reminderMinutes === opt.value ? 'var(--dropdown-selected)' : 'transparent',
                        cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                        borderBottom: opt.value !== 1440 ? '1px solid var(--border-color)' : 'none',
                        transition: 'background 0.15s',
                        borderRadius: '6px'
                    }}
                    onMouseEnter={e => {
                        if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'var(--dropdown-hover)';
                    }}
                    onMouseLeave={e => {
                        if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'transparent';
                        else e.currentTarget.style.background = 'var(--dropdown-selected)';
                    }}
                >
                    <Bell size={14} style={{ color: reminderMinutes === opt.value ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: reminderMinutes === opt.value ? 600 : 400 }}>{opt.label}</span>
                </button>
            ))}
        </div>,
        document.body
    );
};

export default ReminderSelectorDropdown;
