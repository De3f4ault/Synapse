/**
 * ComparisonToggle — Enable/disable model comparison mode
 *
 * Qwen-inspired dropdown design + DeepSeek's unobtrusive feel.
 * Fetches available models dynamically from the backend MODEL_REGISTRY.
 * Allows any-to-any comparison: same provider, cross-provider, even same model.
 *
 * When OFF: slim pill toggle
 * When ON: expands to show two model selector pills with animated dropdowns
 */

import { ChevronDown, Check, GitCompareArrows, Zap, Scale, Brain, Lightbulb, Eye } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "../state/chatStore";
import { useModels, type ModelInfo } from "../hooks/useModels";
import { cn } from "@/lib/utils";

/* ================================================================
   Tier badge — visual indicator for model capability tier
   ================================================================ */

const TIER_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  speed: { icon: <Zap className="size-2.5" />, label: "Speed", color: "bg-emerald-500/15 text-emerald-400" },
  balanced: { icon: <Scale className="size-2.5" />, label: "Balanced", color: "bg-blue-500/15 text-blue-400" },
  reasoning: { icon: <Brain className="size-2.5" />, label: "Reasoning", color: "bg-amber-500/15 text-amber-400" },
  thinking: { icon: <Lightbulb className="size-2.5" />, label: "Thinking", color: "bg-purple-500/15 text-purple-400" },
};

/* ================================================================
   Model Dropdown — Qwen-style with provider grouping
   Renders via portal so it's never clipped by overflow
   ================================================================ */

interface ModelDropdownProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
  label: string;
  models: ModelInfo[];
  grouped: { ollama: ModelInfo[]; google: ModelInfo[] };
}

function ModelDropdown({
  selectedModel,
  onSelect,
  label,
  models,
  grouped,
}: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const selectedModelInfo = models.find((m) => m.id === selectedModel);

  // Compute position relative to trigger button
  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.top, left: rect.left });
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Recalculate position on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = () => {
    if (!isOpen) updatePosition();
    setIsOpen(!isOpen);
  };

  const renderModelItem = (model: ModelInfo) => {
    const tierCfg = TIER_CONFIG[model.tier];
    const isSelected = model.id === selectedModel;

    return (
      <button
        key={model.id}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all rounded-lg mx-1",
          isSelected
            ? "bg-cyan-500/10 text-cyan-300"
            : "text-zinc-300 hover:bg-white/5 hover:text-white"
        )}
        onClick={() => {
          onSelect(model.id);
          setIsOpen(false);
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate">
              {model.name}
            </span>
            {tierCfg && (
              <span className={cn("inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium", tierCfg.color)}>
                {tierCfg.icon}
                {tierCfg.label}
              </span>
            )}
            {model.supportsThinking && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 whitespace-nowrap font-medium">
                💭 Thinking
              </span>
            )}
            {model.supportsVision && (
              <Eye className="size-3 text-zinc-500" />
            )}
          </div>
          {model.description && (
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">
              {model.description}
            </p>
          )}
        </div>
        {isSelected && (
          <Check className="size-3.5 text-cyan-400 shrink-0" />
        )}
      </button>
    );
  };

  const renderGroup = (title: string, items: ModelInfo[]) => {
    if (items.length === 0) return null;
    return (
      <div key={title}>
        <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider sticky top-0 bg-[#0e0e12]/98 backdrop-blur-sm z-10">
          {title}
        </div>
        {items.map(renderModelItem)}
      </div>
    );
  };

  // Dropdown rendered via portal to prevent overflow clipping
  const dropdown = isOpen
    ? createPortal(
        <AnimatePresence>
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              bottom: `${window.innerHeight - pos.top + 8}px`,
              left: `${pos.left}px`,
            }}
            className="min-w-[300px] max-h-[420px] overflow-y-auto scrollbar-hide rounded-xl border border-white/10 bg-[#0e0e12]/98 backdrop-blur-2xl shadow-2xl shadow-black/50 z-[9999] py-1"
          >
            {renderGroup("Ollama — Open Source", grouped.ollama)}
            {grouped.ollama.length > 0 && grouped.google.length > 0 && (
              <div className="h-px bg-white/5 mx-2 my-1" />
            )}
            {renderGroup("Google Cloud", grouped.google)}
          </motion.div>
        </AnimatePresence>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border",
          isOpen
            ? "bg-white/8 border-white/15 text-white"
            : "bg-white/5 border-white/8 text-zinc-300 hover:bg-white/8 hover:border-white/12 hover:text-white"
        )}
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span className="text-[10px] uppercase tracking-wide text-zinc-500 mr-0.5">
          {label}
        </span>
        <span className="truncate max-w-[140px]">
          {selectedModelInfo?.name || selectedModel}
        </span>
        <ChevronDown
          className={cn(
            "size-3 opacity-50 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {dropdown}
    </div>
  );
}

/* ================================================================
   ComparisonToggle — Main export
   ================================================================ */

export function ComparisonToggle() {
  const { isComparisonMode, setComparisonMode, selectedModels, setSelectedModels } =
    useChatStore();
  const { models, grouped, isLoading } = useModels();

  return (
    <div className="flex items-center gap-3">
      {/* Toggle pill */}
      <button
        onClick={() => setComparisonMode(!isComparisonMode)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all border",
          isComparisonMode
            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-300"
            : "bg-white/5 border-white/8 text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
        )}
        title="Compare responses from two models side by side"
      >
        <GitCompareArrows className="size-3.5" />
        <span>Compare</span>
      </button>

      {/* Model selectors — animate in when enabled */}
      <AnimatePresence>
        {isComparisonMode && !isLoading && (
          <motion.div
            initial={{ opacity: 0, width: 0, x: -12 }}
            animate={{ opacity: 1, width: "auto", x: 0 }}
            exit={{ opacity: 0, width: 0, x: -12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <ModelDropdown
              label="A"
              selectedModel={selectedModels[0]}
              onSelect={(id) => setSelectedModels([id, selectedModels[1]])}
              models={models}
              grouped={grouped}
            />
            <span className="text-[11px] font-semibold text-zinc-600 uppercase">
              vs
            </span>
            <ModelDropdown
              label="B"
              selectedModel={selectedModels[1]}
              onSelect={(id) => setSelectedModels([selectedModels[0], id])}
              models={models}
              grouped={grouped}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default ComparisonToggle;
