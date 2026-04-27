import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import { User, Save, X, Settings, Bell, Palette, Layout, CreditCard, Trash2, ShieldCheck, HelpCircle, Users, UserPlus, Check, Search, Menu, LogOut, Moon, Sun, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '../context/ThemeContext';
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../services/NotificationService';
import useHistoryModal from '../hooks/useHistoryModal';
import QuickAddSettings from './TaskComponents/QuickAddSettings';

const API_URL = '/api';

const SettingsModal = ({ isOpen, onClose, initialTab = 'account' }) => {
    const { user, updateUser, logout, authFetch } = useUser();
    const { theme, changeTheme } = useTheme();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const [activeTab, setActiveTab] = useState(initialTab);
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isMobileViewMode, setIsMobileViewMode] = useState(window.innerWidth <= 992);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const fileInputRef = useRef(null);

    useHistoryModal(isOpen, onClose, 'settings');

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setPushEnabled(!!subscription);
                });
            });
        }
    }, [isOpen]);

    // Sync input when modal opens/user loads
    useEffect(() => {
        if (isOpen) {
            setUsername(user?.username || '');
            setEmail(user?.email || '');
            setPhone(user?.phone || '');
            setWhatsappEnabled(user?.whatsapp_enabled ? true : false);
            setAvatarPreview(user?.profile_image || null);
            setActiveTab(initialTab); // Re-sync tab if it was opened from a specific button
            setIsMobileViewMode(initialTab === 'account' ? false : window.innerWidth <= 992); // Land directly on Account if specified
            // Slight delay to allow CSS transitions to pop the modal
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen, user, initialTab]);

    useEffect(() => {
        if (activeTab === 'friends' && isOpen) {
            fetchFriends();
        }
    }, [activeTab, isOpen]);

    const fetchFriends = async () => {
        try {
            const res = await authFetch(`${API_URL}/users/current/friends`);
            if (res.ok) setFriends(await res.json());
        } catch (e) { console.error('Error fetching friends', e); }
    };

    const handleSearchUsers = async (e) => {
        setSearchQuery(e.target.value);
        if (!e.target.value.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await authFetch(`${API_URL}/users/search?q=${e.target.value}&excludeUserId=current`);
            if (res.ok) setSearchResults(await res.json());
        } catch (error) {
            console.error('Search error', error);
        }
        setIsSearching(false);
    };

    const sendFriendRequest = async (receiver_id) => {
        try {
            const res = await authFetch(`${API_URL}/friends/request`, {
                method: 'POST',
                body: JSON.stringify({ requester_id: user.id, receiver_id })
            });
            if (res.ok) {
                toast.success('בקשת חברות נשלחה בהצלחה!');
                fetchFriends();
                setSearchQuery('');
                setSearchResults([]);
            } else {
                toast.error('הבקשה כבר קיימת');
            }
        } catch (error) {
            toast.error('שגיאה בשליחת בקשה');
        }
    };

    const acceptFriendRequest = async (requestId) => {
        try {
            const res = await authFetch(`${API_URL}/friends/accept/${requestId}`, { method: 'PUT' });
            if (res.ok) {
                toast.success('בקשת חברות אושרה!');
                fetchFriends();
            }
        } catch (error) {
            toast.error('שגיאה באישור חברות');
        }
    };

    const handleTogglePushNotifications = async () => {
        if (pushEnabled) {
            const result = await unsubscribeFromPushNotifications(authFetch);
            if (result.success) {
                setPushEnabled(false);
                toast.success('קבלת התראות הופסקה');
            } else {
                toast.error('שגיאה בהפסקת התראות: ' + result.error);
            }
        } else {
            const result = await subscribeToPushNotifications(authFetch);
            if (result.success) {
                setPushEnabled(true);
                toast.success('קבלת התראות הופעלה בהצלחה');
            } else {
                toast.error('שגיאה בהפעלת התראות: ' + result.error);
            }
        }
    };
    
    const resendVerification = async () => {
        setIsResending(true);
        try {
            const res = await authFetch(`${API_URL}/auth/resend-verification`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                if (data.alreadyVerified) {
                    updateUser(data.user);
                    toast.success('החשבון כבר מאומת! המצב עודכן.');
                } else {
                    toast.success('אימייל אימות נשלח שוב בהצלחה!');
                }
            } else {
                toast.error(data.error || 'שגיאה בשליחת אימייל');
            }
        } catch (e) {
            toast.error('שגיאת רשת');
        } finally {
            setIsResending(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את החשבון? כל הנתונים שלך יישמרו אך לא תוכל להיכנס למערכת יותר.')) return;
        
        setIsSaving(true);
        try {
            const res = await authFetch(`${API_URL}/users/current`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('החשבון נמחק בהצלחה. להתראות!');
                logout();
            } else {
                const data = await res.json();
                toast.error(data.error || 'שגיאה במחיקת החשבון');
            }
        } catch (e) {
            toast.error('שגיאת רשת');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const handleImageClick = () => fileInputRef.current?.click();

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await authFetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setAvatarPreview(data.url);
            } else {
                const data = await res.json().catch(() => ({}));
                toast.error(data.error || 'שגיאה בהעלאת התמונה');
            }
        } catch (err) {
            console.error('Upload Error:', err);
            toast.error('שגיאת רשת בעת העלאת התמונה');
        }
    };

    const handleRemoveImage = () => setAvatarPreview('');

    const isNameChanged = username.trim() !== user?.username && username.trim() !== '';
    const isEmailChanged = email.trim() !== (user?.email || '');
    const isPhoneChanged = phone.trim() !== (user?.phone || '');
    const isWhatsappChanged = whatsappEnabled !== (user?.whatsapp_enabled ? true : false);
    const currentProfileImage = user?.profile_image || null;
    const isAvatarChanged = avatarPreview !== currentProfileImage;
    const hasChanges = isNameChanged || isAvatarChanged || isEmailChanged || isPhoneChanged || isWhatsappChanged;

    const handleSave = async (e) => {
        e.preventDefault();

        const trimmedName = username.trim();
        const trimmedEmail = email.trim();
        if (!trimmedName) {
            toast.error('שם משתמש לא יכול להיות ריק');
            return;
        }

        if (!hasChanges) {
            onClose(); // Just close if no changes
            return;
        }

        setIsSaving(true);
        try {
            const bodyData = { username: trimmedName };
            if (isAvatarChanged) {
                bodyData.profile_image = avatarPreview === '' ? null : avatarPreview;
            }
            if (isEmailChanged) {
                bodyData.email = trimmedEmail === '' ? null : trimmedEmail;
            }
            if (isPhoneChanged) {
                bodyData.phone = phone.trim() === '' ? null : phone.trim();
            }
            if (isWhatsappChanged) {
                bodyData.whatsapp_enabled = whatsappEnabled;
            }

            const res = await authFetch(`${API_URL}/users/current`, {
                method: 'PUT',
                body: JSON.stringify(bodyData)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                updateUser(updatedUser);
                toast.success('השם עודכן בהצלחה!');
                onClose();
            } else if (res.status === 409) {
                toast.error('שם המשתמש כבר קיים במערכת, אנא בחר שם אחר.');
            } else {
                toast.error('אירעה שגיאה בעת עדכון השם.');
            }
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('שגיאת רשת. אנא נסה שוב.');
        } finally {
            setIsSaving(false);
        }
    };

    const navItems = [
        { id: 'account', label: 'חשבון שלי', icon: User },
        { id: 'friends', label: 'חברים', icon: Users },
        { id: 'quick_add', label: 'הוספה מהירה', icon: Sparkles },
        { id: 'general', label: 'כללי', icon: Settings },
        { id: 'subscription', label: 'מנוי', icon: CreditCard },
        { id: 'theme', label: 'עיצוב', icon: Palette },
        { id: 'sidebar', label: 'סרגל צד', icon: Layout },
        { id: 'notifications', label: 'התראות', icon: Bell },
        { id: 'security', label: 'אבטחה', icon: ShieldCheck },
    ];

    return createPortal(
        <div
            className="modal-overlay"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: window.innerWidth <= 992 ? 0 : '1rem',
                opacity: isVisible ? 1 : 0, transition: 'opacity 0.25s ease-out'
            }}
            onClick={onClose}
        >
            <div
                className={`settings-modal-container slide-up modal-full-mobile mobile-modal-fullscreen`}
                style={{
                    width: window.innerWidth <= 992 ? '100vw' : '95%',
                    height: window.innerWidth <= 992 ? '100dvh' : '85vh',
                    maxHeight: window.innerWidth <= 992 ? 'none' : '800px',
                    maxWidth: window.innerWidth <= 992 ? 'none' : '1000px',
                    margin: 0,
                    padding: 0,
                    position: 'relative',
                    background: 'var(--bg-color)',
                    display: 'flex',
                    overflow: 'hidden'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Desktop Sidebar Navigation */}
                <div
                    className="settings-sidebar"
                    style={{
                        width: window.innerWidth <= 992 ? '100%' : '300px',
                        background: 'var(--bg-secondary)',
                        borderLeft: '1px solid var(--border-color)',
                        display: (window.innerWidth > 992 || isMobileViewMode) ? 'flex' : 'none',
                        flexDirection: 'column',
                        height: '100%'
                    }}
                >
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>הגדרות</h2>
                    </div>

                    <nav style={{ flexGrow: 1, padding: '0.75rem', overflowY: 'auto' }}>
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setIsMobileViewMode(false); }}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.6rem 0.75rem', marginBottom: '4px', borderRadius: 'var(--radius-sm)',
                                    border: 'none',
                                    background: activeTab === item.id ? 'var(--sidebar-active-bg)' : 'transparent',
                                    color: activeTab === item.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                                    cursor: 'pointer', transition: 'all 0.15s ease', textAlign: 'right',
                                    fontWeight: activeTab === item.id ? 600 : 500
                                }}
                                className="settings-nav-item"
                            >
                                <div style={{ width: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                                    <item.icon size={18} strokeWidth={activeTab === item.id ? 2 : 1.8} />
                                </div>
                                <span style={{ fontSize: '0.95rem' }}>{item.label}</span>
                            </button>
                        ))}
                    </nav>

                    <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
                        <button
                            onClick={logout}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '1rem 1.5rem', borderRadius: '12px', border: '1px solid var(--danger-color)',
                                background: 'transparent', color: 'var(--danger-color)', cursor: 'pointer',
                                fontWeight: 600, fontSize: '0.95rem'
                            }}
                        >
                            <LogOut size={18} />
                            יציאה מהמערכת
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div
                    className="settings-main-area"
                    style={{
                        flexGrow: 1,
                        display: (window.innerWidth > 992 || !isMobileViewMode) ? 'flex' : 'none',
                        flexDirection: 'column',
                        height: '100%',
                        overflow: 'hidden',
                        background: 'var(--bg-color)',
                        position: 'relative'
                    }}
                >
                    {/* Compact Header for Mobile */}
                    {window.innerWidth <= 992 && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            borderBottom: '1px solid var(--border-color)',
                            background: 'var(--bg-color)', zIndex: 110,
                            padding: '0.75rem 1.5rem',
                            flexShrink: 0
                        }}>
                            <button
                                onClick={onClose}
                                className="btn-icon-soft"
                                style={{ padding: '0.45rem', background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
                                title="סגור"
                            >
                                <X size={22} />
                            </button>

                            <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                                {navItems.find(i => i.id === activeTab)?.label}
                            </h2>

                            <button
                                onClick={() => setIsMobileViewMode(true)}
                                className="btn-icon-soft"
                                style={{ padding: '0.45rem', background: 'transparent', color: 'var(--primary-color)' }}
                                title="תפריט הגדרות"
                            >
                                <Menu size={22} />
                            </button>
                        </div>
                    )}

                    {/* Desktop Close Button */}
                    {window.innerWidth > 992 && (
                        <button
                            onClick={onClose}
                            className="btn-icon-soft"
                            style={{
                                position: 'absolute', top: '1.25rem', right: '1.5rem',
                                padding: '0.5rem', background: 'transparent',
                                border: 'none', zIndex: 100
                            }}
                            title="סגור (Esc)"
                        >
                            <X size={24} />
                        </button>
                    )}

                    {/* Scrollable Content Body */}
                    <div
                        className="settings-scroll-content"
                        style={{
                            flexGrow: 1,
                            overflowY: 'auto',
                            padding: window.innerWidth <= 992 ? '1.5rem 1.5rem' : '2.5rem'
                        }}
                    >
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            {/* Desktop Header */}
                            {window.innerWidth > 992 && (
                                <h1 style={{
                                    fontSize: '1.5rem', borderBottom: '1px solid var(--border-color)',
                                    paddingBottom: '1rem', marginBottom: '2rem', color: 'var(--text-primary)'
                                }}>
                                    {navItems.find(i => i.id === activeTab)?.label}
                                </h1>
                            )}

                            {activeTab === 'quick_add' && (
                                <QuickAddSettings 
                                    settings={user?.quick_add_settings ? JSON.parse(user.quick_add_settings) : null}
                                    onSave={async (newSettings) => {
                                        try {
                                            const res = await authFetch(`${API_URL}/users/current`, {
                                                method: 'PUT',
                                                body: JSON.stringify({ quick_add_settings: newSettings })
                                            });
                                            if (res.ok) {
                                                const updatedUser = await res.json();
                                                updateUser(updatedUser);
                                            }
                                        } catch (error) {
                                            console.error('Error saving quick add settings:', error);
                                        }
                                    }}
                                />
                            )}

                            {/* Account Tab View */}
                            {activeTab === 'account' && (
                                <div className="fade-in">
                                    {/* Photo Section */}
                                    <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', textAlign: 'right' }}>תמונה</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                                            <div style={{
                                                width: '80px', height: '80px', borderRadius: '50%',
                                                aspectRatio: '1 / 1', flexShrink: 0,
                                                background: avatarPreview ? `url(${API_URL}${avatarPreview}) center/cover` : 'var(--primary-color)',
                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                                                border: '2px solid var(--border-color)', boxShadow: 'var(--shadow-sm)'
                                            }}>
                                                {!avatarPreview && <User size={40} />}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem' }}>
                                                <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" style={{ padding: '0.4rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer' }}>
                                                    החלף תמונה
                                                </button>
                                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>בחר תמונה עד 5MB. תמונה זו תהיה ציבורית.</p>
                                        </div>
                                    </div>

                                    {/* Name Section */}
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>שם</h3>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="הכנס שם מלא"
                                            style={{
                                                width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
                                                border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                                fontSize: '1rem', color: 'var(--text-primary)', minHeight: 'unset'
                                            }}
                                        />
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{username.length}/255</p>
                                    </div>

                                    {/* Email Section */}
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>אימייל</h3>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <p style={{ margin: 0, fontSize: '1rem', color: email ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                {email || 'לא הוגדר אימייל'}
                                            </p>
                                            <button className="btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem', borderRadius: '8px', cursor: 'pointer' }}>
                                                החלף אימייל
                                            </button>
                                        </div>
                                        {user && !user.is_verified && email && (
                                            <div style={{ 
                                                marginTop: '0.75rem', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.5rem', 
                                                color: '#ef4444', 
                                                fontSize: '0.85rem', 
                                                fontWeight: 600,
                                                background: 'rgba(239, 68, 68, 0.05)',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(239, 68, 68, 0.1)'
                                            }}>
                                                <ShieldCheck size={16} />
                                                <span>האימייל טרם אומת. בדוק את תיבת המייל שלך או </span>
                                                <button 
                                                    onClick={resendVerification} 
                                                    disabled={isResending}
                                                    style={{ 
                                                        background: 'none', 
                                                        border: 'none', 
                                                        color: 'var(--primary-color)', 
                                                        padding: 0, 
                                                        cursor: 'pointer', 
                                                        fontWeight: 800, 
                                                        fontSize: '0.85rem', 
                                                        textDecoration: 'underline' 
                                                    }}
                                                >
                                                    {isResending ? 'שולח...' : 'לחץ כאן לשליחה חוזרת'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Phone & WhatsApp Section */}
                                    <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(37, 211, 102, 0.05)', borderRadius: '12px', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 0.25rem', color: 'var(--text-primary)' }}>תזכורות בוואטסאפ</h3>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    קבל הודעת וואטסאפ אוטומטית כשיש לך משימה.
                                                </p>
                                            </div>
                                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={whatsappEnabled}
                                                    onChange={(e) => setWhatsappEnabled(e.target.checked)}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                    background: whatsappEnabled ? '#25D366' : 'var(--border-color)',
                                                    transition: '.3s', borderRadius: '24px'
                                                }}></span>
                                                <span style={{
                                                    position: 'absolute', content: '""', height: '18px', width: '18px',
                                                    left: whatsappEnabled ? '4px' : '26px', bottom: '3px', background: 'white',
                                                    transition: '.3s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}></span>
                                            </label>
                                        </div>
                                        {whatsappEnabled && (
                                            <div className="fade-in">
                                                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>מספר טלפון</h4>
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="לדוגמה: 0541234567"
                                                    style={{
                                                        width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px',
                                                        border: '1px solid var(--border-color)', background: 'var(--bg-color)',
                                                        fontSize: '1rem', color: 'var(--text-primary)', minHeight: 'unset'
                                                    }}
                                                />
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem', margin: '0.5rem 0 0' }}>יש להזין מספר טלפון ישראלי על מנת לקבל תזכורות.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Password Section */}
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>סיסמה</h3>
                                        <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer' }}>
                                            החלף סיסמה
                                        </button>
                                    </div>

                                    {/* Danger Zone */}
                                    <div style={{
                                        marginTop: '4rem', padding: '2rem', borderRadius: '12px',
                                        background: 'rgba(var(--danger-rgb), 0.05)', border: '1px solid var(--danger-color)'
                                    }}>
                                        <h3 style={{ fontSize: '1.05rem', margin: '0 0 0.5rem', color: 'var(--danger-color)' }}>מחק חשבון</h3>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem' }}>
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>
                                                מחיקת חשבונך היא פעולה קבועה. אתה תאבד מיידית גישה לכל הנתונים שלך. הנתונים יישמרו במערכת למקרה של טעות אך לא תוכל להתחבר יותר.
                                            </p>
                                            <button 
                                                type="button" 
                                                className="btn" 
                                                onClick={handleDeleteAccount}
                                                disabled={isSaving}
                                                style={{
                                                    background: 'var(--danger-color)', border: '1px solid var(--danger-color)',
                                                    color: 'white', padding: '0.6rem 1.2rem', fontSize: '0.9rem',
                                                    whiteSpace: 'nowrap', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                {isSaving ? 'מוחק...' : 'מחק חשבון'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Notifications Tab */}
                            {activeTab === 'notifications' && (
                                <div className="fade-in">
                                    <div style={{ marginBottom: '2.5rem' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>התראות דפדפן (Push)</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                            <div>
                                                <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.95rem', color: 'var(--text-primary)' }}>קבלת התראות למכשיר</h4>
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    קבל התראות מערכת גם כאשר האפליקציה סגורה.
                                                </p>
                                            </div>

                                            {/* Beautiful Toggle Switch */}
                                            <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '24px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={pushEnabled}
                                                    onChange={handleTogglePushNotifications}
                                                    style={{ opacity: 0, width: 0, height: 0 }}
                                                />
                                                <span style={{
                                                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                                    background: pushEnabled ? 'var(--primary-color)' : 'var(--border-color)',
                                                    transition: '.3s', borderRadius: '24px'
                                                }}></span>
                                                <span style={{
                                                    position: 'absolute', content: '""', height: '18px', width: '18px',
                                                    left: pushEnabled ? '4px' : '26px', bottom: '3px', background: 'white',
                                                    transition: '.3s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                                }}></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Theme (עיצוב) Tab */}
                            {activeTab === 'theme' && (
                                <div className="fade-in">
                                    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>בחר ערכת נושא</h3>
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                        gap: '1rem' 
                                    }}>
                                        {[
                                            { id: 'light', label: 'בהיר', color: '#FFFFFF', icon: Sun },
                                            { id: 'dark', label: 'כהה', color: '#1E293B', icon: Moon },
                                            { id: 'relaxed', label: 'רגוע', color: '#FAF9F7', icon: Sparkles },
                                            { id: 'midnight', label: 'חצות', color: '#020617', icon: Sparkles },
                                            { id: 'forest', label: 'יער', color: '#064E3B', icon: Sparkles },
                                            { id: 'sunset', label: 'שקיעה', color: '#4C1D95', icon: Sparkles },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => changeTheme(t.id)}
                                                className={`theme-swatch ${theme === t.id ? 'active' : ''}`}
                                                style={{
                                                    padding: '1rem',
                                                    borderRadius: '12px',
                                                    border: `2px solid ${theme === t.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                                    background: 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    transition: 'all 0.2s ease',
                                                    boxShadow: theme === t.id ? '0 4px 12px rgba(var(--primary-rgb), 0.2)' : 'none',
                                                    transform: theme === t.id ? 'scale(1.02)' : 'scale(1)'
                                                }}
                                            >
                                                <div style={{
                                                    width: '40px',
                                                    height: '40px',
                                                    borderRadius: '50%',
                                                    background: t.color,
                                                    border: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: t.id === 'light' ? '#475569' : '#FFFFFF'
                                                }}>
                                                    <t.icon size={20} />
                                                </div>
                                                <span style={{ 
                                                    fontSize: '0.9rem', 
                                                    fontWeight: 600, 
                                                    color: 'var(--text-primary)' 
                                                }}>{t.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div style={{ 
                                        marginTop: '3rem', 
                                        padding: '1.5rem', 
                                        background: 'rgba(var(--primary-rgb), 0.05)', 
                                        borderRadius: '12px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--primary-color)' }}>טיפ לעיצוב</h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                            שינוי ערכת הנושא משפיע על כל חלקי האפליקציה. אנחנו ממליצים על גרסת ה"חצות" לעבודה בלילה כדי לשמור על העיניים.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Other Tabs Placeholder */}
                            {activeTab !== 'account' && activeTab !== 'notifications' && activeTab !== 'theme' && (
                                <div className="fade-in" style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
                                    <Settings size={48} opacity={0.2} style={{ margin: '0 auto 1rem' }} />
                                    <h3>אזור בבנייה</h3>
                                    <p>הגדרות עבור תפריט זה יהיו זמינות בקרוב.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Truly Sticky Action Footer */}
                    {hasChanges && (
                        <div
                            className="fade-in slide-up"
                            style={{
                                background: 'var(--bg-color)',
                                padding: '1rem',
                                borderTop: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: '0.75rem',
                                zIndex: 105,
                                boxShadow: '0 -4px 10px rgba(0,0,0,0.05)',
                                flexShrink: 0
                            }}
                        >
                            <button
                                onClick={() => { setUsername(user?.username || ''); setAvatarPreview(user?.profile_image || null); setEmail(user?.email || ''); setPhone(user?.phone || ''); setWhatsappEnabled(user?.whatsapp_enabled ? true : false); }}
                                className="btn-secondary"
                                style={{
                                    padding: '0.6rem 0', borderRadius: '8px', cursor: 'pointer',
                                    width: '110px', fontWeight: 600, fontSize: '0.95rem',
                                    border: '1px solid var(--border-color)', background: 'var(--bg-secondary)'
                                }}
                            >
                                ביטול
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn-primary"
                                disabled={isSaving}
                                style={{
                                    padding: '0.6rem 0', borderRadius: '8px', cursor: 'pointer',
                                    width: '110px', fontWeight: 600, fontSize: '0.95rem'
                                }}
                            >
                                {isSaving ? 'שומר...' : 'שמור שינויים'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SettingsModal;
