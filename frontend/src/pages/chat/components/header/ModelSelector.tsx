/**
 * ModelSelector - Oracle Theme
 * "Neural Core Selection" - Switch between intelligence models.
 *
 * Location: chat/components/header/ModelSelector.tsx
 */

import React, { useState } from 'react';
import { ChevronDown, Sparkles, Zap, BrainCircuit, Cpu } from 'lucide-react';
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
    name: 'OMNI-PRIME (GPT-4)',
    description: 'Maximum coherence and complex reasoning',
    icon: BrainCircuit,
    badge: 'STABLE',
  },
{
  id: 'gpt-3.5',
  name: 'VELOCITY-CORE (GPT-3.5)',
  description: 'High-speed rapid response unit',
  icon: Zap,
},
{
  id: 'claude-3',
  name: 'ANTHRO-NODE (Claude 3)',
  description: 'Enhanced semantic analysis',
  icon: Sparkles,
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
    <div className="relative z-50">
    {/* Trigger Button */}
    <motion.button
    onClick={() => setIsOpen(!isOpen)}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'flex items-center gap-3 px-4 py-2 rounded-full transition-all duration-300',
      'bg-black/60 border backdrop-blur-md',
      isOpen
      ? 'border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
      : 'border-white/10 hover:border-cyan-500/30'
    )}
    >
    <div className={cn(
      "p-1 rounded-full bg-cyan-950/30 border border-cyan-500/20",
      isOpen && "animate-pulse"
    )}>
    <SelectedIcon className="w-3.5 h-3.5 text-cyan-400" />
    </div>

    <div className="flex flex-col items-start">
    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-0.5">Active Core</span>
    <span className="text-xs font-bold text-cyan-100 uppercase tracking-wider leading-none">
    {selectedModel.name.split('(')[0]}
    </span>
    </div>

    <ChevronDown
    className={cn(
      'w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ml-2',
      isOpen && 'rotate-180 text-cyan-400'
    )}
    />
    </motion.button>

    {/* Dropdown Menu */}
    <AnimatePresence>
    {isOpen && (
      <>
      <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

      <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'absolute top-full left-1/2 -translate-x-1/2 mt-3',
        'w-[320px] rounded-xl overflow-hidden',
        'bg-[#050505]/95 border border-white/10 backdrop-blur-xl',
        'shadow-2xl shadow-cyan-900/20',
        'z-50'
      )}
      >
      {/* Header decoration */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-900 via-cyan-500 to-cyan-900 opacity-50" />

      <div className="p-2 space-y-1">
      {models.map((model) => {
        const Icon = model.icon;
        const isSelected = selectedModel.id === model.id;

        return (
          <motion.button
          key={model.id}
          onClick={() => handleSelect(model)}
          className={cn(
            'w-full text-left p-3 rounded-lg group',
            'transition-all duration-200 border border-transparent',
            isSelected
            ? 'bg-cyan-950/30 border-cyan-500/20'
            : 'hover:bg-white/5 hover:border-white/5'
          )}
          >
          <div className="flex items-start gap-3">
          <div className={cn(
            "mt-0.5 p-1.5 rounded-md transition-colors",
            isSelected ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-slate-500 group-hover:text-cyan-300"
          )}>
          <Icon className="w-4 h-4" />
          </div>

          <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
          <span className={cn(
            'text-xs font-bold uppercase tracking-wider',
            isSelected ? 'text-cyan-100' : 'text-slate-400 group-hover:text-white'
          )}>
          {model.name}
          </span>
          {model.badge && (
            <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {model.badge}
            </span>
          )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono group-hover:text-slate-400">
          {model.description}
          </p>
          </div>
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
