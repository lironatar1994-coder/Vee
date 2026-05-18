import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HEB_DAY_HEADERS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

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

const MonthBlock = ({ year, month, eventsByDate, onDateClick, onEventClick }) => {
    const today = new Date();
    const rows = buildCalRows(year, month);

    const isTodayFn = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

    return (
        <div 
            className="month-block" 
            data-month={month} 
            data-year={year}
            style={{ 
                padding: '1rem 0',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-primary)'
            }}
        >
            {/* Month Title */}
            <div style={{ 
                marginBottom: '1rem', 
                textAlign: 'right', 
                paddingRight: '1.5rem' 
            }}>
                <span style={{ 
                    fontWeight: 850, 
                    fontSize: '1.4rem', 
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.02em'
                }}>
                    {hebrewMonthNames[month]} {year}
                </span>
            </div>

            {/* Weeks Grid */}
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1px',
                background: 'var(--border-color)',
                borderTop: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                {rows.map((row, ri) => (
                    <div 
                        key={ri} 
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(7, 1fr)', 
                            gap: '1px',
                            background: 'var(--bg-primary)'
                        }}
                    >
                        {row.map((d, ci) => {
                            if (!d) {
                                return (
                                    <div 
                                        key={ci} 
                                        style={{ 
                                            background: 'var(--bg-secondary)', 
                                            minHeight: '135px',
                                            opacity: 0.3 
                                        }} 
                                    />
                                );
                            }

                            const monthStr = String(month + 1).padStart(2, '0');
                            const dayStr = String(d).padStart(2, '0');
                            const dateKey = `${year}-${monthStr}-${dayStr}`;
                            const dayEvents = eventsByDate[dateKey] || [];
                            const isToday = isTodayFn(d);

                            return (
                                <div 
                                    key={ci}
                                    onClick={() => onDateClick({ dateStr: dateKey })}
                                    style={{
                                        background: isToday ? 'var(--bg-today-light, rgba(5, 133, 39, 0.03))' : 'var(--bg-primary)',
                                        minHeight: '135px',
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        border: isToday ? '1px solid rgba(5, 133, 39, 0.2)' : 'none',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = isToday ? 'var(--bg-today-hover, rgba(5, 133, 39, 0.05))' : 'var(--hover-bg)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = isToday ? 'var(--bg-today-light, rgba(5, 133, 39, 0.03))' : 'var(--bg-primary)';
                                    }}
                                >
                                    {/* Day Header */}
                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center' 
                                    }}>
                                        <span style={{
                                            fontSize: '0.85rem',
                                            fontWeight: isToday ? 800 : 600,
                                            color: isToday ? '#058527' : 'var(--text-secondary)',
                                            background: isToday ? 'rgba(5, 133, 39, 0.12)' : 'transparent',
                                            borderRadius: '50%',
                                            width: isToday ? '26px' : 'auto',
                                            height: isToday ? '26px' : 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginLeft: isToday ? '-4px' : '0'
                                        }}>
                                            {d}
                                        </span>
                                    </div>

                                    {/* Day Tasks List */}
                                    <div style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '4px', 
                                        overflow: 'hidden',
                                        flex: 1
                                    }}>
                                        {dayEvents.map(event => {
                                            const priority = event.extendedProps?.priority || 4;
                                            const priorityColor = priority === 1 ? 'var(--p1-accent)' : priority === 2 ? 'var(--p2-accent)' : priority === 3 ? 'var(--p3-accent)' : 'var(--p4-accent)';
                                            const priorityBg = priority === 1 ? 'var(--p1-bg)' : priority === 2 ? 'var(--p2-bg)' : priority === 3 ? 'var(--p3-bg)' : 'var(--p4-bg)';
                                            const priorityBorder = priority === 1 ? 'var(--p1-border)' : priority === 2 ? 'var(--p2-border)' : priority === 3 ? 'var(--p3-border)' : 'var(--p4-border)';

                                            return (
                                                <div
                                                    key={event.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEventClick({ event });
                                                    }}
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        background: priorityBg,
                                                        border: `1px solid ${priorityBorder}`,
                                                        color: priorityColor,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '4px',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                                        transition: 'transform 0.1s ease, filter 0.1s ease'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                                        e.currentTarget.style.filter = 'brightness(0.98)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.transform = 'none';
                                                        e.currentTarget.style.filter = 'none';
                                                    }}
                                                >
                                                    <span style={{ 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis', 
                                                        whiteSpace: 'nowrap',
                                                        flex: 1 
                                                    }}>
                                                        {event.title}
                                                    </span>
                                                    {event.start.includes('T') && (
                                                        <span style={{ 
                                                            fontSize: '9px', 
                                                            opacity: 0.8,
                                                            direction: 'ltr'
                                                        }}>
                                                            {event.start.split('T')[1].substring(0, 5)}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ScrollableMonthlyView = ({ events, onDateClick, onEventClick, onDatesSet }) => {
    const { theme } = useTheme();
    const scrollContainerRef = useRef(null);

    // Initial load: 3 months past, current month, 12 months future
    const [months, setMonths] = useState(() => {
        const today = new Date();
        const initial = [];
        for (let i = -3; i <= 12; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
            initial.push({ month: d.getMonth(), year: d.getFullYear() });
        }
        return initial;
    });

    const [activeMY, setActiveMY] = useState(() => {
        const today = new Date();
        return { month: today.getMonth(), year: today.getFullYear() };
    });

    // Hash events by date for fast O(1) day-cell lookups
    const eventsByDate = useMemo(() => {
        const hash = {};
        events.forEach(event => {
            if (event.start) {
                const dateStr = event.start.split('T')[0];
                if (!hash[dateStr]) hash[dateStr] = [];
                hash[dateStr].push(event);
            }
        });
        
        // Sort each day's events by time (all-day tasks first, then chronological)
        Object.keys(hash).forEach(dateStr => {
            hash[dateStr].sort((a, b) => {
                const hasTimeA = a.start.includes('T');
                const hasTimeB = b.start.includes('T');
                if (!hasTimeA && hasTimeB) return -1;
                if (hasTimeA && !hasTimeB) return 1;
                if (hasTimeA && hasTimeB) {
                    const timeA = a.start.split('T')[1];
                    const timeB = b.start.split('T')[1];
                    return timeA.localeCompare(timeB);
                }
                return 0;
            });
        });

        return hash;
    }, [events]);

    const loadMoreFuture = () => {
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

        // Bottom infinite scroll loading
        if (scrollHeight - scrollTop - clientHeight < 500) {
            loadMoreFuture();
        }

        // Active header calculations
        const children = e.target.querySelectorAll('.month-block');
        const containerRect = e.target.getBoundingClientRect();
        
        for (const child of children) {
            const rect = child.getBoundingClientRect();
            // If the block is mostly visible at the top area of the scroll container
            if (rect.bottom > containerRect.top + 80) {
                const m = parseInt(child.dataset.month);
                const y = parseInt(child.dataset.year);
                if (m !== activeMY.month || y !== activeMY.year) {
                    setActiveMY({ month: m, year: y });
                    
                    // Trigger parent callback to fetch tasks if range shifted
                    if (onDatesSet) {
                        const start = new Date(y, m, 1);
                        const end = new Date(y, m + 1, 0);
                        onDatesSet({ start, end });
                    }
                }
                break;
            }
        }
    };

    // Scroll to current month on mount
    useEffect(() => {
        const today = new Date();
        const activeBlock = scrollContainerRef.current?.querySelector(
            `[data-month="${today.getMonth()}"][data-year="${today.getFullYear()}"]`
        );
        if (activeBlock) {
            // Scroll to the active block
            activeBlock.scrollIntoView({ block: 'start' });
        }
    }, []);

    const scrollToMonth = (direction) => {
        const targetDate = new Date(activeMY.year, activeMY.month + direction, 1);
        
        // Ensure month is loaded
        const exists = months.some(m => m.month === targetDate.getMonth() && m.year === targetDate.getFullYear());
        if (!exists) {
            if (direction > 0) {
                loadMoreFuture();
            }
        }

        setTimeout(() => {
            const activeBlock = scrollContainerRef.current?.querySelector(
                `[data-month="${targetDate.getMonth()}"][data-year="${targetDate.getFullYear()}"]`
            );
            if (activeBlock) {
                activeBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 50);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            direction: 'rtl',
            background: 'var(--bg-primary)'
        }}>
            {/* Sticky Floating Month Header */}
            <div style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.8rem 1.5rem',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={18} style={{ color: 'var(--primary-color)' }} />
                    <span style={{ 
                        fontWeight: 800, 
                        fontSize: '1.1rem', 
                        color: 'var(--text-primary)' 
                    }}>
                        {hebrewMonthNames[activeMY.month]} {activeMY.year}
                    </span>
                </div>
                
                {/* Navigation Arrows */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button 
                        onClick={() => scrollToMonth(1)} // next month
                        className="btn-icon-soft"
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        title="החודש הבא"
                    >
                        <ChevronRight size={18} />
                    </button>
                    <button 
                        onClick={() => {
                            const today = new Date();
                            const activeBlock = scrollContainerRef.current?.querySelector(
                                `[data-month="${today.getMonth()}"][data-year="${today.getFullYear()}"]`
                            );
                            if (activeBlock) activeBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }} 
                        className="btn-icon-soft"
                        style={{ 
                            padding: '0.3rem 0.8rem', 
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: 700
                        }}
                    >
                        היום
                    </button>
                    <button 
                        onClick={() => scrollToMonth(-1)} // prev month
                        className="btn-icon-soft"
                        style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                        title="החודש הקודם"
                    >
                        <ChevronLeft size={18} />
                    </button>
                </div>
            </div>

            {/* Weekly Days Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border-color)',
                padding: '0.5rem 0',
                zIndex: 5
            }}>
                {HEB_DAY_HEADERS.map((lbl, idx) => (
                    <span 
                        key={idx} 
                        style={{ 
                            fontSize: '0.8rem', 
                            color: 'var(--text-secondary)', 
                            fontWeight: 800 
                        }}
                    >
                        {lbl}
                    </span>
                ))}
            </div>

            {/* Ever Scrollable Month Blocks */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                style={{
                    overflowY: 'auto',
                    flex: 1,
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {months.map((m, idx) => (
                    <MonthBlock 
                        key={`${m.year}-${m.month}`}
                        year={m.year}
                        month={m.month}
                        eventsByDate={eventsByDate}
                        onDateClick={onDateClick}
                        onEventClick={onEventClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default ScrollableMonthlyView;
