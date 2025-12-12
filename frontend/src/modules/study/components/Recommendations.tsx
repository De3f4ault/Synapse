import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, TrendingDown, Target, PlayCircle } from 'lucide-react';
import { getRecommendationsApiV1StudyRecommendationsGet } from '@/api/generated/services.gen';
import { QUERY_KEYS } from '@/lib/constants';
import type { StudyItemResponse } from '@/api/generated/types.gen';

/**
 * Recommendations Component
 * AI-powered study recommendations based on weak areas and patterns
 */

interface RecommendationsProps {
    limit?: number;
    onStartSession?: (items: StudyItemResponse[]) => void;
}

export function Recommendations({ limit = 10, onStartSession }: RecommendationsProps) {
    // Fetch recommendations
    const {
        data: recommendations = [],
        isLoading,
        refetch,
    } = useQuery({
        queryKey: [QUERY_KEYS.STUDY, 'recommendations', limit],
        queryFn: () => getRecommendationsApiV1StudyRecommendationsGet({ limit }),
    });

    if (isLoading) {
        return (
            <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
                </CardContent>
                </Card>
            ))}
            </div>
        );
    }

    if (recommendations.length === 0) {
        return (
            <Card>
            <CardContent className="py-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
            <p className="text-muted-foreground mb-4">
            Study more content to get personalized recommendations
            </p>
            <Button variant="outline" onClick={() => refetch()}>
            Refresh
            </Button>
            </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
        {/* Header */}
        <CardHeader className="px-0">
        <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <CardTitle>Recommended for You</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
        AI-powered suggestions based on your learning patterns
        </p>
        </CardHeader>

        {/* Recommendations List */}
        <div className="space-y-3">
        {recommendations.map((item, index) => (
            <RecommendationCard
            key={`${item.type}-${item.id}`}
            item={item}
            priority={index + 1}
            />
        ))}
        </div>

        {/* Start Session Button */}
        {recommendations.length > 0 && onStartSession && (
            <Card className="border-dashed">
            <CardContent className="py-6 text-center">
            <Button onClick={() => onStartSession(recommendations)}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Recommended Session
            </Button>
            </CardContent>
            </Card>
        )}
        </div>
    );
}

// Recommendation Card Component
interface RecommendationCardProps {
    item: StudyItemResponse;
    priority: number;
}

function RecommendationCard({ item, priority }: RecommendationCardProps) {
    // Determine recommendation reason
    const getReason = (data: any): string => {
        if (data.accuracy && data.accuracy < 0.7) return 'Needs improvement';
        if (data.times_reviewed === 0) return 'Not yet reviewed';
        if (data.learning_state === 'learning') return 'In progress';
        return 'Recommended';
    };

    const getReasonColor = (reason: string): string => {
        if (reason.includes('improvement')) return 'text-red-600 bg-red-50';
        if (reason.includes('Not yet')) return 'text-blue-600 bg-blue-50';
        if (reason.includes('progress')) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
    };

    const title = item.data.title || item.data.front_text || 'Untitled';
    const subtitle = item.data.deck_name || item.data.description || '';
    const accuracy = item.data.accuracy;
    const reason = getReason(item.data);

    return (
        <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
        <div className="flex items-start gap-4">
        {/* Priority Badge */}
        <div className="flex-shrink-0">
        <Badge variant="outline" className="rounded-full h-8 w-8 flex items-center justify-center font-bold">
        {priority}
        </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-medium line-clamp-1">{title}</h3>
        <Badge className={getReasonColor(reason)}>
        <TrendingDown className="h-3 w-3 mr-1" />
        {reason}
        </Badge>
        </div>

        {subtitle && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            {subtitle}
            </p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline" className="text-xs">
        {item.type}
        </Badge>

        {accuracy !== undefined && (
            <span className="text-muted-foreground">
            Current accuracy: {(accuracy * 100).toFixed(0)}%
            </span>
        )}
        </div>
        </div>
        </div>
        </CardContent>
        </Card>
    );
}
