import React, { useEffect, useState } from 'react';

const DynamicTodayIcon = ({
    size = 24,
    color = "currentColor",
    strokeWidth = 2,
    className = ""
}) => {
    const [day, setDay] = useState('');

    useEffect(() => {
        const getIsraelDay = () => {
            const date = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Jerusalem',
                day: '2-digit',
            });
            return formatter.format(date);
        };

        setDay(getIsraelDay());

        // Update at least every minute to ensure we cross midnight accurately
        // in case the app is left open.
        const interval = setInterval(() => {
            setDay(getIsraelDay());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`lucide lucide-calendar ${className}`}
        >
            <path d="M8 2v4" />
            <path d="M16 2v4" />
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M3 10h18" />
            {day && (
                <text
                    x="12"
                    y="18"
                    textAnchor="middle"
                    stroke="none"
                    fill={color}
                    style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                >
                    {day}
                </text>
            )}
        </svg>
    );
};

export default DynamicTodayIcon;
