# Shared Module Deep Dive Audit

> **Status**: INFRASTRUCTURE COMPLETE ✅ | MIGRATION PENDING 🟡

## 1. Executive Summary

The shared module infrastructure is now **fully implemented**. The codebase has a true contract layer for cross-module communication.

**Completed**:

- `shared/events/` — EventBus, EventEnvelope, React hooks
- `shared/entities/` — EntityRef, type-safe factory functions
- `shared/time/` — Mockable clock, duration utilities, TimeWindow
- `shared/async/` — AsyncState discriminated union
- `shared/errors/` — AppError base type, severity levels
- `shared/rendering/` — MarkdownRenderer (existing)

---

## 2. Implemented Architecture

```
shared/
├── events/
│   ├── EventEnvelope.ts      ✅ NEW
│   ├── EventBus.ts           ✅ NEW
│   ├── useSubscription.ts    ✅ NEW
│   └── index.ts              ✅ NEW
├── entities/
│   ├── EntityRef.ts          ✅ NEW
│   └── index.ts              ✅ NEW
├── time/
│   ├── clock.ts              ✅ NEW
│   ├── duration.ts           ✅ NEW
│   └── index.ts              ✅ NEW
├── async/
│   ├── AsyncState.ts         ✅ NEW
│   └── index.ts              ✅ NEW
├── errors/
│   ├── AppError.ts           ✅ NEW
│   └── index.ts              ✅ NEW
├── rendering/
│   └── MarkdownRenderer.tsx  ✅ EXISTING
└── index.ts                  ✅ NEW (root barrel)
```

---

## 3. Remaining Migration Tasks

### 🔴 Phase 1: Refactor Module Events (Critical)

The old per-module event systems must be refactored to use the shared EventBus.

| Module    | File to Refactor                              | Action                                      |
| --------- | --------------------------------------------- | ------------------------------------------- |
| Notes     | `modules/notes/core/engine/events.ts`         | Keep payload types, replace emitter logic   |
| Quizzes   | `modules/quizzes/core/events.ts`              | Keep payload types, replace emitter logic   |
| Documents | `modules/documents/core/events.ts`            | Keep payload types, replace emitter logic   |
| Graph     | `modules/graph/core/eventConsumer.ts`         | Subscribe to shared EventBus instead        |

**Pattern**:

```typescript
// OLD (module-specific)
import { emitNoteEvent, noteCreated } from "./events";
emitNoteEvent(noteCreated(123, null));

// NEW (shared bus)
import { emitEvent, createEvent, noteRef, EventTypes } from "@/shared";
emitEvent(createEvent(EventTypes.NOTE_CREATED, { parentId: null }, noteRef(123)));
```

---

### 🟡 Phase 2: UI Consolidation

| Source                                              | Target                        | Action |
| --------------------------------------------------- | ----------------------------- | ------ |
| `components/common/EmptyState.tsx`                  | `shared/ui/EmptyState.tsx`    | Move   |
| `pages/flashcards/shared/components/EmptyState.tsx` | DELETE                        | Remove |
| `components/common/LoadingSpinner.tsx`              | `shared/ui/LoadingState.tsx`  | Move   |
| `components/common/ErrorState.tsx`                  | `shared/ui/ErrorState.tsx`    | Move   |
| `pages/flashcards/study/components/AuroraBackground.tsx` | `shared/ui/backgrounds/` | Move   |

---

### 🟡 Phase 3: Rendering Cleanup

| Source                                              | Action                                  |
| --------------------------------------------------- | --------------------------------------- |
| `modules/notes/editor/components/MarkdownPreview.tsx` | Replace with shared MarkdownRenderer |

---

## 4. How to Use the New Infrastructure

### EventBus

```typescript
// Subscribe (React component)
import { useSubscription, EventTypes } from "@/shared";

useSubscription(EventTypes.NOTE_CREATED, (event) => {
  console.log("Note created:", event.entity);
});

// Emit (anywhere)
import { emitEvent, createEvent, noteRef } from "@/shared";

emitEvent(createEvent(
  EventTypes.NOTE_CREATED,
  { parentId: null },
  noteRef(123, "My Note")
));
```

### EntityRef

```typescript
import { noteRef, quizRef, isSameEntity } from "@/shared";

const a = noteRef(123);
const b = quizRef(456);

console.log(isSameEntity(a, a)); // true
console.log(isSameEntity(a, b)); // false
```

### AsyncState

```typescript
import { AsyncState, isLoading, isSuccess, success } from "@/shared";

function MyComponent({ state }: { state: AsyncState<User> }) {
  if (isLoading(state)) return <LoadingState />;
  if (isSuccess(state)) return <UserCard user={state.data} />;
  return <ErrorState error={state.error} />;
}
```

---

## 5. Final Verdict

| Area              | Status    |
| ----------------- | --------- |
| Infrastructure    | ✅ DONE   |
| TypeScript builds | ✅ CLEAN  |
| Module migration  | 🟡 PENDING |
| UI consolidation  | 🟡 PENDING |

**Next Step**: Refactor `modules/notes/core/engine/events.ts` to use the shared EventBus.
