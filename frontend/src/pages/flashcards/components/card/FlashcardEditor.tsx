/**
 * FlashcardEditor Component
 * Form for creating/editing flashcards - Neumorphic Design
 */

import { useForm } from 'react-hook-form';
import { Sparkles, Save, X, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NeumorphicButton } from '@/components/neumorphic';
import { cn } from '@/lib/utils';
import { useCreateCard } from '../../hooks/useCards';
import type { FlashcardCreateInput } from '../../types/flashcards.types';

interface FlashcardEditorProps {
    deckId: number;
    onSuccess?: () => void;
    onCancel?: () => void;
    mode?: 'modal' | 'inline';
}

export function FlashcardEditor({
    deckId,
    onSuccess,
    onCancel,
    mode = 'inline',
}: FlashcardEditorProps) {
    const { mutate: createCard, isPending } = useCreateCard();

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
        reset,
    } = useForm<FlashcardCreateInput>({
        defaultValues: {
            deck_id: deckId,
            front_text: '',
            back_text: '',
            front_media_url: null,
            back_media_url: null,
        },
    });

    const onSubmit = (data: FlashcardCreateInput) => {
        createCard(data, {
            onSuccess: () => {
                reset();
                if (onSuccess) onSuccess();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Front Text */}
            <div className="space-y-2">
                <Label htmlFor="front_text" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Query Layer (Front) <span className="text-cyan-500">*</span>
                </Label>
                <Textarea
                    id="front_text"
                    placeholder="What question or prompt should appear on the front?"
                    rows={4}
                    {...register('front_text', {
                        required: 'Front text is required',
                        minLength: { value: 1, message: 'Front text cannot be empty' },
                    })}
                    className={cn(
                        'nm-input w-full bg-transparent resize-none',
                        errors.front_text && 'border-red-500/50 focus:border-red-500'
                    )}
                />
                {errors.front_text && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-red-500" />
                        {errors.front_text.message}
                    </p>
                )}
            </div>

            {/* Back Text */}
            <div className="space-y-2">
                <Label htmlFor="back_text" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Data Core (Back) <span className="text-purple-500">*</span>
                </Label>
                <Textarea
                    id="back_text"
                    placeholder="What answer or information should appear on the back?"
                    rows={4}
                    {...register('back_text', {
                        required: 'Back text is required',
                        minLength: { value: 1, message: 'Back text cannot be empty' },
                    })}
                    className={cn(
                        'nm-input w-full bg-transparent resize-none',
                        errors.back_text && 'border-red-500/50 focus:border-red-500'
                    )}
                />
                {errors.back_text && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-red-500" />
                        {errors.back_text.message}
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-white/5">
                {onCancel && (
                    <NeumorphicButton
                        type="button"
                        variant="ghost"
                        onClick={onCancel}
                        className="flex-1"
                    >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                    </NeumorphicButton>
                )}
                <NeumorphicButton
                    type="submit"
                    disabled={isPending || !isDirty}
                    variant="primary"
                    className="flex-1"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Constructing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Construct Fragment
                        </>
                    )}
                </NeumorphicButton>
            </div>
        </form>
    );
}
