❯ tree -I 'node_modules|dist|__pycache__'
.
├── components.json
├── implementation_guide.md
├── index.html
├── openapi.json
├── openapi-ts.config.ts
├── package.json
├── package-lock.json
├── postcss.config.js
├── public
│   ├── fonts
│   └── images
├── README.md
├── src
│   ├── api
│   │   ├── client.ts
│   │   ├── generated
│   │   │   ├── core
│   │   │   │   ├── ApiError.ts
│   │   │   │   ├── ApiRequestOptions.ts
│   │   │   │   ├── ApiResult.ts
│   │   │   │   ├── CancelablePromise.ts
│   │   │   │   ├── OpenAPI.ts
│   │   │   │   └── request.ts
│   │   │   ├── index.ts
│   │   │   ├── models
│   │   │   ├── schemas.gen.ts
│   │   │   ├── services
│   │   │   ├── services.gen.ts
│   │   │   └── types.gen.ts
│   │   ├── hooks
│   │   │   ├── useAnalytics.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useDocuments.ts
│   │   │   ├── useFlashcards.ts
│   │   │   ├── useNotes.ts
│   │   │   ├── useQuizzes.ts
│   │   │   └── useStudy.ts
│   │   └── websocket
│   │       ├── chat.ts
│   │       ├── study.ts
│   │       └── types.ts
│   ├── App.tsx
│   ├── components
│   │   ├── common
│   │   │   ├── ConfirmDialog.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── layout
│   │   │   ├── AppShell.tsx
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Sidebar.tsx
│   │   └── ui
│   │       ├── alert.tsx
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── scroll-area.tsx
│   │       ├── skeleton.tsx
│   │       ├── tabs.tsx
│   │       ├── toaster.tsx
│   │       └── toast.tsx
│   ├── hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useMediaQuery.ts
│   │   └── use-toast.ts                                                                     │   ├── lib
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   └── validators.ts
│   ├── main.tsx                                                                             │   ├── modules                                                                              │   │   ├── analytics                                                                        │   │   │   ├── components                                                                   │   │   │   │   ├── Dashboard.tsx                                                            │   │   │   │   ├── HeatMap.tsx                                                              │   │   │   │   ├── MasteryRadar.tsx
│   │   │   │   ├── PerformanceTrends.tsx
│   │   │   │   └── WeakAreasChart.tsx
│   │   │   ├── hooks                                                                        │   │   │   │   └── useAnalytics.ts                                                          │   │   │   └── index.ts                                                                     │   │   ├── chat                                                                             │   │   │   ├── components                                                                   │   │   │   │   ├── ChatInterface.tsx                                                        │   │   │   │   ├── ContextPanel.tsx                                                         │   │   │   │   ├── MessageInput.tsx                                                         │   │   │   │   ├── MessageList.tsx                                                          │   │   │   │   └── StreamingMessage.tsx                                                     │   │   │   ├── hooks                                                                        │   │   │   │   ├── useChatWebSocket.ts                                                      │   │   │   │   └── useStreamingMessage.ts                                                   │   │   │   └── index.ts                                                                     │   │   ├── documents                                                                        │   │   │   ├── components                                                                   │   │   │   │   ├── ChunkExplorer.tsx                                                        │   │   │   │   ├── DocumentUploader.tsx                                                     │   │   │   │   ├── DocumentViewer.tsx                                                       │   │   │   │   └── ProcessingStatus.tsx                                                     │   │   │   ├── hooks                                                                        │   │   │   │   └── useDocumentUpload.ts                                                     │   │   │   └── index.ts                                                                     │   │   ├── flashcards                                                                       │   │   │   ├── components                                                                   │   │   │   │   ├── DeckList.tsx                                                             │   │   │   │   ├── DeckStats.tsx                                                            │   │   │   │   ├── FlashcardEditor.tsx                                                      │   │   │   │   └── ReviewSession                                                            │   │   │   │       ├── CardFlip.tsx                                                         │   │   │   │       ├── index.tsx                                                            │   │   │   │       ├── ReviewTimer.tsx                                                      │   │   │   │       └── SwipeGesture.tsx                                                     │   │   │   ├── hooks                                                                        │   │   │   │   └── useReviewSession.ts                                                      │   │   │   ├── index.ts                                                                     │   │   │   └── stores                                                                       │   │   │       └── reviewStore.ts                                                           │   │   ├── notes                                                                            │   │   │   ├── components                                                                   │   │   │   │   ├── NoteEditor.tsx                                                           │   │   │   │   ├── NoteSearch.tsx                                                           │   │   │   │   ├── NoteTree.tsx                                                             │   │   │   │   └── VersionHistory.tsx                                                       │   │   │   ├── hooks                                                                        │   │   │   │   └── useNoteTree.ts                                                           │   │   │   └── index.ts                                                                     │   │   ├── quizzes                                                                          │   │   │   ├── components                                                                   │   │   │   │   ├── QuestionCard.tsx                                                         │   │   │   │   ├── QuizBuilder.tsx                                                          │   │   │   │   ├── QuizTaker.tsx                                                            │   │   │   │   └── Results.tsx                                                              │   │   │   ├── hooks                                                                        │   │   │   │   └── useQuizAttempt.ts                                                        │   │   │   └── index.ts                                                                     │   │   └── study                                                                            │   │       ├── components                                                                   │   │       │   ├── DueItems.tsx                                                             │   │       │   ├── Recommendations.tsx                                                      │   │       │   └── StudySession.tsx                                                         │   │       ├── hooks                                                                        │   │       │   └── useStudySession.ts                                                       │   │       └── index.ts                                                                     │   ├── pages                                                                                │   │   ├── analytics                                                                        │   │   │   └── AnalyticsPage.tsx                                                            │   │   ├── auth                                                                             │   │   │   ├── LoginPage.tsx                                                                │   │   │   └── RegisterPage.tsx                                                             │   │   ├── chat                                                                             │   │   │   └── ChatPage.tsx                                                                 │   │   ├── dashboard                                                                        │   │   │   └── DashboardPage.tsx                                                            │   │   ├── documents                                                                        │   │   │   └── DocumentsPage.tsx                                                            │   │   ├── flashcards                                                                       │   │   │   ├── DeckDetailPage.tsx                                                           │   │   │   ├── DecksPage.tsx                                                                │   │   │   └── ReviewPage.tsx                                                               │   │   ├── notes                                                                            │   │   │   ├── NoteDetailPage.tsx                                                           │   │   │   └── NotesPage.tsx                                                                │   │   ├── NotFoundPage.tsx                                                                 │   │   └── quizzes                                                                          │   │       ├── QuizTakePage.tsx                                                             │   │       └── QuizzesPage.tsx                                                              │   ├── router.tsx                                                                           │   ├── stores                                                                               │   │   ├── authStore.ts                                                                     │   │   ├── themeStore.ts                                                                    │   │   └── uiStore.ts                                                                       │   ├── styles                                                                               │   │   └── globals.css                                                                      │   └── types                                                                                │       ├── env.d.ts                                                                         │       └── index.ts                                                                         ├── tailwind.config.ts                                                                       ├── tsconfig.json                                                                            ├── tsconfig.node.json                                                                       └── vite.config.ts                                                                                                                                                                        54 directories, 136 files



# IMPLEMENTATION.md

This file provides guidance on implementing the Synapse frontend with specific library choices and patterns. Follow these guidelines to maintain consistency and avoid architectural drift.

## Tech Stack Overview

| Layer | Tool | Purpose |
|-------|------|---------|
| **Core Framework** | React 18+ (Vite) | Component architecture, virtual DOM, hooks system |
| **Language** | TypeScript (strict mode) | Type safety, OpenAPI integration, autocomplete |
| **UI Library** | Shadcn UI + Tailwind CSS | Customizable components, utility-first styling |
| **State Management** | TanStack Query + Zustand | Server state caching + local UI state |
| **Routing** | TanStack Router | Type-safe navigation with search params |
| **API Client** | Axios + OpenAPI TypeScript Generator | Auto-generated typed API client |

---

## Core Architecture Principles

### 1. Module Boundary Isolation
Each feature module (`src/modules/*`) is **self-contained**:
- Components in one module NEVER import from another module's components
- Modules only export through their `index.ts` barrel file
- Pages compose modules, modules don't compose each other

**Example:**
```typescript
// ❌ WRONG: Direct cross-module import
import { DeckList } from '@/modules/flashcards/components/DeckList';

// ✅ CORRECT: Import from module's public API
import { DeckList } from '@/modules/flashcards';
```

### 2. Server State vs UI State Separation
- **TanStack Query**: All data fetched from backend (flashcards, notes, analytics)
- **Zustand**: Transient UI state (sidebar open/closed, active review session, theme)

**Rule:** If it exists in the database, use TanStack Query. If it's temporary UI state, use Zustand.

### 3. Type Safety from OpenAPI
- **NEVER** manually write request/response types
- Always regenerate types after backend schema changes: `npm run generate:api`
- Use generated types: `import { FlashcardResponse } from '@/api/generated/models'`

---

## Specialty Libraries: Feature-by-Feature Implementation Guide

### A. Flashcards Module: Framer Motion

**Backend Endpoints:**
- `GET /api/v1/cards/due` - Fetch cards for review
- `POST /api/v1/cards/{card_id}/review` - Submit review with quality (0-5)

**Library:** `framer-motion` (v11.15.0+)

**What It Does:**
Framer Motion provides physics-based animations for the flashcard review experience. It handles:
1. **Card Flipping**: Smooth 3D rotation from front → back
2. **Swipe Gestures**: Drag left (hard) / right (easy) with spring physics
3. **Card Stack**: Animated entrance of next card after review
4. **Haptic Feedback**: Visual spring animations on user actions

**Implementation Pattern:**

**File:** `src/modules/flashcards/components/ReviewSession/SwipeGesture.tsx`

**Key Features to Implement:**
```typescript
import { motion, useMotionValue, useTransform } from 'framer-motion';

// 1. SWIPE DETECTION
const x = useMotionValue(0);
const rotate = useTransform(x, [-200, 0, 200], [-30, 0, 30]);
const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);

// 2. QUALITY MAPPING
// Swipe distance determines SM-2 quality score:
// - Left swipe (< -100px) = quality 1 (hard)
// - Slight right (100-200px) = quality 3 (good) 
// - Far right (> 200px) = quality 5 (easy)

// 3. DRAG CONSTRAINTS
<motion.div
  drag="x"
  dragConstraints={{ left: -300, right: 300 }}
  onDragEnd={(_, info) => {
    const threshold = 100;
    if (Math.abs(info.offset.x) > threshold) {
      const quality = calculateQuality(info.offset.x);
      submitReview(quality);
    }
  }}
/>
```

**File:** `src/modules/flashcards/components/ReviewSession/CardFlip.tsx`

**Key Features to Implement:**
```typescript
// 4. 3D FLIP ANIMATION
const [isFlipped, setIsFlipped] = useState(false);

<motion.div
  animate={{ rotateY: isFlipped ? 180 : 0 }}
  transition={{ duration: 0.6, type: 'spring' }}
  style={{ transformStyle: 'preserve-3d' }}
>
  {/* Front side with backfaceVisibility: 'hidden' */}
  {/* Back side with rotateY: 180 and backfaceVisibility: 'hidden' */}
</motion.div>
```

**Critical Implementation Details:**
- Use `useMotionValue` for performance (bypasses React re-renders)
- Implement `dragElastic={0.2}` for realistic resistance
- Add visual indicators: Green overlay on right swipe, red on left
- Show quality score preview during drag: "Again" / "Good" / "Easy"
- Play exit animation before removing card from DOM

**Backend Integration:**
```typescript
// After swipe completes
const { mutate: submitReview } = useMutation({
  mutationFn: (data: { quality: number; time_taken_ms: number }) =>
    FlashcardsService.reviewCard(cardId, data),
  onSuccess: (result) => {
    // result.next_review_date contains next SM-2 interval
    queryClient.invalidateQueries(['flashcards', 'due']);
  }
});
```

---

### B. Documents Module: React Dropzone

**Backend Endpoints:**
- `POST /api/v1/documents/upload` - Upload file (multipart/form-data)
- `GET /api/v1/documents/{id}/status` - Poll processing status
- WebSocket: `ws://api/v1/ws/documents/{id}` - Real-time processing updates

**Library:** `react-dropzone` (v14.3.5+)

**What It Does:**
React Dropzone creates a drag-and-drop zone for file uploads with:
1. **Drag State Detection**: Visual feedback during hover
2. **File Validation**: MIME type checking (PDF, DOCX, TXT, MD, EPUB)
3. **Multi-file Support**: Batch upload handling
4. **Preview Generation**: Show file metadata before upload

**Implementation Pattern:**

**File:** `src/modules/documents/components/DocumentUploader.tsx`

**Key Features to Implement:**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
  accept: {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/epub+zip': ['.epub'],
  },
  maxSize: 50 * 1024 * 1024, // 50MB limit
  maxFiles: 5,
  onDrop: (files) => handleUpload(files),
});
```

**File:** `src/modules/documents/components/ProcessingStatus.tsx`

**Key Features to Implement:**
```typescript
// 1. UPLOAD PROGRESS
const uploadMutation = useMutation({
  mutationFn: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post('/api/v1/documents/upload', formData, {
      onUploadProgress: (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
        setUploadProgress(percent);
      },
    });
  },
});

// 2. PROCESSING STATUS POLLING
const { data: status } = useQuery({
  queryKey: ['document', documentId, 'status'],
  queryFn: () => DocumentsService.getProcessingStatus(documentId),
  refetchInterval: (data) => {
    // Poll every 2s while processing, stop when completed/failed
    return data?.status === 'processing' ? 2000 : false;
  },
});

// 3. STATUS VISUALIZATION (Shadcn Progress component)
<Progress 
  value={status?.progress_percentage} 
  className="w-full"
/>
<Badge variant={statusVariant(status?.status)}>
  {status?.status.toUpperCase()}
</Badge>
```

**Critical Implementation Details:**
- Show file previews: Name, size, type icon
- Display upload progress: 0-100% for network transfer
- Display processing progress: Backend's `progress_percentage` field
- Handle errors gracefully: Show retry button on failure
- Implement drag overlay: Full-screen drop zone when dragging files over window
- Add file size warnings: Alert if file > 10MB (slow processing)

**Real-time Processing Updates (Optional Enhancement):**
```typescript
// Use WebSocket for live processing updates instead of polling
const socket = useWebSocket(`/ws/documents/${documentId}`);

socket.on('processing_update', (data) => {
  // data: { progress: 45, message: "Extracting text from page 12/50" }
  setProcessingStatus(data);
});
```

---

### C. Notes Module: BlockNote

**Backend Endpoints:**
- `GET /api/v1/notes/tree` - Hierarchical note structure
- `POST /api/v1/notes` - Create note with content
- `PUT /api/v1/notes/{id}` - Update (creates new version)
- `GET /api/v1/notes/{id}/versions` - Version history

**Library:** `@blocknote/react` + `@blocknote/core` (v0.18.4+)

**What It Does:**
BlockNote provides a Notion-like block-based editor with:
1. **Rich Text Blocks**: Headings, lists, code blocks, quotes
2. **Markdown Support**: Auto-converts markdown syntax (e.g., `# ` → Heading)
3. **Drag & Drop**: Reorder blocks with drag handles
4. **Slash Commands**: Type `/` to insert blocks
5. **Collaboration Ready**: Built-in Y.js support for future real-time editing

**Implementation Pattern:**

**File:** `src/modules/notes/components/NoteEditor.tsx`

**Key Features to Implement:**
```typescript
import { useBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/react';
import '@blocknote/core/style.css';

const editor = useBlockNote({
  initialContent: note?.content ? JSON.parse(note.content) : undefined,
  onEditorContentChange: (editor) => {
    // Auto-save debounced content
    const markdown = editor.blocksToMarkdown(editor.topLevelBlocks);
    debouncedSave(markdown);
  },
  uploadFile: async (file: File) => {
    // Handle image uploads (future feature)
    const url = await uploadToBackend(file);
    return url;
  },
});

// CRITICAL: Backend expects `format: "markdown"` in NoteCreate schema
const handleSave = useMutation({
  mutationFn: (content: string) =>
    NotesService.createNote({
      title: noteTitle,
      content: content, // Markdown string
      format: 'markdown',
      parent_id: parentId,
    }),
});
```

**File:** `src/modules/notes/components/NoteTree.tsx`

**Key Features to Implement:**
```typescript
// Hierarchical tree from GET /api/v1/notes/tree
interface NoteTreeNode {
  id: number;
  title: string;
  parent_id: number | null;
  children: NoteTreeNode[];
}

// Recursive tree rendering
const TreeNode = ({ node }: { node: NoteTreeNode }) => (
  <div className="pl-4">
    <button onClick={() => openNote(node.id)}>
      {node.children.length > 0 && <ChevronRight />}
      {node.title}
    </button>
    {node.children.map(child => <TreeNode key={child.id} node={child} />)}
  </div>
);
```

**File:** `src/modules/notes/components/VersionHistory.tsx`

**Key Features to Implement:**
```typescript
// Display version history from GET /api/v1/notes/{id}/versions
const { data: versions } = useQuery({
  queryKey: ['notes', noteId, 'versions'],
  queryFn: () => NotesService.getNoteVersions(noteId),
});

// Show diff between versions (use `diff` library)
import { diffLines } from 'diff';

const changes = diffLines(oldVersion.content, newVersion.content);
```

**Critical Implementation Details:**
- Implement auto-save: Debounce 2 seconds after typing stops
- Show save indicator: "Saving..." → "Saved" with checkmark
- Handle version conflicts: If backend version > local version, show merge dialog
- Add keyboard shortcuts: `Cmd+S` to force save, `Cmd+B` for bold
- Implement note linking: `[[Note Title]]` auto-completes to other notes
- Store content as **Markdown** in backend (not BlockNote's JSON format for simplicity)

**Backend Format Mapping:**
```typescript
// BlockNote → Backend
const blocks = editor.topLevelBlocks;
const markdown = editor.blocksToMarkdown(blocks);
// Send markdown to backend with format: 'markdown'

// Backend → BlockNote
const blocks = editor.markdownToBlocks(note.content);
editor.replaceBlocks(editor.topLevelBlocks, blocks);
```

---

### D. Analytics Module: Recharts

**Backend Endpoints:**
- `GET /api/v1/analytics/overview` - Dashboard metrics
- `GET /api/v1/analytics/weak-areas` - Topics needing practice
- `GET /api/v1/analytics/performance?days=30` - Time series data
- `GET /api/v1/analytics/heatmap?days=365` - Activity calendar
- `GET /api/v1/analytics/topics` - Mastery scores per deck

**Library:** `recharts` (v2.14.1+)

**What It Does:**
Recharts provides composable, declarative charts built on D3.js primitives:
1. **Responsive Charts**: Auto-resize to container
2. **Tooltips**: Hover for detailed data points
3. **Animations**: Smooth transitions on data updates
4. **Customization**: Full control over colors, labels, axes

**Implementation Pattern:**

**File:** `src/modules/analytics/components/PerformanceTrends.tsx`

**Chart Type:** Line Chart with Area Fill

**Backend Data Shape:**
```typescript
interface PerformanceTrend {
  date: string;           // "2025-01-15"
  reviews_count: number;  // 45
  accuracy: number;       // 0.87 (87%)
  study_time_minutes: number; // 32
}
```

**Key Features to Implement:**
```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';

const { data } = useQuery({
  queryKey: ['analytics', 'performance', days],
  queryFn: () => AnalyticsService.getPerformance({ days }),
});

<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis 
      dataKey="date" 
      tickFormatter={(date) => format(new Date(date), 'MMM dd')}
    />
    <YAxis yAxisId="left" />
    <YAxis yAxisId="right" orientation="right" />
    <Tooltip 
      labelFormatter={(date) => format(new Date(date), 'PPP')}
      formatter={(value: number, name: string) => {
        if (name === 'accuracy') return `${(value * 100).toFixed(1)}%`;
        return value;
      }}
    />
    <Line 
      yAxisId="left"
      type="monotone" 
      dataKey="reviews_count" 
      stroke="#8884d8" 
      name="Reviews"
    />
    <Line 
      yAxisId="right"
      type="monotone" 
      dataKey="accuracy" 
      stroke="#82ca9d" 
      name="Accuracy"
    />
  </LineChart>
</ResponsiveContainer>
```

**File:** `src/modules/analytics/components/HeatMap.tsx`

**Chart Type:** Custom Calendar Heatmap (GitHub-style)

**Backend Data Shape:**
```typescript
interface HeatmapData {
  date: string;        // "2025-01-15"
  activity_count: number; // 23 (reviews that day)
}
```

**Key Features to Implement:**
```typescript
// Use Recharts' ResponsiveContainer with custom rendering
// Render 52 weeks × 7 days = 364 cells
const getColorIntensity = (count: number) => {
  if (count === 0) return 'bg-gray-100';
  if (count < 5) return 'bg-green-200';
  if (count < 10) return 'bg-green-400';
  if (count < 20) return 'bg-green-600';
  return 'bg-green-800';
};

<div className="grid grid-cols-53 gap-1">
  {heatmapData.map(day => (
    <div
      key={day.date}
      className={`w-3 h-3 rounded-sm ${getColorIntensity(day.activity_count)}`}
      title={`${day.date}: ${day.activity_count} reviews`}
    />
  ))}
</div>
```

**File:** `src/modules/analytics/components/WeakAreasChart.tsx`

**Chart Type:** Horizontal Bar Chart

**Backend Data Shape:**
```typescript
interface WeakArea {
  topic: string;       // "Calculus Deck"
  accuracy: number;    // 0.45 (45%)
  review_count: number; // 67
  severity: string;    // "high" | "medium" | "low"
}
```

**Key Features to Implement:**
```typescript
import { BarChart, Bar, XAxis, YAxis, Cell } from 'recharts';

const getBarColor = (accuracy: number) => {
  if (accuracy < 0.5) return '#ef4444'; // red
  if (accuracy < 0.7) return '#f59e0b'; // yellow
  return '#10b981'; // green
};

<BarChart layout="vertical" data={weakAreas}>
  <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${v * 100}%`} />
  <YAxis type="category" dataKey="topic" width={150} />
  <Tooltip 
    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
  />
  <Bar dataKey="accuracy">
    {weakAreas.map((entry, index) => (
      <Cell key={index} fill={getBarColor(entry.accuracy)} />
    ))}
  </Bar>
</BarChart>
```

**File:** `src/modules/analytics/components/MasteryRadar.tsx`

**Chart Type:** Radar Chart (Spider Chart)

**Backend Data Shape:**
```typescript
interface TopicMastery {
  topic: string;          // "Biology Deck"
  mastery_score: number;  // 0.85 (85%)
  card_count: number;     // 120
  avg_ease_factor: number; // 2.5
}
```

**Key Features to Implement:**
```typescript
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

<RadarChart data={masteryData}>
  <PolarGrid />
  <PolarAngleAxis dataKey="topic" />
  <PolarRadiusAxis domain={[0, 1]} tickFormatter={(v) => `${v * 100}%`} />
  <Radar 
    dataKey="mastery_score" 
    stroke="#8884d8" 
    fill="#8884d8" 
    fillOpacity={0.6} 
  />
</RadarChart>
```

**Critical Implementation Details:**
- All charts must be wrapped in `<ResponsiveContainer>` for mobile support
- Use `date-fns` for date formatting (already in package.json)
- Implement loading skeletons: Show `<Skeleton>` component while fetching
- Add empty states: "No data available for this period"
- Color accessibility: Ensure 4.5:1 contrast ratio for text on charts
- Export functionality: Add "Download CSV" button for all charts
- Implement time range selector: Last 7 days / 30 days / 90 days / All time

---

## State Management Patterns

### TanStack Query Usage

**All API calls MUST use TanStack Query hooks:**

```typescript
// ✅ CORRECT: Declarative, cached, handles loading/error states
const { data, isLoading, error } = useQuery({
  queryKey: ['flashcards', 'due', deckId],
  queryFn: () => FlashcardsService.getDueCards({ deckId }),
});

// ❌ WRONG: Manual axios call, no caching, manual state management
const [data, setData] = useState(null);
useEffect(() => {
  axios.get('/api/v1/cards/due').then(setData);
}, []);
```

**Mutations for Write Operations:**
```typescript
const { mutate, isPending } = useMutation({
  mutationFn: (data: FlashcardCreate) => FlashcardsService.createCard(data),
  onSuccess: () => {
    queryClient.invalidateQueries(['flashcards']);
    toast.success('Card created!');
  },
});
```

### Zustand Usage

**Only for transient UI state:**

```typescript
// src/stores/uiStore.ts
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

---

## Error Handling Standards

### API Errors
```typescript
const { data, error } = useQuery({
  queryKey: ['notes', noteId],
  queryFn: () => NotesService.getNote(noteId),
  retry: (failureCount, error) => {
    // Don't retry 404s (note not found)
    if (error.response?.status === 404) return false;
    return failureCount < 3;
  },
});

if (error) {
  return <ErrorBoundary error={error} />;
}
```

### Form Validation
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const noteSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
});

const form = useForm({
  resolver: zodResolver(noteSchema),
});
```

---

## Performance Guidelines

1. **Lazy Load Heavy Components:**
```typescript
const BlockNoteEditor = lazy(() => import('@blocknote/react'));
```

2. **Virtualize Long Lists:**
```typescript
// For 1000+ flashcards, use @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';
```

3. **Optimize Framer Motion:**
```typescript
// Use useMotionValue for dragging (bypasses React renders)
const x = useMotionValue(0);
```

4. **Debounce Search/Autosave:**
```typescript
import { useDebounce } from '@/hooks/useDebounce';
const debouncedQuery = useDebounce(searchQuery, 500);
```

---

## Testing Strategy

1. **Component Tests:** Jest + React Testing Library
2. **E2E Tests:** Playwright (future)
3. **API Mocking:** MSW (Mock Service Worker)

**Example:**
```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useFlashcards } from '@/api/hooks/useFlashcards';

test('fetches due cards', async () => {
  const { result } = renderHook(() => useFlashcards.useDueCards());
  
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data).toHaveLength(5);
  });
});
```

---

## Common Pitfalls to Avoid

1. **❌ Don't use mock data or placeholder APIs** - Always connect to real backend
2. **❌ Don't fetch data in useEffect** - Use TanStack Query
3. **❌ Don't store server data in useState** - Use TanStack Query cache
4. **❌ Don't mutate Zustand state directly** - Use store actions
5. **❌ Don't use inline styles** - Use Tailwind classes
6. **❌ Don't import Shadcn components directly** - Use `@/components/ui/*`
7. **❌ Don't hardcode API URLs** - Use generated services and env variables
8. **❌ Don't skip loading states** - Always handle `isLoading`
9. **❌ Don't ignore TypeScript errors** - Fix them, don't use `@ts-ignore`
10. **❌ Don't copy backend code into frontend** - Use APIs, understand logic
11. **❌ Don't build UI before backend is running** - Verify endpoints work first
12. **❌ Don't commit without testing against real backend** - Ensure API calls succeed

---

## Development Workflow

**CRITICAL: Backend must be running for all development.**

This frontend is designed for **single-pass implementation** - no mock data, no placeholders. Every component connects to real backend APIs from day one.

### Setup Sequence

1. **Start backend (REQUIRED):**
   ```bash
   cd backend && make dev
   # Backend must be running on http://localhost:8000
   # Verify: curl http://localhost:8000/ping
   ```

2. **Copy OpenAPI schema:**
   ```bash
   # From backend root, copy the generated schema
   cp openapi.json ../frontend/
   ```

3. **Generate API types:**
   ```bash
   cd frontend
   npm run generate:api
   # This creates typed API clients from openapi.json
   ```

4. **Start frontend:**
   ```bash
   npm run dev
   # Frontend runs on http://localhost:3000
   # Vite proxy forwards /api/* to backend
   ```

5. **Verify connection:**
   ```bash
   # Open http://localhost:3000
   # Check browser console - no CORS errors
   # Try login/register - should hit real backend
   ```

### Daily Development Loop

```bash
# Terminal 1: Backend (always running)
cd backend && make dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Type checking (optional)
cd frontend && npm run type-check -- --watch
```

### When Backend Schema Changes

```bash
# Backend made changes to API
cd backend
# FastAPI auto-regenerates openapi.json on restart

# Copy updated schema
cp openapi.json ../frontend/

# Regenerate types
cd ../frontend
npm run generate:api

# TypeScript will now show errors if frontend doesn't match
npm run type-check
```

---

## File Naming Conventions

- **Components:** PascalCase - `FlashcardEditor.tsx`
- **Hooks:** camelCase with "use" prefix - `useReviewSession.ts`
- **Stores:** camelCase with "Store" suffix - `authStore.ts`
- **Utils:** camelCase - `formatDate.ts`
- **Types:** PascalCase - `FlashcardResponse` (from generated)

---

## Import Order

```typescript
// 1. React imports
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

// 3. Internal aliases
import { FlashcardsService } from '@/api/generated/services';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

// 4. Relative imports
import { CardFlip } from './CardFlip';
import { calculateQuality } from '../utils';

// 5. Types (always last)
import type { FlashcardResponse } from '@/api/generated/models';
```

## Backend Integration Requirements

**This section documents WHEN to request specific backend files for implementation.**

### Files You Already Have
- ✅ `openapi.json` - Complete API specification (already in frontend root)
- ✅ `IMPLEMENTATION.md` - This file

### Files You'll Need During Implementation

#### 1. Environment Configuration (Needed: Day 1)

**When:** Setting up project

**Request from backend:**
```bash
backend/.env.example
```

**What to create in frontend:**
```bash
# frontend/.env.local
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

**Why:** Configure API endpoints for development vs production.

---

#### 2. Authentication Flow (Needed: Building Login/Register)

**When:** Implementing `src/pages/auth/LoginPage.tsx`

**What you need from backend:**
- Verify JWT token structure (already in openapi.json)
- Confirm token expiration time
- Test actual login endpoint

**Backend endpoints to verify:**
```bash
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET /api/v1/auth/me
```

**Test command:**
```bash
# Verify backend auth works
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'
```

**No backend files needed** - just running backend server.

---

#### 3. Document Processing (Needed: Building Document Upload)

**When:** Implementing `src/modules/documents/components/DocumentUploader.tsx`

**What you need to understand:**
- How processing status updates work
- What triggers document chunking
- How embeddings are generated

**Backend endpoints to test:**
```bash
POST /api/v1/documents/upload (multipart/form-data)
GET /api/v1/documents/{id}/status
GET /api/v1/documents/{id}/chunks
```

**Backend file to reference (READ ONLY):**
```bash
backend/app/services/background/document_processor.py
```

**Why:** Understand processing stages so you can show accurate progress in UI.

**What to look for:**
- Processing status transitions: pending → processing → completed
- Error conditions: What makes status = "failed"
- Chunk generation logic: Why might chunk_count be 0?

**Test command:**
```bash
# Upload a test document
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@test_document.pdf"
```

---

#### 4. Flashcard Review Algorithm (Needed: Building Review Session)

**When:** Implementing `src/modules/flashcards/components/ReviewSession/`

**What you need to understand:**
- How quality ratings (0-5) map to next review intervals
- What happens when you review a card

**Backend SQL function to reference (READ ONLY):**
```bash
backend/app/sql/functions/flashcards/calculate_sm2.sql
backend/app/sql/functions/flashcards/record_review.sql
```

**Why:** Understand what the backend calculates so you can show accurate predictions in UI.

**What to look for:**
- Quality 0-2 (Again): Resets card to learning state
- Quality 3-5 (Good/Easy): Increases interval
- Ease factor adjustments: How much does quality affect future intervals?

**Test command:**
```bash
# Submit a review
curl -X POST http://localhost:8000/api/v1/cards/1/review \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quality": 4, "time_taken_ms": 3500}'
```

**Important:** You're not copying code, just understanding the algorithm to build appropriate UI feedback.

---

#### 5. WebSocket Protocol (Needed: Building Chat/Real-time Features)

**When:** Implementing `src/modules/chat/hooks/useChatWebSocket.ts`

**Backend file to reference (READ ONLY):**
```bash
backend/app/api/websockets/protocol.py
backend/app/api/websockets/chat.py
```

**Why:** Understand message format for WebSocket events.

**What to look for:**
- Message types: What's the JSON structure of messages?
- Connection lifecycle: When does server send 'connected' event?
- Error handling: How are errors communicated?

**Example message format to implement:**
```typescript
// Incoming from backend
type ChatWSMessage = 
  | { type: 'connected', session_id: number }
  | { type: 'message', role: 'assistant', content: string, streaming: boolean }
  | { type: 'error', message: string };

// Outgoing to backend
type ChatClientMessage = 
  | { type: 'message', content: string };
```

**Test WebSocket connection:**
```bash
# Use wscat to test WebSocket
npm install -g wscat
wscat -c "ws://localhost:8000/ws/chat/1?token=YOUR_JWT_TOKEN"
```

---

#### 6. Analytics SQL Functions (Needed: Building Analytics Charts)

**When:** Implementing `src/modules/analytics/components/`

**Backend files to reference (READ ONLY):**
```bash
backend/app/sql/functions/analytics/user_performance.sql
backend/app/sql/functions/analytics/learning_velocity.sql
backend/app/sql/functions/context/detect_weak_areas.sql
```

**Why:** Understand data aggregation logic so you can add helpful UI explanations.

**What to look for:**
- Weak areas: What accuracy threshold defines "weak"?
- Mastery scores: How is mastery calculated from ease_factor?
- Performance trends: What date grouping is used?

**Test command:**
```bash
# Get analytics data
curl -X GET http://localhost:8000/api/v1/analytics/weak-areas \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Important:** You're not running SQL directly, just understanding what the endpoints return.

---

#### 7. Context Engine (Needed: Building Context-Aware Features)

**When:** Implementing `src/modules/chat/components/ContextPanel.tsx`

**Backend file to reference (READ ONLY):**
```bash
backend/app/core/context/engine.py
backend/app/sql/functions/context/build_user_context.sql
```

**Why:** Show users what context the AI tutor is using.

**What to look for:**
- What modules contribute to context?
- How are weak areas identified?
- What information is prioritized?

**Test command:**
```bash
# Chat endpoints automatically use context
# You can see context in AI responses by enabling debug mode
curl -X POST http://localhost:8000/api/v1/chat/sessions/1/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Explain photosynthesis"}'
```

---

### Backend Files You DON'T Need

**Never request these files:**
- ❌ Backend Python implementation files (unless READ ONLY for understanding)
- ❌ Database migration files
- ❌ Backend `.env` secrets
- ❌ Backend requirements.txt
- ❌ Backend Alembic configs
- ❌ Backend SQL initialization scripts

**Why:** Frontend only communicates via REST/WebSocket APIs. Implementation details are backend's concern.

---

### How to Request Backend Information

**Format your requests like this:**

**❌ Wrong:**
"Give me the document_processor.py file"

**✅ Correct:**
"I'm implementing document upload progress tracking in `DocumentUploader.tsx`. I need to understand the processing stages (pending → processing → completed) to show accurate UI. Can you show me the relevant parts of `document_processor.py` that define these stages?"

**Why:** You're asking for understanding, not copying code. This keeps frontend/backend separation clear.

Before building a feature, ask:

1. **Does this data exist in the backend?** → Use TanStack Query
2. **Is this UI state that survives navigation?** → Use Zustand
3. **Is this a one-time action?** → Use `useMutation`
4. **Does this need real-time updates?** → Check if WebSocket endpoint exists
5. **Is this a shared component?** → Place in `components/common/`
6. **Is this module-specific?** → Place in `modules/{module}/components/`

---

## Summary: Implementation Checklist

**PRE-IMPLEMENTATION (Before writing code):**
- [ ] Backend is running on http://localhost:8000
- [ ] Test backend health: `curl http://localhost:8000/ping`
- [ ] Copy `openapi.json` from backend to frontend root
- [ ] Run `npm run generate:api` successfully
- [ ] Create `.env.local` with `VITE_API_URL`

**When implementing a new feature:**

- [ ] Check `openapi.json` for relevant endpoints
- [ ] Test endpoints with curl/Postman to see real responses
- [ ] If endpoint behavior is unclear, request READ ONLY access to backend file
- [ ] Create TanStack Query hook in `src/api/hooks/`
- [ ] Build module components in `src/modules/{module}/`
- [ ] Export components via `src/modules/{module}/index.ts`
- [ ] Create page component in `src/pages/{module}/`
- [ ] Add route to `src/router.tsx`
- [ ] Test with backend running (no mocks!)
- [ ] Handle loading, error, and empty states
- [ ] Add TypeScript types from generated models (no `any`)
- [ ] Verify network tab shows successful API calls
- [ ] Format code: `npm run format`
- [ ] Type check: `npm run type-check`

**POST-IMPLEMENTATION (Before considering feature complete):**
- [ ] Feature works with real backend data
- [ ] Error states handled (network errors, validation errors)
- [ ] Loading states show during async operations
- [ ] Empty states show when no data exists
- [ ] TypeScript has no errors or warnings
- [ ] Console has no errors or warnings
- [ ] Mobile responsive (test on small screen)

---

**This guide is your source of truth. When in doubt, refer back here.**

**Remember: No mocks, no placeholders. Build once, build right, against real backend.**
