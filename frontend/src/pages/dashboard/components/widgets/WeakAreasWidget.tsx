import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import type { WeakArea } from '@/api/generated';

interface WeakAreasWidgetProps {
    data: WeakArea[];
}

export const WeakAreasWidget: React.FC<WeakAreasWidgetProps> = ({ data }) => {
    return (
        <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Focus Areas
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                {data.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Great job! No significant weak areas detected.
                    </p>
                ) : (
                    data.slice(0, 5).map((area) => (
                        <div key={area.topic} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium text-muted-foreground">
                                    {area.topic}
                                </span>
                                <span className="text-red-500 font-bold">
                                    {(area.accuracy * 100).toFixed(0)}%
                                </span>
                            </div>
                            <Progress
                                value={area.accuracy * 100}
                                className="h-2 bg-secondary"
                                indicatorClassName="bg-red-500"
                            />
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
};
