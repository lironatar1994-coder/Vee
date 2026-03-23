import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Sun, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DynamicTodayIcon from './DynamicTodayIcon';

const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

// Hebrew days: Sun→א, Mon→ב, Tue→ג, Wed→ד, Thu→ה, Fri→ו, Sat→ש
// In RTL calendars Sunday is on the far RIGHT (index 0 = rightmost column)
const HEB_DAY_HEADERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Sun=א ... Sat=ש

/**
 * Builds calendar day grid for a given month.
 * Returns an array of 7-column rows. Each cell is either a day number or null (empty).
 * Here Sunday = column 0 (rightmost in RTL).
 */
function buildCalRows(year, month) {
    const dim = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= dim; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    // Split into rows of 7
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
}

export default function DatePickerDropdown({ isOpen, onClose, anchorRef, selectedDate, selectedTime, onSelectDate, children }) {
    const { theme } = useTheme();
    const dropRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0, width: 300, visible: false });
    const [calMonth, setCalMonth] = useState(new Date().getMonth());
    const [calYear, setCalYear] = useState(new Date().getFullYear());
    const isMobileScreen = () => window.innerWidth <= 600;

    // ---- Position calculation ----
    useEffect(() => {
        if (!isOpen) {
            setPos(p => ({ ...p, visible: false }));
            return;
        }

        const PANEL_W = Math.min(300, window.innerWidth - 16);
        const PANEL_MAX_H = 460;

        if (anchorRef?.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            // In RTL, align right edge of panel with right edge of button if possible
            let left = rect.right - PANEL_W;
            if (left < 8) left = 8;
            if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8;

            const spaceBelow = window.innerHeight - rect.bottom - 12;
            const spaceAbove = rect.top - 12;

            let top;
            if (spaceBelow >= PANEL_MAX_H || spaceBelow >= spaceAbove) {
                top = rect.bottom + 6;
            } else {
                top = Math.max(8, rect.top - PANEL_MAX_H - 6);
            }

            setPos({ top, left, width: PANEL_W, visible: true });
        } else {
            const left = Math.max(8, (window.innerWidth - PANEL_W) / 2);
            setPos({ top: 80, left, width: PANEL_W, visible: true });
        }
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

    // ---- Listen for Enter to close manually ----
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isOpen && e.key === 'Enter') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // ---- Quick picks ----
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

    // ---- Month navigation (stop propagation so parent modal doesn't close) ----
    const goPrev = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setCalMonth(m => { if (m === 0) { setCalYear(y => y - 1); return 11; } return m - 1; });
    };
    const goNext = (e) => {
        e.stopPropagation();
        e.preventDefault();
        setCalMonth(m => { if (m === 11) { setCalYear(y => y + 1); return 0; } return m + 1; });
    };
    const goToday = (e) => {
        e.stopPropagation();
        setCalMonth(today.getMonth());
        setCalYear(today.getFullYear());
    };

    // ---- Calendar grid ----
    const rows = buildCalRows(calYear, calMonth);

    const isTodayFn = (d) => d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
    const isSelFn = (d) => {
        if (!d || !selectedDate) return false;
        const s = new Date(selectedDate);
        return d === s.getDate() && calMonth === s.getMonth() && calYear === s.getFullYear();
    };

    const handleDayClick = (e, d) => {
        e.stopPropagation();
        if (!d) return;
        // Construct date in local time
        const s = new Date(calYear, calMonth, d);
        // Format YYYY-MM-DD manually to avoid UTC shift
        const year = s.getFullYear();
        const month = String(s.getMonth() + 1).padStart(2, '0');
        const day = String(s.getDate()).padStart(2, '0');
        onSelectDate(`${year}-${month}-${day}`);
    };

    // ---- Render ----
    const panel = (
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
                borderRadius: '14px',
                boxShadow: theme === 'dark' ? '0 15px 50px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.1)',
                direction: 'rtl',
                visibility: pos.visible ? 'visible' : 'hidden',
                animation: 'fadeIn 0.12s ease',
            }}
        >
            {/* Header Summary (Always Visible) */}
            <div style={{
                padding: '0.6rem 1rem 0.5rem',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                textAlign: 'right'
            }}>
                {(() => {
                    if (!selectedDate) return 'בחר תאריך';
                    const d = new Date(selectedDate);
                    const dateStr = `${d.getDate()} ב${hebrewMonthNames[d.getMonth()]}`;
                    return selectedTime ? `${dateStr} ${selectedTime}` : dateStr;
                })()}
            </div>

            {/* Quick picks */}
            <div style={{ padding: '0.3rem 0' }}>
                {quickPicks.map((qp, i) => (
                    <button key={i}
                        onClick={(e) => { e.stopPropagation(); onSelectDate(qp.date); onClose(); }}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '0.45rem 0.9rem', border: 'none', background: 'transparent',
                            cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.87rem',
                            fontFamily: 'inherit', direction: 'rtl',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            {qp.icon}
                            <span style={{ fontWeight: 500 }}>{qp.label}</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.77rem' }}>{qp.sub}</span>
                    </button>
                ))}
            </div>

            <div style={{ height: '1px', background: 'var(--border-color)', margin: '0 0.7rem' }} />

            {/* Calendar header: Month label RIGHT, arrows LEFT */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.9rem 0.2rem', direction: 'rtl' }}>
                {/* RIGHT: month + year title */}
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {hebrewMonthNames[calMonth]} {calYear}
                </span>

                {/* LEFT: navigation arrows. In RTL: right key = ▶ prev, left key = ◀ next */}
                <div style={{ display: 'flex', gap: '0.1rem', alignItems: 'center' }}>
                    {/* ← next month (left side in RTL visual = future) */}
                    <button onClick={goNext} onMouseDown={e => e.stopPropagation()}
                        style={navBtnStyle()}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="חודש הבא"
                    >
                        <ChevronLeft size={15} />
                    </button>
                    <button onClick={goToday} onMouseDown={e => e.stopPropagation()}
                        style={{ ...navBtnStyle(), fontSize: '10px', width: 20, height: 20, borderRadius: '50%' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="חודש נוכחי"
                    >○</button>
                    {/* → prev month (right side in RTL visual = past) */}
                    <button onClick={goPrev} onMouseDown={e => e.stopPropagation()}
                        style={navBtnStyle()}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="חודש קודם"
                    >
                        <ChevronRight size={15} />
                    </button>
                </div>
            </div>

            {/* Day headers: Sun=א (right) … Sat=ש (left) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '0 0.7rem', direction: 'rtl' }}>
                {HEB_DAY_HEADERS.map((lbl, i) => (
                    <span key={i} style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, padding: '0.2rem 0' }}>
                        {lbl}
                    </span>
                ))}
            </div>

            {/* Calendar rows */}
            <div style={{ padding: '0 0.7rem 0.5rem', direction: 'rtl' }}>
                {rows.map((row, ri) => (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' }}>
                        {row.map((d, ci) => (
                            <button key={ci}
                                onClick={(e) => handleDayClick(e, d)}
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
                                    width: 28, height: 28,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '2px auto',
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

            {
                children && (
                    <>
                        <div style={{ height: '1px', background: 'var(--border-color)' }} />
                        {children}
                    </>
                )
            }
        </div >
    );

    return createPortal(panel, document.body);
}

// ---- Style helpers ----
function iconWrap(bg, fontSize) {
    return {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 4, background: bg,
        fontSize: fontSize || undefined,
    };
}
function navBtnStyle() {
    return {
        border: 'none', background: 'transparent', cursor: 'pointer',
        color: 'var(--text-secondary)', padding: '3px', borderRadius: '4px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
    };
}
