import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import {
    X, ChevronUp, ChevronDown, ChevronLeft, MoreHorizontal,
    Calendar as CalendarIcon, Tag, MapPin,
    Flag, Plus, Trash2, CheckCircle, Circle, RefreshCw, Check,
    Home, List, MessageSquare, Paperclip, CheckSquare, Bell, Inbox, Folder, Send, Layout
} from 'lucide-react';
import DatePickerDropdown from './DatePickerDropdown';
import TimePickerDropdown from './TimePickerDropdown';
import SmartInput from './SmartInput';
import { renderFormattedDate, TIME_OPTIONS, repeatOptions, repeatLabels, getFullDateDisplay, getDateDisplayInfo } from './TaskComponents/index.jsx';
import ProjectSelectorDropdown from './TaskComponents/ProjectSelectorDropdown';
import ActionMenu from './TaskComponents/ActionMenu';
import SortableTaskItem from './TaskComponents/SortableTaskItem';
import AddTaskCard from './TaskComponents/AddTaskCard';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { toast } from 'sonner';

export default function TaskEditModal({
    item,
    projectTitle = '',
    sectionTitle = '',
    allItems = [],
    anchorRect = null,
    isOpen,
    onClose,
    onSave,
    onDelete,
    onNavigate,
    isCompleted = false,
    onToggleComplete,
    onAddSubtask,
}) {
    const { user } = useUser();
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [time, setTime] = useState(item.time || '');
    const [showTimeMenu, setShowTimeMenu] = useState(false);
    const [showSubtasks, setShowSubtasks] = useState(true);

    // For real-time saving of text fields
    const lastSavedContent = useRef(item.content);
    const lastSavedDescription = useRef(item.description || '');
    const saveTimeoutRef = useRef(null);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, []);
    const [repeatRule, setRepeatRule] = useState(item?.repeat_rule || null);
    const [showRepeatMenu, setShowRepeatMenu] = useState(false);
    const [content, setContent] = useState(item?.content || '');
    const [description, setDescription] = useState(item?.description || '');
    const [targetDate, setTargetDate] = useState(item?.target_date || '');
    const [isEditing, setIsEditing] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [priority, setPriority] = useState(item?.priority || 4);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState(item?.reminder_minutes ?? null);
    const [showReminderMenu, setShowReminderMenu] = useState(false);

    // Comments State
    const [itemComments, setItemComments] = useState([]);
    const [newCommentText, setNewCommentText] = useState('');
    const [subtasks, setSubtasks] = useState(item?.children || []);
    const [newSubtaskText, setNewSubtaskText] = useState('');
    const [addingSubtask, setAddingSubtask] = useState(false);
    const [loadingComments, setLoadingComments] = useState(false);
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const commentsEndRef = useRef(null);

    const dateBtnRef = useRef(null);
    const timeBtnRef = useRef(null);
    const moreMenuRef = useRef(null);
    const projectBtnRef = useRef(null);
    const priorityBtnRef = useRef(null);
    const contentRef = useRef(null);
    const panelRef = useRef(null);

    const prevItemIdRef = useRef(null);

    // Sync state from incoming item
    useEffect(() => {
        if (item && isOpen) {
            const isSameItem = prevItemIdRef.current === item.id;

            // Resetting UI state for a new task
            if (!isSameItem) {
                setContent(item.content || '');
                setDescription(item.description || '');
                setTargetDate(item.target_date || '');
                setTime(item.time || '');
                setRepeatRule(item.repeat_rule || null);
                setPriority(item.priority || 4);
                setReminderMinutes(item.reminder_minutes ?? null);
                setSubtasks(item.children || []);

                lastSavedContent.current = item.content || '';
                lastSavedDescription.current = item.description || '';

                setIsEditing(false);
                setShowMoreMenu(false);
                setShowDatePicker(false);
                setShowRepeatMenu(false);
                setShowProjectSelector(false);
                setShowPriorityMenu(false);
                setShowReminderMenu(false);
                setNewSubtaskText('');
                fetchTaskComments(item.id);
                prevItemIdRef.current = item.id;
            } else {
                // If it's the same task, only update fields that are NOT being edited
                // This allows the parent to update things (like priority) while modal stays open
                if (!isEditing) {
                    setContent(item.content || '');
                    lastSavedContent.current = item.content || '';
                    setDescription(item.description || '');
                    lastSavedDescription.current = item.description || '';
                }
                setTargetDate(item.target_date || '');
                setTime(item.time || '');
                setRepeatRule(item.repeat_rule || null);
                setPriority(item.priority || 4);
                setReminderMinutes(item.reminder_minutes ?? null);
            }
        } else if (!isOpen) {
            // When closing, reset editing flag to ensure fresh sync next time
            setIsEditing(false);
            prevItemIdRef.current = null;
        }
    }, [item, isOpen, isEditing]);

    const fetchTaskComments = async (itemId) => {
        setLoadingComments(true);
        try {
            const res = await fetch(`/api/checklist-items/${itemId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setItemComments(data);
            }
        } catch (err) {
            console.error('Failed to fetch task comments', err);
        } finally {
            setLoadingComments(false);
        }
    };

    const handlePostComment = async () => {
        if (!newCommentText.trim()) return;
        try {
            const res = await fetch(`/api/checklist-items/${item.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    content: newCommentText.trim()
                })
            });
            if (res.ok) {
                const comment = await res.json();
                setItemComments(prev => [...prev, comment]);
                setNewCommentText('');
                setTimeout(scrollToBottom, 50);
            }
        } catch (err) {
            console.error('Failed to post comment', err);
            toast.error('שגיאה בשליחת התגובה');
        }
    };

    const handleDeleteComment = async (commentId) => {
        try {
            const res = await fetch(`/api/checklist-item-comments/${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setItemComments(prev => prev.filter(c => c.id !== commentId));
                toast.success('התגובה נמחקה');
            }
        } catch (err) {
            console.error('Failed to delete comment', err);
            toast.error('שגיאה במחיקת התגובה');
        }
    };

    const handleUpdateComment = async (commentId) => {
        if (!editCommentText.trim()) return;
        try {
            const res = await fetch(`/api/checklist-item-comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editCommentText.trim() })
            });
            if (res.ok) {
                const updated = await res.json();
                setItemComments(prev => prev.map(c => c.id === commentId ? updated : c));
                setEditingCommentId(null);
                setEditCommentText('');
                toast.success('התגובה עודכנה');
            }
        } catch (err) {
            console.error('Failed to update comment', err);
            toast.error('שגיאה בעדכון התגובה');
        }
    };

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleSubtaskDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = subtasks.findIndex((s) => `subtask-${s.id}` === active.id);
        const newIndex = subtasks.findIndex((s) => `subtask-${s.id}` === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const newSubtasks = arrayMove(subtasks, oldIndex, newIndex);
        setSubtasks(newSubtasks);

        const itemIds = newSubtasks.map((s) => s.id);
        try {
            await fetch(`/api/items/reorder`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds })
            });
            window.dispatchEvent(new CustomEvent('refreshTasks'));
        } catch (err) {
            console.error('Failed to reorder subtasks', err);
        }
    };

    const handleCreateSubtask = async (e, checklistId, projectId, content) => {
        if (e) e.preventDefault();
        try {
            const res = await fetch(`/api/checklists/${item.checklist_id}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content,
                    parent_item_id: item.id,
                    priority: window.globalNewItemPriority || 4,
                    target_date: window.globalNewItemDate || null,
                    time: window.globalNewItemTime || null,
                    reminder_minutes: window.globalNewItemReminderMinutes,
                    repeat_rule: window.globalNewItemRepeatRule || null
                })
            });
            if (res.ok) {
                const subtask = await res.json();
                setSubtasks(prev => [...prev, subtask]);
                setAddingSubtask(false);
                setNewSubtaskText('');
                window.dispatchEvent(new CustomEvent('refreshTasks'));
            }
        } catch (err) {
            console.error('Failed to add subtask', err);
            toast.error('שגיאה בהוספת תת-משימה');
        }
    };

    const handleToggleSubtask = async (subId, checklistId, completed) => {
        try {
            const res = await fetch(`/api/items/${subId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed })
            });
            if (res.ok) {
                setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, completed } : s));
                if (completed && window.navigator?.vibrate) window.navigator.vibrate(10);
                window.dispatchEvent(new CustomEvent('refreshTasks'));
            }
        } catch (err) {
            console.error('Failed to toggle subtask', err);
        }
    };

    const handleDeleteSubtask = async (subId) => {
        try {
            const res = await fetch(`/api/items/${subId}`, { method: 'DELETE' });
            if (res.ok) {
                setSubtasks(prev => prev.filter(s => s.id !== subId));
                window.dispatchEvent(new CustomEvent('refreshTasks'));
                toast.success('תת-משימה נמחקה');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateSubtask = async (subId, updates) => {
        try {
            const res = await fetch(`/api/items/${subId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                setSubtasks(prev => prev.map(s => s.id === subId ? { ...s, ...updates } : s));
                window.dispatchEvent(new CustomEvent('refreshTasks'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Click-outside to close
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                // If clicking outside, try to save if we're currently editing
                if (isEditing) {
                    handleSave();
                }
                onClose();
            }
        };
        if (isOpen) {
            setTimeout(() => document.addEventListener('mousedown', handler), 10);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen, onClose, isEditing, content, description, targetDate, time, repeatRule, priority, reminderMinutes]); // Re-bind if save dependencies change

    if (!isOpen || !item) return null;

    // ---- Prev / Next navigation ----
    const currentIdx = allItems.findIndex(i => i.id === item.id);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx !== -1 && currentIdx < allItems.length - 1;
    const goToPrev = () => { if (hasPrev && onNavigate) onNavigate(allItems[currentIdx - 1]); };
    const goToNext = () => { if (hasNext && onNavigate) onNavigate(allItems[currentIdx + 1]); };

    const handleSave = (isAutomatic = false) => {
        const plainText = typeof content === 'string' ? content.replace(/<[^>]*>?/gm, '').trim() : '';

        const hasContentChanged = plainText !== lastSavedContent.current;
        const hasDescriptionChanged = description !== lastSavedDescription.current;

        if (hasContentChanged || hasDescriptionChanged) {
            if (onSave) {
                onSave({
                    content: plainText,
                    description,
                    target_date: targetDate || null,
                    time: time || null,
                    repeat_rule: repeatRule || null,
                    priority: priority,
                    reminder_minutes: reminderMinutes
                });
            }
            lastSavedContent.current = plainText;
            lastSavedDescription.current = description;
        }

        if (!isAutomatic) {
            setIsEditing(false);
        }
    };

    // Debounced save for text fields
    useEffect(() => {
        // Skip first render
        if (content === item.content && description === (item.description || '')) return;

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(() => {
            handleSave(true);
        }, 1500); // 1.5s debounce for typing

        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [content, description]);

    const handleDateSelect = (dateStr) => {
        setTargetDate(dateStr);
        setShowDatePicker(false);
        if (onSave) onSave({
            target_date: dateStr || null,
        });
    };

    const handleDelete = () => {
        setShowMoreMenu(false);
        onClose();
        if (onDelete) onDelete();
    };

    // Card modal positioning (centered on desktop, drawer on bottom for mobile)
    const isDesktop = window.innerWidth > 768;
    const panelStyle = {
        position: 'fixed',
        top: 0,
        left: isDesktop ? '50%' : 0,
        right: isDesktop ? 'auto' : 0,
        bottom: 0,
        transform: isDesktop ? 'translateX(-50%)' : 'none',
        width: isDesktop ? '650px' : '100%',
        height: '100dvh',
        background: 'var(--bg-color)',
        borderRadius: 0,
        zIndex: 9999,
        boxShadow: isDesktop ? '0 0 50px rgba(0,0,0,0.15)' : 'none',
        animation: isDesktop ? 'fadeIn 0.15s ease-out' : 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        overflowY: 'auto',
        direction: 'rtl',
        display: 'flex',
        flexDirection: 'column',
    };

    // ---- Helpers ----
    const headerLabel = [
        projectTitle || 'תיבת המשימות',
        (sectionTitle &&
            sectionTitle !== projectTitle &&
            sectionTitle !== 'כללי' &&
            sectionTitle !== 'תיבת המשימות' &&
            !sectionTitle.toString().includes('‧ היום ‧')) ? sectionTitle : ''
    ].filter(Boolean).join(' / ');

    const isInboxInHeader = !projectTitle || projectTitle === 'כללי' || projectTitle === 'תיבת המשימות';
    const HeaderIcon = isInboxInHeader ? Inbox : Folder;

    // Format full date (e.g., 21 עבר 2025) or relative (היום, מחר)
    const { text: formattedDateString } = getFullDateDisplay(targetDate, repeatRule, time);

    const navBtn = (active) => ({
        border: 'none', background: 'transparent', padding: '6px',
        cursor: active ? 'pointer' : 'not-allowed',
        color: active ? 'var(--text-secondary)' : 'var(--border-color)',
        display: 'flex', opacity: active ? 1 : 0.4, transition: 'opacity 0.15s',
        borderRadius: '4px'
    });

    const actionRowStyle = {
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.8rem 1.25rem',
        color: 'var(--text-secondary)',
        fontSize: '0.95rem',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        backgroundImage: `linear-gradient(to left, transparent 0, transparent 3.1rem, rgba(128,128,128,0.15) 3.1rem, rgba(128,128,128,0.15) calc(100% - 1.5rem), transparent calc(100% - 1.5rem), transparent 100%)`,
        backgroundPosition: 'bottom',
        backgroundSize: '100% 1px',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        textAlign: 'right',
        fontFamily: 'inherit',
        transition: 'background 0.15s'
    };

    const panel = (
        <>
            {/* Backdrop */}
            <div style={{ position: 'fixed', inset: 0, zIndex: 9997, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />

            {/* Modal Panel */}
            <div ref={panelRef} style={panelStyle} className="hide-scrollbar">

                {/* Header Navbar */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)',
                    position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 10,
                }}>
                    {/* Left side in RTL (Breadcrumbs) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 1, minWidth: 0 }}>
                        <HeaderIcon size={16} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                        <span style={{
                            fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500,
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                            {headerLabel}
                        </span>
                    </div>

                    {/* Right side in RTL (Actions) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', flexShrink: 0 }}>
                        <button onClick={goToNext} disabled={!hasNext} style={navBtn(hasNext)} title="משימה הבאה בדפדוף הפוך RTL"><ChevronUp size={20} /></button>
                        <button onClick={goToPrev} disabled={!hasPrev} style={navBtn(hasPrev)} title="משימה קודמת בדפדוף הפוך RTL"><ChevronDown size={20} /></button>

                        <div style={{ position: 'relative' }} ref={moreMenuRef}>
                            <button onClick={() => setShowMoreMenu(!showMoreMenu)} style={{ ...navBtn(true), color: 'var(--text-secondary)' }}>
                                <MoreHorizontal size={20} />
                            </button>
                            {showMoreMenu && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, marginTop: '0.5rem',
                                    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                    borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                                    zIndex: 100, minWidth: '150px', overflow: 'hidden'
                                }}>
                                    <button onClick={handleDelete} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                                        padding: '0.7rem 1rem', border: 'none', background: 'transparent',
                                        color: 'var(--danger-color)', cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit'
                                    }}>
                                        <Trash2 size={16} /> מחק משימה
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ width: '4px' }} />
                        <button onClick={onClose} style={{ border: 'none', background: 'transparent', padding: '6px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Task Title & Description Area */}
                <div style={{ paddingTop: '1rem', paddingLeft: '1rem', paddingRight: '1rem', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        {/* Check Circle - Now Priority Aware */}
                        <div
                            onClick={(e) => { e.stopPropagation(); if (onToggleComplete) onToggleComplete(); }}
                            style={{
                                marginTop: '4px', cursor: 'pointer', flexShrink: 0,
                                width: 24, height: 24, borderRadius: '50%',
                                // Professional UI: Border is more saturated, fill is softer
                                border: isCompleted ? 'none' : `2px solid ${priority === 1 ? 'var(--priority-1)' :
                                    priority === 2 ? 'var(--priority-2)' :
                                        priority === 3 ? 'var(--priority-3)' : 'var(--primary-color)'
                                    }`,
                                background: isCompleted ? 'var(--primary-color)' : (
                                    priority !== 4 ? `rgba(${priority === 1 ? '209, 69, 59' :
                                        priority === 2 ? '235, 137, 9' :
                                            '36, 111, 224'
                                        }, 0.12)` : 'transparent'
                                ),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                boxShadow: !isCompleted && priority !== 4 ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}
                        >
                            {isCompleted && <Check size={14} strokeWidth={3} color="white" />}
                        </div>

                        {/* Text Content */}
                        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                            <input
                                type="text"
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                onFocus={() => setIsEditing(true)}
                                onBlur={() => handleSave()}
                                onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); handleSave(); } }}
                                placeholder="שם משימה"
                                style={{
                                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                                    fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)',
                                    fontFamily: 'inherit', textDecoration: isCompleted ? 'line-through' : 'none',
                                    opacity: isCompleted ? 0.6 : 1, padding: 0, marginBottom: '0.5rem'
                                }}
                            />

                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                onFocus={() => setIsEditing(true)}
                                onBlur={() => handleSave()}
                                placeholder="≡ תיאור..."
                                rows={2}
                                style={{
                                    width: '100%', border: 'none', outline: 'none', resize: 'none',
                                    fontSize: '0.95rem', background: 'transparent',
                                    color: 'var(--text-secondary)', fontFamily: 'inherit',
                                    padding: 0, lineHeight: 1.5
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Attributes List */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>

                    {/* Project Label */}
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={projectBtnRef}
                            onClick={() => setShowProjectSelector(!showProjectSelector)}
                            style={actionRowStyle}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Layout size={18} />
                            <span>{headerLabel || 'תיבת המשימות'}</span>
                        </button>
                    </div>

                    <ProjectSelectorDropdown
                        isOpen={showProjectSelector}
                        onClose={() => setShowProjectSelector(false)}
                        anchorRef={projectBtnRef}
                        selectedChecklistId={item.checklist_id}
                        onSelect={(checklist, _project) => {
                            if (checklist && checklist.id !== item.checklist_id) {
                                if (onSave) onSave({ checklist_id: checklist.id });
                            }
                        }}
                    />

                    {/* Due Date & Repeat Row */}
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={dateBtnRef}
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            style={{
                                ...actionRowStyle,
                                borderBottom: 'none',
                                color: targetDate ? 'var(--primary-color)' : 'var(--text-secondary)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <CalendarIcon size={18} />
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                                <span>{formattedDateString}</span>
                                {item.last_completed_date && (
                                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7, marginTop: '2px' }}>
                                        הושלם לאחרונה: {getDateDisplayInfo(item.last_completed_date).text}
                                    </span>
                                )}
                            </div>
                            {repeatRule && <RefreshCw size={14} style={{ marginRight: '0.5rem' }} />}
                        </button>
                    </div>

                    <DatePickerDropdown
                        isOpen={showDatePicker}
                        onClose={() => setShowDatePicker(false)}
                        anchorRef={dateBtnRef}
                        selectedDate={targetDate}
                        selectedTime={time}
                        onSelectDate={handleDateSelect}
                    >
                        <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            <div style={{ position: 'relative' }}>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setShowTimeMenu(!showTimeMenu); setShowRepeatMenu(false); }}
                                    ref={timeBtnRef}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)',
                                        borderRadius: '8px', background: time ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)',
                                        cursor: 'pointer', color: time ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        fontSize: '0.88rem', fontWeight: 500, fontFamily: 'inherit'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = time ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)'}
                                >
                                    <AlarmClock size={15} />
                                    {time || 'זמן'}
                                </button>

                                <TimePickerDropdown
                                    isOpen={showTimeMenu}
                                    onClose={() => setShowTimeMenu(false)}
                                    anchorRef={timeBtnRef}
                                    initialTime={time}
                                    timeOptions={TIME_OPTIONS}
                                    onSave={(val) => {
                                        setTime(val);
                                        if (onSave) onSave({ time: val });
                                    }}
                                />
                            </div>

                            <div style={{ position: 'relative' }}>
                                <button type="button" onClick={() => { setShowRepeatMenu(!showRepeatMenu); setShowTimeMenu(false); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)',
                                        borderRadius: '8px', background: repeatRule ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)',
                                        cursor: 'pointer', color: repeatRule ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        fontSize: '0.88rem', fontWeight: 500, fontFamily: 'inherit'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.background = repeatRule ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)'}
                                >
                                    <RefreshCw size={15} />
                                    {repeatRule ? repeatLabels[repeatRule] : 'חזרה'}
                                </button>

                                {showRepeatMenu && (
                                    <div style={{
                                        position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                                        background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                        borderRadius: '10px', boxShadow: '0 -6px 24px rgba(0,0,0,0.12)',
                                        overflow: 'hidden', zIndex: 220,
                                    }}>
                                        {repeatOptions.map((opt, i) => (
                                            <button key={i} onClick={() => {
                                                const val = opt.value === 'none' ? null : opt.value;
                                                setRepeatRule(val);
                                                setShowRepeatMenu(false);
                                                if (onSave) onSave({ content, description, target_date: targetDate || null, time, repeat_rule: val });
                                            }}
                                                style={{
                                                    display: 'block', width: '100%', padding: '0.6rem 1rem', border: 'none',
                                                    background: repeatRule === opt.value ? 'var(--bg-secondary)' : 'transparent',
                                                    cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.87rem',
                                                    textAlign: 'right', fontFamily: 'inherit', fontWeight: repeatRule === opt.value ? 600 : 400
                                                }}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DatePickerDropdown>

                    <div style={{ height: '1px', backgroundImage: `linear-gradient(to left, transparent 0, transparent 3.1rem, rgba(128,128,128,0.15) 3.1rem, rgba(128,128,128,0.15) calc(100% - 1.5rem), transparent calc(100% - 1.5rem), transparent 100%)`, margin: '0' }} />

                    {/* Stub attributes matching design */}
                    <button style={actionRowStyle}><AlarmClock size={18} /><span>תאריך יעד סופי</span></button>

                    {/* Priority Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            ref={priorityBtnRef}
                            onClick={() => setShowPriorityMenu(!showPriorityMenu)}
                            style={{
                                ...actionRowStyle,
                                color: priority === 1 ? 'var(--priority-1)' : priority === 2 ? 'var(--priority-2)' : priority === 3 ? 'var(--priority-3)' : 'var(--text-secondary)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Flag size={18} fill={priority !== 4 ? (priority === 1 ? 'var(--priority-1)' : priority === 2 ? 'var(--priority-2)' : 'var(--priority-3)') : 'transparent'} />
                            <span>
                                {priority === 1 ? 'עדיפות 1 (גבוהה ביותר)' : priority === 2 ? 'עדיפות 2' : priority === 3 ? 'עדיפות 3' : 'עדיפות 4 (רגילה)'}
                            </span>
                        </button>

                        {showPriorityMenu && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% - 4px)', left: '1.25rem', right: '1.25rem',
                                background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                overflow: 'hidden', zIndex: 1000, display: 'flex', flexDirection: 'column'
                            }}>
                                {[
                                    { level: 1, label: 'עדיפות 1', color: 'var(--priority-1)' },
                                    { level: 2, label: 'עדיפות 2', color: 'var(--priority-2)' },
                                    { level: 3, label: 'עדיפות 3', color: 'var(--priority-3)' },
                                    { level: 4, label: 'עדיפות 4', color: 'var(--text-secondary)' }
                                ].map(p => (
                                    <button
                                        key={p.level}
                                        onClick={() => {
                                            setPriority(p.level);
                                            setShowPriorityMenu(false);
                                            if (onSave) onSave({ priority: p.level });
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            width: '100%', padding: '0.75rem 1rem', border: 'none',
                                            background: priority === p.level ? 'var(--dropdown-selected)' : 'transparent',
                                            cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                                            borderBottom: p.level !== 4 ? '1px solid var(--border-color)' : 'none',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (priority !== p.level) e.currentTarget.style.background = 'var(--dropdown-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (priority !== p.level) e.currentTarget.style.background = 'transparent';
                                            else e.currentTarget.style.background = 'var(--dropdown-selected)';
                                        }}
                                    >
                                        <Flag size={16} style={{ color: p.color }} fill={p.level !== 4 ? p.color : 'transparent'} />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: priority === p.level ? 600 : 400 }}>{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Reminder Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowReminderMenu(!showReminderMenu)}
                            style={{
                                ...actionRowStyle,
                                color: reminderMinutes !== null ? 'var(--reminder-color)' : 'var(--text-secondary)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <Bell size={18} />
                            <span>
                                {reminderMinutes === null ? 'תזכורות' : (
                                    reminderMinutes === 0 ? 'בזמן האירוע' :
                                        reminderMinutes === 5 ? '5 דקות לפני' :
                                            reminderMinutes === 15 ? '15 דקות לפני' :
                                                reminderMinutes === 30 ? '30 דקות לפני' :
                                                    reminderMinutes === 60 ? 'שעה לפני' :
                                                        reminderMinutes === 1440 ? 'יום לפני' : 'תזכורת פעילה'
                                )}
                            </span>
                        </button>

                        {showReminderMenu && (
                            <div style={{
                                position: 'absolute', top: 'calc(100% - 4px)', left: '1.25rem', right: '1.25rem',
                                background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                                borderRadius: '8px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                overflow: 'hidden', zIndex: 1000, display: 'flex', flexDirection: 'column'
                            }}>
                                {[
                                    { value: null, label: 'ללא תזכורת' },
                                    { value: 0, label: 'בזמן האירוע' },
                                    { value: 5, label: '5 דקות לפני' },
                                    { value: 15, label: '15 דקות לפני' },
                                    { value: 30, label: '30 דקות לפני' },
                                    { value: 60, label: 'שעה לפני' },
                                    { value: 1440, label: 'יום לפני' }
                                ].map(opt => (
                                    <button
                                        key={opt.value === null ? 'null' : opt.value}
                                        onClick={() => {
                                            setReminderMinutes(opt.value);
                                            setShowReminderMenu(false);
                                            if (onSave) onSave({ reminder_minutes: opt.value });
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            width: '100%', padding: '0.75rem 1rem', border: 'none',
                                            background: reminderMinutes === opt.value ? 'var(--dropdown-selected)' : 'transparent',
                                            cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                                            borderBottom: opt.value !== 1440 ? '1px solid var(--border-color)' : 'none',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'var(--dropdown-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'transparent';
                                            else e.currentTarget.style.background = 'var(--dropdown-selected)';
                                        }}
                                    >
                                        <Bell size={16} style={{ color: reminderMinutes === opt.value ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
                                        <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: reminderMinutes === opt.value ? 600 : 400 }}>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <button style={actionRowStyle} onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><Tag size={18} /><span>תוויות</span></button>
                    <button style={actionRowStyle} onMouseEnter={e => e.currentTarget.style.background = 'var(--dropdown-hover)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}><MapPin size={18} /><span>מיקום</span></button>

                    {/* Solid Block Separator Before Sub-tasks */}
                    <div style={{ height: '10px', width: '100%', background: 'var(--text-secondary)' }} />

                    {/* Sub-tasks Section */}
                    <div style={{ padding: '0.5rem 1.25rem' }}>
                        <div
                            onClick={() => setShowSubtasks(!showSubtasks)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', userSelect: 'none' }}
                        >
                            <div style={{ marginRight: '-5px', display: 'flex', alignItems: 'center' }}>
                                {showSubtasks ? (
                                    <ChevronDown size={18} style={{ color: 'var(--text-secondary)' }} />
                                ) : (
                                    <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
                                )}
                            </div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>תת-משימות</span>
                            {subtasks.length > 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400, opacity: 0.7 }}>({subtasks.length})</span>}
                        </div>

                        {showSubtasks && (
                            <>
                                {subtasks.length > 0 && (
                                    <div style={{ marginBottom: addingSubtask ? '0.5rem' : '1rem' }}>
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSubtaskDragEnd}>
                                            <SortableContext items={subtasks.map(s => `subtask-${s.id}`)} strategy={verticalListSortingStrategy}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {subtasks.map((sub, index) => (
                                                        <SortableTaskItem
                                                            key={sub.id}
                                                            item={sub}
                                                            idx={index}
                                                            idPrefix="subtask-"
                                                            checklist={{ id: item.checklist_id }}
                                                            toggleItem={(subId) => handleToggleSubtask(subId, item.checklist_id, !sub.completed)}
                                                            deleteItem={handleDeleteSubtask}
                                                            onUpdateItem={handleUpdateSubtask}
                                                            isFlatList={true}
                                                        />
                                                    ))}
                                                </div>
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                )}

                                {addingSubtask ? (
                                    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                                        <AddTaskCard
                                            newItemContent={newSubtaskText}
                                            setNewItemContent={setNewSubtaskText}
                                            checklist={{ id: item.checklist_id }}
                                            defaultProject={null}
                                            setAddingToList={() => setAddingSubtask(false)}
                                            handleAddItem={handleCreateSubtask}
                                            suppressDateSpan={true}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setAddingSubtask(true)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                                            padding: '0.4rem 0', background: 'transparent',
                                            border: 'none', color: 'var(--text-secondary)',
                                            cursor: 'pointer', fontSize: '0.9rem',
                                            fontFamily: 'inherit',
                                            transition: 'color 0.2s',
                                            opacity: 0.8
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.opacity = '1'; }}
                                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0.8'; }}
                                    >
                                        <Plus size={16} /> התחל להקליד תת-משימה...
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                </div>

                {/* Solid Block Separator Before Comments */}
                <div style={{ height: '10px', width: '100%', background: 'var(--text-secondary)' }} />

                {/* Footer Comments Area */}
                {/* Task Comments Section - Now Functional */}
                <div style={{
                    padding: '1rem 1.25rem 0.5rem 1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <MessageSquare size={16} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>תגובות</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '0.2rem'
                    }} className="hide-scrollbar">
                        {loadingComments ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>טוען תגובות...</div>
                        ) : itemComments.length === 0 ? (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', opacity: 0.6 }}>אין תגובות עדיין. היה הראשון לתמוך!</div>
                        ) : (
                            itemComments.map(comment => (
                                <div key={comment.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                    <div style={{
                                        width: 28, height: 28, borderRadius: '50%',
                                        background: comment.user_id === user?.id ? 'var(--primary-color)' : '#94a3b8',
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.7rem', flexShrink: 0, overflow: 'hidden'
                                    }}>
                                        {comment.profile_image ? (
                                            <img src={`/api${comment.profile_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            comment.username ? comment.username.charAt(0).toUpperCase() : '?'
                                        )}
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '0.5rem 0.75rem',
                                        flexGrow: 1,
                                        fontSize: '0.88rem',
                                        color: 'var(--text-primary)',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{comment.username}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(comment.created_at).toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            {comment.user_id === user?.id && (
                                                <ActionMenu
                                                    onDelete={() => handleDeleteComment(comment.id)}
                                                    onEdit={() => {
                                                        setEditingCommentId(comment.id);
                                                        setEditCommentText(comment.content);
                                                    }}
                                                    label="אפשרויות לתגובה"
                                                />
                                            )}
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                <textarea
                                                    value={editCommentText}
                                                    onChange={e => setEditCommentText(e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        background: 'transparent',
                                                        border: '1px solid var(--primary-color)',
                                                        borderRadius: '6px',
                                                        padding: '0.4rem',
                                                        fontSize: '0.88rem',
                                                        color: 'var(--text-primary)',
                                                        minHeight: '60px',
                                                        resize: 'none',
                                                        outline: 'none',
                                                        fontFamily: 'inherit'
                                                    }}
                                                    autoFocus
                                                />
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => setEditingCommentId(null)}
                                                        style={{
                                                            padding: '2px 8px', fontSize: '11px',
                                                            background: 'transparent', border: 'none',
                                                            color: 'var(--text-secondary)', cursor: 'pointer'
                                                        }}
                                                    >
                                                        ביטול
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateComment(comment.id)}
                                                        style={{
                                                            padding: '2px 8px', fontSize: '11px',
                                                            background: 'var(--primary-color)', border: 'none',
                                                            color: 'white', borderRadius: '4px', cursor: 'pointer'
                                                        }}
                                                    >
                                                        שמור
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            comment.content
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>
                </div>

                {/* Footer / Comment Box */}
                <div style={{
                    padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-color)', position: 'sticky', bottom: 0,
                    borderRadius: isDesktop ? '0 0 12px 12px' : 0
                }}>
                    {item?.created_at && (
                        <div style={{
                            fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6,
                            marginBottom: '0.75rem', paddingRight: '0.2rem', direction: 'rtl'
                        }}>
                            נוצר ב: {new Date(item.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                    )}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                        borderRadius: '24px', padding: '0.35rem 0.5rem 0.35rem 1rem',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                    }}
                        onFocus={e => e.currentTarget.style.borderColor = 'var(--primary-color)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                        {/* Current User Avatar */}
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%', background: 'var(--primary-color)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', flexShrink: 0, overflow: 'hidden'
                        }}>
                            {user?.profile_image ? (
                                <img src={`/api${user.profile_image}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : 'אני'}
                        </div>

                        <input
                            type="text"
                            value={newCommentText}
                            onChange={e => setNewCommentText(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && newCommentText.trim()) {
                                    handlePostComment();
                                }
                            }}
                            placeholder="הוסף תגובה..."
                            style={{
                                border: 'none', background: 'transparent', outline: 'none',
                                flexGrow: 1, fontSize: '0.9rem', color: 'var(--text-primary)',
                                fontFamily: 'inherit'
                            }}
                        />

                        <button
                            onClick={handlePostComment}
                            disabled={!newCommentText.trim()}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                color: newCommentText.trim() ? 'var(--primary-color)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                transition: 'color 0.2s'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>

            </div>
        </>
    );

    return createPortal(panel, document.body);
}

// Simple internal icon for Hashes if we don't import one
const HashIcon = ({ size, style }) => (
    <svg width={size} height={size} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="9" x2="20" y2="9"></line>
        <line x1="4" y1="15" x2="20" y2="15"></line>
        <line x1="10" y1="3" x2="8" y2="21"></line>
        <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
);
