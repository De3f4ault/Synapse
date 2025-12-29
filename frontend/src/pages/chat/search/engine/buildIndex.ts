/**
 * buildIndex - Construct search index from messages
 *
 * INVARIANT:
 * Index is rebuilt only on MESSAGE COMMIT, not on every streaming token.
 * If live-search-during-streaming is ever needed, that's a separate mode.
 *
 * This function is PURE: no React, no DOM, no side-effects.
 */

import { SearchIndex, MessageBlock } from './types';

interface MessageInput {
    id: number | string;
    content: string;
    role: 'user' | 'assistant' | string;
}

/**
 * Build a search index from an array of messages.
 * Each message becomes a block in the index.
 */
export function buildIndex(messages: MessageInput[]): SearchIndex {
    const blocks: MessageBlock[] = [];

    for (const msg of messages) {
        if (!msg.content) continue;

        blocks.push({
            messageId: String(msg.id),
            text: msg.content,
            role: msg.role === 'user' ? 'user' : 'assistant',
            offsetStart: 0,
            offsetEnd: msg.content.length,
        });
    }

    return {
        blocks,
        version: Date.now(),
    };
}

/**
 * Build index with block-level parsing (code blocks, etc.)
 * More granular - each code block / text section is separate.
 */
export function buildDetailedIndex(messages: MessageInput[]): SearchIndex {
    const blocks: MessageBlock[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;

    for (const msg of messages) {
        if (!msg.content) continue;

        const content = msg.content;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        // Reset regex state
        codeBlockRegex.lastIndex = 0;

        while ((match = codeBlockRegex.exec(content)) !== null) {
            // Text before code block
            if (match.index > lastIndex) {
                const textBefore = content.slice(lastIndex, match.index);
                if (textBefore.trim()) {
                    blocks.push({
                        messageId: String(msg.id),
                        text: textBefore,
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        offsetStart: lastIndex,
                        offsetEnd: match.index,
                    });
                }
            }

            // Code block itself
            blocks.push({
                messageId: String(msg.id),
                text: match[0],
                role: msg.role === 'user' ? 'user' : 'assistant',
                offsetStart: match.index,
                offsetEnd: match.index + match[0].length,
            });

            lastIndex = match.index + match[0].length;
        }

        // Text after last code block
        if (lastIndex < content.length) {
            const textAfter = content.slice(lastIndex);
            if (textAfter.trim()) {
                blocks.push({
                    messageId: String(msg.id),
                    text: textAfter,
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    offsetStart: lastIndex,
                    offsetEnd: content.length,
                });
            }
        }

        // If no code blocks found, add entire message
        if (blocks.filter((b) => b.messageId === String(msg.id)).length === 0) {
            blocks.push({
                messageId: String(msg.id),
                text: content,
                role: msg.role === 'user' ? 'user' : 'assistant',
                offsetStart: 0,
                offsetEnd: content.length,
            });
        }
    }

    return {
        blocks,
        version: Date.now(),
    };
}
