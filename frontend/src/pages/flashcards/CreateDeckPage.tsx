import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Save, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useCreateDeck } from '@/api/hooks/useFlashcards';
import { deckCreateSchema, type DeckCreateInput } from '@/modules/flashcards/schemas/deckSchema';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * CreateDeckPage - Neural Core Constructor
 * Standardized with Dashboard design language
 */

export function CreateDeckPage() {
    const navigate = useNavigate();
    const { mutate: createDeck, isPending } = useCreateDeck();
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');

    const {
        register,
        handleSubmit,
        watch,
        setValue,
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
            { ...data, tags: tags.length > 0 ? tags : null },
            {
                onSuccess: (deck) => {
                    toast.success('Memory core constructed successfully');
                    navigate(`/flashcards/${deck.id}`);
                },
                onError: (error) => {
                    toast.error('Failed to construct core', {
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
        setValue('tags', newTags.length > 0 ? newTags : null, { shouldDirty: true });
    };

    return (
        <div className="min-h-screen bg-[#020202] text-slate-200 relative overflow-hidden">
        {/* Noise Texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />

        {/* Ambient Gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-900/10 blur-[150px] rounded-full opacity-50" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-900/10 blur-[150px] rounded-full opacity-50" />

        <div className="relative z-10 max-w-3xl mx-auto p-8 space-y-6">
        {/* Header */}
        <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
        >
        <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/flashcards')}
        className="text-slate-500 hover:text-white hover:bg-white/5"
        >
        <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-wide">
        Construct Memory Core
        </h1>
        <p className="text-slate-400 font-mono text-xs tracking-[0.2em] uppercase mt-1">
        INITIALIZE NEW NEURAL DECK
        </p>
        </div>
        </motion.div>

        {/* Form Card */}
        <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[rgba(10,10,10,0.6)] backdrop-blur-xl border border-white/5 rounded-2xl p-8 space-y-6 shadow-2xl"
        >
        {/* Deck Name */}
        <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Core Designation <span className="text-cyan-500">*</span>
        </Label>
        <Input
        id="name"
        placeholder="e.g., Quantum Physics Fundamentals"
        {...register('name')}
        className={cn(
            'bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-cyan-500/50 transition-colors h-12 text-base',
            errors.name && 'border-red-500/50 focus:border-red-500'
        )}
        />
        {errors.name && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-red-500" />
            {errors.name.message}
            </p>
        )}
        </div>

        {/* Description */}
        <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Neural Signature
        </Label>
        <Textarea
        id="description"
        placeholder="Describe the purpose and scope of this memory core..."
        rows={4}
        {...register('description')}
        className="bg-black/40 border-white/10 text-white placeholder:text-slate-600 focus:border-purple-500/50 transition-colors resize-none"
        />
        {errors.description && (
            <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
        )}
        </div>

        {/* Tags */}
        <div className="space-y-3">
        <Label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
        Classification Tags ({tags.length}/10)
        </Label>

        {/* Tag Input */}
        <div className="flex gap-2">
        <Input
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
        className="flex-1 bg-black/40 border-white/10 text-white placeholder:text-slate-600 h-10"
        />
        <Button
        type="button"
        onClick={addTag}
        disabled={!tagInput.trim() || tags.length >= 10}
        size="icon"
        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white"
        >
        <Plus className="h-4 w-4" />
        </Button>
        </div>

        {/* Tag List */}
        {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
                <Badge
                key={tag}
                variant="outline"
                className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-mono text-xs px-3 py-1 flex items-center gap-2"
                >
                {tag}
                <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:text-emerald-300 transition-colors"
                >
                <X className="h-3 w-3" />
                </button>
                </Badge>
            ))}
            </div>
        )}
        </div>

        {/* Public Toggle */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
        <div>
        <Label htmlFor="is_public" className="text-sm font-bold text-slate-300 cursor-pointer">
        Public Access Protocol
        </Label>
        <p className="text-xs text-slate-500 mt-1 font-mono">
        Allow other users to access this core
        </p>
        </div>
        <Switch
        id="is_public"
        checked={isPublic}
        onCheckedChange={(checked) => setValue('is_public', checked, { shouldDirty: true })}
        className="data-[state=checked]:bg-cyan-500"
        />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-white/5">
        <Button
        type="button"
        variant="outline"
        onClick={() => navigate('/flashcards')}
        className="flex-1 bg-white/5 hover:bg-white/10 border-white/10 text-white"
        >
        Cancel
        </Button>
        <Button
        type="submit"
        disabled={isPending || !isDirty}
        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 font-bold"
        >
        {isPending ? (
            <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Constructing...
            </>
        ) : (
            <>
            <Sparkles className="mr-2 h-4 w-4" />
            Construct Core
            </>
        )}
        </Button>
        </div>
        </motion.form>
        </div>
        </div>
    );
}
