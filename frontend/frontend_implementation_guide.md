# Frontend Implementation Guide
**Synapse Learning Platform - Complete UI/UX Enhancement Plan**

> **Purpose**: This document serves as the single source of truth for enhancing the Synapse frontend from its current minimal state to a polished, production-ready application. It is declarative, not prescriptive - outlining **WHAT** needs to be achieved and **WHY**, not providing complete code implementations.

---

## Table of Contents

1. [Overview & Philosophy](#overview--philosophy)
2. [Design System Enhancements](#design-system-enhancements)
3. [Component Architecture Strategy](#component-architecture-strategy)
4. [Animation & Motion Strategy](#animation--motion-strategy)
5. [State Management Improvements](#state-management-improvements)
6. [Error Handling Architecture](#error-handling-architecture)
7. [Loading States & Feedback](#loading-states--feedback)
8. [Form Management System](#form-management-system)
9. [Module-by-Module Enhancement Plan](#module-by-module-enhancement-plan)
10. [Performance Optimization Strategy](#performance-optimization-strategy)
11. [Accessibility Requirements](#accessibility-requirements)
12. [Implementation Roadmap](#implementation-roadmap)

---

## Overview & Philosophy

### Current State
- ✅ **Solid foundation**: React 18 + TypeScript + Vite + TanStack Query + Zustand
- ✅ **Type-safe API layer**: Auto-generated from OpenAPI spec
- ✅ **Modern UI library**: shadcn/ui components available
- ⚠️ **Minimal utilization**: Framer Motion, Sonner toasts, form validation underused
- ⚠️ **Basic error handling**: No comprehensive error boundaries
- ⚠️ **Simple loading states**: No skeleton loaders or progressive loading
- ⚠️ **Limited animations**: Few micro-interactions or transitions

### Target State
- 🎯 **Polished & Professional**: Smooth animations, delightful micro-interactions
- 🎯 **Resilient**: Comprehensive error boundaries, graceful degradation
- 🎯 **Informative**: Skeleton loaders, progress indicators, clear feedback
- 🎯 **Accessible**: WCAG 2.1 AA compliant, keyboard navigation, screen reader support
- 🎯 **Performant**: Code splitting, lazy loading, optimized re-renders
- 🎯 **Maintainable**: Clear patterns, reusable abstractions, well-documented

### Design Principles
1. **Progressive Enhancement**: Start with functional, enhance with delight
2. **User Feedback**: Always inform users of system state (loading, error, success)
3. **Consistency**: Reusable patterns across all modules
4. **Performance First**: Smooth 60fps animations, fast initial load
5. **Accessibility by Default**: Not an afterthought, built-in from start

---

## Design System Enhancements

### Color System Extension

**Goal**: Extend the existing Zinc-based theme with semantic and learning-specific colors.

**Current State**: 
- Basic Zinc palette (background, foreground, card, muted, border)
- Primary, secondary, destructive variants
- Light/dark mode support via CSS variables

**Enhancements Needed**:

1. **Add Semantic Status Colors** to `src/styles/globals.css`:
   - Success (green-600/green-50)
   - Warning (amber-500/amber-50)
   - Info (blue-500/blue-50)
   - Error (already have destructive)

2. **Add Learning-Specific Colors**:
   - Mastery (green) - for mastered flashcards
   - Learning (blue) - for cards in learning phase
   - New (purple) - for new/unseen cards
   - Review (amber) - for cards due for review

3. **Add Difficulty Colors**:
   - Easy (green)
   - Medium (amber)
   - Hard (red)

4. **Add Gradient Definitions** for visual polish:
   - Success gradient
   - Warning gradient
   - Info gradient

**Files to Modify**:
- `src/styles/globals.css` - Add CSS variables
- `tailwind.config.ts` - Extend color definitions

**Why**: Semantic colors improve information hierarchy and make UI states immediately recognizable.

---

### Typography System

**Goal**: Improve readability and hierarchy with refined typography scale.

**Current State**: 
- Inter font family
- JetBrains Mono for code
- Basic Tailwind font sizes

**Enhancements Needed**:

1. **Refine Font Scale** with proper line-heights and letter-spacing:
   - Negative letter-spacing for larger text (better readability)
   - Tighter line-height for headings
   - Comfortable line-height for body text

2. **Add Typography Utilities**:
   - `.text-balance` for headings (CSS text-wrap: balance)
   - `.text-pretty` for body text (CSS text-wrap: pretty)

**Files to Modify**:
- `tailwind.config.ts` - Extend fontSize with line-height and letter-spacing

**Why**: Good typography is invisible but improves readability by 40%.

---

### Spacing & Layout System

**Goal**: Create consistent, responsive layouts across all modules.

**Enhancements Needed**:

1. **Add Grid Template Utilities**:
   - `grid-dashboard` - responsive dashboard grid (auto-fit, minmax(280px, 1fr))
   - `grid-cards` - responsive card grid (auto-fill, minmax(320px, 1fr))
   - `grid-sidebar` - sidebar + content (280px 1fr / 80px 1fr collapsed)

2. **Add Container Queries Support**:
   - Install `@tailwindcss/container-queries` plugin
   - Use for responsive components that adapt to parent width, not viewport

**Files to Modify**:
- `tailwind.config.ts` - Add grid templates
- `package.json` - Add container queries plugin

**Why**: Container queries allow components to be truly modular and reusable in any context.

---

### Animation Utilities

**Goal**: Standardize animation timing and easing functions.

**Enhancements Needed**:

1. **Add Custom Animations** to Tailwind:
   - `animate-shimmer` - for skeleton loaders
   - `animate-slide-in-left/right/up/down` - for panel transitions
   - `animate-scale-in` - for modal/dialog entry
   - `animate-bounce-subtle` - less aggressive bounce for notifications

2. **Add Custom Keyframes**:
   - Shimmer effect (background-position animation)
   - Slide animations (transform translateX/Y)
   - Scale animation (scale 0.9 → 1)

**Files to Modify**:
- `tailwind.config.ts` - Add keyframes and animations
- `src/styles/globals.css` - Add @keyframes definitions

**Why**: Consistent animation timing creates a cohesive feel across the app.

---

## Component Architecture Strategy

### Component Hierarchy

```
src/components/
├── ui/                         # shadcn/ui primitives (DO NOT MODIFY)
│   └── [20+ existing components]
│
├── common/                     # Shared application components
│   ├── [ENHANCE] ErrorBoundary.tsx
│   ├── [ENHANCE] EmptyState.tsx
│   ├── [REPLACE] LoadingSpinner.tsx
│   ├── [KEEP] ConfirmDialog.tsx
│   │
│   └── [NEW COMPONENTS]
│       ├── SkeletonCard.tsx
│       ├── SkeletonList.tsx
│       ├── SkeletonTable.tsx
│       ├── ErrorState.tsx
│       ├── RetryBoundary.tsx
│       ├── ProgressIndicator.tsx
│       ├── StatusBadge.tsx
│       ├── AnimatedCounter.tsx
│       ├── GradientCard.tsx
│       ├── StatCard.tsx
│       └── AnimatedList.tsx
│
├── layout/                     # Layout components
│   ├── [ENHANCE] AppShell.tsx
│   ├── [ENHANCE] Header.tsx
│   ├── [ENHANCE] Sidebar.tsx
│   ├── [ENHANCE] Breadcrumbs.tsx
│   │
│   └── [NEW COMPONENTS]
│       ├── MobileNav.tsx
│       ├── UserMenu.tsx
│       ├── NotificationCenter.tsx
│       └── SearchCommand.tsx
│
└── feedback/                   # [NEW FOLDER] User feedback components
    ├── Toast.tsx
    ├── Alert.tsx
    ├── ConfirmationModal.tsx
    └── FeedbackButton.tsx
```

### Component Creation Strategy

#### 1. Error Boundary System

**Component**: `ErrorBoundary.tsx`

**Purpose**: Catch JavaScript errors anywhere in component tree, display fallback UI.

**Requirements**:
- Three levels: `page`, `module`, `component`
- Different fallback UIs for each level
- Reset functionality with dependency tracking
- Optional error logging callback
- Integration point for error tracking (Sentry placeholder)

**Fallback UIs**:
- **Page**: Full-screen centered card with icon, message, "Try Again" + "Go Home" buttons
- **Module**: Section card with icon, message, "Retry" button
- **Component**: Inline error with minimal styling, "Retry" button

**Props Interface**:
```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
  level?: 'page' | 'module' | 'component';
}
```

**Usage Pattern**:
- Wrap each page route in router
- Wrap each major module section
- Optionally wrap individual complex components

---

#### 2. Skeleton Loader System

**Components**: `SkeletonCard.tsx`, `SkeletonList.tsx`, `SkeletonTable.tsx`

**Purpose**: Show placeholder content while data is loading, reducing perceived load time.

**Requirements**:
- Match structure of actual content (same dimensions, layout)
- Shimmer animation (horizontal wave effect)
- Multiple variants for different use cases
- Composable (can be used in grids, lists, etc.)

**SkeletonCard Variants**:
- `default` - Title + subtitle
- `compact` - Title only, reduced padding
- `detailed` - Title + subtitle + 3 lines of content
- Optional image placeholder
- Optional action buttons placeholder

**SkeletonList Features**:
- Configurable row count
- Optional avatar circles
- Two-line content (title + subtitle)
- Right-aligned status indicator

**SkeletonTable Features**:
- Header row with column placeholders
- Configurable number of rows and columns
- Alternating row backgrounds (zebra striping)

**Animation**: 
- Use `animate-shimmer` class
- Gradient moves left to right
- 2-second duration, infinite loop

---

#### 3. Status Badge Component

**Component**: `StatusBadge.tsx`

**Purpose**: Consistent visual representation of status across the app.

**Requirements**:
- Support all status types:
  - Generic: success, error, warning, info
  - Processing: pending, processing, completed, failed
  - Learning: new, learning, review, mastered
- Size variants: `sm`, `md`, `lg`
- Optional icon (auto-selected based on status)
- Optional pulse animation for active states
- Color-coded backgrounds and text

**Status → Color Mapping**:
- success/completed/mastered → green
- error/failed → red
- warning/review → amber
- info/learning → blue
- pending/processing → gray (animated pulse)
- new → purple

---

#### 4. Stat Card Component

**Component**: `StatCard.tsx`

**Purpose**: Dashboard statistics cards with animations and interactivity.

**Requirements**:
- Display: title, value, icon, optional trend
- Animated number counting (0 → final value on mount)
- Trend indicators (↑/↓ with percentage and label)
- Color-coded icons and accents
- Hover effects (scale + shadow)
- Optional click action
- Loading state (shows skeleton)
- Optional quick action button

**Animation Details**:
- Number counts up using Framer Motion `useMotionValue` + `useTransform`
- Icon subtle pulse when value changes
- Hover: scale(1.02) + elevated shadow
- Trend arrow fades in after number finishes counting

---

#### 5. Animated Counter Component

**Component**: `AnimatedCounter.tsx`

**Purpose**: Reusable number animation for use in StatCard and elsewhere.

**Requirements**:
- Smooth counting animation from 0 to target value
- Support decimals (configurable precision)
- Support prefix/suffix (e.g., "$", "%", "min")
- Easing function (ease-out)
- Configurable duration (default 1s)

**Implementation Hint**: Use `useMotionValue`, `useTransform`, and `animate` from Framer Motion.

---

#### 6. Progress Indicator Component

**Component**: `ProgressIndicator.tsx`

**Purpose**: Show progress for multi-step processes, file uploads, review sessions.

**Requirements**:
- Two variants: `linear` (bar) and `circular` (ring)
- Value from 0-100
- Optional label (percentage, time remaining, steps)
- Color variants (primary, success, warning)
- Animated progress (smooth transition, not instant)
- Size variants for circular: `sm`, `md`, `lg`

**Linear Progress**:
- Full-width bar
- Animated width change
- Optional label above or overlay

**Circular Progress**:
- SVG circle with stroke-dasharray animation
- Optional center content (percentage, icon)
- Optional label below

---

#### 7. Search Command Palette

**Component**: `SearchCommand.tsx`

**Purpose**: Global search accessible via ⌘K / Ctrl+K.

**Requirements**:
- Keyboard shortcut listener (⌘K / Ctrl+K)
- Dialog/modal overlay
- Search input with focus trap
- Debounced search (300ms)
- Result categories: Decks, Notes, Documents, Quick Actions
- Keyboard navigation (↑↓ arrows, Enter to select, Esc to close)
- Recent searches (stored in localStorage)
- Fuzzy search across all content
- Icon for each result type
- Highlight matching text in results

**Implementation Notes**:
- Use Dialog primitive from shadcn/ui
- Custom search logic or integrate simple fuzzy search library
- Virtual scrolling for large result sets (optional)

---

#### 8. Notification Center

**Component**: `NotificationCenter.tsx`

**Purpose**: Display system notifications, alerts, and activity updates.

**Requirements**:
- Dropdown panel from header (bell icon)
- Unread count badge
- Notification types: info, success, warning, error
- Group by date (Today, Yesterday, This Week, Older)
- Mark as read/unread
- Clear individual or all notifications
- Optional action button per notification
- Empty state illustration
- Real-time updates via WebSocket (when available)

**Data Source**: 
- `notificationStore` (Zustand store to be created)
- Persisted in localStorage
- Limit to last 50 notifications

---

#### 9. User Menu

**Component**: `UserMenu.tsx`

**Purpose**: User account menu with profile, settings, logout.

**Requirements**:
- Dropdown from header (avatar/initials)
- User name + email at top
- Menu items:
  - Profile Settings
  - Preferences (opens modal)
  - Theme Toggle (light/dark)
  - Keyboard Shortcuts (opens modal)
  - Help & Support
  - Logout
- Icons for each item
- Dividers between groups
- Keyboard navigation
- Active item highlight

---

#### 10. Mobile Navigation

**Component**: `MobileNav.tsx`

**Purpose**: Responsive navigation for mobile/tablet.

**Requirements**:
- Sheet component (slide-in drawer) from shadcn/ui
- Trigger: hamburger button in header (only visible on mobile)
- Full-height overlay
- Same navigation items as desktop sidebar
- Active route highlighting
- Icon + text labels
- Gesture support: swipe right to close
- Backdrop blur effect

---

#### 11. Empty State Component

**Component**: `EmptyState.tsx` (enhance existing)

**Purpose**: Show helpful message when no data exists.

**Requirements**:
- Icon/illustration
- Heading
- Description text
- Optional primary action button (e.g., "Create First Deck")
- Optional secondary action (e.g., "Learn More")
- Different variants for different contexts:
  - No decks
  - No cards in deck
  - No search results
  - No notifications
  - No notes

**Visual Style**:
- Centered vertically and horizontally
- Muted colors (not alarming)
- Encouraging tone in copy
- Animated icon (subtle float or pulse)

---

#### 12. Retry Boundary Component

**Component**: `RetryBoundary.tsx`

**Purpose**: Wrapper for network requests with automatic retry logic.

**Requirements**:
- Wraps async operations (queries, mutations)
- Automatic retry with exponential backoff
- Max retry attempts (default 3)
- Manual retry button
- Show retry attempts remaining
- Error message display
- Loading state during retry

**Use Case**: Wrap sections that fetch critical data and may fail due to network issues.

---

## Animation & Motion Strategy

### Philosophy
- **Purposeful, not decorative**: Animations should guide attention and provide feedback
- **Performant**: Use transform and opacity (GPU-accelerated), avoid layout properties
- **Interruptible**: Animations should be cancellable (don't block user)
- **Accessible**: Respect `prefers-reduced-motion`

### Animation Categories

#### 1. Page Transitions

**Goal**: Smooth transitions between routes to maintain continuity.

**Implementation**:
- Create `PageTransition.tsx` wrapper component
- Use Framer Motion's `motion.div` with variants:
  - `initial`: { opacity: 0, y: 20 }
  - `animate`: { opacity: 1, y: 0 }
  - `exit`: { opacity: 0, y: -20 }
- Duration: 300ms, easing: easeInOut
- Wrap each page component in router.tsx

**Why**: Reduces jarring jumps between pages, maintains spatial awareness.

---

#### 2. Flashcard Flip Animation

**Component**: `CardFlip.tsx` (enhance existing in ReviewSession)

**Goal**: 3D card flip effect for flashcards.

**Requirements**:
- 3D perspective (1000px)
- Transform style: preserve-3d
- Front and back sides (backface-visibility: hidden)
- Flip animation: rotateY from 0° to 180°
- Duration: 600ms, easing: easeInOut
- Trigger: click, tap, or spacebar
- Show flip hint icon on front

**Enhancements**:
- Add depth with box-shadow during flip
- Slight scale up on hover (1.05)
- Keyboard shortcut indicator (Space bar)

---

#### 3. Swipeable Cards (Review)

**Component**: `SwipeGesture.tsx` (enhance existing in ReviewSession)

**Goal**: Swipe cards left (Again) or right (Easy) with visual feedback.

**Requirements**:
- Draggable horizontally (Framer Motion drag)
- Rotation proportional to drag distance
- Color overlay based on direction:
  - Left: red gradient (Again)
  - Right: green gradient (Easy)
- Button highlights sync with drag direction
- Haptic feedback on mobile (if available)
- Confidence threshold: swipe distance + velocity
- Exit animation: card flies off in swipe direction
- Next card slides in from bottom

**Thresholds**:
- Minimum swipe distance: 100px
- Velocity boost: if velocity > 500, reduce distance requirement

---

#### 4. List Stagger Animation

**Component**: `AnimatedList.tsx`

**Goal**: Stagger-in animation for lists of items (cards, notes, search results).

**Requirements**:
- Container with `staggerChildren` transition
- Each child fades in + slides up
- Stagger delay: 50-100ms per child
- Works with any children (generic wrapper)

**Usage**: Wrap lists in all modules (decks, notes, documents, search results).

**Why**: Creates sense of content "loading in" naturally, not all at once.

---

#### 5. Layout Animations (Shared Elements)

**Goal**: Smooth morphing of elements when they change position/parent.

**Requirements**:
- Use `layoutId` prop on motion elements
- Wrap in `<AnimatePresence mode="popLayout">`
- Shared elements automatically animate between positions

**Use Cases**:
- Deck card in list → Deck detail page (shared card)
- Search result → Full note view
- Dashboard stat → Analytics chart

**Why**: Provides visual continuity and sense of "zooming into" content.

---

#### 6. Micro-Interactions

**Goal**: Add delight and feedback to common interactions.

**Button Interactions**:
- Hover: scale(1.05)
- Tap: scale(0.95)
- Transition: spring (stiffness: 400, damping: 17)

**Icon Animations**:
- Loader: continuous rotation (linear, infinite)
- Notification bell: bounce animation when new notification
- Status indicators: pulse animation for active states
- Chevrons: rotate 180° when expanded/collapsed

**Input Focus**:
- Ring animation on focus (expand from center)
- Label color change
- Prefix icon color change

**Toast Notifications** (using Sonner):
- Entry: slide in from top + fade in + scale from 0.3
- Exit: fade out + scale to 0.5
- Position: top-right
- Auto-dismiss: 5s (error: 7s)

---

#### 7. Chart Animations

**Goal**: Animate chart data changes for visual engagement.

**Requirements**:
- Use Recharts' built-in animation props
- Line charts: draw line from left to right (duration: 1000ms)
- Bar charts: grow from bottom (duration: 800ms, stagger: 100ms)
- Pie charts: expand from center (duration: 600ms)
- Tooltip: fade in on hover

**Wrapper**: 
- Wrap charts in `motion.div` for entry animation
- Initial: { opacity: 0, scale: 0.9 }
- Animate: { opacity: 1, scale: 1 }
- Duration: 500ms

---

#### 8. Modal/Dialog Animations

**Goal**: Smooth entry/exit for modal dialogs.

**Requirements**:
- Backdrop: fade in/out (opacity 0 → 0.5)
- Content: scale from center (scale 0.95 → 1) + fade
- Duration: 200ms entry, 150ms exit
- Easing: easeOut

**Implementation**: Already handled by shadcn/ui Dialog, ensure AnimatePresence wrapper.

---

#### 9. Skeleton to Content Transition

**Goal**: Smooth transition from skeleton loader to real content.

**Requirements**:
- Skeleton fades out (opacity 1 → 0, duration: 200ms)
- Content fades in + slides up (opacity 0 → 1, y: 10 → 0, duration: 300ms)
- Slight delay (100ms) between skeleton exit and content entry

**Implementation**: Use conditional rendering with AnimatePresence.

---

## State Management Improvements

### TanStack Query Enhancements

#### 1. Query Key Factory

**Goal**: Centralized, type-safe query key management.

**Why**: 
- Prevents typos in query keys
- Makes invalidation easier
- Provides IntelliSense autocomplete
- Single source of truth for all keys

**File**: `src/lib/queryKeys.ts` (NEW)

**Structure**:
```
queryKeys
├── auth { all, user }
├── flashcards { all, lists, list(filters), details, detail(id), due }
├── decks { all, lists, list(filters), details, detail(id), cards(deckId) }
├── notes { all, lists, list(filters), details, detail(id), tree, search(query), versions(noteId) }
├── documents { all, lists, list(filters), details, detail(id), chunks(docId), status(docId) }
├── chat { all, sessions, session(id), messages(sessionId) }
├── quizzes { all, lists, list(filters), details, detail(id), attempt(attemptId) }
├── analytics { all, overview, weakAreas, performance(days), heatmap(days), topics }
├── study { all, due, recommendations, sessions, session(id) }
└── search { all, results(query, filters), suggestions(query) }
```

**Migration**: Update all existing query hooks to use factory keys.

---

#### 2. Query Configuration Strategy

**Goal**: Optimize query behavior based on data characteristics.

**Categories**:

1. **Real-time Data** (staleTime: 0, refetchInterval: 60s)
   - Due cards
   - Analytics overview
   - Notification count

2. **Static Data** (staleTime: 10 minutes)
   - Deck details
   - User profile
   - Note content

3. **Frequently Changing** (staleTime: 30s, refetchOnMount: always)
   - Dashboard stats
   - Recent activity
   - Study session progress

4. **Infinite Scroll** (use `useInfiniteQuery`)
   - Note lists
   - Document lists
   - Search results (if very large)

**File**: `src/App.tsx` (UPDATE QueryClient config)

**Global Defaults**:
- retry: Smart retry (don't retry 4xx, retry 5xx up to 2 times)
- refetchOnWindowFocus: false
- refetchOnReconnect: true
- staleTime: 5 minutes
- gcTime: 10 minutes

---

#### 3. Optimistic Updates

**Goal**: Instant UI feedback before server confirms action.

**Where to Apply**:
- Review flashcard (remove from due list immediately)
- Create/edit/delete notes (update list immediately)
- Toggle favorite/archive (visual change immediately)
- Increment counters (like, upvote, etc.)

**Pattern**:
1. `onMutate`: Cancel outgoing queries, snapshot current data, update cache optimistically
2. `onError`: Rollback to snapshot, show error toast
3. `onSettled`: Invalidate queries to refetch latest data

**Files**: Update all mutation hooks in `src/api/hooks/`

---

#### 4. Prefetching Strategy

**Goal**: Load data before user needs it for instant transitions.

**Scenarios**:
- Hover over deck card → Prefetch deck cards
- Hover over note in list → Prefetch note content and versions
- Navigate to review page → Prefetch due cards
- Open chat → Prefetch recent sessions

**File**: `src/api/hooks/usePrefetch.ts` (NEW)

**Implementation**: Export prefetch functions that call `queryClient.prefetchQuery`.

**Usage**: Attach to `onMouseEnter` on links/cards.

---

### Zustand Store Enhancements

#### 1. Notification Store

**Goal**: Centralized notification management.

**File**: `src/stores/notificationStore.ts` (NEW)

**State**:
- notifications: Notification[] (id, type, title, message, timestamp, read, action)
- unreadCount: number

**Actions**:
- addNotification
- markAsRead(id)
- markAllAsRead
- removeNotification(id)
- clearAll

**Persistence**: Yes (localStorage, key: 'synapse-notifications')

**Integration**: 
- WebSocket handlers call addNotification
- NotificationCenter component reads from store

---

#### 2. Preferences Store

**Goal**: User preferences for UI customization.

**File**: `src/stores/preferencesStore.ts` (NEW)

**State**:
- Display: compactMode, showAnimations, fontSize
- Review: autoFlipCards, autoAdvanceOnReview, reviewSoundEffects
- Notifications: desktopNotifications, reviewReminders
- Editor: theme, fontSize, lineNumbers
- Study: dailyGoal, preferredStudyTime

**Actions**:
- updatePreferences(partial)
- resetPreferences

**Persistence**: Yes (localStorage, key: 'synapse-preferences')

**Usage**: Settings modal reads/writes, components read to adjust behavior.

---

#### 3. Enhanced UI Store

**Goal**: Extend current UI store with more transient state.

**File**: `src/stores/uiStore.ts` (ENHANCE)

**New State**:
- commandPaletteOpen: boolean
- globalLoading: boolean
- loadingMessage: string | null
- breadcrumbs: Array<{ label, href? }>

**New Actions**:
- setCommandPaletteOpen(open)
- setGlobalLoading(loading, message?)
- setBreadcrumbs(breadcrumbs)

**Why**: Centralize all UI state for consistency.

---

## Error Handling Architecture

### Error Boundary Hierarchy

**Goal**: Catch errors at appropriate levels without crashing entire app.

**Hierarchy**:
```
1. Root Error Boundary (App.tsx)
   └─ Catches catastrophic errors, shows "Something went wrong" page

2. Route Error Boundaries (router.tsx)
   └─ Wraps each route, shows route-specific error

3. Module Error Boundaries (each module index)
   └─ Wraps major sections, shows section-specific error

4. Component Error Boundaries (optional, for complex components)
   └─ Wraps individual components, shows inline error
```

**Implementation**:
- Level 1: Wrap `<Router />` in `<ErrorBoundary level="page">`
- Level 2: Wrap `<Outlet />` in route elements with `<ErrorBoundary level="module">`
- Level 3: Wrap module content in `<ErrorBoundary level="module">`
- Level 4: Wrap complex components in `<ErrorBoundary level="component">`

**Reset Strategy**:
- Pass `resetKeys` to ErrorBoundary to auto-reset when keys change
- Example: `resetKeys={[userId, deckId]}` resets when user/deck changes

---

### Query Error Handling

**Goal**: Show user-friendly error messages for failed API calls.

**Strategy**:

1. **Global Error Handler** (in QueryClient config):
   - Log all mutation errors
   - Optionally send to error tracking service

2. **Per-Query Error Hook** (`useQueryError`):
   - Automatically shows toast for query errors
   - Handles specific error codes (401 → redirect to login)
   - Allows custom error messages

**File**: `src/hooks/useQueryError.ts` (NEW)

**Usage**:
```typescript
const { data, error } = useQuery({...});
useQueryError(error, { title: 'Failed to load decks' });
```

**Special Cases**:
- 401 Unauthorized: Show "Session expired" toast with "Login" button
- 403 Forbidden: Show "Access denied" message
- 404 Not Found: Show "Not found" message (may not need toast if showing empty state)
- 5xx Server Error: Show "Server error" message with "Retry" button

---

### Network Error Detection

**Goal**: Detect and handle network connectivity issues.

**Strategy**:
- Listen to `online`/`offline` events
- Show banner at top when offline
- Retry failed queries when back online
- Disable mutations when offline

**File**: `src/hooks/useNetworkStatus.ts` (NEW)

**Implementation**: 
- Use `navigator.onLine` and event listeners
- Store status in state
- Show `<Alert>` banner when offline

---

## Loading States & Feedback

### Skeleton Loader Strategy

**Goal**: Show content placeholders while loading to reduce perceived latency.

**Where to Apply**:
- Dashboard cards (use SkeletonCard)
- Deck lists (use SkeletonCard in grid)
- Note lists (use SkeletonList)
- Document tables (use SkeletonTable)
- Search results (use SkeletonList)
- Chat messages (custom skeleton)
- Analytics charts (skeleton bars/lines)

**Pattern**:
```typescript
if (isLoading) return <SkeletonCard count={4} />;
if (error) return <ErrorState error={error} />;
return <ActualContent data={data} />;
```

**Design**: Match skeleton dimensions exactly to actual content to prevent layout shift.

---

### Progress Indicators

**Goal**: Show progress for long-running operations.

**Where to Apply**:
- File uploads (linear progress bar)
- Document processing (circular progress with percentage)
- Flashcard review session (linear progress showing cards remaining)
- Quiz taking (stepped progress indicator)
- Multi-step forms (stepped progress)

**Component**: `ProgressIndicator.tsx`

**Variants**:
1. **Linear**: Full-width bar, animated width, optional label
2. **Circular**: SVG circle, stroke-dasharray animation, center content
3. **Stepped**: Multi-step process, numbered steps, connecting lines

---

### Toast Notifications

**Goal**: Provide immediate feedback for user actions.

**When to Show**:
- Success: "Deck created", "Note saved", "Card reviewed"
- Error: "Failed to save", "Network error"
- Warning: "Unsaved changes", "Session expiring"
- Info: "Export ready", "Reminder set"

**Strategy**:
- Use Sonner library (already installed)
- Create wrapper utilities for common patterns
- Position: top-right (desktop), top-center (mobile)
- Auto-dismiss: 5s (error: 7s, success: 3s)
- Max visible: 3 toasts

**File**: `src/components/feedback/Toast.tsx` (NEW - wrapper utilities)

**Utilities**:
```typescript
toast.success(title, { description })
toast.error(title, { description, action: { label, onClick } })
toast.loading(title) // Returns ID for later update
toast.promise(promise, { loading, success, error })
```

---

### Loading Overlays

**Goal**: Show loading state for critical blocking operations.

**When to Use**:
- Initial app load (auth check)
- Critical data fetch before render
- Blocking mutations (payment, deletion)

**Component**: Use existing `LoadingSpinner.tsx` or enhance with:
- Full-screen overlay with backdrop
- Centered spinner + optional message
- Optional progress percentage

**Store**: Use `globalLoading` state in `uiStore`

---

## Form Management System

### React Hook Form Integration

**Goal**: Robust form handling with validation, error messages, and type safety.

**Current State**: 
- react-hook-form installed
- @hookform/resolvers installed
- Zod installed
- Not fully integrated

**Strategy**:

#### 1. Create Form Schemas with Zod

**File Pattern**: `src/modules/[module]/schemas/[entity]Schema.ts`

**Example**: `src/modules/flashcards/schemas/deckSchema.ts`

**Schema Structure**:
- Define Zod schema for create/update operations
- Export TypeScript type inferred from schema
- Export resolver for react-hook-form

**Common Validations**:
- Required fields
- String length limits (min/max)
- Email format
- Number ranges
- Custom validation (e.g., unique deck name)

---

#### 2. Enhance Form Components

**Goal**: Create reusable form field components with built-in error handling.

**Components Needed**:
- `FormField.tsx` - Wrapper with label, input, error message
- `FormTextarea.tsx` - Textarea with label, error
- `FormSelect.tsx` - Select dropdown with label, error
- `FormCheckbox.tsx` - Checkbox with label
- `FormRadioGroup.tsx` - Radio buttons with label

**Features**:
- Automatic error display from react-hook-form
- Accessible labels (htmlFor attribute)
- Error styling (red border, error icon)
- Help text support
- Required indicator (asterisk)

**Location**: `src/components/forms/` (NEW folder)

---

#### 3. Form Modal Pattern

**Goal**: Consistent pattern for create/edit modals.

**Pattern**:
```typescript
// Modal with form
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Create Deck</DialogTitle>
    </DialogHeader>
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormField name="name" label="Deck Name" {...register('name')} error={errors.name} />
      <FormTextarea name="description" label="Description" {...register('description')} error={errors.description} />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create'}
        </Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>
```

**Enhancements**:
- Auto-focus first input
- Close modal on successful submission
- Show toast notification on success
- Reset form on close
- Disable submit during mutation
- Handle validation errors inline

---

#### 4. Inline Editing Pattern

**Goal**: Edit-in-place for quick updates (e.g., note title, deck name).

**Pattern**:
- Display value normally
- Click to edit (convert to input)
- Save on blur or Enter
- Cancel on Escape
- Show loading indicator during save
- Revert on error

**Use Cases**:
- Note title editing
- Deck name editing
- Tag editing
- Card text editing

---

#### 5. Auto-save Pattern

**Goal**: Save form changes automatically without explicit submit.

**Strategy**:
- Use `watch` from react-hook-form
- Debounce changes (500ms-1s)
- Show "Saving..." indicator
- Show "Saved" confirmation
- Handle errors gracefully (show error, don't lose data)

**Use Cases**:
- Note editor (content auto-saves)
- Preferences/settings
- User profile

**Component**: `AutoSaveIndicator.tsx` - Shows save status

---

## Module-by-Module Enhancement Plan

### 1. Dashboard Module

**Current State**: Basic stat cards, minimal styling

**Enhancements**:

#### StatCard Improvements
- **Animated Counters**: Numbers count up from 0 on mount
- **Trend Indicators**: Show ↑/↓ arrows with percentage change
- **Color Coding**: Use semantic colors (mastery=green, due=amber, new=purple)
- **Hover Effects**: Scale + shadow on hover
- **Click Actions**: Navigate to relevant page on click
- **Loading States**: Show skeleton during load
- **Icon Animations**: Pulse effect when stat updates

#### Quick Actions Section
- **Grid Layout**: 2x2 grid of action cards (Create Deck, Upload Document, New Note, Start Review)
- **Hover Effects**: Lift up, show description
- **Icons**: Large colorful icons
- **Shortcuts**: Show keyboard shortcut hint

#### Recent Activity Feed
- **Timeline Layout**: Vertical timeline with icons
- **Activity Types**: Card reviewed, Note created, Document uploaded, etc.
- **Timestamps**: Relative time (5m ago, 2h ago)
- **Avatars**: Show user avatar for multi-user setups
- **Load More**: Paginated or infinite scroll

#### Learning Insights Card
- **Mini Charts**: Small sparklines showing trends
- **Key Metrics**: Accuracy, Study time, Streak
- **Progress Bars**: Visual progress toward daily goal
- **Link to Analytics**: "View detailed analytics →"

**Files to Modify**:
- `src/pages/dashboard/DashboardPage.tsx`
- `src/components/common/StatCard.tsx` (NEW)
- `src/modules/analytics/components/MiniChart.tsx` (NEW)

---

### 2. Flashcards Module

**Current State**: Basic deck list, simple review session

**Enhancements**:

#### Deck List Page
- **Card Grid**: Responsive grid (grid-cards)
- **Deck Cards**: Show preview (card count, due count, last reviewed)
- **Hover Effects**: Lift up, show actions menu
- **Color Labels**: Color-coded by tag or category
- **Quick Actions**: Review, Edit, Delete (on hover or menu)
- **Empty State**: "Create your first deck" with illustration
- **Skeleton Loading**: Show skeleton cards while loading
- **Search/Filter**: Search by name, filter by tags, sort by various fields

#### Deck Detail Page
- **Header Section**: Deck name, description, stats (total cards, due, mastered %)
- **Edit Inline**: Click name/description to edit
- **Progress Visualization**: Circular progress showing mastery
- **Card List**: Virtualized list of cards (front/back preview)
- **Bulk Actions**: Select multiple, delete, export
- **Add Card Form**: Inline form at top or modal
- **Card States**: Color-coded badges (New, Learning, Review, Mastered)

#### Review Session
- **3D Card Flip**: Enhanced flip animation with depth
- **Swipe Gestures**: Left=Again, Right=Easy with visual feedback
- **Progress Bar**: Show cards remaining (e.g., 15/20)
- **Timer**: Session timer and per-card timer
- **Keyboard Shortcuts**: Space=flip, 1=Again, 3=Good, 5=Easy
- **Quality Buttons**: Show next review time for each quality level
- **Sound Effects**: Optional sound on flip/swipe (if enabled in preferences)
- **Session Summary**: Show stats at end (accuracy, time, cards reviewed)
- **Confetti Animation**: Celebrate session completion

#### Card Editor
- **Split View**: Front and back side-by-side
- **Rich Text**: Support bold, italic, code, math (if needed)
- **Media Upload**: Add images to front/back
- **Preview Mode**: Toggle between edit and preview
- **Auto-save**: Save changes automatically
- **Validation**: Prevent empty cards

**Files to Modify**:
- `src/pages/flashcards/DecksPage.tsx`
- `src/pages/flashcards/DeckDetailPage.tsx`
- `src/pages/flashcards/ReviewPage.tsx`
- `src/modules/flashcards/components/ReviewSession/CardFlip.tsx`
- `src/modules/flashcards/components/ReviewSession/SwipeGesture.tsx`
- `src/modules/flashcards/components/DeckList.tsx`
- `src/modules/flashcards/components/FlashcardEditor.tsx`

---

### 3. Notes Module

**Current State**: Basic note list and editor

**Enhancements**:

#### Note List Page
- **Three-Column Layout**: 
  - Left: Note tree (hierarchical navigation)
  - Center: Note list (filtered by tree selection)
  - Right: Note preview/editor
- **Search Bar**: Fuzzy search with highlighting
- **Note Cards**: Show title, preview (first 2 lines), tags, last edited
- **Drag-and-Drop**: Reorder notes, move between parents
- **Context Menu**: Right-click for actions (edit, delete, duplicate, move)
- **Keyboard Navigation**: ↑↓ to navigate, Enter to open, Cmd+N for new

#### Note Editor (BlockNote)
- **Rich Toolbar**: Formatting options (heading, bold, italic, list, code, etc.)
- **Slash Commands**: Type / to insert blocks
- **Markdown Shortcuts**: Support markdown syntax (e.g., ## for heading)
- **Auto-save**: Save every 2s when idle
- **Save Indicator**: Show "Saving..." / "Saved" status
- **Version History**: Access previous versions from menu
- **Fullscreen Mode**: Toggle distraction-free writing
- **Word Count**: Show character/word count
- **Dark Mode**: Respect theme setting

#### Note Tree
- **Hierarchical Display**: Expandable/collapsible tree
- **Indent Levels**: Visual hierarchy with indentation
- **Icons**: Folder icons for parents, document icons for leaves
- **Drag-and-Drop**: Reorder and re-parent notes
- **Search in Tree**: Filter tree by search term
- **Badges**: Show child count for parent notes

#### Note Preview
- **Markdown Rendering**: Use react-markdown with syntax highlighting
- **Math Support**: Render LaTeX math (remark-math, rehype-katex)
- **Code Blocks**: Syntax highlighting with Prism (rehype-highlight)
- **Table of Contents**: Auto-generated from headings
- **Print/Export**: Export as PDF or Markdown

**Files to Modify**:
- `src/pages/notes/NotesPage.tsx`
- `src/pages/notes/NoteDetailPage.tsx`
- `src/modules/notes/components/NoteEditor.tsx`
- `src/modules/notes/components/NoteTree.tsx`
- `src/modules/notes/components/NoteSearch.tsx`

---

### 4. Documents Module

**Current State**: Basic upload and list

**Enhancements**:

#### Document List Page
- **Card/Table Toggle**: Switch between card grid and table view
- **Upload Area**: Drag-and-drop zone prominent at top
- **Document Cards**: Show filename, type icon, size, processing status
- **Status Badges**: Color-coded (Pending, Processing, Completed, Failed)
- **Progress Indicators**: Show processing progress (e.g., "Chunking... 45%")
- **Quick Actions**: View chunks, Re-process, Delete
- **Filter/Sort**: By type (PDF, DOCX, etc.), status, date
- **Bulk Upload**: Support multiple file selection

#### Document Upload
- **Drag-and-Drop Zone**: Dashed border, highlight on dragover
- **File Picker**: Fallback button to browse files
- **File Validation**: Check size, type before upload
- **Upload Progress**: Progress bar per file
- **Preview**: Show thumbnail or icon
- **Metadata Input**: Optional tags, description
- **Batch Upload**: Queue multiple files

#### Document Detail Page
- **Header**: Filename, size, type, upload date, processing status
- **Chunk Explorer**: List all chunks with preview
- **Chunk Search**: Search within chunks
- **Actions**: Download, Re-process, Generate flashcards, Delete
- **Processing Log**: Show processing steps and errors (if failed)
- **Gemini Integration Status**: Show if uploaded to Gemini, expiration date

#### Chunk Explorer
- **List View**: Show chunk index, page number, content preview
- **Expand/Collapse**: Click to see full chunk content
- **Copy Chunk**: Copy button for each chunk
- **Navigate**: Jump to specific chunk or page
- **Highlight Search**: Highlight search terms in chunks

**Files to Modify**:
- `src/pages/documents/DocumentsPage.tsx`
- `src/modules/documents/components/DocumentUploader.tsx`
- `src/modules/documents/components/DocumentViewer.tsx`
- `src/modules/documents/components/ChunkExplorer.tsx`
- `src/modules/documents/components/ProcessingStatus.tsx`

---

### 5. Chat Module

**Current State**: Basic chat interface with WebSocket

**Enhancements**:

#### Chat Interface
- **Message List**: Auto-scroll to bottom on new message
- **Message Bubbles**: User messages right-aligned, AI left-aligned
- **Timestamps**: Show time for each message
- **Markdown Rendering**: Support markdown in AI responses
- **Code Blocks**: Syntax highlighting for code in responses
- **Copy Button**: Copy message or code block
- **Regenerate**: Regenerate last AI response
- **Edit Message**: Edit and resend user message

#### Context Panel
- **Toggle Button**: Show/hide context panel
- **Document Context**: Show linked document with chunks
- **Relevant Context**: Highlight chunks used in response
- **Jump to Source**: Click chunk to view in document
- **Context Settings**: Choose which modules to include in context

#### Message Input
- **Textarea**: Multi-line input with auto-resize
- **Keyboard Shortcuts**: Cmd+Enter to send, Shift+Enter for new line
- **Suggestions**: Show suggested prompts when empty
- **Character Count**: Show character count (optional limit)
- **Send Button**: Disabled when empty or sending
- **Stop Generation**: Button to stop streaming response

#### Streaming Indicators
- **Typing Indicator**: Animated dots while AI is thinking
- **Token-by-Token**: Stream response word-by-word
- **Cursor**: Blinking cursor at end of streaming text
- **Connection Status**: Show online/offline badge
- **WebSocket Reconnect**: Auto-reconnect with exponential backoff

#### Session Management
- **Session List**: Sidebar with all chat sessions
- **New Session**: Button to start new chat
- **Rename Session**: Click session title to rename
- **Delete Session**: Delete with confirmation
- **Session Search**: Search across all sessions

**Files to Modify**:
- `src/pages/chat/ChatPage.tsx`
- `src/modules/chat/components/ChatInterface.tsx`
- `src/modules/chat/components/MessageList.tsx`
- `src/modules/chat/components/MessageInput.tsx`
- `src/modules/chat/components/ContextPanel.tsx`
- `src/modules/chat/components/StreamingMessage.tsx`

---

### 6. Quizzes Module

**Current State**: Basic quiz creation and taking

**Enhancements**:

#### Quiz List Page
- **Quiz Cards**: Show title, question count, difficulty, attempts
- **Create Button**: Prominent "Create Quiz" button
- **Filter/Sort**: By difficulty, date, attempts
- **Quick Actions**: Start quiz, Edit, Delete
- **Empty State**: Encourage creating first quiz

#### Quiz Builder
- **Question Editor**: Add/remove questions dynamically
- **Question Types**: Multiple choice, True/False, Short answer
- **Drag-and-Drop**: Reorder questions
- **Rich Text**: Support formatting in questions/answers
- **Image Upload**: Add images to questions
- **Points System**: Assign points per question
- **Time Limit**: Set overall time limit
- **Preview Mode**: Preview quiz before saving
- **Auto-save**: Save draft automatically

#### Quiz Taking Page
- **Question Navigation**: Show all questions as clickable circles
- **Progress Bar**: Show questions answered
- **Timer**: Count down if time limit set
- **Flag for Review**: Mark questions to revisit
- **Answer Selection**: Clear UI for selecting answers
- **Previous/Next**: Navigate between questions
- **Submit Confirmation**: Confirm before submitting
- **Review Answers**: Review all answers before final submit

#### Quiz Results Page
- **Score Card**: Big score display with percentage
- **Performance Breakdown**: Show correct/incorrect per question
- **Review Answers**: See correct answers with explanations
- **Time Taken**: Show total time
- **Share Results**: Share score (optional)
- **Retake Button**: Start quiz again

**Files to Modify**:
- `src/pages/quizzes/QuizzesPage.tsx`
- `src/pages/quizzes/QuizTakePage.tsx`
- `src/modules/quizzes/components/QuizBuilder.tsx`
- `src/modules/quizzes/components/QuizTaker.tsx`
- `src/modules/quizzes/components/QuestionCard.tsx`
- `src/modules/quizzes/components/Results.tsx`

---

### 7. Analytics Module

**Current State**: Basic overview stats

**Enhancements**:

#### Dashboard Tab
- **Key Metrics**: Large stat cards (Total cards, Due, Accuracy, Study time)
- **Charts**:
  - Performance trend (line chart showing accuracy over time)
  - Study time by day (bar chart)
  - Cards reviewed by day (bar chart)
  - Mastery distribution (pie chart: New, Learning, Review, Mastered)
- **Date Range Picker**: Filter by last 7 days, 30 days, 90 days, all time

#### Weak Areas Tab
- **List View**: Show topics/decks with low accuracy
- **Severity Badges**: High, Medium, Low
- **Action Buttons**: "Focus Study" to create targeted review session
- **Charts**: Bar chart showing accuracy per topic

#### Activity Heatmap
- **Calendar View**: GitHub-style heatmap showing study activity
- **Color Intensity**: Darker = more activity
- **Hover Tooltip**: Show exact count and date
- **Date Range**: Last 365 days

#### Topic Mastery Tab
- **Radar Chart**: Show mastery across different topics/decks
- **List View**: Show mastery percentage per topic
- **Progress Bars**: Visual progress toward mastery
- **Focus Recommendations**: Suggest topics needing attention

#### Performance Trends
- **Line Chart**: Accuracy over time
- **Area Chart**: Study time over time
- **Comparative View**: Compare different metrics
- **Annotations**: Mark significant events (e.g., "Started new deck")

#### Export Data
- **CSV Export**: Export all analytics data
- **Date Range**: Select range to export
- **Format Options**: CSV or JSON
- **Download Button**: Trigger download

**Files to Modify**:
- `src/pages/analytics/AnalyticsPage.tsx`
- `src/modules/analytics/components/Dashboard.tsx`
- `src/modules/analytics/components/HeatMap.tsx`
- `src/modules/analytics/components/MasteryRadar.tsx`
- `src/modules/analytics/components/PerformanceTrends.tsx`
- `src/modules/analytics/components/WeakAreasChart.tsx`

---

### 8. Layout Components

#### AppShell Enhancement

**Current State**: Basic layout wrapper

**Enhancements**:
- **Responsive Sidebar**: Collapse on mobile, overlay on tablet
- **Smooth Transitions**: Animate sidebar collapse/expand
- **Sticky Header**: Header stays at top on scroll
- **Content Max-Width**: Constrain content width for readability (1400px)
- **Backdrop**: Show backdrop when mobile sidebar open
- **Keyboard Shortcut**: Cmd+B to toggle sidebar
- **Persistent State**: Remember collapsed state in localStorage

**File**: `src/components/layout/AppShell.tsx`

---

#### Header Enhancement

**Current State**: Basic header with title

**Enhancements**:
- **Logo**: App logo on left (link to dashboard)
- **Search Button**: Global search (⌘K) trigger button
- **Notifications**: Bell icon with unread count badge
- **User Menu**: Avatar with dropdown menu
- **Mobile Menu**: Hamburger button (only on mobile)
- **Breadcrumbs**: Show current location (optional)
- **Theme Toggle**: Sun/moon icon

**File**: `src/components/layout/Header.tsx`

---

#### Sidebar Enhancement

**Current State**: Basic navigation links

**Enhancements**:
- **Active Route Highlight**: Bold text + accent color + background
- **Icons**: Lucide icons for each route
- **Collapse Button**: Arrow button to collapse sidebar
- **Collapsed State**: Show only icons when collapsed
- **Tooltips**: Show labels on hover when collapsed
- **Section Dividers**: Group related items (Study, Content, Settings)
- **Due Count Badges**: Show due card count on Flashcards link
- **Smooth Transitions**: Animate width change on collapse

**File**: `src/components/layout/Sidebar.tsx`

---

#### Breadcrumbs Enhancement

**Current State**: Basic breadcrumb component

**Enhancements**:
- **Auto-generation**: Generate from current route
- **Clickable**: Each crumb is a link (except last)
- **Icons**: Show icons for each level
- **Overflow**: Show "..." if too many levels
- **Dropdown**: Click "..." to see hidden levels
- **Separator**: Custom separator (chevron or slash)

**File**: `src/components/layout/Breadcrumbs.tsx`

---

## Performance Optimization Strategy

### Code Splitting

**Goal**: Reduce initial bundle size, load code on-demand.

**Strategy**:

#### 1. Route-Based Splitting
- Use React.lazy for each page component
- Wrap in Suspense with fallback
- Preload routes on hover/focus

**Pattern**:
```typescript
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const FlashcardsPage = lazy(() => import('@/pages/flashcards/DecksPage'));

<Route path="/dashboard" element={
  <Suspense fallback={<PageLoader />}>
    <DashboardPage />
  </Suspense>
} />
```

#### 2. Component-Based Splitting
- Split large components (charts, editors)
- Load on interaction (e.g., modal opens, tab clicked)

**Examples**:
- BlockNote editor (only load when editing note)
- Chart library (only load on analytics page)
- PDF viewer (only load when viewing document)

#### 3. Vendor Chunking
- Already configured in vite.config.ts
- Verify chunks are properly split:
  - react-vendor (React, ReactDOM)
  - query-vendor (TanStack Query, Router)
  - ui-vendor (Framer Motion, Recharts)
  - editor-vendor (BlockNote)

**Goal**: Cache vendor code separately (changes less frequently).

---

### Virtualization

**Goal**: Render only visible items in long lists.

**Where to Apply**:
- Note list (>100 notes)
- Deck list (>50 decks)
- Document list (>50 documents)
- Search results (>50 results)
- Chat message history (>100 messages)

**Library**: Consider `@tanstack/react-virtual` (lightweight)

**Pattern**:
```typescript
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // Estimated item height
});

virtualizer.getVirtualItems().map(virtualItem => (
  <div key={virtualItem.key} ref={virtualizer.measureElement}>
    {items[virtualItem.index]}
  </div>
));
```

**When to Apply**: Only if performance issue observed with large lists.

---

### Image Optimization

**Goal**: Optimize images for fast loading and minimal bandwidth.

**Strategy**:

#### 1. Lazy Loading
- Use `loading="lazy"` attribute on images
- Load images as they enter viewport

#### 2. Responsive Images
- Use `srcset` for different screen sizes
- Serve appropriately sized images

#### 3. Image Compression
- Compress uploaded images on backend
- Use WebP format when supported

#### 4. Placeholder Strategy
- Show blur placeholder while loading
- Use low-quality image placeholder (LQIP)

**Note**: If storing images, implement on backend. Frontend only handles display.

---

### Memo and Callback Optimization

**Goal**: Prevent unnecessary re-renders.

**When to Use**:

#### React.memo
- Wrap expensive components that receive same props often
- Examples: Chart components, large lists, complex cards

#### useCallback
- Functions passed as props to memoized components
- Event handlers in lists (prevent re-creation on each render)

#### useMemo
- Expensive calculations
- Derived state that doesn't need to recalculate every render

**Warning**: Don't over-optimize. Profile first, then optimize.

---

### Bundle Analysis

**Goal**: Identify and eliminate bundle bloat.

**Tool**: `vite-bundle-visualizer` or `rollup-plugin-visualizer`

**Steps**:
1. Install plugin
2. Build production bundle
3. Analyze report
4. Identify large chunks
5. Lazy load or replace heavy dependencies

**Target**: Initial bundle < 200KB (gzipped)

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

**Goal**: Make app usable for everyone, including people with disabilities.

### Keyboard Navigation

**Requirements**:

#### 1. Tab Order
- All interactive elements are focusable
- Tab order follows visual order
- Skip links to main content

#### 2. Focus Indicators
- Visible focus ring on all focusable elements
- High contrast focus indicator
- Not removed with `outline: none` (use enhanced ring instead)

#### 3. Keyboard Shortcuts
- Document all shortcuts in help modal
- Don't override browser shortcuts
- Provide alternative click methods

**Common Shortcuts**:
- `Tab` / `Shift+Tab`: Navigate forward/backward
- `Enter` / `Space`: Activate button/link
- `Escape`: Close modal/dropdown
- `Arrow keys`: Navigate lists/menus
- `Cmd/Ctrl+K`: Open search
- `Cmd/Ctrl+B`: Toggle sidebar
- `?`: Show keyboard shortcuts help

---

### Screen Reader Support

**Requirements**:

#### 1. Semantic HTML
- Use correct HTML elements (button, nav, main, etc.)
- Don't use divs with onClick as buttons

#### 2. ARIA Labels
- `aria-label` for icon-only buttons
- `aria-labelledby` for complex labels
- `aria-describedby` for additional context
- `aria-live` for dynamic content updates

#### 3. ARIA States
- `aria-expanded` for collapsible elements
- `aria-checked` for checkboxes/radios
- `aria-selected` for tabs/lists
- `aria-busy` for loading states
- `aria-disabled` for disabled elements

#### 4. Announcements
- Announce form errors
- Announce route changes
- Announce loading states
- Announce success messages

**Implementation**: Create `useAnnounce` hook that uses aria-live regions.

---

### Color Contrast

**Requirements**:
- Text: 4.5:1 contrast ratio (normal), 3:1 (large text)
- UI components: 3:1 contrast ratio
- Focus indicators: 3:1 contrast ratio

**Tool**: Use browser DevTools color contrast checker

**Strategy**:
- Test all color combinations
- Ensure dark mode also meets requirements
- Don't rely on color alone to convey information

---

### Motion Preferences

**Requirements**:
- Respect `prefers-reduced-motion` media query
- Disable animations for users who prefer reduced motion
- Provide setting to disable animations

**Implementation**:
```typescript
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const showAnimations = usePreferencesStore(s => s.showAnimations);

const shouldAnimate = !prefersReducedMotion && showAnimations;
```

**Apply to**:
- All Framer Motion animations
- CSS transitions
- Auto-playing carousels/videos

---

### Alternative Text

**Requirements**:
- All images have meaningful alt text
- Decorative images have empty alt (`alt=""`)
- Icon-only buttons have aria-label

**Pattern**:
```typescript
<img src="..." alt="Graph showing study progress over 30 days" />
<Button aria-label="Close modal"><X /></Button>
```

---

### Form Accessibility

**Requirements**:
- All inputs have labels (visible or aria-label)
- Labels are associated (htmlFor attribute)
- Errors are announced and associated with fields
- Required fields are indicated (aria-required)
- Error prevention for critical actions

**Pattern**:
```typescript
<label htmlFor="deck-name">Deck Name *</label>
<input 
  id="deck-name"
  aria-required="true"
  aria-invalid={!!errors.name}
  aria-describedby={errors.name ? 'name-error' : undefined}
/>
{errors.name && (
  <span id="name-error" role="alert">
    {errors.name.message}
  </span>
)}
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal**: Establish core infrastructure and patterns.

#### Week 1: Core Components
- [ ] Create query key factory (`queryKeys.ts`)
- [ ] Enhance ErrorBoundary component (3 levels)
- [ ] Create skeleton loader components (Card, List, Table)
- [ ] Create StatusBadge component
- [ ] Add semantic colors to design system
- [ ] Configure animation utilities in Tailwind

#### Week 2: Layout & Navigation
- [ ] Enhance AppShell with responsive sidebar
- [ ] Enhance Header with search, notifications, user menu
- [ ] Create NotificationCenter component
- [ ] Create SearchCommand component (⌘K)
- [ ] Create MobileNav component
- [ ] Update Sidebar with better styling and badges

---

### Phase 2: State Management (Week 3)

**Goal**: Improve state management and data fetching.

- [ ] Update QueryClient configuration
- [ ] Migrate all hooks to use query keys factory
- [ ] Add optimistic updates to mutations
- [ ] Create notification store (Zustand)
- [ ] Create preferences store (Zustand)
- [ ] Enhance UI store with new state
- [ ] Implement prefetching strategy
- [ ] Add useQueryError hook

---

### Phase 3: Module Enhancements (Week 4-7)

**Goal**: Enhance each module with polish and features.

#### Week 4: Dashboard & Flashcards
- [ ] Enhance DashboardPage with StatCard animations
- [ ] Add recent activity feed
- [ ] Add learning insights section
- [ ] Enhance DecksPage with card grid and search
- [ ] Enhance ReviewSession with 3D flip and swipe
- [ ] Add review session summary

#### Week 5: Notes & Documents
- [ ] Implement three-column layout for NotesPage
- [ ] Enhance NoteEditor with BlockNote features
- [ ] Add note tree with drag-and-drop
- [ ] Implement auto-save with indicator
- [ ] Enhance DocumentsPage with drag-and-drop upload
- [ ] Add processing status indicators
- [ ] Create ChunkExplorer component

#### Week 6: Chat & Quizzes
- [ ] Enhance ChatInterface with streaming indicators
- [ ] Add context panel with document chunks
- [ ] Implement session management sidebar
- [ ] Add message actions (copy, regenerate)
- [ ] Enhance QuizBuilder with question editor
- [ ] Add quiz taking interface with timer
- [ ] Create results page with performance breakdown

#### Week 7: Analytics
- [ ] Create analytics dashboard with charts
- [ ] Add performance trends charts (line, bar)
- [ ] Implement activity heatmap
- [ ] Create weak areas visualization
- [ ] Add topic mastery radar chart
- [ ] Implement date range filtering

---

### Phase 4: Forms & Interactions (Week 8)

**Goal**: Implement robust form handling and micro-interactions.

- [ ] Create Zod schemas for all entities
- [ ] Create reusable form field components
- [ ] Implement form modal pattern across modules
- [ ] Add inline editing for quick updates
- [ ] Implement auto-save for note editor
- [ ] Add form validation with inline errors
- [ ] Add toast notifications for all actions

---

### Phase 5: Animations & Polish (Week 9-10)

**Goal**: Add animations and polish for delightful UX.

#### Week 9: Core Animations
- [ ] Add page transition wrapper to all routes
- [ ] Implement list stagger animations
- [ ] Add layout animations for shared elements
- [ ] Enhance button micro-interactions
- [ ] Add icon animations (spin, bounce, pulse)
- [ ] Implement chart entry animations
- [ ] Add progress indicator animations

#### Week 10: Module-Specific Animations
- [ ] Polish flashcard flip animation
- [ ] Enhance swipe gesture with visual feedback
- [ ] Add confetti for session completion
- [ ] Add skeleton-to-content transitions
- [ ] Polish modal entry/exit animations
- [ ] Add loading state animations

---

### Phase 6: Performance & Accessibility (Week 11-12)

**Goal**: Optimize performance and ensure accessibility.

#### Week 11: Performance
- [ ] Implement route-based code splitting
- [ ] Add lazy loading for heavy components
- [ ] Implement virtualization for long lists
- [ ] Add image lazy loading
- [ ] Optimize bundle with analysis
- [ ] Add React.memo to expensive components
- [ ] Implement prefetching on hover

#### Week 12: Accessibility
- [ ] Audit keyboard navigation across all pages
- [ ] Add ARIA labels to all interactive elements
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify color contrast ratios
- [ ] Implement prefers-reduced-motion support
- [ ] Add keyboard shortcuts help modal
- [ ] Test focus indicators visibility

---

### Phase 7: Testing & Documentation (Week 13-14)

**Goal**: Ensure quality and maintainability.

#### Week 13: Testing
- [ ] Write unit tests for utility functions
- [ ] Write component tests for critical components
- [ ] Write integration tests for key user flows
- [ ] Test error boundaries at all levels
- [ ] Test form validation
- [ ] Test WebSocket reconnection
- [ ] Cross-browser testing (Chrome, Firefox, Safari)

#### Week 14: Documentation & Refinement
- [ ] Document component API in Storybook (optional)
- [ ] Document keyboard shortcuts
- [ ] Document accessibility features
- [ ] Create user guide for key features
- [ ] Final polish pass (spacing, colors, typography)
- [ ] Performance audit and optimization
- [ ] Accessibility audit and fixes

---

## Success Metrics

### Performance Targets
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms
- **Bundle Size**: Initial < 200KB gzipped

### User Experience Targets
- **Skeleton Loaders**: All lists/grids show skeletons while loading
- **Error Handling**: No unhandled errors, all errors show user-friendly messages
- **Loading States**: All actions show immediate feedback (spinner, progress, etc.)
- **Animations**: Smooth 60fps animations, respectful of reduced-motion preference
- **Toast Notifications**: All CRUD operations show success/error toasts

### Accessibility Targets
- **WCAG 2.1 AA**: Full compliance
- **Keyboard Navigation**: All features accessible via keyboard
- **Screen Reader**: Full compatibility with NVDA/VoiceOver
- **Color Contrast**: All text meets 4.5:1 minimum
- **Focus Indicators**: Visible and high-contrast on all elements

---

## File Structure Reference

### New Files to Create

```
src/
├── components/
│   ├── common/
│   │   ├── AnimatedCounter.tsx          [NEW]
│   │   ├── AnimatedList.tsx             [NEW]
│   │   ├── ErrorState.tsx               [NEW]
│   │   ├── GradientCard.tsx             [NEW]
│   │   ├── ProgressIndicator.tsx        [NEW]
│   │   ├── RetryBoundary.tsx            [NEW]
│   │   ├── SkeletonCard.tsx             [NEW]
│   │   ├── SkeletonList.tsx             [NEW]
│   │   ├── SkeletonTable.tsx            [NEW]
│   │   ├── StatCard.tsx                 [NEW]
│   │   └── StatusBadge.tsx              [NEW]
│   │
│   ├── feedback/                        [NEW FOLDER]
│   │   ├── Alert.tsx
│   │   ├── ConfirmationModal.tsx
│   │   ├── FeedbackButton.tsx
│   │   └── Toast.tsx
│   │
│   ├── forms/                           [NEW FOLDER]
│   │   ├── FormCheckbox.tsx
│   │   ├── FormField.tsx
│   │   ├── FormRadioGroup.tsx
│   │   ├── FormSelect.tsx
│   │   └── FormTextarea.tsx
│   │
│   └── layout/
│       ├── MobileNav.tsx                [NEW]
│       ├── NotificationCenter.tsx       [NEW]
│       ├── PageTransition.tsx           [NEW]
│       ├── SearchCommand.tsx            [NEW]
│       └── UserMenu.tsx                 [NEW]
│
├── hooks/
│   ├── useAnnounce.ts                   [NEW]
│   ├── useNetworkStatus.ts              [NEW]
│   ├── usePrefersReducedMotion.ts       [NEW]
│   └── useQueryError.ts                 [NEW]
│
├── lib/
│   └── queryKeys.ts                     [NEW]
│
├── stores/
│   ├── notificationStore.ts             [NEW]
│   └── preferencesStore.ts              [NEW]
│
└── modules/
    ├── analytics/
    │   └── components/
    │       ├── ActivityFeed.tsx         [NEW]
    │       └── MiniChart.tsx            [NEW]
    │
    ├── flashcards/
    │   └── schemas/
    │       └── deckSchema.ts            [NEW]
    │
    ├── notes/
    │   └── schemas/
    │       └── noteSchema.ts            [NEW]
    │
    └── [similar schema folders for other modules]
```

### Files to Enhance

```
src/
├── App.tsx                              [UPDATE: QueryClient config]
├── router.tsx                           [UPDATE: Add ErrorBoundaries, Suspense]
│
├── components/
│   ├── common/
│   │   ├── EmptyState.tsx               [ENHANCE: Add variants, animations]
│   │   ├── ErrorBoundary.tsx            [REWRITE: Add levels, better UI]
│   │   └── LoadingSpinner.tsx           [REPLACE: With better implementation]
│   │
│   └── layout/
│       ├── AppShell.tsx                 [ENHANCE: Responsive, animations]
│       ├── Breadcrumbs.tsx              [ENHANCE: Auto-generation, overflow]
│       ├── Header.tsx                   [ENHANCE: Add search, notifications, menu]
│       └── Sidebar.tsx                  [ENHANCE: Better styling, badges, collapse]
│
├── stores/
│   ├── authStore.ts                     [KEEP AS IS]
│   ├── themeStore.ts                    [KEEP AS IS]
│   └── uiStore.ts                       [ENHANCE: Add new state]
│
├── styles/
│   └── globals.css                      [ENHANCE: Add colors, animations]
│
├── tailwind.config.ts                   [ENHANCE: Add utilities, colors]
│
└── All page and module files            [ENHANCE: Per phase plan above]
```

---

## Design Patterns & Best Practices

### Component Design Patterns

#### 1. Compound Component Pattern
**Use for**: Complex components with multiple sub-components (e.g., Card, Form, Table)

**Example**:
```typescript
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
    <Card.Description>Description</Card.Description>
  </Card.Header>
  <Card.Content>Content</Card.Content>
  <Card.Footer>Footer</Card.Footer>
</Card>
```

**Why**: Provides flexibility while maintaining consistent structure.

---

#### 2. Render Props Pattern
**Use for**: Sharing logic between components with different UIs

**Example**: Skeleton loaders with custom render

```typescript
<SkeletonLoader 
  loading={isLoading}
  skeleton={<SkeletonCard count={4} />}
  render={(data) => <CardGrid data={data} />}
/>
```

---

#### 3. HOC Pattern (Use Sparingly)
**Use for**: Cross-cutting concerns (auth, analytics tracking)

**Example**: `withErrorBoundary`, `withAuth`

**Prefer**: Hooks and components over HOCs in most cases.

---

#### 4. Container/Presenter Pattern
**Use for**: Separating data fetching from presentation

**Example**:
- `DecksPageContainer.tsx` - Fetches data, handles errors
- `DecksList.tsx` - Pure presentational component

**When**: Use for complex pages with lots of data fetching.

---

### Hook Design Patterns

#### 1. Custom Query Hooks
**Pattern**: One hook per entity type

**Example**:
```typescript
// src/api/hooks/useDecks.ts
export const useDecks = (filters) => useQuery({...});
export const useDeck = (id) => useQuery({...});
export const useCreateDeck = () => useMutation({...});
export const useUpdateDeck = () => useMutation({...});
export const useDeleteDeck = () => useMutation({...});
```

---

#### 2. State Machine Hooks
**Use for**: Complex multi-state logic (e.g., file upload states)

**States**: idle → uploading → processing → completed | failed

**Library**: Consider XState for very complex flows (optional).

---

#### 3. Derived State Hooks
**Pattern**: Compute derived state from props/state

**Example**:
```typescript
const useDeckStats = (deck) => {
  return useMemo(() => ({
    totalCards: deck.cards.length,
    dueCards: deck.cards.filter(c => c.isDue).length,
    masteredCards: deck.cards.filter(c => c.isMastered).length,
    masteryPercent: (deck.cards.filter(c => c.isMastered).length / deck.cards.length) * 100
  }), [deck]);
};
```

---

### Error Handling Patterns

#### 1. Error Boundary Hierarchy
```
App (catastrophic errors)
└── Route (route-level errors)
    └── Module (module-level errors)
        └── Component (component-level errors)
```

#### 2. Error Recovery Strategies
- **Retry**: For transient network errors
- **Fallback**: Show cached data or default state
- **Redirect**: Navigate to safe page (dashboard)
- **Inform**: Show error message and let user decide

#### 3. Error Logging
- Console errors in development
- Send to error tracking (Sentry) in production
- Include context (user ID, route, action taken)

---

### State Management Patterns

#### 1. Server State vs Client State
- **Server State**: Use TanStack Query (decks, notes, user data)
- **Client State**: Use Zustand (UI state, preferences, notifications)
- **Form State**: Use React Hook Form
- **URL State**: Use React Router (filters, pagination)

#### 2. Optimistic Updates
- Use for actions where failure is rare
- Always provide rollback on error
- Show loading indicator for slow operations

#### 3. Cache Invalidation
- Invalidate related queries after mutations
- Use query key factory for consistent invalidation
- Prefer invalidation over manual cache updates

---

## Testing Strategy

### Unit Tests
**What to Test**:
- Utility functions (formatters, validators)
- Custom hooks (input/output)
- Pure components (props → render)

**Tools**: Vitest + Testing Library

**Example Tests**:
- `formatDate` returns correct format
- `useDebounce` delays function execution
- `StatusBadge` shows correct color for status

---

### Integration Tests
**What to Test**:
- User flows (login, create deck, review cards)
- Form submission and validation
- Error handling and recovery
- WebSocket connection and reconnection

**Tools**: Vitest + Testing Library + MSW (Mock Service Worker)

**Example Tests**:
- User can create and review flashcards
- Form shows validation errors
- App recovers from network error

---

### E2E Tests (Optional)
**What to Test**:
- Critical user journeys
- Cross-browser compatibility
- Real API integration

**Tools**: Playwright or Cypress

**Example Tests**:
- Complete onboarding flow
- Full review session end-to-end
- Document upload and processing

---

### Accessibility Tests
**What to Test**:
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management

**Tools**: 
- axe DevTools (browser extension)
- jest-axe (automated tests)
- Manual testing with screen reader

---

## Migration Strategy

### Incremental Enhancement
**Philosophy**: Enhance existing code gradually, no big rewrites.

**Steps**:
1. Add new infrastructure (query keys, stores, components)
2. Migrate one module at a time
3. Test thoroughly after each module
4. Keep old code working during migration
5. Remove old code only when new is fully tested

### Backward Compatibility
- Don't break existing functionality
- Add new features alongside old
- Deprecate gracefully with warnings
- Remove deprecated code only after migration complete

### Feature Flags (Optional)
- Use feature flags for big changes
- Enable for testing, then gradually roll out
- Easy rollback if issues found

---

## Deployment Considerations

### Build Configuration
- **Production Build**: `npm run build`
- **Preview**: `npm run preview`
- **Type Check**: `npm run type-check`
- **Lint**: `npm run lint`

### Environment Variables
```env
VITE_API_BASE_URL=https://api.example.com
VITE_WS_URL=wss://api.example.com
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=https://...
```

### Performance Monitoring
- Add Sentry for error tracking
- Add analytics (Plausible, Umami, or similar)
- Monitor Core Web Vitals
- Set up performance budgets

### CDN & Caching
- Serve static assets from CDN
- Configure caching headers
- Use service worker for offline support (optional)

---

## Maintenance Guidelines

### Code Style
- **Consistency**: Follow existing patterns
- **Readability**: Prefer clarity over cleverness
- **Comments**: Explain why, not what
- **TypeScript**: Use strict mode, avoid `any`

### Git Workflow
- **Branch Naming**: `feature/stat-cards`, `fix/chat-reconnect`, `enhance/note-editor`
- **Commit Messages**: Conventional commits format
- **PR Reviews**: All changes reviewed before merge
- **CI/CD**: Run tests, lint, type-check on every PR

### Documentation
- **Component Documentation**: Props, usage examples, variants
- **Hook Documentation**: Parameters, return value, side effects
- **Architecture Decisions**: Document why, not just what
- **User Guide**: Update user-facing documentation

---

## Troubleshooting Guide

### Common Issues

#### 1. WebSocket Not Connecting
**Symptoms**: Chat not working, "offline" status
**Solutions**:
- Check WS URL in env variables
- Verify backend WebSocket endpoint running
- Check browser console for connection errors
- Verify authentication token is valid

#### 2. Queries Not Refetching
**Symptoms**: Stale data, updates not showing
**Solutions**:
- Check staleTime configuration
- Verify query key dependencies
- Check if invalidation is called after mutation
- Use React Query DevTools to inspect cache

#### 3. Animations Not Working
**Symptoms**: Elements appear instantly without transitions
**Solutions**:
- Check if `prefers-reduced-motion` is enabled
- Verify Framer Motion is imported correctly
- Check if AnimatePresence wrapper is present
- Inspect element in DevTools for CSS issues

#### 4. Form Validation Not Showing
**Symptoms**: Errors not displayed, form submits with invalid data
**Solutions**:
- Check Zod schema is correct
- Verify resolver is passed to useForm
- Check error object in react-hook-form
- Ensure FormField components are rendering errors

#### 5. Build Errors
**Symptoms**: `npm run build` fails
**Solutions**:
- Run `npm run type-check` to find TypeScript errors
- Check for unused imports (ESLint)
- Verify all environment variables are set
- Check for circular dependencies

---

## Conclusion

This implementation guide provides a comprehensive roadmap for transforming the Synapse frontend from its current minimal state to a polished, production-ready application. The plan is:

✅ **Declarative** - Describes what to achieve, not prescriptive code
✅ **Comprehensive** - Covers all aspects: design, components, animations, state, errors, performance, accessibility
✅ **Structured** - Organized by phase with clear dependencies
✅ **Realistic** - 14-week timeline with measurable milestones
✅ **Maintainable** - Emphasizes patterns, testing, and documentation

### Key Principles to Remember

1. **Progressive Enhancement**: Build solid foundation first, add polish incrementally
2. **User Feedback**: Always inform users of system state
3. **Consistency**: Reuse patterns across modules
4. **Performance**: Smooth animations, fast load times
5. **Accessibility**: Built in from the start, not bolted on

### Next Steps

1. **Review and Approve**: Review this plan with team
2. **Set Up Infrastructure**: Phase 1 foundation
3. **Iterate Module by Module**: Follow phase plan
4. **Test Continuously**: Don't wait until end
5. **Gather Feedback**: Test with real users early and often

### Success Criteria

The frontend enhancement will be considered successful when:
- All modules have polished, animated interfaces
- All user actions provide immediate feedback
- All errors are handled gracefully with recovery options
- All loading states show appropriate placeholders
- All features are keyboard accessible
- All text meets color contrast requirements
- Bundle size is optimized and fast to load
- Users describe the app as "delightful" and "professional"


# Components Architecture

## Folder Structure

- **`ui/`** - shadcn/ui primitives (DO NOT MODIFY)
  - Auto-generated components from shadcn/ui CLI
  - Update with: `npx shadcn@latest add <component>`
  
- **`custom/`** - Custom wrappers (MODIFY FREELY)
  - Extends base UI components with app-specific features
  - Example: EnhancedDialog, EnhancedAlert
  
- **`common/`** - App-specific components
  - Business logic components (StatCard, StatusBadge, etc.)
  - Built using ui/ and custom/ components
  
- **`layout/`** - Layout components
  - Header, Sidebar, AppShell, etc.
  
- **`feedback/`** - User feedback components
  - Notifications, alerts, confirmations
  
- **`forms/`** - Form components
  - Field wrappers with validation display

## Best Practices

1. Never modify files in `ui/` directly
2. Create wrappers in `custom/` for extended functionality
3. Use composition over modification
4. Import from `@/components/ui/` in custom wrappers
5. Import from `@/components/custom/` in application code

---

**Remember**: This is a living document. Update as you learn and adjust based on real-world usage and feedback. The goal is not perfection, but continuous improvement toward an excellent user experience.

Good luck! 🚀
