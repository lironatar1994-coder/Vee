import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

const TimePickerDropdown = ({ isOpen, onClose, anchorRef, initialTime, initialDuration, onSave, timeOptions }) => {
    const { theme } = useTheme();
    const [selectedTime, setSelectedTime] = useState(initialTime || '');
    const [duration, setDuration] = useState(initialDuration || 0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, showAbove: false, visible: false });
    const [showFromOptions, setShowFromOptions] = useState(false);
    const [showToOptions, setShowToOptions] = useState(false);
    const [showDurationMenu, setShowDurationMenu] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
    const dropdownRef = useRef(null);
    const fromOptionsRef = useRef(null);
    const toOptionsRef = useRef(null);

    // Track window resizes for mobile view
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 600);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getNext15Min = () => {
        const now = new Date();
        const mins = now.getMinutes();
        const next15 = Math.ceil((mins + 1) / 15) * 15;
        now.setMinutes(next15);
        now.setSeconds(0);
        return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    // Helper functions for time calculation
    const timeToMinutes = (timeStr) => {
        if (!timeStr || !timeStr.includes(':')) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const minutesToTime = (totalMins) => {
        let mins = totalMins % (24 * 60);
        if (mins < 0) mins += 24 * 60;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const getToTime = () => {
        if (!selectedTime) return '';
        const startMins = timeToMinutes(selectedTime);
        return minutesToTime(startMins + (duration || 0));
    };

    const formatDuration = (mins) => {
        if (mins === 0) return 'ללא מֶשֶׁך';
        if (mins < 60) return `${mins} דק'`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 1 && m === 0) return 'שעה';
        if (h === 1.5 && m === 30) return 'שעה וחצי';
        return m === 0 ? `${h} שעות` : `${h} ש' ו-${m} ד'`;
    };

    const durationLabelsMapping = {
        0: 'ללא מֶשֶׁך',
        15: '15 דק\'',
        30: '30 דק\'',
        45: '45 דק\'',
        60: 'שעה',
        90: 'שעה וחצי',
        120: 'שעתיים'
    };

    // Calculate dynamic time options starting from current time
    const getDynamicOptions = () => {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        // Round to nearest 15 mins for the "starting point"
        const startMins = Math.floor(currentMins / 15) * 15;
        
        const options = [];
        for (let i = 0; i < 24 * 4; i++) {
            const m = (startMins + i * 15) % (24 * 60);
            options.push(minutesToTime(m));
        }
        return ['ללא שעה', ...options];
    };

    const dynamicTimeOptions = getDynamicOptions();

    useEffect(() => {
        if (isOpen && anchorRef.current) {
            const updatePosition = () => {
                if (dropdownRef.current) {
                    const rect = anchorRef.current.getBoundingClientRect();
                    const dropdownRect = dropdownRef.current.getBoundingClientRect();
                    const PANEL_W = dropdownRect.width || 320;
                    const PANEL_H = dropdownRect.height || 280;

                    const screenW = window.innerWidth;
                    const screenH = window.innerHeight;

                    const spaceRight = screenW - rect.right - 12;
                    const spaceLeft = rect.left - 12;
                    const spaceBelow = screenH - rect.bottom - 12;
                    const spaceAbove = rect.top - 12;

                    let top, left;

                    // Prefer side-spawning
                    if (spaceLeft >= PANEL_W) {
                        left = rect.left - PANEL_W - 2;
                        top = rect.top;
                    } else if (spaceRight >= PANEL_W) {
                        left = rect.right + 2;
                        top = rect.top;
                    } else {
                        // Fallback to vertical
                        const screenMid = screenW / 2;
                        const anchorMid = rect.left + rect.width / 2;
                        if (anchorMid > screenMid) {
                            left = rect.right - PANEL_W;
                        } else {
                            left = rect.left;
                        }

                        if (spaceBelow >= PANEL_H || spaceBelow >= spaceAbove) {
                            top = rect.bottom + 2;
                        } else {
                            top = rect.top - PANEL_H - 2;
                        }
                    }

                    // Global safety clamping
                    if (left < 8) left = 8;
                    if (left + PANEL_W > screenW - 8) left = screenW - PANEL_W - 8;
                    if (top < 8) top = 8;
                    if (top + PANEL_H > screenH - 8) top = screenH - PANEL_H - 8;

                    setDropdownPos({ top, left, visible: true });
                } else {
                    // If ref is not ready, check again on next frame
                    requestAnimationFrame(updatePosition);
                }
            };
            
            setShowFromOptions(false);
            setShowToOptions(false);
            setShowDurationMenu(false);
            
            updatePosition();
        } else {
            setDropdownPos(prev => ({ ...prev, visible: false }));
        }
    }, [isOpen, anchorRef, initialTime, initialDuration]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside the main dropdown AND outside the anchor button
            const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target);
            const isOutsideAnchor = anchorRef.current && !anchorRef.current.contains(event.target);
            
            if (isOutsideDropdown && isOutsideAnchor) {
                onClose();
            }

            // Sub-menus closure logic
            if (showFromOptions && fromOptionsRef.current && !fromOptionsRef.current.contains(event.target)) {
                setShowFromOptions(false);
            }
            if (showToOptions && toOptionsRef.current && !toOptionsRef.current.contains(event.target)) {
                setShowToOptions(false);
            }
            if (showDurationMenu && !event.target.closest('.duration-menu')) {
                setShowDurationMenu(false);
            }
        };
        
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, showFromOptions, showToOptions, showDurationMenu]);

    // Update local state when initial values change (e.g. when opening)
    useEffect(() => {
        if (isOpen) {
            setSelectedTime(initialTime || '');
            setDuration(initialDuration || 0);
        }
    }, [isOpen, initialTime, initialDuration]);

    if (!isOpen) return null;

    const handleFromChange = (newVal) => {
        setSelectedTime(newVal);
    };

    const handleToChange = (newVal) => {
        if (!selectedTime) {
            setSelectedTime(newVal);
            setDuration(0);
            return;
        }
        const startMins = timeToMinutes(selectedTime);
        let endMins = timeToMinutes(newVal);
        if (endMins < startMins) endMins += 24 * 60; // Assume next day
        setDuration(endMins - startMins);
    };

    return createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed', top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px`,
                width: isMobile ? 'calc(100vw - 32px)' : '320px', maxWidth: '320px',
                background: theme === 'dark' ? '#1e293b' : '#ffffff', border: '1px solid var(--border-color)',
                borderRadius: '12px', boxShadow: 'var(--card-shadow)',
                zIndex: 99999, display: 'flex', flexDirection: 'column', padding: '0',
                fontFamily: 'inherit', direction: 'rtl', visibility: dropdownPos.visible ? 'visible' : 'hidden', 
                animation: 'slideUpFade 0.2s var(--ease-premium)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {/* Time Field row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minHeight: '36px' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', width: '65px' }}>זמן</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-start' }}>
                        {/* From Input */}
                        <div style={{ position: 'relative', width: duration > 0 ? '85px' : '100%' }}>
                            <input
                                type="text" value={selectedTime} placeholder="HH:mm"
                                onFocus={(e) => {
                                    e.target.select();
                                    setShowFromOptions(true);
                                }}
                                onChange={(e) => handleFromChange(e.target.value)}
                                style={inputStyle(theme, duration > 0 ? 'center' : 'right')}
                            />
                            {showFromOptions && (
                                <TimeOptionsList 
                                    ref={fromOptionsRef}
                                    options={dynamicTimeOptions} 
                                    onSelect={(opt) => { setSelectedTime(opt === 'ללא שעה' ? '' : opt); setShowFromOptions(false); }}
                                    selected={selectedTime}
                                    theme={theme}
                                />
                            )}
                        </div>
                        
                        {duration > 0 && (
                            <>
                                <span style={{ color: 'var(--text-secondary)' }}>–</span>
                                {/* To Input */}
                                <div style={{ position: 'relative', width: '85px' }}>
                                    <input
                                        type="text" value={getToTime()} placeholder="HH:mm"
                                        onFocus={(e) => {
                                            e.target.select();
                                            setShowToOptions(true);
                                        }}
                                        onChange={(e) => handleToChange(e.target.value)}
                                        style={inputStyle(theme, 'center')}
                                    />
                                    {showToOptions && (
                                        <TimeOptionsList 
                                            ref={toOptionsRef}
                                            options={dynamicTimeOptions} 
                                            onSelect={(opt) => { handleToChange(opt === 'ללא שעה' ? '' : opt); setShowToOptions(false); }}
                                            selected={getToTime()}
                                            theme={theme}
                                        />
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Duration Field row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
                    <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-primary)', width: '65px' }}>משך</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div 
                            onClick={() => setShowDurationMenu(!showDurationMenu)}
                            style={{
                                ...inputStyle(theme, 'left'),
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                                paddingRight: '0.5rem'
                            }}
                        >
                            <span style={{ color: duration === 0 ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                {durationLabelsMapping[duration] || formatDuration(duration)}
                            </span>
                            {duration > 0 && (
                                <span 
                                    onClick={(e) => { e.stopPropagation(); setDuration(0); }}
                                    style={{ fontSize: '14px', color: 'var(--text-secondary)', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                >✕</span>
                            )}
                        </div>

                        {showDurationMenu && (
                            <div className="duration-menu" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0,
                                background: theme === 'dark' ? 'var(--bg-secondary)' : '#ffffff', border: '1px solid var(--border-color)',
                                borderRadius: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: 110, marginTop: '4px'
                            }}>
                                {[
                                    { label: 'ללא מֶשֶׁך', val: 0 },
                                    { label: '15 דק\'', val: 15 },
                                    { label: '30 דק\'', val: 30 },
                                    { label: '45 דק\'', val: 45 },
                                    { label: 'שעה', val: 60 },
                                    { label: 'שעה וחצי', val: 90 },
                                    { label: 'שעתיים', val: 120 }
                                ].map((opt, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setDuration(opt.val); setShowDurationMenu(false); }}
                                        style={{
                                            display: 'block', width: '100%', padding: '0.6rem 0.8rem', border: 'none',
                                            background: duration === opt.val ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                                            color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer', textAlign: 'right',
                                            fontFamily: 'inherit'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = duration === opt.val ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent'}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.6rem 0.8rem', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: '0 0 12px 12px', borderTop: '1px solid var(--border-color)' }}>
                <button onClick={onClose} style={actionBtnStyle(theme, false)}>ביטול</button>
                <button
                    onClick={() => { onSave(selectedTime, duration); onClose(); }}
                    style={actionBtnStyle(theme, true)}
                >שמור</button>
            </div>
        </div>,
        document.body
    );
};

const inputStyle = (theme, align = 'center') => ({
    width: '100%', padding: '0.45rem', border: '1px solid var(--border-color)', borderRadius: '6px',
    background: theme === 'dark' ? 'var(--bg-secondary)' : '#fff', color: 'var(--text-primary)',
    fontSize: '0.9rem', textAlign: align, outline: 'none', fontFamily: 'inherit'
});

const actionBtnStyle = (theme, primary) => ({
    padding: '0.4rem 1.2rem', borderRadius: '6px', border: primary ? 'none' : '1px solid var(--border-color)',
    background: primary ? 'var(--primary-color)' : (theme === 'dark' ? 'transparent' : 'var(--bg-secondary)'),
    color: primary ? '#fff' : 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem',
    cursor: 'pointer', fontFamily: 'inherit'
});
const TimeOptionsList = React.forwardRef(({ options, onSelect, selected, theme }, ref) => (
    <div
        ref={ref}
        style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: theme === 'dark' ? 'var(--bg-secondary)' : '#ffffff', border: '1px solid var(--border-color)',
            borderRadius: '6px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', maxHeight: '180px',
            overflowY: 'auto', zIndex: 100, marginTop: '4px'
        }}
    >
        {options.map((opt, i) => (
            <button
                key={i} type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(opt); }}
                style={{
                    display: 'block', width: '100%', padding: '0.6rem', border: 'none',
                    background: selected === opt ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                    color: 'var(--text-primary)', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'center'
                }}
            >
                {opt}
            </button>
        ))}
    </div>
));

export default React.memo(TimePickerDropdown);
