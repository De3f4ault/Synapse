/**
 * Markdown parser utilities
 * Handles markdown preprocessing and sanitization
 */

/**
 * Extract code blocks from markdown
 */
export const extractCodeBlocks = (markdown: string): Array<{ language: string; code: string; index: number }> => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string; index: number }> = [];
  let match;
  let index = 0;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    blocks.push({
      language: match[1] || 'plaintext',
      code: match[2].trim(),
                index: index++,
    });
  }

  return blocks;
};

/**
 * Remove code blocks from markdown (for text processing)
 */
export const removeCodeBlocks = (markdown: string): string => {
  return markdown.replace(/```[\s\S]*?```/g, '[code block]');
};

/**
 * Extract inline code
 */
export const extractInlineCode = (text: string): string[] => {
  const inlineCodeRegex = /`([^`]+)`/g;
  const matches: string[] = [];
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    matches.push(match[1]);
  }

  return matches;
};

/**
 * Sanitize markdown for safe rendering
 * Removes potentially dangerous HTML/scripts
 */
export const sanitizeMarkdown = (markdown: string): string => {
  // Remove script tags
  let sanitized = markdown.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  return sanitized;
};

/**
 * Parse markdown table to data structure
 */
export interface TableData {
  headers: string[];
  rows: string[][];
}

export const parseMarkdownTable = (tableString: string): TableData | null => {
  const lines = tableString.trim().split('\n');
  if (lines.length < 3) return null;

  // Parse headers
  const headers = lines[0]
  .split('|')
  .map(h => h.trim())
  .filter(h => h.length > 0);

  // Skip separator line (line[1])

  // Parse rows
  const rows = lines.slice(2).map(line =>
  line
  .split('|')
  .map(cell => cell.trim())
  .filter(cell => cell.length > 0)
  );

  return { headers, rows };
};

/**
 * Convert markdown links to array
 */
export interface MarkdownLink {
  text: string;
  url: string;
  title?: string;
}

export const extractLinks = (markdown: string): MarkdownLink[] => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+?)(?:\s+"([^"]+)")?\)/g;
  const links: MarkdownLink[] = [];
  let match;

  while ((match = linkRegex.exec(markdown)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      title: match[3],
    });
  }

  return links;
};

/**
 * Count words in markdown (excluding code blocks)
 */
export const countWords = (markdown: string): number => {
  const textOnly = removeCodeBlocks(markdown)
  .replace(/[#*_~`\[\]()]/g, '') // Remove markdown syntax
  .replace(/\s+/g, ' ') // Normalize whitespace
  .trim();

  return textOnly.split(' ').filter(word => word.length > 0).length;
};

/**
 * Estimate reading time (words per minute)
 */
export const estimateReadingTime = (markdown: string, wpm: number = 200): number => {
  const wordCount = countWords(markdown);
  return Math.ceil(wordCount / wpm);
};

/**
 * Extract headings from markdown
 */
export interface MarkdownHeading {
  level: number;
  text: string;
  id: string;
}

export const extractHeadings = (markdown: string): MarkdownHeading[] => {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: MarkdownHeading[] = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text.toLowerCase().replace(/[^\w]+/g, '-');

    headings.push({ level, text, id });
  }

  return headings;
};

/**
 * Truncate markdown to specific length (preserving structure)
 */
export const truncateMarkdown = (markdown: string, maxLength: number): string => {
  if (markdown.length <= maxLength) return markdown;

  // Try to cut at a paragraph boundary
  const truncated = markdown.slice(0, maxLength);
  const lastNewline = truncated.lastIndexOf('\n\n');

  if (lastNewline > maxLength * 0.8) {
    return truncated.slice(0, lastNewline) + '\n\n...';
  }

  return truncated + '...';
};

/**
 * Parse markdown metadata (YAML front matter)
 */
export const parseMarkdownMetadata = (markdown: string): { metadata: Record<string, any>; content: string } => {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontMatterRegex);

  if (!match) {
    return { metadata: {}, content: markdown };
  }

  const metadataText = match[1];
  const content = match[2];

  // Simple YAML parser (key: value)
  const metadata: Record<string, any> = {};
  metadataText.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      metadata[key.trim()] = valueParts.join(':').trim();
    }
  });

  return { metadata, content };
};
