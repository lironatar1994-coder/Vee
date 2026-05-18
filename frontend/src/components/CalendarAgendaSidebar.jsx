import React, { useMemo } from 'react';
import SortableTaskItem from './TaskComponents/SortableTaskItem';
import { useUser } from '../context/UserContext';
import { Calendar as CalendarIcon, Inbox, X } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const CalendarAgendaSidebar = ({ events, onUpdateItem, onToggleItem, onDeleteItem, onClose }) => {
    const { user } = useUser();

    // Group events by date for the next 30 days
    const { groupedTasks, sortedDates } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);

        const groups = {};
        
        events.forEach(event => {
            // We only want actual tasks (they have originalTask)
            if (!event.originalTask) return;
            
            const task = event.originalTask;
            if (task.completed === 1) return; // Skip completed

            // Parse date
            let taskDate;
            if (event.start) {
                taskDate = new Date(event.start);
            } else if (task.target_date) {
                taskDate = new Date(task.target_date);
            } else {
                return; // Skip tasks without dates
            }

            taskDate.setHours(0, 0, 0, 0);

            // Filter for next 30 days
            if (taskDate >= today && taskDate <= thirtyDaysFromNow) {
                const dateStr = taskDate.toISOString().split('T')[0];
                if (!groups[dateStr]) {
                    groups[dateStr] = [];
                }
                groups[dateStr].push(task);
            }
        });

        // Sort tasks within each day (by time, priority, etc)
        Object.keys(groups).forEach(date => {
            groups[date].sort((a, b) => {
                const timeA = a.time || '24:00';
                const timeB = b.time || '24:00';
                if (timeA !== timeB) return timeA.localeCompare(timeB);
                return (a.priority || 4) - (b.priority || 4);
            });
        });

        const sorted = Object.keys(groups).sort((a, b) => a.localeCompare(b));

        return { groupedTasks: groups, sortedDates: sorted };
    }, [events]);

    const formatHeaderDate = (dateString) => {
        const d = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = d.getTime() === today.getTime();
        const isTomorrow = d.getTime() === tomorrow.getTime();

        const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
        const dayMonth = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

        if (isToday) return `היום - ${weekday}, ${dayMonth}`;
        if (isTomorrow) return `מחר - ${weekday}, ${dayMonth}`;
        return `${weekday}, ${dayMonth}`;
    };

    return (
        <div className="agenda-sidebar" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)', // Right border in RTL means the left border visually. Wait, if it's placed on the right side of the screen, we need border-left.
            borderLeft: '1px solid var(--border-color)',
            overflowY: 'auto',
            padding: '1rem',
            gap: '1.5rem',
            direction: 'rtl'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarIcon size={18} style={{ color: 'var(--primary-color)' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>לו"ז 30 ימים</span>
                </div>
                <button 
                    onClick={onClose} 
                    className="btn-icon-soft" 
                    style={{ 
                        width: '28px', 
                        height: '28px', 
                        borderRadius: '50%', 
                        border: 'none', 
                        background: 'transparent', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        color: 'var(--text-secondary)',
                        transition: 'background 0.2s'
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {sortedDates.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, marginTop: '2rem', gap: '0.5rem' }}>
                    <Inbox size={32} />
                    <span>אין משימות ל-30 הימים הקרובים</span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {sortedDates.map(dateStr => (
                        <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: 'var(--text-primary)',
                                position: 'sticky',
                                top: '-1rem',
                                background: 'var(--bg-secondary)',
                                padding: '0.5rem 0',
                                zIndex: 10
                            }}>
                                {formatHeaderDate(dateStr)}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                {/* Wrap in SortableContext so SortableTaskItem doesn't throw errors */}
                                <SortableContext items={groupedTasks[dateStr].map(t => `agenda-${t.id}`)} strategy={verticalListSortingStrategy}>
                                    {groupedTasks[dateStr].map(task => (
                                        <SortableTaskItem
                                            key={`agenda-${task.id}`}
                                            item={{ ...task, id: `agenda-${task.id}`, originalId: task.id }}
                                            checklistId="agenda"
                                            compact={true}
                                            hideDate={true}
                                            isOverlay={false}
                                            toggleItem={(id, status) => onToggleItem(task.id, status)}
                                            handleUpdateItem={(id, updates) => onUpdateItem(task.id, updates)}
                                            handleDeleteItem={(stub, id, checklistId) => onDeleteItem && onDeleteItem(stub, task.id, checklistId)}
                                        />
                                    ))}
                                </SortableContext>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CalendarAgendaSidebar;
