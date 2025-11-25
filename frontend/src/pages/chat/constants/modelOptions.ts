/**
 * Available AI models
 * Model configuration for chat interface
 */

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'openai' | 'anthropic' | 'google' | 'meta';
  contextWindow: number; // tokens
  maxOutput: number; // tokens
  features: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    codeExecution: boolean;
  };
  pricing: {
    input: number; // per million tokens
    output: number; // per million tokens
  };
  icon?: string;
}

export const availableModels: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Most capable model, best for complex tasks',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: false,
    },
    pricing: {
      input: 10,
      output: 30,
    },
  },
{
  id: 'gpt-4',
  name: 'GPT-4',
  description: 'Previous generation, reliable and capable',
  provider: 'openai',
  contextWindow: 8192,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: {
    input: 30,
    output: 60,
  },
},
{
  id: 'gpt-3.5-turbo',
  name: 'GPT-3.5 Turbo',
  description: 'Fast and efficient for simpler tasks',
  provider: 'openai',
  contextWindow: 16385,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: {
    input: 0.5,
    output: 1.5,
  },
},
{
  id: 'claude-3-opus',
  name: 'Claude 3 Opus',
  description: 'Most powerful Claude model',
  provider: 'anthropic',
  contextWindow: 200000,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    codeExecution: false,
  },
  pricing: {
    input: 15,
    output: 75,
  },
},
{
  id: 'claude-3-sonnet',
  name: 'Claude 3 Sonnet',
  description: 'Balanced performance and speed',
  provider: 'anthropic',
  contextWindow: 200000,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    codeExecution: false,
  },
  pricing: {
    input: 3,
    output: 15,
  },
},
{
  id: 'claude-3-haiku',
  name: 'Claude 3 Haiku',
  description: 'Fastest Claude model',
  provider: 'anthropic',
  contextWindow: 200000,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    codeExecution: false,
  },
  pricing: {
    input: 0.25,
    output: 1.25,
  },
},
{
  id: 'gemini-pro',
  name: 'Gemini Pro',
  description: 'Google\'s most capable model',
  provider: 'google',
  contextWindow: 32768,
  maxOutput: 8192,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: {
    input: 0.5,
    output: 1.5,
  },
},
];

/**
 * Default model
 */
export const defaultModel = availableModels[0];

/**
 * Get model by ID
 */
export const getModelById = (id: string): AIModel | undefined => {
  return availableModels.find((model) => model.id === id);
};

/**
 * Get models by provider
 */
export const getModelsByProvider = (
  provider: AIModel['provider']
): AIModel[] => {
  return availableModels.filter((model) => model.provider === provider);
};

/**
 * Format context window size
 */
export const formatContextWindow = (tokens: number): string => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return `${tokens}`;
};
