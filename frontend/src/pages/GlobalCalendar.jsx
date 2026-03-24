import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import CalendarWrapper from '../components/CalendarWrapper';
import { ChevronDown, Loader2, X } from 'lucide-react';
import CalendarPageLayout from '../components/CalendarPageLayout';
import TaskEditModal from '../components/TaskEditModal';
import cache from '../utils/cache';

// Helper to filter recurring tasks to only show "current or next" occurrence
const filterRecurringTasks = (tasks) => {
    if (!tasks || tasks.length === 0) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Group by ID
    const taskGroups = {};
    tasks.forEach(task => {
        const id = task.id;
        if (!taskGroups[id]) taskGroups[id] = [];
        taskGroups[id].push(task);
    });

    const result = [];
    Object.values(taskGroups).forEach(group => {
        const first = group[0];
        const rawTask = first.originalTask || first;
        const isRecurring = rawTask.repeat_rule && rawTask.repeat_rule !== 'none';

        if (!isRecurring) {
            result.push(...group);
            return;
        }

        // It's recurring.
        // The user wants ONLY the next recurrence, not all of them.
        group.sort((a, b) => {
            const dateA = a.target_date || (a.start ? (typeof a.start === 'string' ? a.start.split('T')[0] : a.start) : '');
            const dateB = b.target_date || (b.start ? (typeof b.start === 'string' ? b.start.split('T')[0] : b.start) : '');
            const strA = typeof dateA === 'object' ? dateA.toISOString().split('T')[0] : dateA;
            const strB = typeof dateB === 'object' ? dateB.toISOString().split('T')[0] : dateB;
            return (strA || '').localeCompare(strB || '');
        });

        // 1. Find the first occurrence that is today or in the future
        const nextOccurrence = group.find(t => {
            const d = t.target_date || (t.start ? (typeof t.start === 'string' ? t.start.split('T')[0] : t.start) : '');
            const strD = typeof d === 'object' ? d.toISOString().split('T')[0] : d;
            return (strD || '') >= todayStr;
        });

        if (nextOccurrence) {
            result.push(nextOccurrence);
        } else {
            // Fallback: if all are in the past, pick the latest one
            result.push(group[group.length - 1]);
        }
    });

    return result;
};

const API_URL = '/api';

const GlobalCalendar = () => {
    const { user } = useUser();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState(() => localStorage.getItem('calendarViewMode') || 'monthly');
    const [events, setEvents] = useState(() => (user && cache.get(`calendar_events_monthly_${user.id}`)) || []);
    const [loading, setLoading] = useState(user ? !cache.get(`calendar_events_monthly_${user.id}`) : true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [currentRange, setCurrentRange] = useState({ start: null, end: null });
    const [scrollTop, setScrollTop] = useState(0);
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
    const viewDropdownRef = useRef(null);
    const calendarWrapperRef = useRef(null);
    const popoverRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(event.target)) {
                setIsViewDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleDragStart = (event) => {
        setActiveDragItem(event.active);
    };

    const handleDragEnd = useCallback((event) => {
        const { active, over, activatorEvent } = event;
        setActiveDragItem(null);

        // New Logic: Handle FAB drop on the unified Calendar
        if (active.id === 'global-fab-draggable' && over?.id === 'calendar-drop-zone') {
            const { x, y } = window.lastFABPointer || {};

            if (calendarWrapperRef.current && x !== undefined && y !== undefined) {
                const dropData = calendarWrapperRef.current.getDateTimeAtPoint(x, y);
                if (dropData) {
                    const { date, time } = dropData;
                    
                    // Set global variables for the Add Task Modal to pick up
                    window.globalNewItemDate = date;
                    window.globalNewItemTime = time;
                    
                    // Trigger the global add task modal in next tick to avoid flushSync error
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('fabAddTask'));
                    }, 0);
                    
                    toast.info(`יוצר משימה ל-${date}${time ? ' ב-' + time : ''}`);
                }
            }
        }
    }, [calendarWrapperRef]);

    const handleDragCancel = () => {
        window.lastFABPointer = null;
        setActiveDragItem(null);
    };

    // Inline Add State
    const [addingToDate, setAddingToDate] = useState(null);
    const [addingToTime, setAddingToTime] = useState(null);
    const [newTaskContent, setNewTaskContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editItem, setEditItem] = useState(null);

    // Day Popover State
    const [showDayPopover, setShowDayPopover] = useState(false);
    const [dayPopoverData, setDayPopoverData] = useState({ date: null, tasks: [], position: { x: 0, y: 0 } });

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setShowDayPopover(false);
            }
        };
        if (showDayPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDayPopover]);

    const handleMoreLinkClick = (arg) => {
        const { date, allSegs, jsEvent } = arg;

        // Prevent default browser and FC behavior
        if (jsEvent) {
            jsEvent.preventDefault();
            jsEvent.stopPropagation();
        }

        const tasks = allSegs.map(seg => seg.event.extendedProps.originalTask).filter(Boolean);

        // Calculate position relative to window or parent
        const x = jsEvent.clientX;
        const y = jsEvent.clientY;

        setDayPopoverData({
            date: date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
            tasks,
            position: { x, y }
        });
        setShowDayPopover(true);
        return false; // Prevent FC's default popover
    };

    const { isSidebarOpen } = useOutletContext();
    const isMobile = window.innerWidth <= 768;

    useEffect(() => {
        localStorage.setItem('calendarViewMode', viewMode);
    }, [viewMode]);

    // Format events for FullCalendar
    const fetchCalendarEvents = async (targetMonth = null) => {
        if (!user) return;

        // Use targetMonth or fallback to current view or today
        let monthSearch = targetMonth;
        if (!monthSearch) {
            const date = new Date();
            monthSearch = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        setIsRefreshing(true);
        if (!cache.get(`calendar_events_monthly_${user.id}`)) {
            setLoading(true);
        }
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/tasks/by-month?month=${monthSearch}`);
            if (res.ok) {
                const summary = await res.json();

                // Parse summary into fullcalendar events array
                const eventList = [];
                for (const [dateStr, data] of Object.entries(summary)) {
                    if (data.tasks) {
                        data.tasks.forEach(task => {
                            const startVal = task.time ? `${dateStr}T${task.time}` : dateStr;
                            eventList.push({
                                id: task.id,
                                title: task.content,
                                start: startVal,
                                allDay: !task.time,
                                extendedProps: {
                                    completed: task.completed
                                },
                                originalTask: task // ADDED: Keep raw task for UpcomingDayView
                            });
                        });
                    }
                }

                // Filter recurring tasks if needed
                const filteredEventList = filterRecurringTasks(eventList);

                setEvents(filteredEventList);
                cache.set(`calendar_events_monthly_${user.id}`, filteredEventList);
            }
        } catch (error) {
            console.error('Error fetching calendar events', error);
            toast.error('שגיאה בטעינת נתוני לוח שנה');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleDatesSet = (dateInfo) => {
        // FullCalendar's datesSet gives us the visible range.
        const midDate = new Date((dateInfo.start.getTime() + dateInfo.end.getTime()) / 2);
        const y = midDate.getFullYear();
        const m = String(midDate.getMonth() + 1).padStart(2, '0');
        const monthStr = `${y}-${m}`;

        // Avoid redundant fetches if we are already in this month range
        if (monthStr !== currentRange.month) {
            setCurrentRange({ month: monthStr });
            fetchCalendarEvents(monthStr);
        }
    };

    useEffect(() => {
        const handleRefresh = () => {
            fetchCalendarEvents(currentRange.month);
        };
        window.addEventListener('refreshCalendarTasks', handleRefresh);
        return () => window.removeEventListener('refreshCalendarTasks', handleRefresh);
    }, [currentRange.month]);

    useEffect(() => {
        // Initial load is handled by handleDatesSet in FullCalendar
    }, [user]);

    const handleDateClick = (arg) => {
        setAddingToDate(arg.dateStr);
        setAddingToTime(null);
        setNewTaskContent('');
    };

    const handleAddItem = async (e, _checklistId, parentId = null, explicitContent = null) => {
        if (e) e.preventDefault();
        const contentToSave = explicitContent !== null ? explicitContent : newTaskContent;
        if (!contentToSave || !contentToSave.trim()) return;

        setIsCreating(true);

        const dateInput = window.globalNewItemDate || addingToDate;
        const timeInput = window.globalNewItemTime || addingToTime || null;
        const durationInput = window.globalNewItemDuration || 15;
        const descriptionInput = window.globalNewItemDescription || null;
        const repeatRuleInput = window.globalNewItemRepeatRule || null;
        const priorityInput = window.globalNewItemPriority || 4;
        const reminderMinutesInput = window.globalNewItemReminderMinutes;

        // Reset global variables immediately
        window.globalNewItemDate = null;
        window.globalNewItemTime = null;
        window.globalNewItemDuration = 15;
        window.globalNewItemDescription = null;
        window.globalNewItemRepeatRule = null;
        window.globalNewItemPriority = 4;
        window.globalNewItemReminderMinutes = null;

        try {
            let targetChecklistId = _checklistId;
            // If it's undefined or the dummy 'inbox' id, fetch the actual inbox ID.
            if (!targetChecklistId || targetChecklistId === 'inbox') {
                const clRes = await fetch(`${API_URL}/users/${user.id}/checklists`);
                if (!clRes.ok) throw new Error('Failed to fetch lists');
                const lists = await clRes.json();
                let inbox = lists.find(c => c.project_id === null);

                if (!inbox) {
                    // Create an inbox checklist if it doesn't exist
                    const createRes = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            title: '',
                            project_id: null,
                            active_days: '0,1,2,3,4,5,6'
                        })
                    });
                    if (!createRes.ok) throw new Error('Failed to auto-create inbox');
                    inbox = await createRes.json();
                }
                targetChecklistId = inbox.id;
            }

            const res = await fetch(`${API_URL}/checklists/${targetChecklistId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: contentToSave.trim(),
                    target_date: dateInput,
                    time: timeInput,
                    duration: durationInput,
                    description: descriptionInput,
                    repeat_rule: repeatRuleInput,
                    priority: priorityInput,
                    reminder_minutes: reminderMinutesInput,
                    parent_item_id: parentId
                })
            });

            if (res.ok) {
                toast.success('משימה נוצרה בהצלחה');
                setAddingToDate(null);
                setAddingToTime(null);
                setNewTaskContent('');
                fetchCalendarEvents(currentRange.month); // Refresh current visible month
            } else {
                toast.error('שגיאה ביצירת המשימה');
            }
        } catch (error) {
            console.error('Error creating task from calendar', error);
            toast.error('שגיאה ביצירת המשימה: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleEventClick = (arg) => {
        const { event } = arg;
        if (event.extendedProps?.originalTask) {
            setEditItem(event.extendedProps.originalTask);
            setShowEditModal(true);
        }
    };

    const handleEventDrop = async (arg) => {
        const { event, revert } = arg;
        const newDate = event.startStr.split('T')[0]; // simple YYYY-MM-DD
        let newTime = null;
        if (!event.allDay && event.start.getHours()) {
            newTime = event.startStr.split('T')[1].substring(0, 5); // HH:mm
        }

        try {
            const res = await fetch(`${API_URL}/items/${event.id}/datetime`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target_date: newDate,
                    time: newTime
                })
            });

            if (!res.ok) {
                throw new Error('Failed to update event date/time');
            }
            toast.success('משימה אחת נערכה');
        } catch (e) {
            console.error(e);
            toast.error('שגיאה בעדכון התאריך');
            revert();
        }
    };

    const handleEventResize = async (arg) => {
        // Similar to drop, but usually just extending time
        // Just calling drop logic for simplicity, though resize changes end date, which we don't track on backend yet.
        toast.info('שינוי אורך אירוע לא נתמך כרגע');
        arg.revert();
    };

    const handleUpcomingTaskToggle = async (taskId, currentStatus) => {
        const newStatus = !currentStatus ? 1 : 0;

        // 1. Optimistic Update Local UI
        const delay = newStatus ? 400 : 0;
        setTimeout(() => {
            setEvents(prev => prev.map(e =>
                e.id == taskId ? { ...e, extendedProps: { ...e.extendedProps, completed: newStatus }, originalTask: { ...e.originalTask, completed: newStatus } } : e
            ));
            // Also update the popover tasks if it's open!
            if (showDayPopover) {
                setDayPopoverData(prev => ({
                    ...prev,
                    tasks: prev.tasks.map(t => t.id === taskId ? { ...t, completed: newStatus } : t)
                }));
            }
            toast.success('משימה אחת נערכה');
        }, delay);

        try {
            // 2. Perform network request
            const res = await fetch(`${API_URL}/items/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: newStatus })
            });

            if (!res.ok) throw new Error("Server error");
        } catch (e) {
            console.error(e);
            toast.error('שגיאה בעדכון מצב המשימה - מתבטל');
            // 3. Revert Optimistic Update
            setEvents(prev => prev.map(e =>
                e.id == taskId ? { ...e, extendedProps: { ...e.extendedProps, completed: currentStatus ? 1 : 0 }, originalTask: { ...e.originalTask, completed: currentStatus ? 1 : 0 } } : e
            ));
        }
    };

    const handleUpcomingTaskDelete = async (stub, taskId, checklistId) => {
        try {
            const res = await fetch(`${API_URL}/items/${taskId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('משימה נמחקה');
                setEvents(prev => prev.filter(e => e.id !== taskId));
            }
        } catch (e) {
            console.error(e);
            toast.error('שגיאה במחיקת המשימה');
        }
    };

    const handleUpcomingTaskUpdate = async (taskId, updatedFields) => {
        try {
            const res = await fetch(`${API_URL}/items/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedFields)
            });
            if (res.ok) {
                // Update local state so it reflects instantly
                setEvents(prev => prev.map(e =>
                    e.id == taskId ? { ...e, title: updatedFields.content || e.title, extendedProps: { ...e.extendedProps, ...updatedFields }, originalTask: { ...e.originalTask, ...updatedFields } } : e
                ));
                toast.success('משימה אחת נערכה');
            }
        } catch (error) {
            toast.error('שגיאה בעדכון משימה');
        }
    };

    return (
        <CalendarPageLayout
            title='לו"ז'
            forceHeaderTitle={true}
            maxWidth="100%"
            padding="0"
            onDragEnd={handleDragEnd}
            contentPadding="0 0 100px"
            onDragStart={handleDragStart}
            onDragCancel={handleDragCancel}
            activeDragItem={activeDragItem}
            externalScrollTop={scrollTop}
            onScroll={setScrollTop}

            headerActions={
                <div ref={viewDropdownRef} style={{ position: 'relative', marginTop: '4px' }}>
                    <button
                        onClick={() => setIsViewDropdownOpen(!isViewDropdownOpen)}
                        className="btn-icon-soft"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: 'var(--radius-md)',
                            background: isViewDropdownOpen ? 'var(--dropdown-hover)' : 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: isViewDropdownOpen ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        <span>{viewMode === 'daily' ? 'יומי' : viewMode === 'weekly' ? 'שבועי' : 'חודשי'}</span>
                        <ChevronDown size={14} style={{ opacity: 0.6, transform: isViewDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                    </button>

                    {isViewDropdownOpen && (
                        <div className="action-menu-dropdown fade-in slide-down" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            minWidth: '130px',
                            marginTop: '0.5rem',
                            zIndex: 1000,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.12)',
                            overflow: 'hidden',
                            padding: '0.25rem',
                            backdropFilter: 'blur(10px)'
                        }}>
                            {[
                                { id: 'daily', label: 'יומי' },
                                { id: 'weekly', label: 'שבועי' },
                                { id: 'monthly', label: 'חודשי' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    className="action-menu-item"
                                    onClick={() => { setViewMode(option.id); setIsViewDropdownOpen(false); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.6rem 0.85rem',
                                        width: '100%',
                                        textAlign: 'right',
                                        background: viewMode === option.id ? 'var(--hover-bg)' : 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: viewMode === option.id ? 'var(--primary-color)' : 'var(--text-primary)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: viewMode === option.id ? 700 : 500,
                                        fontSize: '0.95rem',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            }
        >
            {loading && events.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--primary-color)' }}>
                    <Loader2 className="animate-spin" size={32} />
                </div>
            ) : (
                <div className="card" style={{
                    flex: 1,
                    padding: isMobile ? '0.5rem' : '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    {isRefreshing && (
                        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, color: 'var(--primary-color)' }}>
                            <Loader2 className="animate-spin" size={20} />
                        </div>
                    )}
                    <CalendarWrapper
                        ref={calendarWrapperRef}
                        isDraggingFAB={activeDragItem?.id === 'global-fab-draggable'}
                        events={events.filter(e => !e.extendedProps?.completed)}
                        viewMode={viewMode}
                        onDateClick={(arg) => {
                            const dateStr = arg.dateStr.split('T')[0];
                            const timeStr = arg.dateStr.includes('T') ? arg.dateStr.split('T')[1].substring(0, 5) : null;
                            
                            // Set global variables for the Add Task Modal to pick up
                            window.globalNewItemDate = dateStr;
                            window.globalNewItemTime = timeStr;
                            
                            // Trigger the global add task modal
                            window.dispatchEvent(new CustomEvent('fabAddTask'));
                            
                            setAddingToDate(dateStr);
                            setAddingToTime(timeStr);
                            setNewTaskContent('');
                        }}
                        onEventClick={handleEventClick}
                        onEventDrop={handleEventDrop}
                        onEventResize={handleEventResize}
                        onDatesSet={handleDatesSet}
                        onMoreLinkClick={handleMoreLinkClick}
                        height="auto"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: ''
                        }}
                    />
                </div>
            )}

            {/* Day Tasks Popover */}
            {showDayPopover && (
                <div
                    ref={popoverRef}
                    className="fade-in slide-down"
                    style={{
                        position: 'fixed',
                        top: Math.min(dayPopoverData.position.y, window.innerHeight - 300),
                        left: Math.max(20, Math.min(dayPopoverData.position.x - 130, window.innerWidth - 320)),
                        width: '300px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
                        zIndex: 2000,
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)',
                        padding: '0.75rem'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{dayPopoverData.date}</span>
                        <button onClick={() => setShowDayPopover(false)} className="btn-icon-soft" style={{ width: '24px', height: '24px' }}>
                            <X size={14} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingLeft: '4px' }}>
                        {dayPopoverData.tasks.map(task => (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
                                <div
                                    onClick={() => handleUpcomingTaskToggle(task.id, task.completed)}
                                    style={{
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        border: `2px solid ${task.completed ? 'var(--success-color)' : 'var(--text-secondary)'}`,
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}
                                >
                                    {task.completed === 1 && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success-color)' }}></div>}
                                </div>
                                <span
                                    onClick={() => { setEditItem(task); setShowEditModal(true); setShowDayPopover(false); }}
                                    style={{
                                        fontSize: '0.85rem', flexGrow: 1, cursor: 'pointer',
                                        textDecoration: task.completed ? 'line-through' : 'none',
                                        opacity: task.completed ? 0.6 : 1,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {task.content}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {showEditModal && editItem && (
                <TaskEditModal
                    item={editItem}
                    isOpen={showEditModal}
                    onClose={() => setShowEditModal(false)}
                    onSave={(updates) => handleUpcomingTaskUpdate(editItem.id, updates)}
                    onDelete={() => handleUpcomingTaskDelete(editItem.id)}
                    onToggleComplete={() => handleUpcomingTaskToggle(editItem.id, editItem.completed)}
                    isCompleted={editItem.completed === 1}
                    allItems={events.map(e => e.originalTask)}
                />
            )}
        </CalendarPageLayout>
    );
};

export default GlobalCalendar;
