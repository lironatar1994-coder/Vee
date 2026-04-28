import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sun, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DynamicTodayIcon from './DynamicTodayIcon';

const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// Hebrew days: Sun→א, Mon→ב, Tue→ג, Wed→ד, Thu→ה, Fri→ו, Sat→ש
// In RTL calendars Sunday is on the far RIGHT (index 0 = rightmost column)
const HEB_DAY_HEADERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sun=א ... Sat=ש

/**
 * Builds calendar day grid for a given month.
 */
function buildCalRows(year, month) {
    const dim = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
}

const MonthView = ({ year, month, selectedDate, onSelectDate, theme, isFirst }) => {
    const today = new Date();
    let rows = buildCalRows(year, month);

    if (isFirst && year === today.getFullYear() && month === today.getMonth()) {
        const todayDate = today.getDate();
        const rowIndex = rows.findIndex(row => row.includes(todayDate));
        if (rowIndex !== -1) {
            rows = rows.slice(rowIndex);
        }
    }

    const isTodayFn = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isSelFn = (d) => {
        if (!d || !selectedDate) return false;
        const s = new Date(selectedDate);
        return d === s.getDate() && month === s.getMonth() && year === s.getFullYear();
    };

    return (
        <div 
            className="month-block" 
            data-month={month} 
            data-year={year}
            style={{ padding: '0.2rem 0.7rem 1rem' }}
        >
            {/* Minimal Month Marker (Numbers only) */}
            <div style={{ marginBottom: '0.4rem', textAlign: 'right', paddingRight: '0.4rem' }}>
                <span style={{ 
                    display: 'inline-block',
                    fontWeight: 800, 
                    fontSize: '0.85rem', 
                    color: 'var(--text-primary)',
                    opacity: 0.8
                }}>
                    {hebrewMonthNames[month]}
                </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {rows.map((row, ri) => (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                        {row.map((d, ci) => (
                            <button key={ci}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!d) return;
                                    const s = new Date(year, month, d);
                                    const y = s.getFullYear();
                                    const m = String(s.getMonth() + 1).padStart(2, '0');
                                    const day = String(s.getDate()).padStart(2, '0');
                                    onSelectDate(`${y}-${m}-${day}`);
                                }}
                                onMouseDown={e => e.stopPropagation()}
                                disabled={!d}
                                style={{
                                    border: 'none',
                                    background: isSelFn(d) ? 'var(--primary-color)' : 'transparent',
                                    color: isSelFn(d) ? 'white' : isTodayFn(d) ? '#d1453b' : d ? 'var(--text-primary)' : 'transparent',
                                    fontWeight: isTodayFn(d) ? 700 : 400,
                                    fontSize: '0.8rem',
                                    cursor: d ? 'pointer' : 'default',
                                    borderRadius: '50%',
                                    width: 32, height: 32,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto',
                                    transition: 'background 0.1s',
                                    fontFamily: 'inherit',
                                }}
                                onMouseEnter={e => { if (d && !isSelFn(d)) e.currentTarget.style.background = 'var(--dropdown-hover)'; }}
                                onMouseLeave={e => { if (d && !isSelFn(d)) e.currentTarget.style.background = 'transparent'; }}
                            >
                                {d || ''}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function DatePickerDropdown({ isOpen, onClose, anchorRef, selectedDate, selectedTime, onSelectDate, children }) {
    const { theme } = useTheme();
    const dropRef = useRef(null);
    const scrollRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 300, visible: false });
    
    // Infinite Scroll State
    const [months, setMonths] = useState([]);
    const [activeMY, setActiveMY] = useState({ month: new Date().getMonth(), year: new Date().getFullYear() });
    
    useEffect(() => {
        if (isOpen) {
            const today = new Date();
            const initialMonths = [];
            for (let i = 0; i < 6; i++) {
                const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
                initialMonths.push({ month: d.getMonth(), year: d.getFullYear() });
            }
            setMonths(initialMonths);
            setActiveMY({ month: today.getMonth(), year: today.getFullYear() });
        }
    }, [isOpen]);

    const loadMore = () => {
        setMonths(prev => {
            const last = prev[prev.length - 1];
            const next = [];
            for (let i = 1; i <= 6; i++) {
                const d = new Date(last.year, last.month + i, 1);
                next.push({ month: d.getMonth(), year: d.getFullYear() });
            }
            return [...prev, ...next];
        });
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        
        // Infinite scroll loading
        if (scrollHeight - scrollTop - clientHeight < 300) {
            loadMore();
        }

        // Dynamic Header Update
        const children = e.target.querySelectorAll('.month-block');
        const containerRect = e.target.getBoundingClientRect();
        
        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // If the block is visible at the top of the scroll container
            if (rect.bottom > containerRect.top + 40) {
                const m = parseInt(child.dataset.month);
                const y = parseInt(child.dataset.year);
                if (m !== activeMY.month || y !== activeMY.year) {
                    setActiveMY({ month: m, year: y });
                }
                break;
            }
        }
    };

    // ---- Position calculation ----
    useEffect(() => {
        if (!isOpen) {
            setPos(p => ({ ...p, visible: false }));
            return;
        }

        const updatePosition = () => {
            const PANEL_W = Math.min(300, window.innerWidth - 16);
            const PANEL_H = Math.min(500, window.innerHeight - 32);

            if (anchorRef?.current) {
                const rect = anchorRef.current.getBoundingClientRect();
                const screenW = window.innerWidth;
                const screenH = window.innerHeight;

                const spaceRight = screenW - rect.right - 12;
                const spaceLeft = rect.left - 12;
                const spaceBelow = screenH - rect.bottom - 12;
                const spaceAbove = rect.top - 12;

                let top, left;

                if (spaceLeft >= PANEL_W) {
                    left = rect.left - PANEL_W - 2;
                    top = rect.top;
                } else if (spaceRight >= PANEL_W) {
                    left = rect.right + 2;
                    top = rect.top;
                } else {
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

                if (left < 8) left = 8;
                if (left + PANEL_W > screenW - 8) left = screenW - PANEL_W - 8;
                if (top < 8) top = 8;
                if (top + PANEL_H > screenH - 8) top = screenH - PANEL_H - 8;

                setPos({ top, left, width: PANEL_W, visible: true });
            } else {
                setPos({ top: 80, left: (window.innerWidth - PANEL_W) / 2, width: PANEL_W, visible: true });
            }
        };

        updatePosition();
        const timer = setTimeout(updatePosition, 10);
        return () => clearTimeout(timer);
    }, [isOpen, anchorRef]);

    // ---- Click-outside ----
    useEffect(() => {
        const handler = (e) => {
            if (!isOpen) return;
            if (dropRef.current && dropRef.current.contains(e.target)) return;
            if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
            onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen) return null;

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const getNextDay = (dow) => {
        const d = new Date();
        const diff = (dow - d.getDay() + 7) % 7;
        d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
        return d;
    };
    const saturday = getNextDay(6);
    const nextMonday = getNextDay(1);
    const fmtShort = (d) => d.toLocaleDateString('he-IL', { weekday: 'short' });
    const fmtFull = (d) => `${fmtShort(d)} ${d.getDate()} ב${hebrewMonthNames[d.getMonth()]}`;

    const quickPicks = [
        { label: 'היום', sub: fmtShort(today), icon: <span style={iconWrap('rgba(75,158,71,0.12)')}><DynamicTodayIcon size={14} color="#4b9e47" /></span>, date: todayStr },
        { label: 'מחר', sub: fmtShort(tomorrow), icon: <span style={iconWrap('rgba(217,154,41,0.12)')}><Sun size={14} style={{ color: '#d99a29' }} /></span>, date: tomorrow.toLocaleDateString('en-CA') },
        { label: 'סוף השבוע', sub: fmtShort(saturday), icon: <span style={iconWrap('rgba(76,139,245,0.12)', '13px')}>🛋️</span>, date: saturday.toLocaleDateString('en-CA') },
        { label: 'שבוע הבא', sub: fmtFull(nextMonday), icon: <span style={iconWrap('rgba(155,89,182,0.12)')}><ArrowLeft size={14} style={{ color: '#9b59b6' }} /></span>, date: nextMonday.toLocaleDateString('en-CA') },
    ];

    return createPortal(
        <div
            ref={dropRef}
            onMouseDown={e => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: pos.top,
                left: pos.left,
                width: pos.width,
                zIndex: 20000,
                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                boxShadow: 'var(--card-shadow)',
                direction: 'rtl',
                visibility: pos.visible ? 'visible' : 'hidden',
                animation: 'slideUpFade 0.2s var(--ease-premium)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                maxHeight: 'calc(100vh - 32px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}
        >
            {/* 1. Header Summary */}
            <div style={{
                padding: '0.8rem 1rem 0.6rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                textAlign: 'right',
                flexShrink: 0
            }}>
                {(() => {
                    if (!selectedDate) return 'בחר תאריך';
                    const d = new Date(selectedDate);
                    const dateStr = `${d.getDate()} ב${hebrewMonthNames[d.getMonth()]}`;
                    return selectedTime ? `${dateStr} ${selectedTime}` : dateStr;
                })()}
            </div>

            {/* 2. Fixed Quick picks */}
            <div style={{ padding: '0.4rem 0', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
                {quickPicks.map((qp, i) => (
                    <button key={i}
                        onClick={(e) => { e.stopPropagation(); onSelectDate(qp.date); onClose(); }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '0.4rem 1rem', border: 'none', background: 'transparent',
                            cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem',
                            fontFamily: 'inherit', direction: 'rtl',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                            {qp.icon}
                            <span style={{ fontWeight: 600 }}>{qp.label}</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', opacity: 0.7 }}>{qp.sub}</span>
                    </button>
                ))}
            </div>

            {/* 3. Dynamic Month/Year Header + Global Day Headers */}
            <div style={{ 
                padding: '0.8rem 0.7rem 0.4rem', // Match MonthView padding (0.7rem)
                borderBottom: '1px solid var(--border-color)', 
                background: 'var(--bg-secondary)',
                flexShrink: 0 
            }}>
                <div style={{ 
                    fontWeight: 800, 
                    fontSize: '0.9rem', 
                    color: 'var(--text-primary)', 
                    textAlign: 'right', 
                    marginBottom: '0.6rem',
                    paddingRight: '0.4rem' // Match MonthView inner padding
                }}>
                    {hebrewMonthNames[activeMY.month]} {activeMY.year}
                </div>
                
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(7, 1fr)', 
                    textAlign: 'center', 
                    direction: 'rtl',
                    opacity: 0.6
                }}>
                    {HEB_DAY_HEADERS.map((lbl, i) => (
                        <span key={i} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 800 }}>
                            {lbl}
                        </span>
                    ))}
                </div>
            </div>

            {/* 4. Scrollable Area */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                style={{ 
                    overflowY: 'auto', 
                    flex: 1,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    background: 'var(--bg-primary)'
                }}
            >
                <div style={{ direction: 'rtl' }}>
                    {months.map((m, i) => (
                        <MonthView 
                            key={`${m.year}-${m.month}`}
                            year={m.year}
                            month={m.month}
                            isFirst={i === 0}
                            selectedDate={selectedDate}
                            onSelectDate={(d) => { onSelectDate(d); onClose(); }}
                            theme={theme}
                        />
                    ))}
                </div>

                {children && (
                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', background: 'var(--bg-secondary)' }}>
                        {children}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}

// ---- Style helpers ----
function iconWrap(bg, fontSize) {
    return {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: 6, background: bg,
        fontSize: fontSize || undefined,
    };
}
