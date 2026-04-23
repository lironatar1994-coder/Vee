import React, { useState, useEffect, useRef } from 'react';
import { X, Save, MessageCircle, Mail, AlertCircle, RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthFetch } from '../../services/adminAuthService';

const API_URL = '/api';

const UnifiedTemplateEditor = ({ 
    isOpen, 
    onClose, 
    settingKey,
    title,
    type = 'whatsapp', // 'whatsapp' or 'email'
    fallbackTemplate,
    variables = []
}) => {
    const [template, setTemplate] = useState('');
    const [originalTemplate, setOriginalTemplate] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchTemplate();
        }
    }, [isOpen, settingKey]);

    const fetchTemplate = async () => {
        setLoading(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/settings/${settingKey}`);
            
            if (res.ok) {
                const data = await res.json();
                const formattedValue = data.value ? data.value.replace(/\\n/g, '\n') : '';
                setTemplate(formattedValue);
                setOriginalTemplate(formattedValue);
            } else {
                setTemplate(fallbackTemplate);
                setOriginalTemplate(fallbackTemplate);
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בטעינת התבנית');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const valueToSave = template.replace(/\n/g, '\\n');
            const res = await adminAuthFetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                body: JSON.stringify({ key: settingKey, value: valueToSave })
            });

            if (res.ok) {
                toast.success('התבנית נשמרה בהצלחה');
                setOriginalTemplate(template);
                onClose();
            } else {
                toast.error('שגיאה בשמירת התבנית');
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בשמירת התבנית');
        }
        setSaving(false);
    };

    const insertVariable = (variableKey) => {
        if (!textareaRef.current) return;
        const startPos = textareaRef.current.selectionStart;
        const endPos = textareaRef.current.selectionEnd;
        const newTemplate = template.substring(0, startPos) + `{{${variableKey}}}` + template.substring(endPos);
        setTemplate(newTemplate);
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(startPos + variableKey.length + 4, startPos + variableKey.length + 4);
        }, 10);
    };

    const getPreviewText = () => {
        let preview = template;
        variables.forEach(v => {
            const regex = new RegExp(`{{${v.key}}}`, 'g');
            preview = preview.replace(regex, v.example);
        });
        return preview;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2100 }}>
            <div className="add-task-modal" onClick={e => e.stopPropagation()} style={{ 
                maxWidth: '1000px', 
                width: '95%', 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '90vh',
                padding: '0'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ 
                            width: '40px', height: '40px', borderRadius: '12px', 
                            background: type === 'whatsapp' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            color: type === 'whatsapp' ? '#22c55e' : '#6366f1' 
                        }}>
                            {type === 'whatsapp' ? <MessageCircle size={20} /> : <Mail size={20} />}
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{title}</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft">
                        <X size={20} />
                    </button>
                </div>

                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                    {/* Editor Side */}
                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '1px solid var(--border-color)', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
                                <RefreshCw className="spin" size={32} />
                                <span>טוען תבנית...</span>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>משתנים זמינים:</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {variables.map(v => (
                                            <button key={v.key} onClick={() => insertVariable(v.key)} className="btn-pill" style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.4rem 0.8rem' }}>
                                                {v.label} <code style={{ marginRight: '0.4rem', color: 'var(--primary-color)', fontSize: '0.75rem' }}>{"{{" + v.key + "}}"}</code>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>תוכן התבנית:</label>
                                    <textarea
                                        ref={textareaRef}
                                        value={template}
                                        onChange={e => setTemplate(e.target.value)}
                                        style={{
                                            flex: 1, minHeight: '300px', width: '100%', padding: '1.25rem',
                                            borderRadius: '16px', border: '1px solid var(--border-color)',
                                            background: 'var(--bg-color)', color: 'var(--text-primary)',
                                            fontSize: '1rem', lineHeight: '1.6', resize: 'none',
                                            fontFamily: 'inherit', outline: 'none'
                                        }}
                                        dir="auto"
                                        placeholder="הקלד את תוכן התבנית כאן..."
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Preview Side */}
                    <div style={{ width: '400px', background: 'var(--bg-inset)', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', overflowY: 'auto' }}>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem' }}>
                            {type === 'whatsapp' ? <Smartphone size={16} /> : <Monitor size={16} />}
                            תצוגה מקדימה חיה
                        </div>

                        {type === 'whatsapp' ? (
                            /* WhatsApp Mockup */
                            <div style={{ 
                                width: '280px', height: 'auto', background: '#fff', borderRadius: '24px', 
                                border: '8px solid #333', boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
                                position: 'relative', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ background: '#075E54', padding: '1rem 0.75rem', color: '#fff', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#ccc' }} />
                                    Vee Support
                                </div>
                                <div style={{ flex: 1, padding: '1rem', background: '#E5DDD5', backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: 'contain' }}>
                                    <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px 8px 0 8px', boxShadow: '0 1px 1px rgba(0,0,0,0.1)', maxWidth: '90%', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap', position: 'relative' }}>
                                        {getPreviewText()}
                                        <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'left', marginTop: '0.25rem' }}>14:30</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Email Mockup */
                            <div style={{ 
                                width: '100%', borderRadius: '12px', border: '1px solid var(--border-color)', 
                                background: '#fff', overflow: 'hidden', boxShadow: 'var(--shadow-md)'
                            }}>
                                <div style={{ background: '#f8fafc', padding: '0.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '0.4rem' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
                                </div>
                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>From: Vee Alerts</div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginTop: '0.25rem' }}>{title}</div>
                                    </div>
                                    {/* Premium Email body simulator matching the generateResetPasswordEmailHtml layout */}
                                    <div style={{ fontFamily: "'Assistant', sans-serif", textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                                        <div style={{ background: type === 'email' && title.includes('איפוס') ? 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '35px 20px', color: '#fff' }}>
                                            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', width: '60px', height: '60px', borderRadius: '50%', display: 'inline-flex', justifyContent: 'center', align-items: 'center', marginBottom: '15px' }}>
                                                <span style={{ fontSize: '24px' }}>{type === 'email' && title.includes('איפוס') ? '🔑' : '✨'}</span>
                                            </div>
                                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{title}</h3>
                                        </div>
                                        <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                                            <p style={{ fontSize: '15px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap', textAlign: 'center', margin: '0 0 25px 0' }}>
                                                {getPreviewText()}
                                            </p>
                                            <div style={{ marginTop: '20px' }}>
                                                <button style={{ background: type === 'email' && title.includes('איפוס') ? '#4f46e5' : '#10b981', color: '#fff', border: 'none', padding: '12px 35px', borderRadius: '15px', fontWeight: '800', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }}>{type === 'email' && title.includes('איפוס') ? 'איפוס סיסמה' : 'המשך ל-Vee'}</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onClose} className="btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>ביטול</button>
                    <button 
                        onClick={handleSave} 
                        disabled={saving || template === originalTemplate}
                        className="btn-primary" 
                        style={{ padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: template === originalTemplate ? 0.7 : 1 }}
                    >
                        {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                        שמור שינויים
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnifiedTemplateEditor;
