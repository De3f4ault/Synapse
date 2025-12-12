import React from 'react';
import { CheckSquare, Circle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuestionTypeSelectorProps {
    selectedType: 'multiple_choice' | 'true_false' | 'short_answer';
    onTypeChange: (type: 'multiple_choice' | 'true_false' | 'short_answer') => void;
}

/**
 * Question type selector with visual cards
 */
export const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({
    selectedType,
    onTypeChange,
}) => {
    const questionTypes = [
        {
            type: 'multiple_choice' as const,
            icon: CheckSquare,
            label: 'Multiple Choice',
            description: '2-6 options, one correct answer',
            color: 'cyan',
        },
        {
            type: 'true_false' as const,
            icon: Circle,
            label: 'True/False',
            description: 'Binary choice question',
            color: 'purple',
        },
        {
            type: 'short_answer' as const,
            icon: FileText,
            label: 'Short Answer',
            description: 'Text-based response',
            color: 'emerald',
        },
    ];

    const getColorClasses = (color: string, isSelected: boolean) => {
        const colors = {
            cyan: {
                border: isSelected ? 'border-cyan-500/50' : 'border-white/10',
                bg: isSelected ? 'bg-cyan-500/10' : 'bg-white/5',
                icon: isSelected ? 'text-cyan-400 bg-cyan-500/20' : 'text-slate-400 bg-white/5',
                text: isSelected ? 'text-cyan-400' : 'text-slate-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(6,182,212,0.3)]' : '',
            },
            purple: {
                border: isSelected ? 'border-purple-500/50' : 'border-white/10',
                bg: isSelected ? 'bg-purple-500/10' : 'bg-white/5',
                icon: isSelected ? 'text-purple-400 bg-purple-500/20' : 'text-slate-400 bg-white/5',
                text: isSelected ? 'text-purple-400' : 'text-slate-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(168,85,247,0.3)]' : '',
            },
            emerald: {
                border: isSelected ? 'border-emerald-500/50' : 'border-white/10',
                bg: isSelected ? 'bg-emerald-500/10' : 'bg-white/5',
                icon: isSelected ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-400 bg-white/5',
                text: isSelected ? 'text-emerald-400' : 'text-slate-400',
                glow: isSelected ? 'shadow-[0_0_20px_rgba(16,185,129,0.3)]' : '',
            },
        };

        return colors[color as keyof typeof colors];
    };

    return (
        <div className="space-y-2">
        <label className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
        Question Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {questionTypes.map((typeInfo) => {
            const Icon = typeInfo.icon;
            const isSelected = selectedType === typeInfo.type;
            const colors = getColorClasses(typeInfo.color, isSelected);

            return (
                <button
                key={typeInfo.type}
                onClick={() => onTypeChange(typeInfo.type)}
                className={cn(
                    'relative p-4 rounded-xl border transition-all duration-300 text-left group',
                    colors.border,
                    colors.bg,
                    colors.glow,
                    'hover:scale-105 active:scale-95'
                )}
                >
                {/* Background Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />

                <div className="relative z-10 space-y-3">
                {/* Icon */}
                <div className={cn('p-2 rounded-lg w-fit transition-colors', colors.icon)}>
                <Icon size={20} />
                </div>

                {/* Label */}
                <div>
                <h3 className={cn('text-sm font-bold mb-1 transition-colors', colors.text)}>
                {typeInfo.label}
                </h3>
                <p className="text-xs text-slate-500">
                {typeInfo.description}
                </p>
                </div>

                {/* Selected Indicator */}
                {isSelected && (
                    <div className="absolute top-3 right-3">
                    <div className={cn('w-2 h-2 rounded-full', colors.icon)} />
                    </div>
                )}
                </div>
                </button>
            );
        })}
        </div>
        </div>
    );
};
