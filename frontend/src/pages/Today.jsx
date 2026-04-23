import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import { CheckCircle2, RotateCcw } from 'lucide-react';
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
import { SortableChecklistCard, EmptyStateDropZone, ListDropSlot, CompletedTaskList } from '../components/TaskComponents/index.jsx';
import DeleteTaskModal from '../components/TaskComponents/DeleteTaskModal.jsx';
import TaskPageLayout from '../components/TaskPageLayout';
import { useTaskDnD, buildHierarchy } from '../hooks/useTaskDnD';
import cache from '../utils/cache';
import PageSkeleton from '../components/PageSkeleton';

const API_URL = '/api';

const Today = () => {
    const { user, authFetch } = useUser();
    const [projectGroups, setProjectGroups] = useState(() => (user && cache.get(`today_tasks_${user.id}`)) || []);
    const [todayProgress, setTodayProgress] = useState(() => (user && cache.get(`today_progress_${user.id}`)) || []);
    const [loading, setLoading] = useState(user ? !cache.get(`today_tasks_${user.id}`) : true);
    const [activePageTab, setActivePageTab] = useState('tasks'); // 'tasks' or 'activity'
    const [expandedChecklists, setExpandedChecklists] = useState(() => {
        try {
            const saved = localStorage.getItem('vee_expanded_checklists');
            const parsed = saved ? JSON.parse(saved) : {};
            // Default both today-unified and today-overdue to true if not already in parsed
            const defaults = {
                'today-unified': true,
                'today-overdue': true
            };
            return { ...defaults, ...parsed };
        } catch (e) {
            return { 'today-unified': true, 'today-overdue': true };
        }
    });
    const [addingToList, setAddingToList] = useState(null);
    const [addingToItem, setAddingToItem] = useState(null);
    const [newItemContent, setNewItemContent] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const [activeDragItem, setActiveDragItem] = useState(null);
    const [addingAtIndex, setAddingAtIndex] = useState(null);
    const [isCreatingList, setIsCreatingList] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const todayDateStr = new Date().toLocaleDateString('en-CA');

    const getFormattedDate = useCallback(() => {
        const d = new Date();
        const dayOfMonth = d.getDate();
        const monthShort = d.toLocaleDateString('he-IL', { month: 'short' }).replace('.', '');
        const dayOfWeek = d.toLocaleDateString('he-IL', { weekday: 'long' });
        return `${dayOfMonth} ${monthShort} ‧ היום ‧ ${dayOfWeek}`;
    }, []);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchTodayTasks = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/users/current/tasks/by-date?date=${todayDateStr}`);
            if (res.ok) {
                const data = await res.json();
                setProjectGroups(data);
                cache.set(`today_tasks_${user.id}`, data);
            }
        } catch (err) {
            console.error('Error fetching today tasks:', err);
        }
    }, [user.id, todayDateStr, authFetch]);

    const fetchTodayProgress = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/users/current/progress?date=${todayDateStr}`);
            if (res.ok) {
                const data = await res.json();
                setTodayProgress(data);
                cache.set(`today_progress_${user.id}`, data);
            }
        } catch (err) {
            console.error('Error fetching today progress:', err);
        }
    }, [user.id, todayDateStr, authFetch]);

    useEffect(() => {
        if (user) {
            // Only show loader if we don't have cached data
            const hasCachedTasks = !!cache.get(`today_tasks_${user.id}`);
            const hasCachedProgress = !!cache.get(`today_progress_${user.id}`);

            if (!hasCachedTasks || !hasCachedProgress) {
                setLoading(true);
            }

            Promise.all([fetchTodayTasks(), fetchTodayProgress()]).finally(() => setLoading(false));
        }
    }, [user, fetchTodayTasks, fetchTodayProgress]);

    useEffect(() => {
        const handleRefresh = () => {
            fetchTodayTasks();
            fetchTodayProgress();
        };
        window.addEventListener('refreshTasks', handleRefresh);
        return () => window.removeEventListener('refreshTasks', handleRefresh);
    }, [fetchTodayTasks, fetchTodayProgress]);

    useEffect(() => {
        const socket = io();
        socket.on('connect', () => {
            // Join a global user room or multiple project rooms
            // For now, simpler to just listen for task updates if they are broadcasted
            socket.on('task_completed', (data) => {
                // If it's today's task, update local progress state
                // Note: The date check might be needed if broadcasting global updates
                setTodayProgress(prev => {
                    const existing = prev.find(p => p.checklist_item_id === data.checklist_item_id);
                    if (existing) {
                        return prev.map(p => p.checklist_item_id === data.checklist_item_id ? { ...p, completed: data.completed ? 1 : 0 } : p);
                    } else {
                        // We assume it's for today if received here or we should check data.date if available
                        return [...prev, { checklist_item_id: data.checklist_item_id, completed: data.completed ? 1 : 0, date: todayDateStr }];
                    }
                });
            });
        });
        return () => socket.disconnect();
    }, [todayDateStr]);

    // FAB integration: open inline AddTaskCard when FAB flies here
    useEffect(() => {
        const handleFabAddTask = () => {
            if (activePageTab === 'activity') return;
            setExpandedChecklists(prev => ({ ...prev, 'today-unified': true }));
            setAddingToList('today-unified');
            setAddingToItem(null);
            setAddingAtIndex(0); // Default to top
            setNewItemContent('');
            // Notify FAB that AddTaskCard has opened
            window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
        };
        window.addEventListener('fabAddTask', handleFabAddTask);
        return () => window.removeEventListener('fabAddTask', handleFabAddTask);
    }, [activePageTab]);

    const toggleItem = async (itemId, currentCompleted) => {
        const newCompleted = !currentCompleted;

        // 1. Optimistic Update Local UI
        const delay = newCompleted ? 400 : 0; // Wait a bit for the completion animation to play
        setTimeout(() => {
            setTodayProgress(prev => {
                const filtered = prev.filter(p => p.checklist_item_id !== itemId);
                return [...filtered, { checklist_item_id: itemId, completed: newCompleted ? 1 : 0, date: todayDateStr }];
            });
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }, delay);

        try {
            // 2. Perform network request
            const res = await authFetch(`${API_URL}/users/current/progress`, {
                method: 'POST',
                body: JSON.stringify({
                    checklist_item_id: itemId,
                    date: todayDateStr,
                    completed: newCompleted
                })
            });

            if (!res.ok) {
                throw new Error('Server returned an error');
            }
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בעדכון המשימה - מתבטל");
            // 3. Revert Optimistic Update on failure
            setTodayProgress(prev => {
                const filtered = prev.filter(p => p.checklist_item_id !== itemId);
                return [...filtered, { checklist_item_id: itemId, completed: currentCompleted ? 1 : 0, date: todayDateStr }];
            });
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const getTargetChecklistObj = useCallback(() => {
        const inboxProj = projectGroups.find(p => p.id === 0 || p.title === 'כללי' || !p.id);
        if (inboxProj && inboxProj.checklists && inboxProj.checklists.length > 0) {
            return inboxProj.checklists[0];
        }
        for (const p of projectGroups) {
            if (p.checklists && p.checklists.length > 0) return p.checklists[0];
        }
        return { id: null, title: '' };
    }, [projectGroups]);

    const getTargetChecklistId = useCallback(() => {
        return getTargetChecklistObj().id;
    }, [getTargetChecklistObj]);

    const handleAddItem = async (e, _checklistId, parentItemId = null, explicitContent = null) => {
        if (e) e.preventDefault();
        // Use the passed _checklistId if available and NOT 'today-unified', otherwise calculate it
        let targetId = _checklistId && _checklistId !== 'today-unified' ? _checklistId : getTargetChecklistId();
        const contentToSave = explicitContent !== null ? explicitContent : newItemContent;
        if (!contentToSave || !contentToSave.trim()) return;

        if (!targetId) {
            try {
                // If it's undefined or the dummy 'inbox' id, fetch the actual inbox ID.
                const clRes = await authFetch(`${API_URL}/users/current/checklists`);
                if (!clRes.ok) throw new Error('Failed to fetch lists');
                const lists = await clRes.json();
                let inbox = lists.find(c => c.project_id === null || !c.project_id);

                if (!inbox) {
                    // Create an inbox checklist if it doesn't exist
                    const createRes = await authFetch(`${API_URL}/users/current/checklists`, {
                        method: 'POST',
                        body: JSON.stringify({
                            title: '',
                            project_id: null,
                            active_days: '0,1,2,3,4,5,6'
                        })
                    });
                    if (!createRes.ok) throw new Error('Failed to auto-create inbox');
                    inbox = await createRes.json();
                }
                targetId = inbox.id;
            } catch (err) {
                console.error('Failed to resolve target list:', err);
                toast.error("לא נמצאה רשימה להוספת המשימה");
                return;
            }
        }

        const timeInput = window.globalNewItemTime || null;
        const durationInput = window.globalNewItemDuration || 15;
        const descriptionInput = window.globalNewItemDescription || null;
        const repeatRuleInput = window.globalNewItemRepeatRule || null;
        const dateInput = window.globalNewItemDate || todayDateStr;

        const priorityInput = window.globalNewItemPriority || 4;
        const reminderMinutesInput = window.globalNewItemReminderMinutes;

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempItem = {
            id: tempId,
            content: contentToSave,
            parent_item_id: parentItemId,
            checklist_id: targetId,
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

        setProjectGroups(prev => prev.map(proj => ({
            ...proj,
            checklists: proj.checklists.map(list => {
                if (list.id === targetId) {
                    const newItems = currentAddingAtIndex === 0
                        ? [tempItem, ...(list.items || [])]
                        : [...(list.items || []), tempItem];
                    return { ...list, items: newItems };
                }
                return list;
            })
        })));

        setNewItemContent('');
        setAddingAtIndex(null);
        window.globalNewItemTime = null;
        window.globalNewItemDuration = 15;
        window.globalNewItemDescription = null;
        window.globalNewItemRepeatRule = null;
        window.globalNewItemDate = null;
        window.globalNewItemPriority = 4;
        window.globalNewItemReminderMinutes = null;

        try {
            const res = await authFetch(`${API_URL}/checklists/${targetId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    content: contentToSave,
                    parent_item_id: parentItemId,
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
                setProjectGroups(prev => prev.map(proj => ({
                    ...proj,
                    checklists: proj.checklists.map(list => ({
                        ...list,
                        items: (list.items || []).map(item => item.id === tempId ? newItem : item)
                    }))
                })));
                // Background refresh to catch up with server state
                fetchTodayTasks();
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                toast.success('משימה 1 נוצרה');
            } else {
                throw new Error('Failed to create item');
            }
        } catch (err) {
            console.error(err);
            // Revert optimistic update
            setProjectGroups(prev => prev.map(proj => ({
                ...proj,
                checklists: proj.checklists.map(list => ({
                    ...list,
                    items: (list.items || []).filter(item => item.id !== tempId)
                }))
            })));
            toast.error("שגיאה בהוספת משימה");
        }
    };

    const handleDeleteItem = async (e, itemId, checklistId) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        
        // Find task name for modal
        let taskName = '';
        projectGroups.some(p => p.checklists.some(c => c.items.some(i => {
            if (i.id === itemId) { taskName = i.content; return true; }
            return false;
        })));

        setItemToDelete({ itemId, checklistId, taskName });
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        const { itemId, checklistId } = itemToDelete;
        setItemToDelete(null);

        // Optimistic Deletion
        setProjectGroups(prev => prev.map(proj => ({
            ...proj,
            checklists: proj.checklists.map(list => ({
                ...list,
                // also optimistically remove any children
                items: (list.items || []).filter(i => i.id !== itemId && i.parent_item_id !== itemId)
            }))
        })));
        window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));

        try {
            const res = await authFetch(`${API_URL}/items/${itemId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("המשימה נמחקה");
            } else {
                throw new Error("Failed to delete");
            }
        } catch (err) {
            console.error(err);
            toast.error("שגיאה במחיקה, מרענן...");
            fetchTodayTasks();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const handleUpdateItem = async (itemId, updates) => {
        // Optimistic deep update
        setProjectGroups(prev => prev.map(proj => ({
            ...proj,
            checklists: proj.checklists.map(list => {
                const mapDeep = (items) => {
                    return items.map(i => {
                        if (i.id === itemId) return { ...i, ...updates, children: i.children ? mapDeep(i.children) : [] };
                        return { ...i, children: i.children ? mapDeep(i.children) : [] };
                    });
                };
                return { ...list, items: mapDeep(list.items || []) };
            })
        })));

        try {
            const res = await authFetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });

            if (res.ok) {
                const updatedItem = await res.json();
                if (updates.checklist_id !== undefined) {
                    fetchTodayTasks();
                    toast.success('המשימה הועברה בהצלחה');
                } else {
                    // Update with server truth
                    setProjectGroups(prev => prev.map(proj => ({
                        ...proj,
                        checklists: proj.checklists.map(list => {
                            const mapDeep = (items) => {
                                return items.map(i => {
                                    if (i.id == itemId) return { ...i, ...updatedItem, children: i.children ? mapDeep(i.children) : [] };
                                    return { ...i, children: i.children ? mapDeep(i.children) : [] };
                                });
                            };
                            return { ...list, items: mapDeep(list.items || []) };
                        })
                    })));
                    toast.success('משימה אחת נערכה');
                }
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            } else {
                throw new Error("Failed to update");
            }
        } catch (err) {
            console.error("Update failed", err);
            toast.error("שגיאה בעדכון המשימה, מרענן...");
            fetchTodayTasks();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const handleSetTargetDate = async (itemId, date) => {
        handleUpdateItem(itemId, { target_date: date ? date.toISOString() : null });
    };

    const toggleChecklistExpanded = (id) => {
        setExpandedChecklists(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            localStorage.setItem('vee_expanded_checklists', JSON.stringify(newState));
            return newState;
        });
    };

    const handleDeleteChecklist = (e, id) => {
        if (e) e.stopPropagation();
        // Today view might not allow deleting checklists directly, but the prop is required
    };

    const handleRescheduleOverdue = async (newDate) => {
        if (!overdueTasks.length) return;
        const itemIds = overdueTasks.map(t => t.id);

        try {
            const res = await authFetch(`${API_URL}/items/bulk/datetime`, {
                method: 'PUT',
                body: JSON.stringify({ itemIds, target_date: newDate })
            });

            if (res.ok) {
                toast.success(`תוזמנו מחדש ${itemIds.length} משימות`);
                fetchTodayTasks();
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            } else {
                throw new Error('Bulk reschedule failed');
            }
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בתזמון משימות מחדש");
        }
    };

    const calculateProgress = useCallback((items) => {
        if (!items || items.length === 0) return 0;
        const total = items.length;
        const completed = items.filter(item => {
            const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
            return p && p.completed === 1;
        }).length;
        return (completed / total) * 100;
    }, [todayProgress]);


    const normalizeDate = (value) => {
        if (!value) return null;
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    };

    const {
        activeDragItem,
        handleDragStart,
        handleDragOver: handleDnDOver,
        handleDragEnd: handleDnDUpdate,
        handleDragCancel
    } = useTaskDnD({
        checklists: projectGroups,
        setChecklists: setProjectGroups,
        API_URL,
        user,
        authFetch,
        fetchData: () => fetchTodayTasks()
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

                setAddingToList(checklistId);
                setAddingAtIndex(index);
                setAddingToItem(null);
                setNewItemContent('');
                window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
            } else {
                // If dropped on "nothing" or its origin, trigger default add behavior
                window.dispatchEvent(new CustomEvent('fabAddTask'));
            }
            return;
        }

        handleDnDUpdate(event);
    };

    const [unfilteredAllTasksFlat, setUnfilteredAllTasksFlat] = useState([]);

    useEffect(() => {
        const flatTasks = projectGroups.flatMap(proj =>
            (proj.checklists || []).flatMap(list =>
                (list.items || [])
                    .filter(item => (item.target_date && normalizeDate(item.target_date) <= todayDateStr) || (item.repeat_rule && item.repeat_rule !== 'none' && !item.target_date))
                    .map(item => ({
                        ...item,
                        projectTitle: proj.title,
                        checklistTitle: list.title,
                        checklist_title: list.title,
                        checklist_id: list.id
                    }))
            )
        );
        setUnfilteredAllTasksFlat(flatTasks);
    }, [projectGroups, todayDateStr]);

    const todayUncompletedTasks = unfilteredAllTasksFlat.filter(item => {
        const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
        return !(p && p.completed === 1);
    });

    const completedTasks = unfilteredAllTasksFlat.filter(item => {
        const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
        return p && p.completed === 1;
    });

    const uncompletedCount = todayUncompletedTasks.length;

    const overdueTasks = todayUncompletedTasks.filter(t => t.target_date && normalizeDate(t.target_date) < todayDateStr);
    const todayTasks = todayUncompletedTasks.filter(t => !overdueTasks.find(ot => ot.id === t.id));

    const totalTasks = unfilteredAllTasksFlat.length;
    const completedTasksCount = todayProgress.filter(p => p.completed === 1).length;
    const remainingTasks = todayUncompletedTasks.length;

    const handleClearTodayCompleted = async () => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק את כל המשימות שהושלמו?")) return;
        try {
            await Promise.all(completedTasks.map(item => authFetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' })));
            toast.success("המשימות שהושלמו נמחקו בהצלחה");
            fetchTodayTasks();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        } catch (err) {
            console.error("Failed to clear completed tasks", err);
            toast.error("שגיאה במחיקת משימות");
        }
    };

    useEffect(() => {
        if (!loading) {
            window.dispatchEvent(new CustomEvent('updatePageTitle', {
                detail: `היום (${todayTasks.length}) ☀️`
            }));
        }
    }, [todayTasks.length, loading]);


    if (loading && projectGroups.length === 0) {
        return (
            <TaskPageLayout title="טוען...">
                <PageSkeleton />
            </TaskPageLayout>
        );
    }


    return (
        <TaskPageLayout
            title="היום"
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
                        היום
                    </h1>
                </div>
            }
            headerActions={null}
            onScroll={setScrollTop}
            externalScrollTop={scrollTop}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            activeDragItem={activeDragItem}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%', paddingBottom: '5rem' }}>
                {overdueTasks.length > 0 && (
                    <div style={{ width: '100%' }}>
                        <SortableChecklistCard
                            checklist={{ id: 'today-overdue', title: 'עבר זמנם', items: overdueTasks }}
                            idx={0}
                            expandedChecklists={expandedChecklists}
                            toggleChecklistExpanded={() => toggleChecklistExpanded('today-overdue')}
                            handleDeleteChecklist={() => { }}
                            todayProgress={todayProgress}
                            sensors={sensors}
                            handleDragEnd={() => { }}
                            activeTab="tasks"
                            addingToList={null}
                            addingToItem={null}
                            toggleItem={toggleItem}
                            setAddingToItem={() => { }}
                            setAddingToList={() => { }}
                            handleAddItem={() => { }}
                            handleDeleteItem={handleDeleteItem}
                            newItemContent=""
                            setNewItemContent={() => { }}
                            handleSetTargetDate={handleSetTargetDate}
                            handleUpdateItem={handleUpdateItem}
                            onSetDate={handleRescheduleOverdue}
                            setDateLabel="תזמן מחדש את הכל"
                            buildHierarchy={buildHierarchy}
                            calculateProgress={calculateProgress}
                            setIsCreatingList={() => { }}
                            defaultItemDate={todayDateStr}
                            hideTaskCount={true}
                            useSharedDndContext={true}
                            useProgressArray={true}
                            hideAddCard={true}
                            activeDragItem={activeDragItem}
                            isSortable={false}
                            hideActionMenu={true}
                            canEditTitle={false}
                        />
                    </div>
                )}

                <div data-fab-target="true" style={{ width: '100%' }}>
                    <SortableContext
                        items={todayTasks.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <SortableChecklistCard
                            checklist={{ id: 'today-unified', title: getFormattedDate(), items: todayTasks }}
                            idx={overdueTasks.length > 0 ? 1 : 0}
                            expandedChecklists={expandedChecklists}
                            toggleChecklistExpanded={() => toggleChecklistExpanded('today-unified')}
                            handleDeleteChecklist={() => { }}
                            todayProgress={todayProgress}
                            sensors={sensors}
                            handleDragEnd={() => { }}
                            activeTab="tasks"
                            addingToList={addingToList}
                            addingToItem={addingToItem}
                            toggleItem={toggleItem}
                            setAddingToItem={setAddingToItem}
                            setAddingToList={setAddingToList}
                            handleAddItem={handleAddItem}
                            handleDeleteItem={handleDeleteItem}
                            newItemContent={newItemContent}
                            setNewItemContent={setNewItemContent}
                            handleSetTargetDate={handleSetTargetDate}
                            handleUpdateItem={handleUpdateItem}
                            buildHierarchy={buildHierarchy}
                            calculateProgress={calculateProgress}
                            setIsCreatingList={() => { }}
                            defaultItemDate={todayDateStr}
                            hideToday={true}
                            hideTaskCount={true}
                            useSharedDndContext={true}
                            useProgressArray={true}
                            overrideChecklistForAdd={getTargetChecklistObj()}
                            activeDragItem={activeDragItem}
                            addingAtIndex={addingAtIndex}
                            isSortable={false}
                            hideToggle={true}
                            hideActionMenu={true}
                            canEditTitle={false}
                        />
                    </SortableContext>
                </div>

                {unfilteredAllTasksFlat.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <EmptyStateDropZone active={activeDragItem?.data?.current?.type === 'FAB'} checklistId="today-unified" />
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem', opacity: 0.6 }}>
                            {activePageTab === 'tasks' ? 'הכל מוכן להיום!' : 'אין משימות שהושלמו להצגה'}
                        </p>
                    </div>
                )}

                {activePageTab === 'tasks' && completedTasks.length > 0 && (
                    <CompletedTaskList
                        completedTasks={completedTasks}
                        uncompletedCount={uncompletedCount}
                        onClearAll={handleClearTodayCompleted}
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
        </TaskPageLayout>
    );
};

export default Today;





