import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const HeaderConfigContext = createContext();
const HeaderScrollContext = createContext();

export const useHeader = () => {
    const context = useContext(HeaderConfigContext);
    if (!context) {
        throw new Error('useHeader must be used within a HeaderProvider');
    }
    return context;
};

export const useHeaderScroll = () => {
    const context = useContext(HeaderScrollContext);
    if (context === undefined) {
        throw new Error('useHeaderScroll must be used within a HeaderProvider');
    }
    return context;
};

export const HeaderProvider = ({ children }) => {
    const [headerState, setHeaderState] = useState({
        title: '',
        breadcrumb: '',
        headerActions: null,
        showCompletedToggle: false,
        isCompletedActive: false,
        onCompletedToggle: null,
        forceShowTitle: false
    });

    const [scrollTop, setScrollTopInternal] = useState(0);

    const updateHeader = useCallback((newState) => {
        setHeaderState(prev => ({
            ...prev,
            ...newState
        }));
    }, []);

    const setScrollTop = useCallback((top) => {
        setScrollTopInternal(top);
    }, []);

    const configValue = useMemo(() => ({
        ...headerState,
        updateHeader
    }), [headerState, updateHeader]);

    const scrollValue = useMemo(() => ({
        scrollTop,
        setScrollTop
    }), [scrollTop, setScrollTop]);

    return (
        <HeaderConfigContext.Provider value={configValue}>
            <HeaderScrollContext.Provider value={scrollValue}>
                {children}
            </HeaderScrollContext.Provider>
        </HeaderConfigContext.Provider>
    );
};
