import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, UserPlus, Trash2, Heart, ArrowRight, ChevronDown } from 'lucide-react';
import useHistoryModal from '../hooks/useHistoryModal';

const API_URL = '/api';

const ProjectTeamModal = ({
    isOpen,
    onClose,
    project,
    user,
    members,
    friends,
    onAddMember,
    onRemoveMember,
    onUpdateMemberRole
}) => {
    const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [activeRoleDropdown, setActiveRoleDropdown] = useState(null); // userID of member with open dropdown
    const modalRef = useRef(null);

    useHistoryModal(isOpen, onClose, 'project-team');

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Handle triggering the global friends modal
    const handleGoToFriends = () => {
        onClose();
        window.dispatchEvent(new CustomEvent('openFriendsModal'));
    };

    if (!isOpen) return null;

    // Responsive sizing and positioning
    // On mobile: 80% width, spawned top-right
    // On desktop: 380px width, spawned top-right
    const modalStyle = {
        position: 'fixed',
        top: '56px', // Matches standard header height to remove gap
        left: isMobile ? '5%' : 'auto', // Centered on mobile (5% + 90% + 5% = 100%)
        right: isMobile ? '5%' : '20px', 
        width: isMobile ? '90%' : '380px',
        maxHeight: 'calc(100vh - 80px)',
        background: 'var(--bg-color)',
        borderRadius: isMobile ? '0 0 var(--radius-lg) var(--radius-lg)' : 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border-color)',
        zIndex: 10001,
        overflow: 'hidden',
        pointerEvents: 'auto',
        direction: 'rtl',
        willChange: 'transform, opacity'
    };

    const roleMap = {
        'member': 'משתתף',
        'guest': 'אורח',
        'owner': 'מנהל'
    };

    const handleRoleChange = (memberId, newRole) => {
        onUpdateMemberRole(memberId, newRole);
        setActiveRoleDropdown(null);
    };

    const handleRemove = (memberId) => {
        if (window.confirm('האם אתה בטוח שברצונך להסיר חבר זה מהפרויקט?')) {
            onRemoveMember(memberId);
            setActiveRoleDropdown(null);
        }
    };

    return createPortal(
        <div 
            ref={modalRef}
            className="slide-down"
            style={modalStyle}
        >
            {/* Header - Zero gap, minimal padding */}
            <div style={{
                padding: '0.5rem 0.8rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-secondary)',
                minHeight: '40px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={16} style={{ color: 'var(--primary-color)' }} />
                    <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700 }}>צוות הפרויקט</h3>
                </div>
                <button onClick={onClose} className="btn-icon-soft" title="סגור" style={{ padding: '3px' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Content area - Reduced padding */}
            <div style={{ 
                flexGrow: 1, 
                overflowY: 'auto', 
                padding: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                {/* Members List */}
                <section>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {members.map(member => (
                            <div key={member.user_id} className="fade-in" style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                padding: '0.6rem 0.75rem', 
                                borderRadius: 'var(--radius-md)', 
                                border: '1px solid transparent',
                                hover: { background: 'var(--bg-secondary)' }
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', 
                                        background: member.profile_image ? `url(${API_URL}${member.profile_image}) center/cover` : 'var(--primary-color)', 
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 600
                                    }}>
                                        {!member.profile_image && (member.username?.charAt(0).toUpperCase() || '?')}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{member.username} {member.user_id === user.id && '(אני)'}</div>
                                    </div>
                                </div>

                                {/* Role Selector Dropdown */}
                                <div style={{ position: 'relative' }}>
                                    {member.role === 'owner' ? (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '4px 8px' }}>
                                            מנהל
                                        </div>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => setActiveRoleDropdown(activeRoleDropdown === member.user_id ? null : member.user_id)}
                                                style={{ 
                                                    background: 'var(--bg-secondary)', 
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    padding: '2px 8px',
                                                    fontSize: '0.75rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer',
                                                    color: 'var(--text-primary)'
                                                }}
                                            >
                                                {roleMap[member.role] || 'בחר תפקיד'}
                                                <ChevronDown size={12} />
                                            </button>

                                            {activeRoleDropdown === member.user_id && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    background: 'var(--bg-color)',
                                                    border: '1px solid var(--border-color)',
                                                    boxShadow: 'var(--shadow-lg)',
                                                    borderRadius: 'var(--radius-md)',
                                                    marginTop: '4px',
                                                    zIndex: 10002,
                                                    minWidth: '100px',
                                                    overflow: 'hidden'
                                                }}>
                                                    <button 
                                                        onClick={() => handleRoleChange(member.user_id, 'member')}
                                                        style={{ width: '100%', padding: '8px', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', hover: { background: 'var(--bg-secondary)' } }}
                                                    >
                                                        משתתף (תצוגה מלאה)
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRoleChange(member.user_id, 'guest')}
                                                        style={{ width: '100%', padding: '8px', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        אורח (צפייה בלבד)
                                                    </button>
                                                    <div style={{ height: '1px', background: 'var(--border-color)' }}></div>
                                                    <button 
                                                        onClick={() => handleRemove(member.user_id)}
                                                        style={{ width: '100%', padding: '8px', textAlign: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--danger-color)' }}
                                                    >
                                                        הסר מהפרויקט
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Add Section */}
                {project?.user_id === user.id && (
                    <section style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', fontWeight: 600 }}>הזמן חברים</h4>
                        
                        {friends.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', padding: '1rem', background: 'rgba(99, 102, 241, 0.03)', 
                                borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>עליך להוסיף חברים לרשימה האישית שלך.</p>
                                <button 
                                    onClick={handleGoToFriends}
                                    style={{ 
                                        background: 'none', border: 'none', color: 'var(--primary-color)', 
                                        fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '4px'
                                    }}
                                >
                                    <span>עבור לדף החברים</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {friends
                                    .filter(f => !members.some(pm => pm.user_id === (f.receiver_id === user.id ? f.requester_id : f.receiver_id)))
                                    .map(f => {
                                        const friendId = f.receiver_id === user.id ? f.requester_id : f.receiver_id;
                                        const friendName = user.username === f.username ? "חבר" : f.username;
                                        return (
                                            <div key={friendId} style={{ 
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                                padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', 
                                                borderRadius: 'var(--radius-sm)'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%', 
                                                        background: f.profile_image ? `url(${API_URL}${f.profile_image}) center/cover` : 'var(--primary-color)', 
                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem'
                                                    }}>
                                                        {!f.profile_image && (friendName?.charAt(0).toUpperCase() || '?')}
                                                    </div>
                                                    <span style={{ fontWeight: 500, fontSize: '0.8rem' }}>{friendName}</span>
                                                </div>
                                                <button 
                                                    onClick={() => onAddMember(friendId)} 
                                                    className="btn btn-primary" 
                                                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', borderRadius: '15px' }}
                                                >
                                                    צרף
                                                </button>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ProjectTeamModal;
