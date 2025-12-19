import React from 'react';
import { NeumorphicCard } from '@/components/neumorphic';
import { Award } from 'lucide-react';
import { ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip } from 'recharts';
import type { TopicMastery } from '@/api/generated';

interface MasteryWidgetProps {
    data: TopicMastery[];
}

export const MasteryWidget: React.FC<MasteryWidgetProps> = ({ data }) => {
    // Transform data for radar chart
    // We want to show "mastery_level" (0-100) for each topic
    const chartData = data.slice(0, 6).map(item => ({
        topic: item.topic,
        mastery: item.mastery_score * 100,
        fullMark: 100,
    }));

    return (
        <NeumorphicCard className="col-span-2 p-6 flex flex-col h-[380px]">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl nm-inset flex items-center justify-center text-yellow-500">
                    <Award className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Topic Mastery</h3>
                    <p className="text-xs text-slate-500">Knowledge distribution</p>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                {chartData.length < 3 ? (
                    <div className="text-center p-4">
                        <p className="text-sm text-slate-400">
                            Study more topics to see your mastery radar.
                        </p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
                            <PolarGrid stroke="rgba(255,255,255,0.1)" />
                            <PolarAngleAxis
                                dataKey="topic"
                                tick={{ fill: '#94a3b8', fontSize: 10 }}
                            />
                            <Radar
                                name="Mastery"
                                dataKey="mastery"
                                stroke="#f59e0b"
                                strokeWidth={2}
                                fill="#f59e0b"
                                fillOpacity={0.4}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e2024',
                                    borderColor: 'rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    color: '#f8fafc'
                                }}
                                itemStyle={{ color: '#f59e0b' }}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </NeumorphicCard>
    );
};
