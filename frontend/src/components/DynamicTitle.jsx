import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * DynamicTitle component manages the document.title based on the current route
 * and tab visibility. It provides an interactive and creative experience in Hebrew.
 */
const DynamicTitle = () => {
    const location = useLocation();
    const [isTabActive, setIsTabActive] = useState(true);
    const [customTitle, setCustomTitle] = useState(null);
    const [taskCounts, setTaskCounts] = useState({ today: 0, inbox: 0 });

    // Listen for granular task count updates from Sidebar
    useEffect(() => {
        const handleTaskCount = (event) => {
            if (event.detail && typeof event.detail === 'object') {
                setTaskCounts(event.detail);
            }
        };
        window.addEventListener('taskCountUpdated', handleTaskCount);
        return () => window.removeEventListener('taskCountUpdated', handleTaskCount);
    }, []);

    // Handle visibility change for interactive titles when user leaves the tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsTabActive(!document.hidden);
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Listen for custom title updates from specific pages (like Project page)
    useEffect(() => {
        const handleCustomTitle = (event) => {
            if (event.detail) {
                setCustomTitle(event.detail);
            }
        };
        window.addEventListener('updatePageTitle', handleCustomTitle);
        return () => window.removeEventListener('updatePageTitle', handleCustomTitle);
    }, []);

    // Reset custom title on route change
    useEffect(() => {
        setCustomTitle(null);
    }, [location.pathname]);

    useEffect(() => {
        const path = location.pathname;
        let baseTitle = 'Vee';

        if (!isTabActive) {
            // Progressive/Dynamic titles when tab is blurred
            if (taskCounts.today > 0) {
                document.title = `Vee - יש לך ${taskCounts.today} משימות היום`;
            } else if (taskCounts.inbox > 0) {
                document.title = `Vee - יש לך ${taskCounts.inbox} משימות בתיבה`;
            } else {
                document.title = 'Vee - המשימות שלך מחכות לך ✨';
            }
            return;
        }

        // Mapping for active titles based on route or custom title
        let pageTitle = '';

        if (customTitle) {
            pageTitle = customTitle;
        } else if (path.includes('/today')) {
            pageTitle = 'המשימות להיום ☀️';
        } else if (path.includes('/inbox')) {
            pageTitle = 'תיבת המשימות 📥';
        } else if (path.includes('/projects')) {
            pageTitle = 'הפרויקטים שלי 📁';
        } else if (path.includes('/project/')) {
            pageTitle = 'פרויקט';
        } else if (path.includes('/calendar')) {
            pageTitle = 'לוח שנה 📅';
        } else if (path.includes('/history')) {
            pageTitle = 'היסטוריה ⏳';
        } else if (path.includes('/admin/users')) {
            pageTitle = 'ניהול משתמשים 👥';
        } else if (path.includes('/admin/login')) {
            pageTitle = 'כניסת מנהל 🔐';
        } else if (path.includes('/admin')) {
            pageTitle = 'לוח בקרה 🛠️';
        } else if (path.includes('/login')) {
            pageTitle = 'התחברות 👋';
        }

        document.title = pageTitle ? `${baseTitle} - ${pageTitle}` : baseTitle;
    }, [location, isTabActive, customTitle]);

    return null;
};

export default DynamicTitle;
