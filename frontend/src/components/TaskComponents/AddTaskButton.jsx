import React from 'react';
import { Plus } from 'lucide-react';

const AddTaskButton = ({ onClick, noMarginTop = false }) => {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                cursor: 'pointer',
                color: 'var(--add-task-btn-color)',
                transition: 'all 0.2s ease',
                direction: 'rtl',
                WebkitTapHighlightColor: 'transparent',
                width: '100%',
                marginTop: noMarginTop ? '0' : '0.5rem'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--add-task-btn-hover)';
                e.currentTarget.style.transform = 'translateX(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--add-task-btn-color)';
                e.currentTarget.style.transform = 'none';
            }}
        >
            <div style={{
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Plus size={18} strokeWidth={2.5} />
            </div>
            <span style={{
                fontSize: '16px',
                fontWeight: 500,
                letterSpacing: '-0.2px'
            }}>
                הוסף משימה
            </span>
        </div>
    );
};

export default AddTaskButton;
