import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

const API_URL = '/api';

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            try {
                setUser(JSON.parse(storedUser));
                setToken(storedToken);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    /**
     * Authenticated Fetch Wrapper
     */
    const authFetch = async (url, options = {}) => {
        const currentToken = token || localStorage.getItem('token');
        const headers = {
            ...options.headers,
            'Authorization': currentToken ? `Bearer ${currentToken}` : '',
            'Content-Type': options.headers?.['Content-Type'] || 'application/json'
        };

        const response = await fetch(url, { ...options, headers });
        
        if (response.status === 401) {
            // Auto logout on token expiration
            logout();
        }
        
        return response;
    };

    const login = async (username, email, preloadedUser = null, preloadedToken = null) => {
        try {
            if (preloadedUser && preloadedToken) {
                setUser(preloadedUser);
                setToken(preloadedToken);
                localStorage.setItem('user', JSON.stringify(preloadedUser));
                localStorage.setItem('token', preloadedToken);
                return { success: true };
            }
            
            // Note: Normal email/pass login is handled in Login.jsx directly for now,
            // then calls this function with preloadedUser/Token.
            return { success: false, error: 'Login parameters missing' };
        } catch (err) {
            console.error(err);
            return { success: false, error: 'Network error' };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const updateUser = (newUserData) => {
        setUser(newUserData);
        localStorage.setItem('user', JSON.stringify(newUserData));
    };

    return (
        <UserContext.Provider value={{ user, token, login, logout, updateUser, authFetch, loading }}>
            {!loading && children}
        </UserContext.Provider>
    );
};

