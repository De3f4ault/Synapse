#!/bin/bash
# Script to create the src/pages/dashboard/ folder structure with empty files

BASE_DIR="src/pages/dashboard"

# List of files to create (relative to BASE_DIR)
files=(
  "DashboardPage.tsx"

  "components/header/DashboardHeader.tsx"
  "components/header/QuickActions.tsx"

  "components/main-area/DashboardContainer.tsx"
  "components/main-area/IntelligencePanel.tsx"
  "components/main-area/KnowledgeGraph.tsx"
  "components/main-area/FocusQueue.tsx"

  "components/intelligence/ContextCard.tsx"
  "components/intelligence/WeakAreaCard.tsx"
  "components/intelligence/NextActionCard.tsx"
  "components/intelligence/MilestoneCard.tsx"

  "components/graph/GraphCanvas.tsx"
  "components/graph/GraphNode.tsx"
  "components/graph/GraphControls.tsx"
  "components/graph/NodeDetailModal.tsx"

  "components/queue/QueueItem.tsx"
  "components/queue/QueueSection.tsx"
  "components/queue/QueueEmpty.tsx"

  "components/activity/ActivityHeatmap.tsx"
  "components/activity/ActivitySparkline.tsx"
  "components/activity/ActivityFeed.tsx"

  "components/shared/StatCard.tsx"
  "components/shared/ModuleBadge.tsx"
  "components/shared/PriorityBadge.tsx"
  "components/shared/LoadingState.tsx"

  "hooks/useDashboardData.ts"
  "hooks/useIntelligence.ts"
  "hooks/useKnowledgeGraph.ts"
  "hooks/useFocusQueue.ts"
  "hooks/useActivityData.ts"
  "hooks/useSessionTracking.ts"
  "hooks/useRealtimeSync.ts"

  "utils/graphTransformers.ts"
  "utils/priorityCalculator.ts"
  "utils/sessionDetector.ts"
  "utils/insightGenerator.ts"
  "utils/dateFormatters.ts"

  "types/dashboard.types.ts"
  "types/graph.types.ts"
  "types/intelligence.types.ts"
  "types/queue.types.ts"

  "constants/graphConfig.ts"
  "constants/priorityWeights.ts"
  "constants/colors.ts"

  "styles/dashboard.css"
  "styles/graph.css"
  "styles/animations.css"
)

# Create directories and files
for file in "${files[@]}"; do
  dir=$(dirname "$BASE_DIR/$file")
  mkdir -p "$dir"
  touch "$BASE_DIR/$file"
done

echo "Dashboard folder structure created successfully!"
