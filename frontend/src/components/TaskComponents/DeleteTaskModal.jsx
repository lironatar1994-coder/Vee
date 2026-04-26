import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useHistoryModal from '../../hooks/useHistoryModal';

/**
 * DeleteTaskModal - A high-fidelity confirmation modal inspired by modern task management apps.
 * Supports Hebrew/RTL and theme-aware colors via CSS variables.
 */
const DeleteTaskModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    taskName = ''
}) => {
    const modalRef = useRef(null);
    useHistoryModal(isOpen, onClose, 'delete-confirm');

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    return createPortal(
        <div 
            onClick={handleBackdropClick}
            className="delete-modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 10000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(2px)',
                direction: 'rtl',
                animation: 'modalFadeIn 0.2s ease-out'
            }}
        >
            <div 
                ref={modalRef}
                className="delete-modal-card"
                style={{
                    backgroundColor: 'var(--bg-color, #ffffff)',
                    borderRadius: '20px',
                    width: '100%',
                    maxWidth: '540px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    padding: '2rem',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header */}
                <h2 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'var(--text-primary, #1a1a1a)',
                    textAlign: 'right'
                }}>
                    מחיקת משימה?
                </h2>

                {/* Content */}
                <p style={{
                    margin: '0 0 2rem 0',
                    fontSize: '1rem',
                    color: 'var(--text-secondary, #4b5563)',
                    textAlign: 'right',
                    lineHeight: '1.5'
                }}>
                    המשימה <span style={{ fontWeight: '700' }}>{taskName}</span> תימחק לצמיתות.
                </p>

                {/* Actions */}
                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-start', // Buttons at the bottom right in RTL
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '0.6rem 1.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: 'var(--bg-inset, #F1F5F9)',
                            color: 'var(--text-primary, #1a1a1a)',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        ביטול
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.6rem 1.75rem',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: '#334155', // Slate Blue from reference
                            color: '#FFFFFF',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        מחק
                    </button>
                </div>
            </div>

            <style>
                {`
                    @keyframes modalFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modalSlideUp {
                        from { transform: translateY(10px) scale(0.98); opacity: 0; }
                        to { transform: translateY(0) scale(1); opacity: 1; }
                    }
                `}
            </style>
        </div>,
        document.body
    );
};

export default DeleteTaskModal;
