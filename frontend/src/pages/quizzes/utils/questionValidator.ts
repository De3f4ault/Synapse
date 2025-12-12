/**
 * Validation utilities for quiz questions
 */

/**
 * Parse options from various formats
 */
export function parseOptions(options: unknown): string[] {
    if (Array.isArray(options)) {
        return options.map(String);
    }

    if (typeof options === 'object' && options !== null) {
        return Object.values(options).map(String);
    }

    return [];
}

/**
 * Validate question text
 */
export function validateQuestionText(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
        return { valid: false, error: 'Question text is required' };
    }

    if (text.length < 10) {
        return { valid: false, error: 'Question text is too short (minimum 10 characters)' };
    }

    if (text.length > 500) {
        return { valid: false, error: 'Question text is too long (maximum 500 characters)' };
    }

    return { valid: true };
}

/**
 * Validate options array
 */
export function validateOptions(options: string[]): { valid: boolean; error?: string } {
    if (options.length < 2) {
        return { valid: false, error: 'At least 2 options are required' };
    }

    if (options.length > 6) {
        return { valid: false, error: 'Maximum 6 options allowed' };
    }

    // Check for empty options
    const hasEmpty = options.some((opt) => !opt || opt.trim().length === 0);
    if (hasEmpty) {
        return { valid: false, error: 'All options must have text' };
    }

    // Check for duplicate options
    const uniqueOptions = new Set(options.map((opt) => opt.trim().toLowerCase()));
    if (uniqueOptions.size !== options.length) {
        return { valid: false, error: 'Options must be unique' };
    }

    return { valid: true };
}

/**
 * Validate correct answer
 */
export function validateCorrectAnswer(
    answer: string,
    options: string[]
): { valid: boolean; error?: string } {
    if (!answer || answer.trim().length === 0) {
        return { valid: false, error: 'Correct answer is required' };
    }

    const normalizedOptions = options.map((opt) => opt.trim().toLowerCase());
    const normalizedAnswer = answer.trim().toLowerCase();

    if (!normalizedOptions.includes(normalizedAnswer)) {
        return { valid: false, error: 'Correct answer must be one of the options' };
    }

    return { valid: true };
}

/**
 * Validate entire question
 */
export function validateQuestion(question: {
    question_text: string;
    options: unknown;
    correct_answer?: string;
}): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate question text
    const textValidation = validateQuestionText(question.question_text);
    if (!textValidation.valid) {
        errors.push(textValidation.error!);
    }

    // Parse and validate options
    const parsedOptions = parseOptions(question.options);
    const optionsValidation = validateOptions(parsedOptions);
    if (!optionsValidation.valid) {
        errors.push(optionsValidation.error!);
    }

    // Validate correct answer if provided
    if (question.correct_answer) {
        const answerValidation = validateCorrectAnswer(question.correct_answer, parsedOptions);
        if (!answerValidation.valid) {
            errors.push(answerValidation.error!);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Sanitize question text (remove dangerous content)
 */
export function sanitizeQuestionText(text: string): string {
    return text
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, ''); // Remove HTML tags
}

/**
 * Format question for display
 */
export function formatQuestionForDisplay(question: {
    id: number;
    question_text: string;
    options: unknown;
}): {
    id: number;
    question_text: string;
    options: string[];
} {
    return {
        id: question.id,
        question_text: sanitizeQuestionText(question.question_text),
        options: parseOptions(question.options),
    };
}
