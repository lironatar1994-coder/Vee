import React, { forwardRef } from 'react';
import { Bell } from 'lucide-react';

const ReminderBadge = forwardRef(({ minutes, color = 'var(--text-secondary)', size = 12, onClick }, ref) => {
    if (minutes === undefined) return null;
    
    return (
        <div 
            ref={ref}
            className="reminder-badge interactive"
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: color,
                opacity: 1,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.opacity = 0.8;
                e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.opacity = 1;
                e.currentTarget.style.transform = 'translateY(0)';
            }}
            title={minutes ? `תזכורת ${minutes} דקות מראש (לחץ לשינוי)` : 'תזכורת פעילה (לחץ לשינוי)'}
        >
            <Bell size={size} fill="none" style={{ strokeWidth: 2.5 }} />
        </div>
    );
});

ReminderBadge.displayName = 'ReminderBadge';

export default ReminderBadge;
