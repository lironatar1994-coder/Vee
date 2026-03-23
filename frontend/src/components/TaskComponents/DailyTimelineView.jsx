import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import SortableTaskItem from './SortableTaskItem';
import AddTaskCard from './AddTaskCard';

const HOUR_HEIGHT = 80; // pixels per hour
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;

// Droppable slot for a specific time
const TimelineSlot = ({ 
    time, 
    dateStr, 
    onAddTaskClick, 
    showLine = false, 
    hideAddButton = false,
    addingToDate,
    addingToTime,
    setAddingToDate,
    setAddingToTime,
    handleAddItem,
    newTaskContent,
    setNewItemContent,
    dummyInbox
}) => {
    const { isOver, setNodeRef } = useDroppable({
        id: `slot-${dateStr}-${time}`,
        data: { dateStr, time, type: 'TimelineSlot' },
        disabled: hideAddButton
    });

    const isAddingHere = addingToDate === dateStr && addingToTime === time;

    return (
        <div
            ref={setNodeRef}
            onClick={() => !hideAddButton && onAddTaskClick(dateStr, time)}
            style={{
                height: `${HOUR_HEIGHT / 4}px`, // 15 minute slots
                borderTop: showLine ? '1px solid var(--border-color)' : 'none',
                position: 'relative',
                background: isOver ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.2s'
            }}
        >
            {isOver && !isAddingHere && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary-color)',
                    fontSize: '0.7rem',
                    fontWeight: 600
                }}>
                    הוסף ב-{time}
                </div>
            )}

            {/* Inline AddTaskCard rendered as an absolute overlay */}
            {isAddingHere && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '5px',
                    right: '5px',
                    zIndex: 1000,
                    minWidth: '300px',
                    boxShadow: 'var(--shadow-lg)'
                }}>
                    <AddTaskCard
                        newItemContent={newTaskContent}
                        setNewItemContent={setNewItemContent}
                        newItemDate={dateStr}
                        setNewItemDate={() => {}} // Fixed date
                        initialTime={time}
                        checklist={dummyInbox}
                        setAddingToList={() => {
                            setAddingToDate(null);
                            setAddingToTime(null);
                        }}
                        handleAddItem={handleAddItem}
                        suppressDateSpan={true}
                    />
                </div>
            )}
        </div>
    );
};

const DailyTimelineView = ({
    events,
    date = new Date(),
    onTaskUpdate,
    onTaskToggle,
    onTaskDelete,
    onAddTaskClick,
    addingToDate,
    addingToTime,
    setAddingToDate,
    setAddingToTime,
    handleAddItem,
    newTaskContent,
    setNewItemContent,
    dummyInbox,
    hideAddButton = false
}) => {
    const scrollContainerRef = useRef(null);

    const dateStr = useMemo(() => {
        const d = new Date(date);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, [date]);

    const { timedTasks, allDayTasks } = useMemo(() => {
        const timed = [];
        const allDay = [];

        events.forEach(event => {
            const rawTask = event.originalTask || event;
            if (!rawTask || !rawTask.id) return;

            const taskDate = rawTask.target_date ? rawTask.target_date.split('T')[0] : null;
            if (taskDate !== dateStr) return;

            if (rawTask.time) {
                timed.push(rawTask);
            } else {
                allDay.push(rawTask);
            }
        });

        // Sort timed tasks
        timed.sort((a, b) => a.time.localeCompare(b.time));

        return { timedTasks: timed, allDayTasks: allDay };
    }, [events, dateStr]);

    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Current time indicator position
    const [nowPercent, setNowPercent] = useState(0);
    useEffect(() => {
        const updateNow = () => {
            const now = new Date();
            const mins = now.getHours() * 60 + now.getMinutes();
            setNowPercent(mins * MINUTE_HEIGHT);
        };
        updateNow();
        const timer = setInterval(updateNow, 60000);
        return () => clearInterval(timer);
    }, []);

    // Initial scroll to current time or first task
    useEffect(() => {
        if (scrollContainerRef.current) {
            const now = new Date();
            const scrollPos = Math.max(0, (now.getHours() - 2) * HOUR_HEIGHT);
            scrollContainerRef.current.scrollTop = scrollPos;
        }
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--bg-color)', direction: 'rtl' }}>

            {/* Header with Date */}
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)', zIndex: 10 }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                    {new Date(date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
            </div>

            {/* All Day / Overdue Tasks Section */}
            {allDayTasks.length > 0 && (
                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.02)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>כל היום / ללא זמן</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {allDayTasks.map(task => (
                            <SortableTaskItem
                                key={task.id}
                                item={task}
                                checklistId={task.checklist_id || 'inbox'}
                                toggleItem={onTaskToggle}
                                handleDeleteItem={onTaskDelete}
                                handleUpdateItem={onTaskUpdate}
                                useProgressArray={false}
                                isCompletedFallback={task.completed}
                                hideAddButton={hideAddButton}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline Content */}
            <div
                ref={scrollContainerRef}
                style={{ flex: 1, overflowY: 'auto', position: 'relative', scrollBehavior: 'smooth' }}
            >
                <div style={{ position: 'relative', minHeight: `${24 * HOUR_HEIGHT}px`, display: 'flex' }}>

                    {/* Time Column */}
                    <div style={{ width: '60px', borderLeft: '1px solid var(--border-color)', flexShrink: 0 }}>
                        {hours.map(hour => (
                            <div key={hour} style={{ height: `${HOUR_HEIGHT}px`, position: 'relative' }}>
                                <span style={{
                                    position: 'absolute',
                                    top: '-10px',
                                    right: '10px',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-primary)',
                                    fontWeight: 600
                                }}>
                                    {String(hour).padStart(2, '0')}:00
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Grid & Tasks Column */}
                    <div style={{ flex: 1, position: 'relative' }}>
                        {/* Grid Lines (slots) */}
                        {hours.map(hour => {
                            const hourStr = String(hour).padStart(2, '0');
                            return (
                                <React.Fragment key={hour}>
                                    <TimelineSlot 
                                        time={`${hourStr}:00`} dateStr={dateStr} onAddTaskClick={onAddTaskClick} showLine={true} hideAddButton={hideAddButton} 
                                        addingToDate={addingToDate} addingToTime={addingToTime} setAddingToDate={setAddingToDate} setAddingToTime={setAddingToTime}
                                        handleAddItem={handleAddItem} newTaskContent={newTaskContent} setNewItemContent={setNewItemContent} dummyInbox={dummyInbox}
                                    />
                                    <TimelineSlot 
                                        time={`${hourStr}:15`} dateStr={dateStr} onAddTaskClick={onAddTaskClick} showLine={false} hideAddButton={hideAddButton}
                                        addingToDate={addingToDate} addingToTime={addingToTime} setAddingToDate={setAddingToDate} setAddingToTime={setAddingToTime}
                                        handleAddItem={handleAddItem} newTaskContent={newTaskContent} setNewItemContent={setNewItemContent} dummyInbox={dummyInbox}
                                    />
                                    <TimelineSlot 
                                        time={`${hourStr}:30`} dateStr={dateStr} onAddTaskClick={onAddTaskClick} showLine={false} hideAddButton={hideAddButton}
                                        addingToDate={addingToDate} addingToTime={addingToTime} setAddingToDate={setAddingToDate} setAddingToTime={setAddingToTime}
                                        handleAddItem={handleAddItem} newTaskContent={newTaskContent} setNewItemContent={setNewItemContent} dummyInbox={dummyInbox}
                                    />
                                    <TimelineSlot 
                                        time={`${hourStr}:45`} dateStr={dateStr} onAddTaskClick={onAddTaskClick} showLine={false} hideAddButton={hideAddButton}
                                        addingToDate={addingToDate} addingToTime={addingToTime} setAddingToDate={setAddingToDate} setAddingToTime={setAddingToTime}
                                        handleAddItem={handleAddItem} newTaskContent={newTaskContent} setNewItemContent={setNewItemContent} dummyInbox={dummyInbox}
                                    />
                                </React.Fragment>
                            );
                        })}

                        {/* Now Line */}
                        <div style={{
                            position: 'absolute',
                            top: `${nowPercent}px`,
                            left: 0,
                            right: 0,
                            height: '2px',
                            background: 'var(--primary-color)',
                            zIndex: 5,
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                position: 'absolute',
                                right: '-5px',
                                top: '-4px',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: 'var(--primary-color)'
                            }} />
                        </div>

                        {/* Timed Tasks */}
                        {timedTasks.map(task => {
                            const [h, m] = task.time.split(':').map(Number);
                            const top = (h * 60 + m) * MINUTE_HEIGHT;
                            const height = (task.duration || 15) * MINUTE_HEIGHT;

                            return (
                                <div
                                    key={task.id}
                                    style={{
                                        position: 'absolute',
                                        top: `${top}px`,
                                        left: '4px',
                                        right: '4px',
                                        height: `${Math.max(30, height)}px`,
                                        zIndex: 6,
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRight: '3px solid var(--primary-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        boxShadow: 'var(--shadow-sm)',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        padding: '2px 8px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            {task.time}
                                        </span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {/* Mini actions if needed */}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, minHeight: 0 }}>
                                        <SortableTaskItem
                                            item={task}
                                            checklistId={task.checklist_id || 'inbox'}
                                            toggleItem={onTaskToggle}
                                            handleDeleteItem={onTaskDelete}
                                            handleUpdateItem={onTaskUpdate}
                                            useProgressArray={false}
                                            isCompletedFallback={task.completed}
                                            compact={height < 50}
                                            hideAddButton={hideAddButton}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyTimelineView;
