import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useOutletContext, useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { CheckCircle, Circle, Trash2, HelpCircle, ArrowRight, Store, Plus, ChevronRight, ChevronDown, X, Calendar as CalendarIcon, List as ListIcon, GripVertical, MoreVertical, MoreHorizontal, Users, UserPlus, Search, Copy, Edit3, Save, Home, Filter, MessageSquare, Send, Clock, Layout } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ProjectCalendar from '../components/ProjectCalendar';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
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
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const API_URL = '/api';

import ProjectActionMenu from '../components/ProjectComponents/ProjectActionMenu';
import DeleteTaskModal from '../components/TaskComponents/DeleteTaskModal.jsx';
import TaskPageLayout from '../components/TaskPageLayout';
import ProjectSettingsModal from '../components/ProjectComponents/ProjectSettingsModal';
import { ActionMenu, SortableChecklistCard, EmptyStateDropZone, ListDropSlot, CompletedTaskList } from '../components/TaskComponents/index.jsx';
import { useTaskDnD } from '../hooks/useTaskDnD';
import ProjectComments from '../components/ProjectComments';
import ProjectTeamModal from '../components/ProjectTeamModal';
import cache from '../utils/cache';
import PageSkeleton from '../components/PageSkeleton';

const Project = () => {
    const { projectId } = useParams();
    const location = useLocation();
    const { user } = useUser();
    const { theme } = useTheme();
    const navigate = useNavigate();

    const [project, setProject] = useState(() => cache.get(`project_data_${projectId}`)?.project || null);
    const [checklists, setChecklists] = useState(() => cache.get(`project_data_${projectId}`)?.checklists || []);
    const [todayProgress, setTodayProgress] = useState([]);
    const [loading, setLoading] = useState(!cache.get(`project_data_${projectId}`));

    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListTitle, setNewListTitle] = useState('');
    const [newItemContent, setNewItemContent] = useState('');
    const [addingToItem, setAddingToItem] = useState(null); // ID of parent item to add subtask to
    const [addingToList, setAddingToList] = useState(null); // ID of checklist to add main task to
    const [addingAtIndex, setAddingAtIndex] = useState(null);
    const [activePageTab, setActivePageTab] = useState('tasks'); // 'tasks' or 'activity'

    const [expandedChecklists, setExpandedChecklists] = useState(() => {
        try {
            const saved = localStorage.getItem('vee_expanded_checklists');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    });

    // Magic Reveal States
    const [magicRevealing, setMagicRevealing] = useState(location.state?.magicReveal || false);
    const [isWaterfalling, setIsWaterfalling] = useState(false);
    const [visibleChecklistIds, setVisibleChecklistIds] = useState(new Set());
    const [visibleTaskIds, setVisibleTaskIds] = useState(new Set());

    // New Feature States
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'history'
    const [showSettings, setShowSettings] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Team & Socket state
    const [projectMembers, setProjectMembers] = useState([]);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [showProjectMenu, setShowProjectMenu] = useState(false);
    const projectMenuRef = React.useRef(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [tempDescription, setTempDescription] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const scrollContainerRef = useRef(null);
    const { isSidebarOpen } = useOutletContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Comments State
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState(() => cache.get(`project_data_${projectId}`)?.comments || []);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-CA');
    const weekDaysHebrew = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    const [selectedDate, setSelectedDate] = useState(dateStr);
    const selectedDayOfWeek = new Date(selectedDate).getDay().toString();

    // Headers removed from here

    useEffect(() => {
        if (user && projectId) {
            const cached = cache.get(`project_data_${projectId}`);
            if (!cached) {
                setLoading(true);
            } else {
                setProject(cached.project);
                setChecklists(cached.checklists);
                setComments(cached.comments || []);
            }
            fetchProjectData();
            fetchProjectMembers();
        }
    }, [user, projectId]);

    useEffect(() => {
        if (!projectId) return;

        const newSocket = io();

        newSocket.on('connect', () => {
            newSocket.emit('join_project', projectId);
        });

        newSocket.on('task_completed', (data) => {
            // real-time sync wrapper
            setTodayProgress(prev => {
                const currentFiltered = prev.filter(p => p.checklist_item_id !== data.checklist_item_id);
                if (data.completed) {
                    return [...currentFiltered, {
                        ...data,
                        user_id: data.userId
                    }];
                } else {
                    return currentFiltered;
                }
            });
            if (data.userId !== user?.id) {
                if (data.completed) toast.success(`המשימה סומנה כהושלמה ע"י ${data.username}`, { position: 'top-center' });
            }
        });

        newSocket.on('new_comment', (data) => {
            if (data.comment.user_id !== user?.id) {
                setComments(prev => {
                    const exists = prev.some(c => c.id === data.comment.id);
                    if (exists) return prev;
                    const newComments = [...prev, data.comment];
                    // Also update cache
                    const cached = cache.get(`project_data_${projectId}`);
                    if (cached) {
                        cache.set(`project_data_${projectId}`, { ...cached, comments: newComments });
                    }
                    return newComments;
                });
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [projectId, user]);

    useEffect(() => {
        if (user && projectId && selectedDate) {
            fetchProgressForDate(selectedDate);
        }
    }, [user, projectId, selectedDate]);

    // Fetch comments silently when overlay opens to keep data fresh
    useEffect(() => {
        if (showComments && projectId) {
            fetchComments(true); // true = silent fetch
        }
    }, [showComments, projectId]);

    // Handle Magic Reveal Sequence
    useEffect(() => {
        // Cleaning up history state if it was a magic reveal
        if (location.state?.magicReveal) {
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const startWaterfall = async (listsToRevealRaw = null) => {
        setIsWaterfalling(true);
        const listsToReveal = listsToRevealRaw || checklists;
        await new Promise(r => setTimeout(r, 100)); // Wait for DOM render after scope change
        const scrollContainer = document.querySelector('.page-content');

        const smoothScroll = () => {
            if (scrollContainer) {
                requestAnimationFrame(() => {
                    scrollContainer.scrollTo({
                        top: scrollContainer.scrollHeight,
                        behavior: 'smooth'
                    });
                });
            }
        };

        for (const list of listsToReveal) {
            setVisibleChecklistIds(prev => new Set([...prev, list.id]));
            setTimeout(smoothScroll, 50);
            await new Promise(r => setTimeout(r, 120));

            if (list.items && list.items.length > 0) {
                for (const item of list.items) {
                    setVisibleTaskIds(prev => new Set([...prev, item.id]));
                    setTimeout(smoothScroll, 50);
                    await new Promise(r => setTimeout(r, 100));
                }
            }
        }

        setIsWaterfalling(false);
    };

    const fetchComments = async (silent = false) => {
        if (!silent || comments.length === 0) {
            setLoadingComments(true);
        }
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/comments`);
            if (res.ok) {
                const data = await res.json();
                setComments(data);
                // Also update cache if project data is already there
                const cached = cache.get(`project_data_${projectId}`);
                if (cached) {
                    cache.set(`project_data_${projectId}`, { ...cached, comments: data });
                }
            }
        } catch (err) {
            console.error('Failed to fetch comments', err);
        } finally {
            setLoadingComments(false);
        }
    };

    const handlePostComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    content: newComment.trim()
                })
            });

            if (res.ok) {
                const comment = await res.json();
                setComments(prev => {
                    const newComments = [...prev, comment];
                    // Update cache
                    const cached = cache.get(`project_data_${projectId}`);
                    if (cached) {
                        cache.set(`project_data_${projectId}`, { ...cached, comments: newComments });
                    }
                    return newComments;
                });
                setNewComment('');
            } else {
                toast.error('שגיאה בשליחת התגובה');
            }
        } catch (err) {
            console.error('Failed to post comment', err);
            toast.error('שגיאה בשליחת התגובה');
        }
    };


    useEffect(() => {
        const handleRefresh = () => fetchProjectData();
        window.addEventListener('refreshTasks', handleRefresh);
        return () => window.removeEventListener('refreshTasks', handleRefresh);
    }, [projectId, user?.id]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (projectMenuRef.current && !projectMenuRef.current.contains(e.target)) {
                setShowProjectMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchProjectData = async () => {
        setLoading(true);
        try {
            const projectsRes = await fetch(`${API_URL}/users/${user.id}/projects`);
            const projectsData = await projectsRes.json();
            const currentProj = projectsData.find(p => p.id === parseInt(projectId));
            setProject(currentProj);

            if (currentProj) {
                setTempDescription(currentProj.description || '');

                // Interactive Title: Update Browser title with project name
                window.dispatchEvent(new CustomEvent('updatePageTitle', { detail: currentProj.title }));
            }

            const checklistsRes = await fetch(`${API_URL}/projects/${projectId}/checklists`);
            const listsData = await checklistsRes.json();
            setChecklists(listsData);

            // Pre-fetch comments as well so they are ready
            const commentsRes = await fetch(`${API_URL}/projects/${projectId}/comments`);
            const commentsData = await commentsRes.json();
            setComments(commentsData);

            // Initialize expanded state for all lists, merging with saved states
            const initExpanded = { ...expandedChecklists };
            listsData.forEach(list => {
                if (initExpanded[list.id] === undefined) {
                    initExpanded[list.id] = true;
                }
            });
            setExpandedChecklists(initExpanded);

            if (magicRevealing) {
                setTimeout(() => startWaterfall(listsData), 100);
            }

            // Save to cache including comments now
            cache.set(`project_data_${projectId}`, { 
                project: currentProj, 
                checklists: listsData,
                comments: commentsData
            });

        } catch (err) {
            console.error('Error fetching project data:', err);
        }
        setLoading(false);
    };

    const fetchProgressForDate = async (dateStr) => {
        try {
            const progressRes = await fetch(`${API_URL}/projects/${projectId}/progress/${dateStr}`);
            const progressData = await progressRes.json();
            setTodayProgress(progressData);
        } catch (err) {
            console.error('Error fetching project progress:', err);
        }
    };

    const handleTitleClick = () => {
        setIsEditingTitle(true);
        setTempTitle(project.title);
    };

    const handleTitleSave = async () => {
        if (tempTitle.trim() === '' || tempTitle === project.title) {
            setIsEditingTitle(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: tempTitle })
            });
            if (res.ok) {
                setProject({ ...project, title: tempTitle });
                window.dispatchEvent(new CustomEvent('updatePageTitle', { detail: tempTitle }));
            }
        } catch (err) {
            console.error('Failed to update title', err);
        } finally {
            setIsEditingTitle(false);
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') handleTitleSave();
        if (e.key === 'Escape') {
            setIsEditingTitle(false);
            setTempTitle(project.title);
        }
    };
    
    const handleDescriptionSave = async () => {
        if (tempDescription === (project.description || '')) {
            setIsEditingDescription(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: tempDescription.trim() })
            });
            if (res.ok) {
                setProject({ ...project, description: tempDescription.trim() });
                toast.success('התיאור עודכן בהצלחה');
            }
        } catch (err) {
            console.error('Failed to update description', err);
            toast.error('שגיאה בעדכון התיאור');
        } finally {
            setIsEditingDescription(false);
        }
    };

    const handleDescriptionKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleDescriptionSave();
        }
        if (e.key === 'Escape') {
            setIsEditingDescription(false);
            setTempDescription(project.description || '');
        }
    };

    const fetchProjectMembers = async () => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members`);
            if (res.ok) {
                setProjectMembers(await res.json());
            }
        } catch (error) { console.error(error); }
    };

    const fetchFriends = async () => {
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/friends`);
            if (res.ok) setFriends((await res.json()).filter(f => f.status === 'accepted'));
        } catch (error) { console.error(error); }
    };

    useEffect(() => {
        if (showTeamModal) fetchFriends();
    }, [showTeamModal]);

    const handleAddMember = async (targetUserId) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: targetUserId, role: 'member' })
            });
            if (res.ok) {
                toast.success('חבר הוסף בהצלחה לצוות!');
                fetchProjectMembers();
            } else {
                toast.error('שגיאה בצירף או שהמשתמש כבר בצוות');
            }
        } catch (error) { toast.error('שגיאה בתקשורת'); }
    };

    const handleRemoveMember = async (targetUserId) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members/${targetUserId}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('חבר הוסר מהצוות!');
                fetchProjectMembers();
            }
        } catch (error) { toast.error('שגיאה בתקשורת'); }
    };

    const handleUpdateMemberRole = async (targetUserId, role) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}/members/${targetUserId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role })
            });
            if (res.ok) {
                toast.success('תפקיד החבר עודכן!');
                fetchProjectMembers();
            }
        } catch (error) { toast.error('שגיאה בעדכון התפקיד'); }
    };

    const handleDuplicateProject = () => {
        setShowProjectMenu(false);
        toast.info('שכפול פרויקט ייתמך בגרסה הבאה');
    };

    const handleDeleteProject = async () => {
        setShowProjectMenu(false);
        if (!window.confirm('האם אתה בטוח שברצונך למחוק פרויקט זה ואת כל התבניות והמשימות שבתוכו?')) return;
        try {
            await fetch(`${API_URL}/projects/${projectId}`, { method: 'DELETE' });
            navigate('/');
        } catch (err) {
            console.error('Error deleting project:', err);
        }
    };

    const handleSaveSettings = async (settings) => {
        try {
            const res = await fetch(`${API_URL}/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    title: settings.title.trim(), 
                    color: settings.color,
                    description: settings.description.trim()
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setProject(updated);
                setShowSettings(false);
                // Refresh sidebar to show new color/title
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                toast.success('הפרויקט עודכן בהצלחה');
            }
        } catch (err) {
            console.error('Failed to update project settings', err);
            toast.error('שגיאה בעדכון הפרויקט');
        }
    };

    const toggleSettingsDay = null; // Removed

    const toggleChecklistExpanded = (id) => {
        setExpandedChecklists(prev => {
            const newState = { ...prev, [id]: !prev[id] };
            localStorage.setItem('vee_expanded_checklists', JSON.stringify(newState));
            return newState;
        });
    };

    const handleGlobalAddTask = async () => {
        // Find existing empty-titled checklist
        const emptyList = checklists.find(c => c.title === '');
        if (emptyList) {
            setExpandedChecklists(prev => ({ ...prev, [emptyList.id]: true }));
            setAddingToList(emptyList.id);
            return;
        }

        // Create one if none exists
        try {
            const res = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: '',
                    project_id: projectId
                })
            });
            if (res.ok) {
                const newList = await res.json();
                setChecklists([newList, ...checklists]);
                setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                setAddingToList(newList.id);
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            }
        } catch (e) {
            console.error(e);
            toast.error("שגיאה ביצירת רשימה");
        }
    };

    // FAB integration: open inline AddTaskCard in first active checklist
    useEffect(() => {
        const handleFabAddTask = async () => {
            if (activePageTab === 'activity') return;
            // Use the first checklist as target (default behavior)
            const target = checklists[0];

            if (!target) {
                // No checklists — create a default one
                try {
                    const res = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                        method: 'POST',
                        body: JSON.stringify({ title: '', project_id: projectId })
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

            setExpandedChecklists(prev => ({ ...prev, [target.id]: true }));
            setAddingToList(target.id);
            setAddingToItem(null);
            setAddingAtIndex(0); // Default to top
            setNewItemContent('');
            window.dispatchEvent(new CustomEvent('fabAddTaskOpened'));
        };
        window.addEventListener('fabAddTask', handleFabAddTask);
        return () => window.removeEventListener('fabAddTask', handleFabAddTask);
    }, [checklists, activePageTab, projectId, selectedDayOfWeek, user?.id]);
    
    const handleChecklistTitleChange = useCallback((checklistId, newTitle) => {
        setChecklists(prev => prev.map(c => 
            c.id === checklistId ? { ...c, title: newTitle } : c
        ));
    }, []);

    const handleCreateCustomList = async (e) => {
        e.preventDefault();
        if (newListTitle === undefined) return;

        try {
            const res = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newListTitle,
                    project_id: projectId
                })
            });
            if (res.ok) {
                const newList = await res.json();

                let newChecklists;
                if (isCreatingList && isCreatingList !== true) {
                    const targetIdx = checklists.findIndex(c => c.id === isCreatingList);
                    newChecklists = [...checklists];
                    newChecklists.splice(targetIdx + 1, 0, newList);
                } else {
                    newChecklists = [newList, ...checklists];
                }

                setChecklists(newChecklists);
                setExpandedChecklists(prev => ({ ...prev, [newList.id]: true }));
                setNewListTitle('');
                setIsCreatingList(null);
                toast.success('רשימה חדשה נוצרה');

                // Persist the new order
                await fetch(`${API_URL}/projects/${projectId}/checklists/reorder`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ checklistIds: newChecklists.map(c => c.id) })
                });
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddItem = async (e, _checklistId, parentItemId = null, explicitContent = null) => {
        if (e) e.preventDefault();
        const contentToSave = explicitContent !== null ? explicitContent : newItemContent;
        if (!contentToSave || !contentToSave.trim()) return;

        const targetDateInput = window.globalNewItemDate || null;
        const descriptionInput = window.globalNewItemDescription || null;
        const repeatRuleInput = window.globalNewItemRepeatRule || null;
        const timeInput = window.globalNewItemTime || null;
        const durationInput = window.globalNewItemDuration || 15;
        const priorityInput = window.globalNewItemPriority || 4;
        const reminderInput = window.globalNewItemReminderMinutes || null;

        // 1. Optimistic Update
        const tempId = `temp-${Date.now()}`;
        const tempItem = {
            id: tempId,
            content: contentToSave,
            parent_item_id: parentItemId,
            checklist_id: _checklistId,
            target_date: targetDateInput,
            description: descriptionInput,
            repeat_rule: repeatRuleInput,
            time: timeInput,
            duration: durationInput,
            priority: priorityInput,
            reminder_minutes: reminderInput,
            created_at: new Date().toISOString(),
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

        // Reset UI immediately
        setNewItemContent('');
        setAddingAtIndex(null);
        window.globalNewItemDate = null;
        window.globalNewItemDescription = null;
        window.globalNewItemRepeatRule = null;
        window.globalNewItemTime = null;
        window.globalNewItemDuration = 15;
        window.globalNewItemPriority = 4;
        window.globalNewItemReminderMinutes = null;

        try {
            const res = await fetch(`${API_URL}/checklists/${_checklistId}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: contentToSave,
                    parent_item_id: parentItemId,
                    target_date: targetDateInput,
                    description: descriptionInput,
                    repeat_rule: repeatRuleInput,
                    time: timeInput,
                    duration: durationInput,
                    priority: priorityInput,
                    reminder_minutes: reminderInput,
                    prepend: currentAddingAtIndex === 0
                })
            });

            if (res.ok) {
                const newItem = await res.json();
                // Replace temp item with real one
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
            // Revert optimistic update
            setChecklists(prev => prev.map(c => ({
                ...c,
                items: (c.items || []).filter(item => item.id !== tempId)
            })));
            toast.error("שגיאה ביצירת המשימה");
        }
    };

    const handleDeleteItem = async (e, itemId, checklistId) => {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        
        // Find task name for modal (potentially deep)
        let taskName = '';
        checklists.some(c => {
            const findDeep = (items) => {
                return items.some(i => {
                    if (i.id === itemId) { taskName = i.content; return true; }
                    if (i.children && i.children.length > 0) return findDeep(i.children);
                    return false;
                });
            };
            return findDeep(c.items || []);
        });

        setItemToDelete({ itemId, checklistId, taskName });
    };

    const confirmDeleteItem = async () => {
        if (!itemToDelete) return;
        const { itemId, checklistId } = itemToDelete;
        setItemToDelete(null);

        // Optimistic Deletion
        setChecklists(prev => prev.map(c => {
            if (c.id === checklistId) {
                const filterDeep = (items) => {
                    return items
                        .filter(i => i.id !== itemId)
                        .map(i => ({ ...i, children: i.children ? filterDeep(i.children) : [] }));
                };
                return { ...c, items: filterDeep(c.items || []) };
            }
            return c;
        }));
        window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));

        try {
            const res = await fetch(`${API_URL}/items/${itemId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error("Failed to delete");
        } catch (err) {
            console.error(err);
            toast.error("שגיאה במחיקת המשימה, מרענן...");
            fetchProjectData();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const handleUpdateItem = async (itemId, updates) => {
        // Optimistic update
        setChecklists(prev => prev.map(c => ({
            ...c,
            items: c.items.map(i => i.id == itemId ? { ...i, ...updates } : i)
        })));

        try {
            const res = await fetch(`${API_URL}/items/${itemId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
                if (res.ok) {
                    const updatedItem = await res.json();
                    if (updates.checklist_id !== undefined) {
                        fetchProjectData();
                        toast.success('המשימה הועברה בהצלחה');
                    } else {
                        setChecklists(prev => prev.map(c => ({
                            ...c,
                            items: c.items.map(i => i.id == itemId ? { ...i, ...updatedItem } : i)
                        })));
                        toast.success('משימה אחת נערכה');
                    }
                    window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                }
        } catch (err) {
            console.error('Failed to update item', err);
            toast.error('שגיאה בעדכון המשימה');
        }
    };

    const handleSetTargetDate = async (itemId, newDate) => {
        handleUpdateItem(itemId, { target_date: newDate || null });
    };

    const toggleItem = async (itemId, currentCompletedStatus) => {
        const newStatus = !currentCompletedStatus;
        const currentDate = new Date().toLocaleDateString('en-CA');

        // 1. Optimistic Update Local UI
        const delay = newStatus ? 400 : 0;
        setTimeout(() => {
            setTodayProgress(prev => {
                const filtered = prev.filter(p => p.checklist_item_id !== itemId);
                return [...filtered, { checklist_item_id: itemId, user_id: user.id, date: currentDate, completed: newStatus ? 1 : 0 }];
            });
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }, delay);

        try {
            // 2. Perform network request
            const res = await fetch(`${API_URL}/users/${user.id}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    checklist_item_id: itemId,
                    date: currentDate,
                    completed: newStatus
                })
            });

            if (!res.ok) throw new Error("Server Error");
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בעדכון המשימה - מתבטל");
            // 3. Revert Optimistic Update on failure
            setTodayProgress(prev => {
                const filtered = prev.filter(p => p.checklist_item_id !== itemId);
                return [...filtered, { checklist_item_id: itemId, user_id: user.id, date: selectedDate, completed: currentCompletedStatus ? 1 : 0 }];
            });
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        }
    };

    const handleDeleteChecklist = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) return;
        try {
            await fetch(`${API_URL}/checklists/${id}`, { method: 'DELETE' });
            setChecklists(checklists.filter(c => c.id !== id));
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        } catch (err) {
            console.error(err);
        }
    };

    const calculateProgress = useCallback((items) => {
        if (!items || items.length === 0) return 0;
        const totalItems = items.length;
        const completedItems = items.filter(item => {
            const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
            return p && p.completed === 1;
        }).length;
        return (completedItems / totalItems) * 100;
    }, [todayProgress]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

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
        fetchData: fetchProjectData
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

                // `EmptyStateDropZone` uses `checklistId={project.id}` when there are no lists yet,
                // but the inline `AddTaskCard` expects `addingToList` to be a real `checklist.id`.
                // If we dropped on a slot that doesn't belong to an existing checklist yet, create one.
                let targetChecklistId = checklistId;
                const hasChecklist = checklists.some(c => String(c.id) === String(checklistId));
                if (!hasChecklist) {
                    try {
                        const res = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: '', project_id: projectId })
                        });
                        if (!res.ok) throw new Error('Failed to create project list');
                        const newList = await res.json();
                        // Prepend so the new headless list becomes the first render target.
                        setChecklists(prev => [newList, ...(prev || [])]);
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

        handleDnDUpdate(event, projectId);
    };


    if (loading && !project) {
        return (
            <TaskPageLayout title="טוען...">
                <PageSkeleton />
            </TaskPageLayout>
        );
    }

    if (!project) {
        return (
            <TaskPageLayout title="לא נמצא">
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <h3>הפרויקט לא נמצא</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>נראה שהפרויקט הזה כבר לא קיים.</p>
                </div>
            </TaskPageLayout>
        );
    }

    const activeChecklists = checklists
        .filter(c => (!magicRevealing && !isWaterfalling) || visibleChecklistIds.has(c.id))
        .map(c => ({
            ...c,
            items: c.items.filter(item => {
                const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
                const isCompleted = p && p.completed === 1;
                return activePageTab === 'tasks' ? !isCompleted : isCompleted;
            })
        }));

    const uncompletedCount = activeChecklists.reduce((acc, c) => acc + c.items.length, 0);

    const completedTasks = activePageTab === 'tasks' ? checklists
        .filter(c => (!magicRevealing && !isWaterfalling) || visibleChecklistIds.has(c.id))
        .flatMap(c => c.items
            .map(item => ({ ...item, checklist_title: c.title, checklist_id: c.id, projectTitle: project?.title }))
            .filter(item => {
                const p = todayProgress.find(prog => prog.checklist_item_id === item.id);
                return p && p.completed === 1;
            })
        ) : [];

    const handleClearProjectCompleted = async () => {
        if (!window.confirm("האם אתה בטוח שברצונך למחוק את כל המשימות שהושלמו?")) return;
        try {
            await Promise.all(completedTasks.map(item => fetch(`${API_URL}/items/${item.id}`, { method: 'DELETE' })));
            toast.success("המשימות שהושלמו נמחקו בהצלחה");
            fetchProjectData();
            window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
        } catch (err) {
            console.error("Failed to clear completed tasks", err);
            toast.error("שגיאה במחיקת משימות");
        }
    };

    return (
        <TaskPageLayout
            title={project?.title}
            breadcrumb="הפרויקטים שלי"
            onCompletedToggle={() => setActivePageTab(activePageTab === 'tasks' ? 'activity' : 'tasks')}
            isCompletedActive={activePageTab === 'activity'}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            activeDragItem={activeDragItem}
            externalScrollTop={scrollTop}
            onScroll={setScrollTop}
            alternateHeaderPadding="1.75rem"
            titleContent={
                <div style={{
                    transition: 'all 0.35s ease',
                    opacity: Math.max(0, 1 - Math.max(0, scrollTop) / 60),
                    transform: `translateY(${Math.max(0, scrollTop) * 0.15}px)`
                }}>
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleTitleSave}
                            onKeyDown={handleTitleKeyDown}
                            autoFocus
                            style={{
                                fontSize: '1.75rem',
                                fontWeight: 800,
                                color: 'var(--text-primary)',
                                background: 'transparent',
                                border: '1px solid var(--primary-color)',
                                borderRadius: '4px',
                                padding: '0 4px',
                                width: '100%',
                                fontFamily: 'inherit',
                                outline: 'none',
                                letterSpacing: '-0.5px'
                            }}
                        />
                    ) : (
                        <h1
                            className="editable-title"
                            onClick={handleTitleClick}
                            style={{
                                margin: 0,
                                fontSize: '28px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.5px',
                                display: 'inline-block',
                                cursor: 'pointer',
                                transition: 'border-color 0.2s'
                            }}
                        >
                            {project?.title}
                        </h1>
                    )}

                    {(project?.description || isEditingDescription) && (
                        <div style={{ marginTop: '8px', width: '100%' }}>
                            {isEditingDescription ? (
                                <textarea
                                    value={tempDescription}
                                    onChange={(e) => setTempDescription(e.target.value)}
                                    onBlur={handleDescriptionSave}
                                    onKeyDown={handleDescriptionKeyDown}
                                    autoFocus
                                    placeholder="הוסף תיאור לפרויקט..."
                                    style={{
                                        width: '100%',
                                        minHeight: '60px',
                                        padding: '8px',
                                        fontSize: '0.95rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--primary-color)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)',
                                        outline: 'none',
                                        resize: 'vertical',
                                        fontFamily: 'inherit',
                                        direction: 'rtl'
                                    }}
                                />
                            ) : (
                                <p 
                                    onClick={() => { setIsEditingDescription(true); setTempDescription(project.description || ''); }}
                                    style={{ 
                                        margin: 0, 
                                        fontSize: '0.95rem', 
                                        color: 'var(--text-secondary)', 
                                        lineHeight: '1.5',
                                        cursor: 'pointer',
                                        whiteSpace: 'pre-wrap',
                                        direction: 'rtl'
                                    }}
                                >
                                    {project.description}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            }
            headerActions={
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.05rem', marginLeft: window.innerWidth <= 768 ? '-1rem' : '0' }}>
                    <button onClick={() => setShowTeamModal(true)} className="btn-icon-soft" title="צוות הפרויקט" style={{ padding: '0.4rem' }}>
                        <Users size={20} strokeWidth={1.5} color="var(--text-secondary)" />
                    </button>
                    <button onClick={() => setActiveTab(activeTab === 'tasks' ? 'history' : 'tasks')} className="btn-icon-soft" title={activeTab === 'tasks' ? 'יומן היסטוריה' : 'חזור למשימות'} style={{ padding: '0.4rem' }}>
                        {activeTab === 'tasks' ? <CalendarIcon size={20} strokeWidth={1.5} color="var(--text-secondary)" /> : <ListIcon size={20} strokeWidth={1.5} color="var(--text-secondary)" />}
                    </button>
                    <button onClick={() => setShowComments(true)} className="btn-icon-soft" title="תגובות הפרויקט" style={{ padding: '0.4rem' }}>
                        <MessageSquare size={20} strokeWidth={1.5} color="var(--text-secondary)" />
                    </button>
                    <div style={{ position: 'relative' }} ref={projectMenuRef}>
                        <button onClick={() => setShowProjectMenu(!showProjectMenu)} className="btn-icon-soft" style={{ padding: '0.4rem' }}>
                            <MoreHorizontal size={20} strokeWidth={1.5} color="var(--text-secondary)" />
                        </button>

                        <ProjectActionMenu 
                            show={showProjectMenu}
                            onClose={() => setShowProjectMenu(false)}
                            onEdit={() => setShowSettings(true)}
                            onDuplicate={handleDuplicateProject}
                            onDelete={handleDeleteProject}
                            onAddSection={() => setIsCreatingList(true)}
                            theme={theme}
                            menuRef={projectMenuRef}
                        />
                    </div>
                </div>
            }
        >

            {activeTab === 'history' ? (
                <ProjectCalendar projectId={project.id} API_URL={API_URL} onDayClick={(date) => { setSelectedDate(date); setActiveTab('tasks'); }} />
            ) : (
                <>
                    {/* Tasks View */}
                    {selectedDate !== dateStr && (
                        <div className="slide-down" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <CalendarIcon size={22} style={{ color: 'var(--primary-color)' }} />
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--primary-color)', fontSize: '1rem' }}>צפייה בהיסטוריה</h3>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>אתה מסתכל על המשימות בתאריך: <strong style={{ color: 'var(--text-primary)' }}>{new Date(selectedDate).toLocaleDateString('he-IL')}</strong>. ניתן לערוך.</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDate(dateStr)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                חזור להיום
                            </button>
                        </div>
                    )}

                    {/* Main Content Area */}
                    
                    {activeChecklists.length === 0 ? (
                                <div style={{ padding: '0.5rem 0' }}>
                                    <EmptyStateDropZone active={activeDragItem?.data?.current?.type === 'FAB'} checklistId={project.id} />
                                    <ListDropSlot id="list-slot-0" activeType={activeDragItem?.data?.current?.type} />

                                    {isCreatingList === true && activePageTab === 'tasks' && (
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
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
                                    {isCreatingList === true && activePageTab === 'tasks' && (
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

                                    <SortableContext
                                        items={activeChecklists.map(c => `checklist-${c.id}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {activeChecklists.map((checklist, idx) => (
                                            <React.Fragment key={checklist.id}>
                                                <ListDropSlot 
                                                    id={`list-slot-${idx}`} 
                                                    activeType={activeDragItem?.data?.current?.type} 
                                                    isLastSlot={false}
                                                />
                                                <div data-fab-target={idx === 0 ? 'true' : undefined}>
                                                <SortableChecklistCard
                                                    checklist={checklist}
                                                    idx={idx}
                                                    expandedChecklists={expandedChecklists}
                                                    toggleChecklistExpanded={toggleChecklistExpanded}
                                                    handleDeleteChecklist={handleDeleteChecklist}
                                                    todayProgress={todayProgress}
                                                    sensors={sensors}
                                                    handleDragEnd={handleDragEnd}
                                                    activeTab={activeTab}
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
                                                    setIsCreatingList={setIsCreatingList}
                                                    projectTitle={project?.title || ''}
                                                    defaultProject={project}
                                                    onToggleExpand={() => toggleChecklistExpanded(checklist.id)}
                                                    onAddItem={(e, listId, parentId = null, content = null) => handleAddItem(e, listId, parentId, content)}
                                                    onDeleteItem={handleDeleteItem}
                                                    onUpdateItem={handleUpdateItem}
                                                    onToggleItem={toggleItem}
                                                    onDeleteChecklist={(e) => handleDeleteChecklist(e, checklist.id)}
                                                    onTitleChange={handleChecklistTitleChange}
                                                    API_URL={API_URL}
                                                    isInbox={false}
                                                    useProgressArray={true}
                                                    useSharedDndContext={true}
                                                    className={isWaterfalling && visibleChecklistIds.has(checklist.id) ? 'magic-reveal' : (location.state?.magicReveal ? `slide-down stagger-${(idx % 4) + 1}` : '')}
                                                    visibleTaskIds={visibleTaskIds}
                                                    isWaterfalling={isWaterfalling}
                                                    hideAddButton={activePageTab === 'activity'}
                                                    activeDragItem={activeDragItem}
                                                    addingAtIndex={addingAtIndex}
                                                />
                                                </div>
                                                {isCreatingList === checklist.id && activePageTab === 'tasks' && (
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
                                        ))}
                                        <ListDropSlot 
                                            id={`list-slot-${activeChecklists.length}`} 
                                            activeType={activeDragItem?.data?.current?.type} 
                                            isLastSlot={true}
                                        />
                                    </SortableContext>

                                    {activePageTab === 'tasks' && completedTasks.length > 0 && (
                                        <CompletedTaskList 
                                            completedTasks={completedTasks} 
                                            uncompletedCount={uncompletedCount} 
                                            onClearAll={handleClearProjectCompleted} 
                                            todayProgress={todayProgress}
                                        />
                                    )}



                                </div>
                            )}
                        </>
                    )}



            {/* Team Management Modal */}
            {showTeamModal && (
                <ProjectTeamModal
                    isOpen={showTeamModal}
                    onClose={() => setShowTeamModal(false)}
                    project={project}
                    user={user}
                    members={projectMembers}
                    friends={friends}
                    onAddMember={handleAddMember}
                    onRemoveMember={handleRemoveMember}
                    onUpdateMemberRole={handleUpdateMemberRole}
                />
            )}

            {/* NEW Unified Edit Project Modal */}
            {showSettings && (
                <ProjectSettingsModal 
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    project={project}
                    onSave={handleSaveSettings}
                />
            )}

            {/* Comments Component */}
            {showComments && (
                <ProjectComments
                    isOpen={showComments}
                    onClose={() => setShowComments(false)}
                    project={project}
                    user={user}
                    comments={comments}
                    loading={loadingComments}
                    newComment={newComment}
                    setNewComment={setNewComment}
                    onPost={handlePostComment}
                />
            )}

            <DeleteTaskModal
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDeleteItem}
                taskName={itemToDelete?.taskName}
            />

        </TaskPageLayout>
    );
};

export default Project;

// Helper functions for hierarchy and progress moved outside component to prevent recreation
const buildHierarchy = (items) => {
    const itemMap = new Map();
    const roots = [];

    items.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
    });

    items.forEach(item => {
        if (item.parent_item_id) {
            const parent = itemMap.get(item.parent_item_id);
            if (parent) {
                parent.children.push(itemMap.get(item.id));
            } else {
                roots.push(itemMap.get(item.id)); // Orphaned subtasks become roots
            }
        } else {
            roots.push(itemMap.get(item.id));
        }
    });

    return roots;
};




