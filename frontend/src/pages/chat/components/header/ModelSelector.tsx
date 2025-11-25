/**
 * ModelSelector - Dropdown for AI models
 * Allows switching between different AI models
 */

import React, { useState } from 'react';
import { ChevronDown, Sparkles, Zap, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AIModel {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
}

const models: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4 Turbo',
    description: 'Most capable, best for complex tasks',
    icon: Sparkles,
    badge: 'Recommended',
  },
{
  id: 'gpt-3.5',
  name: 'GPT-3.5 Turbo',
  description: 'Fast and efficient',
  icon: Zap,
},
{
  id: 'claude-3',
  name: 'Claude 3',
  description: 'Excellent reasoning',
  icon: Brain,
},
];

export const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModel>(models[0]);

  const handleSelect = (model: AIModel) => {
    setSelectedModel(model);
    setIsOpen(false);
  };

  const SelectedIcon = selectedModel.icon;

  return (
    <div className="relative">
    {/* Trigger Button */}
    <motion.button
    onClick={() => setIsOpen(!isOpen)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-lg',
      'bg-[#1D1E22]/60 backdrop-blur-sm',
      'border border-[#353638]',
      'text-sm font-medium text-white',
      'hover:border-[#5685FE]/30',
      'transition-all duration-200',
      isOpen && 'border-[#5685FE]/40'
    )}
    >
    <SelectedIcon className="w-4 h-4 text-[#5685FE]" strokeWidth={2} />
    <span>{selectedModel.name}</span>
    <ChevronDown
    className={cn(
      'w-4 h-4 text-white/60 transition-transform duration-200',
      isOpen && 'rotate-180'
    )}
    />
    </motion.button>

    {/* Dropdown */}
    <AnimatePresence>
    {isOpen && (
      <>
      {/* Backdrop */}
      <div
      className="fixed inset-0 z-40"
      onClick={() => setIsOpen(false)}
      />

      {/* Menu */}
      <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute top-full left-1/2 -translate-x-1/2 mt-2',
        'w-[280px] rounded-lg overflow-hidden',
        'bg-[#1D1E22] border border-[#353638]',
        'shadow-2xl',
        'z-50'
      )}
      >
      <div className="p-2 space-y-1">
      {models.map((model) => {
        const Icon = model.icon;
        const isSelected = selectedModel.id === model.id;

        return (
          <motion.button
          key={model.id}
          onClick={() => handleSelect(model)}
          whileHover={{ x: 2 }}
          className={cn(
            'w-full text-left p-3 rounded-lg',
            'transition-colors duration-200',
            'flex items-start gap-3',
            isSelected
            ? 'bg-[#5685FE]/20 border border-[#5685FE]/30'
            : 'hover:bg-[#353638]/50 border border-transparent'
          )}
          >
          <Icon
          className={cn(
            'w-5 h-5 mt-0.5 flex-shrink-0',
            isSelected ? 'text-[#5685FE]' : 'text-white/60'
          )}
          strokeWidth={2}
          />
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
          <span
          className={cn(
            'text-sm font-medium',
            isSelected ? 'text-white' : 'text-white/90'
          )}
          >
          {model.name}
          </span>
          {model.badge && (
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[#5685FE]/20 text-[#5685FE]">
            {model.badge}
            </span>
          )}
          </div>
          <p className="text-xs text-white/60 mt-0.5">
          {model.description}
          </p>
          </div>
          </motion.button>
        );
      })}
      </div>
      </motion.div>
      </>
    )}
    </AnimatePresence>
    </div>
  );
};

export default ModelSelector;
