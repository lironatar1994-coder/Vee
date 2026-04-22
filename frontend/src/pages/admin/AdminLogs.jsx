import React, { useState, useEffect } from 'react';
import { Terminal, AlertCircle, RefreshCcw, Search, ChevronRight, FileText, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { adminAuthFetch } from '../../services/adminAuthService';
import Header from '../../components/Header';
import { useHeaderScroll } from '../../context/HeaderContext';

const API_URL = '/api';

const AdminLogs = () => {
    const [logs, setLogs] = useState([]);
    const [logType, setLogType] = useState('errors'); // 'errors' or 'combined'
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { setScrollTop: setGlobalScrollTop } = useHeaderScroll();
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        setGlobalScrollTop(0);
        fetchLogs();
    }, [logType]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await adminAuthFetch(`${API_URL}/admin/logs/${logType}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            } else {
                toast.error('שגיאה בטעינת הלוגים');
            }
        } catch (err) {
            console.error(err);
            toast.error('שגיאה בתקשורת עם השרת');
        } finally {
            setLoading(false);
        }
    };

    const handleScroll = (e) => {
        const top = e.target.scrollTop;
        setScrollTop(top);
        setGlobalScrollTop(top);
    };

    const filteredLogs = logs.filter(log => 
        (log.message && log.message.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.stack && log.stack.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const isMobile = window.innerWidth <= 768;

    return (
        <div className="page-grid" style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <Header 
                scrollTop={scrollTop}
                hPadding={isMobile ? '1.5rem' : '2.5rem'}
                title="יומני מערכת"
                isMobile={isMobile}
                isSidebarOpen={true}
            />

            <div
                className="page-content"
                style={{ flex: 1, overflowY: 'auto', padding: '4rem 1.5rem 2rem 1.5rem' }}
                onScroll={handleScroll}
            >
                {/* Controls */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
                    <div style={{ 
                        display: 'flex', 
                        background: 'var(--bg-secondary)', 
                        padding: '0.3rem', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <button 
                            onClick={() => setLogType('errors')}
                            style={{
                                padding: '0.6rem 1.2rem',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: logType === 'errors' ? 'var(--error-color)' : 'transparent',
                                color: logType === 'errors' ? 'white' : 'var(--text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <AlertCircle size={16} />
                            שגיאות
                        </button>
                        <button 
                            onClick={() => setLogType('combined')}
                            style={{
                                padding: '0.6rem 1.2rem',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                background: logType === 'combined' ? 'var(--primary-color)' : 'transparent',
                                color: logType === 'combined' ? 'white' : 'var(--text-secondary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Activity size={16} />
                            פעילות
                        </button>
                    </div>

                    <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                        <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input 
                            type="text"
                            placeholder="חיפוש בלוגים..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem 3rem 0.8rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-color)',
                                background: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button 
                        onClick={fetchLogs}
                        disabled={loading}
                        style={{
                            padding: '0.8rem',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--border-color)',
                            background: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Logs List */}
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                        <RefreshCcw className="animate-spin" size={40} color="var(--primary-color)" />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredLogs.length === 0 ? (
                            <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                                <p>לא נמצאו לוגים מתאימים</p>
                            </div>
                        ) : (
                            filteredLogs.map((log, idx) => (
                                <div key={idx} className="card" style={{ 
                                    padding: '1.25rem', 
                                    background: 'var(--bg-secondary)',
                                    borderRight: `4px solid ${log.level === 'error' ? 'var(--error-color)' : 'var(--primary-color)'}`,
                                    fontSize: '0.9rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', opacity: 0.7 }}>
                                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{log.level}</span>
                                        <span>{new Date(log.timestamp).toLocaleString('he-IL')}</span>
                                    </div>
                                    <div style={{ 
                                        fontFamily: 'monospace', 
                                        whiteSpace: 'pre-wrap', 
                                        color: 'var(--text-primary)',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.4
                                    }}>
                                        {log.message}
                                        {log.stack && (
                                            <details style={{ marginTop: '0.5rem' }}>
                                                <summary style={{ cursor: 'pointer', color: 'var(--primary-color)', fontWeight: 600 }}>הצג Stack Trace</summary>
                                                <div style={{ 
                                                    marginTop: '0.5rem', 
                                                    padding: '0.75rem', 
                                                    background: 'rgba(0,0,0,0.05)', 
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.8rem',
                                                    overflowX: 'auto'
                                                }}>
                                                    {log.stack}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminLogs;
