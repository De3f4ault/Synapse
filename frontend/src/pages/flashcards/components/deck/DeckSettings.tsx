/**
 * DeckSettings Component
 * Inline editing for deck name and description
 */

import { useState } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { Deck } from '../../types/flashcards.types';

interface DeckSettingsProps {
    deck: Deck;
    onUpdate: (data: { name?: string; description?: string }) => void;
}

export function DeckSettings({ deck, onUpdate }: DeckSettingsProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [editedDescription, setEditedDescription] = useState('');

    const handleStartEdit = (field: 'name' | 'description') => {
        if (field === 'name') {
            setEditedName(deck.name);
            setIsEditingName(true);
        } else {
            setEditedDescription(deck.description || '');
            setIsEditingDescription(true);
        }
    };

    const handleSave = (field: 'name' | 'description') => {
        if (field === 'name' && editedName.trim()) {
            onUpdate({ name: editedName });
            setIsEditingName(false);
        } else if (field === 'description') {
            onUpdate({ description: editedDescription });
            setIsEditingDescription(false);
        }
    };

    const handleCancel = (field: 'name' | 'description') => {
        if (field === 'name') {
            setIsEditingName(false);
            setEditedName('');
        } else {
            setIsEditingDescription(false);
            setEditedDescription('');
        }
    };

    return (
        <div className="flex-1">
        {/* Editable Name */}
        {isEditingName ? (
            <div className="flex items-center gap-2">
            <Input
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            className="text-2xl font-serif font-bold h-auto py-2 bg-black/40 border-cyan-500/30 text-white focus:border-cyan-500"
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave('name');
                if (e.key === 'Escape') handleCancel('name');
            }}
            />
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSave('name')}
            className="hover:bg-emerald-500/20 text-emerald-400"
            >
            <Check className="h-4 w-4" />
            </Button>
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleCancel('name')}
            className="hover:bg-red-500/20 text-red-400"
            >
            <X className="h-4 w-4" />
            </Button>
            </div>
        ) : (
            <h1
            className="text-3xl font-serif font-bold tracking-wide cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-2 group"
            onClick={() => handleStartEdit('name')}
            >
            {deck.name}
            <Edit2 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
        )}

        {/* Editable Description */}
        {isEditingDescription ? (
            <div className="flex items-start gap-2 mt-2">
            <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            className="resize-none bg-black/40 border-purple-500/30 text-slate-300 focus:border-purple-500"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
                if (e.key === 'Escape') handleCancel('description');
            }}
            />
            <div className="flex flex-col gap-1">
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleSave('description')}
            className="hover:bg-emerald-500/20 text-emerald-400"
            >
            <Check className="h-4 w-4" />
            </Button>
            <Button
            size="icon"
            variant="ghost"
            onClick={() => handleCancel('description')}
            className="hover:bg-red-500/20 text-red-400"
            >
            <X className="h-4 w-4" />
            </Button>
            </div>
            </div>
        ) : (
            <p
            className="text-slate-400 font-mono text-sm mt-1 cursor-pointer hover:text-slate-300 transition-colors group"
            onClick={() => handleStartEdit('description')}
            >
            {deck.description || 'Add neural signature...'}
            <Edit2 className="h-3 w-3 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
        )}
        </div>
    );
}
