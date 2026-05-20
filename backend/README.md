# Synapse Backend

The neural core of the Synapse ecosystem. This FastAPI-powered engine orchestrates AI operations, manages the knowledge graph, and safeguards user data.

## Tech Stack

- **Framework**: FastAPI (High-performance Async Python)
- **Database**: PostgreSQL (Relational Data)
- **ORM**: SQLAlchemy 2.0 (Async) + Alembic (Migrations)
- **Validation**: Pydantic v2
- **AI/LLM**: LiteLLM (Router + Fallback), Custom ReAct Agent, OpenAI/DeepSeek/Gemini (Cloud), Ollama (Local/Private)
- **Search**: PGVector (Semantic Search & RAG)
- **Task Queue**: Celery (Async Jobs - planned)

## Key Components

### 1. Neural Graph Engine

Manages relationships between notes, tags, and concepts.

- **Node**: A unit of information (Note, Flashcard, Tag).
- **Edge**: The semantic connection between nodes (Reference, Parent/Child).

### 2. AI Context Builder

Constructs dynamic context windows for LLMs by retrieving relevant notes using vector embeddings.

- **Embeddings**: `text-embedding-3-small` (or local alternatives).
- **RAG Pipeline**: Hybrid search (Keyword + Semantic) for optimal recall.

### 3. Auth & Security

- OAuth2 with Password Flow (Bearer Tokens).
- Role-Based Access Control (RBAC).

## Development Setup

### Prerequisites

- Python 3.11+
- PostgreSQL
- Virtualenv or Conda
- [Ollama](https://ollama.ai/) (Optional, for local AI)

### Installation

1. **Create Virtual Environment**

   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

2. **Install Dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   Copy `.env.example` to `.env` and configure your credentials:

   ```env
   DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/synapse
   SECRET_KEY=your_secret_key
   OPENAI_API_KEY=sk-...
   
   # Optional: Local/Private AI
   OLLAMA_BASE_URL=http://localhost:11434
   ```

4. **Run Migrations**

   ```bash
   alembic upgrade head
   ```

5. **Start Dev Server**

   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

## Testing

Run the comprehensive test suite:

```bash
pytest
```

## Directory Structure

```
app/
├── api/            # API Endpoints (Routes)
├── core/           # Config, Security, Events
├── db/             # Database connection & Base models
├── models/         # SQLAlchemy Models
├── schemas/        # Pydantic Schemas (Request/Response)
├── services/       # Business Logic & AI Services
└── main.py         # Application Entrypoint
```

## Production Deployment

Synapse uses **Supervisor** for process management in production.

### Quick Start

```bash
# Build frontend
cd ../frontend && npm run build

# Start all services with Supervisor
make supervisor-start
```

### Service Management

```bash
make supervisor-status   # Check service status
make supervisor-restart  # Restart all services
make supervisor-stop     # Stop all services
make logs                # View service logs
```

### Services Managed

- **synapse-api**: FastAPI backend (Gunicorn + Uvicorn)
- **celery-worker**: Background task processing
- **celery-beat**: Periodic task scheduler
- **qdrant**: Vector database

### Configuration

- Supervisor config: `config/supervisord.conf`
- Gunicorn config: `config/gunicorn.conf.py`
- Logs directory: `logs/`

### Documentation

See the `docs/` folder for detailed guides:

- [Deployment Guide](docs/DEPLOYMENT.md) - Full production deployment instructions
- [Celery Quickstart](docs/CELERY_QUICKSTART.md) - Getting started with background tasks
- [Celery Deployment](docs/CELERY_DEPLOYMENT.md) - Production Celery setup
- [Multi-Distro Support](docs/MULTI_DISTRO_SUPPORT.md) - Linux distribution compatibility

## Makefile Commands

Use `make help` to see all available commands:

```bash
make help              # Show all available commands
make dev               # Run development server
make migrate           # Run database migrations
make supervisor-start  # Start production server
make health            # Check service health
```
