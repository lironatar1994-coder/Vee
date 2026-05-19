import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HEB_DAY_HEADERS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function buildCalRows(year, month) {
    const dim = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay(); // 0=Sun … 6=Sat
    
    // We want exactly 5 rows = 35 cells.
    const cells = Array(35).fill(null);
    
    for (let d = 1; d <= dim; d++) {
        const targetIndex = firstDow + d - 1;
        if (targetIndex < 35) {
            cells[targetIndex] = d;
        } else {
            // It goes to the 6th row. Place it at the first available null cell at the beginning of the grid (under firstDow)
            const firstNull = cells.indexOf(null);
            if (firstNull !== -1 && firstNull < firstDow) {
                cells[firstNull] = d;
            } else {
                // Fallback: merge into the 5th row's corresponding column
                const fallbackCol = targetIndex % 7;
                const row4Index = 28 + fallbackCol;
                cells[row4Index] = d;
            }
        }
    }
    
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
}

const MonthBlock = ({ year, month, eventsByDate, onDateClick, onEventClick, onMoreClick }) => {
    const today = new Date();
    const rows = buildCalRows(year, month);

    const isTodayFn = (d) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const isMobile = window.innerWidth <= 768;

    return (
        <div
            className="month-block"
            data-month={month}
            data-year={year}
            style={{
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--bg-secondary)',
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always'
            }}
        >
            {/* Weeks Grid */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1px',
                background: 'var(--border-color)',
                borderBottom: '1px solid var(--border-color)'
            }}>
                {rows.map((row, ri) => (
                    <div
                        key={ri}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            gap: '1px',
                            background: 'var(--border-color)',
                            scrollSnapAlign: 'none'
                        }}
                    >
                        {row.map((d, ci) => {
                            if (!d) {
                                return (
                                    <div
                                        key={ci}
                                        style={{
                                            background: 'var(--bg-secondary)',
                                            minHeight: isMobile ? '80px' : '135px',
                                            height: isMobile ? '80px' : '135px',
                                            maxHeight: isMobile ? '80px' : '135px',
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
                                        background: isToday ? 'var(--bg-today-light, rgba(5, 133, 39, 0.03))' : 'var(--bg-secondary)',
                                        minHeight: isMobile ? '80px' : '135px',
                                        height: isMobile ? '80px' : '135px',
                                        maxHeight: isMobile ? '80px' : '135px',
                                        padding: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '6px',
                                        border: isToday ? '1px solid rgba(5, 133, 39, 0.2)' : 'none',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s ease',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.background = isToday ? 'var(--bg-today-hover, rgba(5, 133, 39, 0.05))' : 'var(--hover-bg)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.background = isToday ? 'var(--bg-today-light, rgba(5, 133, 39, 0.03))' : 'var(--bg-secondary)';
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
                                        gap: '2px',
                                        overflow: 'hidden',
                                        flex: 1,
                                        justifyContent: 'flex-start',
                                        alignItems: 'stretch',
                                        width: '100%'
                                    }}>
                                        {dayEvents.slice(0, 3).map(event => {
                                            const priority = event.extendedProps?.priority || 4;
                                            const priorityColor = priority === 1 ? 'var(--p1-accent)' : priority === 2 ? 'var(--p2-accent)' : priority === 3 ? 'var(--p3-accent)' : 'var(--p4-accent)';
                                            const priorityBg = priority === 1 ? 'var(--p1-bg)' : priority === 2 ? 'var(--p2-bg)' : priority === 3 ? 'var(--p3-bg)' : 'var(--p4-bg)';
                                            const priorityBorder = priority === 1 ? 'var(--p1-border)' : priority === 2 ? 'var(--p2-border)' : priority === 3 ? 'var(--p3-border)' : 'var(--p4-border)';
                                            const isCompleted = event.extendedProps?.completed || event.completed || event.originalTask?.completed;

                                            const truncateLen = isMobile ? 6 : 14;
                                            const displayTitle = event.title.length > truncateLen ? `${event.title.substring(0, truncateLen)}...` : event.title;

                                            if (isMobile) {
                                                return (
                                                    <div
                                                        key={event.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEventClick({ event });
                                                        }}
                                                        style={{
                                                            fontSize: '9px',
                                                            fontWeight: 700,
                                                            padding: '2px 4px',
                                                            borderRadius: '3px',
                                                            background: priorityBg,
                                                            border: `1px solid ${priorityBorder}`,
                                                            color: priorityColor,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            cursor: 'pointer',
                                                            width: '100%',
                                                            textAlign: 'right',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                                                            textDecoration: isCompleted ? 'line-through' : 'none',
                                                            opacity: isCompleted ? 0.65 : 1
                                                        }}
                                                        title={event.title}
                                                    >
                                                        {displayTitle}
                                                    </div>
                                                );
                                            }

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
                                                        {displayTitle}
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

                                        {dayEvents.length > 3 && (
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onMoreClick) {
                                                        onMoreClick({
                                                            dateStr: dateKey,
                                                            tasks: dayEvents.map(ev => ev.originalTask || ev),
                                                            jsEvent: e
                                                        });
                                                    }
                                                }}
                                                style={{
                                                    fontSize: isMobile ? '8px' : '10px',
                                                    fontWeight: 700,
                                                    color: 'var(--primary-color)',
                                                    textAlign: 'center',
                                                    cursor: 'pointer',
                                                    padding: isMobile ? '2px' : '3px 6px',
                                                    background: 'rgba(5, 133, 39, 0.05)',
                                                    border: '1px dashed var(--primary-color)',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.background = 'rgba(5, 133, 39, 0.1)';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.background = 'rgba(5, 133, 39, 0.05)';
                                                }}
                                            >
                                                + {dayEvents.length - 3} עוד
                                            </div>
                                        )}
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

const ScrollableMonthlyView = ({ events, onDateClick, onEventClick, onDatesSet, activeMY, setActiveMY, onMoreClick }) => {
    const { theme } = useTheme();
    const scrollContainerRef = useRef(null);
    const isMobile = window.innerWidth <= 768;

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
                if (activeMY && (m !== activeMY.month || y !== activeMY.year)) {
                    lastActiveMY.current = { month: m, year: y };
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
            activeBlock.scrollIntoView({ block: 'start' });
        }
    }, []);

    // Listen to external activeMY changes (e.g. from parent navigation buttons)
    const lastActiveMY = useRef(activeMY);
    useEffect(() => {
        if (activeMY && (activeMY.month !== lastActiveMY.current.month || activeMY.year !== lastActiveMY.current.year)) {
            lastActiveMY.current = activeMY;

            // Check if month is loaded
            const exists = months.some(m => m.month === activeMY.month && m.year === activeMY.year);
            if (!exists) {
                loadMoreFuture();
            }

            setTimeout(() => {
                const activeBlock = scrollContainerRef.current?.querySelector(
                    `[data-month="${activeMY.month}"][data-year="${activeMY.year}"]`
                );
                if (activeBlock) {
                    activeBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 50);
        }
    }, [activeMY, months]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            direction: 'rtl',
            background: 'var(--bg-secondary)'
        }}>
            {/* Weekly Days Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                textAlign: 'center',
                background: 'var(--bg-secondary)',
                padding: '0.5rem 0',
                zIndex: 5
            }}>
                {(isMobile ? ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"] : HEB_DAY_HEADERS).map((lbl, idx) => (
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
                    msOverflowStyle: 'none',
                    scrollSnapType: 'y mandatory',
                    scrollBehavior: 'smooth'
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
                        onMoreClick={onMoreClick}
                    />
                ))}
            </div>
        </div>
    );
};

export default ScrollableMonthlyView;
