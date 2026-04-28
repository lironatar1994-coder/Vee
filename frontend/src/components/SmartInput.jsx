import React, { useRef, useEffect, useState } from 'react';
import { parse } from 'date-fns';

const SmartInput = ({ html, setHtml, placeholder, autoFocus, style, onKeyDown, date, setDate, time, setTime, showSpan = true, ref, className, disabled }) => {
    const contentEditable = useRef(null);
    const [lastSyncText, setLastSyncText] = useState('');
    const hebrewMonthNames = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

    // Bind local ref to external ref if provided (Standard React 19 pattern)
    useEffect(() => {
        if (ref) {
            if (typeof ref === 'function') ref(contentEditable.current);
            else ref.current = contentEditable.current;
        }
    }, [ref]);

    useEffect(() => {
        if (autoFocus && contentEditable.current) {
            const timer = setTimeout(() => {
                contentEditable.current.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [autoFocus]);

    const onInput = (evt) => {
        let currentHtml = evt.target.innerHTML;
        const plainText = evt.target.innerText || '';
        
        if (plainText !== lastSyncText) {
            setLastSyncText(plainText);

            const timeRegex = /@(\d{1,2}:\d{2})/;
            const timeMatch = plainText.match(timeRegex);

            if (timeMatch && setTime) {
                setTime(timeMatch[1].padStart(5, '0'));
                // Note: we don't necessarily want to strip the text while they type if it's confusing
                // but let's keep the existing logic of cleaning it if matched
                currentHtml = currentHtml.replace(/@\d{1,2}:\d{2}/, '').trim();
            }
        }
        
        setHtml(currentHtml);
    };

    // Sync HTML to DOM only if it changes from OUTSIDE
    useEffect(() => {
        if (contentEditable.current && html !== contentEditable.current.innerHTML) {
            contentEditable.current.innerHTML = html || '';
        }
    }, [html]);

    return (
        <div
            ref={contentEditable}
            contentEditable={!disabled}
            suppressContentEditableWarning={true}
            onInput={onInput}
            onKeyDown={onKeyDown}
            style={{
                ...style,
                minHeight: '1.5em',
                outline: 'none',
                cursor: 'text'
            }}
            data-placeholder={placeholder}
            className={`smart-input-area ${className || ''} ${(!html || html === '<br>' || html === '') ? 'is-empty' : ''}`}
        />
    );
};

export default SmartInput;
