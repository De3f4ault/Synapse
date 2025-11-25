import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHooks } from '@/api/hooks/useAuth';
import { OpenAPI } from '@/api/generated/core/OpenAPI';

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const { initializeFromStorage, token, setUser } = useAuthStore();
    const { useCurrentUser } = useAuthHooks();
    const { data: user, isSuccess } = useCurrentUser(!!token);

    useEffect(() => {
        // Initialize auth state from localStorage on mount
        initializeFromStorage();

        // Set OpenAPI configuration with token from localStorage
        const storedToken = localStorage.getItem('auth_token');
        if (storedToken) {
            OpenAPI.TOKEN = storedToken;
        }
    }, []);

    useEffect(() => {
        // Update OpenAPI token when token changes
        if (token) {
            OpenAPI.TOKEN = token;
        } else {
            OpenAPI.TOKEN = '';
        }
    }, [token]);

    useEffect(() => {
        // Set user in store when fetched
        if (isSuccess && user) {
            setUser(user);
        }
    }, [user, isSuccess, setUser]);

    return <>{children}</>;
};
