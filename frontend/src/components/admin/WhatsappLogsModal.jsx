import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Clock, Phone, User, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const WhatsappLogsModal = ({ isOpen, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen]);

    const fetchLogs = async () => {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        try {
            const res = await fetch('/api/admin/whatsapp/logs', {
                headers: { 'Admin-Token': token }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else {
                toast.error('שגיאה בטעינת יומני שליחה');
            }
        } catch (e) {
            console.error('Error fetching logs', e);
            toast.error('שגיאת תקשורת בטעינת יומנים');
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const formatTimestamp = (ts) => {
        const date = new Date(ts);
        return new Intl.DateTimeFormat('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ zIndex: 2200 }}>
            <div className="modal-content animate-modal" style={{ 
                width: '95%', 
                maxWidth: '900px', 
                height: '85vh', 
                display: 'flex', 
                flexDirection: 'column', 
                background: 'var(--bg-secondary)',
                borderRadius: '24px',
                border: '1px solid var(--border-color)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                padding: 0
            }}>
                {/* Header Section */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'var(--bg-color)',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                            background: 'var(--success-color)15', 
                            color: 'var(--success-color)', 
                            padding: '0.75rem', 
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>יומני שליחה WhatsApp</h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>סקירת היסטוריית התזכורות שנשלחו באופן אוטומטי</p>
                        </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button 
                            onClick={fetchLogs} 
                            disabled={loading}
                            className="btn-icon"
                            style={{ padding: '0.6rem' }}
                            title="רענן"
                        >
                            <RefreshCw size={20} className={loading ? 'spin' : ''} />
                        </button>
                        <button onClick={onClose} className="btn-icon" style={{ padding: '0.6rem' }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '1rem',
                    background: 'var(--bg-color)'
                }}>
                    {loading && logs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
                            <div className="loader spin"></div>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>טוען היסטוריית הודעות...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem', color: 'var(--text-secondary)' }}>
                            <MessageSquare size={64} strokeWidth={1} style={{ opacity: 0.3 }} />
                            <span style={{ fontSize: '1.1rem' }}>אין עדיין הודעות ברשימה</span>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ 
                                width: '100%', 
                                borderCollapse: 'separate', 
                                borderSpacing: '0 0.75rem',
                                tableLayout: 'fixed'
                            }}>
                                <thead>
                                    <tr style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'right' }}>
                                        <th style={{ padding: '0 1rem', width: '180px' }}>זמן</th>
                                        <th style={{ padding: '0 1rem', width: '150px' }}>משתמש</th>
                                        <th style={{ padding: '0 1rem' }}>הודעה</th>
                                        <th style={{ padding: '0 1rem', width: '120px', textAlign: 'center' }}>סטטוס</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <React.Fragment key={log.id}>
                                            <tr 
                                                onClick={() => toggleRow(log.id)}
                                                style={{ 
                                                    background: 'var(--bg-secondary)', 
                                                    borderRadius: '16px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                                }}
                                                className="log-row-hover"
                                            >
                                                <td style={{ 
                                                    padding: '1.25rem 1rem', 
                                                    borderTopLeftRadius: '0', 
                                                    borderBottomLeftRadius: '0', 
                                                    borderTopRightRadius: '16px', 
                                                    borderBottomRightRadius: '16px' 
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                                        <Clock size={14} style={{ opacity: 0.5 }} />
                                                        {formatTimestamp(log.created_at)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                                                            <User size={14} style={{ opacity: 0.5 }} />
                                                            {log.username || 'כללי'}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <Phone size={12} />
                                                            {log.phone}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1.25rem 1rem' }}>
                                                    <div style={{ 
                                                        color: 'var(--text-secondary)', 
                                                        fontSize: '0.9rem', 
                                                        whiteSpace: 'nowrap', 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis',
                                                        maxWidth: '100%'
                                                    }}>
                                                        {log.message}
                                                    </div>
                                                </td>
                                                <td style={{ 
                                                    padding: '1.25rem 1rem', 
                                                    textAlign: 'center',
                                                    borderTopLeftRadius: '16px', 
                                                    borderBottomLeftRadius: '16px', 
                                                    borderTopRightRadius: '0', 
                                                    borderBottomRightRadius: '0' 
                                                }}>
                                                    <div style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center', 
                                                        gap: '0.4rem', 
                                                        padding: '0.4rem 0.8rem', 
                                                        borderRadius: '20px',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        background: log.status === 'success' ? 'var(--success-color)15' : 'var(--danger-color)15',
                                                        color: log.status === 'success' ? 'var(--success-color)' : 'var(--danger-color)'
                                                    }}>
                                                        {log.status === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                                        {log.status === 'success' ? 'נשלח' : 'נכשל'}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Dedicated Error/Expand Detail Row */}
                                            {expandedRows.has(log.id) && (
                                                <tr>
                                                    <td colSpan="4" style={{ padding: '0 1rem 0.75rem 1rem' }}>
                                                        <div style={{ 
                                                            padding: '1.5rem', 
                                                            background: 'var(--bg-color)', 
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '16px',
                                                            marginTop: '-0.5rem',
                                                            fontSize: '0.95rem',
                                                            color: 'var(--text-primary)',
                                                            lineHeight: 1.6,
                                                            whiteSpace: 'pre-wrap'
                                                        }}>
                                                            <div style={{ fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <MessageSquare size={16} />
                                                                תוכן ההודעה המלא:
                                                            </div>
                                                            {log.message}
                                                            
                                                            {log.status === 'failed' && log.error && (
                                                                <div style={{ 
                                                                    marginTop: '1.5rem', 
                                                                    padding: '1rem', 
                                                                    background: 'var(--danger-color)05', 
                                                                    border: '1px solid var(--danger-color)20',
                                                                    borderRadius: '12px',
                                                                    color: 'var(--danger-color)'
                                                                }}>
                                                                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                                        <AlertCircle size={16} />
                                                                        פירוט שגיאה:
                                                                    </div>
                                                                    {log.error}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div style={{ 
                    padding: '1.25rem 2rem', 
                    borderTop: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--bg-color)',
                    borderBottomLeftRadius: '24px',
                    borderBottomRightRadius: '24px'
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        מציג את 100 ההודעות האחרונות
                    </span>
                    <button className="btn-primary" onClick={onClose}>סגור חלון</button>
                </div>
            </div>

            <style>{`
                .log-row-hover:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    background: var(--bg-color) !important;
                }
                .btn-icon {
                    background: none;
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .btn-icon:hover {
                    background: var(--bg-secondary);
                    border-color: var(--primary-color);
                    color: var(--primary-color);
                }
            `}</style>
        </div>
    );
};

export default WhatsappLogsModal;
