/**
 * DeckCard Component
 * Neumorphic design with gradient accents and mastery arcs
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, MoreVertical, Edit, Trash2, Layers, Brain, Database, Code, Zap } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Deck, DeckColor } from '../../types/flashcards.types';
import { NeumorphicCard, NeumorphicButton } from '@/components/neumorphic';

interface DeckCardProps {
    deck: Deck;
    color: DeckColor;
    masteryPercent: number;
    onDelete: () => void;
    onEdit: () => void;
    onReview: () => void;
    onClick: () => void;
}

const gradientStyles = {
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-t-cyan-500/50',
    purple: 'from-purple-500/20 to-purple-500/5 border-t-purple-500/50',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-t-emerald-500/50',
    red: 'from-red-500/20 to-red-500/5 border-t-red-500/50',
    amber: 'from-amber-500/20 to-amber-500/5 border-t-amber-500/50',
    blue: 'from-blue-500/20 to-blue-500/5 border-t-blue-500/50',
};

const iconColors = {
    cyan: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
    purple: 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
    emerald: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
    red: 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]',
    amber: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    blue: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]',
};

// Helper to get deck icon based on tags/name
const getDeckIcon = (deck: Deck) => {
    const text = (deck.name + (deck.tags?.join(' ') || '')).toLowerCase();
    if (text.includes('code') || text.includes('dev') || text.includes('sql')) return Code;
    if (text.includes('data') || text.includes('db')) return Database;
    if (text.includes('neuro') || text.includes('brain')) return Brain;
    return Zap;
};

export const DeckCard = React.memo(function DeckCard({
    deck,
    color,
    masteryPercent,
    onDelete,
    onEdit,
    onReview,
    onClick,
}: DeckCardProps) {
    const Icon = getDeckIcon(deck);

    // Mastery Arc Calculations (radius 32 for larger centralized view)
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (masteryPercent / 100) * circumference;

    return (
        <NeumorphicCard
            onClick={onClick}
            className={`group h-80 p-0 flex flex-col cursor-pointer transition-all duration-300 hover:translate-y-[-6px] hover:shadow-2xl overflow-hidden bg-[#0f0f16] border border-white/5 relative`}
        >
            {/* Gradient Header with Wave - 55% Height */}
            <div className={`h-[55%] relative bg-gradient-to-br ${gradientStyles[color]} flex items-center justify-center overflow-hidden`}>

                {/* Background Decor */}
                <div className="absolute inset-0 opacity-30 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[50px] rounded-full pointer-events-none" />

                {/* Actions Dropdown */}
                <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button className="h-8 w-8 rounded-full flex items-center justify-center bg-black/20 text-white/70 hover:bg-black/40 hover:text-white backdrop-blur-sm transition-colors">
                                <MoreVertical size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#0f0f16] border-white/5 text-slate-200">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Centered Mastery Ring & Icon */}
                <div className="relative z-10 flex flex-col items-center justify-center transform group-hover:scale-105 transition-transform duration-500">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                        {/* Glow effect behind */}
                        <div className={`absolute inset-0 rounded-full blur-xl opacity-40 ${iconColors[color].split(' ')[0].replace('text-', 'bg-')}`} />

                        <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-lg">
                            {/* Track */}
                            <circle
                                cx="48" cy="48" r={radius}
                                stroke="rgba(255,255,255,0.15)" strokeWidth="6" fill="transparent"
                                className=""
                            />
                            {/* Progress */}
                            <circle
                                cx="48" cy="48" r={radius}
                                stroke="currentColor" strokeWidth="6" fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                className={`${iconColors[color].split(' ')[0]} transition-all duration-1000 ease-out`}
                            />
                        </svg>
                        <Icon size={32} className={`text-white drop-shadow-md relative z-10 ${iconColors[color].split(' ')[0]}`} />
                    </div>
                    <span className="text-white/90 font-mono text-xs font-bold mt-2 tracking-wider drop-shadow-sm">
                        {masteryPercent}%
                    </span>
                </div>

                {/* Wave Curve Divider */}
                <div className="absolute bottom-0 left-0 right-0 h-8 text-[#0f0f16]">
                    <svg viewBox="0 0 1440 320" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                        <path fill="currentColor" fillOpacity="1" d="M0,224L80,213.3C160,203,320,181,480,181.3C640,181,800,203,960,213.3C1120,224,1280,224,1360,224L1440,224L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 px-5 pt-2 pb-5 flex flex-col justify-between relative z-10">
                <div className="text-center">
                    <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-cyan-400 transition-colors">
                        {deck.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 h-8 px-2">
                        {deck.description || "No description provided."}
                    </p>
                </div>

                <div className="space-y-4 mt-2">
                    {/* Stats Row */}
                    <div className="flex items-center justify-center gap-4 text-[10px] font-medium text-slate-500 uppercase tracking-widest border-t border-white/5 pt-3">
                        <div className="flex items-center gap-1.5" title="Total Cards">
                            <Layers size={12} className="text-slate-400" />
                            {deck.card_count || 0}
                        </div>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <div className="flex items-center gap-1.5" title="Due Today">
                            <Zap size={12} className="text-amber-400" />
                            {/* Mocking due count from deck data or logic */}
                            {Math.floor(Math.random() * 10) + 1} Due
                        </div>
                    </div>

                    <NeumorphicButton
                        variant="primary"
                        onClick={(e) => { e.stopPropagation(); onReview(); }}
                        className="w-full py-2 text-xs font-bold shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-shadow"
                    >
                        <Play size={14} className="mr-2 fill-current" />
                        Review Now
                    </NeumorphicButton>
                </div>
            </div>
        </NeumorphicCard>
    );
});
