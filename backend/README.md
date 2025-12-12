# Synapse Backend

> AI-powered learning platform backend built with FastAPI, PostgreSQL, and advanced LLM integrations.

## Tech Stack

- **Framework:** FastAPI 0.120.4 with async/await support
- **Database:** PostgreSQL with SQLAlchemy 2.0 (async)
- **Vector Store:** LanceDB for embeddings
- **AI/LLM:** Google Gemini, OpenAI, LlamaIndex, LangChain
- **Caching:** Redis with hiredis
- **Task Queue:** Celery with Redis broker
- **Authentication:** JWT with python-jose, Argon2 password hashing
- **Monitoring:** OpenTelemetry instrumentation
- **Document Processing:** PyPDF, python-docx, BeautifulSoup4

## Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- (Optional) Docker & Docker Compose

## Installation

### 1. Clone and Navigate

```bash
cd backend
```

### 2. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/synapse
POSTGRES_USER=synapse_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=synapse

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
GOOGLE_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Application
ENVIRONMENT=development
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 5. Database Setup

Run migrations:

```bash
# Initialize Alembic (first time only)
alembic upgrade head

# Create initial data (optional)
python scripts/init_db.py
```

### 6. Start the Server

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the Makefile
make run
```

The API will be available at `http://localhost:8000`

## Docker Setup

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

## Project Structure

```
backend/
├── alembic/              # Database migrations
├── app/
│   ├── api/              # API routes and endpoints
│   │   ├── rest/         # REST API endpoints
│   │   └── websocket/    # WebSocket handlers
│   ├── core/             # Core configuration
│   │   ├── config.py     # Settings management
│   │   ├── security.py   # Auth utilities
│   │   └── database.py   # DB connection
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── services/         # Business logic
│   │   ├── ai/           # AI/LLM services
│   │   ├── chat/         # Chat functionality
│   │   ├── documents/    # Document processing
│   │   └── study/        # Study features
│   ├── utils/            # Utility functions
│   └── main.py           # Application entry point
├── config/               # Configuration files
├── scripts/              # Utility scripts
├── requirements.txt      # Python dependencies
└── README.md
```

## API Documentation

Once the server is running, access:

- **Swagger UI:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`
- **OpenAPI JSON:** `http://localhost:8000/openapi.json`

## Development

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_api.py
```

### Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Code Quality

```bash
# Format code
black app/

# Lint code
flake8 app/

# Type checking
mypy app/
```

### Using Make Commands

```bash
make run          # Start development server
make migrate      # Run database migrations
make test         # Run tests
make lint         # Run linters
make format       # Format code
make clean        # Clean cache files
```

## Key Features

### AI-Powered Chat
- Real-time streaming responses via WebSocket
- Context-aware conversations with session management
- Multi-model support (Gemini, GPT-4)

### Document Processing
- PDF, DOCX, and text file parsing
- Automatic chunking and embedding generation
- Vector similarity search

### Study Tools
- Flashcard generation from documents
- Quiz creation with multiple question types
- Spaced repetition scheduling
- Progress tracking and analytics

### Authentication & Security
- JWT-based authentication
- Argon2 password hashing
- Role-based access control
- Rate limiting

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT secret key | - |
| `GOOGLE_API_KEY` | Google Gemini API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ENVIRONMENT` | Environment (development/production) | `development` |
| `DEBUG` | Enable debug mode | `false` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection
psql -U synapse_user -d synapse -h localhost
```

### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping

# Should return: PONG
```

### Migration Errors
```bash
# Reset database (WARNING: destroys all data)
alembic downgrade base
alembic upgrade head
```

## License

Proprietary - All rights reserved

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linters
4. Submit a pull request

## Support

For issues or questions, please contact the development team.
