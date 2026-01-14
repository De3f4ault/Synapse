# Synapse Audio Platform — Design Doctrine

> *A cognitive audio runtime that supports learning without manipulating behavior.*

---

## Core Philosophy

### The Platform Is Boring

The audio platform deliberately avoids cleverness. It:

- Executes commands, never interprets intent
- Follows policy, never improvises
- Records history, never predicts
- Suggests defaults, never forces behavior

**Boring is correct. Boring is trustworthy.**

### User Agency Is Sacred

The user can always:

- Override any automatic behavior
- Disable any autonomy feature
- See what the system knows about them
- Delete any learned preference

**The system serves, never controls.**

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    UI INTEGRATION HOOKS                      │
│  useTTSAutoRead · useTTSFlashcard · useAutonomousAudio      │
├─────────────────────────────────────────────────────────────┤
│                      AUTONOMY LAYER                          │
│  AutonomyManager · ConsentStore · useAutonomy               │
├─────────────────────────────────────────────────────────────┤
│                   INTELLIGENCE LAYER                         │
│  ListeningModel · Heuristics · Types                        │
├─────────────────────────────────────────────────────────────┤
│                     CONTEXT LAYER                            │
│  AudioContextResolver · RouteProvider · Profiles            │
├─────────────────────────────────────────────────────────────┤
│                     CLIENTS LAYER                            │
│  FocusMusicClient · TTSClient · NotificationClient          │
├─────────────────────────────────────────────────────────────┤
│                     POLICY LAYER                             │
│  SoundPolicy · DuckingPolicy                                │
├─────────────────────────────────────────────────────────────┤
│                   PERSISTENCE LAYER                          │
│  AudioDatabase · SessionManager · PlaylistService           │
├─────────────────────────────────────────────────────────────┤
│                      CORE LAYER                              │
│  AudioEngine · AudioGraph · AudioPlayback · AudioDucking    │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer Contracts

### Core Layer

**Owns**: WebAudio API, node topology, time

**Rules**:
- AudioEngine is the singleton coordinator
- AudioGraph owns the node topology
- AudioPlayback handles track lifecycle
- AudioDucking handles volume automation
- Time flows only from AudioContext

**Never**: Makes decisions. Only executes.

---

### Policy Layer

**Owns**: Priority arbitration, ducking decisions

**Rules**:
- SoundPolicy maintains the source registry
- Priority determines who plays
- DuckingPolicy decides who ducks whom
- Decisions are deterministic

**Never**: Talks to UI. Only applies rules.

---

### Persistence Layer

**Owns**: IndexedDB, session history, playback state

**Rules**:
- AudioDatabase provides storage
- SessionManager tracks session lifecycle
- PlaylistService manages playlists
- All writes are explicit, never automatic

**Never**: Interprets data. Only stores.

---

### Clients Layer

**Owns**: External API for audio features

**Rules**:
- Clients register with SoundPolicy once
- Clients call SessionManager for tracking
- Clients are stateless where possible
- Clients check context before acting

**Never**: Access AudioEngine directly (except through delegation).

---

### Context Layer

**Owns**: Environmental awareness

**Rules**:
- AudioContextResolver detects context from routes
- Profiles define behavior per context
- RouteContextProvider wires to React Router
- Context is read-only (observation, not control)

**Never**: Executes playback. Only hints.

---

### Intelligence Layer

**Owns**: Behavioral inference

**Rules**:
- ListeningModel reads history, never writes
- Heuristics are deterministic functions
- Recommendations have confidence scores
- Old patterns decay over time

**Never**: Touches AudioEngine, SoundPolicy, or clients.

---

### Autonomy Layer

**Owns**: Consent and activation

**Rules**:
- Autonomy requires explicit consent
- Consent is per-context, per-capability
- AutonomyManager gates recommendations
- Manual override immediately suspends autonomy

**Never**: Acts without consent. Ever.

---

### Integration Hooks

**Owns**: React component wiring

**Rules**:
- Hooks encapsulate integration logic
- Hooks check context/autonomy before acting
- Hooks are additive (can be disabled)
- Hooks never modify platform state

**Never**: Bypass the layered architecture.

---

## Extension Points

### Adding a New Client

1. Create `clients/NewClient.ts`
2. Define `AudioSource` with priority and kind
3. Register with `soundPolicy.registerSource()`
4. Implement `activate()` and `deactivate()`
5. Call `sessionManager` for tracking (if applicable)
6. Add context check in entry methods
7. Export from `index.ts`

```typescript
const NEW_CLIENT_SOURCE: AudioSource = {
  id: 'new-client',
  priority: 50,
  duckable: true,
  ducksOthers: false,
  kind: 'ambient',
};

class NewClient {
  constructor() {
    soundPolicy.registerSource(NEW_CLIENT_SOURCE);
  }
  
  async activate(): Promise<void> {
    if (!audioContextResolver.allows('ambient')) return;
    soundPolicy.setActive(NEW_CLIENT_SOURCE.id, true);
    // ... playback logic
  }
}
```

---

### Adding a New Context

1. Add to `contextProfiles.ts`:

```typescript
export const CONTEXT_PROFILES = {
  // ... existing
  newContext: {
    name: 'New Context',
    autoStartMusic: false,
    allowTTS: true,
    allowNotifications: true,
    defaultVolume: 0.6,
  },
};
```

2. Add route pattern to `ROUTE_CONTEXT_MAP`:

```typescript
{ pattern: /^\/new-feature/, context: 'newContext' },
```

---

### Adding a New Heuristic

1. Add to `intelligence/heuristics.ts`:

```typescript
export function newHeuristic(signals: BehaviorSignals): Bias {
  if (signals.totalSessions < 3) return 'neutral';
  // ... deterministic logic
  return 'prefer' | 'avoid' | 'neutral';
}
```

2. Wire into ListeningModel if needed.

---

### Adding Autonomy for New Capability

1. Add to `AutonomyCapability` type:

```typescript
export type AutonomyCapability = 'music' | 'tts' | 'notifications' | 'newCapability';
```

2. Add context check in ContextResolver
3. Add consent UI via `useAutonomy` hook

---

## Invariants (Never Break)

| Rule | Reason |
|------|--------|
| Manual action overrides autonomy | User trust |
| Autonomy never affects active playback | Predictability |
| No learning during playback | Stability |
| Time comes only from AudioEngine | Consistency |
| Clients never bypass Policy | Arbitration |
| Intelligence never touches Engine | Separation |
| All consent is explicit | Ethics |

---

## File Map

```
platform/audio/
├── docs/
│   └── DOCTRINE.md              ← You are here
├── core/
│   ├── AudioEngine.ts           ← Singleton coordinator
│   ├── AudioGraph.ts            ← WebAudio topology
│   ├── AudioPlayback.ts         ← Track playback
│   └── AudioDucking.ts          ← Volume automation
├── policy/
│   ├── SoundPolicy.ts           ← Priority arbitration
│   ├── DuckingPolicy.ts         ← Who ducks whom
│   └── types.ts                 ← Shared types
├── persistence/
│   ├── AudioDatabase.ts         ← IndexedDB wrapper
│   ├── SessionManager.ts        ← Session lifecycle
│   └── PlaylistService.ts       ← Playlist CRUD
├── clients/
│   ├── FocusMusicClient.ts      ← Background music
│   ├── TTSClient.ts             ← Text-to-speech
│   └── NotificationClient.ts    ← Alert sounds
├── context/
│   ├── AudioContextResolver.ts  ← Route → context
│   ├── RouteContextProvider.tsx ← React Router bridge
│   ├── contextProfiles.ts       ← Profile definitions
│   └── useAudioContext.ts       ← React hook
├── intelligence/
│   ├── ListeningModel.ts        ← Behavioral observer
│   ├── heuristics.ts            ← Inference functions
│   └── types.ts                 ← Recommendation types
├── autonomy/
│   ├── AutonomyManager.ts       ← Consent gate
│   ├── consentStore.ts          ← Persistent consent
│   ├── useAutonomy.ts           ← React hook
│   └── types.ts                 ← Consent types
├── hooks/
│   ├── useTTSAutoRead.ts        ← Chat AI → TTS
│   ├── useTTSFlashcard.ts       ← Card reveal → TTS
│   └── useAutonomousAudio.ts    ← Context-aware music
└── index.ts                     ← Public exports
```

---

## Future Phases (Not Yet Implemented)

| Phase | Name | Purpose |
|-------|------|---------|
| 7A | AttentionModel | Detect focus/fatigue from user signals |
| 7B | AttentionAudioAdapter | Adjust audio based on cognitive state |
| 8A | TemporalArcEngine | Day-long audio arcs (morning→night) |
| 9A | MemoryAudioIndex | Link playlists to knowledge domains |

These build on Phase 6 without modifying it.

---

## Final Word

This platform was designed to be:

- **Predictable** — Same inputs → same outputs
- **Respectful** — User always in control
- **Extensible** — Add without refactor
- **Observable** — Every decision traceable

When in doubt, be boring. Be explicit. Be trustworthy.

---

*Last updated: 2026-01-14*
