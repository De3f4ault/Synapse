/**
 * CreateDeckPage - Manual Deck Creation
 * 
 * REFACTORED: Uses premium AuroraBackground and GlassCard.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Loader2, Plus, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { z } from 'zod';

// Module imports
import { useCreateDeck, type DeckCreateInput } from './list';
import { AuroraBackground } from '@/shared/ui';
import { GlassCard } from "@/shared/ui";

// Schema
const deckCreateSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    description: z.string().max(500).optional(),
    tags: z.array(z.string()).nullable().optional(),
    is_public: z.boolean().default(false),
});

export function CreateDeckPage() {
    const navigate = useNavigate();
    const { mutate: createDeck, isPending } = useCreateDeck();
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isDirty },
    } = useForm<DeckCreateInput>({
        resolver: zodResolver(deckCreateSchema),
        defaultValues: {
            name: '',
            description: '',
            tags: [],
            is_public: false,
        },
    });

    const isPublic = watch('is_public');

    const onSubmit = (data: DeckCreateInput) => {
        createDeck(
            { ...data, tags: tags.length > 0 ? tags : undefined },
            {
                onSuccess: (deck) => {
                    toast.success('Deck created successfully');
                    navigate(`/flashcards/${deck.id}`);
                },
                onError: (error) => {
                    toast.error('Failed to create deck', {
                        description: error instanceof Error ? error.message : 'Unknown error',
                    });
                },
            }
        );
    };

    const addTag = () => {
        if (tagInput.trim() && tags.length < 10 && !tags.includes(tagInput.trim())) {
            const newTags = [...tags, tagInput.trim()];
            setTags(newTags);
            setValue('tags', newTags, { shouldDirty: true });
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        const newTags = tags.filter((t) => t !== tag);
        setTags(newTags);
        setValue('tags', newTags.length > 0 ? newTags : undefined, { shouldDirty: true });
    };

    return (
        <AuroraBackground className="fixed inset-0 min-h-screen flex flex-col" fixed>
            {/* Top Bar */}
            <div className="flex-none h-16 border-b border-white/5 bg-black/20 backdrop-blur-xl z-20 px-8 flex items-center gap-4">
                <button
                    onClick={() => navigate('/flashcards')}
                    className="p-2 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-sm font-bold text-white leading-none mb-1">Create New Deck</h1>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Configuration</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 relative z-10 flex flex-col items-center justify-start pt-16">
                <div className="w-full max-w-2xl space-y-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {/* Form Card */}
                        <GlassCard className="p-8">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                {/* Deck Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Deck Name <span className="text-cyan-500">*</span>
                                    </Label>
                                    <input
                                        id="name"
                                        placeholder="e.g., Quantum Physics Fundamentals"
                                        {...register('name')}
                                        className={cn(
                                            'w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors backdrop-blur-sm',
                                            errors.name && 'border-red-500/50 focus:border-red-500'
                                        )}
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-400 mt-1">{errors.name?.message}</p>
                                    )}
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Description
                                    </Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Describe the topics covered in this deck..."
                                        rows={4}
                                        {...register('description')}
                                        className="w-full min-h-[120px] resize-y px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors backdrop-blur-sm"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                        Tags ({tags.length}/10)
                                    </Label>

                                    <div className="flex gap-2">
                                        <input
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    addTag();
                                                }
                                            }}
                                            placeholder="Add a tag..."
                                            maxLength={50}
                                            disabled={tags.length >= 10}
                                            className="flex-1 px-4 py-2 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-colors backdrop-blur-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={addTag}
                                            disabled={!tagInput.trim() || tags.length >= 10}
                                            className="px-4 py-2 rounded-xl bg-cyan-600/80 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-500 transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2">
                                            {tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-sm flex items-center gap-2"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTag(tag)}
                                                        className="hover:text-cyan-300 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Public Toggle */}
                                <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                                    <div>
                                        <Label htmlFor="is_public" className="text-sm font-bold text-slate-200 cursor-pointer">
                                            Make Deck Public
                                        </Label>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Allow other users to find and study this deck
                                        </p>
                                    </div>
                                    <Switch
                                        id="is_public"
                                        checked={isPublic}
                                        onCheckedChange={(checked) => setValue('is_public', checked, { shouldDirty: true })}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => navigate('/flashcards')}
                                        className="flex-1 py-3.5 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors font-medium border border-transparent hover:border-white/10"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending || !isDirty}
                                        className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="h-4 w-4" />
                                                Save Deck
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </GlassCard>
                    </motion.div>
                </div>
            </div>
        </AuroraBackground>
    );
}
