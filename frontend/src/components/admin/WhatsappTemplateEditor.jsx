import React, { useState, useEffect, useRef } from 'react';
import { X, Save, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = '/api';

const WhatsappTemplateEditor = ({ 
    isOpen, 
    onClose, 
    settingKey = 'whatsapp_template',
    title = 'עריכת תבנית הודעה',
    fallbackTemplate = '*_Vee Reminder_*\nשלום {user_name},\n\nתזכורת למשימה: *{task_name}*\nנקבע לשעה: {task_time}\n\nבהצלחה!',
    variables = [
        { key: '{user_name}', label: 'שם המשתמש', example: 'לירון' },
        { key: '{task_name}', label: 'שם המשימה', example: 'פגישת צוות' },
        { key: '{task_time}', label: 'שעת המשימה', example: '14:30' }
    ]
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
    }, [isOpen]);

    const fetchTemplate = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API_URL}/admin/settings/${settingKey}`, {
                headers: { 'Admin-Token': token }
            });
            
            if (res.ok) {
                const data = await res.json();
                const formattedValue = data.value ? data.value.replace(/\\n/g, '\n') : '';
                setTemplate(formattedValue);
                setOriginalTemplate(formattedValue);
            } else if (res.status === 404) {
                setTemplate(fallbackTemplate);
                setOriginalTemplate(fallbackTemplate);
            } else {
                toast.error('שגיאה בטעינת התבנית');
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בתקשורת מול השרת');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!template.trim()) {
            toast.error('התבנית לא יכולה להיות ריקה');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('adminToken');
            // Escape newlines before sending to DB so they are stored safely as \n literal string
            const valueToSave = template.replace(/\n/g, '\\n');
            const res = await fetch(`${API_URL}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Admin-Token': token
                },
                body: JSON.stringify({ key: settingKey, value: valueToSave })
            });

            if (res.ok) {
                toast.success('תבנית נשמרה בהצלחה');
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
        const newTemplate = template.substring(0, startPos) + variableKey + template.substring(endPos);
        
        setTemplate(newTemplate);
        
        // Return focus to textarea after insertion
        setTimeout(() => {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(startPos + variableKey.length, startPos + variableKey.length);
        }, 10);
    };

    // Calculate dynamic preview
    const getPreviewText = () => {
        let preview = template;
        if (variables && variables.length > 0) {
            variables.forEach(v => {
                const regex = new RegExp(v.key.replace(/[{}]/g, '\\$&'), 'g');
                preview = preview.replace(regex, v.example);
            });
        }
        return preview;
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 2000 }}>
            <div className="add-task-modal" onClick={e => e.stopPropagation()} style={{ 
                maxWidth: '600px', 
                width: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                maxHeight: '90vh' 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                            <MessageCircle size={18} />
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{title}</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft" style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <RefreshCw className="spin" size={24} style={{ margin: '0 auto 1rem' }} />
                        <p>טוען תבנית...</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto', paddingRight: '5px' }}>
                        
                        {/* Variables Section */}
                        {variables && variables.length > 0 && (
                            <div>
                                <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>משתנים דינמיים הניתנים לשימוש (לחץ להוספה):</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {variables.map(variable => (
                                        <button 
                                            key={variable.key}
                                            onClick={() => insertVariable(variable.key)}
                                            className="btn-pill"
                                            style={{ 
                                                background: 'var(--bg-secondary)', 
                                                border: '1px solid var(--border-color)', 
                                                padding: '0.4rem 0.75rem', 
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                cursor: 'pointer'
                                            }}
                                            title={`דוגמה: ${variable.example}`}
                                        >
                                            <span style={{ fontFamily: 'monospace', color: 'var(--primary-color)', fontWeight: 600, direction: 'ltr' }}>{variable.key}</span>
                                            <span style={{ color: 'var(--text-secondary)' }}>- {variable.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Editor Section */}
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '200px' }}>
                            <label style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>תוכן ההודעה:</label>
                            <textarea
                                ref={textareaRef}
                                value={template}
                                onChange={(e) => setTemplate(e.target.value)}
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-color)',
                                    color: 'var(--text-primary)',
                                    fontSize: '0.95rem',
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    resize: 'none',
                                    lineHeight: '1.6',
                                    outline: 'none',
                                    boxShadow: 'var(--shadow-sm)'
                                }}
                                dir="auto"
                                placeholder="כתוב את ההודעה כאן..."
                            />
                        </div>

                        {/* Preview Section */}
                        <div style={{ 
                            background: '#e0ece0', 
                            borderRadius: '0.75rem', 
                            padding: '1rem', 
                            border: '1px solid #c7dcc7',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#388e3c' }}>
                                <AlertCircle size={14} />
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>תצוגה מקדימה (דוגמה)</span>
                            </div>
                            <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '0.9rem', 
                                color: '#1a4e1e', 
                                lineHeight: '1.5',
                                fontFamily: 'system-ui, -apple-system, sans-serif'
                            }}>
                                {getPreviewText() || <span style={{ opacity: 0.5 }}>אין תוכן לתצוגה</span>}
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                            <button 
                                onClick={onClose} 
                                className="btn-secondary"
                                style={{ padding: '0.75rem 1.5rem' }}
                            >
                                ביטול
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={saving}
                                className="btn-primary"
                                style={{ 
                                    padding: '0.75rem 2rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.5rem',
                                    background: template !== originalTemplate ? 'var(--primary-color)' : 'var(--text-secondary)'
                                }}
                            >
                                {saving ? <RefreshCw className="spin" size={18} /> : <Save size={18} />}
                                שמור תבנית
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatsappTemplateEditor;
