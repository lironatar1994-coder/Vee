import React from 'react';
import { Calendar as CalendarIcon, RefreshCw, AlarmClock } from 'lucide-react';

export const API_URL = '/api';

export const hebrewDayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export const repeatOptions = [
    { label: 'ללא חזרה', value: 'none' },
    { label: 'כל יום', value: 'daily' },
    { label: 'כל שבוע', value: 'weekly' },
    { label: 'כל יום חול (א׳-ה׳)', value: 'weekdays' },
    { label: 'כל חודש', value: 'monthly' },
    { label: 'כל שנה', value: 'yearly' },
];

export const repeatLabels = {
    daily: 'כל יום',
    weekly: 'שבועי',
    weekdays: 'ימי חול',
    monthly: 'חודשי',
    yearly: 'שנתי',
    custom: 'מותאם'
};

export const TIME_OPTIONS = ['ללא שעה'];
for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
        TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} `);
    }
}

export const getDateDisplayInfo = (targetDate) => {
    if (!targetDate) return { text: 'תאריך', color: 'var(--text-secondary)' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(targetDate);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let text = '';
    let color = 'var(--text-secondary)';
    let isImportant = false;

    const getNextDay = (dow) => {
        const temp = new Date();
        const diff = (dow - temp.getDay() + 7) % 7;
        temp.setDate(temp.getDate() + (diff === 0 ? 7 : diff));
        temp.setHours(0, 0, 0, 0);
        return temp;
    };

    const saturday = getNextDay(6);
    const nextMonday = getNextDay(1);

    if (diffDays === 0) {
        text = 'היום';
        color = '#058527'; // Green
        isImportant = true;
    } else if (diffDays === 1) {
        text = 'מחר';
        color = '#a855f7'; // Purple
        isImportant = true;
    } else if (date.getTime() === saturday.getTime()) {
        text = 'סוף השבוע';
        color = '#f59e0b'; // Amber
        isImportant = true;
    } else if (date.getTime() === nextMonday.getTime()) {
        text = 'שבוע הבא';
        color = '#9b59b6'; // Amethyst
        isImportant = true;
    } else if (diffDays > 1 && diffDays < 7) {
        text = `יום ${hebrewDayNames[date.getDay()]}`;
        if (date.getDay() === 5 || date.getDay() === 6) {
            color = '#f59e0b'; // כתום/Yellow for weekend
            isImportant = true;
        }
    } else if (diffDays < 0) {
        // Overdue
        text = `${date.getDate()} ב${hebrewMonthNames[date.getMonth()]}`;
        color = '#d1453b'; // Todoist Red for overdue
        isImportant = true;
    } else {
        text = `${date.getDate()} ב${hebrewMonthNames[date.getMonth()]}`;
    }

    return { text, color, isImportant, diffDays };
};

export const getFullDateDisplay = (targetDate, repeatRule, time = null) => {
    const { text, color, isImportant } = getDateDisplayInfo(targetDate);
    const repeatLabel = repeatRule ? repeatLabels[repeatRule] : null;
    
    let combinedText = text;
    if (repeatLabel && targetDate) {
        combinedText = `${text}, ${repeatLabel}`;
    } else if (repeatLabel && !targetDate) {
        combinedText = repeatLabel;
    }

    if (time && time.trim() !== '' && time.trim() !== 'ללא שעה') {
        combinedText = `${combinedText} ${time}`;
    }

    return { text: combinedText, color, isImportant };
};

export const renderFormattedDate = (targetDate, repeatRule, lastCompletedDate = null, createdAt = null, hideToday = false, time = null, reminderMinutes = null, showRecentlyCompleted = false) => {
    if (!targetDate && (!repeatRule || repeatRule === 'none') && reminderMinutes === null) return null;

    const today = new Date().toISOString().split('T')[0];
    let dateInfo = { text: '', color: 'var(--text-secondary)' };
    
    if (targetDate) {
        dateInfo = getDateDisplayInfo(targetDate);
    } else if (repeatRule === 'daily' || repeatRule === 'weekdays') {
        dateInfo = getDateDisplayInfo(today);
    } else if (repeatRule) {
        dateInfo.text = repeatLabels[repeatRule] || '';
    }

    const { text, color, diffDays } = dateInfo;
    
    // Check if it was completed today
    const wasCompletedToday = lastCompletedDate === today;
    const isToday = diffDays === 0;
    
    // Logic: Hide "Today" text if hideToday is true. 
    // BUT still show the icon and time if time is present.
    const hasTime = time && time.trim() !== 'ללא שעה' && time.trim() !== '';
    const showDateText = !hideToday || !isToday;
    const showCalendarIcon = (showDateText && text) || hasTime;
    const isRecurring = repeatRule && repeatRule !== 'none';
    const hasAlarm = reminderMinutes !== null;

    // If nothing to show (hidden today, no time, no recurring, no alarm), return null
    if (!showDateText && !hasTime && !isRecurring && !lastCompletedDate && !hasAlarm) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {(showCalendarIcon || isRecurring || hasAlarm) && (
                <span style={{
                    color,
                    fontWeight: 400,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    {showCalendarIcon && <CalendarIcon size={12} />}
                    {showDateText && text}
                    {hasTime && <span style={{ marginRight: showDateText ? '4px' : '0' }}>{time}</span>}
                    {isRecurring && <RefreshCw size={12} strokeWidth={3} style={{ opacity: 0.9, marginLeft: '2px' }} />}
                    {hasAlarm && <AlarmClock size={12} style={{ opacity: 0.8, marginLeft: '2px', color: 'var(--text-secondary)' }} />}
                </span>
            )}
            {showRecentlyCompleted && lastCompletedDate && !wasCompletedToday && (
                <span style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    opacity: 0.7,
                    marginTop: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                }}>
                    הושלם לאחרונה: {getDateDisplayInfo(lastCompletedDate).text}
                </span>
            )}
        </div>
    );
};
