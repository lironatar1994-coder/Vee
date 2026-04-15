/**
 * Date calculation and recurrence utilities
 */

function calculateNextOccurrence(targetDate, rule) {
    if (!targetDate || !rule || rule === 'none') return null;

    const date = new Date(targetDate);
    if (isNaN(date.getTime())) return null;

    switch (rule) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'weekdays':
            // Israeli week: Sun-Thu (0-4)
            const day = date.getDay();
            if (day === 4) date.setDate(date.getDate() + 3); // Thu -> Sun
            else if (day === 5) date.setDate(date.getDate() + 2); // Fri -> Sun
            else if (day === 6) date.setDate(date.getDate() + 1); // Sat -> Sun
            else date.setDate(date.getDate() + 1);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'yearly':
            date.setFullYear(date.getFullYear() + 1);
            break;
        default:
            return null;
    }
    return date.toISOString().split('T')[0];
}

function isOccurrenceOnDate(dateStr, startDateStr, rule) {
    if (!rule || rule === 'none') return false;
    
    // If no start date, we assume it starts today
    const startStr = startDateStr || new Date().toISOString().split('T')[0];
    
    // Rule: Must not be before start date
    if (dateStr < startStr) return false;
    if (dateStr === startStr) return true;

    const date = new Date(dateStr);
    const start = new Date(startStr);
    
    switch (rule) {
        case 'daily':
            return true;
        case 'weekdays':
            const dow = date.getDay();
            return dow >= 0 && dow <= 4; // Sun-Thu
        case 'weekly':
            // Same day of week
            return date.getDay() === start.getDay();
        case 'monthly':
            // Same day of month
            return date.getDate() === start.getDate();
        case 'yearly':
            // Same day and month
            return date.getDate() === start.getDate() && date.getMonth() === start.getMonth();
        default:
            return false;
    }
}

module.exports = {
    calculateNextOccurrence,
    isOccurrenceOnDate
};
