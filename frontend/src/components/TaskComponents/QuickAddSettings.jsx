import React, { useState, useEffect } from 'react';
import { 
    Calendar, Clock, Folder, Flag, Bell, RefreshCw, AlignLeft, 
    GripVertical, Check, Eye, EyeOff 
} from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const ACTION_ICONS = {
    date: Calendar,
    time: Clock,
    project: Folder,
    priority: Flag,
    reminders: Bell,
    repeat: RefreshCw,
    description: AlignLeft
};

const ACTION_LABELS = {
    date: 'תאריך',
    time: 'זמן',
    project: 'פרויקט',
    priority: 'עדיפות',
    reminders: 'תזכורות',
    repeat: 'חזרה',
    description: 'תיאור'
};

const DEFAULT_SETTINGS = {
    actions: [
        { id: 'date', enabled: true },
        { id: 'time', enabled: true },
        { id: 'project', enabled: true },
        { id: 'priority', enabled: true },
        { id: 'reminders', enabled: true },
        { id: 'repeat', enabled: true },
        { id: 'description', enabled: true }
    ],
    showLabels: true
};

const SortableItem = ({ action, onToggle, showLabels }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: action.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    const Icon = ACTION_ICONS[action.id] || Check;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`quick-add-setting-item ${action.enabled ? 'enabled' : 'disabled'}`}
        >
            <div className="item-left">
                <div className="drag-handle" {...attributes} {...listeners}>
                    <GripVertical size={18} />
                </div>
                <div className="item-icon-wrapper">
                    <Icon size={18} />
                </div>
                <span className="item-label">{ACTION_LABELS[action.id]}</span>
            </div>
            
            <button 
                className={`toggle-button ${action.enabled ? 'active' : ''}`}
                onClick={() => onToggle(action.id)}
            >
                {action.enabled ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
        </div>
    );
};

const QuickAddSettings = ({ settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(() => {
        if (!settings) return DEFAULT_SETTINGS;
        // Merge with defaults to handle new actions in future
        const mergedActions = [...DEFAULT_SETTINGS.actions];
        settings.actions.forEach(a => {
            const index = mergedActions.findIndex(ma => ma.id === a.id);
            if (index !== -1) {
                mergedActions[index] = { ...mergedActions[index], ...a };
            }
        });
        // Sort by settings order
        const order = settings.actions.map(a => a.id);
        mergedActions.sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

        return { ...DEFAULT_SETTINGS, ...settings, actions: mergedActions };
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setLocalSettings((prev) => {
                const oldIndex = prev.actions.findIndex(a => a.id === active.id);
                const newIndex = prev.actions.findIndex(a => a.id === over.id);
                const newActions = arrayMove(prev.actions, oldIndex, newIndex);
                const newSettings = { ...prev, actions: newActions };
                onSave(newSettings);
                return newSettings;
            });
        }
    };

    const handleToggle = (id) => {
        setLocalSettings(prev => {
            const newActions = prev.actions.map(a => 
                a.id === id ? { ...a, enabled: !a.enabled } : a
            );
            const newSettings = { ...prev, actions: newActions };
            onSave(newSettings);
            return newSettings;
        });
    };

    const handleToggleLabels = () => {
        setLocalSettings(prev => {
            const newSettings = { ...prev, showLabels: !prev.showLabels };
            onSave(newSettings);
            return newSettings;
        });
    };

    return (
        <div className="quick-add-settings-container" dir="rtl">
            <div className="settings-section">
                <div className="section-header">
                    <h3>הוספה מהירה</h3>
                    <p>התאם אישית את הפעולות שמופיעות בעת יצירת משימה חדשה</p>
                </div>

                <div className="label-toggle-row">
                    <div className="label-info">
                        <span>הצג תוויות לפעולות</span>
                        <p>הצגת טקסט לצד האייקונים בכפתורי הפעולה</p>
                    </div>
                    <button 
                        className={`switch-toggle ${localSettings.showLabels ? 'on' : 'off'}`}
                        onClick={handleToggleLabels}
                    >
                        <div className="switch-handle" />
                    </button>
                </div>

                <div className="actions-list-header">
                    <span>סדר ופעולות</span>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={localSettings.actions.map(a => a.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="actions-list">
                            {localSettings.actions.map((action) => (
                                <SortableItem 
                                    key={action.id} 
                                    action={action} 
                                    onToggle={handleToggle}
                                    showLabels={localSettings.showLabels}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            <div className="preview-section">
                <div className="preview-header">
                    <span>תצוגה מקדימה</span>
                </div>
                <div className="preview-box">
                    <div className="preview-actions-row">
                        {localSettings.actions.filter(a => a.enabled).map(action => {
                            const Icon = ACTION_ICONS[action.id];
                            return (
                                <div key={action.id} className="preview-action-pill">
                                    <Icon size={14} />
                                    {localSettings.showLabels && <span>{ACTION_LABELS[action.id]}</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="preview-input-placeholder">
                        הקלד משימה חדשה...
                    </div>
                </div>
            </div>

            <style>{`
                .quick-add-settings-container {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                    padding: 1rem;
                }

                .section-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: var(--text-primary);
                }

                .section-header p {
                    margin: 0.25rem 0 1.5rem;
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                }

                .label-toggle-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    margin-bottom: 2rem;
                }

                .label-info span {
                    display: block;
                    font-weight: 600;
                    font-size: 0.95rem;
                }

                .label-info p {
                    margin: 0.2rem 0 0;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                }

                .switch-toggle {
                    width: 44px;
                    height: 24px;
                    border-radius: 12px;
                    background: var(--border-color);
                    border: none;
                    position: relative;
                    cursor: pointer;
                    transition: background 0.2s;
                    padding: 0;
                }

                .switch-toggle.on {
                    background: var(--primary-color);
                }

                .switch-handle {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: white;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: transform 0.2s;
                }

                .switch-toggle.on .switch-handle {
                    transform: translateX(20px);
                }

                .actions-list-header {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    margin-bottom: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .actions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .quick-add-setting-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    transition: all 0.2s;
                }

                .quick-add-setting-item.disabled {
                    opacity: 0.6;
                    background: var(--bg-secondary);
                }

                .item-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .drag-handle {
                    cursor: grab;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                }

                .item-icon-wrapper {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    color: var(--primary-color);
                }

                .item-label {
                    font-weight: 500;
                    font-size: 0.95rem;
                }

                .toggle-button {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    color: var(--text-secondary);
                    padding: 4px;
                    border-radius: 6px;
                    transition: all 0.2s;
                }

                .toggle-button:hover {
                    background: var(--hover-bg);
                    color: var(--text-primary);
                }

                .toggle-button.active {
                    color: var(--primary-color);
                }

                .preview-section {
                    margin-top: 1rem;
                }

                .preview-header {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-secondary);
                    margin-bottom: 0.75rem;
                }

                .preview-box {
                    background: var(--bg-color);
                    border: 2px dashed var(--border-color);
                    border-radius: 16px;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .preview-actions-row {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .preview-action-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.4rem 0.75rem;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 500;
                }

                .preview-input-placeholder {
                    padding: 0.75rem 1rem;
                    background: var(--bg-secondary);
                    border-radius: 10px;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                    border: 1px solid var(--border-color);
                }

                [dir="rtl"] .switch-toggle.on .switch-handle {
                    transform: translateX(-20px);
                }
            `}</style>
        </div>
    );
};

export default QuickAddSettings;
