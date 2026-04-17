import React, { useState, useEffect } from 'react';
import { MessageCircle, Settings, Send, History, CheckCircle2, Smartphone, Loader2, Activity, Users, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useHeaderScroll } from '../../context/HeaderContext';
import Header from '../../components/Header';
import { adminAuthFetch } from '../../services/adminAuthService';
import WhatsappTemplateEditor from '../../components/admin/WhatsappTemplateEditor';
import WhatsappLogsModal from '../../components/admin/WhatsappLogsModal';

const API_URL = '/api';

const WhatsappAdmin = () => {
    const [whatsappStatus, setWhatsappStatus] = useState('INITIALIZING');
    const [whatsappQr, setWhatsappQr] = useState(null);
    const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
    const [isDisableMsgEditorOpen, setIsDisableMsgEditorOpen] = useState(false);
    const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
    const [isTaskAdderEnabled, setIsTaskAdderEnabled] = useState(true);
    
    // Broadcast Feature
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    
    // Analytics Feature
    const [analytics, setAnalytics] = useState({ totalRemindersSent: 0, totalRemindersFailed: 0, enabledUsers: 0 });

    const { setScrollTop: setGlobalScrollTop } = useHeaderScroll();
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        setGlobalScrollTop(0);
        fetchWhatsappStatus();
        fetchSettings();
        fetchAnalytics();
        
        const interval = setInterval(fetchWhatsappStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleScroll = (e) => {
        const top = e.target.scrollTop;
        setScrollTop(top);
        setGlobalScrollTop(top);
    };

    const fetchWhatsappStatus = async () => {
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/whatsapp/status`);
            if (res.ok) {
                const data = await res.json();
                setWhatsappStatus(data.status);
                setWhatsappQr(data.qr);
            }
        } catch (e) {
            console.error('Error fetching WA status', e);
        }
    };

    const fetchSettings = async () => {
        try {
            const settingsRes = await adminAuthFetch(`${API_URL}/admin/settings/whatsapp_task_adder_enabled`);
            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                setIsTaskAdderEnabled(settingsData.value !== 'false');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/whatsapp/analytics`);
            if (res.ok) {
                const data = await res.json();
                setAnalytics(data);
            }
        } catch (err) {
            console.error('Failed to fetch analytics', err);
        }
    };

    const toggleTaskAdder = async () => {
        const newVal = !isTaskAdderEnabled;
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                body: JSON.stringify({ key: 'whatsapp_task_adder_enabled', value: newVal.toString() })
            });

            if (res.ok) {
                setIsTaskAdderEnabled(newVal);
                toast.success(newVal ? 'יצירת משימות מוואטסאפ הופעלה' : 'יצירת משימות מוואטסאפ הושבתה');
            } else {
                toast.error('שגיאה בעדכון ההגדרה');
            }
        } catch (err) {
            toast.error('שגיאה בשמירת שינויים');
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) {
            toast.error('ההודעה ריקה');
            return;
        }
        if (!window.confirm('האם אתה בטוח שברצונך לשלוח הודעה זו לכל המשתמשים הפעילים? פח זה יכניס לתור את ההודעות מיד.')) {
            return;
        }

        setIsBroadcasting(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/whatsapp/broadcast`, {
                method: 'POST',
                body: JSON.stringify({ message: broadcastMsg })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`נשלח בהצלחה ל-${data.count} משתמשים`);
                setBroadcastMsg('');
            } else {
                toast.error(data.error || 'שגיאה בשליחת הודעות');
            }
        } catch (e) {
            console.error(e);
            toast.error('שגיאת תקשורת');
        }
        setIsBroadcasting(false);
    };

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Header 
                scrollTop={scrollTop}
                hPadding={isMobile ? '1.5rem' : '2.5rem'}
                title="ניהול WhatsApp"
                isMobile={isMobile}
                isSidebarOpen={true}
            />

            <div
                className="page-content"
                style={{ flex: 1, overflowY: 'auto', padding: '4rem 1.5rem 2rem' }}
                onScroll={handleScroll}
            >
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>

                    {/* Section 1: Connection & Status */}
                    <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', border: `1px solid ${whatsappStatus === 'READY' ? 'var(--success-color)' : 'var(--border-color)'}`, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: whatsappStatus === 'READY' ? 'var(--success-color)20' : 'var(--primary-color)10', color: whatsappStatus === 'READY' ? 'var(--success-color)' : 'var(--primary-color)' }}>
                                <Smartphone size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>סטטוס חיבור</h2>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {whatsappStatus === 'INITIALIZING' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <Loader2 size={24} className="spin" style={{ color: 'var(--text-secondary)' }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>מאתחל שרת...</span>
                                </div>
                            )}

                            {whatsappStatus === 'NEEDS_SCAN' && whatsappQr && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <img src={whatsappQr} alt="QR Code" style={{ width: '200px', height: '200px', backgroundColor: '#fff', padding: '10px', borderRadius: '8px' }} />
                                    <span style={{ color: 'var(--danger-color)', fontSize: '0.9rem', textAlign: 'center' }}>סרוק את הברקוד לחיבור מחדש</span>
                                </div>
                            )}

                            {whatsappStatus === 'READY' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', background: 'var(--success-color)10', padding: '0.5rem 1rem', borderRadius: '20px', fontWeight: 600 }}>
                                        <CheckCircle2 size={18} /><span>הבוט מחובר ופעיל</span>
                                    </div>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>מודול שליחת משימות מוכן.</span>
                                </div>
                            )}
                            
                            {whatsappStatus === 'ERROR' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger-color)', background: 'var(--danger-color)10', padding: '0.5rem 1rem', borderRadius: '20px' }}>
                                    <XCircle size={18} /><span>שגיאת חיבור מעסיקה</span>
                                </div>
                            )}
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                             <button className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }} onClick={() => setIsLogsModalOpen(true)}>
                                <History size={16} /> יומני שליחה
                            </button>
                        </div>
                    </div>

                    {/* Section 2: Analytics */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                                <Activity size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>ביצועים ואנליטיקות</h2>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>{analytics.enabledUsers}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>משתמשים פעילים</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--success-color)' }}>{analytics.totalRemindersSent}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>הודעות שנשלחו</div>
                            </div>
                            <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '8px', textAlign: 'center', gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: analytics.totalRemindersFailed > 0 ? 'var(--danger-color)' : 'var(--text-primary)' }}>{analytics.totalRemindersFailed}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>שגיאות שליחה מרחוק</div>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Feature Toggles & Templates */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                                <Settings size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>הגדרות ותבניות</h2>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>מוח AI למשימות נכנסות</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>בנה משימות מהודעות ווטסאפ</div>
                                </div>
                                <button onClick={toggleTaskAdder} style={{
                                    width: '50px', height: '26px', borderRadius: '13px', border: 'none',
                                    background: isTaskAdderEnabled ? 'var(--success-color)' : 'var(--border-color)',
                                    position: 'relative', cursor: 'pointer', transition: 'background 0.3s'
                                }}>
                                    <div style={{
                                        width: '22px', height: '22px', background: 'white', borderRadius: '50%',
                                        position: 'absolute', top: '2px', left: isTaskAdderEnabled ? '26px' : '2px',
                                        transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }} />
                                </button>
                            </div>
                            
                            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setIsTemplateEditorOpen(true)}>
                                ערוך תבנית תזכורות
                            </button>
                            
                            {!isTaskAdderEnabled && (
                                <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => setIsDisableMsgEditorOpen(true)}>
                                    ערוך הודעת העדרות (השבתה)
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Section 4: Broadcasts */}
                    <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: '1 / -1' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                                <MessageCircle size={24} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>דיוור הודעות המוני (Broadcast)</h2>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                            שלח הודעת וואטסאפ מרוכזת לכל המשתמשים המחוברים. טוב עבור עדכוני מערכת חשובים.
                        </p>
                        <textarea
                            value={broadcastMsg}
                            onChange={(e) => setBroadcastMsg(e.target.value)}
                            placeholder="הכנס את תוכן ההודעה כאן..."
                            style={{ width: '100%', height: '120px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'none', fontFamily: 'system-ui' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn-primary" disabled={isBroadcasting} onClick={handleBroadcast} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem' }}>
                                {isBroadcasting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                                שגר הודעה
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <WhatsappTemplateEditor 
                isOpen={isTemplateEditorOpen} 
                onClose={() => setIsTemplateEditorOpen(false)} 
            />

            <WhatsappTemplateEditor 
                isOpen={isDisableMsgEditorOpen} 
                onClose={() => setIsDisableMsgEditorOpen(false)} 
                settingKey="whatsapp_task_adder_disabled_msg"
                title="עריכת הודעת השבתה"
                fallbackTemplate="יצירת משימות דרך וואטסאפ מושבתת כרגע."
                variables={[]}
            />

            <WhatsappLogsModal 
                isOpen={isLogsModalOpen} 
                onClose={() => setIsLogsModalOpen(false)} 
            />
        </div>
    );
};

export default WhatsappAdmin;
