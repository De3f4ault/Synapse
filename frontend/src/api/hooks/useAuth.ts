import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthenticationService } from '@/api/generated';
import type { UserLogin, UserRegister } from '@/api/generated';
import { useAuthStore } from '@/stores/authStore';

const AUTH_KEYS = {
    user: ['auth', 'user'] as const,
};

export function useAuth() {
    const queryClient = useQueryClient();
    const { setAuth, clearAuth, token } = useAuthStore();

    const loginMutation = useMutation({
        mutationFn: (data: UserLogin) => AuthenticationService.loginApiV1AuthLoginPost(data),
        onSuccess: (response) => {
            setAuth(response.access_token, null);
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
        },
    });

    const registerMutation = useMutation({
        mutationFn: (data: UserRegister) => AuthenticationService.registerApiV1AuthRegisterPost(data),
        onSuccess: (response) => {
            setAuth(response.access_token, null);
            queryClient.invalidateQueries({ queryKey: AUTH_KEYS.user });
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => AuthenticationService.logoutApiV1AuthLogoutPost(),
        onSuccess: () => {
            clearAuth();
            queryClient.clear();
        },
    });

    const userQuery = useQuery({
        queryKey: AUTH_KEYS.user,
        queryFn: () => AuthenticationService.getCurrentUserProfileApiV1AuthMeGet(),
        enabled: !!token,
        retry: false,
    });

    return {
        login: loginMutation.mutate,
        register: registerMutation.mutate,
        logout: logoutMutation.mutate,
        user: userQuery.data,
        isAuthenticated: !!userQuery.data,
        isLoading: loginMutation.isPending || registerMutation.isPending || userQuery.isLoading,
        isError: loginMutation.isError || registerMutation.isError || userQuery.isError,
        error: loginMutation.error || registerMutation.error || userQuery.error,
    };
}

export { useAuth as useAuthHooks };
