import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';

const TimePickerDropdown = ({ isOpen, onClose, anchorRef, initialTime, onSave, timeOptions }) => {
    const { theme } = useTheme();
    const getDefaultTime = () => {
        const now = new Date();
        const mins = now.getMinutes();
        const ceiledMins = Math.ceil(mins / 5) * 5 + 5;
        now.setMinutes(ceiledMins);
        return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    };

    const [selectedTime, setSelectedTime] = useState(initialTime || '');
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, showAbove: false, visible: false });
    const [showOptions, setShowOptions] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
    const dropdownRef = useRef(null);
    const optionsContainerRef = useRef(null);

    // Track window resizes for mobile view
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 600);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isOpen && anchorRef.current && dropdownRef.current) {
            if (!initialTime) {
                setSelectedTime(getDefaultTime());
            } else {
                setSelectedTime(initialTime);
            }
            setShowOptions(false);

            const anchorRect = anchorRef.current.getBoundingClientRect();
            const dropdownRect = dropdownRef.current.getBoundingClientRect();

            // Force position ABOVE the anchor button
            let top = anchorRect.top - dropdownRect.height - 8;
            // Default: Align the right edge of the dropdown with the right edge of the anchor (RTL style)
            let left = anchorRect.right - dropdownRect.width;
            let showAbove = true;

            // If it goes off the screen to the left, align with the left edge of the screen
            if (left < 16) {
                left = 16;
            }

            // If aligning to the right edge of the anchor makes it go off the screen to the right, shift it left
            if (left + dropdownRect.width > window.innerWidth - 16) {
                left = window.innerWidth - dropdownRect.width - 16;
            }

            setDropdownPos({ top, left: Math.max(0, left), showAbove, visible: true });
        }
    }, [isOpen, anchorRef, initialTime]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target)
            ) {
                onClose();
            }

            // Close options list if clicked outside the input and options list
            if (
                showOptions &&
                optionsContainerRef.current &&
                !optionsContainerRef.current.contains(event.target) &&
                event.target.type !== 'time'
            ) {
                setShowOptions(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, showOptions]);

    if (!isOpen) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: 'fixed',
                top: `${dropdownPos.top}px`,
                left: `${dropdownPos.left}px`,
                width: isMobile ? 'calc(100vw - 32px)' : '320px',
                maxWidth: '320px',
                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: theme === 'dark' ? '0 15px 50px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.12)',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                gap: '0',
                fontFamily: 'inherit',
                direction: 'rtl',
                visibility: dropdownPos.visible ? 'visible' : 'hidden',
                animation: 'fadeIn 0.1s ease',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div style={{ padding: '0.8rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Time Field */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', width: '70px' }}>זמן</span>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
                            width: '100%',
                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)'
                        }}>
                            <input
                                type="text"
                                value={selectedTime}
                                placeholder="HH:mm (24h)"
                                onChange={(e) => {
                                    let val = e.target.value;
                                    // Basic validation/auto-format for 24h time HH:mm
                                    val = val.replace(/[^\d:]/g, '').substring(0, 5);
                                    if (val.length === 2 && !val.includes(':') && e.nativeEvent.inputType !== 'deleteContentBackward') {
                                        val += ':';
                                    }
                                    setSelectedTime(val);
                                }}
                                onFocus={() => setShowOptions(true)}
                                onClick={() => setShowOptions(true)}
                                onBlur={() => {
                                    // Validate on blur
                                    const regex = /^([01]\d|2[0-3]):?([0-5]\d)$/;
                                    if (selectedTime && !regex.test(selectedTime)) {
                                        // If invalid, revert or fix
                                        if (selectedTime.length === 4 && /^\d{4}$/.test(selectedTime)) {
                                            setSelectedTime(`${selectedTime.substring(0, 2)}:${selectedTime.substring(2, 4)}`);
                                        }
                                    }
                                }}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'inherit',
                                    fontSize: '0.95rem',
                                    width: '100%',
                                    outline: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'right'
                                }}
                            />
                        </div>

                        {/* Options Dropdown */}
                        {showOptions && (
                            <div
                                ref={optionsContainerRef}
                                style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    background: theme === 'dark' ? '#1e293b' : '#ffffff',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    boxShadow: theme === 'dark' ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    zIndex: 10,
                                    marginTop: '4px',
                                    width: '100%'
                                }}
                            >
                                {timeOptions.map((opt, i) => {
                                    const isActive = selectedTime === opt;
                                    return (
                                        <button
                                            key={opt + i}
                                            type="button"
                                            style={{
                                                display: 'block',
                                                width: '100%',
                                                padding: '0.6rem 1rem',
                                                border: 'none',
                                                background: isActive ? 'var(--dropdown-selected)' : 'transparent',
                                                textAlign: 'center',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)',
                                                fontSize: '0.9rem',
                                                fontWeight: isActive ? 600 : 400,
                                                transition: 'background 0.1s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = isActive ? 'var(--dropdown-selected)' : 'transparent';
                                                }
                                            }}
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSelectedTime(opt === 'ללא שעה' ? '' : opt);
                                                setShowOptions(false);
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Duration Field */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', width: '70px' }}>משך</span>
                    <div style={{
                        padding: '0.4rem 0.6rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        background: '#F9F9F9',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'not-allowed'
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#FF8A65" style={{ opacity: 0.9 }} ><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
                        <span>ללא משך זמן</span>
                    </div>
                </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '0' }} />

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', padding: '0.75rem 1rem', background: theme === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFA', borderRadius: '0 0 12px 12px' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{
                        padding: '0.4rem 1rem',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        background: theme === 'dark' ? 'transparent' : '#F5F5F5',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = theme === 'dark' ? 'rgba(255,255,255,0.05)' : '#EBEBEB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = theme === 'dark' ? 'transparent' : '#F5F5F5'}
                >
                    ביטול
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onSave(selectedTime);
                        onClose();
                    }}
                    style={{
                        padding: '0.4rem 1.2rem',
                        border: 'none',
                        borderRadius: '6px',
                        background: '#FFB84D',
                        color: '#000',
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'background 0.1s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#FFA726'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#FFB84D'}
                >
                    שמור
                </button>
            </div>
        </div>,
        document.body
    );
};

export default TimePickerDropdown;
