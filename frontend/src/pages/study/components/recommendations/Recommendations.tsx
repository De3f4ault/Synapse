/**
 * Recommendations - AI-powered study recommendations view
 */

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play, Sparkles, Map, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import {
  useRecommendations,
  useLearningPaths,
} from "../../hooks/useRecommendations";
import { RecommendationCard } from "./RecommendationCard";
import { LearningPath } from "./LearningPath";
import { SuggestedTopics } from "./SuggestedTopics";
import { PriorityActions } from "../intelligence/PriorityActions";
import type { StudyItem } from "../../types/study.types";

interface RecommendationsProps {
  limit?: number;
  onStartSession: (items: StudyItem[]) => void;
}

export function Recommendations({
  limit,
  onStartSession,
}: RecommendationsProps) {
  const { data: recommendations, isLoading } = useRecommendations(limit);
  const { data: learningPaths } = useLearningPaths();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading recommendations...
      </div>
    );
  }

  const handleToggleItem = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleStartAll = () => {
    if (recommendations) {
      onStartSession(recommendations);
    }
  };

  const handleStartSelected = () => {
    if (recommendations) {
      const selected = recommendations.filter((item) =>
        selectedItems.includes(item.id),
      );
      onStartSession(selected);
    }
  };

  return (
    <div className="space-y-8">
      {/* Priority Actions - GIE powered */}
      <PriorityActions limit={3} />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Existing Tabs */}
      <Tabs defaultValue="items" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="items" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Recommended Items
            </TabsTrigger>
            <TabsTrigger value="paths" className="gap-2">
              <Map className="h-4 w-4" />
              Learning Paths
            </TabsTrigger>
            <TabsTrigger value="topics" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Suggested Topics
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={
              selectedItems.length > 0 ? handleStartSelected : handleStartAll
            }
          >
            <Play className="h-4 w-4 mr-2" />
            Start Session
          </Button>
        </div>

        <TabsContent value="items" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              {recommendations?.length || 0} Recommendations
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Based on your performance and learning patterns
            </p>
            {selectedItems.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedItems.length} selected
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <RecommendationCard
                  item={item}
                  onClick={() => handleToggleItem(item.id)}
                />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Your Learning Paths</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Structured paths to master different topics
            </p>
          </div>

          {learningPaths && learningPaths.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {learningPaths.map((path) => (
                <motion.div
                  key={path.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <LearningPath path={path} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No learning paths available yet
            </div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Topics to Focus On</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Areas that need more attention based on your performance
            </p>
          </div>

          <SuggestedTopics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
