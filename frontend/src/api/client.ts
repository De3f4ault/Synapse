import { OpenAPI } from './generated/core/OpenAPI';

<<<<<<< HEAD
// Configure the OpenAPI client - Default to port 8000
=======
// Configure the OpenAPI client
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Set base URL
OpenAPI.BASE = API_BASE_URL;

<<<<<<< HEAD
// Enable credentials to send cookies/auth headers
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.CREDENTIALS = 'include';

=======
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
// Configure token resolver - this function is called before each request
// to dynamically retrieve the current token from localStorage
OpenAPI.TOKEN = async () => {
    try {
        const authData = localStorage.getItem('synapse-auth');
        if (!authData) return undefined;

        const parsed = JSON.parse(authData);
        return parsed?.state?.token || undefined;
    } catch (error) {
        console.error('Failed to retrieve auth token:', error);
        return undefined;
    }
};

// DO NOT set OpenAPI.HEADERS - it conflicts with the TOKEN resolver
// The request.ts file will automatically add the Authorization header
// using the token returned by OpenAPI.TOKEN

export { OpenAPI };

/**
<<<<<<< HEAD
=======
 * FIX 2:
>>>>>>> 0beb317ceabb56c602374af9c5a336f24e73e32a
 * Add getAuthToken export for compatibility with hooks & services.
 * This must remain a synchronous function.
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
