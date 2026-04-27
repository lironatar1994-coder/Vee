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

const SortableItem = ({ action, onToggle }) => {
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
        zIndex: isDragging ? 10 : 1,
    };

    const Icon = ACTION_ICONS[action.id] || Check;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`quick-add-item ${action.enabled ? '' : 'disabled'}`}
        >
            <div className="quick-add-item-left">
                <div className="quick-add-drag-handle" {...attributes} {...listeners}>
                    <GripVertical size={18} />
                </div>
                <div className="quick-add-icon-box">
                    <Icon size={18} />
                </div>
                <span className="item-label" style={{ fontWeight: 600 }}>{ACTION_LABELS[action.id]}</span>
            </div>
            
            <button 
                className="btn-icon-soft"
                onClick={() => onToggle(action.id)}
                style={{ color: action.enabled ? 'var(--primary-color)' : 'var(--text-secondary)' }}
            >
                {action.enabled ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
        </div>
    );
};

const QuickAddSettings = ({ settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(() => {
        if (!settings) return DEFAULT_SETTINGS;
        return { ...DEFAULT_SETTINGS, ...settings };
    });

    useEffect(() => {
        if (settings) {
            setLocalSettings(prev => ({
                ...prev,
                ...settings,
                actions: settings.actions || prev.actions
            }));
        }
    }, [settings]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
            <div className="quick-add-section-header">
                <h3>הוספה מהירה</h3>
                <p>התאם אישית את סרגל הכלים שמופיע בעת יצירת משימה</p>
            </div>

            <div className="quick-add-card">
                <div className="quick-add-info">
                    <span>הצג תוויות</span>
                    <p>הצגת טקסט לצד האייקונים בכפתורי הפעולה</p>
                </div>
                <label className="premium-toggle">
                    <input type="checkbox" checked={localSettings.showLabels} onChange={handleToggleLabels} />
                    <span className="premium-toggle-slider"></span>
                </label>
            </div>

            <div className="quick-add-list">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localSettings.actions.map(a => a.id)} strategy={verticalListSortingStrategy}>
                        {localSettings.actions.map((action) => (
                            <SortableItem key={action.id} action={action} onToggle={handleToggle} />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            <div className="quick-add-preview">
                <span className="settings-section-title">תצוגה מקדימה</span>
                <div className="quick-add-pills">
                    {localSettings.actions.filter(a => a.enabled).map(action => {
                        const Icon = ACTION_ICONS[action.id];
                        return (
                            <div key={action.id} className="quick-add-pill">
                                <Icon size={14} />
                                {localSettings.showLabels && <span>{ACTION_LABELS[action.id]}</span>}
                            </div>
                        );
                    })}
                </div>
                <div className="quick-add-input-placeholder">
                    הקלד משימה חדשה...
                </div>
            </div>
        </div>
    );
};

export default QuickAddSettings;
