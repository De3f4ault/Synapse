# Dashboard Architecture

## Core Philosophy

The Dashboard is an **Integration Layer**, not a domain owner. It acts as a lens through which users view the state of the application.

- **Reads** from domain modules (`flashcards`, `notes`, `documents`).
- **Derives** meaning (metrics, trends, insights).
- **Never Mutates** upstream truth.

## Module Structure

The dashboard is composed of 6 explicit, intent-based modules. Each module owns its UI, state, and logic.

### 1. `core/` (Global Invariants)

- **Role**: Manages cross-cutting concerns that affect the entire dashboard.
- **Responsibilities**: Time Range selection, Auto-refresh coordination, Workspace context.
- **State**: `dashboardStore` (Persisted user preferences).

### 2. `metrics/` (KPIs)

- **Role**: Displays high-level statistics.
- **Pattern**: Stateless components receiving data via props or hooks.
- **State**: None (unless interactive UI logic is required).

### 3. `charts/` (Visualizations)

- **Role**: Visualizes trends and data distributions.
- **Responsibilities**: Rendering charts, handling zoom/pan/selection interactions.
- **State**: `chartsStore` (UI-only state: zoom level, active selection). **Never caches data.**

### 4. `activity/` (Temporal Feed)

- **Role**: Shows recent actions and sessions.
- **Responsibilities**: Session tracking (WebSocket), Activity feed, Heatmaps.
- **State**: `activityStore` (Feed filters, session status).

### 5. `insights/` (Intelligence)

- **Role**: Analyzes data to provide actionable advice.
- **Pattern**: **Functional Core, Imperative Shell**.
  - **Engine** (`insights/engine/`): Pure functions that compute insights from raw data.
  - **Store** (`insights/state/`): Caches the computation results.
  - **Hooks** (`insights/hooks/`): Orchestrates data fetching -> computation -> caching.

### 6. `assistant/` (Subsystem)

- **Role**: Provides AI-driven interaction.
- **Responsibilities**: Chat interface, context-aware suggestions.
- **State**: `assistantStore` (Chat history, session management).

## Data Flow

1. **Modules Fetch Data**: Each module's hooks (e.g., `useChartsData`) fetch raw data from the API (React Query).
2. **Engines Compute**: Raw data is passed to pure engine functions (e.g., `calculateTrend`).
3. **Stores Cache (Optional)**: If expensive, results are cached in a module-scoped Zustand store.
4. **Components Render**: Components read from Stores or Hooks. `DashboardPage` simply composes these components.

## Rules

1. **No Deep Imports**: Modules must export everything through their top-level `index.ts`.
2. **No Logic in Page**: `DashboardPage.tsx` must remove purely declarative composition.
3. **Stores != Authority**: Stores hold UI state or cached derivations. They are never the source of truth for domain data.
