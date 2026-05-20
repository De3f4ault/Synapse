/**
 * SuggestedTopics - GIE-powered weak/fragile concept display
 *
 * Shows concepts that need attention based on Graph Intelligence Engine.
 * Clicking a topic navigates to the flashcard deck for review.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, TrendingDown, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIntelligence } from "../../hooks/useIntelligence";
import { cn } from "@/lib/utils";

export function SuggestedTopics() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useIntelligence(10);

  /**
   * Navigate to deck for review.
   * concept_id is actually the deck ID from the GIE function.
   */
  const handleTopicClick = (conceptId: string) => {
    // Navigate to flashcard deck review
    navigate(`/flashcards/${conceptId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Analyzing your learning state...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <AlertCircle size={20} className="mr-2" />
        <span className="text-sm">Could not load topic suggestions</span>
      </div>
    );
  }

  // Combine weak and fragile concepts
  const topics = [
    ...(data?.weak_concepts || []).map(c => ({ ...c, status: "weak" as const })),
    ...(data?.fragile_concepts || []).map(c => ({ ...c, status: "fragile" as const })),
  ];

  if (topics.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">✨</div>
        <p className="text-muted-foreground text-sm">
          No weak areas detected. Keep up the great work!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {topics.map((topic) => (
          <Card
            key={topic.concept_id}
            onClick={() => handleTopicClick(topic.concept_id)}
            className={cn(
              "border transition-colors cursor-pointer group",
              topic.status === "weak"
                ? "border-destructive/20 hover:border-red-500/40 bg-destructive/5"
                : "border-warning/20 hover:border-amber-500/40 bg-warning/5"
            )}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BookOpen className={cn(
                    "h-4 w-4",
                    topic.status === "weak" ? "text-destructive" : "text-warning"
                  )} />
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {topic.concept_name || topic.concept_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {topic.status === "weak"
                        ? "Needs immediate attention"
                        : "At risk of being forgotten"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs border",
                      topic.status === "weak"
                        ? "border-red-500/30 text-destructive"
                        : "border-amber-500/30 text-warning"
                    )}
                  >
                    {topic.status === "weak" ? "Weak" : "Fragile"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingDown className="h-3 w-3" />
                    {Math.round(topic.mastery * 100)}%
                  </div>
                </div>
              </div>

              {/* Evidence if available */}
              {topic.weakness_evidence?.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {topic.weakness_evidence?.[0]?.reason}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
