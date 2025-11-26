// src/pages/dashboard/components/shared/CustomStats.tsx
import { StatCard } from './StatCard';
import { BookOpen, MessageSquare } from 'lucide-react';

export function NotesCreatedCard({ value, trend }: { value: number; trend?: any }) {
    return (
        <StatCard
        label="Notes Created"
        value={value}
        formatter={(v) => v.toLocaleString()}
        trend={trend}
        icon={BookOpen}
        iconColor="text-indigo-400"
        />
    );
}

export function ChatSessionsCard({ value, trend }: { value: number; trend?: any }) {
    return (
        <StatCard
        label="Chat Sessions"
        value={value}
        trend={trend}
        icon={MessageSquare}
        iconColor="text-pink-400"
        />
    );
}
