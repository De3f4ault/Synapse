import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserResponse } from '../api/generated/types.gen';

interface AuthState {
    token: string | null;
    user: UserResponse | null;
    isAuthenticated: boolean;
    setAuth: (token: string, user: UserResponse | null) => void;
    setToken: (token: string) => void;
    setUser: (user: UserResponse) => void;
    clearAuth: () => void;
    initializeFromStorage: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            token: null,
            user: null,
            isAuthenticated: false,

            setAuth: (token, user) =>
            set({
                token,
                user,
                isAuthenticated: !!token,
            }),

            setToken: (token) =>
            set((state) => ({
                token,
                isAuthenticated: !!token,
                user: state.user,
            })),

            setUser: (user) =>
            set((state) => ({
                user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            })),

            clearAuth: () =>
            set({
                token: null,
                user: null,
                isAuthenticated: false,
            }),

            /**
             * Initialize auth state from localStorage
             * Useful for rehydrating state after page refresh
             */
            initializeFromStorage: () => {
                try {
                    const authData = localStorage.getItem('synapse-auth');
                    if (!authData) return;

                    const parsed = JSON.parse(authData);
                    const state = parsed?.state;

                    if (state?.token) {
                        set({
                            token: state.token,
                            user: state.user || null,
                            isAuthenticated: true,
                        });
                    }
                } catch (error) {
                    console.error('Failed to initialize auth from storage:', error);
                    // Clear corrupted data
                    get().clearAuth();
                }
            },
        }),
        {
            name: 'synapse-auth',
        }
    )
);
