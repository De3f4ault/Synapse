/**
 * Pathway Generator - Build learning paths from deck data
 * Converts flashcard decks into structured learning pathways
 */

import type { LearningPathway, PathwayTopic, TopicStatus } from '../types/pathway.types';
import type { DashboardData } from '../types/dashboard.types';

/**
 * Generate learning pathways from dashboard data
 * Groups decks by tags/categories and calculates progress
 */
export function generatePathways(data: DashboardData): LearningPathway[] {
  if (!data.dueCards || data.dueCards.length === 0) {
    return [];
  }

  // Group cards by deck
  const deckMap = new Map<string, {
    deckId: number;
    deckName: string;
    cards: any[];
    tags?: string[];
  }>();

  data.dueCards.forEach(card => {
    const deckId = card.deck_id;
    const deckName = card.deck_name || 'Unknown Deck';

  if (!deckMap.has(deckName)) {
    deckMap.set(deckName, {
      deckId,
      deckName,
      cards: [],
      tags: [],
    });
  }

  deckMap.get(deckName)!.cards.push(card);
  });

  // Convert decks to pathways
  const pathways: LearningPathway[] = [];

  deckMap.forEach((deck, deckName) => {
    const topics = buildTopicsFromDeck(deck);
    const completionPercentage = calculatePathwayCompletion(topics);

    pathways.push({
      id: `pathway-${deck.deckId}`,
      title: deckName,
      icon: getCategoryIcon(deckName),
                  completionPercentage,
                  topics,
    });
  });

  // Sort by completion (incomplete first)
  return pathways.sort((a, b) => a.completionPercentage - b.completionPercentage);
}

/**
 * Build topics from deck cards
 */
function buildTopicsFromDeck(deck: {
  deckId: number;
  deckName: string;
  cards: any[];
}): PathwayTopic[] {
  const totalCards = deck.cards.length;
  const masteredCards = deck.cards.filter(c => c.learning_state === 'mastered').length;
  const inProgressCards = deck.cards.filter(c =>
  c.learning_state === 'learning' || c.learning_state === 'review'
  ).length;

  const completionPercentage = totalCards > 0
  ? Math.round((masteredCards / totalCards) * 100)
  : 0;

  const averageAccuracy = deck.cards.reduce((sum, card) => {
    return sum + (card.accuracy || 0);
  }, 0) / (totalCards || 1) / 100; // Convert percentage to decimal

  const totalReviews = deck.cards.reduce((sum, card) => {
    return sum + (card.times_reviewed || 0);
  }, 0);

  const status = calculateTopicStatus(
    completionPercentage / 100,
    totalReviews
  );

  return [{
    id: `topic-${deck.deckId}`,
    title: deck.deckName,
    status,
    completionPercentage,
    accuracy: averageAccuracy,
    reviewCount: totalReviews,
    prerequisites: [],
    deckId: deck.deckId,
  }];
}

/**
 * Calculate topic status based on accuracy and review count
 */
export function calculateTopicStatus(
  accuracy: number,
  reviewCount: number
): TopicStatus {
  if (reviewCount === 0) return 'available';
  if (accuracy >= 0.85 && reviewCount >= 10) return 'mastered';
  if (reviewCount > 0) return 'in-progress';
  return 'available';
}

/**
 * Calculate overall pathway completion
 */
function calculatePathwayCompletion(topics: PathwayTopic[]): number {
  if (topics.length === 0) return 0;

  const totalCompletion = topics.reduce((sum, topic) => {
    return sum + topic.completionPercentage;
  }, 0);

  return Math.round(totalCompletion / topics.length);
}

/**
 * Get icon for category/subject
 */
function getCategoryIcon(category: string): string {
  const categoryLower = category.toLowerCase();

  const iconMap: Record<string, string> = {
    biology: '🧬',
    chemistry: '⚗️',
    physics: '⚛️',
    math: '📐',
    mathematics: '📐',
    history: '📜',
    language: '🗣️',
    english: '📖',
    literature: '📚',
    science: '🔬',
    computer: '💻',
    programming: '💻',
    geography: '🌍',
    art: '🎨',
    music: '🎵',
  };

  // Check for matches
  for (const [key, icon] of Object.entries(iconMap)) {
    if (categoryLower.includes(key)) {
      return icon;
    }
  }

  return '📚'; // Default icon
}

/**
 * Determine prerequisites based on topic relationships
 * This is a placeholder - in a real system, you'd have explicit prerequisites
 */
export function determinePrerequisites(
  topic: PathwayTopic,
  allTopics: PathwayTopic[]
): string[] {
  // Simple heuristic: if topic name suggests advanced content, mark earlier topics as prerequisites
  const prerequisites: string[] = [];

  const topicLower = topic.title.toLowerCase();
  const isAdvanced = topicLower.includes('advanced') ||
  topicLower.includes('ii') ||
  topicLower.includes('2');

  if (isAdvanced) {
    // Find basic version of this topic
    allTopics.forEach(t => {
      const tLower = t.title.toLowerCase();
      if (
        t.id !== topic.id &&
        (tLower.includes('basic') || tLower.includes('intro') || tLower.includes('i'))
      ) {
        prerequisites.push(t.id);
      }
    });
  }

  return prerequisites;
}

/**
 * Check if topic is locked based on prerequisites
 */
export function isTopicLocked(
  topic: PathwayTopic,
  completedTopicIds: Set<string>
): boolean {
  if (topic.prerequisites.length === 0) return false;

  return !topic.prerequisites.every(prereqId => completedTopicIds.has(prereqId));
}

/**
 * Get next unlocked topic in pathway
 */
export function getNextUnlockedTopic(
  pathway: LearningPathway,
  completedTopicIds: Set<string>
): PathwayTopic | null {
  for (const topic of pathway.topics) {
    if (
      topic.status !== 'mastered' &&
      !isTopicLocked(topic, completedTopicIds)
    ) {
      return topic;
    }
  }

  return null;
}
