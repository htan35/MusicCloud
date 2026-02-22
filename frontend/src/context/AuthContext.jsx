import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if already logged in (cookie still valid)
    useEffect(() => {
        authApi.me()
            .then(data => { if (data.success) setUser(data.user); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const register = useCallback(async (email, username, password) => {
        const data = await authApi.register(email, username, password);
        if (data.success) setUser(data.user);
        return data;
    }, []);

    const login = useCallback(async (username, password) => {
        const data = await authApi.login(username, password);
        if (data.success) setUser(data.user);
        return data;
    }, []);

    const logout = useCallback(async () => {
        await authApi.logout();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
