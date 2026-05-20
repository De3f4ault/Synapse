import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import type { RecommendedItem } from "../../types/study.types";

interface RecommendationCardProps {
  item: RecommendedItem;
  onClick?: () => void;
}

export function RecommendationCard({ item, onClick }: RecommendationCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
      <Card
        className="cursor-pointer hover:border-primary/50"
        onClick={onClick}
      >
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-accent/5 dark:bg-accent/10">
                <Sparkles className="h-4 w-4 text-accent dark:text-accent" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.reason}
                </p>
              </div>
              <Badge variant="outline" className="text-xs">
                {Math.round(item.confidence * 100)}% match
              </Badge>
            </div>

            {item.relatedTopics && item.relatedTopics.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.relatedTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    {topic}
                  </Badge>
                ))}
              </div>
            )}

            <div className="flex gap-4 text-xs text-muted-foreground">
              {item.suggestedDuration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.suggestedDuration}m
                </div>
              )}
              {typeof item.masteryLevel === "number" && (
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {item.masteryLevel}% mastery
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
