import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronLeft, Trash2 } from 'lucide-react';
import SortableTaskItem from './SortableTaskItem';
import { toast } from 'sonner';
import { API_URL } from './utils.jsx';

const CompletedTaskList = ({ completedTasks, uncompletedCount, onClearAll, todayProgress, onToggleItem }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Dynamic padding logic: Max 100px, Min 40px
    // Let's say 1 task = 100px, 10 tasks = 40px:
    // Difference is 60px over 9 tasks = ~6.6px per task
    // paddingTop = Math.max(40, 100 - ((uncompletedCount > 0 ? uncompletedCount - 1 : 0) * 6.6))
    const calculatedPadding = Math.max(40, 100 - (Math.max(0, uncompletedCount - 1) * 6.6));

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!completedTasks || completedTasks.length === 0) {
        return null;
    }

    return (
        <div style={{ paddingTop: `${calculatedPadding}px`, transition: 'padding 0.3s ease' }}>
            <div className="checklist-card checklist-minimal" style={{ position: 'relative' }}>
                <div
                    className="checklist-header"
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: '0.5rem',
                        direction: 'rtl',
                        gap: '0.5rem',
                        transition: 'all 0.2s ease',
                        marginRight: '-1rem',
                        paddingRight: '1rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                        position: 'relative'
                    }}
                >
                    <span
                        style={{
                            position: 'absolute',
                            right: '-12px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            width: '24px',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '24px',
                            zIndex: 10,
                            marginTop: '-4px'
                        }}
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                    </span>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexGrow: 1,
                        padding: '0 0 4px 0',
                        margin: 0,
                        borderBottom: 'var(--v-separator)'
                    }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 700,
                            color: 'var(--text-secondary)',
                            userSelect: 'none',
                            letterSpacing: '-0.5px'
                        }}>
                            הושלמו
                        </h3>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {completedTasks.length}
                        </span>

                        <div
                            style={{ display: 'flex', alignItems: 'center', marginRight: 'auto', position: 'relative' }}
                            onClick={(e) => e.stopPropagation()}
                            ref={menuRef}
                        >
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className="btn-icon-soft"
                                title="אפשרויות"
                                style={{ padding: '0.4rem', borderRadius: '6px', color: 'var(--text-secondary)', fontWeight: 'bold' }}
                            >
                                ...
                            </button>

                            {isMenuOpen && (
                                <div style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    left: 0,
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '12px',
                                    boxShadow: '6px 8px 25px rgba(0,0,0,0.1), 3px 0 10px rgba(0,0,0,0.02)',
                                    minWidth: '200px',
                                    zIndex: 1000,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    direction: 'rtl',
                                    animation: 'slideDown 0.15s ease-out',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{ padding: '0.4rem' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsMenuOpen(false);
                                                if (onClearAll) onClearAll();
                                            }}
                                            className="action-menu-item action-menu-item-danger"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.8rem',
                                                width: '100%', textAlign: 'right',
                                                padding: '0.6rem 1rem', background: 'transparent',
                                                border: 'none', cursor: 'pointer', color: 'var(--danger-color)',
                                                borderRadius: '8px', fontSize: '0.95rem'
                                            }}
                                        >
                                            <Trash2 size={16} /> נקה הכל
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {isExpanded && (
                    <div style={{ padding: '0', background: 'transparent' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '10px', paddingRight: 0 }}>
                            {completedTasks.map((item) => {
                                const prog = todayProgress?.find(p => p.checklist_item_id === item.id);
                                let compDateStr = null;
                                if (prog && prog.date) {
                                    const d = new Date(prog.date);
                                    if (!isNaN(d.getTime())) {
                                        const dd = String(d.getDate()).padStart(2, '0');
                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                        const yyyy = d.getFullYear();
                                        compDateStr = `${dd}/${mm}/${yyyy}`;
                                    }
                                }
                                return (
                                    <SortableTaskItem
                                        key={item.id}
                                        item={item}
                                        checklistId={item.checklist_id}
                                        sectionTitle={item.checklist_title}
                                        projectTitle={item.projectTitle || ''}
                                        todayProgress={todayProgress}
                                        useProgressArray={true}
                                        isCompletedFallback={true}
                                        isSortable={false}
                                        hideAddButton={true}
                                        hideActionMenu={true}
                                        toggleItem={onToggleItem}
                                        completionDateString={compDateStr}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompletedTaskList;
