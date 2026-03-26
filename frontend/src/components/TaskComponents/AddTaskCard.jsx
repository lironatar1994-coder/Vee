import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, Bell, RefreshCw, X, ArrowLeft, ChevronDown, Inbox, List, Flag, SendHorizontal, Clock } from 'lucide-react';
import SmartInput from '../SmartInput';
import DatePickerDropdown from '../DatePickerDropdown';
import TimePickerDropdown from '../TimePickerDropdown';
import { getRandomTaskPlaceholder } from '../../utils/taskPlaceholders';
import ProjectSelectorDropdown from './ProjectSelectorDropdown';
import { hebrewDayNames, hebrewMonthNames, TIME_OPTIONS, getDateDisplayInfo, getFullDateDisplay } from './utils.jsx';
import { useUser } from '../../context/UserContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'sonner';

const API_URL = '/api';

const AddTaskCard = ({ newItemContent, setNewItemContent, newItemDate, setNewItemDate, checklist, defaultProject, setAddingToList, handleAddItem, suppressDateSpan = false, initialTime = '' }) => {
    const { user } = useUser();
    const { theme } = useTheme();
    const [description, setDescription] = useState('');
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showRepeatMenu, setShowRepeatMenu] = useState(false);
    const [showTimeMenu, setShowTimeMenu] = useState(false);
    const [repeatRule, setRepeatRule] = useState(null);
    const [time, setTime] = useState(initialTime || '');
    const [duration, setDuration] = useState(15);
    const [dynamicPlaceholder, setDynamicPlaceholder] = useState(() => getRandomTaskPlaceholder());
    const [selectedChecklist, setSelectedChecklist] = useState(checklist);
    const [selectedProject, setSelectedProject] = useState(defaultProject || null);
    const [showProjectSelector, setShowProjectSelector] = useState(false);
    const [priority, setPriority] = useState(4);
    const [showPriorityMenu, setShowPriorityMenu] = useState(false);
    const [reminderMinutes, setReminderMinutes] = useState(null);
    const [showReminderMenu, setShowReminderMenu] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const inputContainerRef = useRef(null);

    const cardRef = useRef(null);
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
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const dateBtnRef = useRef(null);
    const timeBtnRef = useRef(null);
    const projectBtnRef = useRef(null);
    const priorityBtnRef = useRef(null);

    useEffect(() => {
        if (initialTime) setTime(initialTime);
    }, [initialTime]);

    const today = new Date();

    const repeatOptions = [
        { label: 'כל יום', value: 'daily' },
        { label: `כל שבוע ביום ${hebrewDayNames[today.getDay()]} `, value: 'weekly' },
        { label: 'כל יום חול (א׳-ה׳)', value: 'weekdays' },
        { label: `כל חודש בתאריך ${today.getDate()} `, value: 'monthly' },
        { label: `כל שנה ב - ${today.getDate()} ב${hebrewMonthNames[today.getMonth()]} `, value: 'yearly' },
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

    const repeatLabels = { daily: 'כל יום', weekly: 'שבועי', weekdays: 'ימי חול', monthly: 'חודשי', yearly: 'שנתי', custom: 'מותאם' };

    const smartInputRef = useRef(null);

    const handleSubmit = async (e, explicitContent = null) => {
        let plainText;
        if (explicitContent !== null) {
            plainText = explicitContent.replace(/<[^>]*>?/gm, '').trim();
        } else {
            // Fallback to ref or state
            const raw = smartInputRef.current
                ? (smartInputRef.current.innerText || smartInputRef.current.textContent)
                : newItemContent;
            plainText = raw.replace(/<[^>]*>?/gm, '').trim();
        }

        if (!plainText) return;

        if (e) e.preventDefault();
        window.globalNewItemContent = plainText;
        window.globalNewItemDescription = description;
        window.globalNewItemDate = newItemDate || null;
        window.globalNewItemRepeatRule = repeatRule || null;
        window.globalNewItemTime = time || null;
        window.globalNewItemDuration = duration || 15;
        window.globalNewItemPriority = priority || 4;
        window.globalNewItemReminderMinutes = reminderMinutes;

        // Auto-create inbox if needed
        let targetChecklistId = selectedChecklist?.id || checklist.id;

        if (typeof targetChecklistId === 'string' && targetChecklistId.startsWith('NEW_INBOX')) {
            const isProjectInbox = targetChecklistId.startsWith('NEW_INBOX_');
            const targetProjectId = isProjectInbox ? parseInt(targetChecklistId.split('_')[2]) : null;

            try {
                const listRes = await fetch(`${API_URL}/users/${user.id}/checklists`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: '',
                        active_days: '0,1,2,3,4,5,6',
                        project_id: targetProjectId
                    })
                });
                if (listRes.ok) {
                    const newList = await listRes.json();
                    targetChecklistId = newList.id;
                    // Note: This modifies the shared checklists state down the line
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

        setNewItemContent('');
        setDescription('');
        setTime('');
        setDuration(15);
        setNewItemDate('');
        setRepeatRule(null);
        setPriority(4);
        setReminderMinutes(null);
        setDynamicPlaceholder(getRandomTaskPlaceholder());

        if (inputContainerRef.current) {
            const input = inputContainerRef.current.querySelector('.smart-input-area');
            if (input) input.focus();
        }
    };

    const pillStyle = (active, customColor) => ({
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-sm)',
        border: `1px solid ${customColor ? customColor : (active ? 'var(--primary-color)' : 'var(--border-color)')} `,
        background: active ? 'color-mix(in srgb, var(--primary-color) 8%, transparent)' : 'var(--bg-color)',
        color: customColor ? customColor : (active ? 'var(--primary-color)' : 'var(--text-secondary)'),
        cursor: 'pointer', fontSize: '0.8rem', whiteSpace: 'nowrap',
        fontFamily: 'inherit',
        fontWeight: customColor ? 600 : 400
    });

    const bottomBtn = (isActive) => ({
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-sm)',
        background: isActive ? 'rgba(var(--primary-rgb,200,120,20),0.06)' : 'var(--bg-color)',
        cursor: 'pointer',
        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
        fontSize: '0.88rem', fontWeight: 500, fontFamily: 'inherit',
        transition: 'background 0.12s',
    });

    return (
        <div ref={cardRef} className="add-task-card-container" style={{
            border: isFocused ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            overflow: 'visible',
            position: 'relative',
            background: 'var(--bg-color)',
            boxShadow: isFocused ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.2s ease',
            transform: 'none',
            zIndex: (isFocused || showPriorityMenu || showReminderMenu || showDateDropdown || showProjectSelector) ? 1000 : 1
        }}>
            <div style={{ padding: '0.2rem 0.6rem' }}>
                <div
                    ref={inputContainerRef}
                    style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.2rem', width: '100%', cursor: 'text' }}
                    onClick={(e) => {
                        const input = e.currentTarget.querySelector('.smart-input-area');
                        if (input) input.focus();
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                >

                    {newItemDate && !suppressDateSpan && (
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            color: getDateDisplayInfo(newItemDate).color,
                            fontWeight: 600, fontSize: '0.85em', cursor: 'pointer', zIndex: 10,
                            userSelect: 'none'
                        }} onClick={(e) => { e.stopPropagation(); setShowDateDropdown(true); }}>
                            {(() => {
                                 const { text } = getDateDisplayInfo(newItemDate);
                                let timeDisplay = time;
                                if (time && duration && duration > 0) {
                                    try {
                                        const [hours, mins] = time.trim().split(':').map(Number);
                                        const d = new Date();
                                        d.setHours(hours, mins, 0);
                                        const end = new Date(d.getTime() + duration * 60000);
                                        timeDisplay = `${time.trim()} - ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                                    } catch (e) {}
                                }
                                return <>{text} {time ? timeDisplay : ''}</>;
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
                        style={{ minWidth: '80px', flexGrow: 1, border: 'none', outline: 'none', fontSize: '16px', fontWeight: 500, background: 'transparent', color: 'var(--text-primary)', padding: 0 }}
                    />
                </div>

                <input
                    type="text"
                    placeholder="תיאור"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{ width: '100%', border: 'none', outline: 'none', fontSize: '15px', fontWeight: 400, background: 'transparent', color: 'var(--text-secondary)', padding: 0 }}
                />
            </div>

            <div style={{ padding: '0.2rem 0.6rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-start', direction: 'rtl' }}>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', border: `1px solid ${newItemDate ? getDateDisplayInfo(newItemDate).color : 'var(--border-color)'}`, borderRadius: 'var(--radius-sm)', background: 'var(--bg-color)', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-color)'}
                    >
                        <button
                            ref={dateBtnRef}
                            type="button"
                            onClick={() => {
                                setShowDateDropdown(!showDateDropdown);
                                setShowPriorityMenu(false);
                                setShowReminderMenu(false);
                                setShowProjectSelector(false);
                            }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                                padding: newItemDate ? '0.3rem 0.6rem 0.3rem 0.2rem' : '0.3rem 0.6rem',
                                border: 'none',
                                background: 'transparent',
                                color: newItemDate ? getDateDisplayInfo(newItemDate).color : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap',
                                fontFamily: 'inherit',
                                fontWeight: newItemDate ? 600 : 500
                            }}
                        >
                            <CalendarIcon size={14} style={{ opacity: 0.8 }} />
                            {newItemDate ? getFullDateDisplay(newItemDate, repeatRule, time).text : 'תאריך'}
                            {repeatRule && repeatRule !== 'none' && <RefreshCw size={12} style={{ opacity: 0.8, marginRight: '4px' }} />}
                        </button>
                        {newItemDate && (
                            <div style={{ padding: '0 0.15rem 0 0.15rem', display: 'flex', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setNewItemDate('');
                                        setTime('');
                                        setRepeatRule(null);
                                        setShowDateDropdown(false);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0.15rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s, color 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--hover-bg)';
                                        e.currentTarget.style.color = 'var(--text-primary)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = 'var(--text-secondary)';
                                    }}
                                >
                                    <X size={14} />
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
                                    if (inputContainerRef.current) {
                                        const input = inputContainerRef.current.querySelector('.smart-input-area');
                                        if (input) input.focus();
                                    }
                                }, 10);
                            }}
                        >
                            <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowTimeMenu(!showTimeMenu); setShowRepeatMenu(false); }}
                                        ref={timeBtnRef}
                                        style={bottomBtn(!!time)}
                                        onMouseEnter={e => { if (!time) e.currentTarget.style.background = 'var(--hover-bg)'; }}
                                        onMouseLeave={e => { if (!time) e.currentTarget.style.background = 'var(--bg-color)'; }}>
                                        <Clock size={15} />
                                        {time || 'זמן'}
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

                                <div style={{ position: 'relative' }}>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowRepeatMenu(!showRepeatMenu); setShowTimeMenu(false); }}
                                        style={bottomBtn(!!repeatRule)}
                                        onMouseEnter={e => { if (!repeatRule) e.currentTarget.style.background = 'var(--hover-bg)'; }}
                                        onMouseLeave={e => { if (!repeatRule) e.currentTarget.style.background = 'var(--bg-color)'; }}>
                                        <RefreshCw size={15} />
                                        {repeatRule ? repeatLabels[repeatRule] : 'חזרה'}
                                    </button>

                                    {showRepeatMenu && (
                                        <div style={{
                                            position: 'absolute', bottom: 'calc(100% + 6px)', left: 0, right: 0,
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            boxShadow: 'var(--card-shadow)',
                                            overflow: 'hidden', zIndex: 1000,
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
                                            {repeatRule && (
                                                <>
                                                    <div style={{ height: '1px', background: 'var(--border-color)' }} />
                                                    <button onClick={() => { setRepeatRule(null); setShowRepeatMenu(false); }}
                                                        style={{
                                                            display: 'block', width: '100%', padding: '0.6rem 1rem', border: 'none',
                                                            background: 'transparent', cursor: 'pointer', color: '#d1453b', fontSize: '0.87rem',
                                                            textAlign: 'right', fontWeight: 500, fontFamily: 'inherit',
                                                            transition: 'background 0.12s',
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                                        הסר חזרה
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {time && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>משך (דקות):</span>
                                        <select
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value))}
                                            style={{
                                                padding: '0.2rem',
                                                borderRadius: '4px',
                                                border: '1px solid var(--border-color)',
                                                fontSize: '0.8rem',
                                                flexGrow: 1
                                            }}
                                        >
                                            <option value={15}>15 דק׳</option>
                                            <option value={30}>30 דק׳</option>
                                            <option value={45}>45 דק׳</option>
                                            <option value={60}>שעה</option>
                                            <option value={90}>שעה וחצי</option>
                                            <option value={120}>שעתיים</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </DatePickerDropdown>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <button
                            ref={priorityBtnRef}
                            type="button"
                            onClick={() => {
                                setShowPriorityMenu(!showPriorityMenu);
                                setShowReminderMenu(false);
                                setShowDateDropdown(false);
                                setShowProjectSelector(false);
                            }}
                            style={{
                                ...pillStyle(priority !== 4, priority === 1 ? 'var(--priority-1)' : priority === 2 ? 'var(--priority-2)' : priority === 3 ? 'var(--priority-3)' : null),
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={e => !showPriorityMenu && (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                            onMouseLeave={e => !showPriorityMenu && (e.currentTarget.style.background = priority !== 4 ? 'color-mix(in srgb, var(--primary-color) 8%, transparent)' : 'var(--bg-color)')}
                        >
                            <Flag size={14} style={{ opacity: priority !== 4 ? 1 : 0.8 }} />
                            {priority === 1 ? 'עדיפות 1' : priority === 2 ? 'עדיפות 2' : priority === 3 ? 'עדיפות 3' : 'עדיפות'}
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

                    <div style={{ position: 'relative' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setShowReminderMenu(!showReminderMenu);
                                setShowPriorityMenu(false);
                                setShowDateDropdown(false);
                                setShowProjectSelector(false);
                            }}
                            style={{
                                ...pillStyle(reminderMinutes !== null),
                                transition: 'var(--transition)'
                            }}
                            onMouseEnter={e => !showReminderMenu && (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                            onMouseLeave={e => !showReminderMenu && (e.currentTarget.style.background = reminderMinutes !== null ? 'color-mix(in srgb, var(--primary-color) 8%, transparent)' : 'var(--bg-color)')}
                        >
                            <Bell size={14} style={{ 
                                opacity: reminderMinutes !== null ? 1 : 0.8,
                                color: reminderMinutes !== null ? 'var(--primary-color)' : 'inherit'
                            }} />
                            {reminderMinutes === null ? 'תזכורת' : reminderOptions.find(o => o.value === reminderMinutes)?.label}
                        </button>

                        {showReminderMenu && (
                            <div style={{
                                position: 'absolute', top: '100%', right: '0', marginTop: '0.4rem',
                                background: theme === 'dark' ? '#1e293b' : '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow: theme === 'dark' ? '0 15px 45px rgba(0,0,0,0.5)' : '0 8px 30px rgba(0,0,0,0.12)',
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

                </div>
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

            <div style={{ padding: '0.4rem 0.6rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', direction: 'rtl' }}>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    <button
                        ref={projectBtnRef}
                        type="button"
                        onClick={() => {
                            setShowProjectSelector(!showProjectSelector);
                            setShowPriorityMenu(false);
                            setShowReminderMenu(false);
                            setShowDateDropdown(false);
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: 0,
                            background: showProjectSelector ? 'var(--hover-bg)' : 'transparent',
                            border: '1px solid transparent',
                            color: 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'inherit',
                            fontWeight: 600,
                            transition: 'var(--transition)',
                        }}
                        onMouseEnter={e => !showProjectSelector && (e.currentTarget.style.background = 'var(--dropdown-hover)')}
                        onMouseLeave={e => !showProjectSelector && (e.currentTarget.style.background = 'transparent')}
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
                            maxWidth: window.innerWidth < 400 ? '140px' : '240px',
                            display: 'inline-block' 
                        }}>
                            {(() => {
                                if (!selectedProject) return selectedChecklist?.title || 'תיבת המשימות';
                                
                                const projectTitle = selectedProject.title;
                                const isDiffChecklist = selectedChecklist?.title && 
                                                      selectedChecklist.title.trim() !== '' && 
                                                      selectedChecklist.title !== projectTitle;
                                
                                if (isDiffChecklist) {
                                    // Truncate project part if too long when combined with checklist
                                    const truncatedProject = projectTitle.length > 14 ? 
                                        projectTitle.substring(0, 12) + '..' : 
                                        projectTitle;
                                    return `${truncatedProject} / ${selectedChecklist.title}`;
                                }
                                
                                return projectTitle;
                            })()}
                        </span>
                        <ChevronDown size={14} style={{ marginRight: '0.1rem' }} />
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => { if (setAddingToList) setAddingToList(null); window.dispatchEvent(new CustomEvent('fabAddTaskClosed')); }} className="desktop-only" style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.87rem', transition: 'var(--transition)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        ביטול
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!newItemContent.trim()} className="desktop-only"
                        style={{ padding: '0.45rem 1.25rem', borderRadius: 'var(--radius-sm)', border: 'none', background: newItemContent.trim() ? 'var(--primary-color)' : 'rgba(var(--primary-rgb), 0.4)', color: 'white', cursor: newItemContent.trim() ? 'pointer' : 'default', fontWeight: 700, fontSize: '0.87rem', transition: 'var(--transition)', boxShadow: newItemContent.trim() ? '0 2px 6px rgba(var(--primary-rgb), 0.2)' : 'none' }}>
                        הוסף משימה
                    </button>
                    <button type="button" onClick={() => { if (setAddingToList) setAddingToList(null); window.dispatchEvent(new CustomEvent('fabAddTaskClosed')); }} className="mobile-only" style={{ padding: '0.5rem', border: 'none', background: 'var(--bg-gray-soft)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', transition: 'background 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-gray-soft)'}>
                        <X size={20} />
                    </button>
                    <button type="button" onClick={handleSubmit} disabled={!newItemContent.trim()} className="mobile-only"
                        style={{ padding: '0.5rem', border: 'none', background: newItemContent.trim() ? 'var(--primary-color)' : 'rgba(var(--primary-rgb), 0.4)', color: 'white', borderRadius: 'var(--radius-sm)', cursor: newItemContent.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SendHorizontal size={20} style={{ transform: 'scaleX(-1)' }} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddTaskCard;
