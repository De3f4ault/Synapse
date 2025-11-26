import { Plus, CreditCard, BookOpen, Upload, MessageSquare, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

/**
 * Quick action dropdown menu
 * Provides fast access to common creation actions
 */
export function QuickActions() {
    const navigate = useNavigate();

    const actions = [
        {
            label: 'Create Deck',
            icon: CreditCard,
            action: () => navigate('/flashcards'),
            description: 'New flashcard deck',
        },
        {
            label: 'Write Note',
            icon: BookOpen,
            action: () => navigate('/notes'),
            description: 'Capture your thoughts',
        },
        {
            label: 'Upload Document',
            icon: Upload,
            action: () => navigate('/documents'),
            description: 'Add learning materials',
        },
        {
            label: 'Start Chat',
            icon: MessageSquare,
            action: () => navigate('/chat'),
            description: 'Ask the AI',
        },
        {
            label: 'Create Quiz',
            icon: ClipboardList,
            action: () => navigate('/quizzes'),
            description: 'Test your knowledge',
        },
    ];

    return (
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Create</span>
        </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) => {
            const Icon = action.icon;
            return (
                <DropdownMenuItem
                key={action.label}
                onClick={action.action}
                className="cursor-pointer"
                >
                <div className="flex items-start gap-3 w-full">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                <div className="font-medium text-sm">{action.label}</div>
                <div className="text-xs text-muted-foreground">
                {action.description}
                </div>
                </div>
                </div>
                </DropdownMenuItem>
            );
        })}
        </DropdownMenuContent>
        </DropdownMenu>
    );
}
