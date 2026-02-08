/**
 * ComparisonToggle — Enable/disable model comparison mode
 * 
 * Shows a toggle switch and model selector dropdowns when comparison is enabled.
 */

import { ChevronDown, Check } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../state/chatStore';
import './ComparisonToggle.css';

// Available models for comparison
const AVAILABLE_MODELS = [
  { id: 'qwen3_next', name: 'Qwen3-Next', description: 'Fast, balanced responses' },
  { id: 'deepseek_v3_1', name: 'DeepSeek-V3.1', description: 'Deep reasoning with visible thinking' },
  { id: 'qwen3_vl', name: 'Qwen3-VL-235B', description: 'Vision-language model' },
  { id: 'gemini_flash', name: 'Gemini Flash', description: 'Fast cloud inference' },
];

interface ModelDropdownProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
  label: string;
  excludeModel?: string;
}

function ModelDropdown({ selectedModel, onSelect, label, excludeModel }: ModelDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const selectedModelInfo = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const availableModels = AVAILABLE_MODELS.filter(m => m.id !== excludeModel);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div ref={dropdownRef} className="model-dropdown">
      <button
        className="model-dropdown__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <span className="model-dropdown__label">{label}</span>
        <span className="model-dropdown__value">{selectedModelInfo?.name || selectedModel}</span>
        <ChevronDown size={14} className={`model-dropdown__chevron ${isOpen ? 'model-dropdown__chevron--open' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="model-dropdown__menu">
          {availableModels.map(model => (
            <button
              key={model.id}
              className={`model-dropdown__option ${model.id === selectedModel ? 'model-dropdown__option--selected' : ''}`}
              onClick={() => {
                onSelect(model.id);
                setIsOpen(false);
              }}
            >
              <div className="model-dropdown__option-content">
                <span className="model-dropdown__option-name">{model.name}</span>
                <span className="model-dropdown__option-desc">{model.description}</span>
              </div>
              {model.id === selectedModel && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComparisonToggle() {
  const { isComparisonMode, setComparisonMode, selectedModels, setSelectedModels } = useChatStore();
  
  return (
    <div className="comparison-toggle">
      {/* Toggle Switch */}
      <label className="comparison-toggle__switch">
        <input
          type="checkbox"
          checked={isComparisonMode}
          onChange={(e) => setComparisonMode(e.target.checked)}
        />
        <span className="comparison-toggle__slider" />
        <span className="comparison-toggle__label">Compare Models</span>
      </label>
      
      {/* Model Selectors (shown when comparison is enabled) */}
      {isComparisonMode && (
        <div className="comparison-toggle__models">
          <ModelDropdown
            label="Model A"
            selectedModel={selectedModels[0]}
            excludeModel={selectedModels[1]}
            onSelect={(id) => setSelectedModels([id, selectedModels[1]])}
          />
          <span className="comparison-toggle__vs">vs</span>
          <ModelDropdown
            label="Model B"
            selectedModel={selectedModels[1]}
            excludeModel={selectedModels[0]}
            onSelect={(id) => setSelectedModels([selectedModels[0], id])}
          />
        </div>
      )}
    </div>
  );
}

export default ComparisonToggle;
