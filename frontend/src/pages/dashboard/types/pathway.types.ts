/**
 * Learning Pathway Types
 */

export interface LearningPathway {
  id: string;
  title: string;
  icon: string;
  completionPercentage: number;
  topics: PathwayTopic[];
}

export interface PathwayTopic {
  id: string;
  title: string;
  status: "locked" | "available" | "in-progress" | "mastered";
  completionPercentage: number;
  accuracy?: number;
  reviewCount: number;
  prerequisites: string[];
  deckId?: number;
}

export type TopicStatus = "locked" | "available" | "in-progress" | "mastered";
