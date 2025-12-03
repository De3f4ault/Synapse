import { Button } from '@/components/ui/button';
import { Check, X, SkipForward } from 'lucide-react';

interface SessionControlsProps {
    onCorrect: () => void;
    onIncorrect: () => void;
    onSkip: () => void;
    disabled?: boolean;
}

export function SessionControls({
    onCorrect,
    onIncorrect,
    onSkip,
    disabled,
}: SessionControlsProps) {
    return (
        <div className="flex gap-3 justify-center">
        <Button
        variant="outline"
        size="lg"
        onClick={onIncorrect}
        disabled={disabled}
        className="flex-1 max-w-xs"
        >
        <X className="h-5 w-5 mr-2 text-red-500" />
        Incorrect
        </Button>
        <Button
        variant="default"
        size="lg"
        onClick={onCorrect}
        disabled={disabled}
        className="flex-1 max-w-xs"
        >
        <Check className="h-5 w-5 mr-2" />
        Correct
        </Button>
        <Button
        variant="ghost"
        size="lg"
        onClick={onSkip}
        disabled={disabled}
        >
        <SkipForward className="h-4 w-4" />
        </Button>
        </div>
    );
}
