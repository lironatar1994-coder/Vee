import React, { useState, useEffect, useRef } from 'react';
import { 
    Calendar as CalendarIcon, Bell, RefreshCw, X, ArrowLeft, ChevronDown, 
    Inbox, List, Flag, SendHorizontal, Clock, AlignLeft 
} from 'lucide-react';
import SmartInput from '../SmartInput';
import DatePickerDropdown from '../DatePickerDropdown';
import TimePickerDropdown from '../TimePickerDropdown';
import { getRandomTaskPlaceholder } from '../../utils/taskPlaceholders';
import ProjectSelectorDropdown from './ProjectSelectorDropdown';
import { hebrewDayNames, hebrewMonthNames, TIME_OPTIONS, getDateDisplayInfo, getFullDateDisplay } from './utils.jsx';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';
import '../../styles/task-card.css';

const API_URL = '/api';

const AddTaskCard = ({ 
    newItemContent: propContent, 
    setNewItemContent: propSetContent, 
    newItemDate: propDate, 
    setNewItemDate: propSetDate, 
    checklist, 
    defaultProject, 
    setAddingToList, 
    handleAddItem, 
    suppressDateSpan = false, 
    initialTime = '' 
}) => {
    const { user, authFetch } = useUser();
    const { theme } = useTheme();

    const quickAddSettings = user?.quick_add_settings ? (typeof user.quick_add_settings === 'string' ? JSON.parse(user.quick_add_settings) : user.quick_add_settings) : null;
    const showLabels = quickAddSettings?.showLabels ?? true;
    const enabledActions = quickAddSettings?.actions?.filter(a => a.enabled).map(a => a.id) || ['date', 'time', 'project', 'priority', 'reminders', 'repeat', 'description'];
    const actionOrder = quickAddSettings?.actions?.map(a => a.id) || ['date', 'time', 'project', 'priority', 'reminders', 'repeat', 'description'];

    // Internal state if props are not provided
    const [internalContent, setInternalContent] = useState('');
    const [internalDate, setInternalDate] = useState('');

    const newItemContent = propContent !== undefined ? propContent : internalContent;
    const setNewItemContent = propSetContent || setInternalContent;
    const newItemDate = propDate !== undefined ? propDate : internalDate;
    const setNewItemDate = propSetDate || setInternalDate;

    const [description, setDescription] = useState('');
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showRepeatMenu, setShowRepeatMenu] = useState(false);
    const [showTimeMenu, setShowTimeMenu] = useState(false);
    const [repeatRule, setRepeatRule] = useState(null);
    const [time, setTime] = useState(initialTime || '');
    const [duration, setDuration] = useState(0);
    const [dynamicPlaceholder, setDynamicPlaceholder] = useState(() => getRandomTaskPlaceholder());
    const [selectedChecklist, setSelectedChecklist] = useState(checklist);
    const [selectedProject, setSelectedProject] = useState(defaultProject || null);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [priority, setPriority] = useState(4);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState(null);
    const [showReminderMenu, setShowReminderMenu] = useState(false);
    const [showDescription, setShowDescription] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const cardRef = useRef(null);
    const inputContainerRef = useRef(null);
    const dateBtnRef = useRef(null);
    const timeBtnRef = useRef(null);
    const projectBtnRef = useRef(null);
    const priorityBtnRef = useRef(null);
    const smartInputRef = useRef(null);

    useEffect(() => {
        if (cardRef.current) {
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    useEffect(() => {
        setSelectedChecklist(checklist);
        setSelectedProject(defaultProject || null);
    }, [checklist, defaultProject]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (cardRef.current && !cardRef.current.contains(e.target)) {
                setShowPriorityMenu(false);
                setShowReminderMenu(false);
                setShowDateDropdown(false);
                setShowProjectSelector(false);
                setShowRepeatMenu(false);
                setShowTimeMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (initialTime) setTime(initialTime);
    }, [initialTime]);

    const today = new Date();

    const repeatOptions = [
        { label: 'כל יום', value: 'daily' },
        { label: `כל שבוע ביום ${hebrewDayNames[today.getDay()]}`, value: 'weekly' },
        { label: 'כל יום חול (א׳-ה׳)', value: 'weekdays' },
        { label: `כל חודש בתאריך ${today.getDate()}`, value: 'monthly' },
        { label: `כל שנה ב - ${today.getDate()} ב${hebrewMonthNames[today.getMonth()]}`, value: 'yearly' },
        { label: 'מותאם אישית...', value: 'custom' },
    ];

    const reminderOptions = [
        { label: 'ללא תזכורת', value: null },
        { label: 'בזמן האירוע', value: 0 },
        { label: '5 דקות לפני', value: 5 },
        { label: '15 דקות לפני', value: 15 },
        { label: '30 דקות לפני', value: 30 },
        { label: 'שעה לפני', value: 60 },
        { label: 'יום לפני', value: 1440 },
    ];

    const handleSubmit = async (e, explicitContent = null) => {
        let plainText;
        if (explicitContent !== null) {
            plainText = explicitContent.replace(/<[^>]*>?/gm, '').trim();
        } else {
            const raw = smartInputRef.current
                ? (smartInputRef.current.innerText || smartInputRef.current.textContent)
                : newItemContent;
            plainText = raw.replace(/<[^>]*>?/gm, '').trim();
        }

        if (!plainText) return;

        if (e) e.preventDefault();
        
        // Expose values globally for handleAddItem (legacy compatibility if needed)
        window.globalNewItemContent = plainText;
        window.globalNewItemDescription = description;
        window.globalNewItemDate = newItemDate || null;
        window.globalNewItemRepeatRule = repeatRule || null;
        window.globalNewItemTime = time || null;
        window.globalNewItemDuration = duration || 0;
        window.globalNewItemPriority = priority || 4;
        window.globalNewItemReminderMinutes = reminderMinutes;

        let targetChecklistId = selectedChecklist?.id || checklist?.id;

        // Handle Project Inbox creation if needed
        if (typeof targetChecklistId === 'string' && targetChecklistId.startsWith('NEW_INBOX')) {
            const isProjectInbox = targetChecklistId.startsWith('NEW_INBOX_');
            const targetProjectId = isProjectInbox ? parseInt(targetChecklistId.split('_')[2]) : null;

            try {
                const listRes = await authFetch(`${API_URL}/users/current/checklists`, {
                    method: 'POST',
                    body: JSON.stringify({
                        title: '',
                        project_id: targetProjectId
                    })
                });
                if (listRes.ok) {
                    const newList = await listRes.json();
                    targetChecklistId = newList.id;
                } else {
                    toast.error('שגיאה ביצירת משפך לפרויקט');
                    return;
                }
            } catch (err) {
                console.error(err);
                toast.error('שגיאה ביצירת משפך לפרויקט');
                return;
            }
        }

        handleAddItem(e, targetChecklistId, null, plainText);

        // Reset state
        setNewItemContent('');
        setDescription('');
        setTime('');
        setDuration(0);
        setNewItemDate('');
        setRepeatRule(null);
        setPriority(4);
        setReminderMinutes(null);
        setDynamicPlaceholder(getRandomTaskPlaceholder());
        setShowDescription(false);

        if (smartInputRef.current) {
            smartInputRef.current.focus();
        }
    };

    return (
        <div 
            ref={cardRef} 
            className="add-task-card-container" 
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="task-input-wrapper">
                <div 
                    ref={inputContainerRef}
                    className="smart-input-container"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}
                >
                    {newItemDate && !suppressDateSpan && (
                        <div 
                            className="date-badge-smart"
                            style={{
                                color: getDateDisplayInfo(newItemDate).color,
                                fontWeight: 600, fontSize: '0.85em', cursor: 'pointer'
                            }} 
                            onClick={(e) => { e.stopPropagation(); setShowDateDropdown(true); }}
                        >
                            {(() => {
                                const { text } = getDateDisplayInfo(newItemDate);
                                return text;
                            })()}
                        </div>
                    )}

                    <SmartInput
                        ref={smartInputRef}
                        html={newItemContent}
                        setHtml={setNewItemContent}
                        placeholder={(!newItemContent || newItemContent === '<br>') ? dynamicPlaceholder : ''}
                        autoFocus={true}
                        date={newItemDate}
                        time={time}
                        showSpan={false}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                const currentContent = e.target.innerText || e.target.textContent;
                                handleSubmit(e, currentContent);
                            }
                        }}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        style={{ minWidth: '80px', flexGrow: 1, border: 'none', outline: 'none', fontSize: '1.1rem', fontWeight: 600, background: 'transparent', color: 'var(--text-primary)', padding: 0 }}
                    />
                </div>
                
                {(description || showDescription || isFocused) && (
                    <textarea
                        className="task-description-textarea"
                        placeholder="תיאור נוסף..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        style={{ opacity: description || showDescription || isFocused ? 1 : 0.6 }}
                        rows={1}
                    />
                )}
            </div>

            <div className="actions-pills-row">
                {actionOrder.filter(id => enabledActions.includes(id)).map(actionId => {
                    if (actionId === 'date') {
                        return (
                            <div key="date" style={{ position: 'relative' }}>
                                <button
                                    ref={dateBtnRef}
                                    type="button"
                                    onClick={() => {
                                        setShowDateDropdown(!showDateDropdown);
                                        setShowPriorityMenu(false);
                                        setShowReminderMenu(false);
                                        setShowProjectSelector(false);
                                        setShowTimeMenu(false);
                                        setShowRepeatMenu(false);
                                    }}
                                    className={`action-pill ${newItemDate ? 'active' : ''}`}
                                >
                                    <CalendarIcon size={14} className="action-pill-icon" />
                                    {(newItemDate || showLabels) && (
                                        <span>{newItemDate ? getFullDateDisplay(newItemDate, repeatRule, time).text : 'תאריך'}</span>
                                    )}
                                    {repeatRule && repeatRule !== 'none' && <RefreshCw size={12} className="action-pill-icon" style={{ marginRight: '4px' }} />}
                                </button>
                                
                                {newItemDate && (
                                    <div style={{ position: 'absolute', top: '-8px', left: '-8px', zIndex: 10 }}>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewItemDate('');
                                                setTime('');
                                                setRepeatRule(null);
                                                setShowDateDropdown(false);
                                            }}
                                            className="btn-icon-soft"
                                            style={{ background: 'var(--bg-secondary)', padding: '2px', borderRadius: '50%', border: '1px solid var(--border-color)', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                )}

                                <DatePickerDropdown
                                    isOpen={showDateDropdown}
                                    onClose={() => setShowDateDropdown(false)}
                                    anchorRef={dateBtnRef}
                                    selectedDate={newItemDate}
                                    selectedTime={time}
                                    onSelectDate={(date) => {
                                        setNewItemDate(date);
                                        setTimeout(() => {
                                            if (smartInputRef.current) smartInputRef.current.focus();
                                        }, 10);
                                    }}
                                />
                            </div>
                        );
                    }

                    if (actionId === 'time') {
                        return (
                            <div key="time" style={{ position: 'relative' }}>
                                <button
                                    ref={timeBtnRef}
                                    type="button"
                                    onClick={() => {
                                        setShowTimeMenu(!showTimeMenu);
                                        setShowDateDropdown(false);
                                        setShowPriorityMenu(false);
                                        setShowReminderMenu(false);
                                        setShowProjectSelector(false);
                                        setShowRepeatMenu(false);
                                    }}
                                    className={`action-pill ${time ? 'active' : ''}`}
                                >
                                    <Clock size={14} className="action-pill-icon" />
                                    {(time || showLabels) && (
                                        <span>{time || 'זמן'}</span>
                                    )}
                                </button>
                                
                                <TimePickerDropdown
                                    isOpen={showTimeMenu}
                                    onClose={() => setShowTimeMenu(false)}
                                    anchorRef={timeBtnRef}
                                    initialTime={time}
                                    timeOptions={TIME_OPTIONS}
                                    onSave={(val) => setTime(val)}
                                />
                            </div>
                        );
                    }

                    if (actionId === 'project') {
                        return (
                            <div key="project" style={{ position: 'relative' }}>
                                <button
                                    ref={projectBtnRef}
                                    type="button"
                                    onClick={() => {
                                        setShowProjectSelector(!showProjectSelector);
                                        setShowDateDropdown(false);
                                        setShowPriorityMenu(false);
                                        setShowReminderMenu(false);
                                        setShowTimeMenu(false);
                                        setShowRepeatMenu(false);
                                    }}
                                    className={`action-pill ${(!selectedProject || selectedProject.id === 'inbox') ? '' : 'active'}`}
                                >
                                    {(() => {
                                        const isInbox = !selectedProject || selectedProject.id === 'inbox' || !selectedChecklist?.project_id;
                                        const Icon = isInbox ? Inbox : List;
                                        return <Icon size={14} className="action-pill-icon" />;
                                    })()}
                                    {(selectedProject?.title || showLabels) && (
                                        <span>{selectedProject?.title || 'פרויקט'}</span>
                                    )}
                                </button>
                            </div>
                        );
                    }

                    if (actionId === 'priority') {
                        return (
                            <div key="priority" style={{ position: 'relative' }}>
                                <button
                                    ref={priorityBtnRef}
                                    type="button"
                                    onClick={() => {
                                        setShowPriorityMenu(!showPriorityMenu);
                                        setShowReminderMenu(false);
                                        setShowDateDropdown(false);
                                        setShowProjectSelector(false);
                                        setShowTimeMenu(false);
                                        setShowRepeatMenu(false);
                                    }}
                                    className={`action-pill ${priority !== 4 ? 'active' : ''}`}
                                    style={priority !== 4 ? { color: priority === 1 ? 'var(--priority-1)' : priority === 2 ? 'var(--priority-2)' : 'var(--priority-3)', borderColor: 'currentColor' } : {}}
                                >
                                    <Flag size={14} className="action-pill-icon" fill={priority !== 4 ? 'currentColor' : 'transparent'} />
                                    {(priority !== 4 || showLabels) && (
                                        <span>{priority === 4 ? 'עדיפות' : `עדיפות ${priority}`}</span>
                                    )}
                                </button>

                                {showPriorityMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: '0', marginTop: '0.4rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        boxShadow: 'var(--card-shadow)',
                                        overflow: 'hidden', zIndex: 2000, display: 'flex', flexDirection: 'column',
                                        minWidth: '150px',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                    }}>
                                        {[
                                            { level: 1, label: 'עדיפות 1', color: 'var(--priority-1)' },
                                            { level: 2, label: 'עדיפות 2', color: 'var(--priority-2)' },
                                            { level: 3, label: 'עדיפות 3', color: 'var(--priority-3)' },
                                            { level: 4, label: 'עדיפות 4', color: 'var(--text-secondary)' }
                                        ].map(p => (
                                            <button
                                                key={p.level}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPriority(p.level);
                                                    setShowPriorityMenu(false);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                    width: '100%', padding: '0.6rem 0.8rem', border: 'none',
                                                    background: priority === p.level ? 'var(--dropdown-selected)' : 'transparent',
                                                    cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                                                    borderBottom: p.level !== 4 ? '1px solid var(--border-color)' : 'none',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => {
                                                    if (priority !== p.level) e.currentTarget.style.background = 'var(--dropdown-hover)';
                                                }}
                                                onMouseLeave={e => {
                                                    if (priority !== p.level) e.currentTarget.style.background = 'transparent';
                                                    else e.currentTarget.style.background = 'var(--dropdown-selected)';
                                                }}
                                            >
                                                <Flag size={14} style={{ color: p.color }} fill={p.level !== 4 ? p.color : 'transparent'} />
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: priority === p.level ? 600 : 400 }}>{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (actionId === 'reminders') {
                        return (
                            <div key="reminders" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowReminderMenu(!showReminderMenu);
                                        setShowPriorityMenu(false);
                                        setShowDateDropdown(false);
                                        setShowProjectSelector(false);
                                        setShowTimeMenu(false);
                                        setShowRepeatMenu(false);
                                    }}
                                    className={`action-pill ${reminderMinutes !== null ? 'active' : ''}`}
                                >
                                    <Bell size={14} className="action-pill-icon" />
                                    {(reminderMinutes !== null || showLabels) && (
                                        <span>{reminderMinutes === null ? 'תזכורת' : reminderOptions.find(o => o.value === reminderMinutes)?.label}</span>
                                    )}
                                </button>

                                {showReminderMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: '0', marginTop: '0.4rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        boxShadow: 'var(--card-shadow)',
                                        overflow: 'hidden', zIndex: 2000, display: 'flex', flexDirection: 'column',
                                        minWidth: '150px',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                    }}>
                                        {reminderOptions.map(opt => (
                                            <button
                                                key={opt.value === null ? 'null' : opt.value}
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setReminderMinutes(opt.value);
                                                    setShowReminderMenu(false);
                                                }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                    width: '100%', padding: '0.6rem 0.8rem', border: 'none',
                                                    background: reminderMinutes === opt.value ? 'var(--dropdown-selected)' : 'transparent',
                                                    cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                                                    borderBottom: opt.value !== 1440 ? '1px solid var(--border-color)' : 'none',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseEnter={e => {
                                                    if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'var(--dropdown-hover)';
                                                }}
                                                onMouseLeave={e => {
                                                    if (reminderMinutes !== opt.value) e.currentTarget.style.background = 'transparent';
                                                    else e.currentTarget.style.background = 'var(--dropdown-selected)';
                                                }}
                                            >
                                                <Bell size={14} style={{ color: reminderMinutes === opt.value ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
                                                <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: reminderMinutes === opt.value ? 600 : 400 }}>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (actionId === 'repeat') {
                        return (
                            <div key="repeat" style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowRepeatMenu(!showRepeatMenu);
                                        setShowDateDropdown(false);
                                        setShowPriorityMenu(false);
                                        setShowReminderMenu(false);
                                        setShowProjectSelector(false);
                                        setShowTimeMenu(false);
                                    }}
                                    className={`action-pill ${repeatRule && repeatRule !== 'none' ? 'active' : ''}`}
                                >
                                    <RefreshCw size={14} className="action-pill-icon" />
                                    {(repeatRule || showLabels) && (
                                        <span>{repeatRule ? (repeatOptions.find(o => o.value === repeatRule)?.label || 'חזרה') : 'חזרה'}</span>
                                    )}
                                </button>

                                {showRepeatMenu && (
                                    <div style={{
                                        position: 'absolute', top: '100%', right: '0', marginTop: '0.4rem',
                                        background: 'var(--bg-secondary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        boxShadow: 'var(--card-shadow)',
                                        overflow: 'hidden', zIndex: 2000, display: 'flex', flexDirection: 'column',
                                        minWidth: '150px',
                                        backdropFilter: 'blur(10px)',
                                        WebkitBackdropFilter: 'blur(10px)',
                                    }}>
                                        {repeatOptions.map((opt, i) => (
                                            <button key={i} onClick={() => { setRepeatRule(opt.value === 'custom' ? null : opt.value); setShowRepeatMenu(false); }}
                                                style={{
                                                    display: 'block', width: '100%', padding: '0.6rem 1rem', border: 'none',
                                                    background: repeatRule === opt.value ? 'var(--dropdown-selected)' : 'transparent',
                                                    cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.87rem',
                                                    textAlign: 'right', fontFamily: 'inherit',
                                                    fontWeight: repeatRule === opt.value ? 600 : 400,
                                                    transition: 'background 0.1s',
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                onMouseLeave={e => e.currentTarget.style.background = repeatRule === opt.value ? 'var(--hover-bg)' : 'transparent'}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    if (actionId === 'description') {
                        return (
                            <button
                                key="description"
                                type="button"
                                onClick={() => setShowDescription(!showDescription)}
                                className={`action-pill ${description || showDescription ? 'active' : ''}`}
                            >
                                <AlignLeft size={14} className="action-pill-icon" />
                                {showLabels && <span>תיאור</span>}
                            </button>
                        );
                    }

                    return null;
                })}
            </div>

            <ProjectSelectorDropdown
                isOpen={showProjectSelector}
                onClose={() => setShowProjectSelector(false)}
                anchorRef={projectBtnRef}
                selectedChecklistId={selectedChecklist?.id}
                selectedProject={selectedProject}
                selectedChecklist={selectedChecklist}
                onSelect={(cl, proj) => {
                    setSelectedChecklist(cl);
                    setSelectedProject(proj);
                    setShowProjectSelector(false);
                }}
            />

            <div className="task-card-footer">
                <div className="footer-left">
                    {!enabledActions.includes('project') && (
                        <button
                            ref={projectBtnRef}
                            type="button"
                            onClick={() => {
                                setShowProjectSelector(!showProjectSelector);
                                setShowPriorityMenu(false);
                                setShowReminderMenu(false);
                                setShowDateDropdown(false);
                                setShowTimeMenu(false);
                                setShowRepeatMenu(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.2rem 0.4rem',
                                background: showProjectSelector ? 'var(--hover-bg)' : 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: '0.78rem',
                                cursor: 'pointer',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'inherit',
                                fontWeight: 600,
                            }}
                        >
                            {(() => {
                                const isInbox = !selectedProject || selectedProject.id === 'inbox' || !selectedChecklist?.project_id;
                                const Icon = isInbox ? Inbox : List;
                                return <Icon size={14} style={{ opacity: 0.8 }} />;
                            })()}
                            <span style={{ 
                                whiteSpace: 'nowrap', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                maxWidth: '120px'
                            }}>
                                {selectedProject?.title || selectedChecklist?.title || 'תיבת המשימות'}
                            </span>
                            <ChevronDown size={14} />
                        </button>
                    )}
                </div>
                <div className="footer-right">
                    <button type="button" onClick={() => { if (setAddingToList) setAddingToList(null); window.dispatchEvent(new CustomEvent('fabAddTaskClosed')); }} className="btn-cancel-task desktop-only">
                        ביטול
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!newItemContent.trim()} className="btn-add-task desktop-only">
                        הוסף משימה
                    </button>
                    
                    <button type="button" onClick={() => { if (setAddingToList) setAddingToList(null); window.dispatchEvent(new CustomEvent('fabAddTaskClosed')); }} className="mobile-only btn-cancel-task" style={{ padding: '0.5rem' }}>
                        <X size={20} />
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!newItemContent.trim()} className="mobile-only btn-add-task" style={{ padding: '0.5rem' }}>
                        <SendHorizontal size={20} style={{ transform: 'scaleX(-1)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTaskCard;
