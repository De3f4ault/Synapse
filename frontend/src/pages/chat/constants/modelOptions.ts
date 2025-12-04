/**
 * Available AI models - Oracle Theme
 * "Neural Cores" configuration.
 *
 * Location: chat/constants/modelOptions.ts
 */

import { BrainCircuit, Zap, Sparkles, Cpu, Eye } from 'lucide-react';

export interface AIModel {
  id: string;
  name: string; // Display Name (Thematic)
  description: string;
  provider: 'openai' | 'anthropic' | 'google' | 'meta';
  contextWindow: number;
  maxOutput: number;
  features: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    codeExecution: boolean;
  };
  pricing: {
    input: number;
    output: number;
  };
  icon?: any; // Changed to any to accept Lucide components directly if needed
}

export const availableModels: AIModel[] = [
  {
    id: 'gpt-4-turbo',
    name: 'OMNI-PRIME (GPT-4)',
    description: 'Maximum coherence for complex reasoning tasks.',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    features: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: false,
    },
    pricing: { input: 10, output: 30 },
    icon: BrainCircuit
  },
{
  id: 'gpt-4',
  name: 'LEGACY-CORE (GPT-4)',
  description: 'Reliable, previous generation intelligence.',
  provider: 'openai',
  contextWindow: 8192,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: { input: 30, output: 60 },
  icon: Cpu
},
{
  id: 'gpt-3.5-turbo',
  name: 'VELOCITY-CORE (GPT-3.5)',
  description: 'High-speed processor for rapid queries.',
  provider: 'openai',
  contextWindow: 16385,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: { input: 0.5, output: 1.5 },
  icon: Zap
},
{
  id: 'claude-3-opus',
  name: 'ANTHRO-OPUS',
  description: 'Deep semantic understanding and creative synthesis.',
  provider: 'anthropic',
  contextWindow: 200000,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    codeExecution: false,
  },
  pricing: { input: 15, output: 75 },
  icon: Sparkles
},
{
  id: 'claude-3-sonnet',
  name: 'ANTHRO-SONNET',
  description: 'Balanced logic gate for general tasks.',
  provider: 'anthropic',
  contextWindow: 200000,
  maxOutput: 4096,
  features: {
    streaming: true,
    functionCalling: true,
    vision: true,
    codeExecution: false,
  },
  pricing: { input: 3, output: 15 },
  icon: Sparkles
},
{
  id: 'gemini-pro',
  name: 'GEMINI-PRO',
  description: 'Google neural network integration.',
  provider: 'google',
  contextWindow: 32768,
  maxOutput: 8192,
  features: {
    streaming: true,
    functionCalling: true,
    vision: false,
    codeExecution: false,
  },
  pricing: { input: 0.5, output: 1.5 },
  icon: Eye
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
    return `${(tokens / 1000000).toFixed(1)}M TOKENS`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K TOKENS`;
  }
  return `${tokens}`;
};
