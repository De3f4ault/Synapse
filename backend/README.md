# Synapse Backend

The neural core of the Synapse ecosystem. This FastAPI-powered engine orchestrates AI operations, manages the knowledge graph, and safeguards user data.

## Tech Stack

- **Framework**: FastAPI (High-performance Async Python)
- **Database**: PostgreSQL (Relational Data)
- **ORM**: SQLAlchemy 2.0 (Async) + Alembic (Migrations)
- **Validation**: Pydantic v2
- **AI/LLM**: LangChain (Orchestration), OpenAI/DeepSeek (Models)
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
