import React from 'react';
import { Plus } from 'lucide-react';

const AddTaskButton = ({ onClick, noMarginTop = false }) => {
    return (
        <button
            className="add-task-btn"
            onClick={onClick}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                marginTop: noMarginTop ? '0' : '0.5rem',
                transition: 'var(--transition)'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-secondary)';
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={16} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
            </div>
            <span style={{ fontWeight: 500, fontSize: '15px' }}>הוסף משימה</span>
        </button>
    );
};

export default AddTaskButton;
