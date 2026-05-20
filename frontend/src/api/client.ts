import { OpenAPI } from "./generated/core/OpenAPI";

// Configure the API client base URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

// Set base URL for the generated client
OpenAPI.BASE = API_BASE_URL;

// Enable credentials to send cookies/auth headers
OpenAPI.WITH_CREDENTIALS = true;
OpenAPI.CREDENTIALS = "include";

// Configure token resolver - this function is called before each request
// to dynamically retrieve the current token from localStorage
OpenAPI.TOKEN = async () => {
  try {
    const authData = localStorage.getItem("synapse-auth");
    if (!authData) return undefined;

    const parsed = JSON.parse(authData);
    return parsed?.state?.token || undefined;
  } catch (error) {
    console.error("Failed to retrieve auth token:", error);
    return undefined;
  }
};

export { OpenAPI };

/**
 * Helper function to get auth token synchronously
 * Used by stores and hooks
 */
export function getAuthToken(): string | undefined {
  try {
    const authData = localStorage.getItem("synapse-auth");
    if (!authData) return undefined;

    const parsed = JSON.parse(authData);
    return parsed?.state?.token || undefined;
  } catch (error) {
    console.error("Failed to retrieve auth token:", error);
    return undefined;
  }
}
