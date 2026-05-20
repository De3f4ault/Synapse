import { getAuthToken } from "@/api/client";
import type { FeedbackEvent, QualifiedSignal } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export const feedbackApi = {
    /**
     * Submit a feedback event to the Intelligence Loop.
     * 
     * @param event The structured feedback event
     * @returns List of immediately qualified signals (if any)
     */
    submit: async (event: FeedbackEvent): Promise<QualifiedSignal[]> => {
        const token = getAuthToken();
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}/feedback/`, {
            method: "POST",
            headers,
            body: JSON.stringify(event)
        });

        if (!response.ok) {
            console.error("Feedback submission failed:", response.statusText);
            throw new Error(`Feedback submission failed: ${response.statusText}`);
        }

        return await response.json();
    }
};
