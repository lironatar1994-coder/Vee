import React, { useState, useRef, useEffect } from 'react';
import { Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../context/ThemeContext';

const EmojiSelector = ({ onEmojiSelect }) => {
    const [showPicker, setShowPicker] = useState(false);
    const { theme } = useTheme();
    const pickerRef = useRef(null);

    const onEmojiClick = (emojiObject) => {
        onEmojiSelect(emojiObject.emoji);
        setShowPicker(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                setShowPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div style={{ position: 'relative' }} ref={pickerRef}>
            <button
                type="button"
                onClick={() => setShowPicker(prev => !prev)}
                className="btn-icon-soft"
                style={{
                    width: '34px', height: '34px', borderRadius: '50%', padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}
                title="אימוג'י"
            >
                <Smile size={18} style={{ color: showPicker ? 'var(--primary-color)' : 'var(--text-secondary)' }} />
            </button>

            {showPicker && (
                <div style={{ position: 'absolute', bottom: '100%', right: '0', zIndex: 100, paddingBottom: '0.5rem', minWidth: '280px' }}>
                    <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        theme={theme === 'dark' ? 'dark' : 'light'}
                        searchPlaceholder="חיפוש אימוג'י..."
                        width={280}
                        height={320}
                        previewConfig={{ showPreview: false }}
                    />
                </div>
            )}
        </div>
    );
};

export default EmojiSelector;
