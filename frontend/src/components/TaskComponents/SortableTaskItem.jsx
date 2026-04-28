import React, { useState, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Check, Plus, RefreshCw, GripVertical, Folder, ListTree, MessageSquare, Calendar as CalendarIcon } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DatePickerDropdown from '../DatePickerDropdown';
import TimePickerDropdown from '../TimePickerDropdown';
import TaskEditModal from '../TaskEditModal';
import { renderFormattedDate, TIME_OPTIONS, repeatLabels, repeatOptions } from './utils.jsx';

const SortableTaskItem = ({
    item, checklistId, depth = 0, isCompletedFallback = false, useProgressArray = true, todayProgress, addingToItem,
    toggleItem, setAddingToItem, setAddingToList, handleAddItem, handleDeleteItem,
    newItemContent, setNewItemContent, handleSetTargetDate, handleUpdateItem,
    idPrefix = 'task-',
    isWaterfalling = false,
    hideAddButton = false,
    isOverlay = false,
    allItems = [],
    sectionTitle = '',
    projectTitle = '',
    compact = false,
    hideToday = false,
    completionDateString = null
}) => {
    const [localCompleted, setLocalCompleted] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showRepeatMenu, setShowRepeatMenu] = useState(false);
    const [showTimeMenu, setShowTimeMenu] = useState(false);
    const [showReminderMenu, setShowReminderMenu] = useState(false);
    const [editItem, setEditItem] = useState(item);
    const [anchorRect, setAnchorRect] = useState(null);
    const dateRef = useRef(null);
    const timeBtnRef = useRef(null);
    const reminderRef = useRef(null);
    const reminderMenuRef = useRef(null);

    useEffect(() => {
        setLocalCompleted(null);
    }, [todayProgress, isCompletedFallback]);

    let isCompleted = false;
    if (localCompleted !== null) {
        isCompleted = localCompleted;
    } else if (useProgressArray && todayProgress) {
        const progress = todayProgress.find(p => p.checklist_item_id === item.id);
        isCompleted = progress ? progress.completed === 1 : false;
    } else {
        isCompleted = isCompletedFallback;
    }

    const priority = item.priority || 4;
    let priorityColor = 'var(--text-secondary)';

    if (priority === 1) {
        priorityColor = 'var(--priority-1)';
    } else if (priority === 2) {
        priorityColor = 'var(--priority-2)';
    } else if (priority === 3) {
        priorityColor = 'var(--priority-3)';
    }

    const subtasks = item.children || [];
    const totalSubtasks = subtasks.length;
    const completedSubtasksCount = subtasks.filter(child => {
        if (useProgressArray && todayProgress) {
            const progress = todayProgress.find(p => p.checklist_item_id === child.id);
            return progress ? progress.completed === 1 : false;
        }
        return child.isCompletedFallback;
    }).length;

    const playCompletionSound = () => {
        try {
            const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3');
            audio.volume = 0.5;
            audio.play();
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    };

    const isAddingHere = addingToItem === item.id;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: `${idPrefix}${item.id}`,
        disabled: depth !== 0,
        data: { type: 'Task', item, checklistId, allItems }
    });

    useEffect(() => {
        setEditItem(item);
    }, [item]);

    // Click outside handler for reminder menu
    useEffect(() => {
        const handler = (e) => {
            if (!showReminderMenu) return;
            // If click is inside the menu, let it handle it
            if (reminderMenuRef.current && reminderMenuRef.current.contains(e.target)) return;
            // If click is on the trigger, the trigger's onClick will handle toggling
            if (reminderRef.current && reminderRef.current.contains(e.target)) return;

            setShowReminderMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showReminderMenu]);

    const style = {
        transform: isOverlay ? undefined : CSS.Transform.toString(transform),
        transition: isOverlay ? undefined : transition,
        zIndex: isDragging || isOverlay ? (isOverlay ? 9999 : 50) : 'auto',
        position: 'relative',
        willChange: 'transform'
    };

    return (
        <>
            <div ref={setNodeRef} style={{ ...style, display: 'flex', flexDirection: 'column', paddingRight: isOverlay ? 0 : `${depth * 1.0}rem` }}>
                <div
                    className={`task-item ${isCompleted ? 'is-completed' : ''} ${isOverlay ? 'is-drag-overlay' : isDragging ? 'is-dragging-origin' : ''} ${isWaterfalling ? 'magic-reveal' : ''}`}
                    {...(!isCompleted && depth === 0 ? { ...attributes, ...listeners } : {})}
                    onClick={(e) => {
                        if (isDragging) return;
                        setAnchorRect(e.currentTarget.getBoundingClientRect());
                        setEditItem(item);
                        setShowEditModal(true);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        background: isOverlay ? 'var(--bg-secondary)' : 'transparent',
                        cursor: (!isCompleted && depth === 0) ? 'grab' : 'pointer',
                        padding: compact ? '4px 8px' : '8px 0',
                        marginBottom: '0',
                        position: 'relative',
                        borderRadius: isOverlay ? 'var(--radius-md)' : '0',
                        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
                    }}
                >
                    <div style={{
                        flexGrow: 1,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        minWidth: 0
                    }}>
                        <div
                            className="check-circle"
                            style={{
                                color: isCompleted ? 'var(--success-color)' : priorityColor,
                                display: 'flex',
                                alignItems: 'start',
                                height: '20px',
                                width: '20px',
                                flexShrink: 0,
                                marginTop: '2px',
                                position: 'relative'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                const currentlyCompleted = isCompleted;
                                setLocalCompleted(!currentlyCompleted);
                                if (!currentlyCompleted) playCompletionSound();
                                if (toggleItem) toggleItem(item.id, currentlyCompleted);
                            }}
                        >
                            {isCompleted ? (
                                <div style={{ width: 19, height: 19, borderRadius: '6px', background: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Check size={10} strokeWidth={3} />
                                </div>
                            ) : (
                                <div className="empty-circle-container" style={{ width: 19, height: 19, borderRadius: '50%', border: `1px solid ${priority === 4 ? 'rgba(120, 120, 131, 1)' : priorityColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check className="hover-check" size={10} strokeWidth={3} style={{ color: priority === 4 ? '#8e8e93' : priorityColor, opacity: 0 }} />
                                </div>
                            )}
                        </div>

                        <div style={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', minWidth: 0 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, width: '100%', gap: '2px', opacity: 1, transition: 'opacity 0.2s', overflow: 'hidden', textAlign: 'right' }}>
                                <span style={{ fontSize: '16px', fontWeight: 400, textDecoration: 'none', color: isCompleted ? 'var(--text-secondary)' : 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.4', display: 'block' }} dangerouslySetInnerHTML={{ __html: item.content }} />
                                {item.description && (
                                    <div
                                        style={{
                                            fontSize: '13px',
                                            color: 'var(--text-secondary)',
                                            opacity: 0.8,
                                            marginTop: '2px',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            lineHeight: '1.4',
                                            maxWidth: '100%',
                                            textAlign: 'right'
                                        }}
                                    >
                                        {item.description}
                                    </div>
                                )}
                                {(item.target_date || item.repeat_rule || item.projectTitle || totalSubtasks > 0 || item.time || item.reminder_minutes || !isCompleted) && (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexWrap: 'wrap', rowGap: '4px', columnGap: '8px', width: '100%', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            {isCompleted ? (
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    הושלם {completionDateString ? `ב-${completionDateString}` : (item.last_completed_date ? `ב-${new Date(item.last_completed_date).toLocaleDateString('he-IL')}` : '')}
                                                </div>
                                            ) : (
                                                <div ref={dateRef} onClick={(e) => { e.stopPropagation(); setShowDatePicker(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '12px', cursor: 'pointer', color: (item.target_date || item.repeat_rule) ? 'inherit' : 'var(--text-secondary)', opacity: (item.target_date || item.repeat_rule) ? 1 : 0.6 }}>
                                                    { (item.target_date || (item.repeat_rule && item.repeat_rule !== 'none')) ? (
                                                        renderFormattedDate(item.target_date, item.repeat_rule, item.last_completed_date, item.created_at, hideToday, item.time, item.reminder_minutes, false, item.duration, (e) => {
                                                            e.stopPropagation();
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setAnchorRect(rect);
                                                            setShowReminderMenu(!showReminderMenu);
                                                        }, reminderRef)
                                                    ) : (
                                                        <span style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <CalendarIcon size={12} /> הגדר תאריך
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {totalSubtasks > 0 && (
                                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: completedSubtasksCount === totalSubtasks ? 'var(--success-color)' : 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                                                <ListTree size={11} style={{ opacity: 0.8 }} />
                                                <span>{completedSubtasksCount}/{totalSubtasks}</span>
                                            </div>
                                        )}

                                        {item.comments_count > 0 && (
                                            <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontWeight: 600, flexShrink: 0 }}>
                                                <MessageSquare size={11} style={{ opacity: 0.8 }} />
                                                <span>{item.comments_count}</span>
                                            </div>
                                        )}

                                    </div>
                                )}
                                {showDatePicker && (
                                    <DatePickerDropdown
                                        isOpen={showDatePicker}
                                        onClose={() => setShowDatePicker(false)}
                                        anchorRef={dateRef}
                                        selectedDate={item.target_date}
                                        selectedTime={item.time}
                                        onSelectDate={(dateValue) => handleSetTargetDate(item.id, dateValue)}
                                    >
                                        <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowTimeMenu(!showTimeMenu); setShowRepeatMenu(false); }} ref={timeBtnRef} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: item.time ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)', cursor: 'pointer', color: item.time ? 'var(--primary-color)' : 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500, fontFamily: 'inherit' }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                                    {item.time || 'זמן'}
                                                </button>
                                                <TimePickerDropdown
                                                    isOpen={showTimeMenu}
                                                    onClose={() => setShowTimeMenu(false)}
                                                    anchorRef={timeBtnRef}
                                                    initialTime={item.time}
                                                    initialDuration={item.duration}
                                                    timeOptions={TIME_OPTIONS}
                                                    onSave={(timeVal, durVal) => {
                                                        if (handleUpdateItem) handleUpdateItem(item.id, { time: timeVal, duration: durVal });
                                                    }}
                                                />
                                            </div>
                                            <div style={{ position: 'relative' }}>
                                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowRepeatMenu(!showRepeatMenu); setShowTimeMenu(false); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: item.repeat_rule ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)', cursor: 'pointer', color: item.repeat_rule ? 'var(--primary-color)' : 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500, fontFamily: 'inherit' }}>
                                                    <RefreshCw size={15} />
                                                    {item.repeat_rule ? repeatLabels[item.repeat_rule] : 'חזרה'}
                                                </button>
                                                {showRepeatMenu && (
                                                    <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '10px', boxShadow: '0 -6px 24px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 220 }}>
                                                        {repeatOptions.map((opt, i) => (
                                                            <button key={i} onClick={(e) => { e.stopPropagation(); const val = opt.value === 'none' ? null : opt.value; if (handleUpdateItem) handleUpdateItem(item.id, { repeat_rule: val }); setShowRepeatMenu(false); }} style={{ display: 'block', width: '100%', padding: '0.6rem 1rem', border: 'none', background: item.repeat_rule === opt.value ? 'var(--bg-secondary)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.87rem', textAlign: 'right', fontFamily: 'inherit', fontWeight: item.repeat_rule === opt.value ? 600 : 400 }}>{opt.label}</button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </DatePickerDropdown>
                                )}

                                {showReminderMenu && anchorRect && createPortal(
                                    <div ref={reminderMenuRef} style={{ position: 'fixed', zIndex: 20000, background: 'var(--bg-secondary)', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '160px', top: anchorRect.bottom + 6, left: anchorRect.right - 160, overflow: 'hidden', direction: 'rtl' }} onClick={e => e.stopPropagation()}>
                                        {[
                                            { value: null, label: 'ללא תזכורת' },
                                            { value: 0, label: 'בזמן האירוע' },
                                            { value: 5, label: '5 דק׳ לפני' },
                                            { value: 15, label: '15 דק׳ לפני' },
                                            { value: 30, label: '30 דק׳ לפני' },
                                            { value: 60, label: 'שעה לפני' },
                                            { value: 1440, label: 'יום לפני' }
                                        ].map(opt => (
                                            <button key={opt.value} onClick={(e) => { e.stopPropagation(); if (handleUpdateItem) handleUpdateItem(item.id, { reminder_minutes: opt.value }); setShowReminderMenu(false); }} style={{ display: 'block', width: '100%', padding: '0.64rem 1rem', border: 'none', background: item.reminder_minutes === opt.value ? 'var(--dropdown-selected)' : 'transparent', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'right', fontFamily: 'inherit', borderBottom: opt.value !== 1440 ? '1px solid var(--border-color)' : 'none' }} onMouseEnter={(e) => { if (item.reminder_minutes !== opt.value) e.currentTarget.style.background = 'var(--dropdown-hover)'; }} onMouseLeave={(e) => { if (item.reminder_minutes !== opt.value) e.currentTarget.style.background = 'transparent'; }}>{opt.label}</button>
                                        ))}
                                    </div>,
                                    document.body
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {isAddingHere && handleAddItem && !hideAddButton && (
                    <form onSubmit={(e) => { handleAddItem(e, checklistId, item.id, newItemContent); }} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', paddingRight: '1.5rem' }} onClick={e => e.stopPropagation()}>
                        <input type="text" className="form-control" placeholder="הכנס תת-משימה חדשה..." value={newItemContent} onChange={(e) => setNewItemContent(e.target.value)} autoFocus style={{ flexGrow: 1, padding: '0.5rem', fontSize: '0.9rem' }} />
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>הוסף</button>
                    </form>
                )}

                {item.children && item.children.length > 0 && (
                    <div className="subtasks-container" style={{ paddingRight: '0.2rem', marginRight: '0.75rem', marginBottom: '0.25rem', border: 'none' }}>
                        {item.children.map(child => (
                            <SortableTaskItem key={child.id} item={child} checklistId={checklistId} depth={depth + 1} todayProgress={todayProgress} addingToItem={addingToItem} toggleItem={toggleItem} setAddingToItem={setAddingToItem} setAddingToList={setAddingToList} handleAddItem={handleAddItem} handleDeleteItem={handleDeleteItem} newItemContent={newItemContent} setNewItemContent={setNewItemContent} handleSetTargetDate={handleSetTargetDate} handleUpdateItem={handleUpdateItem} allItems={allItems} isCompletedFallback={isCompletedFallback} useProgressArray={useProgressArray} sectionTitle={sectionTitle} projectTitle={projectTitle} isWaterfalling={isWaterfalling} hideAddButton={hideAddButton} isOverlay={isOverlay} compact={compact} hideToday={hideToday} />
                        ))}
                    </div>
                )}
            </div>

            {showEditModal && (
                <TaskEditModal item={editItem} sectionTitle={sectionTitle} projectTitle={projectTitle} allItems={allItems} anchorRect={anchorRect} isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditItem(item); }} isCompleted={useProgressArray && todayProgress ? (todayProgress.find(p => p.checklist_item_id === editItem.id)?.completed === 1) : isCompletedFallback} onToggleComplete={() => { const editItemCompleted = useProgressArray && todayProgress ? (todayProgress.find(p => p.checklist_item_id === editItem.id)?.completed === 1) : isCompletedFallback; toggleItem(editItem.id, editItemCompleted); }} onSave={(updatedFields) => { if (handleUpdateItem) handleUpdateItem(editItem.id, updatedFields); }} onDelete={() => handleDeleteItem({}, editItem.id, checklistId)} onNavigate={(nextItem) => setEditItem(nextItem)} />
            )}
        </>
    );
};

const areEqual = (prevProps, nextProps) => {
    if (prevProps.item.id !== nextProps.item.id) return false;
    if (prevProps.item.content !== nextProps.item.content) return false;
    if (prevProps.item.priority !== nextProps.item.priority) return false;
    if (prevProps.item.target_date !== nextProps.item.target_date) return false;
    if (prevProps.item.time !== nextProps.item.time) return false;
    if (prevProps.item.projectTitle !== nextProps.item.projectTitle) return false;
    if (prevProps.item.checklistTitle !== nextProps.item.checklistTitle) return false;
    if (prevProps.item.repeat_rule !== nextProps.item.repeat_rule) return false;
    if (prevProps.item.reminder_minutes !== nextProps.item.reminder_minutes) return false;
    if (prevProps.item.duration !== nextProps.item.duration) return false;
    if (prevProps.item.description !== nextProps.item.description) return false;
    if (prevProps.item.comments_count !== nextProps.item.comments_count) return false;
    if (prevProps.item.children !== nextProps.item.children) return false;

    const prevCompleted = prevProps.useProgressArray && prevProps.todayProgress ? prevProps.todayProgress.find(p => p.checklist_item_id === prevProps.item.id)?.completed === 1 : prevProps.isCompletedFallback;
    const nextCompleted = nextProps.useProgressArray && nextProps.todayProgress ? nextProps.todayProgress.find(p => p.checklist_item_id === nextProps.item.id)?.completed === 1 : nextProps.isCompletedFallback;
    if (prevCompleted !== nextCompleted) return false;

    if (prevProps.isOverlay !== nextProps.isOverlay) return false;
    if (prevProps.isWaterfalling !== nextProps.isWaterfalling) return false;
    if (prevProps.addingToItem !== nextProps.addingToItem) return false;
    if (prevProps.hideAddButton !== nextProps.hideAddButton) return false;
    if (prevProps.depth !== nextProps.depth) return false;
    if (prevProps.compact !== nextProps.compact) return false;
    if (prevProps.hideToday !== nextProps.hideToday) return false;

    return true;
};

export default memo(SortableTaskItem, areEqual);
