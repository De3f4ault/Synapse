/**
 * Notes Module - MarkdownPreview Component
 * Thin wrapper around shared MarkdownRenderer.
 *
 * MIGRATED FROM: pages/notes/components/editor/MarkdownPreview.tsx
 * NOTE: Consider importing MarkdownRenderer directly in new code.
 */

import React from "react";
import { MarkdownRenderer } from "@/shared/rendering";

// ============================================================================
// Types
// ============================================================================

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Markdown preview with syntax highlighting.
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
    content,
    className,
}) => {
    return <MarkdownRenderer content={content} className={className} />;
};
