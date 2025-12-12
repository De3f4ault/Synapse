# Dashboard - Learning Command Center

The dashboard is the central hub for all learning activities.

## Structure
```
dashboard/
├── components/
│   ├── hero/          # Above-the-fold content (welcome, next action)
│   ├── overview/      # Key metrics and stats
│   ├── priority/      # Focus queue (what to study today)
│   ├── intelligence/  # AI insights and recommendations
│   ├── analytics/     # Performance charts and trends
│   ├── pathways/      # Learning progress visualization
│   ├── activity/      # Recent activity feed
│   └── shared/        # Reusable components
├── hooks/
│   ├── useDashboardData.ts    # Data fetching (REST)
│   ├── useDashboardSync.ts    # Real-time updates (WebSocket)
│   ├── useSessionTracking.ts  # Activity tracking
│   └── useLearningPath.ts     # Generate learning paths
├── types/
│   ├── dashboard.types.ts
│   ├── pathway.types.ts
│   └── intelligence.types.ts
└── utils/
    ├── priorityCalculator.ts
    ├── pathwayGenerator.ts
    └── insightGenerator.ts
```

## Data Flow

1. **REST API** (initial load + periodic refresh)
   - Overview stats
   - Performance trends
   - Activity heatmap
   - Mastery scores

2. **WebSocket** (real-time updates)
   - Card reviewed
   - Note created/updated
   - Quiz completed
   - Study session active

3. **Local Computation**
   - Priority calculation
   - Learning path generation
   - Insight generation

## Key Principles

- **Action-oriented**: Every element should guide the user
- **Real-time where it matters**: Live updates for active sessions
- **Performance first**: Heavy data via REST, light updates via WebSocket
- **Mobile-friendly**: Responsive design, touch-friendly interactions
