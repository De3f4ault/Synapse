import { useState, useCallback, useEffect } from "react";
import { type EntitySearchResult } from "../types";

export interface UseMentionControllerProps {
    /** Callback when an entity is selected */
    onSelect: (entity: EntitySearchResult) => void;
    /** Callback to close the picker explicitly */
    onClose?: () => void;
}

export interface UseMentionControllerReturn {
    isPickerOpen: boolean;
    query: string;
    activeIndex: number;
    openPicker: (initialQuery?: string) => void;
    closePicker: () => void;
    setQuery: (query: string) => void;
    handleKeyDown: (e: React.KeyboardEvent) => boolean; // Returns true if handled
    setActiveIndex: (index: number) => void;
}

/**
 * Headless controller for mention logic.
 * Manages state for the picker, navigation, and query tracking.
 */
export function useMentionController({ onSelect, onClose }: UseMentionControllerProps, results: EntitySearchResult[]): UseMentionControllerReturn {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    // Reset index when results change
    useEffect(() => {
        setActiveIndex(0);
    }, [results.length]); // Only reset if count changes to avoid jumping on stable results

    const openPicker = useCallback((initialQuery = "") => {
        setIsPickerOpen(true);
        setQuery(initialQuery);
        setActiveIndex(0);
    }, []);

    const closePicker = useCallback(() => {
        setIsPickerOpen(false);
        setQuery("");
        setActiveIndex(0);
        onClose?.();
    }, [onClose]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent): boolean => {
        if (!isPickerOpen) return false;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % results.length);
                return true;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + results.length) % results.length);
                return true;
            case "Enter":
            case "Tab":
                if (results[activeIndex]) {
                    e.preventDefault();
                    onSelect(results[activeIndex]);
                    closePicker();
                    return true;
                }
                return false;
            case "Escape":
                e.preventDefault();
                closePicker();
                return true;
            default:
                return false;
        }
    }, [isPickerOpen, results, activeIndex, onSelect, closePicker]);

    return {
        isPickerOpen,
        query,
        activeIndex,
        openPicker,
        closePicker,
        setQuery,
        handleKeyDown,
        setActiveIndex,
    };
}
