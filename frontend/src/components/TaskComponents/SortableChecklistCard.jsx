import React, { useState, memo, useMemo, useRef } from 'react';
import { ChevronDown, ChevronLeft, Plus, MoreHorizontal, Layout, Trash2,
    GripVertical
} from 'lucide-react';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, pointerWithin, useDroppable } from '@dnd-kit/core';
import { useUser } from '../../context/UserContext';
import ActionMenu from './ActionMenu';
import SortableTaskItem from './SortableTaskItem';
import AddTaskCard from './AddTaskCard';
import { API_URL } from './utils.jsx';
import { toast } from 'sonner';

export const DropSlot = ({ id, active }) => {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: { type: 'FABSlot' }
    });

    if (!active) return null;

    return (
        <div
            ref={setNodeRef}
            style={{
                height: '40px', // Large invisible hit area
                marginTop: '-20px',
                marginBottom: '-20px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                zIndex: isOver ? 100 : 1,
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                pointerEvents: 'auto',
            }}
        >
            {/* The Drop Line */}
            <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '3px',
                background: 'var(--primary-color)',
                borderRadius: '3px',
                opacity: isOver ? 1 : 0,
                transform: isOver ? 'scaleX(1)' : 'scaleX(0.8)',
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                boxShadow: '0 0 8px rgba(var(--primary-rgb), 0.5)',
            }} />
            
            {/* The Bulb (Node) */}
            <div style={{
                position: 'absolute',
                right: '-6px', // assuming RTL
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: 'var(--primary-color)',
                border: '2px solid var(--bg-primary)',
                opacity: isOver ? 1 : 0,
                transform: isOver ? 'scale(1)' : 'scale(0)',
                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                boxShadow: '0 0 8px rgba(var(--primary-rgb), 0.5)',
            }} />
        </div>
    );
};

export const ListDropSlot = ({ id, activeType, isLastSlot = false }) => {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data: { type: 'ListSlot', isLastSlot }
    });

    // Determine if this slot should be visible/active based on what's being dragged
    // User only wants "New List" hints at the end of content.
    const isChecklistDragging = activeType === 'Checklist';
    const isSmartDragging = activeType === 'FAB' || activeType === 'Task' || activeType === 'ChecklistItem';

    // Logic: 
    // - If dragging a checklist, all slots are active for reordering.
    // - If dragging a task/fab, only the LAST slot is active for creating a new list.
    const isActive = isChecklistDragging;

    if (!isActive) return <div style={{ height: '8px' }} />;

    return (
        <div
            ref={setNodeRef}
            style={{
                height: isOver ? (isChecklistDragging ? '100px' : '120px') : '60px',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: isOver ? 100 : 1,
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
                margin: isOver ? '16px 0' : '-30px 0',
                padding: '0',
            }}
        >
            <div style={{
                width: '100%',
                height: isOver ? '100%' : '4px',
                border: isOver ? '2px dashed var(--primary-color)' : 'none',
                background: isOver ? 'rgba(var(--primary-rgb), 0.05)' : 'transparent',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isOver ? 1 : 0,
                transform: isOver ? 'scale(1)' : 'scale(0.95)',
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
                gap: '8px',
                color: 'var(--primary-color)',
                fontWeight: '600',
                fontSize: '1rem',
                boxShadow: isOver ? '0 0 20px rgba(var(--primary-rgb), 0.1)' : 'none',
            }}>
                {isOver && (
                    <>
                        <Plus size={20} />
                        {isChecklistDragging ? 'שחרר כאן להעברת הרשימה' : 'שחרר כאן ליצירת רשימה חדשה'}
                    </>
                )}
            </div>
            
            {/* The horizontal line between lists when just hovering nearby (not fully over) */}
            {!isOver && isChecklistDragging && (
                <div style={{
                    position: 'absolute',
                    width: '60%',
                    height: '4px',
                    background: 'rgba(var(--primary-rgb), 0.2)',
                    borderRadius: '4px',
                    opacity: 0.5,
                }} />
            )}
        </div>

    );
};

const SortableChecklistCard = ({
    checklist, idx, expandedChecklists, toggleChecklistExpanded, handleDeleteChecklist,
    todayProgress, sensors, handleDragEnd,
    addingToList, addingToItem, toggleItem, setAddingToItem, setAddingToList, handleAddItem, handleDeleteItem, newItemContent, setNewItemContent, buildHierarchy, calculateProgress,
    handleUpdateItem: handleUpdateItemProp,
    projectTitle = '',
    useSharedDndContext = false,
    useProgressArray = false,
    setIsCreatingList,
    defaultItemDate = null,
    hideTaskCount = false,
    isFlatList = false,
    overrideChecklistForAdd = null,
    expanded,
    onToggleExpand,
    onDeleteChecklist,
    onAddItem,
    onDeleteItem,
    onUpdateItem,
    onToggleItem,
    onTitleChange, // New prop for optimistic title updates
    defaultProject = null,
    visibleTaskIds = null,
    isWaterfalling = false,
    className = '',
    hideAddButton = false,
    activeDragItem = null,
    addingAtIndex = null,
    isOverlay = false,
    onSetDate = null,
    setDateLabel = "הגדר תאריך יעד",
    hideToday = false,
    isSortable = true,
    hideToggle = false,
    hideActionMenu = false,
    canEditTitle = true
}) => {
    const { authFetch } = useUser();

    // Local update handler — calls PUT /api/items/:itemId and updates UI eventually via parent reload / socket
    const handleUpdateItem = onUpdateItem || handleUpdateItemProp || ((itemId, updates) => {
        authFetch(`${API_URL}/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }).catch(err => console.error('Failed to update task', err));
    });

    const activeToggleItem = onToggleItem || toggleItem;
    const activeAddItem = onAddItem || handleAddItem;
    const activeDeleteItem = onDeleteItem || handleDeleteItem;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: `checklist-${checklist.id}`,
        data: { type: 'Checklist', checklist, idx },
        disabled: !isSortable
    });

    const appliedStyle = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        transition,
        padding: 0,
        overflow: 'visible',
        paddingRight: '0'
    };

    const rawItems = useMemo(() => {
        const items = buildHierarchy ? buildHierarchy(checklist.items || []) : (checklist.items || []);
        return isOverlay ? items.slice(0, 5) : items;
    }, [checklist.items, buildHierarchy, isOverlay]);

    const processedItems = useMemo(() => {
        if (isWaterfalling && visibleTaskIds) {
            return rawItems.filter(item => visibleTaskIds.has(item.id));
        }
        return rawItems;
    }, [rawItems, isWaterfalling, visibleTaskIds]);

    const progressPercent = useMemo(() => {
        return calculateProgress ? calculateProgress(checklist.items) : 0;
    }, [calculateProgress, checklist.items]);

    const hierarchicalItems = processedItems;

    // Support both ways of passing expansion state
    const isExpanded = isFlatList ? true : (expanded !== undefined ? expanded : (expandedChecklists ? expandedChecklists[checklist.id] : true));
    const isAddingRootTask = String(addingToList) === String(checklist.id);

    // Local state for the inline date picker when creating tasks
    const [newItemDate, setNewItemDate] = useState(defaultItemDate);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const originalTitleRef = useRef(''); // Track original title to avoid redundant API calls
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleEditTitleSubmit = async () => {
        setIsEditingTitle(false);
        const finalTitle = tempTitle.trim();
        // Skip if empty or unchanged from the *actual* starting point (trimmed)
        if (!finalTitle || finalTitle === (originalTitleRef.current || '').trim()) return;
        
        try {
            const res = await authFetch(`${API_URL}/checklists/${checklist.id}`, {
                method: 'PUT',
                body: JSON.stringify({ title: finalTitle })
            });
            if (res.ok) {
                toast.success('הרשימה עודכנה');
                // Final refresh to ensure all shared state is synced with server
                window.dispatchEvent(new CustomEvent('refreshTasks'));
                window.dispatchEvent(new CustomEvent('refreshSidebarCounts'));
            }
        } catch (err) { 
            console.error('Failed to save list title', err);
            toast.error('שגיאה בעדכון שם הרשימה');
        }
    };

    const handleCompleteAll = async () => {
        if (!checklist.items) return;
        if (!window.confirm("האם כל המשימות ברשימה זו בוצעו?")) return;

        for (const item of checklist.items) {
            let isCompleted = false;
            if (useProgressArray && todayProgress) {
                isCompleted = todayProgress.some(p => p.checklist_item_id === item.id && p.completed === 1);
            } else {
                isCompleted = item.completed;
            }
            if (!isCompleted) {
                if (onToggleItem) onToggleItem(item.id, false);
                else if (toggleItem) toggleItem(item.id, false);
            }
        }
    };

    const handleSetTargetDate = async (itemId, date) => {
        handleUpdateItem(itemId, { target_date: date || null });
    };

    return (
        <div
            ref={setNodeRef}
            style={{
                ...appliedStyle,
                marginBottom: '0rem',
                zIndex: isDragging ? 100 : isOverlay ? 9999 : (isMenuOpen ? 200 : 1),
                position: 'relative',
                pointerEvents: (isDragging && !isOverlay) ? 'none' : 'auto',
                ...(isDragging && !isOverlay ? {
                    opacity: 0.3,
                } : {}),
                ...(isOverlay ? {
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4)',
                    borderRadius: 'var(--radius-lg)',
                    transform: 'scale(1.02)',
                    background: 'var(--bg-secondary)',
                    opacity: 1,
                    cursor: 'grabbing',
                    pointerEvents: 'none',
                    willChange: 'transform'
                } : {})
            }}
            className={`checklist-card checklist-minimal ${className} ${isDragging ? 'dragging-placeholder' : ''} ${isOverlay ? 'dragging-overlay' : ''}`}
        >
            {!isFlatList && checklist.title !== '' && (
                <div
                    className="checklist-header"
                    {...(isSortable && !isOverlay ? { ...attributes, ...listeners } : {})}
                    onClick={() => {
                        if (!isDragging && !isOverlay && canEditTitle) {
                            setTempTitle(checklist.title || '');
                            originalTitleRef.current = checklist.title || '';
                            setIsEditingTitle(true);
                        }
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        marginTop: '0.5rem',
                        direction: 'rtl',
                        gap: '0.5rem',
                        position: isOverlay ? 'relative' : 'sticky',
                        top: isOverlay ? 'auto' : '-1px',
                        zIndex: isOverlay ? 9999 : (isMenuOpen ? 200 : 40),
                        background: isOverlay ? 'transparent' : 'var(--bg-color)',
                        transition: 'all 0.2s ease',
                        marginRight: '-1rem',
                        paddingRight: '1rem',
                        WebkitTapHighlightColor: 'transparent',
                        cursor: (isDragging || isOverlay) ? 'grabbing' : (isSortable ? 'grab' : 'default'),
                        userSelect: 'none'
                    }}
                >
                    {!hideToggle && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleExpand) onToggleExpand(checklist.id);
                                else if (toggleChecklistExpanded) toggleChecklistExpanded(checklist.id);
                            }}
                            onPointerDown={e => e.stopPropagation()} // Prevent drag initiation on toggle
                            style={{
                                position: 'absolute',
                                right: '-12px', // Moved more to the right
                                color: 'var(--text-secondary)',
                                display: 'flex',
                                width: '24px',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '24px',
                                opacity: 1,
                                zIndex: 10,
                                cursor: 'pointer',
                                marginTop: '-4px' // A tiny bit up
                            }}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
                        </span>
                    )}


                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexGrow: 1,
                        padding: '0 0 4px 0',
                        margin: 0,
                        borderBottom: 'var(--v-separator)'
                    }}>
                        {isEditingTitle ? (
                            <input
                                autoFocus
                                value={tempTitle}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTempTitle(val);
                                    if (onTitleChange) onTitleChange(checklist.id, val);
                                }}
                                onBlur={handleEditTitleSubmit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleEditTitleSubmit();
                                    }
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const orig = originalTitleRef.current;
                                        setTempTitle(orig);
                                        if (onTitleChange) onTitleChange(checklist.id, orig);
                                        setIsEditingTitle(false);
                                    }
                                }}
                                onClick={e => e.stopPropagation()}
                                onPointerDown={e => e.stopPropagation()}
                                style={{
                                    margin: 0,
                                    fontSize: '16px',
                                    fontWeight: 700,
                                    color: 'var(--text-primary)',
                                    letterSpacing: '-0.5px',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                    padding: 0,
                                    fontFamily: 'inherit',
                                    cursor: 'text'
                                }}
                            />
                        ) : (
                            <h3 style={{
                                margin: 0,
                                fontSize: '16px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                userSelect: 'none',
                                letterSpacing: '-0.5px'
                            }}>
                                {checklist.title}
                            </h3>
                        )}
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {!hideTaskCount && hierarchicalItems.length > 0 ? hierarchicalItems.length : ''}
                        </span>

                        {!hideActionMenu && (
                            <div
                                style={{ display: 'flex', alignItems: 'center', opacity: 1, transition: 'opacity 0.2s', marginRight: 'auto' }}
                                className="checklist-actions"
                                onPointerDown={e => e.stopPropagation()} // Prevent drag initiation on menu
                            >
                                <ActionMenu
                                    onDelete={(e) => {
                                        if (onDeleteChecklist) onDeleteChecklist(e, checklist.id);
                                        else if (handleDeleteChecklist) handleDeleteChecklist(e, checklist.id);
                                    }}
                                    onEdit={canEditTitle ? (() => { 
                                        setTempTitle(checklist.title);
                                        originalTitleRef.current = checklist.title;
                                        setIsEditingTitle(true); 
                                    }) : null}
                                    onComplete={handleCompleteAll}
                                    onSetDate={onSetDate}
                                    setDateLabel={setDateLabel}
                                    onOpenChange={setIsMenuOpen}
                                    size={16}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isExpanded && (
                <div style={{ padding: '0', background: 'transparent' }} onClick={e => e.stopPropagation()}>
                    {useSharedDndContext ? (
                        <SortableContext
                            id={checklist.id.toString()}
                            items={hierarchicalItems.map(i => i.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', minHeight: '10px', paddingRight: 0 }}>
                                <DropSlot id={`slot-${checklist.id}-0`} active={activeDragItem?.data?.current?.type === 'FAB'} />
                                {hierarchicalItems.map((item, i) => (
                                    <React.Fragment key={item.id}>
                                        {addingAtIndex === i && String(addingToList) === String(checklist.id) && (
                                            <div style={{ marginBottom: '4px' }}>
                                                <AddTaskCard
                                                    newItemContent={newItemContent}
                                                    setNewItemContent={setNewItemContent}
                                                    newItemDate={newItemDate}
                                                    setNewItemDate={setNewItemDate}
                                                    checklist={overrideChecklistForAdd || checklist}
                                                    defaultProject={defaultProject}
                                                    setAddingToList={setAddingToList}
                                                    handleAddItem={activeAddItem}
                                                    suppressDateSpan={newItemDate === defaultItemDate}
                                                />
                                            </div>
                                        )}
                                        <SortableTaskItem
                                            key={item.id} item={item} checklistId={checklist.id}
                                            sectionTitle={checklist.title}
                                            projectTitle={projectTitle}
                                            allItems={hierarchicalItems}
                                            todayProgress={todayProgress} addingToItem={addingToItem}
                                            toggleItem={activeToggleItem} setAddingToItem={setAddingToItem} setAddingToList={setAddingToList}
                                            handleAddItem={activeAddItem} handleDeleteItem={activeDeleteItem}
                                            handleUpdateItem={handleUpdateItem}
                                            newItemContent={newItemContent} setNewItemContent={setNewItemContent}
                                            handleSetTargetDate={handleSetTargetDate}
                                            useProgressArray={useProgressArray}
                                            isCompletedFallback={item.completed}
                                            isWaterfalling={isWaterfalling}
                                            hideAddButton={hideAddButton}
                                            hideToday={hideToday}
                                        />
                                        <DropSlot id={`slot-${checklist.id}-${i + 1}`} active={activeDragItem?.data?.current?.type === 'FAB'} />
                                    </React.Fragment>
                                ))}
                            </div>
                        </SortableContext>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragEnd={(e) => handleDragEnd(e, checklist.id)}
                        >
                        <SortableContext
                            id={`checklist-items-${checklist.id}`}
                            items={hierarchicalItems.map(i => `task-${i.id}`)}
                            strategy={verticalListSortingStrategy}
                        >
                                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '0px', paddingRight: 0 }}>
                                    <DropSlot id={`slot-${checklist.id}-0`} active={activeDragItem?.data?.current?.type === 'FAB'} />
                                    {hierarchicalItems.map((item, i) => (
                                        <React.Fragment key={item.id}>
                                            {addingAtIndex === i && addingToList === checklist.id && (
                                                <div style={{ marginBottom: '4px' }}>
                                                    <AddTaskCard
                                                        newItemContent={newItemContent}
                                                        setNewItemContent={setNewItemContent}
                                                        newItemDate={newItemDate}
                                                        setNewItemDate={setNewItemDate}
                                                        checklist={overrideChecklistForAdd || checklist}
                                                        defaultProject={defaultProject}
                                                        setAddingToList={setAddingToList}
                                                        handleAddItem={activeAddItem}
                                                        suppressDateSpan={newItemDate === defaultItemDate}
                                                    />
                                                </div>
                                            )}
                                            <SortableTaskItem
                                                key={item.id} item={item} checklistId={checklist.id}
                                                sectionTitle={checklist.title}
                                                projectTitle={projectTitle}
                                                allItems={hierarchicalItems}
                                                todayProgress={todayProgress} addingToItem={addingToItem}
                                                toggleItem={activeToggleItem} setAddingToItem={setAddingToItem} setAddingToList={setAddingToList}
                                                handleAddItem={activeAddItem} handleDeleteItem={activeDeleteItem}
                                                handleUpdateItem={handleUpdateItem}
                                                newItemContent={newItemContent} setNewItemContent={setNewItemContent}
                                                handleSetTargetDate={handleSetTargetDate}
                                                useProgressArray={useProgressArray}
                                                isCompletedFallback={item.completed}
                                                isWaterfalling={isWaterfalling}
                                                hideAddButton={hideAddButton}
                                                hideToday={hideToday}
                                            />
                                            <DropSlot id={`slot-${checklist.id}-${i + 1}`} active={activeDragItem?.data?.current?.type === 'FAB'} />
                                        </React.Fragment>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {!hideAddButton && !isAddingRootTask && (
                        <div
                            onClick={() => setAddingToList(checklist.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0 0 10px 0',
                                cursor: 'pointer',
                                color: 'var(--add-task-btn-color)',
                                transition: 'all 0.2s ease',
                                direction: 'rtl',
                                WebkitTapHighlightColor: 'transparent',
                                width: 'fit-content'
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
                                width: '18px',
                                height: '18px',
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
                    )}

                    {!hideAddButton && isAddingRootTask && (addingAtIndex === null || addingAtIndex === hierarchicalItems.length) && (
                        <div style={{ marginTop: '0rem' }}>
                            <AddTaskCard
                                newItemContent={newItemContent}
                                setNewItemContent={setNewItemContent}
                                newItemDate={newItemDate}
                                setNewItemDate={setNewItemDate}
                                checklist={overrideChecklistForAdd || checklist}
                                defaultProject={defaultProject}
                                setAddingToList={setAddingToList}
                                handleAddItem={activeAddItem}
                                suppressDateSpan={newItemDate === defaultItemDate}
                            />
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

const EmptyStateDropZone = ({ active, checklistId = 'inbox' }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${checklistId}-0`,
        data: { type: 'FABSlot' }
    });

    if (!active) return null;

    return (
        <div
            ref={setNodeRef}
            style={{
                height: isOver ? '120px' : '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isOver ? '2px dashed var(--primary-color)' : '2px dashed rgba(var(--primary-rgb), 0.2)',
                borderRadius: 'var(--radius-lg)',
                margin: '1rem 0',
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)',
                background: isOver ? 'rgba(var(--primary-rgb), 0.05)' : 'rgba(var(--primary-rgb), 0.01)',
                color: isOver ? 'var(--primary-color)' : 'var(--text-secondary)',
                gap: '0.8rem',
                cursor: 'pointer',
                transform: isOver ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isOver ? '0 0 20px rgba(var(--primary-rgb), 0.1)' : 'none',
            }}
        >
            <Plus size={24} style={{ 
                opacity: isOver ? 1 : 0.6,
                transform: isOver ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)'
            }} />
            <span style={{ 
                fontWeight: 600, 
                opacity: isOver ? 1 : 0.8,
                fontSize: '1.05rem',
                transition: 'all 0.3s ease'
            }}>
                {isOver ? 'שחרר כאן להוספת משימה' : 'גרור לכאן כדי להוסיף משימה'}
            </span>
        </div>
    );
};

export { EmptyStateDropZone };
export default memo(SortableChecklistCard);
