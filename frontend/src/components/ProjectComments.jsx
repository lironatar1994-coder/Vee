import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageSquare, Send } from 'lucide-react';
import EmojiSelector from './EmojiSelector';

const API_URL = '/api';

const CommentSkeleton = ({ isMobile }) => (
    <div className="skeleton-row" style={{ border: 'none', padding: '10px 0', opacity: 1 }}>
        <div className="skeleton-circle" style={{ width: isMobile ? '40px' : '28px', height: isMobile ? '40px' : '28px' }} />
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="skeleton-text" style={{ width: '40%', height: '10px' }} />
            <div className="skeleton-text" style={{ width: '90%', height: '14px' }} />
        </div>
    </div>
);

const ProjectComments = ({
    isOpen,
    onClose,
    project,
    user,
    comments,
    loading,
    newComment,
    setNewComment,
    onPost
}) => {
    const commentsEndRef = useRef(null);
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const onEmojiSelect = (emoji) => {
        setNewComment(prev => prev + emoji);
    };

    const scrollToBottom = () => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatCommentDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const timeStr = date.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit' });

        if (date.toDateString() === now.toDateString()) {
            return `היום, ${timeStr}`;
        }

        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `אתמול, ${timeStr}`;
        }

        return date.toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [comments, isOpen]);

    if (!isOpen) return null;

    // Scale factors based on whether it is mobile or desktop
    const scale = isMobile ? 1.0 : 0.7; // 1.0 for mobile (original/larger), 0.7 for desktop (reduced as requested before)
    const modalWidth = isMobile ? '100%' : '420px';
    const modalHeight = isMobile ? '90vh' : '500px';

    return createPortal(
        <div style={{ direction: 'rtl' }}>
            <style>
                {`
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>
            <div
                className="fade-in"
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 9998,
                }}
                onClick={onClose}
            />
            <div
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center',
                    zIndex: 9999, padding: isMobile ? '0' : '1rem', pointerEvents: 'none'
                }}
            >
                <div
                    style={{
                        width: modalWidth, maxWidth: isMobile ? '100%' : '420px',
                        height: modalHeight, maxHeight: isMobile ? '90vh' : '500px',
                        background: 'var(--bg-color)',
                        borderRadius: isMobile ? '20px 20px 0 0' : 'var(--radius-lg)',
                        display: 'flex', flexDirection: 'column',
                        boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{
                        padding: `${0.75 * scale}rem ${1.25 * scale}rem`,
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        minHeight: isMobile ? '55px' : '40px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MessageSquare size={isMobile ? 20 : 16} style={{ color: 'var(--primary-color)' }} />
                            <h3 style={{ margin: 0, fontSize: isMobile ? '1.1rem' : '0.85rem', fontWeight: 600 }}>{project?.title || 'פרויקט'}</h3>
                        </div>
                        <button onClick={onClose} className="btn-icon-soft" title="סגור" style={{ padding: isMobile ? '6px' : '3px' }}>
                            <X size={isMobile ? 24 : 18} />
                        </button>
                    </div>

                    <div style={{
                        flexGrow: 1,
                        overflowY: 'auto',
                        padding: isMobile ? '1.25rem' : '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? '1.2rem' : '0.8rem'
                    }}>
                        {loading && comments.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <CommentSkeleton isMobile={isMobile} />
                                <CommentSkeleton isMobile={isMobile} />
                                <CommentSkeleton isMobile={isMobile} />
                            </div>
                        ) : comments.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                <MessageSquare size={isMobile ? 64 : 48} style={{ opacity: 0.2 }} />
                                <span style={{ fontSize: isMobile ? '1rem' : '0.8rem' }}>אין תגובות בפרויקט זה.</span>
                            </div>
                        ) : (
                            comments.map(comment => (
                                <div key={comment.id} className="fade-in" style={{ display: 'flex', gap: '0.7rem', flexDirection: 'row', animationDuration: '0.2s' }}>
                                    <div style={{
                                        width: isMobile ? '40px' : '28px',
                                        height: isMobile ? '40px' : '28px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        overflow: 'hidden'
                                    }}>
                                        {comment.profile_image ? (
                                            <img src={`${API_URL}${comment.profile_image}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{ fontWeight: 600, fontSize: isMobile ? '1rem' : '0.7rem' }}>{comment.username ? comment.username.charAt(0).toUpperCase() : '?'}</span>
                                        )}
                                    </div>
                                    <div style={{
                                        background: comment.user_id === user?.id ? 'rgba(var(--primary-rgb), 0.15)' : 'var(--bg-secondary)',
                                        border: comment.user_id === user?.id ? '1px solid rgba(var(--primary-rgb), 0.3)' : '1px solid var(--border-color)',
                                        padding: isMobile ? '0.8rem 1rem' : '0.5rem 0.8rem',
                                        borderRadius: 'var(--radius-lg)',
                                        maxWidth: '85%',
                                        position: 'relative',
                                        textAlign: 'right'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem', justifyContent: 'flex-start' }}>
                                            <span style={{ fontWeight: 600, fontSize: isMobile ? '0.9rem' : '0.75rem', color: 'var(--text-primary)' }}>{comment.username}</span>
                                            <span style={{ fontSize: isMobile ? '0.75rem' : '0.6rem', color: 'var(--text-secondary)' }}>
                                                {formatCommentDate(comment.created_at)}
                                            </span>
                                        </div>
                                        <p style={{
                                            margin: 0,
                                            fontSize: isMobile ? '1rem' : '0.75rem',
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.4,
                                            whiteSpace: 'pre-wrap',
                                            textAlign: 'right'
                                        }}>
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>

                    <div style={{ padding: isMobile ? '1rem' : '0.75rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)', position: 'relative' }}>
                        <form onSubmit={(e) => { e.preventDefault(); onPost(e); }} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                            <div style={{ marginBottom: isMobile ? '3px' : '2px' }}>
                                <EmojiSelector onEmojiSelect={onEmojiSelect} />
                            </div>
                            <textarea
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        if (e.altKey || isMobile) {
                                            // Add new line for Alt+Enter or on Mobile
                                        } else {
                                            // Desktop: Enter sends the message
                                            e.preventDefault();
                                            if (newComment.trim()) onPost(e);
                                        }
                                    }
                                }}
                                placeholder="כתוב תגובה..."
                                className="form-control hide-scrollbar"
                                rows="2"
                                style={{
                                    flexGrow: 1,
                                    borderRadius: '18px',
                                    padding: isMobile ? '0.75rem 1.25rem' : '0.6rem 0.8rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border-color)',
                                    fontSize: isMobile ? '1rem' : '0.85rem',
                                    resize: 'none',
                                    minHeight: isMobile ? '65px' : '52px',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    lineHeight: '1.4',
                                    scrollbarWidth: 'none',
                                    msOverflowStyle: 'none'
                                }}
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    const newHeight = Math.max(e.target.scrollHeight, isMobile ? 65 : 52);
                                    e.target.style.height = newHeight + 'px';
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!newComment.trim()}
                                className="btn btn-primary"
                                style={{
                                    width: isMobile ? '45px' : '34px',
                                    height: isMobile ? '45px' : '34px',
                                    borderRadius: '50%',
                                    padding: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={isMobile ? 18 : 14} style={{ transform: 'translateX(-1px)' }} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProjectComments;
