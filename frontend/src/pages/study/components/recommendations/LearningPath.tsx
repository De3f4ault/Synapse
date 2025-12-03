import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Clock, TrendingUp } from 'lucide-react';
import type { LearningPath as LearningPathType } from '../../types/study.types';

interface LearningPathProps {
    path: LearningPathType;
}

export function LearningPath({ path }: LearningPathProps) {
    return (
        <Card>
        <CardHeader>
        <div className="flex items-start justify-between">
        <div>
        <CardTitle>{path.title}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">{path.description}</p>
        </div>
        <Badge variant={path.difficulty === 'beginner' ? 'secondary' : 'default'}>
        {path.difficulty}
        </Badge>
        </div>
        </CardHeader>
        <CardContent className="space-y-4">
        <div className="space-y-2">
        <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{path.progress}%</span>
        </div>
        <Progress value={path.progress} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <span>{path.estimatedDuration}h</span>
        </div>
        <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span>{path.topics.length} topics</span>
        </div>
        </div>

        {path.nextMilestone && (
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg">
            <TrendingUp className="h-4 w-4 text-primary mt-0.5" />
            <div>
            <p className="text-sm font-medium">Next Milestone</p>
            <p className="text-sm text-muted-foreground">{path.nextMilestone}</p>
            </div>
            </div>
        )}
        </CardContent>
        </Card>
    );
}
