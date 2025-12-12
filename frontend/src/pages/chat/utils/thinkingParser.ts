/**
 * Parse DeepThink reasoning
 * Extracts and formats AI reasoning process (Chain-of-Thought)
 */

/**
 * Thinking step interface
 */
export interface ThinkingStep {
  index: number;
  content: string;
  type: 'reasoning' | 'analysis' | 'planning' | 'conclusion' | 'reflection';
  timestamp?: string;
}

/**
 * Parsed thinking result
 */
export interface ParsedThinking {
  steps: ThinkingStep[];
  summary: string;
  hasChainOfThought: boolean;
  totalSteps: number;
}

/**
 * Parse thinking process from various formats
 */
export const parseThinkingProcess = (data: any): ParsedThinking => {
  // Handle string input
  if (typeof data === 'string') {
    return parseThinkingFromString(data);
  }

  // Handle array input
  if (Array.isArray(data)) {
    return parseThinkingFromArray(data);
  }

  // Handle object input
  if (typeof data === 'object' && data !== null) {
    return parseThinkingFromObject(data);
  }

  // Fallback
  return {
    steps: [],
    summary: '',
    hasChainOfThought: false,
    totalSteps: 0,
  };
};

/**
 * Parse thinking from string format
 */
const parseThinkingFromString = (text: string): ParsedThinking => {
  const steps: ThinkingStep[] = [];

  // Try to detect structured thinking markers
  const patterns = [
    /(?:Step|Stage|Phase)\s+(\d+)[:\s]+(.+)/gi,
    /(?:First|Second|Third|Finally)[,:\s]+(.+)/gi,
    /(?:\d+\.)\s+(.+)/g,
    /(?:-|\*)\s+(.+)/g,
  ];

  let matched = false;

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern);
    const matchArray = Array.from(matches);

    if (matchArray.length > 0) {
      matchArray.forEach((match, index) => {
        const content = match[2] || match[1];
        if (content && content.trim().length > 0) {
          steps.push({
            index: index + 1,
            content: content.trim(),
                     type: detectStepType(content),
          });
        }
      });
      matched = true;
      break;
    }
  }

  // If no structured format detected, split by sentences or paragraphs
  if (!matched && text.length > 0) {
    const paragraphs = text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

    paragraphs.forEach((paragraph, index) => {
      steps.push({
        index: index + 1,
        content: paragraph,
        type: detectStepType(paragraph),
      });
    });
  }

  // Generate summary (first 100 chars)
  const summary = text.slice(0, 100) + (text.length > 100 ? '...' : '');

  return {
    steps,
    summary,
    hasChainOfThought: steps.length > 1,
    totalSteps: steps.length,
  };
};

/**
 * Parse thinking from array format
 */
const parseThinkingFromArray = (data: any[]): ParsedThinking => {
  const steps: ThinkingStep[] = data.map((item, index) => {
    if (typeof item === 'string') {
      return {
        index: index + 1,
        content: item,
        type: detectStepType(item),
      };
    }

    if (typeof item === 'object' && item !== null) {
      return {
        index: index + 1,
        content: item.content || item.text || String(item),
                                         type: item.type || detectStepType(item.content || item.text || ''),
                                         timestamp: item.timestamp,
      };
    }

    return {
      index: index + 1,
      content: String(item),
                                         type: 'reasoning' as const,
    };
  });

  const summary = steps.length > 0 ? steps[0].content.slice(0, 100) : '';

  return {
    steps,
    summary,
    hasChainOfThought: steps.length > 1,
    totalSteps: steps.length,
  };
};

/**
 * Parse thinking from object format
 */
const parseThinkingFromObject = (data: Record<string, any>): ParsedThinking => {
  // Check for common object structures
  if (data.steps && Array.isArray(data.steps)) {
    return parseThinkingFromArray(data.steps);
  }

  if (data.thinking && typeof data.thinking === 'string') {
    return parseThinkingFromString(data.thinking);
  }

  if (data.reasoning && typeof data.reasoning === 'string') {
    return parseThinkingFromString(data.reasoning);
  }

  if (data.chain_of_thought && Array.isArray(data.chain_of_thought)) {
    return parseThinkingFromArray(data.chain_of_thought);
  }

  // Fallback: convert entire object to string
  const text = JSON.stringify(data, null, 2);
  return parseThinkingFromString(text);
};

/**
 * Detect the type of thinking step based on content
 */
const detectStepType = (content: string): ThinkingStep['type'] => {
  const lowerContent = content.toLowerCase();

  // Planning keywords
  if (
    lowerContent.includes('plan') ||
    lowerContent.includes('approach') ||
    lowerContent.includes('strategy') ||
    lowerContent.includes('first') ||
    lowerContent.includes('next')
  ) {
    return 'planning';
  }

  // Analysis keywords
  if (
    lowerContent.includes('analyze') ||
    lowerContent.includes('examine') ||
    lowerContent.includes('consider') ||
    lowerContent.includes('evaluate')
  ) {
    return 'analysis';
  }

  // Conclusion keywords
  if (
    lowerContent.includes('conclude') ||
    lowerContent.includes('therefore') ||
    lowerContent.includes('thus') ||
    lowerContent.includes('finally') ||
    lowerContent.includes('result')
  ) {
    return 'conclusion';
  }

  // Reflection keywords
  if (
    lowerContent.includes('reflect') ||
    lowerContent.includes('learn') ||
    lowerContent.includes('improve') ||
    lowerContent.includes('feedback')
  ) {
    return 'reflection';
  }

  // Default to reasoning
  return 'reasoning';
};

/**
 * Format thinking steps for display
 */
export const formatThinkingSteps = (steps: ThinkingStep[]): string => {
  return steps.map((step, index) => {
    const prefix = `Step ${index + 1}`;
    return `${prefix}: ${step.content}`;
  }).join('\n\n');
};

/**
 * Get thinking step icon
 */
export const getThinkingStepIcon = (type: ThinkingStep['type']): string => {
  const icons: Record<ThinkingStep['type'], string> = {
    planning: '📋',
    analysis: '🔍',
    reasoning: '💭',
    conclusion: '✅',
    reflection: '🤔',
  };

  return icons[type] || '💭';
};

/**
 * Get thinking step color
 */
export const getThinkingStepColor = (type: ThinkingStep['type']): string => {
  const colors: Record<ThinkingStep['type'], string> = {
    planning: 'text-blue-400',
    analysis: 'text-yellow-400',
    reasoning: 'text-purple-400',
    conclusion: 'text-green-400',
    reflection: 'text-pink-400',
  };

  return colors[type] || 'text-purple-400';
};

/**
 * Extract key insights from thinking process
 */
export const extractKeyInsights = (thinking: ParsedThinking): string[] => {
  const insights: string[] = [];

  // Get conclusions
  const conclusions = thinking.steps.filter(step => step.type === 'conclusion');
  conclusions.forEach(step => {
    if (step.content.length > 20) {
      insights.push(step.content);
    }
  });

  // If no conclusions, get last few steps
  if (insights.length === 0 && thinking.steps.length > 0) {
    const lastSteps = thinking.steps.slice(-2);
    lastSteps.forEach(step => {
      insights.push(step.content);
    });
  }

  return insights;
};

/**
 * Simplify thinking for quick view
 */
export const simplifyThinking = (thinking: ParsedThinking, maxSteps: number = 3): ThinkingStep[] => {
  if (thinking.steps.length <= maxSteps) {
    return thinking.steps;
  }

  // Always include first and last steps
  const simplified: ThinkingStep[] = [thinking.steps[0]];

  // Include some middle steps
  const middleCount = maxSteps - 2;
  const step = Math.floor(thinking.steps.length / (middleCount + 1));

  for (let i = 1; i <= middleCount; i++) {
    const index = i * step;
    if (index < thinking.steps.length - 1) {
      simplified.push(thinking.steps[index]);
    }
  }

  // Add last step
  simplified.push(thinking.steps[thinking.steps.length - 1]);

  return simplified;
};

/**
 * Calculate thinking complexity score
 */
export const calculateComplexity = (thinking: ParsedThinking): {
  score: number;
  level: 'simple' | 'moderate' | 'complex' | 'very_complex';
} => {
  let score = 0;

  // Factor 1: Number of steps
  score += Math.min(thinking.totalSteps * 10, 40);

  // Factor 2: Diversity of step types
  const types = new Set(thinking.steps.map(s => s.type));
  score += types.size * 10;

  // Factor 3: Average step length
  const avgLength = thinking.steps.reduce((sum, step) => sum + step.content.length, 0) / thinking.totalSteps;
  score += Math.min(avgLength / 10, 30);

  // Normalize to 0-100
  score = Math.min(score, 100);

  // Determine level
  let level: 'simple' | 'moderate' | 'complex' | 'very_complex';
  if (score < 25) level = 'simple';
  else if (score < 50) level = 'moderate';
  else if (score < 75) level = 'complex';
  else level = 'very_complex';

  return { score, level };
};

/**
 * Generate thinking summary
 */
export const generateThinkingSummary = (thinking: ParsedThinking): string => {
  if (thinking.totalSteps === 0) {
    return 'No reasoning steps available';
  }

  if (thinking.totalSteps === 1) {
    return thinking.steps[0].content.slice(0, 100);
  }

  const complexity = calculateComplexity(thinking);
  const insights = extractKeyInsights(thinking);

  if (insights.length > 0) {
    return `${thinking.totalSteps}-step ${complexity.level} reasoning: ${insights[0].slice(0, 80)}...`;
  }

  return `${thinking.totalSteps}-step ${complexity.level} reasoning process`;
};
