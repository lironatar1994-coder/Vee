import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, RefreshCw, Zap, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';

const GoogleCalendarInfoModal = ({ isOpen, onClose, onConnect }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Trigger animation
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const benefits = [
        {
            icon: <RefreshCw className="benefit-icon" size={20} />,
            title: "סנכרון דו-כיווני",
            description: "המשימות והיומן מסונכרנים תמיד."
        },
        {
            icon: <Calendar className="benefit-icon" size={20} />,
            title: "הכל במקום אחד",
            description: "ראה אירועים אישיים לצד המשימות."
        },
        {
            icon: <Zap className="benefit-icon" size={20} />,
            title: "תזמון חכם",
            description: "המערכת תמצא לך זמן פנוי למשימות."
        },
        {
            icon: <ShieldCheck className="benefit-icon" size={20} />,
            title: "מאובטח ופרטי",
            description: "שימוש בפרוטוקול האבטחה של Google."
        }
    ];

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                pointerEvents: isVisible ? 'all' : 'none',
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '1rem',
                background: isVisible ? 'rgba(0,0,0,0.02)' : 'transparent',
                transition: 'all 0.4s ease'
            }}
            onClick={onClose}
        >
            <div 
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '380px',
                    height: '100%',
                    background: 'var(--bg-secondary)',
                    borderRadius: '24px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transform: isVisible ? 'translateX(0)' : 'translateX(110%)',
                    transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative'
                }}
            >
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1.25rem',
                        left: '1.25rem',
                        background: 'var(--bg-inset)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        zIndex: 10
                    }}
                >
                    <X size={18} />
                </button>

                {/* Content */}
                <div style={{ padding: '2.5rem 2rem', flex: 1, overflowY: 'auto', zIndex: 1, textAlign: 'right' }}>
                    <div style={{ marginBottom: '2rem' }}>
                        <div style={{ 
                            display: 'inline-flex', 
                            padding: '0.75rem', 
                            background: 'white', 
                            borderRadius: '16px', 
                            boxShadow: '0 4px 12px rgba(66, 133, 244, 0.1)',
                            marginBottom: '1rem'
                        }}>
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" style={{ width: '32px', height: '32px' }} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
                            חבר את לוח השנה
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {benefits.map((benefit, index) => (
                            <div 
                                key={index} 
                                style={{ 
                                    display: 'flex', 
                                    gap: '1rem', 
                                    animation: `fadeInRight 0.4s ease forwards ${index * 0.08 + 0.2}s`,
                                    opacity: 0,
                                    transform: 'translateX(15px)'
                                }}
                            >
                                <div style={{ 
                                    flexShrink: 0,
                                    width: '40px', 
                                    height: '40px', 
                                    borderRadius: '12px', 
                                    background: 'var(--bg-inset)', 
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--primary-color)'
                                }}>
                                    {benefit.icon}
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 0.15rem', fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{benefit.title}</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{benefit.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Action */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    background: 'var(--bg-inset)', 
                    borderTop: '1px solid var(--border-color)',
                    zIndex: 10
                }}>
                    <button 
                        onClick={onConnect}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '14px',
                            background: '#4285F4',
                            color: 'white',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px rgba(66, 133, 244, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>המשך לחיבור</span>
                        <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
                    </button>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.25rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                        <CheckCircle2 size={14} />
                        <span>מאושר על ידי Google Security Team</span>
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    @keyframes fadeInRight {
                        from { opacity: 0; transform: translateX(20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    @keyframes fadeInDown {
                        from { opacity: 0; transform: translateY(-20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}} />
            </div>
        </div>,
        document.body
    );
};

export default GoogleCalendarInfoModal;
