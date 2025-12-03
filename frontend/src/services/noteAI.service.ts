/**
 * AI Service for Notes
 * Uses the chat API to power AI features for notes
 *
 * File: frontend/src/services/noteAI.service.ts
 */

import {
    createSessionApiV1ChatSessionsPost,
    sendMessageApiV1ChatSessionsSessionIdMessagesPost
} from '@/api/generated/services.gen';

/**
 * AI Note Operations using Chat API
 */
export class NoteAIService {
    private static sessionId: number | null = null;

    /**
     * Ensure we have an AI session for notes
     */
    private static async ensureSession(): Promise<number> {
        if (this.sessionId) return this.sessionId;

        try {
            const session = await createSessionApiV1ChatSessionsPost({
                requestBody: {
                    title: 'Note AI Assistant',
                    context_modules: ['notes']
                }
            });

            this.sessionId = session.id;
            return session.id;
        } catch (error) {
            console.error('Failed to create AI session:', error);
            throw new Error('Could not initialize AI assistant');
        }
    }

    /**
     * Send prompt to AI and get response
     */
    private static async sendPrompt(prompt: string): Promise<string> {
        try {
            const sessionId = await this.ensureSession();

            const response = await sendMessageApiV1ChatSessionsSessionIdMessagesPost({
                sessionId,
                requestBody: { content: prompt }
            });

            return response.content;
        } catch (error) {
            console.error('AI prompt failed:', error);
            throw new Error('AI request failed. Please try again.');
        }
    }

    /**
     * Neural Synthesis - Summarize note content
     */
    static async summarize(content: string): Promise<string> {
        if (!content.trim()) {
            throw new Error('Cannot summarize empty content');
        }

        const prompt = `You are a neural synthesis engine. Generate a concise, insightful summary of the following content.
        Focus on key concepts, main ideas, and important takeaways. Use a technical, analytical tone.

        Content to summarize:
        ${content}

        Provide ONLY the summary in markdown format, no preamble. Keep it under 200 words.`;

        return await this.sendPrompt(prompt);
    }

    /**
     * Auto-Tagging - Generate relevant tags
     */
    static async generateTags(title: string, content: string): Promise<string[]> {
        if (!content.trim() && !title.trim()) {
            throw new Error('Cannot generate tags from empty content');
        }

        const prompt = `Analyze this note and generate 3-7 relevant tags.
        Tags should be: lowercase, single words or short phrases (2-3 words max), relevant to main topics.

        Title: ${title}
        Content: ${content}

        Respond with ONLY a comma-separated list of tags. Example: "ai, machine learning, python"`;

        const response = await this.sendPrompt(prompt);

        // Parse and clean tags
        return response
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length < 30)
        .slice(0, 7);
    }

    /**
     * Content Expansion - Expand selected text
     */
    static async expandContent(selection: string, context: string): Promise<string> {
        if (!selection.trim()) {
            throw new Error('Cannot expand empty selection');
        }

        const prompt = `Expand on this selected text with additional details, explanations, and examples.
        Maintain the same writing style.

        Selected text: "${selection}"

        Context: ${context.substring(0, 500)}

        Provide ONLY the expanded content in markdown, no preamble.`;

        return await this.sendPrompt(prompt);
    }

    /**
     * Grammar & Style Correction
     */
    static async correctGrammar(content: string): Promise<string> {
        if (!content.trim()) {
            throw new Error('Cannot correct empty content');
        }

        const prompt = `Fix grammar, spelling, and improve clarity in this text. Preserve markdown formatting and original meaning.

        Text:
        ${content}

        Provide ONLY the corrected version, no explanation.`;

        return await this.sendPrompt(prompt);
    }

    /**
     * Reset session (useful for context clearing)
     */
    static resetSession(): void {
        this.sessionId = null;
    }
}
