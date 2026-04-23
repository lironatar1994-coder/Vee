import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Settings2, Layout, ArrowRight, Layers, Sparkles, Smartphone, CheckCircle2, History } from 'lucide-react';
import Header from '../../components/Header';
import { useHeaderScroll } from '../../context/HeaderContext';
import UnifiedTemplateEditor from '../../components/admin/UnifiedTemplateEditor';
import { adminAuthFetch } from '../../services/adminAuthService';

const PAGE_TITLE = 'סטודיו לתקשורת ותבניות';

const TEMPLATES = [
    {
        id: 'tpl_wa_reset',
        title: 'איפוס סיסמה (WhatsApp)',
        type: 'whatsapp',
        description: 'ההודעה שנשלחת כשהמשתמש מבקש לאפס סיסמה דרך הוואטסאפ.',
        category: 'אבטחה',
        icon: <MessageSquare size={20} />,
        fallback: '*Vee* - איפוס סיסמה \n\nהיי {{user_name}}, לחץ על הקישור הבא כדי לאפס את הסיסמה שלך:\n{{reset_link}}\n\nהקישור תקף ל-15 דקות.',
        variables: [
            { key: 'user_name', label: 'שם המשתמש', example: 'לירון' },
            { key: 'reset_link', label: 'קישור לאיפוס', example: 'https://vee-app.co.il/reset-password?token=...' }
        ]
    },
    {
        id: 'tpl_email_reset',
        title: 'איפוס סיסמה (Email)',
        type: 'email',
        description: 'תוכן האימייל שנשלח כשהמשתמש מבקש לאפס סיסמה (עבור משתמשים ללא וואטסאפ).',
        category: 'אבטחה',
        icon: <Mail size={20} />,
        fallback: 'קיבלנו בקשה לאיפוס הסיסמה עבור חשבון ה-Vee שלך. לחץ על הכפתור למטה כדי להמשיך בתהליך.',
        variables: [
            { key: 'user_name', label: 'שם המשתמש', example: 'לירון' },
            { key: 'reset_link', label: 'קישור לאיפוס', example: 'https://vee-app.co.il/reset-password?token=...' }
        ]
    },
    {
        id: 'whatsapp_template',
        title: 'תזכורת יומית למשימות',
        type: 'whatsapp',
        description: 'תבנית ברירת המחדל להודעות תזכורת אוטומטיות על משימות.',
        category: 'משימות',
        icon: <Smartphone size={20} />,
        fallback: '*_Vee Reminder_*\nשלום {{user_name}},\n\nתזכורת למשימה: *{{task_name}}*\nנקבע לשעה: {{task_time}}\n\nבהצלחה!',
        variables: [
            { key: 'user_name', label: 'שם המשתמש', example: 'לירון' },
            { key: 'task_name', label: 'שם המשימה', example: 'פגישה חשובה' },
            { key: 'task_time', label: 'שעה', example: '16:00' }
        ]
    },
    {
        id: 'tpl_email_verify',
        title: 'אימות חשבון (Email)',
        type: 'email',
        description: 'האימייל שנשלח למשתמשים חדשים כדי לאמת את זהותם.',
        category: 'אבטחה',
        icon: <Mail size={20} />,
        fallback: 'שלום {user_name},\n\nברוכים הבאים ל-Vee! כדי לאמת את החשבון שלכם ולהתחיל להשתמש באפליקציה, לחצו על הקישור הבא:\n{verify_link}\n\nבהצלחה!\nצוות Vee',
        variables: [
            { key: 'user_name', label: 'שם המשתמש', example: 'לירון' },
            { key: 'verify_link', label: 'קישור לאימות', example: 'https://vee-app.co.il/verify?token=...' }
        ]
    }
];

const CommunicationStudio = () => {
    const { setScrollTop: setGlobalScrollTop } = useHeaderScroll();
    const [scrollTop, setScrollTop] = useState(0);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [stats, setStats] = useState({ total_sent: 0, pending: 0, failed: 0 });

    useEffect(() => {
        setGlobalScrollTop(0);
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await adminAuthFetch('/api/admin/whatsapp/analytics');
            if (res.ok) {
                const data = await res.json();
                setStats({
                    total_sent: data.totalRemindersSent,
                    failed: data.totalRemindersFailed,
                    active_users: data.enabledUsers
                });
            }
        } catch (e) {
            console.error('Failed to fetch studio stats');
        }
    };

    const handleScroll = (e) => {
        const top = e.target.scrollTop;
        setScrollTop(top);
        setGlobalScrollTop(top);
    };

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <Header 
                scrollTop={scrollTop}
                title={PAGE_TITLE}
                isMobile={isMobile}
                isSidebarOpen={true}
            />

            <div
                className="page-content"
                onScroll={handleScroll}
                style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '4rem 1.25rem' : '5rem 3rem' }}
            >
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    {/* Hero Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                        {[
                            { label: 'הודעות שנשלחו', value: stats.total_sent, icon: <CheckCircle2 size={24} />, color: 'var(--success-color)' },
                            { label: 'שגיאות שליחה', value: stats.failed, icon: <Layout size={24} />, color: 'var(--danger-color)' },
                            { label: 'משתמשי תקשורת', value: stats.active_users, icon: <History size={24} />, color: 'var(--primary-color)' },
                        ].map((stat, i) => (
                            <div key={i} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stat.value}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{stat.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <Sparkles size={22} color="var(--primary-color)" />
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>תבניות הודעה זמינות</h2>
                    </div>

                    {/* Templates Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
                        {TEMPLATES.map(tpl => (
                            <div 
                                key={tpl.id} 
                                className="card" 
                                style={{ 
                                    padding: '1.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', 
                                    display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease',
                                    cursor: 'pointer'
                                }}
                                onClick={() => setSelectedTemplate(tpl)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{ 
                                        width: '48px', height: '48px', borderRadius: '14px', 
                                        background: tpl.type === 'whatsapp' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                                        color: tpl.type === 'whatsapp' ? '#22c55e' : '#6366f1',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {tpl.icon}
                                    </div>
                                    <span style={{ 
                                        padding: '0.25rem 0.75rem', borderRadius: '50px', 
                                        background: 'var(--bg-inset)', fontSize: '0.75rem', 
                                        fontWeight: 800, color: 'var(--text-secondary)', border: '1px solid var(--border-color)' 
                                    }}>
                                        {tpl.category}
                                    </span>
                                </div>
                                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>{tpl.title}</h3>
                                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, marginBottom: '1.5rem' }}>
                                    {tpl.description}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)', fontWeight: 700, fontSize: '0.9rem' }}>
                                        עריכת תבנית <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} />
                                    </div>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                        {tpl.variables.length} משתנים
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Placeholder Card */}
                        <div className="card" style={{ padding: '1.5rem', background: 'var(--bg-inset)', border: '2px dashed var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', textAlign: 'center' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <Settings2 size={24} />
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>תבניות נוספות בקרוב</div>
                        </div>
                    </div>
                </div>
            </div>

            {selectedTemplate && (
                <UnifiedTemplateEditor 
                    isOpen={!!selectedTemplate}
                    onClose={() => setSelectedTemplate(null)}
                    settingKey={selectedTemplate.id}
                    title={selectedTemplate.title}
                    type={selectedTemplate.type}
                    fallbackTemplate={selectedTemplate.fallback}
                    variables={selectedTemplate.variables}
                />
            )}
        </div>
    );
};

export default CommunicationStudio;
