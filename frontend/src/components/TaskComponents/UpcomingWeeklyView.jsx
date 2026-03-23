import React, { useMemo, useRef } from 'react';
import { Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import SortableTaskItem from './SortableTaskItem';
import AddTaskCard from './AddTaskCard';

// Component for a single Droppable Day Zone
const DroppableDayZone = ({ 
    dayObj, 
    onAddTaskClick, 
    onTaskToggle, 
    onTaskDelete, 
    onTaskUpdate, 
    formatDayHeader, 
    hideAddButton = false,
    addingToDate,
    setAddingToDate,
    handleAddItem,
    newTaskContent,
    setNewItemContent,
    dummyInbox
}) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `drop-${dayObj.dateStr}`,
        data: { dateStr: dayObj.dateStr, type: 'DayZone' },
        disabled: hideAddButton
    });

    const isAddingHere = addingToDate === dayObj.dateStr;

    return (
        <div
            ref={setNodeRef}
            id={`day-${dayObj.dateStr}`}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.5rem',
                borderRadius: '8px',
                background: isOver ? 'rgba(var(--primary-rgb, 200, 50, 50), 0.05)' : 'transparent',
                border: isOver ? '1px dashed var(--primary-color)' : '1px solid transparent',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {formatDayHeader(dayObj.dateObj)}
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {dayObj.tasks.length > 0 ? (
                    dayObj.tasks.map(task => (
                        <div key={task.id} style={{ position: 'relative' }}>
                            <SortableTaskItem
                                item={task}
                                checklistId={task.checklist_id || 'inbox'}
                                toggleItem={onTaskToggle}
                                handleDeleteItem={onTaskDelete}
                                handleUpdateItem={onTaskUpdate}
                                useProgressArray={false}
                                isCompletedFallback={task.completed}
                                projectTitle={task.project_id ? (task.project_title || 'פרויקט') : 'תיבת המשימות'}
                                hideAddButton={hideAddButton}
                            />
                        </div>
                    ))
                ) : (
                    <div style={{ height: '4px' }}></div>
                )}

                {/* Visual indicator when dragging FAB over this zone */}
                {isOver && !isAddingHere && (
                    <div style={{
                        height: '2px',
                        background: 'var(--primary-color)',
                        width: '100%',
                        margin: '8px 0',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'absolute'
                        }}>
                            <Plus size={14} />
                        </div>
                    </div>
                )}

                {/* Inline AddTaskCard */}
                {isAddingHere && (
                    <div style={{ marginTop: '0.5rem' }}>
                        <AddTaskCard
                            newItemContent={newTaskContent}
                            setNewItemContent={setNewItemContent}
                            newItemDate={dayObj.dateStr}
                            setNewItemDate={() => {}} // Date is fixed in this view
                            checklist={dummyInbox}
                            setAddingToList={() => setAddingToDate(null)}
                            handleAddItem={handleAddItem}
                            suppressDateSpan={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

const UpcomingWeeklyView = ({
    events,
    startDate, // e.g. from a calendar selection, defaults to today
    onTaskUpdate,
    onTaskToggle,
    onTaskDelete,
    onAddTaskClick,
    hideAddButton = false,
    addingToDate,
    setAddingToDate,
    handleAddItem,
    newTaskContent,
    setNewItemContent,
    dummyInbox
}) => {
    const stripRef = useRef(null);
    const contentRef = useRef(null);

    const getLocalDateStr = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Group events by date string (YYYY-MM-DD)
    const groupedEvents = useMemo(() => {
        const groups = {};
        events.forEach(event => {
            // Handle both wrapped events (from FC) and raw tasks (from independent fetch)
            const rawTask = event.originalTask || event;
            if (!rawTask || !rawTask.id) return; // defensive check

            const dateKey = rawTask.target_date ? rawTask.target_date.split('T')[0] : null;
            if (dateKey) {
                if (!groups[dateKey]) groups[dateKey] = [];
                groups[dateKey].push(rawTask);
            }
        });

        // Sort tasks within each day by time, then creation
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                if (a.time && b.time) return a.time.localeCompare(b.time);
                if (a.time) return -1;
                if (b.time) return 1;
                return new Date(a.created_at) - new Date(b.created_at);
            });
        });

        return groups;
    }, [events]);

    // Generate the array of EXACTLY 7 days to render
    const daysToRender = useMemo(() => {
        const days = [];
        const start = new Date(startDate || new Date());
        start.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            const dateStr = getLocalDateStr(d);
            days.push({
                dateObj: d,
                dateStr: dateStr,
                tasks: groupedEvents[dateStr] || []
            });
        }
        return days;
    }, [startDate, groupedEvents]);

    // Formatters
    const formatDayHeader = (dateObj) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const isToday = dateObj.getTime() === today.getTime();
        const isTomorrow = dateObj.getTime() === tomorrow.getTime();

        const monthNames = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

        const dayNum = String(dateObj.getDate()).padStart(2, '0');
        const monthStr = monthNames[dateObj.getMonth()];
        const weekdayStr = dayNames[dateObj.getDay()];

        // e.g., "היום - חמישי מרץ 03"
        const dateSuffix = `${weekdayStr} ${monthStr} ${dayNum}`;

        if (isToday) return `היום - ${dateSuffix}`;
        if (isTomorrow) return `מחר - ${dateSuffix}`;
        return `${weekdayStr} ${monthStr} ${dayNum}`; // Just the date if neither today nor tomorrow
    };

    const formatStripDayName = (dateObj) => dateObj.toLocaleDateString('he-IL', { weekday: 'narrow' });
    const formatStripDayNumber = (dateObj) => dateObj.getDate();

    // Horizontal Strip Days (exactly the 7 days we are viewing)
    const stripDays = useMemo(() => {
        const days = [];
        const start = new Date(startDate || new Date());
        start.setHours(0, 0, 0, 0);

        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [startDate]);

    // Scroll to specific day when clicking strip
    const handleStripDateClick = (dateObj) => {
        const dateStr = dateObj.toISOString().split('T')[0];
        const element = document.getElementById(`day-${dateStr}`);
        if (element) {
            // Smooth scroll relative to the content container
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const todayStr = getLocalDateStr(new Date());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', maxWidth: '100%', margin: '0', background: 'var(--bg-color)', position: 'relative' }}>

            {/* Horizontal Date Strip (Sticky at top of container) */}
            <div style={{
                position: 'sticky',
                top: '0',
                zIndex: 50,
                background: 'var(--bg-color)',
                borderBottom: '1px solid var(--border-color)',
                padding: '10px 0',
                display: 'flex',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                <div
                    ref={stripRef}
                    style={{
                        display: 'flex',
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        gap: '12px',
                        padding: '0 1rem',
                        width: '100%',
                        WebkitOverflowScrolling: 'touch'
                    }}>
                    {stripDays.map((d, i) => {
                        const dStr = d.toISOString().split('T')[0];
                        const isToday = dStr === todayStr;
                        return (
                            <div
                                key={i}
                                onClick={() => handleStripDateClick(d)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    minWidth: '40px',
                                    cursor: 'pointer',
                                    opacity: d < new Date(new Date().setHours(0, 0, 0, 0)) ? 0.4 : 1
                                }}
                            >
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isToday ? 'var(--primary-color)' : 'var(--text-secondary)' }}>
                                    {formatStripDayName(d)}
                                </span>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginTop: '4px',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    background: isToday ? 'var(--primary-color)' : 'transparent',
                                    color: isToday ? 'white' : 'var(--text-primary)',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {formatStripDayNumber(d)}
                                </div>
                                {isToday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--primary-color)', marginTop: '2px' }}></div>}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Vertical 7-Day List */}
            <div ref={contentRef} style={{ flex: 1, padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '100px' }}>
                {daysToRender.map((dayObj) => (
                    <DroppableDayZone
                        key={dayObj.dateStr}
                        dayObj={dayObj}
                        formatDayHeader={formatDayHeader}
                        onAddTaskClick={onAddTaskClick}
                        onTaskToggle={onTaskToggle}
                        onTaskDelete={onTaskDelete}
                        onTaskUpdate={onTaskUpdate}
                        hideAddButton={hideAddButton}
                        addingToDate={addingToDate}
                        setAddingToDate={setAddingToDate}
                        handleAddItem={handleAddItem}
                        newTaskContent={newTaskContent}
                        setNewItemContent={setNewItemContent}
                        dummyInbox={dummyInbox}
                    />
                ))}
            </div>
        </div>
    );
};

export default UpcomingWeeklyView;

