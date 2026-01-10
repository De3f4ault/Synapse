import React from 'react';
import { Sun, Moon, Coffee, Sunset } from 'lucide-react';

export type ViewerTheme = 'light' | 'sepia' | 'twilight' | 'dark';

interface ThemeSelectorProps {
    theme: ViewerTheme;
    onThemeChange: (theme: ViewerTheme) => void;
    className?: string;
}

const themes: { value: ViewerTheme; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'light', label: 'Light', icon: <Sun size={14} />, color: 'bg-white text-gray-900 border-gray-300' },
    { value: 'sepia', label: 'Sepia', icon: <Coffee size={14} />, color: 'bg-amber-100 text-amber-900 border-amber-300' },
    { value: 'twilight', label: 'Twilight', icon: <Sunset size={14} />, color: 'bg-slate-700 text-slate-100 border-slate-500' },
    { value: 'dark', label: 'Dark', icon: <Moon size={14} />, color: 'bg-zinc-900 text-zinc-100 border-zinc-700' },
];

/**
 * Theme selector for document viewers
 */
export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
    theme,
    onThemeChange,
    className = '',
}) => {
    return (
        <div className={`flex items-center gap-1 ${className}`}>
            {themes.map((t) => (
                <button
                    key={t.value}
                    onClick={() => onThemeChange(t.value)}
                    className={`p-2 rounded-lg border transition-all ${t.color} ${theme === t.value
                            ? 'ring-2 ring-cyan-500 ring-offset-1 ring-offset-black scale-110'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                    title={t.label}
                >
                    {t.icon}
                </button>
            ))}
        </div>
    );
};

export default ThemeSelector;
