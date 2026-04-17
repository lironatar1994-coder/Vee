import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Layers, Sparkles, Wand2, Command, Zap, FolderPlus, FileText, CheckCircle2, ArrowDown, LayoutPanelTop, CheckSquare } from 'lucide-react';
import Header from '../../components/Header';
import { useHeaderScroll } from '../../context/HeaderContext';
import { adminAuthFetch } from '../../services/adminAuthService';

const API_URL = '/api';

const AdminOnboarding = () => {
    const [config, setConfig] = useState(null);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [scrollTop, setScrollTop] = useState(0);
    const { setScrollTop: setGlobalScrollTop } = useHeaderScroll();

    useEffect(() => {
        setGlobalScrollTop(0);
        fetchData();
    }, []);

    const handleScroll = (e) => {
        const top = e.target.scrollTop;
        setScrollTop(top);
        setGlobalScrollTop(top);
    };

    const fetchData = async () => {
        try {
            const [cfgRes, tplRes] = await Promise.all([
                adminAuthFetch(`${API_URL}/admin/settings/onboarding_config`),
                fetch(`${API_URL}/templates`) // public route
            ]);

            if (cfgRes.ok) {
                const data = await cfgRes.json();
                setConfig(JSON.parse(data.value));
            } else {
                setConfig({ welcome_title: "ברוכים הבאים", name_prompt: "איך תרצה שנקרא לך?", min_selections: 3, options: [] });
            }

            if (tplRes.ok) {
                setTemplates(await tplRes.json());
            }

        } catch (err) {
            console.error(err);
            toast.error('שגיאה בטעינת נתונים');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                body: JSON.stringify({
                    key: 'onboarding_config',
                    value: JSON.stringify(config)
                })
            });

            if (res.ok) {
                toast.success('תצורת הקליטה המדהימה שלך נשמרה בהצלחה! 🎉');
            } else {
                toast.error('שגיאה בשמירת התצורה');
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאת רשת');
        }
        setSaving(false);
    };

    const addOption = () => {
        setConfig(prev => ({
            ...prev,
            options: [
                ...prev.options, 
                { id: `opt_${Date.now()}`, label: 'תחום עניין חדש', icon: '✨', operations: [] }
            ]
        }));
    };

    const removeOption = (id) => {
        if(window.confirm('האם אתה בטוח שברצונך למחוק אפשרות זו?')) {
            setConfig(prev => ({
                ...prev,
                options: prev.options.filter(o => o.id !== id)
            }));
        }
    };

    const updateOption = (id, field, value) => {
        setConfig(prev => ({
            ...prev,
            options: prev.options.map(o => o.id === id ? { ...o, [field]: value } : o)
        }));
    };
    
    const addOperation = (optId) => {
        setConfig(prev => ({
             ...prev,
             options: prev.options.map(o => o.id === optId ? { 
                 ...o, 
                 operations: [...(o.operations || []), { type: 'CREATE_TASK', taskName: 'משימה חדשה שנוצרה אוטומטית' }]
             } : o)
        }));
    };

    const removeOperation = (optId, index) => {
         setConfig(prev => ({
              ...prev,
              options: prev.options.map(o => o.id === optId ? {
                  ...o,
                  operations: o.operations.filter((_, i) => i !== index)
              } : o)
         }));
    };

    const updateOperation = (optId, index, field, value) => {
         setConfig(prev => ({
              ...prev,
              options: prev.options.map(o => o.id === optId ? {
                  ...o,
                  operations: o.operations.map((op, i) => i === index ? { ...op, [field]: value } : op)
              } : o)
         }));
    };

    if (loading || !config) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="loader"></div>
        </div>
    );

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <Header 
                scrollTop={scrollTop}
                hPadding={isMobile ? '1.5rem' : '2.5rem'}
                title="Vee Onboarding Studio"
                isMobile={isMobile}
                isSidebarOpen={true}
            />

            <div 
                className="page-content" 
                style={{ flex: 1, overflowY: 'auto', padding: '1rem 0 4rem 0' }}
                onScroll={handleScroll}
            >
                {/* Hero Banner Area */}
                <div style={{ 
                    background: 'linear-gradient(135deg, rgba(var(--primary-rgb), 0.05) 0%, rgba(var(--primary-rgb), 0) 100%)',
                    borderRadius: '32px',
                    padding: '3rem 2.5rem',
                    marginBottom: '3rem',
                    border: '1px solid rgba(var(--primary-rgb), 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.1) 0%, rgba(var(--primary-rgb),0) 70%)', zIndex: 0 }}></div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '2rem' }}>
                        <div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem' }}>
                                <Sparkles size={16} /> <span>חוויית משתמש פרמיום</span>
                            </div>
                            <h1 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', fontWeight: '800', letterSpacing: '-0.5px' }}>Onboarding Studio</h1>
                            <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1.1rem', maxWidth: '600px', lineHeight: 1.6 }}>
                                בנה חווית קליטה מדהימה למשתמשים חדשים. הגדר שאלות, ותייצר פרויקטים, תבניות ומשימות אוטומטיות מאחורי הקלעים בהתאם לבחירות שלהם.
                            </p>
                        </div>

                        <button 
                            onClick={handleSave} 
                            disabled={saving}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.75rem', 
                                background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)',
                                color: 'white', border: 'none', padding: '1.2rem 2.5rem', fontSize: '1.1rem', fontWeight: '700',
                                borderRadius: '50px', cursor: 'pointer', boxShadow: '0 10px 25px rgba(var(--primary-rgb), 0.3)',
                                transition: 'transform 0.2s, box-shadow 0.2s', minWidth: '200px'
                            }}
                        >
                            {saving ? <div className="loader" style={{width: 20, height: 20, borderTopColor: 'white'}}></div> : <Save size={20} />}
                            {saving ? 'מבצע שמירה בענן...' : 'פרסם חוויות קליטה (Save)'}
                        </button>
                    </div>
                </div>

                <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                    
                    {/* General Settings Box */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--bg-inset)', padding: '0.6rem', borderRadius: '12px', color: 'var(--text-primary)' }}><LayoutPanelTop size={22} /></div>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: '800' }}>הגדרות ממשק בסיסיות</h2>
                        </div>
                        
                        <div className="card" style={{ padding: '2rem', borderRadius: '24px', border: '1px solid var(--border-color)', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                                <div style={{ background: 'var(--bg-inset)', padding: '1.5rem', borderRadius: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        <Wand2 size={16} /> כותרת פתיחה
                                    </label>
                                    <input 
                                        type="text"
                                        value={config.welcome_title || ''}
                                        onChange={e => setConfig({ ...config, welcome_title: e.target.value })}
                                        placeholder="למשל: ברוכים הבאים ל-Vee"
                                        style={{ width: '100%', padding: '1rem 1.25rem', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--bg-color)', color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                                        onBlur={e => e.target.style.borderColor = 'transparent'}
                                    />
                                </div>

                                <div style={{ background: 'var(--bg-inset)', padding: '1.5rem', borderRadius: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        <Command size={16} /> טקסט הזנת שם מתחבר
                                    </label>
                                    <input 
                                        type="text"
                                        value={config.name_prompt || ''}
                                        onChange={e => setConfig({ ...config, name_prompt: e.target.value })}
                                        placeholder="למשל: איך תרצה שנקרא לך?"
                                        style={{ width: '100%', padding: '1rem 1.25rem', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--bg-color)', color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                                        onBlur={e => e.target.style.borderColor = 'transparent'}
                                    />
                                </div>
                                
                                <div style={{ background: 'var(--bg-inset)', padding: '1.5rem', borderRadius: '16px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                                        <CheckCircle2 size={16} /> מינימום בחירות חובה (שלב 2)
                                    </label>
                                    <input 
                                        type="number"
                                        min="1"
                                        value={config.min_selections || 3}
                                        onChange={e => setConfig({ ...config, min_selections: parseInt(e.target.value) || 1 })}
                                        style={{ width: '100%', padding: '1rem 1.25rem', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid transparent', background: 'var(--bg-color)', color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}
                                        onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                                        onBlur={e => e.target.style.borderColor = 'transparent'}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Logic Builder Section */}
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ background: 'var(--bg-inset)', padding: '0.6rem', borderRadius: '12px', color: 'var(--text-primary)' }}><Layers size={22} /></div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: '800' }}>מנוע תחומי העניין</h2>
                                    <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>הגדר את הכרטיסיות שיוצגו למשתמש, איזה אופרציות הן יפעילו מאחורי הקלעים.</p>
                                </div>
                            </div>
                            <button 
                                onClick={addOption}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.2)' }}
                            >
                                <Plus size={18} /> כרטיסיית עניין חדשה
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {config.options.map((opt, optIndex) => (
                                <div key={opt.id} className="card" style={{ padding: 0, borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 15px 35px -10px rgba(0,0,0,0.05)' }}>
                                    
                                    {/* Option Header (Visual Presentation) */}
                                    <div style={{ background: 'var(--bg-inset)', padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '1.5rem', flex: 1, alignItems: 'center' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', position: 'absolute', top: '-20px', right: '5px' }}>אייקון</div>
                                                <input 
                                                    type="text" 
                                                    value={opt.icon || ''}
                                                    onChange={e => updateOption(opt.id, 'icon', e.target.value)}
                                                    style={{ width: '70px', height: '70px', padding: '0', textAlign: 'center', fontSize: '2.5rem', borderRadius: '18px', border: '2px solid var(--border-color)', background: 'var(--bg-color)', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}
                                                    onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                                                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                                                />
                                            </div>
                                            <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', position: 'absolute', top: '-20px', right: '5px' }}>שם הקטגוריה (מוצג למשתמש)</div>
                                                <input 
                                                    type="text" 
                                                    value={opt.label || ''}
                                                    onChange={e => updateOption(opt.id, 'label', e.target.value)}
                                                    placeholder="למשל: יזמות ועסקים"
                                                    style={{ width: '100%', height: '70px', padding: '0 1.5rem', fontSize: '1.3rem', fontWeight: '700', borderRadius: '18px', border: '2px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}
                                                    onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
                                                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                                                />
                                            </div>
                                        </div>
                                        <button onClick={() => removeOption(opt.id)} style={{ background: 'rgba(var(--danger-color-rgb, 239, 68, 68), 0.1)', color: 'var(--error-color, #ef4444)', border: 'none', padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Trash2 size={20} />
                                        </button>
                                    </div>

                                    {/* Workflow Builder (Operations) */}
                                    <div style={{ padding: '2rem', background: 'var(--bg-color)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Zap size={18} color="var(--primary-color)" />
                                                <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>שרשרת פעולות (Tiggers)</span>
                                            </div>
                                            <button 
                                                onClick={() => addOperation(opt.id)}
                                                style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary-color)', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                                            >
                                                <Plus size={16} /> הוסף פקודה
                                            </button>
                                        </div>

                                        {(!opt.operations || opt.operations.length === 0) && (
                                            <div style={{ padding: '2.5rem', textAlign: 'center', background: 'var(--bg-inset)', borderRadius: '16px', border: '2px dashed var(--border-color)', color: 'var(--text-secondary)' }}>
                                                <div style={{ opacity: 0.5, marginBottom: '0.5rem' }}><ArrowDown size={32} /></div>
                                                <p style={{ margin: 0, fontWeight: '500' }}>לא הוגדרו פקודות.</p>
                                                <span style={{ fontSize: '0.9rem' }}>אם המשתמש יבחר בכרטיסיה זו, שום דבר לא יקרה מאחורי הקלעים. לחץ על 'הוסף פקודה' כדי לבנות אוטומציה.</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                                            {/* Vertical Connect Line */}
                                            {opt.operations?.length > 1 && (
                                                <div style={{ position: 'absolute', top: '30px', bottom: '30px', right: '23px', width: '2px', background: 'var(--border-color)', zIndex: 0 }}></div>
                                            )}

                                            {(opt.operations || []).map((op, i) => (
                                                <div key={i} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                                                    {/* Node Icon */}
                                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}>
                                                        <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{i + 1}</span>
                                                    </div>

                                                    {/* Node Content */}
                                                    <div style={{ flex: 1, background: 'var(--bg-inset)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-color)', position: 'relative', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                {op.type === 'CREATE_PROJECT' && <FolderPlus size={18} color="var(--primary-color)" />}
                                                                {op.type === 'CREATE_TASK' && <CheckSquare size={18} color="var(--success-color)" />}
                                                                {op.type === 'APPLY_TEMPLATE' && <FileText size={18} color="var(--accent-color)" />}
                                                                
                                                                <select 
                                                                    value={op.type}
                                                                    onChange={e => {
                                                                         const val = e.target.value;
                                                                         if (val === 'CREATE_TASK') updateOperation(opt.id, i, 'type', val, op.taskName = 'משימה חדשה', op.repeatRule = 'none');
                                                                         if (val === 'CREATE_PROJECT') updateOperation(opt.id, i, 'type', val, op.projectName = 'פרויקט חדש');
                                                                         if (val === 'APPLY_TEMPLATE') updateOperation(opt.id, i, 'type', val, op.templateId = templates[0]?.id || '');
                                                                    }}
                                                                    style={{ padding: '0.4rem 0.5rem', borderRadius: '8px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '1rem', fontWeight: '700', appearance: 'auto', cursor: 'pointer', outline: 'none' }}
                                                                >
                                                                    <option value="CREATE_TASK">צור משימה אישית</option>
                                                                    <option value="CREATE_PROJECT">הקם חלל / פרויקט מותאם</option>
                                                                    <option value="APPLY_TEMPLATE">הלבש תבנית קיימת (העתקה שלמה)</option>
                                                                </select>
                                                            </div>
                                                            <button 
                                                                onClick={() => removeOperation(opt.id, i)}
                                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', opacity: 0.5, transition: 'opacity 0.2s' }}
                                                                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                                                onMouseLeave={e => e.currentTarget.style.opacity = 0.5}
                                                                title="מחק פעולה זו"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>

                                                        {/* Variable Input Forms based on action */}
                                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--bg-color)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                                            {op.type === 'CREATE_TASK' && (
                                                                <>
                                                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>שם המשימה (תיווצר באינבוקס הראשי)</span>
                                                                        <input 
                                                                            type="text"
                                                                            value={op.taskName || ''}
                                                                            onChange={e => updateOperation(opt.id, i, 'taskName', e.target.value)}
                                                                            style={{ border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none' }}
                                                                        />
                                                                    </div>
                                                                    <div style={{ width: '1px', height: '30px', background: 'var(--border-color)' }}></div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>חזרתיות (אופציונלי)</span>
                                                                        <select 
                                                                            value={op.repeatRule || 'none'}
                                                                            onChange={e => updateOperation(opt.id, i, 'repeatRule', e.target.value)}
                                                                            style={{ border: 'none', background: 'var(--bg-inset)', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.9rem', color: 'var(--text-primary)', outline: 'none' }}
                                                                        >
                                                                            <option value="none">ללא</option>
                                                                            <option value="daily">כל יום</option>
                                                                            <option value="weekdays">ימי חול בלבד (א-ה)</option>
                                                                            <option value="weekly">שבועי</option>
                                                                            <option value="monthly">חודשי</option>
                                                                        </select>
                                                                    </div>
                                                                </>
                                                            )}

                                                            {op.type === 'CREATE_PROJECT' && (
                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>שם הפרויקט/חלל שייפתח עבור המשתמש</span>
                                                                    <input 
                                                                        type="text"
                                                                        value={op.projectName || ''}
                                                                        onChange={e => updateOperation(opt.id, i, 'projectName', e.target.value)}
                                                                        style={{ border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none', fontWeight: '600' }}
                                                                    />
                                                                </div>
                                                            )}

                                                            {op.type === 'APPLY_TEMPLATE' && (
                                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>בחר תבנית קיימת ממאגר החברה (תיק המשימות יועתק בשלמותו לצד המשתמש)</span>
                                                                    <select 
                                                                        value={op.templateId || ''}
                                                                        onChange={e => updateOperation(opt.id, i, 'templateId', parseInt(e.target.value))}
                                                                        style={{ border: 'none', background: 'transparent', fontSize: '1rem', color: 'var(--text-primary)', outline: 'none', fontWeight: '600', padding: '0' }}
                                                                    >
                                                                        <option value="" disabled>-- לחץ כאן לבחירת תבנית --</option>
                                                                        {templates.map(t => (
                                                                            <option key={t.id} value={t.id}>{t.title} (ID: {t.id})</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {config.options.length === 0 && (
                                <div style={{ padding: '4rem 2rem', textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: '24px', border: '2px dashed var(--border-color)' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--bg-inset)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', color: 'var(--primary-color)', opacity: 0.8 }}>
                                        <Layers size={40} />
                                    </div>
                                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>מנוע הבחירות ריק!</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
                                        לא הוגדרו נושאי עניין להציג למשתמשים החדשים. לחץ על הכפתור למטה כדי להקים את הנושא הראשון למערכת ההרשמה.
                                    </p>
                                    <button className="btn-primary" onClick={addOption} style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 2rem', borderRadius: '50px' }}>
                                        <Plus size={18} /> יצירת כרטיסייה ראשונה
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AdminOnboarding;
