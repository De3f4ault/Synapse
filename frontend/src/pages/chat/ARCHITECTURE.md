o ---

## Integration Invariants (ChatPage)

These rules govern how modules compose. Violating any = **reject the PR**.

### 1. ChatPage holds no domain state

ChatPage is an orchestration boundary. It coordinates EVERYTHING, owns NOTHING.

### 2. ChatPage does not talk to WebSockets

WebSocket logic lives in `core/hooks/useChatStreaming` and `voice/hooks/useLiveVoice`.

### 3. ChatPage does not query data directly

All data access goes through module public APIs (`sidebar/`, `core/`).

### 4. ChatPage never imports from `engine/`

Engine modules are internal implementation details.

### 5. All modules remain independently removable

> "Can we delete the entire `voice/` folder and only touch ChatPage imports?"
> If **yes** → architecture is correct.
> If **no** → coupling exists.

---

## Module Structure

```
chat/
├── ChatPage.tsx          # Orchestrator only
├── ChatLayout.tsx        # Visual composition
├── ChatProviders.tsx     # Cross-cutting providers
├── ARCHITECTURE.md       # This file
├── core/                 # Chat messages + streaming
│   ├── engine/
│   ├── state/
│   ├── hooks/
│   └── components/
├── search/               # Conversation search
│   ├── engine/           # Pure logic
│   ├── state/            # Zustand store
│   ├── hooks/            # React adapters
│   ├── components/       # UI
│   └── utils/            # UI helpers
├── voice/                # Live voice mode
│   ├── engine/
│   ├── state/
│   ├── hooks/
│   └── components/
└── sidebar/              # Session management
    ├── engine/
    ├── state/
    ├── hooks/
    └── components/
```

---

## Authority Domains (Final)

| Concern | Owner | Notes |
|---------|-------|-------|
| Messages (persisted) | React Query (`core/hooks`) | Server cache |
| Sessions (persisted) | React Query (`sidebar/hooks`) | Server cache |
| Streaming tokens | `core/state/chatStore` | Ephemeral |
| Search index/results | `search/state/searchStore` | Client-only |
| Voice lifecycle | `voice/state/voiceStore` | Client-only |
| Sidebar UI (filter/rename) | `sidebar/state/sidebarStore` | Client-only |
| Routing | `ChatPage` | URL params only |
| Layout | `ChatLayout` | Pure composition |

**If two owners appear → you've introduced a bug.**

React Query = server truth. Zustand = client ephemeral truth.

---

## Cross-Module Contracts

### Contract #1: Session Boundary

When `sessionId` changes, all stores reset via `resetForSession(sessionId)`.

- **Enforced in**: `ChatProviders.tsx`
- **Idempotent**: Safe to call multiple times with same sessionId
- **Prevents**: State leaks between sessions

### Contract #2: Backpressure / Flow Control

When `streamingPaused=true`, tokens buffer instead of append.

- **Enforced in**: `core/state/chatStore`
- **Methods**: `pauseStream()`, `resumeStream()`
- **Invariant**: Buffered tokens preserve sequence order

### Contract #3: Per-Module Error Ownership

Each module owns its own error state.

| Module | Error State |
|--------|-------------|
| core | `chatStore.error` |
| search | `searchStore.error` |
| voice | `voiceStore.error` |

### Contract #4: Monotonic Sequence IDs

`lastSequenceId` increments on each token append.

- **Enforced in**: `core/state/chatStore`
- **Scope**: Monotonic per session, not globally unique
- **Prevents**: Stale navigation after edits

### Contract #5: Deletion Semantics (Deferred)

> **Future Implementation**

When messages are deleted:

- Search index ignores tombstoned messages
- Streaming aborts gracefully if mid-stream

---

## Contract → Enforcement Map

| Contract | Enforced In | Violations Caught |
|----------|-------------|-------------------|
| Session Boundary | `ChatProviders` | State leaks |
| Backpressure | `chatStore` | Render overload |
| Error Ownership | Stores | Cross-module crashes |
| Monotonic IDs | `chatStore` | Stale navigation |
| Deletion | Architecture | Undefined behavior |
