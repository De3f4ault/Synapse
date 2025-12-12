import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { useAuthHooks } from '@/api/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const navigate = useNavigate();
    const { token, isAuthenticated } = useAuthStore();
    const { useCurrentUser } = useAuthHooks();

    // Only enable query if we have a token
    const { isLoading, isError } = useCurrentUser(!!token);

    useEffect(() => {
        if (!token) {
            // No token, redirect to login
            navigate({ to: '/login' });
            return;
        }

        if (isError) {
            // Error fetching user, token is invalid
            useAuthStore.setState({ token: null, isAuthenticated: false });
            localStorage.removeItem('auth_token');
            navigate({ to: '/login' });
        }
    }, [token, isError, navigate]);

    if (!token) {
        return null;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return <>{children}</>;
};
