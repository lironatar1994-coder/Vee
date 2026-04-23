import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { Plus, X, CheckCircle2, Layout } from 'lucide-react';
import { toast } from 'sonner';
import {
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { ActionMenu, SortableChecklistCard, EmptyStateDropZone, ListDropSlot, CompletedTaskList } from '../components/TaskComponents/index.jsx';
import DeleteTaskModal from '../components/TaskComponents/DeleteTaskModal.jsx';
import TaskPageLayout from '../components/TaskPageLayout';
import { useTaskDnD, buildHierarchy } from '../hooks/useTaskDnD';
import cache from '../utils/cache';

const API_URL = '/api';

const Inbox = () => {
    const { user, authFetch } = useUser();
    const [checklists, setChecklists] = useState(() => (user && cache.get(`inbox_data_${user.id}`)) || []);
    const [activePageTab, setActivePageTab] = useState('tasks'); // 'tasks' or 'activity'
    const [loading, setLoading] = useState(user ? !cache.get(`inbox_data_${user.id}`) : true);
    const [addingToList, setAddingToList] = useState(null);
    const [addingToItem, setAddingToItem] = useState(null);
    const [newItemContent, setNewItemContent] = useState('');
    const [expandedChecklists, setExpandedChecklists] = useState(() => {
        try {
            const saved = localStorage.getItem('vee_expanded_checklists');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });
    const [todayProgress, setTodayProgress] = useState([]);
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const [itemToDelete, setItemToDelete] = useState(null);

    const selectedDate = new Date().toLocaleDateString('en-CA');

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const [addingAtIndex, setAddingAtIndex] = useState(null);

    const {
        activeDragItem,
        handleDragStart,
        handleDragOver: handleDnDOver,
        handleDragEnd: handleDnDUpdate,
        handleDragCancel
    } = useTaskDnD({
        checklists,
        setChecklists,
        API_URL,
        user,
        authFetch,
        fetchData: () => fetchInbox()
    });

    const handleDragOver = (event) => {
        const { active, over } = event;
        if (active.data.current?.type === 'FAB') return;
        handleDnDOver(event);
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        handleDragCancel();

        if (active.data.current?.type === 'FAB') {
            if (over?.data.current?.type === 'FABSlot') {
                const slotId = over.id.toString(); // slot-checklistId-index
                const raw = slotId.replace('slot-', '');
                const lastDashIndex = raw.lastIndexOf('-');

                const checklistIdStr = raw.substring(0, lastDashIndex);
                const checklistId = isNaN(checklistIdStr) ? checklistIdStr : parseInt(checklistIdStr, 10);
                const index = parseInt(raw.substring(lastDashIndex + 1), 10);

                // `EmptyStateDropZone` uses `checklistId="inbox"` when there are no lists yet.
                // In that case `checklists[0]` is undefined, so we must create the headless inbox list first.
                let targetChecklistId = checklistId === 'inbox' ? checklists[0]?.id : checklistId;
                if (checklistId === 'inbox' && !targetChecklistId) {
                    try {
                        const res = await authFetch(`${API_URL}/users/current/checklists`, {
                            method: 'POST',
                            body: JSON.stringify({
                                title: '',
                                project_id: null,
                                active_days: '0,1,2,3,4,5,6'
                            })
                        });
                        if (!res.ok) throw new Error('Failed to create inbox list');
                        const newList = await res.json();
                        setChecklists([newList]);
                        setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                        targetChecklistId = newList.id;
                    } catch (e) {
                        console.error(e);
                        toast.error("שגיאה ביצירת רשימה");
                        return;
                    }
                }

                if (!targetChecklistId) return;
                setAddingToList(targetChecklistId);
                setAddingAtIndex(index);
                setAddingToItem(null);
                setNewItemContent('');
                window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
            } else if (over?.data.current?.type === 'ListSlot') {
                const slotId = over.id.toString(); // list-slot-index
                const index = parseInt(slotId.replace('list-slot-', ''), 10);

                setIsCreatingList(index === 0 ? true : checklists[index - 1]?.id);
            } else {
                // If dropped on "nothing", trigger default behavior
                window.dispatchEvent(new CustomEvent('fabAddTask'));
            }
            return;
        }

        if ((active.data.current?.type === 'Task' || active.data.current?.type === 'ChecklistItem') && over?.data.current?.type === 'ListSlot') {
            const slotId = over.id.toString(); // list-slot-index
            const index = parseInt(slotId.replace('list-slot-', ''), 10);

            setIsCreatingList(index === 0 ? true : checklists[index - 1]?.id);
            return;
        }

        handleDnDUpdate(event);
    };

    const activeChecklists = checklists.filter(c => !c.parent_id);

    useEffect(() => {
        if (user?.id) {
            fetchInbox();
        }
    }, [user?.id]);

    useEffect(() => {
        const handleRefresh = () => fetchInbox();
        window.addEventListener('refreshTasks', handleRefresh);
        return () => window.removeEventListener('refreshTasks', handleRefresh);
    }, [user?.id]);

    // FAB integration: open inline AddTaskCard in the default (first headless) list
    useEffect(() => {
        const handleFabAddTask = async () => {
            if (activePageTab === 'activity') return;
            // Find the headless list (empty title = default inbox list)
            let targetList = checklists.find(c => c.title === '');
            if (!targetList && checklists.length > 0) targetList = checklists[0];

            if (!targetList) {
                // Create inbox list if none exists, then open it
                try {
                    const res = await authFetch(`${API_URL}/users/current/checklists`, {
                        method: 'POST',
                        body: JSON.stringify({ title: '', project_id: null, active_days: '0,1,2,3,4,5,6' })
                    });
                    if (res.ok) {
                        const newList = await res.json();
                        setChecklists([newList]);
                        setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                        setAddingToList(newList.id);
                        setAddingAtIndex(null);
                        window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
                    }
                } catch (e) { console.error(e); }
                return;
            }

            setExpandedChecklists(prev => ({ ...prev, [targetList.id]: true }));
            setAddingToList(targetList.id);
            setAddingToItem(null);
            setAddingAtIndex(0); // Default to top
            setNewItemContent('');
            window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
        };
        window.addEventListener('fabAddTask', handleFabAddTask);
        return () => window.removeEventListener('fabAddTask', handleFabAddTask);
    }, [checklists, activePageTab, user?.id]);
    
    const handleChecklistTitleChange = useCallback((checklistId, newTitle) => {
        setChecklists(prev => prev.map(c => 
            c.id === checklistId ? { ...c, title: newTitle } : c
        ));
    }, []);

    const fetchInbox = useCallback(async () => {
        if (!cache.get(`inbox_data_${user.id}`)) {
            setLoading(true);
        }
        try {
            const [inboxRes, progressRes] = await Promise.all([
                authFetch(`${API_URL}/users/current/inbox`),
                authFetch(`${API_URL}/users/current/progress?date=${selectedDate}`)
            ]);

            if (inboxRes.ok) {
                const data = await inboxRes.json();
                // Normalize: if a checklist is named 'תיבת המשימות', make it headless (empty title)
                const normalizedData = data.map(c => c.title === 'תיבת המשימות' ? { ...c, title: '' } : c);
                // Sort: Headless lists (title === '') come first
                const sortedData = [...normalizedData].sort((a, b) => {
                    if (a.title === '' && b.title !== '') return -1;
                    if (a.title !== '' && b.title === '') return 1;
                    return 0;
                });
                setChecklists(sortedData);
                cache.set(`inbox_data_${user.id}`, sortedData);

                // Expand all by default for Inbox if not already saved
                setExpandedChecklists(prev => {
                    const expandMap = { ...prev };
                    normalizedData.forEach(c => {
                        if (expandMap[c.id] === undefined) {
                            expandMap[c.id] = true;
                        }
                    });
                    return expandMap;
                });
            }

            if (progressRes.ok) {
                const data = await progressRes.json();
                setTodayProgress(data);
            }
        } catch (err) {
            console.error("Failed to fetch inbox:", err);
            toast.error("שגיאה בטעינת תיבת המשימות");
        } finally {
            setLoading(false);
        }
    }, [user?.id, selectedDate]);

    const handleAddItem = useCallback(async (e, _checklistId, parentId = null, explicitContent = null) => {
        if (e) e.preventDefault();
        const contentToSave = explicitContent !== null ? explicitContent : newItemContent;
        if (!contentToSave || !contentToSave.trim()) return;
        
        const dateInput = window.globalNewItemDate || null;
        const timeInput = window.globalNewItemTime || null;
        const durationInput = window.globalNewItemDuration || 15;
        const descriptionInput = window.globalNewItemDescription || null;
        const repeatRuleInput = window.globalNewItemRepeatRule || null;
        const reminderMinutesInput = window.globalNewItemReminderMinutes;
        const priorityInput = window.globalNewItemPriority || 4;

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempItem = {
            id: tempId,
            content: contentToSave,
            parent_item_id: parentId,
            checklist_id: _checklistId,
            target_date: dateInput,
            time: timeInput,
            duration: durationInput,
            priority: priorityInput,
            reminder_minutes: reminderMinutesInput,
            description: descriptionInput,
            repeat_rule: repeatRuleInput,
            is_temp: true
        };

        const currentAddingAtIndex = addingAtIndex;

        setChecklists(prev => {
            const exists = prev.some(c => c.id === _checklistId);
            if (exists) {
                return prev.map(c => {
                    if (c.id === _checklistId) {
                        const newItems = currentAddingAtIndex === 0
                            ? [tempItem, ...(c.items || [])]
                            : [...(c.items || []), tempItem];
                        return { ...c, items: newItems };
                    }
                    return c;
                });
            }
            return prev;
        });

        setNewItemContent('');
        setAddingAtIndex(null);
        window.globalNewItemDate = null;
        window.globalNewItemTime = null;
        window.globalNewItemDuration = 15;
        window.globalNewItemDescription = null;
        window.globalNewItemRepeatRule = null;
        window.globalNewItemPriority = 4;
        window.globalNewItemReminderMinutes = null;

        try {
            const res = await authFetch(`${API_URL}/checklists/${_checklistId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    content: contentToSave,
                    parent_item_id: parentId,
                    target_date: dateInput,
                    time: timeInput,
                    duration: durationInput,
                    priority: priorityInput,
                    reminder_minutes: reminderMinutesInput,
                    description: descriptionInput,
                    repeat_rule: repeatRuleInput,
                    prepend: currentAddingAtIndex === 0
                })
            });
            if (res.ok) {
                const newItem = await res.json();
                setChecklists(prev => prev.map(c => ({
                    ...c,
                    items: (c.items || []).map(item => item.id === tempId ? newItem : item)
                })));
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                toast.success('משימה 1 נוצרה');
            } else {
                throw new Error('Failed to create item');
            }
        } catch (err) {
            console.error(err);
            setChecklists(prev => prev.map(c => ({
                ...c,
                items: (c.items || []).filter(item => item.id !== tempId)
            })));
            toast.error("שגיאה בהוספת משימה");
        }
    }, [newItemContent, addingAtIndex]);

    const handleDeleteItem = useCallback(async (e, itemId, checklistId) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        
        let taskName = '';
        checklists.some(c => {
            if (c.id === checklistId) {
                c.items?.some(i => {
                    if (i.id === itemId) { taskName = i.content; return true; }
                    return false;
                });
                return true;
            }
            return false;
        });

        setItemToDelete({ itemId, checklistId, taskName });
    }, [checklists]);

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        const { itemId, checklistId } = itemToDelete;
        setItemToDelete(null);

        // Optimistic Deletion
        setChecklists(prev => prev.map(c => {
            if (c.id === checklistId) {
                return { ...c, items: (c.items || []).filter(i => i.id !== itemId) };
            }
            return c;
        }));

        // Optimistic Sidebar Update
        window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));

        try {
            const res = await authFetch(`${API_URL}/checklist_items/${itemId}`, { method: 'DELETE' });
            if (!res.ok) {
                throw new Error('Failed to delete');
            }
        } catch (err) {
            console.error(err);
            toast.error("שגיאה במחיקה, מרענן נתונים...");
            fetchInbox();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const toggleItem = useCallback(async (itemId, isCompleted) => {
        const newStatus = !isCompleted;

        try {
            if (!newStatus) {
                setTodayProgress(prev => {
                    const existing = prev.find(p => p.checklist_item_id === itemId);
                    if (existing) {
                        return prev.map(p => p.checklist_item_id === itemId ? { ...p, completed: 0 } : p);
                    }
                    return prev;
                });
            }

            const res = await authFetch(`${API_URL}/users/current/progress`, {
                method: 'POST',
                body: JSON.stringify({ checklist_item_id: itemId, date: selectedDate, completed: newStatus })
            });

            if (res.ok) {
                const delay = newStatus ? 400 : 0;
                setTimeout(() => {
                    setTodayProgress(prev => {
                        const filtered = prev.filter(p => p.checklist_item_id !== itemId);
                        return [...filtered, { checklist_item_id: itemId, user_id: user.id, date: selectedDate, completed: newStatus ? 1 : 0 }];
                    });
                    window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                }, delay);
            } else {
                throw new Error("Failed to update");
            }
        } catch (err) {
            fetchInbox();
            toast.error("שגיאה בעדכון משימה");
        }
    }, [user?.id, selectedDate, fetchInbox]);

    const handleUpdateItem = useCallback(async (itemId, updates) => {
        // Optimistic update with deep mapping for nested items
        setChecklists(prev => prev.map(c => {
            const mapDeep = (items) => {
                return items.map(i => {
                    if (i.id === itemId) {
                        return { ...i, ...updates, children: i.children ? mapDeep(i.children) : [] };
                    }
                    return { ...i, children: i.children ? mapDeep(i.children) : [] };
                });
            };
            return { ...c, items: mapDeep(c.items || []) };
        }));

        try {
            const res = await authFetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const updatedItem = await res.json();
                if (updates.checklist_id !== undefined) {
                    fetchInbox();
                    toast.success('המשימה הועברה בהצלחה');
                } else {
                    // Update with actual server response just in case
                    setChecklists(prev => prev.map(c => {
                        const mapDeep = (items) => {
                            return items.map(i => {
                                if (i.id == itemId) {
                                    return { ...i, ...updatedItem, children: i.children ? mapDeep(i.children) : [] };
                                }
                                return { ...i, children: i.children ? mapDeep(i.children) : [] };
                            });
                        };
                        return { ...c, items: mapDeep(c.items || []) };
                    }));
                    toast.success('משימה אחת נערכה');
                }
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            } else {
                throw new Error("Failed to update");
            }
        } catch (err) {
            console.error('Failed to update item', err);
            toast.error('שגיאה בעדכון המשימה, מרענן...');
            fetchInbox();
        }
    }, [fetchInbox]);

    const handleDeleteChecklist = useCallback(async (e, checklistId) => {
        if (e) e.stopPropagation();
        if (!window.confirm("האם למחוק את הרשימה?")) return;
        try {
            const res = await authFetch(`${API_URL}/checklists/${checklistId}`, { method: 'DELETE' });
            if (res.ok) {
                setChecklists(prev => prev.filter(c => c.id !== checklistId));
                toast.success("הרשימה נמחקה");
            }
        } catch (err) {
            toast.error("שגיאה במחיקת הרשימה");
        }
    }, []);

    const handleCreateCustomList = useCallback(async (e) => {
        if (e) e.preventDefault();
        if (!newListTitle.trim()) return;

        try {
            const res = await authFetch(`${API_URL}/users/current/checklists`, {
                method: 'POST',
                body: JSON.stringify({
                    title: newListTitle,
                    active_days: '0,1,2,3,4,5,6',
                    project_id: null
                })
            });
            if (res.ok) {
                const newList = await res.json();
                setChecklists(prev => [...prev, newList]);
                setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                setNewListTitle('');
                setIsCreatingList(false);
                toast.success("קבוצה חדשה נוצרה");
            }
        } catch (err) {
            toast.error("שגיאה ביצירת קבוצה");
        }
    }, [user?.id, newListTitle]);

    const toggleChecklistExpanded = useCallback((id) => {
        setExpandedChecklists(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            localStorage.setItem('vee_expanded_checklists', JSON.stringify(newState));
            return newState;
        });
    }, []);

    const handleGlobalAddTask = useCallback(async () => {
        const emptyList = checklists.find(c => c.title === '');
        if (emptyList) {
            setExpandedChecklists(prev => ({ ...prev, [emptyList.id]: true }));
            setAddingToList(emptyList.id);
            return;
        }

        try {
            const res = await authFetch(`${API_URL}/users/current/checklists`, {
                method: 'POST',
                body: JSON.stringify({
                    title: '',
                    project_id: null,
                    active_days: '0,1,2,3,4,5,6'
                })
            });
            if (res.ok) {
                const newList = await res.json();
                setChecklists([newList, ...checklists]);
                setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                setAddingToList(newList.id);
            }
        } catch (e) {
            console.error(e);
            toast.error("שגיאה ביצירת רשימה");
        }
    }, [user?.id, checklists]);


    const calculateProgress = useCallback((items) => {
        if (!items || items.length === 0) return 0;
        const total = items.length;
        const completed = items.filter(item => {
            const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
            return p && p.completed === 1;
        }).length;
        return (completed / total) * 100;
    }, [todayProgress]);

    const handleSetTargetDate = useCallback(async (itemId, date) => {
        handleUpdateItem(itemId, { target_date: date || null });
    }, [handleUpdateItem]);

    const totalInboxItems = useMemo(() => checklists.reduce((acc, c) => acc + (c.items ? c.items.length : 0), 0), [checklists]);

    const activeChecklistItemsForCount = activeChecklists.map(c => ({
        ...c,
        items: (c.items || []).filter(item => {
            const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
            return !(p && p.completed === 1);
        })
    }));

    const uncompletedCount = activeChecklistItemsForCount.reduce((acc, c) => acc + c.items.length, 0);

    const completedTasks = activePageTab === 'tasks' ? activeChecklists
        .flatMap(c => (c.items || [])
            .map(item => ({ ...item, checklist_title: c.title || 'תיבת המשימות', checklist_id: c.id, projectTitle: 'תיבת המשימות' }))
            .filter(item => {
                const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
                return p && p.completed === 1;
            })
        ) : [];

    const handleClearInboxCompleted = async () => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק את כל המשימות שהושלמו?")) return;
        try {
            await Promise.all(completedTasks.map(item => authFetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' })));
            toast.success("המשימות שהושלמו נמחקו בהצלחה");
            fetchInbox();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        } catch (err) {
            console.error("Failed to clear completed tasks", err);
            toast.error("שגיאה במחיקת משימות");
        }
    };


    useEffect(() => {
        if (!loading) {
            window.dispatchEvent(new CustomEvent('updatePageTitle', {
                detail: `תיבת המשימות (${totalInboxItems}) 📥`
            }));
        }
    }, [totalInboxItems, loading]);

    if (loading) return null;

    return (
        <TaskPageLayout
            title="תיבת המשימות"
            onCompletedToggle={() => setActivePageTab(activePageTab === 'tasks' ? 'activity' : 'tasks')}
            isCompletedActive={activePageTab === 'activity'}
            titleContent={
                <div style={{
                    transition: 'all 0.35s ease',
                    opacity: Math.max(0, 1 - Math.max(0, scrollTop) / 60),
                    transform: `translateY(${Math.max(0, scrollTop) * 0.15}px)`
                }}>
                    <h1
                        style={{
                            margin: 0,
                            fontSize: '28px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.5px',
                            display: 'inline-block'
                        }}
                    >
                        תיבת המשימות
                    </h1>
                </div>
            }
            headerActions={<div />}

            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            activeDragItem={activeDragItem}
            externalScrollTop={scrollTop}
            onScroll={setScrollTop}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', paddingBottom: '5rem' }}>
                {checklists.length === 0 ? (
                    <div style={{ padding: '0.5rem 0' }}>
                        <EmptyStateDropZone active={activeDragItem?.data?.current?.type === 'FAB'} checklistId="inbox" />
                        <ListDropSlot id="list-slot-0" activeType={activeDragItem?.data?.current?.type} />

                        {isCreatingList === true && (
                            <form 
                                className="add-section-form glass-morphism" 
                                onSubmit={handleCreateCustomList}
                                style={{
                                    padding: '1rem',
                                    marginBottom: '1rem',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid rgba(var(--primary-rgb), 0.15)',
                                    background: 'rgba(255, 255, 255, 0.6)',
                                    backdropFilter: 'blur(12px)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    boxShadow: '0 10px 30px -10px rgba(var(--primary-rgb), 0.1)',
                                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Layout size={18} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                                    <input
                                        type="text"
                                        className="add-section-input"
                                        placeholder="שם הרשימה... (לדוגמה: פרוייקט חדש)"
                                        value={newListTitle}
                                        onChange={(e) => setNewListTitle(e.target.value)}
                                        autoFocus
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '1rem',
                                            fontWeight: '600',
                                            color: 'var(--text-primary)',
                                            outline: 'none',
                                            width: '100%',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <div className="add-section-actions" style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary" 
                                        disabled={!newListTitle.trim()}
                                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '10px' }}
                                    >
                                        הוסף רשימה
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-soft" 
                                        onClick={() => { setIsCreatingList(false); setNewListTitle(''); }}
                                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '10px' }}
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                ) : (
                    <SortableContext
                        items={activeChecklists.map(c => `checklist-${c.id}`)}
                        strategy={verticalListSortingStrategy}
                    >
                        {activeChecklists.map((list, listIndex) => {
                            const filteredItems = (list.items || []).filter(item => {
                                const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
                                const isCompleted = p && p.completed === 1;
                                return activePageTab === 'tasks' ? !isCompleted : isCompleted;
                            });

                            if (activePageTab === 'activity' && filteredItems.length === 0) return null;

                            const listWithFilteredItems = { ...list, items: filteredItems };

                            return (
                                <React.Fragment key={list.id}>
                                    <ListDropSlot
                                        id={`list-slot-${listIndex}`}
                                        activeType={activeDragItem?.data?.current?.type}
                                        isLastSlot={false}
                                    />
                                    <div data-fab-target={listIndex === 0 ? 'true' : undefined}>
                                        <SortableChecklistCard
                                            key={list.id}
                                            checklist={listWithFilteredItems}
                                            expanded={expandedChecklists[list.id]}
                                            onToggleExpand={() => toggleChecklistExpanded(list.id)}
                                            onAddItem={(e, listId, parentId = null, content = null) => handleAddItem(e, listId, parentId, content)}
                                            onDeleteItem={handleDeleteItem}
                                            onUpdateItem={handleUpdateItem}
                                            onToggleItem={toggleItem}
                                            addingToList={addingToList}
                                            setAddingToList={setAddingToList}
                                            addingToItem={addingToItem}
                                            setAddingToItem={setAddingToItem}
                                            newItemContent={newItemContent}
                                            setNewItemContent={setNewItemContent}
                                            showDeleteHeader={true}
                                            onDeleteChecklist={(e) => handleDeleteChecklist(e, list.id)}
                                            onTitleChange={handleChecklistTitleChange}
                                            API_URL={API_URL}
                                            todayProgress={todayProgress}
                                            isInbox={true}
                                            useSharedDndContext={true}
                                            buildHierarchy={buildHierarchy}
                                            calculateProgress={calculateProgress}
                                            setIsCreatingList={setIsCreatingList}
                                            useProgressArray={true}
                                            projectTitle="תיבת המשימות"
                                            activeDragItem={activeDragItem}
                                            addingAtIndex={addingAtIndex}
                                        />
                                    </div>
                                    {isCreatingList === list.id && activePageTab === 'tasks' && (
                                        <form 
                                            className="add-section-form glass-morphism" 
                                            onSubmit={handleCreateCustomList}
                                            style={{
                                                padding: '1rem',
                                                margin: '0.5rem 0 1.5rem 0',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px solid rgba(var(--primary-rgb), 0.15)',
                                                background: 'rgba(255, 255, 255, 0.6)',
                                                backdropFilter: 'blur(12px)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.75rem',
                                                boxShadow: '0 10px 30px -10px rgba(var(--primary-rgb), 0.1)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Layout size={18} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                                                <input
                                                    type="text"
                                                    className="add-section-input"
                                                    placeholder="שם הרשימה... (לדוגמה: פרוייקט חדש)"
                                                    value={newListTitle}
                                                    onChange={(e) => setNewListTitle(e.target.value)}
                                                    autoFocus
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        fontSize: '1rem',
                                                        fontWeight: '600',
                                                        color: 'var(--text-primary)',
                                                        outline: 'none',
                                                        width: '100%',
                                                        fontFamily: 'inherit'
                                                    }}
                                                />
                                            </div>
                                            <div className="add-section-actions" style={{ display: 'flex', gap: '8px' }}>
                                                <button 
                                                    type="submit" 
                                                    className="btn btn-primary" 
                                                    disabled={!newListTitle.trim()}
                                                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '10px' }}
                                                >
                                                    הוסף רשימה
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-soft" 
                                                    onClick={() => { setIsCreatingList(null); setNewListTitle(''); }}
                                                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem', borderRadius: '10px' }}
                                                >
                                                    ביטול
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        <ListDropSlot
                            id={`list-slot-${activeChecklists.length}`}
                            activeType={activeDragItem?.data?.current?.type}
                        />
                    </SortableContext>
                )}
                <ListDropSlot
                    id={`list-slot-${activeChecklists.length}`}
                    activeType={activeDragItem?.data?.current?.type}
                    isLastSlot={true}
                />

                {activePageTab === 'tasks' && completedTasks.length > 0 && (
                    <CompletedTaskList
                        completedTasks={completedTasks}
                        uncompletedCount={uncompletedCount}
                        onClearAll={handleClearInboxCompleted}
                        todayProgress={todayProgress}
                    />
                )}
            </div>

            <DeleteTaskModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDeleteItem}
                taskName={itemToDelete?.taskName}
            />
        </TaskPageLayout >
    );
};

export default Inbox;


