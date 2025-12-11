import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHooks } from '@/api/hooks/useAuth';

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

        // Note: OpenAPI.TOKEN is already configured as a function in api/client.ts
        // It automatically reads from localStorage('synapse-auth')
        // No need to set it here - the function handles token retrieval dynamically
    }, [initializeFromStorage]);

    useEffect(() => {
        // Set user in store when fetched
        if (isSuccess && user) {
            setUser(user);
        }
    }, [user, isSuccess, setUser]);

    return <>{children}</>;
};
