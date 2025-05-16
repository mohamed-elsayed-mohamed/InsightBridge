import { useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
    id: string;
    email: string;
    roles: string[];
    givenName?: string;
    surname?: string;
}

interface JwtPayload {
    [key: string]: any; // Allow dynamic access
}

interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
}

export const useAuth = () => {
    const [authState, setAuthState] = useState<AuthState>(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            return { isAuthenticated: false, user: null, token: null };
        }
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            // Extract claims safely
            const id = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
            const givenName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
            const surname = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
            let roles = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
            if (!id || !email) throw new Error('Invalid token structure');
            if (!roles) roles = [];
            if (!Array.isArray(roles)) roles = [roles];
            const user: User = { id, email, givenName, surname, roles };
            return { isAuthenticated: true, user, token };
        } catch {
            localStorage.removeItem('token');
            return { isAuthenticated: false, user: null, token: null };
        }
    });

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setAuthState({ isAuthenticated: false, user: null, token: null });
    }, []);

    const login = useCallback((token: string) => {
        try {
            const decoded = jwtDecode<JwtPayload>(token);
            const id = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
            const email = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
            const givenName = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'];
            const surname = decoded['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'];
            let roles = decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
            if (!id || !email) throw new Error('Invalid token structure');
            if (!roles) roles = [];
            if (!Array.isArray(roles)) roles = [roles];
            const user: User = { id, email, givenName, surname, roles };
            localStorage.setItem('token', token);
            setAuthState({ isAuthenticated: true, user, token });
        } catch {
            logout();
        }
    }, [logout]);

    const hasRole = useCallback((role: string): boolean => {
        return authState.user?.roles.includes(role) ?? false;
    }, [authState.user]);

    const getRedirectPath = useCallback((): string => {
        if (!authState.isAuthenticated) return '/login';
        return hasRole('Admin') ? '/admin' : '/dashboard';
    }, [authState.isAuthenticated, hasRole]);

    return {
        ...authState,
        login,
        logout,
        hasRole,
        getRedirectPath
    };
}; 