import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/api/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const navigate = useNavigate();
    const { token } = useAuthStore();
    const { isLoading, isError } = useAuth();

    useEffect(() => {
        if (!token) {
            // No token, redirect to login
            navigate('/login');
            return;
        }

        if (isError) {
            // Error fetching user, token is invalid
            useAuthStore.setState({ token: null, isAuthenticated: false });
            localStorage.removeItem('auth_token');
            navigate('/login');
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
