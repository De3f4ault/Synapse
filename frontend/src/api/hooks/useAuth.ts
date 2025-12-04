import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    loginApiV1AuthLoginPost,
    registerApiV1AuthRegisterPost,
    logoutApiV1AuthLogoutPost,
    getCurrentUserProfileApiV1AuthMeGet
} from '@/api/generated/services.gen';
import type { UserLogin, UserRegister } from '@/api/generated/types.gen';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryKeys';

export function useAuth() {
    const queryClient = useQueryClient();
    const { setAuth, clearAuth } = useAuthStore();

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: (credentials: { requestBody: UserLogin }) =>
        loginApiV1AuthLoginPost(credentials),
                                      onSuccess: (data) => {
                                          setAuth(data.access_token, null);
                                          queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
                                      },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: (userData: { requestBody: UserRegister }) =>
        registerApiV1AuthRegisterPost(userData),
                                         onSuccess: (data) => {
                                             setAuth(data.access_token, null);
                                             queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() });
                                         },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: logoutApiV1AuthLogoutPost,
        onSuccess: () => {
            clearAuth();
            queryClient.clear();
        },
    });

    // User profile query
    const userQuery = useQuery({
        queryKey: queryKeys.auth.user(),
                               queryFn: getCurrentUserProfileApiV1AuthMeGet,
                               enabled: !!useAuthStore.getState().token,
                               retry: false,
    });

    return {
        login: loginMutation.mutate,
        register: registerMutation.mutate,
        logout: logoutMutation.mutate,
        user: userQuery.data,
        isLoading: loginMutation.isPending || registerMutation.isPending || userQuery.isLoading,
        isError: loginMutation.isError || registerMutation.isError || userQuery.isError,
        error: loginMutation.error || registerMutation.error || userQuery.error,
    };
}

// FIX 3: Export useAuth as useAuthHooks for compatibility
export { useAuth as useAuthHooks };
