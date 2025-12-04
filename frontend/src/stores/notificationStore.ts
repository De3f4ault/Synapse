import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Notification Store
 *
 * Manages in-app notifications with:
 * - Persistent storage (localStorage)
 * - Unread count tracking
 * - Type-based filtering
 * - Action button support
 * - Auto-cleanup (keeps last 50)
 */

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: number;
    read: boolean;
    action?: {
        label: string;
        href: string;
    };
}

interface NotificationState {
    // State
    notifications: Notification[];
    unreadCount: number;

    // Actions
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    removeNotification: (id: string) => void;
    clearAll: () => void;
    clearOld: () => void; // Keep only last 50
}

const MAX_NOTIFICATIONS = 50;

export const useNotificationStore = create<NotificationState>()(
    persist(
        (set, get) => ({
            // Initial state
            notifications: [],
            unreadCount: 0,

            // Add new notification
            addNotification: (notification) => {
                const newNotification: Notification = {
                    ...notification,
                    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                       timestamp: Date.now(),
                       read: false,
                };

                set((state) => {
                    const notifications = [newNotification, ...state.notifications];

                    // Keep only last MAX_NOTIFICATIONS
                    const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);
                    const unreadCount = trimmed.filter(n => !n.read).length;

                    return {
                        notifications: trimmed,
                        unreadCount,
                    };
                });
            },

            // Mark single notification as read
            markAsRead: (id) => {
                set((state) => {
                    const notifications = state.notifications.map(n =>
                    n.id === id ? { ...n, read: true } : n
                    );
                    const unreadCount = notifications.filter(n => !n.read).length;

                    return { notifications, unreadCount };
                });
            },

            // Mark all as read
            markAllAsRead: () => {
                set((state) => ({
                    notifications: state.notifications.map(n => ({ ...n, read: true })),
                                unreadCount: 0,
                }));
            },

            // Remove single notification
            removeNotification: (id) => {
                set((state) => {
                    const notifications = state.notifications.filter(n => n.id !== id);
                    const unreadCount = notifications.filter(n => !n.read).length;

                    return { notifications, unreadCount };
                });
            },

            // Clear all notifications
            clearAll: () => {
                set({
                    notifications: [],
                    unreadCount: 0,
                });
            },

            // Clear old notifications (keep last 50)
            clearOld: () => {
                set((state) => {
                    const notifications = state.notifications.slice(0, MAX_NOTIFICATIONS);
                    const unreadCount = notifications.filter(n => !n.read).length;

                    return { notifications, unreadCount };
                });
            },
        }),
        {
            name: 'synapse-notifications',
            // Recompute unread count on rehydration
            onRehydrateStorage: () => (state) => {
                if (state) {
                    const unreadCount = state.notifications.filter(n => !n.read).length;
                    state.unreadCount = unreadCount;
                }
            },
        }
    )
);

/**
 * Helper hook to add notifications with common patterns
 */
export const useNotifications = () => {
    const addNotification = useNotificationStore(s => s.addNotification);

    return {
        success: (title: string, message: string, action?: Notification['action']) => {
            addNotification({ type: 'success', title, message, action });
        },
        error: (title: string, message: string, action?: Notification['action']) => {
            addNotification({ type: 'error', title, message, action });
        },
        warning: (title: string, message: string, action?: Notification['action']) => {
            addNotification({ type: 'warning', title, message, action });
        },
        info: (title: string, message: string, action?: Notification['action']) => {
            addNotification({ type: 'info', title, message, action });
        },
    };
};
