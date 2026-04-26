import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Layers, ListChecks, ArrowRight, Repeat, Target, Folder } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { toast } from 'sonner';
import useHistoryModal from '../hooks/useHistoryModal';

export default function TemplateStoreModal({ isOpen, onClose, onCreated, userId, apiUrl }) {
    const { authFetch } = useUser();
    const [templates, setTemplates] = useState([]);
    const [fetching, setFetching] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);

    useHistoryModal(isOpen, onClose, 'templates');

    useEffect(() => {
        if (isOpen && templates.length === 0) {
            setFetching(true);
            authFetch(`${apiUrl}/templates`)
                .then(r => r.json())
                .then(data => setTemplates(data))
                .catch(e => console.error('Failed to load templates:', e))
                .finally(() => setFetching(false));
        }
        if (!isOpen) {
            setTitle('');
            setSelectedTemplate(null);
        }
    }, [isOpen, apiUrl, templates.length]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !selectedTemplate) return;
        setLoading(true);

        try {
            const pRes = await authFetch(`${apiUrl}/users/current/projects`, {
                method: 'POST',
                body: JSON.stringify({ title: title.trim() })
            });

            if (pRes.ok) {
                const newProj = await pRes.json();
                await authFetch(`${apiUrl}/users/current/checklists/from-template`, {
                    method: 'POST',
                    body: JSON.stringify({
                        templateId: selectedTemplate.id,
                        project_id: newProj.id
                    })
                });

                onCreated({ ...newProj, _fromTemplateMagic: true });
                toast.success('הפרויקט התווסף בהצלחה');
                onClose();
            }
        } catch (err) {
            console.error('Error creating from template:', err);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
            <div onClick={e => e.stopPropagation()} className="card animate-pop" style={{
                background: 'var(--bg-color)', borderRadius: '12px', width: '100%',
                maxWidth: selectedTemplate ? '500px' : '900px',
                height: selectedTemplate ? 'auto' : '82vh', maxHeight: '85vh',
                boxShadow: '0 20px 50px rgba(0,0,0,0.15)', overflow: 'hidden',
                border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
                transition: 'max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-color)', flexShrink: 0, zIndex: 2
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {selectedTemplate ? (
                            <button onClick={() => setSelectedTemplate(null)} className="btn-icon-soft" style={{ padding: '0.3rem', marginRight: '-0.3rem', color: 'var(--text-primary)' }} title="חזור">
                                <ArrowRight size={20} />
                            </button>
                        ) : (
                            <Layers size={22} style={{ color: 'var(--text-primary)' }} />
                        )}
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 500 }}>
                            {selectedTemplate ? `תבנית: ${selectedTemplate.title}` : 'גלה תבניות'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="btn-icon-soft" style={{ padding: '0.2rem', color: 'var(--text-primary)' }} title="סגור">
                        <X size={26} strokeWidth={1.5} />
                    </button>
                </div>

                <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    {!selectedTemplate ? (
                        fetching ? (
                            <div style={{ margin: 'auto', textAlign: 'center' }}>
                                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                                <div style={{ color: 'var(--text-secondary)' }}>טוען תבניות...</div>
                            </div>
                        ) : templates.length === 0 ? (
                            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>לא נמצאו תבניות.</div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem', alignContent: 'flex-start' }}>
                                {templates.map((tmp, idx) => (
                                    <div key={tmp.id} className={`card hover-scale stagger-${(idx % 4) + 1}`} onClick={() => { setSelectedTemplate(tmp); setTitle(tmp.title); }} style={{
                                        padding: '1.25rem', cursor: 'pointer', border: '1px solid var(--border-color)', borderRadius: '10px',
                                        background: 'var(--bg-color)', display: 'flex', flexDirection: 'column',
                                        transition: 'all 0.2s ease', boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.85rem' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'var(--hover-bg)', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <ListChecks size={20} strokeWidth={2} />
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <h4 style={{ margin: '0 0 0.2rem', fontSize: '1rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{tmp.title}</h4>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                    {tmp.items ? tmp.items.length : 0} משימות
                                                </div>
                                            </div>
                                        </div>
                                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {tmp.description || 'רשימת משימות מוכנה להתחלה.'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <form id="template-setup-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group" style={{ position: 'relative' }}>
                                <label className="form-label" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                                    שם הפרויקט
                                </label>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type="text"
                                        autoFocus
                                        className="form-control"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        maxLength={120}
                                        style={{
                                            height: '36px', paddingRight: '0.6rem', paddingLeft: '3.5rem',
                                            border: '1px solid #ddd', borderRadius: '6px', background: 'var(--bg-color)',
                                            fontSize: '0.9rem', width: '100%', direction: 'rtl'
                                        }}
                                    />
                                    <span style={{
                                        position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                                        fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7, pointerEvents: 'none'
                                    }}>
                                        {title.length}/120
                                    </span>
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {selectedTemplate && (
                    <div style={{
                        padding: '0.85rem 1.5rem', borderTop: '1px solid var(--border-color)',
                        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '0.85rem',
                        flexShrink: 0, background: 'var(--bg-color)', zIndex: 2
                    }}>
                        <button
                            type="submit"
                            form="template-setup-form"
                            disabled={!title.trim() || loading}
                            style={{
                                padding: '0.5rem 1.4rem', fontSize: '0.92rem', fontWeight: 600,
                                background: 'var(--primary-color)', border: 'none', borderRadius: '4px',
                                cursor: 'pointer', color: 'var(--btn-text-primary, #1a1a1a)',
                                opacity: !title.trim() || loading ? 0.5 : 1
                            }}
                        >
                            {loading ? 'יוצר...' : 'הוספה'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedTemplate(null)}
                            style={{
                                padding: '0.5rem 1.4rem', fontSize: '0.92rem', fontWeight: 600,
                                background: '#f4f4f4', border: 'none', borderRadius: '4px',
                                color: '#1a1a1a', cursor: 'pointer'
                            }}
                        >
                            ביטול
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
