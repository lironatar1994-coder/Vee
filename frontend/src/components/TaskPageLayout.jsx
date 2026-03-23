import React, { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import { useHeader, useHeaderScroll } from '../context/HeaderContext';
import {
    DndContext,
    closestCenter,
    pointerWithin,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    MeasuringStrategy,
    rectIntersection
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import SortableTaskItem from './TaskComponents/SortableTaskItem';
import SortableChecklistCard from './TaskComponents/SortableChecklistCard';
import { GlobalFAB, GlobalFABOverlay } from './TaskComponents/index.jsx';


const dropAnimation = {
    duration: 180,
    easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: { opacity: '0.4' },
        },
    }),
};

// Lightweight ghost for Checklist overlay (Fix 3)
const ChecklistGhost = ({ checklist }) => (
    <div className="checklist-ghost glass-morphism" style={{
        padding: '1.2rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        minWidth: '300px',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
        direction: 'rtl'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-color)' }}>{checklist?.title || 'רשימה'}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', opacity: 0.6, marginRight: 'auto' }}>
                {checklist?.items?.length || 0} משימות
            </span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="skeleton-row" style={{ padding: '8px 0', border: 'none', opacity: 0.4 }}>
                    <div className="skeleton-box skeleton-circle" style={{ width: '18px', height: '18px' }}></div>
                    <div className="skeleton-box skeleton-text" style={{ height: '12px', width: `${40 + (i * 10) % 50}%` }}></div>
                </div>
            ))}
        </div>
    </div>
);

const TaskPageLayout = ({
    title,
    titleContent, // New slot for the large heading
    breadcrumb, // Optional breadcrumb text (e.g., "הפרויקטים שלי")
    headerActions,
    children,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragCancel,
    activeDragItem,
    maxWidth = '100%',
    padding = '0',
    externalScrollTop = null,
    onScroll = null,
    alternateHeaderPadding = "3.25rem",
    onCompletedToggle = null,
    isCompletedActive = false,
    showCompletedToggle = false
}) => {


    const [internalScrollTop, setInternalScrollTop] = useState(0);
    const { updateHeader } = useHeader();
    const { setScrollTop } = useHeaderScroll();
    const rawScrollTop = externalScrollTop !== null ? externalScrollTop : internalScrollTop;
    const scrollTop = Math.max(0, rawScrollTop);
    const { isSidebarOpen } = useOutletContext() || { isSidebarOpen: false };

    // Sync local state to global header context
    React.useEffect(() => {
        updateHeader({
            title,
            breadcrumb,
            headerActions,
            showCompletedToggle,
            isCompletedActive,
            onCompletedToggle
        });
    }, [title, breadcrumb, headerActions, showCompletedToggle, isCompletedActive, onCompletedToggle, updateHeader]);

    // Sync scroll to global header context
    React.useEffect(() => {
        setScrollTop(scrollTop);
    }, [scrollTop, setScrollTop]);

    // Fix 2: Throttle collision detection with requestAnimationFrame
    const rafRef = useRef(null);
    const lastCollisionResult = useRef([]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 15 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const getNumericId = (id) => {
        if (typeof id === 'string') {
            const parts = id.toString().split('-');
            const val = parseInt(parts[parts.length - 1], 10);
            return isNaN(val) ? id : val;
        }
        return id;
    };

    const smartCollisionDetection = useCallback((args) => {
        const { active, droppableContainers, pointerCoordinates } = args;

        if (!pointerCoordinates) return lastCollisionResult.current;

        const activeType = active?.data?.current?.type;

        // Fix 5: FAB collision only checks valid FABSlot/ListSlot targets — skip all task containers
        if (activeType === 'FAB') {
            const fabTargets = droppableContainers.filter(c => {
                const type = c.data.current?.type;
                return type === 'Task' || type === 'Checklist' || type === 'FABSlot' || type === 'ListSlot';
            });

            // 1. Precise Magnetic Snap for Gaps (Slots)
            // Give slots a "gravity" zone of 40px vertically
            const slots = droppableContainers.filter(c => c.data.current?.type === 'FABSlot' || c.data.current?.type === 'ListSlot');
            let magneticTarget = null;
            let minDistance = 45; // Gravity threshold in pixels

            slots.forEach(slot => {
                const rect = slot.rect.current;
                if (!rect || !pointerCoordinates) return;

                // Vertical distance to center of slot
                const centerY = rect.top + rect.height / 2;
                const distY = Math.abs(pointerCoordinates.y - centerY);

                // Horizontal distance to slot area (with some padding)
                const withinX = pointerCoordinates.x >= rect.left - 50 && pointerCoordinates.x <= rect.right + 50;

                if (withinX && distY < minDistance) {
                    minDistance = distY;
                    magneticTarget = slot;
                }
            });

            if (magneticTarget) {
                lastCollisionResult.current = [{ id: magneticTarget.id }];
                return [{ id: magneticTarget.id }];
            }

            const taskAndHeaderContainers = fabTargets.filter(c => {
                const type = c.data.current?.type;
                return type === 'Task' || type === 'Checklist';
            });

            // Check ListSlots first (they're the smart drop zones between lists)
            const listSlots = droppableContainers.filter(c => c.data.current?.type === 'ListSlot');
            const closestListSlot = closestCenter({ ...args, droppableContainers: listSlots });
            if (closestListSlot.length > 0) {
                const slot = listSlots.find(c => c.id === closestListSlot[0].id);
                if (slot?.rect.current) {
                    const { top, bottom } = slot.rect.current;
                    const { y } = pointerCoordinates;
                    if (y >= top - 30 && y <= bottom + 30) {
                        return [closestListSlot[0]];
                    }
                }
            }

            const closest = closestCenter({ ...args, droppableContainers: taskAndHeaderContainers });
            if (closest.length > 0) {
                const collision = closest[0];
                const target = taskAndHeaderContainers.find(c => c.id === collision.id);
                if (!target) return lastCollisionResult.current;

                const targetData = target.data.current;
                const targetRect = target.rect.current;

                if (targetData.type === 'Task' && targetRect) {
                    const { item, checklistId } = targetData;
                    const items = targetData.allItems || [];
                    const taskIndex = items.findIndex(i => i.id === item.id);
                    const relativeY = pointerCoordinates.y - targetRect.top;
                    const isTopHalf = relativeY < targetRect.height / 2;
                    const slotIndex = isTopHalf ? taskIndex : taskIndex + 1;
                    const slotId = `slot-${getNumericId(checklistId)}-${slotIndex}`;
                    const slotContainer = droppableContainers.find(c => c.id === slotId);
                    const result = slotContainer ? [{ id: slotId }] : [];
                    lastCollisionResult.current = result;
                    return result;
                }

                if (targetData.type === 'Checklist' && targetRect) {
                    const relativeY = pointerCoordinates.y - targetRect.top;
                    // Only snap to slot-0 if pointer is in the bottom part of the header area (avoid jumping over from above)
                    // Regular header is ~40-50px. If in top 15px, let it hit the slot above or return empty.
                    if (relativeY < 15 && targetRect.height > 60) return [];

                    const slotId = `slot-${getNumericId(target.id)}-0`;
                    const slotContainer = droppableContainers.find(c => c.id === slotId);
                    const result = slotContainer ? [{ id: slotId }] : [];
                    lastCollisionResult.current = result;
                    return result;
                }
            }
            lastCollisionResult.current = [];
            return [];
        }

        // Checklist reordering — pointer (entry) based for better control with long lists
        if (activeType === 'Checklist') {
            const checklistContainers = droppableContainers.filter(c => c.data.current?.type === 'Checklist');
            const closest = pointerWithin({ ...args, droppableContainers: checklistContainers });

            if (closest.length > 0) {
                const collision = closest[0];
                const target = checklistContainers.find(c => c.id === collision.id);
                if (!target) return lastCollisionResult.current;

                const targetRect = target.rect.current;
                if (targetRect) {
                    const relativeY = pointerCoordinates.y - targetRect.top;
                    const isTopHalf = relativeY < targetRect.height / 2;
                    const targetIdx = target.data.current.idx;
                    const slotIndex = isTopHalf ? targetIdx : targetIdx + 1;
                    const slotId = `list-slot-${slotIndex}`;
                    const slotContainer = droppableContainers.find(c => c.id === slotId);
                    const result = slotContainer ? [{ id: slotId }] : [];
                    lastCollisionResult.current = result;
                    return result;
                }
            }
        }

        const result = closestCenter(args);
        lastCollisionResult.current = result;
        return result;
    }, []);

    const handleScroll = (e) => {
        if (onScroll) onScroll(e.target.scrollTop);
        else setInternalScrollTop(e.target.scrollTop);
    };

    const isMobile = window.innerWidth <= 768;
    const sidePadding = isMobile ? '3.25rem' : '2.5rem';
    const hPadding = (isMobile && alternateHeaderPadding) ? alternateHeaderPadding : sidePadding;
    const topPadding = isMobile ? '60px' : '40px';
    const firstRowHeight = isMobile ? '70px' : '55px';

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={smartCollisionDetection}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.WhileDragging,
                    frequency: 'manual', // Optimize by not measuring everything every frame
                },
            }}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
        >
            <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>


                {/* Main Content Area (Title + Tasks/Lists) */}
                <div
                    className="page-content"
                    style={{
                        flexGrow: 1,
                        overflowY: activeDragItem ? 'hidden' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        overscrollBehavior: 'contain',
                        marginTop: '56px', // Keeps scrollbar below the absolute header
                        height: 'calc(100vh - 56px)' // Ensures proper height for scrolling
                    }}
                    onScroll={handleScroll}
                >
                    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                        {/* Removed empty first row - handled by marginTop */}

                        {/* Row 2: Title Row */}
                        <div style={{ padding: `${isMobile ? '10px' : '10px'} ${sidePadding} 12px` }}>
                            {titleContent}
                        </div>

                        {/* Row 3: Content Row */}
                        <div style={{ padding: `0 ${sidePadding} 100px` }}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>

            <GlobalFAB />

            <DragOverlay
                modifiers={[restrictToWindowEdges]}
                dropAnimation={dropAnimation}
                zIndex={9999}
                style={{
                    willChange: 'transform',
                    transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
                }}
            >
                {activeDragItem ? (
                    activeDragItem.data?.current?.type === 'Task' ? (
                        <div style={{ opacity: 0.95, cursor: 'grabbing', willChange: 'transform', width: activeDragItem.rect?.current?.initial?.width || 'auto' }}>
                            <SortableTaskItem
                                item={activeDragItem.data.current.item}
                                checklistId={activeDragItem.data.current.checklistId}
                                isCompletedFallback={false}
                                useProgressArray={false}
                                isOverlay={true}
                            />
                        </div>
                    ) : activeDragItem.data?.current?.type === 'Checklist' ? (
                        // Fix 3: Lightweight ghost instead of full card render
                        <ChecklistGhost checklist={activeDragItem.data.current.checklist} />
                    ) : activeDragItem.data?.current?.type === 'FAB' ? (
                        <GlobalFABOverlay />
                    ) : null
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default TaskPageLayout;
