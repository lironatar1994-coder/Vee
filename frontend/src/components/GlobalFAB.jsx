import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';

/**
 * GlobalFAB — Floating Action Button for adding tasks
 * 
 * Now integrated with dnd-kit for manual placement.
 * Tap -> Expand
 * Tapping again in expanded -> Fly to default position
 * Dragging from expanded -> Manual placement in list
 */

export const GlobalFAB = ({ isOverlay = false }) => {
    const location = useLocation();
    const [phase, setPhase] = useState('idle'); // 'idle' | 'flying' | 'done'
    const [flyStyle, setFlyStyle] = useState({});
    const fabRef = useRef(null);
    const phaseRef = useRef('idle');
    const wasDraggingRef = useRef(false);

    // Keep phaseRef in sync
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    // dnd-kit draggable hook
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: 'global-fab-draggable',
        data: { type: 'FAB' },
        disabled: phase === 'flying' || phase === 'done' || isOverlay
    });

    useEffect(() => {
        if (isDragging && window.navigator && window.navigator.vibrate) {
            // Double-haptic ping to feel distinct when "entering" drag mode
            window.navigator.vibrate([15, 30, 15]);
        }
    }, [isDragging]);

    // Track if we ever started dragging during this interaction

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10000,
        opacity: isDragging ? 0 : 0.9,
    } : {};

    // Context label
    const getContextLabel = () => {
        const path = location.pathname;
        if (path === '/today') return 'הוסף להיום';
        if (path === '/inbox') return 'הוסף לתיבה';
        if (path.startsWith('/project/')) return 'הוסף לפרויקט';
        if (path === '/calendar') return 'הוסף ליומן';
        return 'הוסף משימה';
    };

    // Reset on page change
    useEffect(() => {
        setPhase('idle');
        setFlyStyle({});
    }, [location.pathname]);

    useEffect(() => {
        const handleDone = () => {
            setPhase('done');
            setTimeout(() => setPhase('idle'), 600);
        };
        window.addEventListener('fabAddTaskOpened', handleDone);
        return () => window.removeEventListener('fabAddTaskOpened', handleDone);
    }, []);

    useEffect(() => {
        const handleClose = () => {
            if (phaseRef.current === 'done') {
                setPhase('idle');
            }
        };
        window.addEventListener('fabAddTaskClosed', handleClose);
        return () => window.removeEventListener('fabAddTaskClosed', handleClose);
    }, []);

    const triggerFly = useCallback(() => {
        const target = document.querySelector('[data-fab-target]');
        if (!target || !fabRef.current) {
            setPhase('done');
            window.dispatchEvent(new CustomEvent('fabAddTask'));
            return;
        }

        const fabRect = fabRef.current.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();

        const fabCenterX = fabRect.left + fabRect.width / 2;
        const fabCenterY = fabRect.top + fabRect.height / 2;
        const targetCenterX = targetRect.left + targetRect.width / 2;
        const targetCenterY = targetRect.top + targetRect.height / 2;

        const dx = targetCenterX - fabCenterX;
        const dy = targetCenterY - fabCenterY;

        setFlyStyle({
            transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.38)`,
            opacity: 0,
            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s ease',
        });

        setPhase('flying');

        setTimeout(() => {
            setPhase('done');
            window.dispatchEvent(new CustomEvent('fabAddTask'));
            setFlyStyle({});
        }, 220);
    }, []);

    const handleFABClick = useCallback((e) => {
        if (isDragging || wasDraggingRef.current) {
            wasDraggingRef.current = false;
            return;
        }
        triggerFly();
    }, [isDragging, triggerFly]);

    const path = location.pathname;
    const hideOnPage = path === '/history' || path === '/projects';
    if (hideOnPage) return null;

    const isIdle = phase === 'idle';
    const isFlying = phase === 'flying';
    const isDone = phase === 'done';

    return (
        <>
            {/* The Placeholder X at the original position when dragging */}
            {isDragging && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '1.75rem',
                        left: '1.75rem',
                        zIndex: 899,
                        width: '52px',
                        height: '52px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)',
                        opacity: 0.5,
                        pointerEvents: 'none'
                    }}
                >
                    <X size={22} strokeWidth={2.5} />
                </div>
            )}

            <div
                ref={setNodeRef}
                {...attributes}
                {...listeners}
                className="global-fab-container"
                style={{
                    position: 'fixed',
                    bottom: '1.75rem',
                    left: '1.75rem',
                    zIndex: 900,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.6rem',
                    direction: 'rtl',
                    pointerEvents: isDone || (isDragging && !isOverlay) ? 'none' : 'auto',
                    ...style
                }}
            >
                {isIdle && !isDragging && <div className="global-fab-label">{getContextLabel()}</div>}

                <button
                    ref={fabRef}
                    className={`global-fab ${isFlying ? 'flying' : ''} ${isDragging ? 'is-dragging' : ''} ${isDone ? 'done' : ''}`}
                    style={isFlying ? flyStyle : (isDragging ? { transform: 'scale(1.12)', boxShadow: '0 12px 30px rgba(var(--primary-rgb, 99, 102, 241), 0.5)' } : {})}
                    onClick={handleFABClick}
                    aria-label={getContextLabel()}
                    title={getContextLabel()}
                >
                    <Plus
                        size={22}
                        strokeWidth={2.5}
                        style={{
                            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        }}
                    />
                </button>
            </div>
        </>
    );
};

export const GlobalFABOverlay = () => {
    return (
        <div
            className="global-fab-container flying"
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem',
                direction: 'rtl',
                transform: 'scale(1.15)',
                opacity: 1,
                pointerEvents: 'none',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                willChange: 'transform',
                transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
            }}
        >
            <button className="global-fab flying" style={{ cursor: 'grabbing', background: 'var(--primary-color)', color: 'white' }}>
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
    );
};

export default GlobalFAB;
