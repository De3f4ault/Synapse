import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/api/hooks/useAuth';

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const { initializeFromStorage, setUser } = useAuthStore();
    const { user, isLoading } = useAuth();

    useEffect(() => {
        // Initialize auth state from localStorage on mount
        initializeFromStorage();
    }, [initializeFromStorage]);

    useEffect(() => {
        // Set user in store when fetched
        if (user && !isLoading) {
            setUser(user);
        }
    }, [user, isLoading, setUser]);

    return <>{children}</>;
};
