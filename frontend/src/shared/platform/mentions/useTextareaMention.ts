import { useCallback, RefObject } from "react";
import { useMentionController } from "./useMentionController";
import type { EntitySearchResult } from "../types";

interface UseTextareaMentionProps {
    /** Ref to the textarea element */
    textareaRef: RefObject<HTMLTextAreaElement>;
    /** Current value of the textarea (controlled) */
    value: string;
    /** Setter for the textarea value */
    onChange: (value: string) => void;
    /** Callback to update the search query in the parent */
    onSearchChange: (query: string) => void;
    /** Search results from the parent */
    results?: EntitySearchResult[];
}

/**
 * Adapter hook to wire the Mention System into a standard Textarea.
 * Handles trigger detection (@), cursor tracking, and insertion.
 */
export function useTextareaMentionAdapter({
    textareaRef,
    onChange,
    onSearchChange,
    results = []
}: UseTextareaMentionProps) {

    // We don't keep local search query state here, we push it up via onSearchChange

    const handleSelectEntity = useCallback((entity: EntitySearchResult) => {
        if (!textareaRef.current) return;

        const input = textareaRef.current;
        const val = input.value;
        const selectionEnd = input.selectionEnd;

        const lastAtPos = val.lastIndexOf("@", selectionEnd - 1);
        if (lastAtPos !== -1) {
            const beforeAt = val.substring(0, lastAtPos);
            const afterCursor = val.substring(selectionEnd);
            const mentionText = `@[${entity.title}](entity:${entity.type}:${entity.id}) `;
            const newValue = beforeAt + mentionText + afterCursor;

            onChange(newValue);

            // Clear search
            onSearchChange("");

            setTimeout(() => {
                input.focus();
                const newCursorPos = lastAtPos + mentionText.length;
                input.setSelectionRange(newCursorPos, newCursorPos);
            }, 0);
        }
    }, [textareaRef, onChange, onSearchChange]);

    const controller = useMentionController({
        onSelect: handleSelectEntity,
        onClose: () => onSearchChange(""),
    }, results);

    const onInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        const selectionEnd = e.target.selectionEnd;
        // Simple logic: Trigger if @ is typed and we are in a valid fragment
        const lastAt = newValue.lastIndexOf("@", selectionEnd - 1);

        if (lastAt !== -1) {
            const fragment = newValue.substring(lastAt + 1, selectionEnd);
            if (!fragment.includes("\n") && fragment.length < 50) {
                if (!controller.isPickerOpen) controller.openPicker(fragment);
                else controller.setQuery(fragment);

                onSearchChange(fragment);
                return;
            }
        }
        if (controller.isPickerOpen) {
            controller.closePicker();
            onSearchChange("");
        }
    }, [onChange, controller, onSearchChange]);

    const onKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (controller.isPickerOpen) {
            // handleKeyDown returns true if it handled the event (navigation/selection)
            controller.handleKeyDown(e);
            // If handled, we shouldn't preventDefault here because controller does it.
            // But we should signal to caller?
            // Controller's handleKeyDown already prevents default for navigation keys.
        }
    }, [controller]);

    return {
        ...controller,
        onInput,
        onKeyDown,
        handleSelectEntity
    };
}
