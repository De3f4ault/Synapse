/**
 * Create Engine - Public API
 */

export {
    generateFlashcardsFromTopic,
    validateGeneratorRequest,
    DEFAULT_NUM_CARDS,
    DEFAULT_DIFFICULTY,
    MIN_CARDS,
    MAX_CARDS,
    type GeneratorRequest,
    type GeneratorResponse,
    type GeneratorError,
    type GeneratorDifficulty,
} from './generator';
