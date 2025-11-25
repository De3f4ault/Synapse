# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
make dev              # Run development server (uvicorn with --reload)
make install          # Install dependencies from requirements.txt
make shell            # Open Python shell with app context
```

### Database
```bash
make migrate          # Run all pending migrations (alembic upgrade head)
make migrate-create MESSAGE="description"  # Create new migration
make migrate-down     # Rollback one migration
make init-db          # Initialize database and run migrations (scripts/init_db.py)
make seed             # Seed test data (scripts/seed_data.py)
```

### Code Quality
```bash
make format           # Format code with black and isort (line-length: 100)
make lint             # Run mypy type checking
make test             # Run pytest tests
make clean            # Clean cache files (__pycache__, *.pyc, etc.)
```

### External Services
```bash
make redis            # Start Redis server (required for caching/realtime)
make postgres         # Start PostgreSQL (local)
make postgres-stop    # Stop PostgreSQL
```

## Architecture Overview

### Core Philosophy: SYNAPSE-Aware Context System

SYNAPSE is an AI-powered learning platform built around **context-aware intelligence**. The key architectural principle is that every AI interaction should have full knowledge of the user's learning state, weak areas, and history across all modules.

### Three-Layer Architecture

#### 1. Module System (Learning Content)
Located in `app/modules/`, each module is a self-contained learning unit:
- **Flashcards**: Spaced repetition with SM-2 algorithm (app/modules/flashcards/)
- **Notes**: Hierarchical notes with versioning (app/modules/notes/)
- **Documents**: Document processing and chunking (app/modules/documents/)
- **Quizzes**: Interactive assessments (app/modules/quizzes/)
- **Chat**: AI tutoring conversations (app/modules/chat/)

Each module implements `LearningModule` base class (app/core/module_system/base.py) and provides:
- CRUD operations for content
- `contribute_context()`: Critical method that returns module-specific learning context
- Optional capabilities: STUDY, AI_GENERATE, ANALYTICS (defined via ModuleCapability enum)

#### 2. Context Engine (The Brain)
Located in `app/core/context/engine.py`, this is the central intelligence:
- Aggregates learning context from all modules via their `contribute_context()` methods
- Executes PostgreSQL stored functions for analytics (weak areas, mastery scores, performance)
- Caches context in Redis (5 min TTL) for performance
- Returns comprehensive context dict consumed by AI agents

**Context Flow:**
```
User Request → Context Engine → [SQL Functions + Module Context] → AI Agent → Response
```

SQL functions for context are in `app/sql/functions/context/`:
- `build_user_context.sql`: Main context aggregator
- `detect_weak_areas.sql`: Identify struggling topics
- `calculate_mastery.sql`: Compute mastery scores per topic

#### 3. AI Agent Layer (Intelligence)
Located in `app/core/ai/agents/`, implements ReAct pattern (Reasoning + Acting):

**Base Architecture** (app/core/ai/agents/base_agent.py):
- `BaseAgent`: Abstract class implementing ReAct loop with LangChain 1.0 patterns
- Middleware pipeline: pre-execution (context injection, quota check) → ReAct loop → post-execution (logging, webhooks)
- Tool execution framework with error handling and retries
- Maximum 10 iterations per execution, configurable timeout

**Agent Types** (app/core/ai/agents/implementations/):
- `TutorAgent`: General-purpose tutoring with user context
- `QuizAgent`: Quiz generation from learning materials
- `DocumentAgent`: Document analysis and summarization

**Agent Creation:**
```python
from app.core.ai.agents.factory import AgentFactory

agent = AgentFactory.create_agent("tutor", tools=[...], middleware=[...])
result = await agent.execute(user_id=1, input="Help me with photosynthesis")
```

### RAG (Retrieval-Augmented Generation)
Located in `app/core/ai/rag/`:

**Vector Store:** LanceDB (app/services/vector_store/)
- Embedded chunks stored in LanceDB (path: LANCEDB_PATH env var)
- Embeddings: all-MiniLM-L6-v2 (sentence-transformers)
- Re-ranking: cross-encoder model (app/core/ai/rag/reranking/)

**Chunking Strategies** (app/core/ai/rag/chunking/):
- `SemanticChunker`: Chunks by semantic coherence
- `SentenceChunker`: Chunks by sentence boundaries
- `FixedChunker`: Fixed-size chunks with overlap

**LlamaIndex Integration** (app/core/ai/rag/llama_index/):
- Service context, storage context, and index manager
- Query engine for retrieval

**Context Building** (app/core/ai/rag/context_builder.py):
- Assembles RAG context with token budget management (~8000 tokens)
- Format: User Learning Context (weak areas) + Retrieved Chunks (ranked) + Query

### Event System
Located in `app/core/events/`:

**EventDispatcher** (dispatcher.py): Singleton event router implementing observer pattern
- Routes events to registered handlers and webhooks
- Concurrent execution of handlers via asyncio.gather()

**Event Flow:**
```
Action → Event Trigger → Dispatcher → [Handlers + Webhooks] → Side Effects
```

**Subscribers** (app/core/events/subscribers/):
- `CacheInvalidator`: Invalidates context cache on user actions
- `AnalyticsUpdater`: Updates analytics on learning events
- Custom subscribers can be registered per event type

**Webhooks** (app/core/events/webhooks/):
- HTTP POST to external URLs with HMAC signatures
- Retry logic with exponential backoff (app/core/events/webhooks/retry.py)
- Validation and security (app/core/events/webhooks/validator.py)

### Database Layer

**Stack:**
- PostgreSQL (asyncpg driver) for primary storage
- Redis for caching and real-time features
- DuckDB for analytics (OLAP queries)
- LanceDB for vector storage

**Key Patterns:**
- SQLAlchemy 2.0 async ORM (app/models/)
- Alembic for migrations (alembic/versions/)
- PostgreSQL stored functions for complex analytics (app/sql/functions/)
- Materialized views for performance (app/sql/views/)

**Models** (app/models/):
- All inherit from `Base` with common mixins (timestamps, soft delete)
- Key models: User, Document, Note, Flashcard, Quiz, ChatSession
- Review tracking: Review model with SM-2 spaced repetition data

**SQL Functions Usage:**
```python
from app.core.context.sql_executor import SQLExecutor

executor = SQLExecutor(db_session)
weak_areas = await executor.call_detect_weak_areas(user_id=123)
```

### API Layer

**REST API** (app/api/rest/):
- FastAPI router structure: each resource has its own router file
- Dependency injection for auth, DB sessions via app/api/deps.py
- Standard CRUD patterns with pagination, filtering

**WebSocket API** (app/api/websockets/):
- Real-time chat: app/api/websockets/chat.py
- Study sessions: app/api/websockets/study.py
- Connection manager: app/api/websockets/manager.py
- Protocol: app/api/websockets/protocol.py (message types, validation)

**Webhooks Management** (app/api/webhooks/):
- Register/manage external webhooks: app/api/webhooks/management.py
- Receive webhook callbacks: app/api/webhooks/receivers.py

## Key Implementation Patterns

### Adding a New Module

1. Create module directory: `app/modules/my_module/`
2. Implement `LearningModule` interface in `module.py`:
   ```python
   class MyModule(LearningModule):
       def get_name(self) -> str:
           return "my_module"

       async def contribute_context(self, user_id: int, query: str) -> Dict[str, Any]:
           # Return module-specific context for AI agents
           pass
   ```
3. Create service layer: `service.py` (business logic)
4. Create repository: `repository.py` (DB queries)
5. Register in `app/core/module_system/registry.py`
6. Add REST endpoints in `app/api/rest/my_module.py`

### Adding a New AI Agent

1. Create agent class in `app/core/ai/agents/implementations/`:
   ```python
   class MyAgent(BaseAgent):
       async def _get_system_prompt(self, context: Dict[str, Any]) -> str:
           # Build system prompt with user context
           pass
   ```
2. Define tools in `app/core/ai/tools/` (inherit from `BaseTool`)
3. Create prompt templates in `app/core/ai/agents/prompts/`
4. Register in `app/core/ai/agents/registry.py`
5. Add middleware if needed (app/core/ai/agents/middleware/)

### Adding SQL Analytics Functions

1. Create function in `app/sql/functions/analytics/my_function.sql`
2. Add to migration: `alembic/versions/002_add_sql_functions.py`
3. Add executor method in `app/core/context/sql_executor.py`
4. Use in context engine or endpoints

### Working with Events

1. Define event type in `app/core/events/triggers.py`
2. Create subscriber in `app/core/events/subscribers/`:
   ```python
   class MySubscriber(BaseSubscriber):
       async def handle(self, event: Event):
           # Handle event
           pass
   ```
3. Register subscriber in app initialization
4. Emit events: `await dispatcher.emit(Event(type=EventType.MY_EVENT, ...))`

## Configuration

Environment variables are loaded via Pydantic Settings (app/core/config.py):
- Copy `.env.example` to `.env`
- Required: `DATABASE_URL`, `GEMINI_API_KEY`, `JWT_SECRET_KEY`
- Optional: Redis, storage paths, rate limiting configs

**Settings singleton:** Import `settings` from `app.core.config`

## Testing

Tests location: `tests/` (currently not present, manual testing used during development)

Run tests: `make test` or `pytest tests/ -v`

Async test support via pytest-asyncio (configured in pyproject.toml)

## Critical Dependencies

- **Google Generative AI**: Used for all LLM calls (app/core/ai/providers/gemini.py)
- **LangChain/LangGraph**: Agent framework (v1.0+)
- **LlamaIndex**: RAG orchestration
- **sentence-transformers**: Local embeddings (all-MiniLM-L6-v2)
- **structlog**: Structured logging throughout

## Development Notes

- Line length: 100 characters (black/isort configured)
- Python version: 3.11+
- Async/await throughout (FastAPI + SQLAlchemy async)
- Type hints recommended but not strictly enforced (mypy configured, ignore_missing_imports=true)
- Logging: Use `structlog.get_logger(__name__)` in all modules
