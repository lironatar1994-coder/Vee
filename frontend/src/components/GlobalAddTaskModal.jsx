import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useUser } from '../context/UserContext';
import { AddTaskCard } from './TaskComponents/index.jsx';
import useHistoryModal from '../hooks/useHistoryModal';

const API_URL = '/api';

const GlobalAddTaskModal = ({ isOpen, onClose }) => {
    const { user, authFetch } = useUser();
    const [newItemContent, setNewItemContent] = useState('');
    const [newItemDate, setNewItemDate] = useState(() => new Date().toLocaleDateString('en-CA'));
    const [newItemTime, setNewItemTime] = useState('');
    const [checklists, setChecklists] = useState([]);
    const [defaultChecklist, setDefaultChecklist] = useState(null);
    const [defaultProject, setDefaultProject] = useState(null);

    useHistoryModal(isOpen, onClose, 'add-task');

    useEffect(() => {
        if (!isOpen || !user) return;

        // Reset state & pick up globals
        setNewItemContent('');
        const globalDate = window.globalNewItemDate;
        const globalTime = window.globalNewItemTime;
        
        setNewItemDate(globalDate || new Date().toLocaleDateString('en-CA'));
        setNewItemTime(globalTime || '');

        const fetchData = async () => {
            try {
                const [checkRes, projRes] = await Promise.all([
                    authFetch(`${API_URL}/users/current/checklists`),
                    authFetch(`${API_URL}/users/current/projects`)
                ]);
                if (checkRes.ok && projRes.ok) {
                    const cData = await checkRes.json();
                    const pData = await projRes.json();
                    setChecklists(cData);

                    let currentProjectId = null;
                    if (window.location.pathname.startsWith('/project/')) {
                        currentProjectId = parseInt(window.location.pathname.split('/')[2]);
                    }

                    let defaultList = null;
                    let defProject = null;

                    if (currentProjectId) {
                        defProject = pData.find(p => p.id === currentProjectId) || null;
                        defaultList = cData.find(c => c.project_id === currentProjectId && (!c.title || c.title === ''));
                        if (!defaultList) {
                            defaultList = { id: `NEW_INBOX_${currentProjectId}`, title: '', project_id: currentProjectId };
                        }
                    } else {
                        // Prioritize the main 'headless' inbox list (title is empty)
                        defaultList = cData.find(c => !c.project_id && (!c.title || c.title === '')) || cData.find(c => !c.project_id);
                        if (!defaultList) {
                            defaultList = { id: 'NEW_INBOX', title: '', project_id: null };
                        }
                    }

                    setDefaultChecklist(defaultList);
                    setDefaultProject(defProject);
                }
            } catch (error) {
                console.error('Failed to fetch lists/projects:', error);
            }
        };
        fetchData();
    }, [isOpen, user]);

    const handleAddItem = async (e, checklistId, parentItemId, explicitContent = null) => {
        if (e) e.preventDefault();

        const content = explicitContent || window.globalNewItemContent;
        const description = window.globalNewItemDescription;
        const priority = window.globalNewItemPriority;
        const reminderMinutes = window.globalNewItemReminderMinutes;

        if (!content) return;

        let finalChecklistId = checklistId;

        // Auto-create inbox if needed
        if (typeof finalChecklistId === 'string' && finalChecklistId.startsWith('NEW_INBOX')) {
            const isProjectInbox = finalChecklistId.startsWith('NEW_INBOX_');
            const targetProjectId = isProjectInbox ? parseInt(finalChecklistId.split('_')[2]) : null;

            try {
                const listRes = await authFetch(`${API_URL}/users/current/checklists`, {
                    method: 'POST',
                    body: JSON.stringify({
                        title: '',
                        active_days: '0,1,2,3,4,5,6',
                        project_id: targetProjectId
                    })
                });
                if (listRes.ok) {
                    const newList = await listRes.json();
                    finalChecklistId = newList.id;
                } else {
                    toast.error('שגיאה ביצירת תיבת המשימות');
                    return;
                }
            } catch (err) {
                console.error(err);
                toast.error('שגיאה ביצירת תיבת המשימות');
                return;
            }
        }

        try {
            const res = await authFetch(`${API_URL}/checklists/${finalChecklistId}/items`, {
                method: 'POST',
                body: JSON.stringify({
                    content,
                    description: description || null,
                    target_date: window.globalNewItemDate || null,
                    time: window.globalNewItemTime || null,
                    duration: window.globalNewItemDuration || 15,
                    repeat_rule: window.globalNewItemRepeatRule || null,
                    parent_item_id: parentItemId || null,
                    priority: priority || 4,
                    reminder_minutes: reminderMinutes
                })
            });

            if (res.ok) {
                toast.success('משימה 1 נוצרה');
                window.dispatchEvent(new CustomEvent('refreshTasks'));
                window.dispatchEvent(new CustomEvent('refreshCalendarTasks'));
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
                window.globalNewItemContent = null;
                window.globalNewItemDescription = null;
                window.globalNewItemDate = null;
                window.globalNewItemRepeatRule = null;
                window.globalNewItemTime = null;
                window.globalNewItemDuration = 15;
                window.globalNewItemPriority = 4;
                window.globalNewItemReminderMinutes = null;
            } else {
                toast.error('שגיאה בהוספת משימה');
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בחיבור לשרת');
        }
    };

    if (!isOpen || !defaultChecklist) return null;

    const isMobile = window.innerWidth < 768;

    const modalStyle = {
        width: isMobile ? 'calc(100% - 2rem)' : '90%',
        maxWidth: '580px',
        zIndex: 10000,
        direction: 'rtl',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 1px 10px rgba(0,0,0,0.1)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        overflow: 'visible'
    };
    const overlayStyle = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.1)',
        backdropFilter: 'blur(2px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: isMobile ? '80px' : '15vh'
    };

    return createPortal(
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="fade-in slide-down" style={modalStyle}>
                <AddTaskCard
                    newItemContent={newItemContent}
                    setNewItemContent={setNewItemContent}
                    newItemDate={newItemDate}
                    setNewItemDate={setNewItemDate}
                    initialTime={newItemTime}
                    checklist={defaultChecklist}
                    defaultProject={defaultProject}
                    setAddingToList={() => {
                        onClose();
                        window.globalNewItemDate = null;
                        window.globalNewItemTime = null;
                    }}
                    handleAddItem={handleAddItem}
                />
            </div>
        </div>,
        document.body
    );
};

export default GlobalAddTaskModal;
