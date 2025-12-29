/**
 * MarkdownPreview - Thin wrapper around shared MarkdownRenderer
 *
 * NOTE: This file exists for backwards compatibility.
 * New code should import directly from @/shared/rendering.
 */

import React from "react";
import { MarkdownRenderer } from "@/shared/rendering";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Markdown preview with syntax highlighting
 * @deprecated Use MarkdownRenderer from @/shared/rendering directly
 */
export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className,
}) => {
  return <MarkdownRenderer content={content} className={className} />;
};
