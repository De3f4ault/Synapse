import { client } from './generated/services.gen';

// Configure the API client base URL
// When using Vite proxy, we can use relative URLs or the full backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Set base URL for the generated client
client.setConfig({
    baseUrl: API_BASE_URL,
});

// Add request interceptor to include auth token
client.interceptors.request.use((request) => {
    try {
        const authData = localStorage.getItem('synapse-auth');
        if (authData) {
            const parsed = JSON.parse(authData);
            const token = parsed?.state?.token;

            if (token) {
                // Use Headers API set() method - request.headers is a Headers object
                if (request.headers instanceof Headers) {
                    request.headers.set('Authorization', `Bearer ${token}`);
                } else if (typeof request.headers === 'object') {
                    // Fallback for plain object headers
                    (request.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
                }
            }
        }
    } catch (error) {
        console.error('Failed to add auth token to request:', error);
    }

    return request;
});

// Add response interceptor for error handling
client.interceptors.response.use((response) => {
    // Handle 401 Unauthorized errors
    if (response.status === 401) {
        // Clear auth state
        localStorage.removeItem('synapse-auth');
        // Redirect to login
        window.location.href = '/login';
    }

    return response;
});

export { client };

/**
 * Helper function to get auth token synchronously
 * Used by stores and hooks
 */
export function getAuthToken(): string | undefined {
    try {
        const authData = localStorage.getItem('synapse-auth');
        if (!authData) return undefined;

        const parsed = JSON.parse(authData);
        return parsed?.state?.token || undefined;
    } catch (error) {
        console.error('Failed to retrieve auth token:', error);
        return undefined;
    }
}
