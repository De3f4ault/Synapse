import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-500" />
                    Topic Mastery
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                {chartData.length < 3 ? (
                    <div className="h-[250px] flex items-center justify-center text-center p-4">
                        <p className="text-sm text-muted-foreground">
                            Study more topics to see your mastery radar.
                        </p>
                    </div>
                ) : (
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                                <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                                <PolarAngleAxis
                                    dataKey="topic"
                                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                />
                                <Radar
                                    name="Mastery"
                                    dataKey="mastery"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.3}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
