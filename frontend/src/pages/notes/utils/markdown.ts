/**
 * Markdown utility functions
 */

/**
 * Wrap selected text with markdown syntax
 */
export function wrapText(text: string, before: string, after: string = before): string {
    return `${before}${text}${after}`;
}

/**
 * Make selected text bold
 */
export function makeBold(text: string): string {
    return wrapText(text, '**');
}

/**
 * Make selected text italic
 */
export function makeItalic(text: string): string {
    return wrapText(text, '_');
}

/**
 * Make selected text a code block
 */
export function makeCode(text: string, language: string = ''): string {
    return wrapText(text, `\`\`\`${language}\n`, '\n```');
}

/**
 * Make selected text inline code
 */
export function makeInlineCode(text: string): string {
    return wrapText(text, '`');
}

/**
 * Make selected text a link
 */
export function makeLink(text: string, url: string = ''): string {
    return `[${text}](${url})`;
}

/**
 * Make selected text a heading
 */
export function makeHeading(text: string, level: number = 2): string {
    const hashes = '#'.repeat(Math.max(1, Math.min(6, level)));
    return `${hashes} ${text}`;
}

/**
 * Convert text to a list item
 */
export function makeListItem(text: string, ordered: boolean = false, index: number = 1): string {
    const prefix = ordered ? `${index}. ` : '- ';
    return `${prefix}${text}`;
}

/**
 * Convert lines to a list
 */
export function makeList(lines: string[], ordered: boolean = false): string {
    return lines
    .map((line, index) => makeListItem(line, ordered, index + 1))
    .join('\n');
}

/**
 * Extract plain text from markdown (remove formatting)
 */
export function stripMarkdown(markdown: string): string {
    return markdown
    .replace(/#{1,6}\s+/g, '') // Remove headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/__(.+?)__/g, '$1') // Remove bold (alternative)
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/_(.+?)_/g, '$1') // Remove italic (alternative)
    .replace(/`{3}[\s\S]*?`{3}/g, '') // Remove code blocks
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/!\[.*?\]\(.+?\)/g, '') // Remove images
    .trim();
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
    const plainText = stripMarkdown(text);
    return plainText.split(/\s+/).filter(Boolean).length;
}

/**
 * Count characters in text
 */
export function countCharacters(text: string): number {
    return stripMarkdown(text).length;
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
    const words = countWords(text);
    return Math.ceil(words / wordsPerMinute);
}

/**
 * Extract all headings from markdown
 */
export function extractHeadings(markdown: string): Array<{ level: number; text: string }> {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: Array<{ level: number; text: string }> = [];

    let match;
    while ((match = headingRegex.exec(markdown)) !== null) {
        headings.push({
            level: match[1].length,
            text: match[2].trim(),
        });
    }

    return headings;
}

/**
 * Generate table of contents from markdown
 */
export function generateTOC(markdown: string): string {
    const headings = extractHeadings(markdown);

    return headings
    .map((heading) => {
        const indent = '  '.repeat(heading.level - 1);
        const link = heading.text.toLowerCase().replace(/\s+/g, '-');
        return `${indent}- [${heading.text}](#${link})`;
    })
    .join('\n');
}
