import React from 'react';
import { NeumorphicCard } from '@/components/neumorphic';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import type { WeakArea } from '@/api/generated';

interface WeakAreasWidgetProps {
    data: WeakArea[];
}

export const WeakAreasWidget: React.FC<WeakAreasWidgetProps> = ({ data }) => {
    return (
        <NeumorphicCard className="col-span-2 p-6 flex flex-col h-[380px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-red-400">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Focus Areas</h3>
                    <p className="text-xs text-slate-500">Suggested improvements</p>
                </div>
            </div>

            <div className="flex-1 w-full overflow-y-auto scrollbar-hide space-y-5 pr-2">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center">
                        <p className="text-sm text-slate-400 italic">
                            Great job! No significant weak areas detected.
                        </p>
                    </div>
                ) : (
                    data.slice(0, 5).map((area) => (
                        <div key={area.topic} className="space-y-2 group">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                                    {area.topic}
                                </span>
                                <span className="text-red-400 font-bold font-mono">
                                    {(area.accuracy * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-400 rounded-full transition-all duration-500"
                                    style={{ width: `${area.accuracy * 100}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </NeumorphicCard>
    );
};
