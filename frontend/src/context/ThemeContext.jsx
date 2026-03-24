import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'light');

    useEffect(() => {
        console.log(`Applying theme: ${theme}`);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const changeTheme = (newTheme) => {
        setThemeState(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        changeTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, changeTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
