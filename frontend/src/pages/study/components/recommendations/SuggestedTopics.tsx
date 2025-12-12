import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingDown } from 'lucide-react';
import { useSuggestedTopics } from '../../hooks/useRecommendations';

export function SuggestedTopics() {
    const { data: topics, isLoading } = useSuggestedTopics();

    if (isLoading || !topics) {
        return <div className="text-muted-foreground">Loading suggestions...</div>;
    }

    return (
        <div className="space-y-3">
        <h4 className="text-sm font-medium">Topics to Review</h4>
        <div className="space-y-2">
        {topics.map(topic => (
            <Card key={topic.topic} className="hover:border-primary/50 cursor-pointer">
            <CardContent className="pt-4">
            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <div>
            <p className="font-medium text-sm">{topic.topic}</p>
            <p className="text-xs text-muted-foreground">{topic.reason}</p>
            </div>
            </div>
            <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
            {topic.itemCount} items
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            {topic.avgMastery}%
            </div>
            </div>
            </div>
            </CardContent>
            </Card>
        ))}
        </div>
        </div>
    );
}
