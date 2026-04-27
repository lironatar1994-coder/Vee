import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUser } from '../context/UserContext';
import { User, Save, X, Settings, Bell, Palette, Layout, CreditCard, Trash2, ShieldCheck, HelpCircle, Users, UserPlus, Check, Search, Menu, LogOut, Moon, Sun, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
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
    const [isMobileViewMode, setIsMobileViewMode] = useState(window.innerWidth <= 992);
    const [pushEnabled, setPushEnabled] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const fileInputRef = useRef(null);

    useHistoryModal(isOpen, onClose, 'settings');

    useEffect(() => {
        const handleResize = () => setIsMobileViewMode(window.innerWidth <= 992);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.pushManager.getSubscription().then(subscription => {
                    setPushEnabled(!!subscription);
                });
            });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setUsername(user?.username || '');
            setEmail(user?.email || '');
            setPhone(user?.phone || '');
            setWhatsappEnabled(user?.whatsapp_enabled ? true : false);
            setAvatarPreview(user?.profile_image || null);
            setActiveTab(initialTab);
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen, user, initialTab]);

    const handleTogglePushNotifications = async () => {
        const result = pushEnabled 
            ? await unsubscribeFromPushNotifications(authFetch)
            : await subscribeToPushNotifications(authFetch);
            
        if (result.success) {
            setPushEnabled(!pushEnabled);
            toast.success(pushEnabled ? 'קבלת התראות הופסקה' : 'קבלת התראות הופעלה בהצלחה');
        } else {
            toast.error('שגיאה: ' + result.error);
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
                    toast.success('החשבון כבר מאומת!');
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
        if (!window.confirm('האם אתה בטוח שברצונך למחוק את החשבון?')) return;
        
        setIsSaving(true);
        try {
            const res = await authFetch(`${API_URL}/users/current`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('החשבון נמחק בהצלחה');
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
            toast.error('שגיאת רשת');
        }
    };

    const isNameChanged = username.trim() !== user?.username && username.trim() !== '';
    const isEmailChanged = email.trim() !== (user?.email || '');
    const isPhoneChanged = phone.trim() !== (user?.phone || '');
    const isWhatsappChanged = whatsappEnabled !== (user?.whatsapp_enabled ? true : false);
    const isAvatarChanged = avatarPreview !== (user?.profile_image || null);
    const hasChanges = isNameChanged || isAvatarChanged || isEmailChanged || isPhoneChanged || isWhatsappChanged;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error('שם משתמש לא יכול להיות ריק');
            return;
        }

        if (!hasChanges) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            const bodyData = { 
                username: username.trim(),
                profile_image: avatarPreview === '' ? null : avatarPreview,
                email: email.trim() === '' ? null : email.trim(),
                phone: phone.trim() === '' ? null : phone.trim(),
                whatsapp_enabled: whatsappEnabled
            };

            const res = await authFetch(`${API_URL}/users/current`, {
                method: 'PUT',
                body: JSON.stringify(bodyData)
            });

            if (res.ok) {
                const updatedUser = await res.json();
                updateUser(updatedUser);
                toast.success('ההגדרות עודכנו בהצלחה!');
                onClose();
            } else if (res.status === 409) {
                toast.error('שם המשתמש כבר קיים במערכת');
            } else {
                toast.error('אירעה שגיאה בעת עדכון ההגדרות');
            }
        } catch (error) {
            toast.error('שגיאת רשת');
        } finally {
            setIsSaving(false);
        }
    };

    const navItems = [
        { id: 'account', label: 'חשבון שלי', icon: User },
        { id: 'quick_add', label: 'הוספה מהירה', icon: Sparkles },
        { id: 'general', label: 'כללי', icon: Settings },
        { id: 'subscription', label: 'מנוי', icon: CreditCard },
        { id: 'theme', label: 'עיצוב', icon: Palette },
        { id: 'sidebar', label: 'סרגל צד', icon: Layout },
        { id: 'notifications', label: 'התראות', icon: Bell },
        { id: 'security', label: 'אבטחה', icon: ShieldCheck },
    ];

    // On mobile, if we haven't picked a tab yet, we are in "mobile view mode" (sidebar only)
    // If we picked a tab, we show the main area.
    const showMobileMainArea = isMobileViewMode && activeTab !== null;

    return createPortal(
        <div className={`settings-modal-overlay ${isVisible ? 'visible' : ''}`} onClick={onClose}>
            <div className="settings-modal-container" onClick={e => e.stopPropagation()}>
                
                {/* Sidebar Navigation */}
                <div className="settings-sidebar">
                    <div className="settings-sidebar-header">
                        <h2>הגדרות</h2>
                    </div>

                    <nav className="settings-nav-container">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
                            >
                                <div className="settings-nav-icon">
                                    <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                                </div>
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className={`settings-main-area ${showMobileMainArea ? 'active' : ''}`}>
                    <div className="settings-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {isMobileViewMode && (
                                <button onClick={() => setActiveTab(null)} className="btn-icon-soft">
                                    <ChevronRight size={24} />
                                </button>
                            )}
                            <h2 className="fade-in">
                                {navItems.find(i => i.id === activeTab)?.label || 'בחר הגדרה'}
                            </h2>
                        </div>

                        <div className="settings-header-actions">
                            <button onClick={onClose} className="btn-icon-soft">
                                <X size={22} />
                            </button>
                        </div>
                    </div>

                    <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                        <div className="settings-content-wrapper">

                            {activeTab === 'quick_add' && (
                                <div className="magic-reveal">
                                    <QuickAddSettings 
                                        settings={(() => {
                                            try {
                                                return typeof user?.quick_add_settings === 'string' 
                                                    ? JSON.parse(user.quick_add_settings) 
                                                    : user?.quick_add_settings;
                                            } catch (e) {
                                                return null;
                                            }
                                        })()}
                                        onSave={async (newSettings) => {
                                            try {
                                                const res = await authFetch(`${API_URL}/users/current`, {
                                                    method: 'PUT',
                                                    body: JSON.stringify({ quick_add_settings: newSettings })
                                                });
                                                if (res.ok) {
                                                    const updatedUser = await res.json();
                                                    updateUser(updatedUser);
                                                    toast.success('הגדרות הוספה מהירה נשמרו');
                                                } else {
                                                    toast.error('שגיאה בשמירת ההגדרות');
                                                }
                                            } catch (err) {
                                                console.error(err);
                                                toast.error('שגיאת רשת בשמירת ההגדרות');
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {activeTab === 'account' && (
                                <div className="magic-reveal settings-page-container">
                                    <div className="settings-section">
                                        <h3 className="settings-section-title">תמונת פרופיל</h3>
                                        <div className="settings-avatar-section">
                                            <div 
                                                className="settings-avatar-circle"
                                                style={{
                                                    backgroundImage: avatarPreview ? `url(${API_URL}${avatarPreview})` : 'none',
                                                    backgroundColor: !avatarPreview ? 'var(--primary-color)' : 'transparent',
                                                    color: 'white'
                                                }}
                                            >
                                                {!avatarPreview && <User size={44} />}
                                            </div>
                                            <div className="settings-avatar-actions">
                                                <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
                                                    החלף תמונה
                                                </button>
                                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" style={{ display: 'none' }} />
                                                <p className="text-secondary" style={{ fontSize: '0.85rem' }}>תמונה זו תהיה ציבורית.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="settings-section">
                                        <h3 className="settings-section-title">פרטים אישיים</h3>
                                        <div className="settings-input-group">
                                            <label className="settings-label">שם מלא</label>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                className="settings-input"
                                                placeholder="הכנס שם מלא"
                                            />
                                        </div>
                                        <div className="settings-input-group">
                                            <label className="settings-label">אימייל</label>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className="settings-input"
                                                    disabled
                                                />
                                                <button className="btn-secondary">שנה</button>
                                            </div>
                                        </div>
                                        {user && !user.is_verified && (
                                            <div className="verification-banner">
                                                <ShieldCheck size={18} />
                                                <span>האימייל טרם אומת.</span>
                                                <button onClick={resendVerification} disabled={isResending} className="btn-link">
                                                    {isResending ? 'שולח...' : 'שלח שוב'}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="settings-whatsapp-box">
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>תזכורות בוואטסאפ</h3>
                                                <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
                                                    קבל הודעות אוטומטיות על משימות.
                                                </p>
                                            </div>
                                            <label className="premium-toggle">
                                                <input type="checkbox" checked={whatsappEnabled} onChange={(e) => setWhatsappEnabled(e.target.checked)} />
                                                <span className="premium-toggle-slider"></span>
                                            </label>
                                        </div>
                                        {whatsappEnabled && (
                                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                <label className="settings-label">מספר טלפון</label>
                                                <input
                                                    type="text"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="05XXXXXXXX"
                                                    className="settings-input"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="danger-zone">
                                        <div className="danger-zone-header">
                                            <div>
                                                <h3 style={{ margin: 0, color: 'var(--danger-color)', fontSize: '1.1rem' }}>מחיקת חשבון</h3>
                                                <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                                    פעולה זו היא קבועה. כל הנתונים שלך יימחקו לצמיתות.
                                                </p>
                                            </div>
                                            <button onClick={handleDeleteAccount} className="btn" style={{ background: 'var(--danger-color)', color: 'white' }}>
                                                מחק חשבון
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                             {activeTab === 'notifications' && (
                                 <div className="magic-reveal settings-page-container">
                                     <div className="settings-section">
                                         <h3 className="settings-section-title">התראות דפדפן</h3>
                                         <div className="settings-avatar-section" style={{ justifyContent: 'space-between' }}>
                                             <div>
                                                 <h4 style={{ margin: 0 }}>התראות Push</h4>
                                                 <p className="text-secondary" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>קבל התראות גם כשהאתר סגור.</p>
                                             </div>
                                             <label className="premium-toggle">
                                                 <input type="checkbox" checked={pushEnabled} onChange={handleTogglePushNotifications} />
                                                 <span className="premium-toggle-slider"></span>
                                             </label>
                                         </div>
                                     </div>
                                 </div>
                             )}

                             {activeTab === 'theme' && (
                                 <div className="magic-reveal settings-page-container">
                                     <h3 className="settings-section-title">ערכת נושא</h3>
                                     <div className="theme-grid">
                                         {[
                                             { id: 'light', label: 'בהיר', color: '#FFFFFF', icon: Sun },
                                             { id: 'dark', label: 'כהה', color: '#0F172A', icon: Moon },
                                             { id: 'relaxed', label: 'רגוע', color: '#FAF9F7', icon: Sparkles },
                                             { id: 'midnight', label: 'חצות', color: '#020617', icon: Sparkles },
                                             { id: 'forest', label: 'יער', color: '#064E3B', icon: Sparkles },
                                             { id: 'sunset', label: 'שקיעה', color: '#4C1D95', icon: Sparkles },
                                         ].map(t => (
                                             <button
                                                 key={t.id}
                                                 onClick={() => changeTheme(t.id)}
                                                 className={`theme-card ${theme === t.id ? 'active' : ''}`}
                                             >
                                                 <div className="theme-preview-circle" style={{ background: t.color, color: t.id === 'light' ? '#475569' : '#FFFFFF' }}>
                                                     <t.icon size={22} />
                                                 </div>
                                                 <span>{t.label}</span>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}

                            {['general', 'subscription', 'sidebar', 'security'].includes(activeTab) && (
                                <div className="fade-in" style={{ textAlign: 'center', padding: '4rem 0' }}>
                                    <Settings size={48} className="text-secondary" style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                                    <h3>בקרוב</h3>
                                    <p className="text-secondary">הגדרות אלו יהיו זמינות בעדכונים הבאים.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {hasChanges && (
                        <div className="settings-footer fade-in slide-up">
                            <button onClick={() => setUsername(user?.username || '')} className="btn-secondary">ביטול</button>
                            <button onClick={handleSave} className="btn-primary" disabled={isSaving}>
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
