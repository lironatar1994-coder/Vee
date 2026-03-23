import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext } from 'react-router-dom';
import {
    DndContext,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragOverlay,
    closestCenter,
    pointerWithin,
    defaultDropAnimationSideEffects,
    MeasuringStrategy
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import SortableTaskItem from './TaskComponents/SortableTaskItem';
import { GlobalFAB, GlobalFABOverlay } from './TaskComponents/index.jsx';

import { useHeader, useHeaderScroll } from '../context/HeaderContext';

const CalendarPageLayout = ({
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
    maxWidth = '100%', // Changed default to 100% for Calendar
    padding = null, // Renamed/repurposed to allow custom side padding
    externalScrollTop = null,
    onScroll = null,
    alternateHeaderPadding = "1.5rem",
    contentPadding = null,
    onCompletedToggle = null,
    isCompletedActive = false,
    showCompletedToggle = false,
    forceHeaderTitle = false
}) => {
    const [internalScrollTop, setInternalScrollTop] = useState(0);
    const { updateHeader } = useHeader();
    const { setScrollTop } = useHeaderScroll();
    const scrollTop = externalScrollTop !== null ? externalScrollTop : internalScrollTop;
    const { isSidebarOpen } = useOutletContext() || { isSidebarOpen: false };

    // Sync local state to global header context
    React.useEffect(() => {
        updateHeader({
            title,
            breadcrumb,
            headerActions,
            showCompletedToggle,
            isCompletedActive,
            onCompletedToggle,
            forceShowTitle: forceHeaderTitle
        });
    }, [title, breadcrumb, headerActions, showCompletedToggle, isCompletedActive, onCompletedToggle, updateHeader, forceHeaderTitle]);

    // Sync scroll to global header context
    React.useEffect(() => {
        setScrollTop(scrollTop);
    }, [scrollTop, setScrollTop]);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 3 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 50, tolerance: 10 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleScroll = (e) => {
        if (onScroll) onScroll(e.target.scrollTop);
        else setInternalScrollTop(e.target.scrollTop);
    };

    // Custom collision strategy for the FAB to make it feel like "Sorting"
    const fabSmartCollisionDetection = useCallback((args) => {
        const { active, droppableContainers, pointerCoordinates } = args;
        
        // If not dragging the FAB, use standard closestCenter
        if (active?.id !== 'global-fab-draggable') {
            return closestCenter(args);
        }

        if (!pointerCoordinates) return [];

        // 1. Find the closest Sortable task or Checklist header
        const taskAndHeaderContainers = droppableContainers.filter(c => {
            const type = c.data.current?.type;
            return type === 'Task' || type === 'checklist';
        });

        const closest = closestCenter({
            ...args,
            droppableContainers: taskAndHeaderContainers
        });

        if (closest.length > 0) {
            const collision = closest[0];
            const target = taskAndHeaderContainers.find(c => c.id === collision.id);
            if (!target) return [];

            const targetData = target.data.current;
            const targetRect = target.rect.current;

            if (targetData.type === 'Task' && targetRect) {
                const { item, checklistId } = targetData;
                const items = targetData.allItems || [];
                const taskIndex = items.findIndex(i => i.id === item.id);
                
                const relativeY = pointerCoordinates.y - targetRect.top;
                const isTopHalf = relativeY < targetRect.height / 2;

                const slotIndex = isTopHalf ? taskIndex : taskIndex + 1;
                const slotId = `slot-${checklistId}-${slotIndex}`;

                const slotContainer = droppableContainers.find(c => c.id === slotId);
                return slotContainer ? [{ id: slotId }] : [];
            }

            if (targetData.type === 'checklist' && targetRect) {
                const slotId = `slot-${target.id}-0`;
                const slotContainer = droppableContainers.find(c => c.id === slotId);
                return slotContainer ? [{ id: slotId }] : [];
            }
        }

        // Fallback for calendar-specific targets
        const calendarTargets = droppableContainers.filter(c => {
            const type = c.data.current?.type;
            return type === 'DayZone' || type === 'TimelineSlot' || type === 'Calendar';
        });

        return calendarTargets.length > 0 ? closestCenter({...args, droppableContainers: calendarTargets}) : [];
    }, []);

    const handleDragMove = useCallback((event) => {
        if (event.active?.id === 'global-fab-draggable' && event.pointerCoordinates) {
            window.lastFABPointer = { x: event.pointerCoordinates.x, y: event.pointerCoordinates.y };
            window.dispatchEvent(new CustomEvent('fabDragMove', { detail: window.lastFABPointer }));
        }
    }, []);

    const handleDragEndInternal = useCallback((event) => {
        window.dispatchEvent(new CustomEvent('fabDragEnd'));
        if (onDragEnd) onDragEnd(event);
    }, [onDragEnd]);

    const isMobile = window.innerWidth <= 768;
    const sidePadding = padding !== null ? padding : (isMobile ? '3.25rem' : '2.5rem');
    const hPadding = (isMobile && alternateHeaderPadding) ? alternateHeaderPadding : sidePadding;
    const firstRowHeight = isMobile ? '70px' : '55px';

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    };

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={fabSmartCollisionDetection}
            measuring={{
                droppable: {
                    strategy: MeasuringStrategy.Always,
                },
            }}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEndInternal}
            onDragCancel={(e) => {
                window.dispatchEvent(new CustomEvent('fabDragEnd'));
                if (onDragCancel) onDragCancel(e);
            }}
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
                    <div style={{ width: '100%', maxWidth: maxWidth, margin: '0 auto' }}>
                        {/* Removed empty first row - handled by marginTop */}

                        {/* Row 2: Title Row */}
                        <div style={{ padding: `0 ${sidePadding} 20px` }}>
                            {titleContent}
                        </div>

                        {/* Row 3: Content Row */}
                        <div style={{ padding: contentPadding || `0 ${sidePadding} 100px` }}>
                            {children}
                        </div>
                    </div>
                </div>
            </div>

            <GlobalFAB />

            <DragOverlay modifiers={[restrictToWindowEdges]} dropAnimation={dropAnimation} zIndex={9999}>
                {activeDragItem ? (
                    activeDragItem.data?.current?.type === 'Task' ? (
                        <div style={{ opacity: 1, cursor: 'grabbing', width: activeDragItem.rect?.current?.initial?.width || 'auto' }}>
                            <SortableTaskItem
                                item={activeDragItem.data.current.item}
                                checklistId={activeDragItem.data.current.checklistId}
                                isCompletedFallback={false}
                                useProgressArray={false}
                                isOverlay={true}
                            />
                        </div>
                    ) : activeDragItem.data?.current?.type === 'FAB' ? (
                        <GlobalFABOverlay />
                    ) : null
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default CalendarPageLayout;
