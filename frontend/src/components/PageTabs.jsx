import React from 'react';

const PageTabs = ({ activeTab, onChange }) => {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'var(--bg-secondary)',
            padding: '0.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            width: 'fit-content',
            margin: '0 auto 1.5rem auto', // Centered and below the header/title
            boxShadow: 'var(--card-shadow)',
            position: 'relative'
        }}>
            <button
                onClick={() => onChange('tasks')}
                style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: activeTab === 'tasks' ? 'var(--bg-color)' : 'transparent',
                    color: activeTab === 'tasks' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'tasks' ? 600 : 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: activeTab === 'tasks' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    zIndex: 1
                }}
            >
                משימות
            </button>
            <button
                onClick={() => onChange('activity')}
                style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: activeTab === 'activity' ? 'var(--bg-color)' : 'transparent',
                    color: activeTab === 'activity' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'activity' ? 600 : 500,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: activeTab === 'activity' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                    zIndex: 1
                }}
            >
                הושלמו
            </button>
        </div>
    );
};

export default PageTabs;
