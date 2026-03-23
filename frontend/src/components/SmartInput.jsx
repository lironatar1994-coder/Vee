import React, { useRef, useEffect, useState } from 'react';
import ContentEditable from 'react-contenteditable';
import { parse } from 'date-fns';

const SmartInput = ({ html, setHtml, placeholder, autoFocus, style, onKeyDown, date, setDate, time, setTime, showSpan = true, ref }) => {
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

    const handleChange = (evt) => {
        const currentHtml = evt.target.value;
        setHtml(currentHtml);

        const plainText = currentHtml.replace(/<[^>]*>?/gm, '').trim();
        if (plainText === lastSyncText) return;
        setLastSyncText(plainText);

        const timeRegex = /@(\d{1,2}:\d{2})/;
        const timeMatch = plainText.match(timeRegex);

        if (timeMatch && setTime) {
            setTime(timeMatch[1].padStart(5, '0'));
            const cleanedHtml = currentHtml.replace(timeRegex, '').trim();
            setHtml(cleanedHtml);
        }
    };

    return (
        <ContentEditable
            innerRef={contentEditable}
            html={html || ''}
            disabled={false}
            onChange={handleChange}
            onInput={(evt) => {
                // Immediate sync for mobile
                setHtml(evt.target.innerHTML);
            }}
            tagName="div"
            style={{
                ...style,
                minHeight: '1.5em',
                cursor: 'text'
            }}
            onKeyDown={onKeyDown}
            data-placeholder={placeholder}
            className={`smart-input-area ${(!html || html === '<br>') ? 'is-empty' : ''}`}
        />
    );
};

export default SmartInput;
