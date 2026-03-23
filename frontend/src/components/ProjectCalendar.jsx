import React, { useState, useEffect } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addWeeks,
    subWeeks,
    startOfWeek,
    endOfWeek,
    isToday
} from 'date-fns';
import { he } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon, CheckCircle } from 'lucide-react';

const ProjectCalendar = ({ projectId, API_URL, onDayClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
    const [historyData, setHistoryData] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, [currentDate, viewMode, projectId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            let start, end;
            if (viewMode === 'month') {
                start = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                end = format(endOfMonth(currentDate), 'yyyy-MM-dd');
            } else {
                start = format(startOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
                end = format(endOfWeek(currentDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
            }

            const res = await fetch(`${API_URL}/projects/${projectId}/history?startDate=${start}&endDate=${end}`);
            if (res.ok) {
                const data = await res.json();
                const historyMap = {};
                data.forEach(day => {
                    historyMap[day.date] = {
                        total: day.totalTasks,
                        completed: day.completedTasks,
                        percent: day.totalTasks > 0 ? (day.completedTasks / day.totalTasks) * 100 : 0
                    };
                });
                setHistoryData(historyMap);
            }
        } catch (err) {
            console.error("Failed to fetch history data", err);
        }
        setLoading(false);
    };

    const nextTime = () => {
        setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
    };

    const prevTime = () => {
        setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
    };

    // Note: hebrew week starts on Sunday (index 0)
    const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const renderHeader = () => {
        const dateFormat = viewMode === 'month' ? 'MMMM yyyy' : 'MMMM do, yyyy';
        const isMobile = window.innerWidth <= 768;
        return (
            <div className="calendar-header" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: 'rgba(var(--bg-rgb), 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--border-color)'
            }}>
                <button onClick={prevTime} className="btn-icon-soft" title="הקודם">
                    {/* RTL: Prev means right arrow, Next means left arrow visually */}
                    <ChevronRight size={isMobile ? 20 : 24} />
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalendarIcon size={isMobile ? 18 : 20} style={{ color: 'var(--primary-color)' }} />
                    <h2 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: 800 }}>{format(currentDate, dateFormat, { locale: he })}</h2>
                </div>
                <button onClick={nextTime} className="btn-icon-soft" title="הבא">
                    <ChevronLeft size={isMobile ? 20 : 24} />
                </button>
            </div>
        );
    };

    const renderDays = () => {
        return (
            <div className="calendar-days-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {daysOfWeek.map((day, idx) => (
                    <div key={idx} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '0.5rem 0' }}>
                        {day}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        let startDate, endDate;
        if (viewMode === 'month') {
            const startOfCurrentMonth = startOfMonth(currentDate);
            startDate = startOfWeek(startOfCurrentMonth, { weekStartsOn: 0 });
            endDate = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
        } else {
            startDate = startOfWeek(currentDate, { weekStartsOn: 0 });
            endDate = endOfWeek(currentDate, { weekStartsOn: 0 });
        }

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className={`calendar-grid ${loading ? 'loading-pulse' : ''}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.5rem' }}>
                {days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isDayToday = isToday(day);
                    const history = historyData[dayStr];
                    const isMobile = window.innerWidth <= 768;

                    let progressClass = '';
                    let progressColor = 'transparent';
                    if (history) {
                        if (history.percent === 100) progressColor = 'var(--success-color)';
                        else if (history.percent > 0) progressColor = 'var(--primary-color)';
                    }

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDayClick && onDayClick(dayStr)}
                            className={`calendar-cell card ${!isCurrentMonth && viewMode === 'month' ? 'outside-month' : ''} ${isDayToday ? 'is-today' : ''}`}
                            style={{
                                height: isMobile ? (viewMode === 'month' ? '70px' : '100px') : (viewMode === 'month' ? '100px' : '150px'),
                                padding: isMobile ? '0.4rem' : '0.75rem',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                opacity: !isCurrentMonth && viewMode === 'month' ? 0.3 : 1,
                                border: isDayToday ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                background: isDayToday ? 'rgba(var(--primary-rgb), 0.05)' : 'var(--bg-color)',
                                position: 'relative',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                transform: 'scale(1)'
                            }}
                        >
                            <span style={{
                                fontWeight: isDayToday ? 800 : 600,
                                fontSize: isMobile ? '0.9rem' : '1.1rem',
                                color: isDayToday ? 'var(--primary-color)' : 'var(--text-primary)'
                            }}>
                                {format(day, 'd')}
                            </span>

                            {history && history.total > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                    {history.percent === 100 ? (
                                        <CheckCircle size={28} color="var(--success-color)" />
                                    ) : (
                                        <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                                            <svg width="32" height="32" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                                                <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border-color)" strokeWidth="3" />
                                                <circle cx="18" cy="18" r="15" fill="none" stroke={progressColor} strokeWidth="3" strokeDasharray={`${(history.percent / 100) * 94.2} 94.2`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                                            </svg>
                                        </div>
                                    )}
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {history.completed}/{history.total}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="card slide-up" style={{ padding: '2rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, color: 'var(--primary-color)' }}>היסטוריית פרויקט</h3>

                {/* View Toggle */}
                <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 'var(--radius-full)', padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                    <button
                        onClick={() => setViewMode('month')}
                        style={{
                            background: viewMode === 'month' ? 'var(--bg-secondary)' : 'transparent',
                            color: viewMode === 'month' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            boxShadow: viewMode === 'month' ? 'var(--card-shadow)' : 'none',
                            border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)'
                        }}
                    >
                        חודש
                    </button>
                    <button
                        onClick={() => setViewMode('week')}
                        style={{
                            background: viewMode === 'week' ? 'var(--bg-secondary)' : 'transparent',
                            color: viewMode === 'week' ? 'var(--primary-color)' : 'var(--text-secondary)',
                            boxShadow: viewMode === 'week' ? 'var(--card-shadow)' : 'none',
                            border: 'none', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)'
                        }}
                    >
                        שבוע
                    </button>
                </div>
            </div>

            {renderHeader()}
            {renderDays()}
            {renderCells()}
        </div>
    );
};

export default ProjectCalendar;
