import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { Loader2, Check, ArrowLeft, ArrowRight, LayoutGrid, Rocket } from 'lucide-react';
import { toast } from 'sonner';

const OnboardingWizard = () => {
    const { user, updateUser } = useUser();
    const [config, setConfig] = useState(null);
    const [step, setStep] = useState(1);
    const [isMobileView, setIsMobileView] = useState(window.innerWidth <= 768);

    const [name, setName] = useState(user?.username || '');
    const [selectedOptions, setSelectedOptions] = useState([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobileView(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        
        const fetchConfig = async () => {
            try {
                const res = await fetch('/api/settings/onboarding_config');
                if (res.ok) {
                    const data = await res.json();
                    setConfig(JSON.parse(data.value));
                }
            } catch (err) {
                console.error("Failed to load onboarding config", err);
            }
        };
        fetchConfig();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleOptionToggle = (optionId) => {
        setSelectedOptions(prev =>
            prev.includes(optionId)
                ? prev.filter(id => id !== optionId)
                : [...prev, optionId]
        );
    };

    const jumpStep = (targetStep) => {
        setIsTransitioning(true);
        setTimeout(() => {
            setStep(targetStep);
            setIsTransitioning(false);
        }, 200);
    };

    const handleNext = () => {
        if (step === 1) {
            if (!name.trim()) {
                toast.error('חשוב שנדע איך לקרוא לך 🥺');
                return;
            }
            jumpStep(2);
        } else if (step === 2) {
            const minSelections = config?.min_selections || 3;
            if (selectedOptions.length < minSelections) {
                toast.error(`אנא בחר עוד ${minSelections - selectedOptions.length} ${minSelections - selectedOptions.length === 1 ? 'תחום' : 'תחומים'} לסיום`);
                return;
            }
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const operationsToRun = [];
        const options = config.options || [];

        selectedOptions.forEach(optId => {
            const definition = options.find(o => o.id === optId);
            if (definition && definition.operations) {
                operationsToRun.push(...definition.operations);
            }
        });

        try {
            const res = await fetch(`/api/users/${user.id}/onboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: name,
                    operations: operationsToRun
                })
            });
            const data = await res.json();
            
            // Add a synthetic delay so the loader is visible enough to be cool
            setTimeout(() => {
                if (data.success) {
                    updateUser(data.user);
                } else {
                    toast.error('הייתה בעיה בהקמת הסביבה שלך');
                    setIsSubmitting(false);
                }
            }, 1800);
            
        } catch (err) {
            console.error(err);
            toast.error('שגיאת תקשורת');
            setIsSubmitting(false);
        }
    };

    const minSelections = config?.min_selections || 3;
    const progressPerc = Math.min((selectedOptions.length / minSelections) * 100, 100);

    // Ultra-Premium Responsive Styles
    const dynamicStyles = {
        container: {
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(var(--bg-color-rgb, 0,0,0), 0.3)',
            backdropFilter: isMobileView ? 'blur(16px)' : 'blur(20px)',
            WebkitBackdropFilter: isMobileView ? 'blur(16px)' : 'blur(20px)',
            display: 'flex',
            alignItems: isMobileView ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: isMobileView ? '0' : '1.5rem',
            direction: 'rtl',
            transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        },
        contentBox: {
            width: '100%',
            maxWidth: isMobileView ? '100%' : '640px', // slightly wider on desktop for grandeur
            maxHeight: isMobileView ? '92dvh' : '85dvh',
            padding: isMobileView ? '2.5rem 1.5rem 3rem' : '4rem 3.5rem',
            borderRadius: isMobileView ? '40px 40px 0 0' : '40px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflowY: 'auto',
            background: 'var(--glass-bg, var(--bg-color))',
            border: isMobileView ? 'none' : '1px solid var(--border-color)',
            borderTop: isMobileView ? '1px solid rgba(255,255,255,0.1)' : '1px solid var(--border-color)',
            boxShadow: isMobileView ? '0 -15px 40px rgba(0,0,0,0.1)' : '0 30px 60px -15px rgba(0, 0, 0, 0.2)',
            transition: 'opacity 0.25s ease-out, transform 0.25s ease-out',
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'scale(0.97) translateY(10px)' : 'scale(1) translateY(0)',
        },
        progressIndicator: {
            position: 'absolute',
            top: '2rem',
            left: '2.5rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        title: {
            fontSize: isMobileView ? '2rem' : '2.6rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            margin: '0 0 0.5rem 0',
            lineHeight: 1.15,
            letterSpacing: '-0.5px'
        },
        subtitle: {
            fontSize: isMobileView ? '1.15rem' : '1.25rem',
            color: 'var(--text-secondary)',
            marginBottom: '2.5rem',
            fontWeight: '400',
            lineHeight: 1.5
        },
        inputWrapper: {
            position: 'relative',
            marginBottom: '2rem'
        },
        input: {
            width: '100%',
            padding: '1.25rem 0',
            fontSize: isMobileView ? '2rem' : '2.5rem',
            fontWeight: '800',
            color: 'var(--text-primary)',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid var(--border-color)',
            outline: 'none',
            transition: 'all 0.3s ease',
            textAlign: 'center'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: isMobileView ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
            gap: isMobileView ? '0.75rem' : '1.25rem',
            paddingBottom: '2rem'
        },
        card: {
            background: 'var(--bg-inset, rgba(0,0,0,0.02))',
            border: '2px solid transparent',
            borderRadius: '24px',
            padding: isMobileView ? '1.5rem 0.5rem' : '1.5rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // bouncier transition
        },
        cardSelected: {
            background: 'rgba(var(--primary-rgb), 0.08)',
            border: '2px solid var(--primary-color)',
            boxShadow: '0 12px 24px rgba(var(--primary-rgb), 0.15)',
            transform: 'translateY(-4px) scale(1.02)'
        },
        cardIcon: {
            fontSize: isMobileView ? '2.5rem' : '3rem',
            lineHeight: 1,
            filter: 'drop-shadow(0px 8px 12px rgba(0,0,0,0.15))',
            transition: 'transform 0.3s ease'
        },
        cardLabel: {
            fontSize: '1rem',
            fontWeight: '700',
            color: 'var(--text-primary)'
        },
        footer: {
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem' // stack vertically on mobile
        },
        footerRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            width: '100%',
            flexDirection: isMobileView ? 'column-reverse' : 'row'
        },
        btnPrimary: {
            background: 'linear-gradient(135deg, var(--primary-color) 0%, #8b5cf6 100%)',
            color: '#FFFFFF',
            border: 'none',
            padding: isMobileView ? '1.2rem' : '1.2rem 3rem',
            width: isMobileView ? '100%' : 'auto',
            fontSize: '1.2rem',
            fontWeight: '800',
            borderRadius: '18px',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(var(--primary-rgb), 0.4)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            opacity: (step === 2 && selectedOptions.length < minSelections) ? 0.6 : 1,
        },
        btnSecondary: {
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            padding: '1rem',
            fontSize: '1.1rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        },
        progressBarContainer: {
            width: '100%',
            height: '6px',
            background: 'var(--border-color)',
            borderRadius: '4px',
            marginTop: '1rem',
            overflow: 'hidden'
        },
        progressBarFill: {
            height: '100%',
            background: 'var(--primary-color)',
            width: `${progressPerc}%`,
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }
    };

    if (!config) {
        return (
            <div style={dynamicStyles.container}>
                <Loader2 className="animate-spin text-white w-12 h-12" />
            </div>
        );
    }

    if (isSubmitting) {
        return (
            <div style={dynamicStyles.container}>
                <div style={{...dynamicStyles.contentBox, alignItems: 'center', justifyContent: 'center', minHeight: '400px'}}>
                    <div style={{ position: 'relative' }}>
                        {/* A very sleek loader */}
                        <svg className="animate-spin" width="80" height="80" viewBox="0 0 50 50">
                            <circle cx="25" cy="25" r="20" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                            <circle cx="25" cy="25" r="20" fill="none" stroke="var(--primary-color)" strokeWidth="4" strokeDasharray="30 100" strokeLinecap="round" />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--primary-color)' }}>
                            <Rocket size={28} />
                        </div>
                    </div>
                    <h2 style={{...dynamicStyles.title, marginTop: '2rem'}}>מכינים את הקסם...</h2>
                    <p style={dynamicStyles.subtitle}>אנחנו תופרים את הפרויקטים והמשימות שבחרת, מיוחד בשבילך.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={dynamicStyles.container}>
            {/* Ambient Background Gradient Glows */}
            <div style={{position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(var(--primary-rgb),0.15) 0%, rgba(var(--primary-rgb),0) 70%)', top: '-20%', right: '-10%', zIndex: -1}}></div>
            <div style={{position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0) 70%)', bottom: '-20%', left: '-10%', zIndex: -1}}></div>

            <div style={dynamicStyles.contentBox} className="slide-up-fade-in shadow-2xl">
                {!isMobileView && (
                    <div style={dynamicStyles.progressIndicator}>
                        שלב {step} מתוך 2
                    </div>
                )}

                {step === 1 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ background: 'var(--bg-inset)', width: '80px', height: '80px', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 20px rgba(0,0,0,0.05)', transform: 'rotate(-5deg)' }}>
                                <span style={{ fontSize: '2.5rem' }}>👋</span>
                            </div>
                            <h2 style={dynamicStyles.title}>{config.welcome_title || 'ברוכים הבאים ל-Vee'}</h2>
                            <p style={dynamicStyles.subtitle}>{config.name_prompt || 'איך תרצה שנקרא לך?'}</p>
                        </div>

                        <div style={dynamicStyles.inputWrapper}>
                            <input
                                type="text"
                                style={dynamicStyles.input}
                                placeholder="הזן את שמך כאן..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                autoFocus
                                onFocus={(e) => e.target.style.borderBottomColor = 'var(--primary-color)'}
                                onBlur={(e) => e.target.style.borderBottomColor = 'var(--border-color)'}
                            />
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ background: 'var(--bg-inset)', width: '64px', height: '64px', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', color: 'var(--primary-color)' }}>
                                <LayoutGrid size={28} />
                            </div>
                            <h2 style={dynamicStyles.title}>מה מעניין אותך, {name.split(' ')[0]}?</h2>
                            <p style={dynamicStyles.subtitle}>
                                בחר לפחות {config.min_selections} תחומי עניין.
                                <br/>{selectedOptions.length}/{minSelections} נבחרו
                            </p>
                        </div>

                        <div style={dynamicStyles.grid}>
                            {config.options.map((opt, i) => {
                                const isSelected = selectedOptions.includes(opt.id);
                                return (
                                    <div
                                        key={opt.id}
                                        style={{ ...dynamicStyles.card, ...(isSelected ? dynamicStyles.cardSelected : {}), animationDelay: `${i * 0.05}s` }}
                                        onClick={() => handleOptionToggle(opt.id)}
                                        className="fade-in"
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.transform = 'translateY(-4px)';
                                                e.currentTarget.style.boxShadow = '0 12px 20px rgba(0,0,0,0.05)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        {isSelected && (
                                            <div style={{ position: 'absolute', top: 12, right: 12, color: 'var(--primary-color)' }}>
                                                <Check strokeWidth={4} size={20} />
                                            </div>
                                        )}
                                        <div style={{...dynamicStyles.cardIcon, transform: isSelected ? 'scale(1.1) translateY(-4px)' : 'scale(1)'}}>
                                            {opt.icon}
                                        </div>
                                        <div style={dynamicStyles.cardLabel}>{opt.label}</div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                <div style={dynamicStyles.footer}>
                    {step === 2 && (
                        <div style={dynamicStyles.progressBarContainer}>
                            <div style={dynamicStyles.progressBarFill}></div>
                        </div>
                    )}
                    
                    <div style={dynamicStyles.footerRow}>
                        {step === 2 ? (
                            <button style={dynamicStyles.btnSecondary} onClick={() => jumpStep(1)}>
                                <ArrowRight size={18} />
                                חזור אחורה
                            </button>
                        ) : (
                            <div></div> // Empty div for flex-between spacing
                        )}

                        <button 
                            style={dynamicStyles.btnPrimary} 
                            onClick={handleNext}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            {step === 1 ? (
                                <>בואו נתחיל <ArrowLeft size={20} /></>
                            ) : (
                                <>צור את הסביבה שלי <Rocket size={20} /></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingWizard;
