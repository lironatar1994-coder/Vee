import React from 'react';
import { Bell } from 'lucide-react';

const ReminderBadge = ({ minutes, color = 'var(--reminder-color)', size = 12 }) => {
    if (minutes === undefined) return null;
    
    return (
        <div 
            className="reminder-badge"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: color,
                opacity: 1,
                transition: 'all 0.2s ease'
            }}
            title={minutes ? `תזכורת ${minutes} דקות מראש` : 'תזכורת פעילה'}
        >
            <Bell size={size} fill={minutes !== null ? `${color}33` : 'none'} style={{ strokeWidth: 2.5 }} />
            {/* Optional: we could show the number of minutes here if desired, 
                but for now we keep it minimalist as per user's style */}
        </div>
    );
};

export default ReminderBadge;
