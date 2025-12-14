/**
 * AI Insights Panel - Bottom Drawer
 * Non-destructive AI assistance that doesn't modify note content
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Save, X, ChevronDown, ChevronUp, Lightbulb, Tags } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

interface AIInsight {
    type: 'summary' | 'tags' | 'expansion' | 'suggestions';
    title: string;
    content: string | string[];
    timestamp: Date;
}

interface AIInsightsPanelProps {
    insights: AIInsight[];
    isOpen: boolean;
    onClose: () => void;
    onSaveToNote: (content: string) => void;
}

export const AIInsightsPanel = ({ insights, isOpen, onClose, onSaveToNote }: AIInsightsPanelProps) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleCopy = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard');
    };

    const handleSave = (content: string) => {
        onSaveToNote(content);
        toast.success('Added to note');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: isExpanded ? 0 : 'calc(100% - 48px)' }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-40 max-h-[60vh] flex flex-col"
                    style={{
                        background: 'linear-gradient(to top, rgba(139, 92, 246, 0.05), rgba(255,255,255,0.98))',
                        backdropFilter: 'blur(20px)',
                        borderTop: '2px solid rgba(139, 92, 246, 0.2)',
                        boxShadow: '0 -8px 32px rgba(139, 92, 246, 0.1)',
                    }}
                >
                    {/* Header */}
                    <div
                        className="flex items-center justify-between px-6 py-3 border-b border-purple-200/50 cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-purple-600" />
                            <h3 className="font-semibold text-purple-900">
                                AI Insights
                            </h3>
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-mono">
                                {insights.length}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsExpanded(!isExpanded);
                                }}
                                className="p-1 hover:bg-purple-100 rounded transition-colors"
                            >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClose();
                                }}
                                className="p-1 hover:bg-red-100 text-red-600 rounded transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    {isExpanded && (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {insights.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Lightbulb size={48} className="mx-auto mb-4 opacity-30" />
                                    <p>No AI insights yet. Use AI tools to generate summaries and suggestions.</p>
                                </div>
                            ) : (
                                insights.map((insight, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="bg-white rounded-lg p-4 border border-purple-200/50 shadow-sm"
                                    >
                                        {/* Insight Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                {insight.type === 'summary' && <Sparkles size={16} className="text-purple-600" />}
                                                {insight.type === 'tags' && <Tags size={16} className="text-blue-600" />}
                                                {insight.type === 'suggestions' && <Lightbulb size={16} className="text-amber-600" />}
                                                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                                            </div>
                                            <span className="text-xs text-gray-500">
                                                {insight.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>

                                        {/* Insight Content */}
                                        <div className="prose prose-sm max-w-none mb-3">
                                            {Array.isArray(insight.content) ? (
                                                <ul className="list-disc list-inside space-y-1">
                                                    {insight.content.map((item, i) => (
                                                        <li key={i} className="text-gray-700">{item}</li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-700 leading-relaxed">{insight.content}</p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => handleCopy(
                                                    Array.isArray(insight.content)
                                                        ? insight.content.join('\n')
                                                        : insight.content
                                                )}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                            >
                                                <Copy size={14} />
                                                Copy
                                            </button>
                                            <button
                                                onClick={() => handleSave(
                                                    Array.isArray(insight.content)
                                                        ? `\n\n**${insight.title}**\n${insight.content.map(item => `- ${item}`).join('\n')}`
                                                        : `\n\n**${insight.title}**\n${insight.content}`
                                                )}
                                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                                            >
                                                <Save size={14} />
                                                Add to Note
                                            </button>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
