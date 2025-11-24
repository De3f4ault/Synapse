# 🚀 SYNAPSE - Complete Implementation Plan

## 📋 Overview

**Total Files:** ~180 essential files
**Estimated Timeline:** 8-12 weeks (full-time development)
**Approach:** Bottom-up (foundation → features → integration)

---

## 🎯 Implementation Strategy

### **Principle: Build Foundation First**

1. Database layer (models, migrations)
2. Core framework (config, security, middleware)
3. Basic modules (one at a time)
4. AI layer (tools → agents → RAG)
5. API layer (REST → WebSocket → GraphQL)
6. Integration & polish

### **Testing Strategy**

- Manual testing during development
- Postman/Thunder Client for API testing
- WebSocket clients for real-time testing
- pgAdmin/DBeaver for SQL validation

---

## 📅 Phase 1: Foundation Setup (Week 1)

### **Goal:** Runnable application with database, auth, and basic endpoints

---

### **Step 1.1: Project Initialization (Day 1)**

#### **Files to Create: 8**

1. **`.gitignore`**
   - Python (`__pycache__`, `*.pyc`, `.env`)
   - Virtual environment (`venv/`, `.venv/`)
   - Data directories (`data/`, `logs/`)
   - IDE (`\.vscode/`, `.idea/`)

2. **`README.md`**
   - Project description
   - Setup instructions (placeholder)
   - Technology stack list
   - License

3. **`pyproject.toml`**
   - Project metadata (name, version, description)
   - Dependencies (will populate in next step)
   - Tool configurations:
     - `[tool.black]` (line length, target version)
     - `[tool.isort]` (profile = "black")
     - `[tool.mypy]` (strict mode)

4. **`requirements.txt`**
   - Core dependencies:

```
     fastapi==0.104.1
     uvicorn[standard]==0.24.0
     sqlalchemy[asyncio]==2.0.23
     alembic==1.12.1
     asyncpg==0.29.0
     pydantic==2.5.0
     pydantic-settings==2.1.0
     python-jose[cryptography]==3.3.0
     passlib[bcrypt]==1.7.4
     python-multipart==0.0.6
     redis==5.0.1
     google-generativeai==0.3.1
     lancedb==0.3.3
     duckdb==0.9.2
     llama-index==0.9.14
     langchain==0.1.0
     langgraph==0.0.26
     sentence-transformers==2.2.2
     structlog==23.2.0
     httpx==0.25.2
```

5. **`requirements-dev.txt`**
   - Development dependencies:

```
     pytest==7.4.3
     pytest-asyncio==0.21.1
     black==23.11.0
     isort==5.12.0
     mypy==1.7.1
```

6. **`Makefile`**
   - Targets:
     - `help`: List all commands
     - `install`: Install dependencies
     - `dev`: Run development server
     - `migrate`: Run migrations
     - `shell`: Open Python shell
     - `format`: Run black + isort
     - `lint`: Run mypy
     - `clean`: Remove cache files

7. **`.env.example`**
   - All environment variables with descriptions:
     - Database URLs
     - Redis URL
     - Gemini API key
     - JWT secret
     - File paths
     - Feature flags

8. **`.env.development`**
   - Copy from `.env.example`
   - Fill with local development values

**Actions:**

- Create virtual environment: `python -m venv venv`
- Activate: `source venv/bin/activate`
- Install dependencies: `pip install -r requirements.txt -r requirements-dev.txt`
- Initialize git: `git init`

---

### **Step 1.2: Application Bootstrap (Day 1-2)**

#### **Files to Create: 5**

9. **`app/__init__.py`**
   - Empty file (marks as package)

10. **`app/main.py`** ⭐ **CRITICAL ENTRY POINT**
    - Create FastAPI application instance
    - Set metadata (title, description, version)
    - Include placeholder for startup/shutdown events
    - Add simple health check endpoint: `GET /health`
    - **Implementation Order:**
      1. Import FastAPI
      2. Create app instance with metadata
      3. Add health check route (returns `{"status": "healthy"}`)
      4. Add startup event (log "Application starting...")
      5. Add shutdown event (log "Application shutting down...")

11. **`app/core/__init__.py`**
    - Empty file

12. **`app/core/config.py`** ⭐ **CRITICAL**
    - Create `Settings` class inheriting from `BaseSettings`
    - **Fields to include:**
      - `APP_NAME`, `APP_VERSION`, `ENVIRONMENT`
      - `DATABASE_URL` (PostgreSQL connection string)
      - `REDIS_URL`
      - `LANCEDB_PATH`, `DUCKDB_PATH`
      - `GEMINI_API_KEY`
      - `JWT_SECRET_KEY`, `JWT_ALGORITHM`, `JWT_EXPIRATION_MINUTES`
      - `CORS_ORIGINS` (list)
      - `LOG_LEVEL`
    - Use `Field()` for validation and defaults
    - Add `model_config = SettingsConfigDict(env_file=".env")`
    - Export singleton: `settings = Settings()`

13. **`app/utils/__init__.py`**
    - Empty file

14. **`app/utils/logging.py`**
    - Configure structlog
    - **Setup:**
      1. Import structlog
      2. Configure processors (add timestamp, log level, exception info)
      3. Set renderer (JSONRenderer for production, ConsoleRenderer for dev)
      4. Configure stdlib integration
      5. Export `get_logger()` function

**Test:**

- Run: `uvicorn app.main:app --reload`
- Visit: `http://localhost:8000/health`
- Should return: `{"status": "healthy"}`

---

### **Step 1.3: Database Setup (Day 2-3)**

#### **Files to Create: 8**

15. **`alembic.ini`**
    - Copy from Alembic default template
    - Set `sqlalchemy.url` to read from environment
    - Configure script location: `alembic`

16. **`alembic/env.py`**
    - Configure Alembic for async SQLAlchemy
    - **Key sections:**
      1. Import `settings` from `app.core.config`
      2. Set `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`
      3. Import all models for autogenerate: `from app.models import *`
      4. Set `target_metadata = Base.metadata`
      5. Implement `run_migrations_offline()` and `run_migrations_online()`
      6. Use `asyncio.run()` for async engine

17. **`alembic/script.py.mako`**
    - Default Alembic template (no changes needed)

18. **`app/db/__init__.py`**
    - Empty file

19. **`app/db/base.py`**
    - Create declarative base
    - **Implementation:**
      1. Import `DeclarativeBase` from SQLAlchemy 2.0
      2. Create base class: `class Base(DeclarativeBase): pass`
      3. Export Base

20. **`app/db/session.py`** ⭐ **CRITICAL**
    - Create async engine and session factory
    - **Implementation:**
      1. Import `create_async_engine`, `async_sessionmaker`
      2. Create engine: `engine = create_async_engine(settings.DATABASE_URL, echo=True)`
      3. Create session factory: `AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)`
      4. Create dependency function:

```python
         async def get_db():
             async with AsyncSessionLocal() as session:
                 yield session
```

21. **`app/models/__init__.py`**
    - Import all models (will add as we create them)
    - Export Base

22. **`app/models/base.py`**
    - Create base model with common fields
    - **Fields:**
      - `id: Mapped[int]` (primary key, autoincrement)
      - Common query methods (optional)
    - Use SQLAlchemy 2.0 `Mapped` type annotations

**Actions:**

- Initialize Alembic: `alembic init alembic` (skip if using provided template)
- Create migrations directory: `mkdir alembic/versions`

---

### **Step 1.4: First Model & Migration (Day 3)**

#### **Files to Create: 4**

23. **`app/models/mixins.py`**
    - Create reusable mixins
    - **Mixins to implement:**
      1. `TimestampMixin`:
         - `created_at: Mapped[datetime]` (server_default=func.now())
         - `updated_at: Mapped[datetime]` (server_default=func.now(), onupdate=func.now())
      2. `SoftDeleteMixin`:
         - `deleted_at: Mapped[Optional[datetime]]`
         - Property: `is_deleted` (returns `deleted_at is not None`)
      3. `UserOwnedMixin`:
         - `user_id: Mapped[int]` (ForeignKey to users.id)

24. **`app/models/user.py`** ⭐ **FIRST MODEL**
    - User account model
    - **Fields:**
      - `id`, `email` (unique, indexed), `password_hash`
      - `full_name`, `is_active`, `is_admin`, `email_verified`
      - `preferences` (JSON), `timezone`
      - `last_login` (datetime, nullable)
    - Inherit from `Base` and `TimestampMixin`
    - Add `__tablename__ = "users"`

25. **`alembic/versions/001_initial_schema.py`**
    - First migration
    - **Generate:** `alembic revision --autogenerate -m "initial schema"`
    - **Review generated migration:**
      - Check `create_table('users', ...)`
      - Verify columns and constraints
      - Verify indexes
    - **Run:** `alembic upgrade head`

26. **`scripts/__init__.py`**
    - Empty file

27. **`scripts/init_db.py`**
    - Database initialization script
    - **Implementation:**
      1. Import settings, engine
      2. Function: `async def init_db():`
      3. Check if database exists
      4. Run migrations: `subprocess.run(["alembic", "upgrade", "head"])`
      5. Create default admin user (if not exists)
      6. Initialize vector store tables
      7. Log success

**Test:**

- Run migration: `alembic upgrade head`
- Connect to database: `psql synapse`
- Check table: `\d users`
- Verify columns and indexes

---

### **Step 1.5: Authentication (Day 4-5)**

#### **Files to Create: 8**

28. **`app/core/security.py`** ⭐ **CRITICAL**
    - Security utilities
    - **Functions to implement:**
      1. `hash_password(password: str) -> str`:
         - Use `bcrypt.hashpw()` with salt
      2. `verify_password(plain: str, hashed: str) -> bool`:
         - Use `bcrypt.checkpw()`
      3. `create_access_token(data: dict, expires_delta: Optional[timedelta]) -> str`:
         - Use `jose.jwt.encode()`
         - Add expiration to payload
         - Sign with `settings.JWT_SECRET_KEY`
      4. `decode_token(token: str) -> dict`:
         - Use `jose.jwt.decode()`
         - Verify signature
         - Check expiration
         - Raise `HTTPException(401)` if invalid

29. **`app/core/exceptions.py`**
    - Custom exception hierarchy
    - **Exceptions to create:**
      - `SynapseException` (base)
      - `AuthenticationError(401)`
      - `AuthorizationError(403)`
      - `ResourceNotFoundError(404)`
      - `ValidationError(422)`
      - Each with `status_code`, `error_code`, `message` attributes

30. **`app/core/dependencies.py`** ⭐ **CRITICAL**
    - FastAPI dependencies
    - **Dependencies to implement:**
      1. `get_db()` - Already in session.py, re-export here
      2. `get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User`:
         - Extract token from header
         - Decode token
         - Get user from database
         - Raise 401 if invalid
         - Return User object
      3. `require_admin(current_user: User = Depends(get_current_user)) -> User`:
         - Check `current_user.is_admin`
         - Raise 403 if not admin
         - Return user

31. **`app/schemas/__init__.py`**
    - Import all schemas (will populate)

32. **`app/schemas/common.py`**
    - Common schemas
    - **Schemas:**
      - `PaginationParams` (page, page_size, sort_by, sort_order)
      - `APIResponse` (success, data, error, metadata)
      - `MessageResponse` (message)

33. **`app/schemas/auth.py`**
    - Authentication schemas
    - **Schemas:**
      - `UserRegister` (email, password, full_name)
      - `UserLogin` (email, password)
      - `TokenResponse` (access_token, refresh_token, token_type)
      - `TokenData` (user_id, email, exp)

34. **`app/schemas/user.py`**
    - User schemas
    - **Schemas:**
      - `UserBase` (email, full_name)
      - `UserCreate` (email, password, full_name)
      - `UserUpdate` (full_name, preferences)
      - `UserResponse` (id, email, full_name, is_active, created_at)

35. **`app/api/__init__.py`**
    - Empty file

36. **`app/api/deps.py`**
    - Re-export dependencies from `core.dependencies`
    - Add any API-specific dependencies

37. **`app/api/rest/__init__.py`**
    - Empty file

38. **`app/api/rest/auth.py`** ⭐ **FIRST ENDPOINTS**
    - Authentication endpoints
    - **Endpoints to implement:**
      1. `POST /api/v1/auth/register`:
         - Validate input
         - Check if email exists
         - Hash password
         - Create user
         - Generate tokens
         - Return TokenResponse
      2. `POST /api/v1/auth/login`:
         - Validate credentials
         - Verify password
         - Generate tokens
         - Update last_login
         - Return TokenResponse
      3. `POST /api/v1/auth/logout`:
         - Get current user
         - Blacklist token (Redis)
         - Return success message
      4. `GET /api/v1/auth/me`:
         - Get current user
         - Return UserResponse

39. **`app/api/rest/router.py`**
    - Main REST router
    - **Implementation:**
      1. Create `api_router = APIRouter()`
      2. Include auth router: `api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])`
      3. Will add more routers as we implement modules

**Update `app/main.py`:**

- Import `api_router` from `app.api.rest.router`
- Include: `app.include_router(api_router, prefix="/api/v1")`

**Test:**

- Register: `POST /api/v1/auth/register` with email/password
- Login: `POST /api/v1/auth/login`
- Get profile: `GET /api/v1/auth/me` (with Bearer token)
- Should receive JWT tokens and user data

---

### **Step 1.6: Middleware (Day 5)**

#### **Files to Create: 7**

40. **`app/core/middleware/__init__.py`**
    - Import all middleware (will populate)

41. **`app/core/middleware/cors.py`**
    - CORS configuration
    - **Implementation:**
      1. Import `CORSMiddleware` from FastAPI
      2. Create function `setup_cors(app: FastAPI)`:
         - Add middleware with settings from config
         - Allow origins from `settings.CORS_ORIGINS`
         - Allow credentials: True
         - Allow methods: ["*"]
         - Allow headers: ["*"]

42. **`app/core/middleware/logging.py`**
    - Request/response logging
    - **Implementation:**
      1. Create middleware class
      2. Log request: method, path, query params
      3. Generate request ID (UUID)
      4. Add to request state: `request.state.request_id = request_id`
      5. Log response: status, duration
      6. Use structlog for structured logs

43. **`app/core/middleware/error_handler.py`**
    - Global error handling
    - **Implementation:**
      1. Create exception handler for `Exception`
      2. Catch all unhandled exceptions
      3. Log with full traceback
      4. Return JSON error response
      5. Hide sensitive info in production

44. **`app/core/middleware/compression.py`**
    - Response compression
    - **Implementation:**
      1. Import `GZipMiddleware` from Starlette
      2. Add with minimum size: 1000 bytes

45. **`app/core/middleware/authentication.py`**
    - JWT validation middleware (optional - can use dependency)
    - **Skip for now** - using dependency injection instead

46. **`app/core/middleware/rate_limiting.py`**
    - Rate limiting middleware (we'll implement later with Redis)
    - **Skip for now** - will add in Phase 3

**Update `app/main.py`:**

- Import middleware setup functions
- Call `setup_cors(app)` after app creation
- Add logging middleware: `app.add_middleware(LoggingMiddleware)`
- Add error handler: `app.add_exception_handler(Exception, global_exception_handler)`
- Add compression: `app.add_middleware(GZipMiddleware, minimum_size=1000)`

**Test:**

- Make requests and check logs
- Verify CORS headers
- Trigger error and check response format
- Check gzip compression in response headers

---

## 📅 Phase 2: Core Infrastructure (Week 2)

### **Goal:** Redis, LanceDB, DuckDB integration, SQL functions foundation

---

### **Step 2.1: Redis Integration (Day 6)**

#### **Files to Create: 4**

47. **`app/services/__init__.py`**
    - Empty file

48. **`app/services/cache/__init__.py`**
    - Import and export Redis client

49. **`app/services/cache/client.py`** ⭐ **CRITICAL**
    - Redis client
    - **Implementation:**
      1. Import `redis.asyncio`
      2. Create async Redis client: `redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)`
      3. Function: `async def get_redis() -> redis.Redis:`
         - Return redis_client
      4. Function: `async def init_redis():`
         - Test connection with `ping()`
         - Log success or error
      5. Function: `async def close_redis():`
         - Close connection

50. **`app/services/cache/manager.py`**
    - Cache operations wrapper
    - **Functions:**
      1. `async def get(key: str) -> Optional[str]`
      2. `async def set(key: str, value: str, ttl: int = 3600)`
      3. `async def delete(key: str)`
      4. `async def exists(key: str) -> bool`
      5. `async def incr(key: str) -> int`
      6. `async def expire(key: str, ttl: int)`

**Update `app/main.py`:**

- Import `init_redis`, `close_redis`
- Add to startup event: `await init_redis()`
- Add to shutdown event: `await close_redis()`

**Test:**

- Start Redis: `redis-server`
- Run app and check startup logs
- Use Redis CLI: `redis-cli PING` should return PONG

---

### **Step 2.2: LanceDB Integration (Day 6-7)**

#### **Files to Create: 4**

51. **`app/services/vector_store/__init__.py`**
    - Import and export LanceDB client

52. **`app/services/vector_store/client.py`** ⭐ **CRITICAL**
    - LanceDB client
    - **Implementation:**
      1. Import `lancedb`
      2. Create function: `def get_lancedb_client():`
         - Connect: `db = lancedb.connect(settings.LANCEDB_PATH)`
         - Return db
      3. Function: `async def init_lancedb():`
         - Create data directory if not exists
         - Test connection
         - Create initial tables (flashcards, notes, documents)
         - Log success

53. **`app/services/vector_store/schemas.py`**
    - Table schemas
    - **Schemas to define:**
      1. `flashcard_schema`:
         - vector (384 dimensions for all-MiniLM-L6-v2)
         - card_id, user_id, front_text, back_text, deck_name
         - created_at
      2. `note_schema`:
         - vector (384), note_id, user_id, title, content
         - tags (list), created_at
      3. `document_schema`:
         - vector (384), chunk_id, document_id, user_id
         - content, page, chunk_index, created_at

54. **`app/services/vector_store/operations.py`**
    - CRUD operations
    - **Functions:**
      1. `async def insert_vectors(table_name: str, data: List[Dict]):`
         - Get table
         - Insert vectors with metadata
      2. `async def search_vectors(table_name: str, query_vector: List[float], limit: int = 10):`
         - Get table
         - Execute ANN search
         - Return results
      3. `async def delete_vectors(table_name: str, filter: Dict):`
         - Get table
         - Delete by filter

**Update `app/main.py`:**

- Import `init_lancedb`
- Add to startup: `await init_lancedb()`

**Test:**

- Run app and check LanceDB directory created
- Verify tables exist: `ls data/lancedb/`

---

### **Step 2.3: DuckDB Integration (Day 7)**

#### **Files to Create: 4**

55. **`app/services/analytics/__init__.py`**
    - Import and export DuckDB client

56. **`app/services/analytics/client.py`** ⭐ **CRITICAL**
    - DuckDB client
    - **Implementation:**
      1. Import `duckdb`
      2. Create function: `def get_duckdb_client():`
         - Connect: `con = duckdb.connect(settings.DUCKDB_PATH)`
         - Return con
      3. Function: `async def init_duckdb():`
         - Create database file if not exists
         - Test connection
         - Create initial views (will populate later)
         - Log success

57. **`app/services/analytics/queries.py`**
    - Analytical queries
    - **Start with simple queries:**
      1. `def get_user_study_time(user_id: int, period: str) -> Dict:`
         - Query PostgreSQL for review data
         - Aggregate with DuckDB
         - Return statistics
      2. `def get_performance_trends(user_id: int) -> Dict:`
         - Calculate accuracy over time
         - Use window functions
         - Return time series data

58. **`app/services/analytics/reports.py`**
    - Report generation (placeholder for now)
    - **Stub functions:**
      - `async def generate_weekly_report(user_id: int) -> Dict`
      - `async def export_to_csv(data: List[Dict], filename: str)`

**Update `app/main.py`:**

- Import `init_duckdb`
- Add to startup: `await init_duckdb()`

**Test:**

- Run app and check DuckDB file created
- Connect: `duckdb data/duckdb/analytics.duckdb`
- Run test query: `SELECT 1;`

---

### **Step 2.4: SQL Functions Foundation (Day 8-9)**

#### **Files to Create: 8**

59. **`app/sql/functions/flashcards/calculate_sm2.sql`** ⭐ **CRITICAL**
    - SM-2 algorithm as PostgreSQL function
    - **Implementation:**
      1. Create function signature:

```sql
         CREATE OR REPLACE FUNCTION calculate_sm2(
             p_ease_factor DECIMAL,
             p_repetitions INT,
             p_interval INT,
             p_quality INT
         ) RETURNS TABLE (
             new_ease_factor DECIMAL,
             new_repetitions INT,
             new_interval INT
         ) AS $$
```

      2. Implement SM-2 algorithm:
         - If quality >= 3: increase repetitions
         - Calculate new ease factor: `ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))`
         - Calculate new interval based on repetitions
      3. Return calculated values

60. **`app/sql/functions/flashcards/record_review.sql`** ⭐ **CRITICAL**
    - Record review atomically
    - **Implementation:**
      1. Create function signature:

```sql
         CREATE OR REPLACE FUNCTION record_review(
             p_card_id INT,
             p_quality INT
         ) RETURNS JSONB AS $$
```

      2. Lock card row: `SELECT * FROM flashcards WHERE id = p_card_id FOR UPDATE`
      3. Call `calculate_sm2()` with current values
      4. Update card with new values
      5. Insert review record
      6. Return JSON with next_review_date, new_interval, success

61. **`app/sql/functions/flashcards/get_due_cards.sql`**
    - Get cards due for review
    - **Implementation:**
      1. Select cards where `next_review <= NOW()`
      2. Filter by user_id
      3. Order by next_review ASC
      4. Limit results

62. **`app/sql/functions/context/build_user_context.sql`** ⭐ **CRITICAL**
    - Build complete user context in one query
    - **Implementation:**
      1. Use CTEs to gather data from multiple tables
      2. `WITH weak_topics AS (...)`: Calculate weak areas
      3. `WITH mastery_by_topic AS (...)`: Calculate mastery scores
      4. `WITH recent_activity AS (...)`: Get recent reviews
      5. Combine into single JSON object with `json_build_object()`
      6. Return complete context

63. **`app/sql/functions/context/detect_weak_areas.sql`**
    - Detect weak areas with window functions
    - **Implementation:**
      1. Calculate average quality by topic
      2. Filter topics with avg_quality < 0.7
      3. Add trend calculation with `LAG()` window function
      4. Return prioritized list

64. **`app/sql/functions/context/calculate_mastery.sql`**
    - Calculate mastery per topic
    - **Implementation:**
      1. Aggregate reviews by topic
      2. Calculate: `AVG(quality) * (1 + LOG(COUNT(*)))`
      3. Normalize to 0.0-1.0
      4. Return mastery scores

65. **`app/db/sql_loader.py`** ⭐ **CRITICAL**
    - Load and execute SQL files
    - **Implementation:**
      1. Function: `async def load_sql_functions():`
      2. Scan `app/sql/functions/` directory recursively
      3. Read each `.sql` file
      4. Execute with database connection
      5. Log each function loaded
      6. Handle errors gracefully

66. **`app/sql/migrations/create_functions.sql`**
    - Master SQL file that calls all function files
    - **Implementation:**
      1. `\i app/sql/functions/flashcards/calculate_sm2.sql`
      2. `\i app/sql/functions/flashcards/record_review.sql`
      3. ... (include all function files)

**Create Alembic Migration:** 67. **`alembic/versions/002_add_sql_functions.py`** - Migration to deploy SQL functions - **Generate:** `alembic revision -m "add sql functions"` - **Implementation:** 1. In `upgrade()`: Call `load_sql_functions()` 2. In `downgrade()`: `DROP FUNCTION IF EXISTS ...` for each

**Update `app/main.py`:**

- Import `load_sql_functions`
- Add to startup: `await load_sql_functions()`

**Test:**

- Run migration: `alembic upgrade head`
- Connect to database: `psql synapse`
- Test function: `SELECT calculate_sm2(2.5, 0, 0, 4);`
- Verify returns table with new values

---

### **Step 2.5: Context Engine Core (Day 9-10)**

#### **Files to Create: 5**

68. **`app/core/context/__init__.py`**
    - Import and export ContextEngine

69. **`app/core/context/schemas.py`**
    - Context schemas
    - **Schemas:**
      - `ContextRequest` (user_id, focus, modules)
      - `ContextResponse` (user_id, modules, analytics, metadata)
      - `WeakArea` (topic, module, weakness_score, evidence)
      - `MasteryScore` (topic, score, review_count)

70. **`app/core/context/sql_executor.py`**
    - Execute SQL functions helper
    - **Implementation:**
      1. Function: `async def execute_sql_function(function_name: str, params: Dict) -> Any:`
         - Build SQL: `SELECT * FROM function_name(...)`
         - Execute with asyncpg
         - Parse JSON results
         - Return Python dict

71. **`app/core/context/priority_manager.py`**
    - Token budget management
    - **Implementation:**
      1. Function: `def prioritize_context(context: Dict, max_tokens: int) -> Dict:`
         - Count tokens in context
         - If exceeds max_tokens:
           - Prioritize weak areas
           - Truncate less important sections
         - Return pruned context

72. **`app/core/context/engine.py`** ⭐ **CRITICAL**
    - Main context engine
    - **Implementation:**
      1. Class: `ContextEngine`
      2. Method: `async def get_user_context(user_id: int, focus: Optional[str] = None) -> Dict:`
         - Check cache (Redis): `context:{user_id}`
         - If cached: return cached
         - Call SQL function: `build_user_context(user_id)`
         - Parse results
         - Cache for 5 minutes
         - Return context
      3. Method: `async def invalidate_cache(user_id: int):`
         - Delete Redis key: `context:{user_id}`

**Test:**

- Create test user and flashcards
- Call `ContextEngine().get_user_context(user_id)`
- Verify returns context with weak areas, mastery scores
- Check Redis for cached context

---

## 📅 Phase 3: First Module - Flashcards (Week 3)

### **Goal:** Complete flashcard module with spaced repetition, CRUD, and SQL integration

---

### **Step 3.1: Flashcard Models (Day 11)**

#### **Files to Create: 3**

73. **`app/models/deck.py`**
    - Flashcard deck model
    - **Fields:**
      - `id`, `user_id` (FK to users)
      - `name` (String(255), not null)
      - `description` (Text, nullable)
      - `tags` (ARRAY, PostgreSQL array type)
      - `is_public` (Boolean, default False)
      - `ai_generated` (Boolean, default False)
      - `ai_metadata` (JSON, nullable)
    - **Relationships:**
      - `flashcards`: One-to-many with Flashcard
      - `user`: Many-to-one with User
    - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`, `UserOwnedMixin`

74. **`app/models/flashcard.py`** ⭐ **CRITICAL**
    - Flashcard model
    - **Fields:**
      - `id`, `deck_id` (FK to decks)
      - `front_text` (Text, not null)
      - `back_text` (Text, not null)
      - `front_media_url` (String, nullable)
      - `back_media_url` (String, nullable)
      - **SM-2 Fields:**
        - `ease_factor` (Decimal(3,2), default 2.5)
        - `interval` (Integer, days, default 0)
        - `repetitions` (Integer, default 0)
        - `last_review` (DateTime, nullable)
        - `next_review` (DateTime, nullable)
      - **Statistics:**
        - `learning_state` (Enum: new, learning, review, mastered)
        - `times_reviewed` (Integer, default 0)
        - `times_correct` (Integer, default 0)
        - `times_incorrect` (Integer, default 0)
      - `embedding_id` (String, nullable - LanceDB reference)
    - **Relationships:**
      - `deck`: Many-to-one with Deck
      - `reviews`: One-to-many with Review
    - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`

75. **`app/models/review.py`**
    - Review history model
    - **Fields:**
      - `id`, `card_id` (FK to flashcards), `user_id` (FK to users)
      - `quality` (Integer, 0-5)
      - `ease_factor_before` (Decimal)
      - `ease_factor_after` (Decimal)
      - `interval_before` (Integer)
      - `interval_after` (Integer)
      - `time_taken_ms` (Integer)
      - `reviewed_at` (DateTime, default now)
    - **Relationships:**
      - `card`: Many-to-one with Flashcard
      - `user`: Many-to-one with User
    - Inherit: `Base`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add flashcard models"`
- Review migration
- Run: `alembic upgrade head`

**Test:**

- Connect to database: `psql synapse`
- Check tables: `\d decks`, `\d flashcards`, `\d reviews`
- Verify foreign keys and indexes

---

### **Step 3.2: Flashcard Schemas (Day 11)**

#### **Files to Create: 1**

76. **`app/schemas/flashcard.py`**
    - Flashcard schemas
    - **Schemas to create:**
      1. `DeckBase`:
         - name, description, tags, is_public
      2. `DeckCreate`:
         - Inherits DeckBase
      3. `DeckUpdate`:
         - All fields optional
      4. `DeckResponse`:
         - Inherits DeckBase
         - Add: id, user_id, card_count, created_at
         - `card_count`: computed field (will calculate)
      5. `FlashcardBase`:
         - front_text, back_text, front_media_url, back_media_url
      6. `FlashcardCreate`:
         - Inherits FlashcardBase
         - Add: deck_id
      7. `FlashcardUpdate`:
         - All fields optional
      8. `FlashcardResponse`:
         - Inherits FlashcardBase
         - Add: id, deck_id, ease_factor, interval, repetitions
         - next_review, learning_state, times_reviewed
         - accuracy (computed: times_correct / times_reviewed)
      9. `ReviewCreate`:
         - card_id, quality, time_taken_ms
      10. `ReviewResponse`:
      - All fields from model
      11. `ReviewResult`:
      - next_review_date, new_interval, new_ease_factor
      - success, message

**Test:**

- Create test script to validate schemas
- Verify validation rules (quality 0-5, required fields)

---

### **Step 3.3: Flashcard Repository (Day 12)**

#### **Files to Create: 1**

77. **`app/modules/flashcards/repository.py`** ⭐ **CRITICAL NEW PATTERN**
    - SQL query repository
    - **Purpose:** All SQL queries for flashcards in one place
    - **Class:** `FlashcardRepository`
    - **Methods to implement:**
      1. `async def record_review(self, card_id: int, quality: int) -> Dict:`
         - Execute SQL function: `SELECT * FROM record_review($1, $2)`
         - Parse JSON result
         - Return: next_review, new_interval, success
      2. `async def get_due_cards(self, user_id: int, limit: int = 20) -> List[Dict]:`
         - Execute SQL function: `SELECT * FROM get_due_cards($1, $2)`
         - Return list of cards due for review
      3. `async def calculate_mastery(self, user_id: int, topic: str) -> float:`
         - Execute SQL function: `SELECT calculate_mastery($1, $2)`
         - Return mastery score (0.0-1.0)
      4. `async def get_deck_statistics(self, deck_id: int) -> Dict:`
         - Query: Count cards, due cards, mastery average
         - Use DuckDB for aggregations
         - Return statistics
    - **Constructor:** Accept `AsyncSession` as dependency

**Test:**

- Create test flashcard
- Call `record_review(card_id, 4)`
- Verify card updated with new SM-2 values
- Check review record created

---

### **Step 3.4: Flashcard Service (Day 12-13)**

#### **Files to Create: 3**

78. **`app/modules/__init__.py`**
    - Empty file

79. **`app/modules/flashcards/__init__.py`**
    - Import and export module

80. **`app/modules/flashcards/constants.py`**
    - Module constants
    - **Constants:**
      - `LEARNING_STATES = Enum("new", "learning", "review", "mastered")`
      - `QUALITY_RATINGS = {0: "Again", 1: "Hard", 2: "Good", 3: "Easy", 4: "Perfect", 5: "Trivial"}`
      - `DEFAULT_EASE_FACTOR = 2.5`
      - `MIN_EASE_FACTOR = 1.3`
      - `MAX_EASE_FACTOR = 5.0`

81. **`app/modules/flashcards/service.py`** ⭐ **CRITICAL**
    - Flashcard business logic
    - **Class:** `FlashcardService`
    - **Constructor:** Accept `AsyncSession`, `FlashcardRepository`
    - **Methods to implement:**
      1. `async def create_deck(self, user_id: int, data: DeckCreate) -> Deck:`
         - Create Deck model
         - Save to database
         - Return deck
      2. `async def get_deck(self, deck_id: int, user_id: int) -> Deck:`
         - Query deck by id and user_id
         - Raise 404 if not found
         - Return deck
      3. `async def list_decks(self, user_id: int, filters: Dict) -> List[Deck]:`
         - Query decks with filters (tags, is_public)
         - Apply pagination
         - Return list
      4. `async def update_deck(self, deck_id: int, user_id: int, data: DeckUpdate) -> Deck:`
         - Get deck (verify ownership)
         - Update fields
         - Save
         - Invalidate context cache
         - Return updated deck
      5. `async def delete_deck(self, deck_id: int, user_id: int) -> bool:`
         - Get deck
         - Soft delete (set deleted_at)
         - Invalidate cache
         - Return True
      6. `async def create_card(self, user_id: int, data: FlashcardCreate) -> Flashcard:`
         - Verify deck ownership
         - Create Flashcard model
         - Set initial SM-2 values
         - Save
         - Trigger event: "card.created"
         - Return card
      7. `async def get_card(self, card_id: int, user_id: int) -> Flashcard:`
         - Query with ownership verification
         - Return card
      8. `async def update_card(self, card_id: int, user_id: int, data: FlashcardUpdate) -> Flashcard:`
         - Get card
         - Update fields
         - Save
         - Trigger event: "card.updated"
         - Return card
      9. `async def review_card(self, card_id: int, user_id: int, quality: int) -> ReviewResult:`
         - Verify ownership
         - Call repository: `record_review(card_id, quality)`
         - Invalidate context cache
         - Trigger event: "card.reviewed"
         - Return ReviewResult
      10. `async def get_due_cards(self, user_id: int, deck_id: Optional[int] = None, limit: int = 20) -> List[Flashcard]:`
      - Call repository: `get_due_cards(user_id, limit)`
      - If deck_id: filter by deck
      - Return cards

**Test:**

- Create service instance
- Create deck: `service.create_deck(user_id, data)`
- Create cards: `service.create_card(user_id, data)`
- Review card: `service.review_card(card_id, user_id, 4)`
- Verify SM-2 calculation correct

---

### **Step 3.5: Flashcard Module Registration (Day 13)**

#### **Files to Create: 2**

82. **`app/core/module_system/base.py`** ⭐ **CRITICAL**
    - LearningModule interface
    - **Abstract Class:** `LearningModule`
    - **Abstract Methods:**
      1. `def get_name(self) -> str` - Module identifier
      2. `def get_display_name(self) -> str` - Human-readable name
      3. `def get_description(self) -> str` - Module description
      4. `def get_capabilities(self) -> List[ModuleCapability]` - Feature flags
      5. `async def create_content(self, user_id: int, data: Dict) -> Any`
      6. `async def get_content(self, user_id: int, filters: Dict) -> List[Any]`
      7. `async def update_content(self, user_id: int, content_id: int, data: Dict) -> Any`
      8. `async def delete_content(self, user_id: int, content_id: int) -> bool`
      9. `async def search_content(self, user_id: int, query: str, filters: Dict) -> List[Any]`
      10. `async def contribute_context(self, user_id: int, query: str) -> Dict` ⭐ **CRITICAL**
    - **Optional Methods:**
      - `async def get_study_items(self, user_id: int, limit: int) -> List[Any]`
      - `async def record_study_result(self, user_id: int, item_id: int, result: Dict)`
      - `async def generate_with_ai(self, user_id: int, prompt: str, context: Dict) -> Any`
      - `async def analyze_performance(self, user_id: int) -> Dict`

83. **`app/core/module_system/capabilities.py`**
    - Module capability enum
    - **Enum:** `ModuleCapability`
    - **Values:**
      - `CREATE`, `READ`, `UPDATE`, `DELETE`
      - `SEARCH`, `STUDY`, `AI_GENERATE`
      - `ANALYTICS`, `EXPORT`, `IMPORT`

84. **`app/core/module_system/registry.py`**
    - Module registry singleton
    - **Class:** `ModuleRegistry`
    - **Pattern:** Singleton
    - **Attributes:**
      - `_modules: Dict[str, LearningModule]` - Module storage
    - **Methods:**
      1. `def register(self, module: LearningModule):`
         - Add module to registry
         - Validate name unique
         - Log registration
      2. `def unregister(self, name: str):`
         - Remove module
      3. `def get_module(self, name: str) -> LearningModule:`
         - Retrieve by name
         - Raise if not found
      4. `def get_all_modules(self) -> List[LearningModule]:`
         - Return all modules
      5. `def get_modules_by_capability(self, capability: ModuleCapability) -> List[LearningModule]:`
         - Filter by capability
      6. `def module_exists(self, name: str) -> bool:`
         - Check if registered

85. **`app/core/module_system/loader.py`**
    - Automatic module discovery
    - **Function:** `async def load_modules():`
      - Scan `app/modules/` directory
      - For each subdirectory:
        1. Check if `module.py` exists
        2. Import dynamically
        3. Find class inheriting from `LearningModule`
        4. Instantiate (inject dependencies)
        5. Register with `ModuleRegistry`
        6. Log success or error
      - Report loading summary

86. **`app/modules/flashcards/module.py`** ⭐ **FIRST MODULE IMPLEMENTATION**
    - Flashcard module implementation
    - **Class:** `FlashcardModule(LearningModule)`
    - **Constructor:** Accept `AsyncSession` (injected by loader)
    - **Implement all abstract methods:**
      1. `get_name()` → "flashcards"
      2. `get_display_name()` → "Flashcards"
      3. `get_description()` → "Spaced repetition flashcards..."
      4. `get_capabilities()` → [CREATE, READ, UPDATE, DELETE, SEARCH, STUDY, AI_GENERATE]
      5. `async def create_content(...)`:
         - Create FlashcardService
         - Call `service.create_card(...)`
         - Return card
      6. `async def get_content(...)`:
         - Get user's flashcards
         - Apply filters
         - Return list
      7. `async def update_content(...)`:
         - Call `service.update_card(...)`
      8. `async def delete_content(...)`:
         - Call `service.delete_card(...)`
      9. `async def search_content(...)`:
         - Vector search in LanceDB
         - Return ranked cards
      10. `async def contribute_context(...)` ⭐ **MOST CRITICAL**:
      - Call repository: `get_due_cards(user_id)`
      - Get weak areas from SQL function
      - Get recent reviews
      - Return Dict:

```python
           {
             "module": "flashcards",
             "relevant_content": [cards],
             "weak_areas": [topics],
             "due_count": int,
             "statistics": {...}
           }
```

    - **Optional Methods:**
      - `get_study_items()` → Get due cards
      - `record_study_result()` → Record review

**Update `app/main.py`:**

- Import `load_modules`
- Add to startup: `await load_modules()`

**Test:**

- Run app
- Check logs for "Module loaded: flashcards"
- Verify in registry: `ModuleRegistry.get_module("flashcards")`

---

### **Step 3.6: Flashcard REST API (Day 14)**

#### **Files to Create: 2**

87. **`app/api/rest/decks.py`**
    - Deck endpoints
    - **Endpoints:**
      1. `GET /api/v1/decks` - List decks
         - Query params: tags, is_public, page, page_size
         - Use FlashcardService
         - Return paginated decks
      2. `POST /api/v1/decks` - Create deck
         - Auth required
         - Validate input
         - Create deck
         - Return DeckResponse
      3. `GET /api/v1/decks/{id}` - Get deck
         - Verify ownership or public
         - Return deck with statistics
      4. `PUT /api/v1/decks/{id}` - Update deck
         - Verify ownership
         - Update
         - Return updated deck
      5. `DELETE /api/v1/decks/{id}` - Delete deck
         - Verify ownership
         - Soft delete
         - Return success message
      6. `GET /api/v1/decks/{id}/cards` - Get cards in deck
         - Paginated
         - Filter by learning_state
      7. `POST /api/v1/decks/{id}/cards` - Add card to deck
         - Verify deck ownership
         - Create card
         - Return card
      8. `GET /api/v1/decks/{id}/statistics` - Get deck stats
         - Card counts by state
         - Mastery average
         - Accuracy

88. **`app/api/rest/flashcards.py`**
    - Flashcard endpoints
    - **Endpoints:**
      1. `GET /api/v1/cards/{id}` - Get card
         - Verify ownership
         - Return card with review history
      2. `PUT /api/v1/cards/{id}` - Update card
         - Verify ownership
         - Update
         - Return updated card
      3. `DELETE /api/v1/cards/{id}` - Delete card
         - Verify ownership
         - Delete
         - Return success
      4. `POST /api/v1/cards/{id}/review` ⭐ **CRITICAL**
         - Record review
         - Input: quality (0-5)
         - Call service: `review_card(...)`
         - Return ReviewResult (next_review, new_interval)
      5. `GET /api/v1/cards/{id}/history` - Review history
         - Get all reviews for card
         - Return list
      6. `GET /api/v1/cards/due` - Get due cards
         - Query params: deck_id, limit
         - Call service: `get_due_cards(...)`
         - Return cards
      7. `POST /api/v1/cards/generate` - AI generate cards (placeholder for now)
         - Will implement in AI phase
         - Return 501 Not Implemented for now

**Update `app/api/rest/router.py`:**

- Import decks and flashcards routers
- Include:

```python
  api_router.include_router(decks.router, prefix="/decks", tags=["Flashcards"])
  api_router.include_router(flashcards.router, prefix="/cards", tags=["Flashcards"])
```

**Test:**

- Create deck: `POST /api/v1/decks`
- Add cards: `POST /api/v1/decks/{id}/cards`
- Get due cards: `GET /api/v1/cards/due`
- Review card: `POST /api/v1/cards/{id}/review` with quality=4
- Verify SM-2 calculation
- Get card again and check next_review updated

---

## 📅 Phase 4: AI Layer Foundation (Week 4)

### **Goal:** Gemini integration, tools, basic agent, RAG setup

---

### **Step 4.1: Gemini Provider (Day 15)**

#### **Files to Create: 6**

89. **`app/core/ai/__init__.py`**
    - Import and export orchestrator

90. **`app/core/ai/providers/__init__.py`**
    - Import and export providers

91. **`app/core/ai/providers/base.py`**
    - Abstract provider interface
    - **Abstract Class:** `BaseAIProvider`
    - **Abstract Methods:**
      - `async def generate(self, prompt: str, **kwargs) -> str`
      - `async def generate_stream(self, prompt: str, **kwargs) -> AsyncIterator[str]`
      - `async def generate_with_tools(self, prompt: str, tools: List, **kwargs) -> Dict`
      - `def get_model_name(self) -> str`

92. **`app/core/ai/providers/gemini.py`** ⭐ **CRITICAL**
    - Gemini API integration
    - **Class:** `GeminiProvider(BaseAIProvider)`
    - **Constructor:**
      - Accept API key
      - Initialize Gemini client: `genai.configure(api_key=settings.GEMINI_API_KEY)`
    - **Methods:**
      1. `async def generate(self, prompt: str, model: str = "gemini-1.5-flash", **kwargs) -> str:`
         - Create model instance: `genai.GenerativeModel(model)`
         - Generate: `response = await model.generate_content_async(prompt, **kwargs)`
         - Return text
      2. `async def generate_stream(self, prompt: str, model: str = "gemini-1.5-flash", **kwargs) -> AsyncIterator[str]:`
         - Create model
         - Stream: `async for chunk in model.generate_content_async(prompt, stream=True, **kwargs):`
         - Yield chunk.text
      3. `async def generate_with_tools(self, prompt: str, tools: List, model: str = "gemini-1.5-flash", **kwargs) -> Dict:`
         - Convert tools to Gemini format
         - Generate with function_declarations
         - Parse function calls
         - Return response + function_calls
      4. `async def generate_with_grounding(self, prompt: str, model: str = "gemini-1.5-flash") -> str:`
         - Enable google_search_retrieval tool
         - Generate
         - Return text with grounding metadata

93. **`app/core/ai/providers/gemini_files.py`**
    - Gemini Files API handler
    - **Functions:**
      1. `async def upload_file(file_path: str, display_name: str) -> str:`
         - Upload to Gemini Files API
         - Return file URI
         - Store expiration time (48 hours)
      2. `async def check_expiration(file_uri: str) -> bool:`
         - Check if file expired
         - Return True if expired
      3. `async def refresh_file(file_uri: str, file_path: str) -> str:`
         - Re-upload before expiration
         - Return new URI

94. **`app/models/ai_usage.py`**
    - AI usage tracking model
    - **Fields:**
      - `id`, `user_id` (FK)
      - `operation_type` (String: chat, generation, analysis)
      - `model_used` (String: pro, flash, flash-lite)
      - `tokens_input`, `tokens_output`, `tokens_total` (Integer)
      - `cost` (Decimal, estimated)
      - `duration_ms` (Integer)
      - `success` (Boolean)
      - `error_message` (Text, nullable)
      - `grounding_used` (Boolean)
      - `function_calls` (Integer)
      - `created_at` (DateTime)
    - Inherit: `Base`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add ai usage model"`
- Run: `alembic upgrade head`

**Test:**

- Create GeminiProvider instance
- Test: `await provider.generate("Hello, how are you?")`
- Verify response
- Test streaming: Collect chunks
- Track usage in database

---

### **Step 4.2: Quota Manager (Day 15-16)**

#### **Files to Create: 2**

95. **`app/core/ai/quota_manager.py`** ⭐ **CRITICAL**
    - Track and enforce Gemini quotas
    - **Class:** `QuotaManager`
    - **Constructor:** Accept Redis client
    - **Quota Limits (from Gemini Free Tier):**

```python
      LIMITS = {
          "pro": {"rpm": 5, "tpm": 125000, "rpd": 100},
          "flash": {"rpm": 10, "tpm": 250000, "rpd": 250},
          "flash-lite": {"rpm": 15, "tpm": 250000, "rpd": 1000},
          "grounding": {"rpd": 500}  # Shared with flash-lite
      }
```

    - **Methods:**
      1. `async def check_quota(self, model: str) -> bool:`
         - Check RPM: `redis.get(f"gemini:quota:{model}:rpm:{minute}")`
         - Check TPM: `redis.get(f"gemini:quota:{model}:tpm:{minute}")`
         - Check RPD: `redis.get(f"gemini:quota:{model}:rpd:{date}")`
         - Return True if all within limits
      2. `async def increment(self, model: str, tokens: int):`
         - Increment RPM counter
         - Increment TPM counter: `redis.incrby(..., tokens)`
         - Increment RPD counter
         - Set expiration: 60s for RPM, 1440m for RPD
      3. `async def get_quota_status(self, model: str) -> Dict:`
         - Return current usage and limits
         - Calculate remaining
         - Calculate reset time
      4. `async def reset_daily_quota():`
         - Called at midnight Pacific
         - Delete all RPD keys
      5. `async def has_quota(self, model: str, tokens: int = 0) -> bool:`
         - Check if request can be made
         - Account for tokens
         - Return True/False

96. **`app/core/ai/streaming_handler.py`**
    - Parse and format streaming responses
    - **Functions:**
      1. `async def parse_stream(stream: AsyncIterator, format: str = "websocket") -> AsyncIterator[Dict]:`
         - Parse Gemini stream chunks
         - Detect message types: token, tool_call, tool_result, metadata, done, error
         - Format for WebSocket transmission
         - Yield formatted messages:

```python
           {"type": "token", "text": "word", "model": "flash"}
           {"type": "tool_call", "tool": "create_flashcard", "args": {...}}
           {"type": "done", "total_tokens": 150, "model_used": "flash"}
```

      2. `def count_tokens(text: str) -> int:`
         - Approximate token count
         - Use: `len(text.split()) * 1.3` (rough estimate)
         - For accurate count, use Gemini API token counter

**Test:**

- Create QuotaManager instance
- Check quota: `await quota_manager.check_quota("flash")`
- Make request
- Increment: `await quota_manager.increment("flash", 100)`
- Verify counters in Redis
- Check quota status
- Approach limit and verify blocks request

---

### **Step 4.3: AI Orchestrator (Day 16)**

#### **Files to Create: 2**

97. **`app/core/ai/orchestrator.py`** ⭐ **CRITICAL ENTRY POINT**
    - Central AI coordinator
    - **Class:** `AIOrchestrator`
    - **Constructor:**
      - Accept GeminiProvider, QuotaManager
      - Initialize fallback chain: Pro → Flash → Flash-Lite
    - **Methods:**
      1. `async def chat(self, user_id: int, message: str, context: Dict, model: str = "auto") -> str:`
         - Select model (if "auto": choose based on complexity)
         - Check quota
         - If no quota: try fallback
         - Generate response
         - Track usage in database
         - Return response
      2. `async def stream_chat(self, user_id: int, message: str, context: Dict, model: str = "auto") -> AsyncIterator[Dict]:`
         - Select model
         - Check quota
         - Generate stream
         - Track usage
         - Yield formatted chunks
      3. `async def generate_content(self, user_id: int, prompt: str, model: str = "auto") -> str:`
         - For non-conversational generation
         - Similar to chat but no context
      4. `async def call_with_tools(self, user_id: int, message: str, tools: List, model: str = "auto") -> Dict:`
         - Generate with function declarations
         - Parse function calls
         - Return response + calls
      5. `def select_model(self, complexity: str, time_constraint: str) -> str:`
         - Logic:
           - High complexity + no time constraint → "pro"
           - Medium complexity → "flash"
           - Low complexity or high throughput → "flash-lite"
      6. `async def try_fallback(self, model: str, **kwargs) -> str:`
         - Fallback chain logic
         - Try Pro → Flash → Flash-Lite
         - Return response or raise QuotaExceededError

98. **`app/api/rest/health.py`**
    - Health check endpoints
    - **Endpoints:**
      1. `GET /api/v1/health` - Overall health
         - Check PostgreSQL, Redis, LanceDB, DuckDB, Gemini
         - Return overall status + service statuses
      2. `GET /api/v1/quota` - Gemini quota status
         - Get quota status for all models
         - Return usage, limits, remaining, reset time

**Update `app/api/rest/router.py`:**

- Include health router

**Test:**

- Initialize orchestrator
- Test chat: `await orchestrator.chat(user_id, "Hello", {})`
- Verify model selection
- Verify fallback when quota low
- Check usage tracked in database
- Test quota endpoint: `GET /api/v1/quota`

---

### **Step 4.4: AI Tools Foundation (Day 17)**

#### **Files to Create: 7**

99. **`app/core/ai/tools/__init__.py`**
    - Import and export tools

100. **`app/core/ai/tools/base.py`** ⭐ **CRITICAL**
     - BaseTool interface
     - **Abstract Class:** `BaseTool`
     - **Attributes:**
       - `name: str` - Tool identifier
       - `description: str` - What tool does
       - `version: str` - Tool version
       - `parameters: Dict` - JSON Schema for parameters
       - `returns: Dict` - Return type schema
       - `requires_auth: bool` - Authentication required
       - `required_permissions: List[str]` - Permission requirements
       - `timeout_seconds: int` - Execution timeout
       - `retry_attempts: int` - Retry on failure
     - **Abstract Methods:**
       - `async def execute(self, user_id: int, **kwargs) -> Dict`
       - `async def validate_input(self, **kwargs) -> bool`
       - `def get_schema(self) -> Dict` - Returns Gemini-compatible schema

101. **`app/core/ai/tools/registry.py`** (continued)
     - **Methods:**
       - `def register_tool(self, tool: BaseTool)`
       - `def get_tool(self, name: str) -> BaseTool`
       - `def get_all_tools(self) -> List[BaseTool]`
       - `def get_tools_for_user(self, user_id: int) -> List[BaseTool]` - Filter by permissions
       - `def generate_function_declarations(self) -> List[Dict]` - For Gemini API
         - Convert all tools to Gemini function declaration format
         - Return list of declarations

102. **`app/core/ai/tools/flashcard_tools.py`** ⭐ **FIRST TOOL**
     - Flashcard manipulation tools
     - **Tools to implement:**
       1. `CreateFlashcardTool(BaseTool)`:
          - `name = "create_flashcard"`
          - `description = "Create a new flashcard in a specific deck"`
          - `parameters`:

```python
            {
              "type": "object",
              "properties": {
                "deck_id": {"type": "integer", "description": "ID of the deck"},
                "front_text": {"type": "string", "description": "Front of card"},
                "back_text": {"type": "string", "description": "Back of card"}
              },
              "required": ["deck_id", "front_text", "back_text"]
            }
```

          - `async def execute(self, user_id: int, deck_id: int, front_text: str, back_text: str) -> Dict`:
            - Get FlashcardModule from registry
            - Create card: `module.create_content(user_id, {...})`
            - Return: `{"card_id": id, "success": True}`

       2. `SearchFlashcardsTool(BaseTool)`:
          - `name = "search_flashcards"`
          - `description = "Search flashcards by content"`
          - `parameters`: query, deck_id (optional), limit
          - `async def execute(...)`:
            - Get FlashcardModule
            - Call: `module.search_content(user_id, query, {})`
            - Return matching cards

       3. `GetDueCardsTool(BaseTool)`:
          - `name = "get_due_cards"`
          - `description = "Get cards due for review"`
          - `parameters`: deck_id (optional), limit
          - `async def execute(...)`:
            - Get FlashcardModule
            - Call: `module.get_study_items(user_id, limit)`
            - Return due cards

103. **`app/core/ai/tools/context_tools.py`**
     - Context retrieval tools
     - **Tools:**
       1. `GetUserContextTool(BaseTool)`:
          - `name = "get_user_context"`
          - `description = "Retrieve user's learning context (weak areas, recent activity, preferences)"`
          - `parameters`: focus (optional topic)
          - `async def execute(self, user_id: int, focus: Optional[str] = None) -> Dict`:
            - Get ContextEngine
            - Call: `engine.get_user_context(user_id, focus)`
            - Return complete context

104. **`app/utils/decorators.py`**
     - Utility decorators
     - **Decorators to implement:**
       1. `@cache(ttl=300)`:
          - Cache function result in Redis
          - Key based on function name + args
          - TTL in seconds
       2. `@retry(max_attempts=3, backoff=2)`:
          - Retry on exception
          - Exponential backoff
       3. `@rate_limit(max_calls=100, period=60)`:
          - Rate limit function calls
          - Per user or global
       4. `@timing`:
          - Measure execution time
          - Log slow operations (>1s)

105. **`scripts/seed_data.py`**
     - Seed test data script
     - **Implementation:**
       1. Create test user account
       2. Create 3 decks with different topics
       3. Create 50 flashcards (varied difficulty)
       4. Create 100 review records (varied quality)
       5. Set realistic timestamps (spread over 30 days)
       6. Log summary
     - **Run:** `python scripts/seed_data.py`

**Register Tools at Startup:**

- Update `app/main.py`:
  - Import ToolRegistry and all tool classes
  - In startup event:

```python
    tool_registry = ToolRegistry()
    tool_registry.register_tool(CreateFlashcardTool())
    tool_registry.register_tool(SearchFlashcardsTool())
    tool_registry.register_tool(GetDueCardsTool())
    tool_registry.register_tool(GetUserContextTool())
```

**Test:**

- Run app
- Check logs: Tools registered
- Test: `ToolRegistry().get_tool("create_flashcard")`
- Execute tool manually:

```python
  tool = ToolRegistry().get_tool("create_flashcard")
  result = await tool.execute(user_id=1, deck_id=1, front_text="Test", back_text="Answer")
```

- Verify card created

---

### **Step 4.5: Basic DeepAgent (Day 18)**

#### **Files to Create: 8**

106. **`app/core/ai/agents/__init__.py`**
     - Import and export agents

107. **`app/core/ai/agents/base_agent.py`** ⭐ **CRITICAL**
     - Base agent class
     - **Class:** `BaseAgent`
     - **Constructor:**
       - Accept: name, description, tools, llm, memory
     - **Attributes:**
       - `name: str`
       - `description: str`
       - `tools: List[BaseTool]`
       - `llm: GeminiProvider` - Language model
       - `memory: Any` - Conversation memory (optional)
       - `middleware: List[Callable]` - Middleware stack
     - **Methods:**
       1. `async def execute(self, user_id: int, input: str, context: Dict = None) -> str:`
          - Run middleware: Pre-execution
          - Build prompt with context
          - Execute ReAct loop:
            a. Thought: What to do
            b. Action: Call tool
            c. Observation: Tool result
            d. Repeat until done
          - Run middleware: Post-execution
          - Return final response
       2. `async def _react_loop(self, input: str, context: Dict, max_iterations: int = 5) -> str:`
          - ReAct pattern implementation
          - Loop:
            - Generate thought + action
            - Parse action from response
            - Execute tool
            - Add observation to context
            - Generate next thought or final answer
          - Return final answer
       3. `def add_middleware(self, middleware: Callable):`
          - Add middleware to stack
       4. `async def _run_middleware(self, stage: str, data: Dict):`
          - Execute middleware stack
          - Stage: "pre" or "post"

108. **`app/core/ai/agents/registry.py`**
     - Agent registry
     - **Class:** `AgentRegistry`
     - **Pattern:** Singleton
     - **Methods:**
       - `def register(self, agent: BaseAgent)`
       - `def get_agent(self, name: str) -> BaseAgent`
       - `def list_agents(self) -> List[str]`

109. **`app/core/ai/agents/factory.py`**
     - Agent creation factory
     - **Function:** `def create_agent(name: str, config: Dict) -> BaseAgent:`
       - Load agent configuration
       - Instantiate agent class
       - Load tools
       - Set up middleware
       - Return configured agent

110. **`app/core/ai/agents/middleware/__init__.py`**
     - Import middleware

111. **`app/core/ai/agents/middleware/context_injection.py`** ⭐ **MOST CRITICAL**
     - Inject SYNAPSE context into agent
     - **Function:** `async def context_injection_middleware(agent: BaseAgent, stage: str, data: Dict):`
       - If stage == "pre":
         1. Extract user_id from data
         2. Get ContextEngine
         3. Call: `context = await engine.get_user_context(user_id)`
         4. Inject into data["context"]
         5. Agent now sees:
            - Weak areas
            - Recent activity
            - Learning preferences
            - Due cards
            - Performance metrics

112. **`app/core/ai/agents/middleware/quota_check.py`**
     - Check Gemini quota before execution
     - **Function:** `async def quota_check_middleware(agent: BaseAgent, stage: str, data: Dict):`
       - If stage == "pre":
         1. Get QuotaManager
         2. Check: `has_quota = await quota_manager.check_quota(model)`
         3. If no quota: Raise QuotaExceededError
         4. Reserve quota for request

113. **`app/core/ai/agents/implementations/__init__.py`**
     - Import agent implementations

114. **`app/core/ai/agents/implementations/tutor_agent.py`** ⭐ **FIRST AGENT**
     - Main tutoring agent
     - **Class:** `TutorAgent(BaseAgent)`
     - **Constructor:**
       - Set name: "tutor"
       - Set description: "AI tutor that helps students learn with Socratic questioning"
       - Load tools: [CreateFlashcardTool, SearchFlashcardsTool, GetUserContextTool]
       - Add middleware: [context_injection_middleware, quota_check_middleware]
     - **System Prompt:**

```
       You are a patient and encouraging AI tutor.
       Your approach:
       - Ask Socratic questions to guide learning
       - Provide explanations at appropriate difficulty level
       - Use examples and analogies
       - Celebrate progress
       - Adapt to student's learning style

       Current student context:
       {context}

       Guidelines:
       - Never give direct answers initially
       - Build on student's existing knowledge
       - Use positive reinforcement
       - Focus on weak areas: {weak_areas}
```

     - **Override execute() if needed for custom behavior**

**Register Agent:**

- Update `app/main.py`:

```python
  # After tools registered
  agent_registry = AgentRegistry()

  tutor_agent = TutorAgent(
      llm=GeminiProvider(),
      tools=ToolRegistry().get_all_tools()
  )
  agent_registry.register(tutor_agent)
```

**Test:**

- Create tutor agent
- Execute: `await agent.execute(user_id=1, input="Help me with flashcards about biology")`
- Verify:
  - Context injected (check logs)
  - Agent uses tools (creates/searches flashcards)
  - Response personalized based on weak areas
  - Quota checked

---

## 📅 Phase 5: RAG Layer with Llama Index (Week 5)

### **Goal:** Complete RAG pipeline using Llama Index, SYNAPSE bridge

---

### **Step 5.1: Llama Index Core (Day 19-20)**

#### **Files to Create: 9**

115. **`app/core/ai/rag/__init__.py`**
     - Import RAG components

116. **`app/core/ai/rag/llama_index/__init__.py`**
     - Import Llama Index components

117. **`config/llama_index.yaml`**
     - Llama Index configuration
     - **Configuration:**

```yaml
embedding:
  model: "sentence-transformers/all-MiniLM-L6-v2"
  dimensions: 384
  batch_size: 32

chunking:
  strategy: "sentence"
  chunk_size: 512
  chunk_overlap: 50

retrieval:
  top_k: 5
  similarity_threshold: 0.7

storage:
  vector_store: "lancedb"
  persist_dir: "data/llama_index"
```

118. **`app/core/ai/rag/llama_index/service_context.py`** ⭐ **CRITICAL**
     - Configure Llama Index services
     - **Function:** `def get_service_context() -> ServiceContext:`
       - Load config from yaml
       - Configure embedding model:

```python
         from llama_index.embeddings import HuggingFaceEmbedding
         embed_model = HuggingFaceEmbedding(
             model_name="sentence-transformers/all-MiniLM-L6-v2"
         )
```

       - Configure LLM (Gemini):

```python
         from llama_index.llms import Gemini
         llm = Gemini(model_name="gemini-1.5-flash", api_key=settings.GEMINI_API_KEY)
```

       - Configure chunk settings
       - Create ServiceContext:

```python
         from llama_index import ServiceContext
         service_context = ServiceContext.from_defaults(
             llm=llm,
             embed_model=embed_model,
             chunk_size=512,
             chunk_overlap=50
         )
```

       - Return service_context

119. **`app/core/ai/rag/llama_index/storage_context.py`**
     - Configure LanceDB as vector store
     - **Function:** `def get_storage_context() -> StorageContext:`
       - Initialize LanceDB vector store:

```python
         from llama_index.vector_stores import LanceDBVectorStore
         vector_store = LanceDBVectorStore(
             uri=settings.LANCEDB_PATH,
             table_name="llama_index_vectors"
         )
```

       - Create StorageContext:

```python
         from llama_index import StorageContext
         storage_context = StorageContext.from_defaults(
             vector_store=vector_store,
             persist_dir="data/llama_index/docstore"
         )
```

       - Return storage_context

120. **`app/core/ai/rag/llama_index/index_manager.py`** ⭐ **CRITICAL**
     - Create and manage indices
     - **Class:** `IndexManager`
     - **Constructor:** Accept service_context, storage_context
     - **Methods:**
       1. `async def create_index(self, documents: List[Document], index_id: str) -> VectorStoreIndex:`
          - Create VectorStoreIndex from documents
          - Persist to disk
          - Store metadata (index_id, created_at, document_count)
          - Return index
       2. `async def load_index(self, index_id: str) -> VectorStoreIndex:`
          - Load existing index from disk
          - Return index
       3. `async def update_index(self, index_id: str, documents: List[Document]):`
          - Load index
          - Insert new documents
          - Persist
       4. `async def delete_index(self, index_id: str):`
          - Delete index files
       5. `async def list_indices(self) -> List[str]:`
          - List all index IDs
       6. `def get_index_for_user(self, user_id: int) -> str:`
          - Return index_id for user's content
          - Pattern: `f"user_{user_id}"`

121. **`app/core/ai/rag/llama_index/query_engine.py`** ⭐ **CRITICAL**
     - Query interface
     - **Class:** `QueryEngine`
     - **Constructor:** Accept IndexManager
     - **Methods:**
       1. `async def query(self, user_id: int, query: str, filters: Dict = None, top_k: int = 5) -> List[Dict]:`
          - Get user's index: `index = await index_manager.load_index(f"user_{user_id}")`
          - Create query engine: `query_engine = index.as_query_engine(similarity_top_k=top_k)`
          - Apply filters if provided
          - Execute query: `response = await query_engine.aquery(query)`
          - Extract source nodes with scores
          - Return results:

```python
            [
              {
                "text": "chunk text",
                "score": 0.85,
                "metadata": {
                  "source": "note_id",
                  "page": 1
                }
              },
              ...
            ]
```

       2. `async def query_with_context(self, user_id: int, query: str, context: Dict) -> List[Dict]:`
          - Enhance query with context (will implement in synapse_bridge)
          - Execute query
          - Return results

122. **`app/core/ai/rag/embeddings/__init__.py`**
     - Import embedding components

123. **`app/core/ai/rag/embeddings/manager.py`**
     - Embedding coordinator
     - **Class:** `EmbeddingManager`
     - **Constructor:** Accept embedding model
     - **Methods:**
       1. `async def generate_embedding(self, text: str) -> List[float]:`
          - Check cache (Redis): `embedding:{hash(text)}`
          - If cached: return
          - Generate: `embedding = model.encode(text)`
          - Cache for 24 hours
          - Return embedding (384 dimensions)
       2. `async def generate_batch(self, texts: List[str]) -> List[List[float]]:`
          - Batch processing for efficiency
          - Check cache for each
          - Generate missing
          - Cache results
          - Return all embeddings

**Initialize at Startup:**

- Update `app/main.py`:

```python
  # After database connections
  service_context = get_service_context()
  storage_context = get_storage_context()
  index_manager = IndexManager(service_context, storage_context)
  query_engine = QueryEngine(index_manager)
```

**Test:**

- Create test documents
- Create index: `await index_manager.create_index(documents, "test_index")`
- Query: `results = await query_engine.query(user_id, "test query")`
- Verify results with scores
- Check LanceDB for vectors

---

### **Step 5.2: SYNAPSE Bridge (Day 20-21)**

#### **Files to Create: 3**

124. **`app/core/ai/rag/synapse_bridge.py`** ⭐ **MOST CRITICAL FILE IN RAG**
     - Bridge between SYNAPSE and Llama Index
     - **Purpose:** Make Llama Index SYNAPSE-aware
     - **Class:** `SynapseBridge`
     - **Constructor:**
       - Accept: QueryEngine, ContextEngine, RerankerManager
     - **Methods:**
       1. `async def query_with_synapse_context(self, user_id: int, query: str, focus: Optional[str] = None) -> Dict:`
          - **Step 1:** Get SYNAPSE context

```python
            context = await context_engine.get_user_context(user_id, focus)
            weak_areas = context["analytics"]["weak_topics"]
            recent_activity = context["analytics"]["recent_activity"]
```

          - **Step 2:** Enhance query

```python
            # Boost weak areas in search
            enhanced_query = f"{query}"
            if weak_areas:
                enhanced_query += f" Focus on: {', '.join(weak_areas[:3])}"
```

          - **Step 3:** Query Llama Index

```python
            results = await query_engine.query(user_id, enhanced_query, top_k=10)
```

          - **Step 4:** Rerank with SYNAPSE priorities

```python
            reranked = await self._rerank_by_weak_areas(results, weak_areas)
```

          - **Step 5:** Build final context

```python
            final_context = {
                "query": query,
                "user_context": context,
                "retrieved_chunks": reranked[:5],
                "weak_areas_coverage": self._calculate_coverage(reranked, weak_areas),
                "sources": self._extract_sources(reranked)
            }
```

          - Return final_context

       2. `async def _rerank_by_weak_areas(self, results: List[Dict], weak_areas: List[str]) -> List[Dict]:`
          - Boost scores for chunks related to weak areas
          - Algorithm:

```python
            for result in results:
                for weak_area in weak_areas:
                    if weak_area.lower() in result["text"].lower():
                        result["score"] *= 1.5  # 50% boost

            # Re-sort by adjusted scores
            results.sort(key=lambda x: x["score"], reverse=True)
```

          - Return reranked results

       3. `def _calculate_coverage(self, results: List[Dict], weak_areas: List[str]) -> Dict:`
          - Calculate how well results cover weak areas
          - Return: `{weak_area: coverage_percentage}`

       4. `def _extract_sources(self, results: List[Dict]) -> List[Dict]:`
          - Extract unique sources from results
          - Group by source type (note, document, flashcard)
          - Return source metadata

125. **`app/core/ai/rag/context_builder.py`**
     - Final context assembly
     - **Function:** `async def build_rag_context(query: str, retrieved_chunks: List[Dict], user_context: Dict, max_tokens: int = 8000) -> str:`
       - **Format context for Gemini:**

126. **`app/core/ai/tools/registry.py`** (continued)
     - **Methods:**
       - `def register_tool(self, tool: BaseTool)`
       - `def get_tool(self, name: str) -> BaseTool`
       - `def get_all_tools(self) -> List[BaseTool]`
       - `def get_tools_for_user(self, user_id: int) -> List[BaseTool]` - Filter by permissions
       - `def generate_function_declarations(self) -> List[Dict]` - For Gemini API
         - Convert all tools to Gemini function declaration format
         - Return list of declarations

127. **`app/core/ai/tools/flashcard_tools.py`** ⭐ **FIRST TOOL**
     - Flashcard manipulation tools
     - **Tools to implement:**
       1. `CreateFlashcardTool(BaseTool)`:
          - `name = "create_flashcard"`
          - `description = "Create a new flashcard in a specific deck"`
          - `parameters`:

```python
            {
              "type": "object",
              "properties": {
                "deck_id": {"type": "integer", "description": "ID of the deck"},
                "front_text": {"type": "string", "description": "Front of card"},
                "back_text": {"type": "string", "description": "Back of card"}
              },
              "required": ["deck_id", "front_text", "back_text"]
            }
```

          - `async def execute(self, user_id: int, deck_id: int, front_text: str, back_text: str) -> Dict`:
            - Get FlashcardModule from registry
            - Create card: `module.create_content(user_id, {...})`
            - Return: `{"card_id": id, "success": True}`

       2. `SearchFlashcardsTool(BaseTool)`:
          - `name = "search_flashcards"`
          - `description = "Search flashcards by content"`
          - `parameters`: query, deck_id (optional), limit
          - `async def execute(...)`:
            - Get FlashcardModule
            - Call: `module.search_content(user_id, query, {})`
            - Return matching cards

       3. `GetDueCardsTool(BaseTool)`:
          - `name = "get_due_cards"`
          - `description = "Get cards due for review"`
          - `parameters`: deck_id (optional), limit
          - `async def execute(...)`:
            - Get FlashcardModule
            - Call: `module.get_study_items(user_id, limit)`
            - Return due cards

103. **`app/core/ai/tools/context_tools.py`**
     - Context retrieval tools
     - **Tools:**
       1. `GetUserContextTool(BaseTool)`:
          - `name = "get_user_context"`
          - `description = "Retrieve user's learning context (weak areas, recent activity, preferences)"`
          - `parameters`: focus (optional topic)
          - `async def execute(self, user_id: int, focus: Optional[str] = None) -> Dict`:
            - Get ContextEngine
            - Call: `engine.get_user_context(user_id, focus)`
            - Return complete context

104. **`app/utils/decorators.py`**
     - Utility decorators
     - **Decorators to implement:**
       1. `@cache(ttl=300)`:
          - Cache function result in Redis
          - Key based on function name + args
          - TTL in seconds
       2. `@retry(max_attempts=3, backoff=2)`:
          - Retry on exception
          - Exponential backoff
       3. `@rate_limit(max_calls=100, period=60)`:
          - Rate limit function calls
          - Per user or global
       4. `@timing`:
          - Measure execution time
          - Log slow operations (>1s)

105. **`scripts/seed_data.py`**
     - Seed test data script
     - **Implementation:**
       1. Create test user account
       2. Create 3 decks with different topics
       3. Create 50 flashcards (varied difficulty)
       4. Create 100 review records (varied quality)
       5. Set realistic timestamps (spread over 30 days)
       6. Log summary
     - **Run:** `python scripts/seed_data.py`

**Register Tools at Startup:**

- Update `app/main.py`:
  - Import ToolRegistry and all tool classes
  - In startup event:

```python
    tool_registry = ToolRegistry()
    tool_registry.register_tool(CreateFlashcardTool())
    tool_registry.register_tool(SearchFlashcardsTool())
    tool_registry.register_tool(GetDueCardsTool())
    tool_registry.register_tool(GetUserContextTool())
```

**Test:**

- Run app
- Check logs: Tools registered
- Test: `ToolRegistry().get_tool("create_flashcard")`
- Execute tool manually:

```python
  tool = ToolRegistry().get_tool("create_flashcard")
  result = await tool.execute(user_id=1, deck_id=1, front_text="Test", back_text="Answer")
```

- Verify card created

---

### **Step 4.5: Basic DeepAgent (Day 18)**

#### **Files to Create: 8**

106. **`app/core/ai/agents/__init__.py`**
     - Import and export agents

107. **`app/core/ai/agents/base_agent.py`** ⭐ **CRITICAL**
     - Base agent class
     - **Class:** `BaseAgent`
     - **Constructor:**
       - Accept: name, description, tools, llm, memory
     - **Attributes:**
       - `name: str`
       - `description: str`
       - `tools: List[BaseTool]`
       - `llm: GeminiProvider` - Language model
       - `memory: Any` - Conversation memory (optional)
       - `middleware: List[Callable]` - Middleware stack
     - **Methods:**
       1. `async def execute(self, user_id: int, input: str, context: Dict = None) -> str:`
          - Run middleware: Pre-execution
          - Build prompt with context
          - Execute ReAct loop:
            a. Thought: What to do
            b. Action: Call tool
            c. Observation: Tool result
            d. Repeat until done
          - Run middleware: Post-execution
          - Return final response
       2. `async def _react_loop(self, input: str, context: Dict, max_iterations: int = 5) -> str:`
          - ReAct pattern implementation
          - Loop:
            - Generate thought + action
            - Parse action from response
            - Execute tool
            - Add observation to context
            - Generate next thought or final answer
          - Return final answer
       3. `def add_middleware(self, middleware: Callable):`
          - Add middleware to stack
       4. `async def _run_middleware(self, stage: str, data: Dict):`
          - Execute middleware stack
          - Stage: "pre" or "post"

108. **`app/core/ai/agents/registry.py`**
     - Agent registry
     - **Class:** `AgentRegistry`
     - **Pattern:** Singleton
     - **Methods:**
       - `def register(self, agent: BaseAgent)`
       - `def get_agent(self, name: str) -> BaseAgent`
       - `def list_agents(self) -> List[str]`

109. **`app/core/ai/agents/factory.py`**
     - Agent creation factory
     - **Function:** `def create_agent(name: str, config: Dict) -> BaseAgent:`
       - Load agent configuration
       - Instantiate agent class
       - Load tools
       - Set up middleware
       - Return configured agent

110. **`app/core/ai/agents/middleware/__init__.py`**
     - Import middleware

111. **`app/core/ai/agents/middleware/context_injection.py`** ⭐ **MOST CRITICAL**
     - Inject SYNAPSE context into agent
     - **Function:** `async def context_injection_middleware(agent: BaseAgent, stage: str, data: Dict):`
       - If stage == "pre":
         1. Extract user_id from data
         2. Get ContextEngine
         3. Call: `context = await engine.get_user_context(user_id)`
         4. Inject into data["context"]
         5. Agent now sees:
            - Weak areas
            - Recent activity
            - Learning preferences
            - Due cards
            - Performance metrics

112. **`app/core/ai/agents/middleware/quota_check.py`**
     - Check Gemini quota before execution
     - **Function:** `async def quota_check_middleware(agent: BaseAgent, stage: str, data: Dict):`
       - If stage == "pre":
         1. Get QuotaManager
         2. Check: `has_quota = await quota_manager.check_quota(model)`
         3. If no quota: Raise QuotaExceededError
         4. Reserve quota for request

113. **`app/core/ai/agents/implementations/__init__.py`**
     - Import agent implementations

114. **`app/core/ai/agents/implementations/tutor_agent.py`** ⭐ **FIRST AGENT**
     - Main tutoring agent
     - **Class:** `TutorAgent(BaseAgent)`
     - **Constructor:**
       - Set name: "tutor"
       - Set description: "AI tutor that helps students learn with Socratic questioning"
       - Load tools: [CreateFlashcardTool, SearchFlashcardsTool, GetUserContextTool]
       - Add middleware: [context_injection_middleware, quota_check_middleware]
     - **System Prompt:**

```
       You are a patient and encouraging AI tutor.
       Your approach:
       - Ask Socratic questions to guide learning
       - Provide explanations at appropriate difficulty level
       - Use examples and analogies
       - Celebrate progress
       - Adapt to student's learning style

       Current student context:
       {context}

       Guidelines:
       - Never give direct answers initially
       - Build on student's existing knowledge
       - Use positive reinforcement
       - Focus on weak areas: {weak_areas}
```

     - **Override execute() if needed for custom behavior**

**Register Agent:**

- Update `app/main.py`:

```python
  # After tools registered
  agent_registry = AgentRegistry()

  tutor_agent = TutorAgent(
      llm=GeminiProvider(),
      tools=ToolRegistry().get_all_tools()
  )
  agent_registry.register(tutor_agent)
```

**Test:**

- Create tutor agent
- Execute: `await agent.execute(user_id=1, input="Help me with flashcards about biology")`
- Verify:
  - Context injected (check logs)
  - Agent uses tools (creates/searches flashcards)
  - Response personalized based on weak areas
  - Quota checked

---

## 📅 Phase 5: RAG Layer with Llama Index (Week 5)

### **Goal:** Complete RAG pipeline using Llama Index, SYNAPSE bridge

---

### **Step 5.1: Llama Index Core (Day 19-20)**

#### **Files to Create: 9**

115. **`app/core/ai/rag/__init__.py`**
     - Import RAG components

116. **`app/core/ai/rag/llama_index/__init__.py`**
     - Import Llama Index components

117. **`config/llama_index.yaml`**
     - Llama Index configuration
     - **Configuration:**

```yaml
embedding:
  model: "sentence-transformers/all-MiniLM-L6-v2"
  dimensions: 384
  batch_size: 32

chunking:
  strategy: "sentence"
  chunk_size: 512
  chunk_overlap: 50

retrieval:
  top_k: 5
  similarity_threshold: 0.7

storage:
  vector_store: "lancedb"
  persist_dir: "data/llama_index"
```

118. **`app/core/ai/rag/llama_index/service_context.py`** ⭐ **CRITICAL**
     - Configure Llama Index services
     - **Function:** `def get_service_context() -> ServiceContext:`
       - Load config from yaml
       - Configure embedding model:

```python
         from llama_index.embeddings import HuggingFaceEmbedding
         embed_model = HuggingFaceEmbedding(
             model_name="sentence-transformers/all-MiniLM-L6-v2"
         )
```

       - Configure LLM (Gemini):

```python
         from llama_index.llms import Gemini
         llm = Gemini(model_name="gemini-1.5-flash", api_key=settings.GEMINI_API_KEY)
```

       - Configure chunk settings
       - Create ServiceContext:

```python
         from llama_index import ServiceContext
         service_context = ServiceContext.from_defaults(
             llm=llm,
             embed_model=embed_model,
             chunk_size=512,
             chunk_overlap=50
         )
```

       - Return service_context

119. **`app/core/ai/rag/llama_index/storage_context.py`**
     - Configure LanceDB as vector store
     - **Function:** `def get_storage_context() -> StorageContext:`
       - Initialize LanceDB vector store:

```python
         from llama_index.vector_stores import LanceDBVectorStore
         vector_store = LanceDBVectorStore(
             uri=settings.LANCEDB_PATH,
             table_name="llama_index_vectors"
         )
```

       - Create StorageContext:

```python
         from llama_index import StorageContext
         storage_context = StorageContext.from_defaults(
             vector_store=vector_store,
             persist_dir="data/llama_index/docstore"
         )
```

       - Return storage_context

120. **`app/core/ai/rag/llama_index/index_manager.py`** ⭐ **CRITICAL**
     - Create and manage indices
     - **Class:** `IndexManager`
     - **Constructor:** Accept service_context, storage_context
     - **Methods:**
       1. `async def create_index(self, documents: List[Document], index_id: str) -> VectorStoreIndex:`
          - Create VectorStoreIndex from documents
          - Persist to disk
          - Store metadata (index_id, created_at, document_count)
          - Return index
       2. `async def load_index(self, index_id: str) -> VectorStoreIndex:`
          - Load existing index from disk
          - Return index
       3. `async def update_index(self, index_id: str, documents: List[Document]):`
          - Load index
          - Insert new documents
          - Persist
       4. `async def delete_index(self, index_id: str):`
          - Delete index files
       5. `async def list_indices(self) -> List[str]:`
          - List all index IDs
       6. `def get_index_for_user(self, user_id: int) -> str:`
          - Return index_id for user's content
          - Pattern: `f"user_{user_id}"`

121. **`app/core/ai/rag/llama_index/query_engine.py`** ⭐ **CRITICAL**
     - Query interface
     - **Class:** `QueryEngine`
     - **Constructor:** Accept IndexManager
     - **Methods:**
       1. `async def query(self, user_id: int, query: str, filters: Dict = None, top_k: int = 5) -> List[Dict]:`
          - Get user's index: `index = await index_manager.load_index(f"user_{user_id}")`
          - Create query engine: `query_engine = index.as_query_engine(similarity_top_k=top_k)`
          - Apply filters if provided
          - Execute query: `response = await query_engine.aquery(query)`
          - Extract source nodes with scores
          - Return results:

```python
            [
              {
                "text": "chunk text",
                "score": 0.85,
                "metadata": {
                  "source": "note_id",
                  "page": 1
                }
              },
              ...
            ]
```

       2. `async def query_with_context(self, user_id: int, query: str, context: Dict) -> List[Dict]:`
          - Enhance query with context (will implement in synapse_bridge)
          - Execute query
          - Return results

122. **`app/core/ai/rag/embeddings/__init__.py`**
     - Import embedding components

123. **`app/core/ai/rag/embeddings/manager.py`**
     - Embedding coordinator
     - **Class:** `EmbeddingManager`
     - **Constructor:** Accept embedding model
     - **Methods:**
       1. `async def generate_embedding(self, text: str) -> List[float]:`
          - Check cache (Redis): `embedding:{hash(text)}`
          - If cached: return
          - Generate: `embedding = model.encode(text)`
          - Cache for 24 hours
          - Return embedding (384 dimensions)
       2. `async def generate_batch(self, texts: List[str]) -> List[List[float]]:`
          - Batch processing for efficiency
          - Check cache for each
          - Generate missing
          - Cache results
          - Return all embeddings

**Initialize at Startup:**

- Update `app/main.py`:

```python
  # After database connections
  service_context = get_service_context()
  storage_context = get_storage_context()
  index_manager = IndexManager(service_context, storage_context)
  query_engine = QueryEngine(index_manager)
```

**Test:**

- Create test documents
- Create index: `await index_manager.create_index(documents, "test_index")`
- Query: `results = await query_engine.query(user_id, "test query")`
- Verify results with scores
- Check LanceDB for vectors

---

### **Step 5.2: SYNAPSE Bridge (Day 20-21)**

#### **Files to Create: 3**

124. **`app/core/ai/rag/synapse_bridge.py`** ⭐ **MOST CRITICAL FILE IN RAG**
     - Bridge between SYNAPSE and Llama Index
     - **Purpose:** Make Llama Index SYNAPSE-aware
     - **Class:** `SynapseBridge`
     - **Constructor:**
       - Accept: QueryEngine, ContextEngine, RerankerManager
     - **Methods:**
       1. `async def query_with_synapse_context(self, user_id: int, query: str, focus: Optional[str] = None) -> Dict:`
          - **Step 1:** Get SYNAPSE context

```python
            context = await context_engine.get_user_context(user_id, focus)
            weak_areas = context["analytics"]["weak_topics"]
            recent_activity = context["analytics"]["recent_activity"]
```

          - **Step 2:** Enhance query

```python
            # Boost weak areas in search
            enhanced_query = f"{query}"
            if weak_areas:
                enhanced_query += f" Focus on: {', '.join(weak_areas[:3])}"
```

          - **Step 3:** Query Llama Index

```python
            results = await query_engine.query(user_id, enhanced_query, top_k=10)
```

          - **Step 4:** Rerank with SYNAPSE priorities

```python
            reranked = await self._rerank_by_weak_areas(results, weak_areas)
```

          - **Step 5:** Build final context

```python
            final_context = {
                "query": query,
                "user_context": context,
                "retrieved_chunks": reranked[:5],
                "weak_areas_coverage": self._calculate_coverage(reranked, weak_areas),
                "sources": self._extract_sources(reranked)
            }
```

          - Return final_context

       2. `async def _rerank_by_weak_areas(self, results: List[Dict], weak_areas: List[str]) -> List[Dict]:`
          - Boost scores for chunks related to weak areas
          - Algorithm:

```python
            for result in results:
                for weak_area in weak_areas:
                    if weak_area.lower() in result["text"].lower():
                        result["score"] *= 1.5  # 50% boost

            # Re-sort by adjusted scores
            results.sort(key=lambda x: x["score"], reverse=True)
```

          - Return reranked results

       3. `def _calculate_coverage(self, results: List[Dict], weak_areas: List[str]) -> Dict:`
          - Calculate how well results cover weak areas
          - Return: `{weak_area: coverage_percentage}`

       4. `def _extract_sources(self, results: List[Dict]) -> List[Dict]:`
          - Extract unique sources from results
          - Group by source type (note, document, flashcard)
          - Return source metadata

125. **`app/core/ai/rag/context_builder.py`**
     - Final context assembly
     - **Function:** `async def build_rag_context(query: str, retrieved_chunks: List[Dict], user_context: Dict, max_tokens: int = 8000) -> str:`
       - **Format context for Gemini:**

     User Learning Context:
     - Weak Areas: {weak_areas}
     - Recent Activity: {recent_activity}
     - Learning Goals: {goals}

     Relevant Information:
     1. [Source: Note "Biology Basics"]
        {chunk_text}
     2. [Source: Document "Textbook Chapter 3", Page 42]
        {chunk_text}
     3. [Source: Flashcard "Cell Structure"]
        Front: {front_text}
        Back: {back_text}

     Query: {query}

     Based on the above context, focusing on weak areas, provide a helpful response.
     - Manage token budget:
       - Prioritize weak area coverage
       - Truncate less relevant chunks if needed
     - Return formatted string

126. **`app/core/ai/rag/reranking/__init__.py`**
     - Import reranking components

127. **`app/core/ai/rag/reranking/synapse_reranker.py`**
     - SYNAPSE-specific reranking
     - **Class:** `SynapseReranker`
     - **Methods:**
       1. `async def rerank(self, query: str, results: List[Dict], user_context: Dict) -> List[Dict]:`
          - Apply multiple reranking strategies:
            a. Weak area boost (already done in bridge)
            b. Recency boost (recent content more relevant)
            c. Interaction history boost (content user engaged with)
            d. Learning state boost (content matching current level)
          - Combine scores with weights
          - Return reranked results
       2. `def _calculate_recency_score(self, result: Dict) -> float:`
          - More recent = higher score
          - Exponential decay
       3. `def _calculate_interaction_score(self, result: Dict, user_history: List) -> float:`
          - Has user reviewed/read this before?
          - How did they perform?

**Test:**

- Create user with flashcards, notes
- Mark some topics as weak (low review quality)
- Query via bridge: `await synapse_bridge.query_with_synapse_context(user_id, "biology cells")`
- Verify:
  - Context includes weak areas
  - Results boosted for weak topics
  - Final context properly formatted
  - Token budget respected

---

### **Step 5.3: Document Processing (Day 21-22)**

#### **Files to Create: 6**

128. **`app/models/document.py`**
     - Document model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `filename`, `file_path`, `file_type`, `file_size`
       - `gemini_file_uri` (String, nullable)
       - `gemini_file_expires_at` (DateTime, nullable)
       - `processing_status` (Enum: pending, processing, completed, failed)
       - `page_count`, `word_count` (Integer, nullable)
       - `metadata` (JSON: author, creation_date, etc.)
     - **Relationships:**
       - `chunks`: One-to-many with DocumentChunk
     - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`, `UserOwnedMixin`

129. **`app/models/document_chunk.py`**
     - Document chunk model
     - **Fields:**
       - `id`, `document_id` (FK)
       - `content` (Text)
       - `chunk_index` (Integer)
       - `page` (Integer, nullable)
       - `start_char`, `end_char` (Integer)
       - `embedding_id` (String, nullable - LanceDB reference)
       - `metadata` (JSON)
     - Inherit: `Base`, `TimestampMixin`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add document models"`
- Run: `alembic upgrade head`

130. **`app/schemas/document.py`**
     - Document schemas
     - **Schemas:**
       - `DocumentUpload` (file: UploadFile)
       - `DocumentResponse` (id, filename, file_type, file_size, processing_status, page_count, created_at)
       - `DocumentChunkResponse` (id, content, chunk_index, page, score)

131. **`app/modules/documents/__init__.py`**
     - Import document module

132. **`app/modules/documents/constants.py`**
     - Document constants
     - **Constants:**
       - `ALLOWED_FILE_TYPES = [".pdf", ".epub", ".docx", ".txt", ".md"]`
       - `MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB`
       - `GEMINI_FILE_SIZE_LIMIT = 2 * 1024 * 1024 * 1024  # 2GB`
       - `CHUNK_SIZE = 512`
       - `CHUNK_OVERLAP = 50`

133. **`app/modules/documents/processing.py`**
     - File processing
     - **Functions:**
       1. `async def extract_text_from_pdf(file_path: str) -> str:`
          - Use PyPDF2 or pdfplumber
          - Extract text from all pages
          - Return concatenated text
       2. `async def extract_text_from_docx(file_path: str) -> str:`
          - Use python-docx
          - Extract text
       3. `async def extract_text_from_txt(file_path: str) -> str:`
          - Read file
          - Decode UTF-8
       4. `async def extract_text(file_path: str, file_type: str) -> str:`
          - Route to appropriate extractor
          - Handle errors
          - Return text

134. **`app/modules/documents/service.py`**
     - Document service
     - **Class:** `DocumentService`
     - **Methods:**
       1. `async def upload_document(self, user_id: int, file: UploadFile) -> Document:`
          - Validate file type and size
          - Generate unique filename
          - Save to storage: `data/uploads/users/{user_id}/documents/{filename}`
          - Create Document record (status: pending)
          - Trigger event: "document.uploaded"
          - Return document
       2. `async def process_document(self, document_id: int):`
          - Get document
          - Update status: processing
          - Extract text
          - Chunk text (using Llama Index chunking)
          - Generate embeddings for chunks
          - Store chunks in database and LanceDB
          - Update Llama Index (add to user's index)
          - Upload to Gemini Files API (if size < 2GB)
          - Update document: page_count, word_count, status: completed
          - Trigger event: "document.processed"
       3. `async def get_document(self, document_id: int, user_id: int) -> Document:`
          - Verify ownership
          - Return document
       4. `async def list_documents(self, user_id: int) -> List[Document]:`
          - Get user's documents
          - Order by created_at DESC
       5. `async def delete_document(self, document_id: int, user_id: int):`
          - Verify ownership
          - Delete chunks from database and LanceDB
          - Delete file
          - Soft delete document

**Test:**

- Upload test PDF: `POST /api/v1/documents` (will create endpoint next)
- Verify document created (status: pending)
- Process document: `await service.process_document(document_id)`
- Verify:
  - Text extracted
  - Chunks created
  - Embeddings generated
  - Added to Llama Index
  - Status: completed

---

### **Step 5.4: Document API (Day 22)**

#### **Files to Create: 3**

135. **`app/modules/documents/module.py`**
     - Document module implementation
     - **Class:** `DocumentModule(LearningModule)`
     - **Implement required methods:**
       - `get_name()` → "documents"
       - `contribute_context()`:
         - Get user's documents
         - Get recent reading activity
         - Return document context

136. **`app/services/storage/__init__.py`**
     - Import storage components

137. **`app/services/storage/local.py`**
     - Local file storage
     - **Class:** `LocalStorage`
     - **Methods:**
       - `async def save_file(self, file: UploadFile, path: str) -> str:`
         - Create directory if not exists
         - Save file to path
         - Return full path
       - `async def delete_file(self, path: str):`
         - Delete file
       - `async def get_file_url(self, path: str) -> str:`
         - Return URL to serve file
         - Pattern: `/uploads/{path}`

138. **`app/services/storage/manager.py`**
     - File operations manager
     - **Class:** `StorageManager`
     - **Constructor:** Accept storage backend (LocalStorage)
     - **Methods:**
       - `async def upload(self, user_id: int, file: UploadFile, category: str) -> str:`
         - Generate path: `users/{user_id}/{category}/{unique_filename}`
         - Save file
         - Return path
       - `async def delete(self, path: str):`
         - Delete file
       - `async def get_url(self, path: str) -> str:`
         - Get public URL

139. **`app/api/rest/documents.py`**
     - Document endpoints
     - **Endpoints:**
       1. `GET /api/v1/documents` - List documents
          - Return user's documents
       2. `POST /api/v1/documents` - Upload document
          - Accept file upload
          - Validate
          - Call service: `upload_document(...)`
          - Return DocumentResponse
       3. `GET /api/v1/documents/{id}` - Get document
          - Verify ownership
          - Return document
       4. `DELETE /api/v1/documents/{id}` - Delete document
          - Verify ownership
          - Delete
       5. `GET /api/v1/documents/{id}/chunks` - Get chunks
          - Return all chunks for document
       6. `POST /api/v1/documents/{id}/process` - Trigger processing
          - Trigger background task
          - Return status
       7. `GET /api/v1/documents/{id}/status` - Get processing status
          - Return current status

**Update router:**

- Include documents router in `app/api/rest/router.py`

### **Step 5.4: Document API (Day 22)** (continued)

**Test:**

- Upload document: `POST /api/v1/documents` with file
- Verify document created
- Check processing status: `GET /api/v1/documents/{id}/status`
- After processing completes:
  - Get chunks: `GET /api/v1/documents/{id}/chunks`
  - Verify embeddings in LanceDB
  - Query document via RAG: `await synapse_bridge.query_with_synapse_context(user_id, "query about document")`
  - Verify document chunks in results

---

## 📅 Phase 6: Remaining Modules (Week 6)

### **Goal:** Implement notes, quizzes, chat modules

---

### **Step 6.1: Notes Module (Day 23-24)**

#### **Files to Create: 8**

140. **`app/models/note.py`**
     - Note model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `title` (String(500))
       - `content` (Text)
       - `format` (Enum: markdown, html, plain)
       - `parent_id` (Integer, FK to notes.id, nullable) - Hierarchical
       - `embedding_id` (String, nullable)
     - **Relationships:**
       - `versions`: One-to-many with NoteVersion
       - `tags`: Many-to-many with Tag
       - `children`: One-to-many (self-referential)
       - `parent`: Many-to-one (self-referential)
     - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`, `UserOwnedMixin`

141. **`app/models/note_version.py`**
     - Note version history
     - **Fields:**
       - `id`, `note_id` (FK)
       - `version_number` (Integer)
       - `title`, `content`, `format`
       - `created_at`, `created_by` (FK to users)
     - Inherit: `Base`

142. **`app/models/tag.py`**
     - Tag model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `name` (String(100), unique per user)
       - `color` (String, hex color)
     - Inherit: `Base`, `TimestampMixin`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add note models"`
- Run: `alembic upgrade head`

143. **`app/schemas/note.py`**
     - Note schemas
     - **Schemas:**
       - `NoteBase` (title, content, format)
       - `NoteCreate` (extends NoteBase, add: parent_id, tags)
       - `NoteUpdate` (all optional)
       - `NoteResponse` (id, title, content, format, parent_id, tags, children_count, created_at, updated_at)
       - `NoteTreeResponse` (id, title, children: List[NoteTreeResponse]) - Recursive
       - `NoteVersionResponse` (version_number, title, created_at)

144. **`app/sql/functions/notes/get_note_hierarchy.sql`**
     - Get note tree with recursive CTE
     - **Implementation:**

```sql
       CREATE OR REPLACE FUNCTION get_note_hierarchy(p_user_id INT, p_root_id INT DEFAULT NULL)
       RETURNS TABLE (
           id INT,
           parent_id INT,
           title VARCHAR,
           content TEXT,
           depth INT,
           path INT[]
       ) AS $$
       BEGIN
           RETURN QUERY
           WITH RECURSIVE note_tree AS (
               -- Base case: root notes (or specific root)
               SELECT
                   n.id,
                   n.parent_id,
                   n.title,
                   n.content,
                   0 as depth,
                   ARRAY[n.id] as path
               FROM notes n
               WHERE n.user_id = p_user_id
                 AND n.deleted_at IS NULL
                 AND (
                   (p_root_id IS NULL AND n.parent_id IS NULL) OR
                   (p_root_id IS NOT NULL AND n.id = p_root_id)
                 )

               UNION ALL

               -- Recursive case: children
               SELECT
                   n.id,
                   n.parent_id,
                   n.title,
                   n.content,
                   nt.depth + 1,
                   nt.path || n.id
               FROM notes n
               INNER JOIN note_tree nt ON n.parent_id = nt.id
               WHERE n.deleted_at IS NULL
                 AND NOT n.id = ANY(nt.path) -- Prevent cycles
           )
           SELECT * FROM note_tree
           ORDER BY path;
       END;
       $$ LANGUAGE plpgsql;
```

145. **`app/sql/functions/notes/search_notes_fts.sql`**
     - Full-text search with PostgreSQL
     - **Implementation:**

```sql
       CREATE OR REPLACE FUNCTION search_notes_fts(
           p_user_id INT,
           p_query TEXT,
           p_limit INT DEFAULT 20
       )
       RETURNS TABLE (
           id INT,
           title VARCHAR,
           content TEXT,
           rank REAL
       ) AS $$
       BEGIN
           RETURN QUERY
           SELECT
               n.id,
               n.title,
               n.content,
               ts_rank(
                   to_tsvector('english', n.title || ' ' || n.content),
                   plainto_tsquery('english', p_query)
               ) as rank
           FROM notes n
           WHERE n.user_id = p_user_id
             AND n.deleted_at IS NULL
             AND (
                 to_tsvector('english', n.title || ' ' || n.content) @@
                 plainto_tsquery('english', p_query)
             )
           ORDER BY rank DESC
           LIMIT p_limit;
       END;
       $$ LANGUAGE plpgsql;
```

**Update SQL migration:**

- `alembic revision -m "add note sql functions"`
- Load these functions

146. **`app/modules/notes/repository.py`**
     - Note SQL repository
     - **Class:** `NoteRepository`
     - **Methods:**
       - `async def get_note_hierarchy(self, user_id: int, root_id: Optional[int] = None) -> List[Dict]:`
         - Execute SQL function
         - Return tree structure
       - `async def search_fts(self, user_id: int, query: str, limit: int = 20) -> List[Dict]:`
         - Execute full-text search function
         - Return ranked results

147. **`app/modules/notes/service.py`**
     - Note service
     - **Class:** `NoteService`
     - **Methods:**
       1. `async def create_note(self, user_id: int, data: NoteCreate) -> Note:`
          - Create Note model
          - If parent_id: verify parent exists and belongs to user
          - Save
          - Create version 1
          - Trigger event: "note.created"
          - Return note
       2. `async def get_note(self, note_id: int, user_id: int) -> Note:`
          - Verify ownership
          - Return note with tags and children
       3. `async def list_notes(self, user_id: int, filters: Dict) -> List[Note]:`
          - Filter by tags if provided
          - Order by updated_at DESC
       4. `async def update_note(self, note_id: int, user_id: int, data: NoteUpdate) -> Note:`
          - Verify ownership
          - Update fields
          - Create new version
          - Trigger event: "note.updated"
          - Return note
       5. `async def delete_note(self, note_id: int, user_id: int):`
          - Verify ownership
          - Soft delete
          - Soft delete all children (cascade)
       6. `async def get_note_tree(self, user_id: int, root_id: Optional[int] = None) -> List[Dict]:`
          - Call repository: `get_note_hierarchy(...)`
          - Build nested structure
          - Return tree
       7. `async def search_notes(self, user_id: int, query: str) -> List[Note]:`
          - Vector search (semantic) via Llama Index
          - Full-text search via SQL function
          - Merge results (hybrid)
          - Return ranked notes
       8. `async def get_versions(self, note_id: int, user_id: int) -> List[NoteVersion]:`
          - Verify ownership
          - Return all versions

148. **`app/modules/notes/module.py`**
     - Note module implementation
     - **Class:** `NoteModule(LearningModule)`
     - **Capabilities:** [CREATE, READ, UPDATE, DELETE, SEARCH]
     - **Implement:**
       - All required methods
       - `contribute_context()`:
         - Get recent notes
         - Get notes related to weak areas
         - Return note context

149. **`app/api/rest/notes.py`**
     - Note endpoints
     - **Endpoints:**
       1. `GET /api/v1/notes` - List notes
       2. `POST /api/v1/notes` - Create note
       3. `GET /api/v1/notes/{id}` - Get note
       4. `PUT /api/v1/notes/{id}` - Update note
       5. `DELETE /api/v1/notes/{id}` - Delete note
       6. `GET /api/v1/notes/tree` - Get note hierarchy
          - Query param: root_id (optional)
       7. `GET /api/v1/notes/search` - Search notes
          - Query param: query
       8. `GET /api/v1/notes/{id}/versions` - Get versions
       9. `POST /api/v1/notes/{id}/generate-flashcards` - Generate flashcards from note (placeholder)

**Update router**

**Test:**

- Create note: `POST /api/v1/notes`
- Create child note: `POST /api/v1/notes` with parent_id
- Get tree: `GET /api/v1/notes/tree`
- Update note: `PUT /api/v1/notes/{id}`
- Get versions: `GET /api/v1/notes/{id}/versions`
- Search: `GET /api/v1/notes/search?query=biology`
- Verify hierarchical structure preserved

---

### **Step 6.2: Quizzes Module (Day 24-25)**

#### **Files to Create: 7**

150. **`app/models/quiz.py`**
     - Quiz model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `title`, `description`
       - `source_type` (Enum: manual, ai_generated)
       - `source_ids` (JSON: [note_ids, document_ids])
       - `difficulty` (Enum: easy, medium, hard)
       - `time_limit_minutes` (Integer, nullable)
     - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`, `UserOwnedMixin`

151. **`app/models/quiz_question.py`**
     - Quiz question model
     - **Fields:**
       - `id`, `quiz_id` (FK)
       - `question_text` (Text)
       - `question_type` (Enum: multiple_choice, true_false, short_answer)
       - `options` (JSON, for multiple choice)
       - `correct_answer` (String)
       - `explanation` (Text, nullable)
       - `points` (Integer, default 1)
       - `order` (Integer)
     - Inherit: `Base`, `TimestampMixin`

152. **`app/models/quiz_attempt.py`**
     - Quiz attempt model
     - **Fields:**
       - `id`, `quiz_id` (FK), `user_id` (FK)
       - `started_at`, `completed_at` (DateTime, nullable)
       - `score` (Decimal)
       - `max_score` (Integer)
       - `answers` (JSON: [{question_id, answer, is_correct, points}])
       - `time_taken_seconds` (Integer, nullable)
     - Inherit: `Base`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add quiz models"`
- Run: `alembic upgrade head`

153. **`app/schemas/quiz.py`**
     - Quiz schemas
     - **Schemas:**
       - `QuizCreate` (title, description, questions: List[QuestionCreate])
       - `QuizResponse` (id, title, description, question_count, difficulty, created_at)
       - `QuestionCreate` (question_text, question_type, options, correct_answer, explanation, points)
       - `QuestionResponse` (id, question_text, question_type, options, points) - No correct answer
       - `QuizAttemptCreate` (quiz_id)
       - `AnswerSubmit` (question_id, answer)
       - `QuizResultResponse` (score, max_score, percentage, answers: List[AnswerResult], time_taken)
       - `AnswerResult` (question_id, question_text, your_answer, correct_answer, is_correct, explanation, points)

154. **`app/modules/quizzes/service.py`**
     - Quiz service
     - **Class:** `QuizService`
     - **Methods:**
       1. `async def create_quiz(self, user_id: int, data: QuizCreate) -> Quiz:`
          - Create Quiz model
          - Create QuizQuestion models
          - Save all
          - Return quiz
       2. `async def get_quiz(self, quiz_id: int, user_id: int) -> Quiz:`
          - Verify ownership or public
          - Return quiz with questions (without correct answers)
       3. `async def start_quiz(self, quiz_id: int, user_id: int) -> QuizAttempt:`
          - Create QuizAttempt (started_at = now)
          - Return attempt with questions
       4. `async def submit_quiz(self, attempt_id: int, user_id: int, answers: List[AnswerSubmit]) -> QuizResultResponse:`
          - Get attempt
          - Verify user owns attempt
          - Grade each answer
          - Calculate score
          - Update attempt (completed_at, score, answers)
          - Return results with feedback
       5. `async def grade_answer(self, question: QuizQuestion, answer: str) -> Dict:`
          - Compare answer with correct_answer
          - For multiple choice: exact match
          - For short answer: fuzzy match or AI evaluation
          - Return: {is_correct, points, feedback}
       6. `async def get_attempts(self, quiz_id: int, user_id: int) -> List[QuizAttempt]:`
          - Get all attempts for quiz by user
          - Return with scores

155. **`app/modules/quizzes/module.py`**
     - Quiz module implementation
     - **Class:** `QuizModule(LearningModule)`
     - **Capabilities:** [CREATE, READ, STUDY, AI_GENERATE]
     - **Implement:**
       - Required methods
       - `contribute_context()`:
         - Get quiz performance
         - Identify weak question types
         - Return quiz context

156. **`app/api/rest/quizzes.py`**
     - Quiz endpoints
     - **Endpoints:**
       1. `GET /api/v1/quizzes` - List quizzes
       2. `POST /api/v1/quizzes` - Create quiz
       3. `GET /api/v1/quizzes/{id}` - Get quiz
       4. `DELETE /api/v1/quizzes/{id}` - Delete quiz
       5. `POST /api/v1/quizzes/{id}/start` - Start quiz attempt
          - Create attempt
          - Return attempt_id and questions
       6. `POST /api/v1/quizzes/attempts/{attempt_id}/submit` - Submit answers
          - Grade quiz
          - Return results
       7. `GET /api/v1/quizzes/{id}/attempts` - Get attempts
       8. `GET /api/v1/quizzes/attempts/{attempt_id}` - Get attempt results
       9. `POST /api/v1/quizzes/generate` - AI generate quiz (placeholder)
          - Will implement with AI tools

**Update router**

**Test:**

- Create quiz: `POST /api/v1/quizzes`
- Start attempt: `POST /api/v1/quizzes/{id}/start`
- Submit answers: `POST /api/v1/quizzes/attempts/{attempt_id}/submit`
- Get results: Verify grading correct
- Get attempts: `GET /api/v1/quizzes/{id}/attempts`

---

### **Step 6.3: Chat Module (Day 25-26)**

#### **Files to Create: 6**

157. **`app/models/chat_session.py`**
     - Chat session model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `title` (String, auto-generated or user-set)
       - `document_id` (FK to documents, nullable) - Chat about document
       - `context_modules` (JSON: list of modules to include in context)
       - `total_tokens_used` (Integer)
       - `total_cost` (Decimal)
     - Inherit: `Base`, `TimestampMixin`, `SoftDeleteMixin`, `UserOwnedMixin`

158. **`app/models/chat_message.py`**
     - Chat message model
     - **Fields:**
       - `id`, `session_id` (FK)
       - `role` (Enum: user, assistant, system)
       - `content` (Text)
       - `tokens` (Integer)
       - `model_used` (String: pro, flash, flash-lite)
       - `function_calls` (JSON, nullable)
       - `grounding_sources` (JSON, nullable)
       - `created_at` (DateTime)
     - Inherit: `Base`

**Create Migration:**

- Generate: `alembic revision --autogenerate -m "add chat models"`
- Run: `alembic upgrade head`

159. **`app/schemas/chat.py`**
     - Chat schemas
     - **Schemas:**
       - `ChatSessionCreate` (title, document_id, context_modules)
       - `ChatSessionResponse` (id, title, document_id, message_count, total_tokens, created_at)
       - `ChatMessageCreate` (session_id, content)
       - `ChatMessageResponse` (id, role, content, created_at, model_used, tokens)
       - `ChatHistoryResponse` (session: ChatSessionResponse, messages: List[ChatMessageResponse])

160. **`app/modules/chat/service.py`**
     - Chat service
     - **Class:** `ChatService`
     - **Methods:**
       1. `async def create_session(self, user_id: int, data: ChatSessionCreate) -> ChatSession:`
          - Create ChatSession
          - Generate title if not provided
          - Return session
       2. `async def get_session(self, session_id: int, user_id: int) -> ChatSession:`
          - Verify ownership
          - Return session with messages
       3. `async def list_sessions(self, user_id: int) -> List[ChatSession]:`
          - Get all sessions
          - Order by updated_at DESC
       4. `async def send_message(self, session_id: int, user_id: int, content: str) -> str:`
          - Verify session ownership
          - Save user message
          - Build context from specified modules
          - Call AIOrchestrator: `chat(user_id, content, context)`
          - Save assistant message
          - Update session tokens and cost
          - Return assistant response
       5. `async def get_messages(self, session_id: int, user_id: int) -> List[ChatMessage]:`
          - Verify ownership
          - Return all messages
       6. `async def delete_session(self, session_id: int, user_id: int):`
          - Verify ownership
          - Soft delete

161. **`app/modules/chat/module.py`**
     - Chat module implementation
     - **Class:** `ChatModule(LearningModule)`
     - **Note:** Chat doesn't contribute context, it consumes it

162. **`app/api/rest/chat.py`**
     - Chat endpoints (non-streaming)
     - **Endpoints:**
       1. `GET /api/v1/chat/sessions` - List sessions
       2. `POST /api/v1/chat/sessions` - Create session
       3. `GET /api/v1/chat/sessions/{id}` - Get session with messages
       4. `DELETE /api/v1/chat/sessions/{id}` - Delete session
       5. `POST /api/v1/chat/sessions/{id}/messages` - Send message
          - Non-streaming version
          - Return complete response
       6. `GET /api/v1/chat/sessions/{id}/messages` - Get messages

**Update router**

**Test:**

- Create session: `POST /api/v1/chat/sessions`
- Send message: `POST /api/v1/chat/sessions/{id}/messages`
- Verify response includes context from modules
- Check tokens tracked
- Get history: `GET /api/v1/chat/sessions/{id}`

---

## 📅 Phase 7: WebSocket & Real-Time (Week 7)

### **Goal:** WebSocket for streaming, real-time events, Redis pub/sub

---

### **Step 7.1: WebSocket Foundation (Day 27)**

#### **Files to Create: 3**

163. **`app/api/websockets/__init__.py`**
     - Import WebSocket components

164. **`app/api/websockets/manager.py`** ⭐ **CRITICAL**
     - WebSocket connection manager
     - **Class:** `ConnectionManager`
     - **Pattern:** Singleton
     - **Attributes:**
       - `connections: Dict[str, List[Tuple[WebSocket, int, datetime]]]` - {session_id: [(websocket, user_id, connected_at)]}
       - `user_connections: Dict[int, List[str]]` - {user_id: [session_ids]}
     - **Methods:**
       1. `async def connect(self, session_id: str, websocket: WebSocket, user_id: int):`
          - Add to connections
          - Track in user_connections
          - Log connection
       2. `async def disconnect(self, session_id: str, websocket: WebSocket):`
          - Remove from connections
          - Update user_connections
          - Log disconnection
       3. `async def send_message(self, session_id: str, websocket: WebSocket, message: Dict):`
          - Send JSON message to specific connection
          - Handle errors gracefully
       4. `async def broadcast_to_session(self, session_id: str, message: Dict):`
          - Send to all connections in session
       5. `async def broadcast_to_user(self, user_id: int, message: Dict):`
          - Send to all user's connections
       6. `def get_active_connections(self, user_id: int) -> List[str]:`
          - Return session_ids for user
       7. `async def cleanup_stale_connections(self):`
          - Remove dead connections
          - Run periodically

165. **`app/api/websockets/protocol.py`**
     - WebSocket message protocol
     - **Message Types:**

```python
       class MessageType(str, Enum):
           # Client → Server
           MESSAGE = "message"
           PING = "ping"
           SUBSCRIBE = "subscribe"
           UNSUBSCRIBE = "unsubscribe"

           # Server → Client
           TOKEN = "token"
           TOOL_CALL = "tool_call"
           TOOL_RESULT = "tool_result"
           METADATA = "metadata"
           DONE = "done"
           ERROR = "error"
           PONG = "pong"
```

     - **Schemas:**
       - `WebSocketMessage` (type, data, timestamp, request_id)
       - `TokenMessage` (text, model)
       - `ToolCallMessage` (tool, args)
       - `ErrorMessage` (code, message, details)

**Test:**

- Create ConnectionManager instance
- Simulate connections
- Test broadcast functions
- Verify cleanup of stale connections

---

### **Step 7.2: Chat WebSocket (Day 27-28)**

#### **Files to Create: 1**

166. **`app/api/websockets/chat.py`** ⭐ **CRITICAL**
     - Chat WebSocket endpoint
     - **Endpoint:** `/ws/chat/{session_id}`
     - **Authentication:** JWT in query param: `?token=<jwt>`
     - **Implementation:**

```python
       @router.websocket("/chat/{session_id}")
       async def chat_websocket(
           websocket: WebSocket,
           session_id: str,
           token: str = Query(...),
           manager: ConnectionManager = Depends(get_connection_manager),
           chat_service: ChatService = Depends(get_chat_service),
           orchestrator: AIOrchestrator = Depends(get_orchestrator)
       ):
           # 1. Validate JWT token
           try:
               user = await validate_token(token)
           except:
               await websocket.close(code=1008, reason="Unauthorized")
               return

           # 2. Verify session ownership
           try:
               session = await chat_service.get_session(session_id, user.id)
           except:
               await websocket.close(code=1003, reason="Session not found")
               return

           # 3. Accept connection
           await websocket.accept()
           await manager.connect(session_id, websocket, user.id)

           try:
               while True:
                   # 4. Receive message
                   data = await websocket.receive_json()
                   message_type = data.get("type")

                   if message_type == "message":
                       content = data.get("content")
                       context_config = data.get("context", {})

                       # 5. Save user message
                       await chat_service.save_message(
                           session_id, "user", content
                       )

                       # 6. Build context
                       context = await build_chat_context(
                           user.id,
                           session_id,
                           context_config
                       )

                       # 7. Stream AI response
                       async for chunk in orchestrator.stream_chat(
                           user.id, content, context
                       ):
                           await manager.send_message(
                               session_id, websocket, chunk
                           )

                       # 8. Save assistant message (accumulate chunks)
                       # Track tokens, update session

                   elif message_type == "ping":
                       await manager.send_message(
                           session_id,
                           websocket,
                           {"type": "pong"}
                       )

           except WebSocketDisconnect:
               await manager.disconnect(session_id, websocket)
           except Exception as e:
               logger.error(f"WebSocket error: {e}")
               await manager.send_message(
                   session_id,
                   websocket,
                   {"type": "error", "message": str(e)}
               )
               await manager.disconnect(session_id, websocket)
```

**Helper Functions:**

- `async def build_chat_context(user_id: int, session_id: str, config: Dict) -> Dict:`
  - Get ContextEngine
  - Get user context
  - Get chat history
  - Get document context (if document_id in session)
  - Merge contexts
  - Return complete context

- `async def validate_token(token: str) -> User:`
  - Decode JWT
  - Load user
  - Return user or raise

**Update `app/main.py`:**

- Include WebSocket router:

```python
  from app.api.websockets import chat as ws_chat
  app.include_router(ws_chat.router, prefix="/ws")
```

**Test:**

- Connect WebSocket client: `ws://localhost:8000/ws/chat/{session_id}?token=<jwt>`
- Send message: `{"type": "message", "content": "Hello"}`
- Verify streaming response (tokens arrive incrementally)
- Test tool calls (if agent uses tools)
- Test disconnection and reconnection

---

### **Step 7.3: Study Session WebSocket (Day 28)**

#### **Files to Create: 3**

167. **`app/models/study_session.py`**
     - Study session model
     - **Fields:**
       - `id`, `user_id` (FK)
       - `session_type` (Enum: flashcard_review, quiz, mixed)
       - `modules_used` (JSON: list of module names)
       - `started_at`, `ended_at` (DateTime, nullable)
       - `items_completed` (Integer)
       - `items_correct` (Integer)
       - `time_spent_seconds` (Integer)
       - `performance_data` (JSON)
     - Inherit: `Base`

**Create Migration:**

- Generate migration and run

168. **`app/schemas/study.py`**
     - Study session schemas
     - **Schemas:**
       - `StudySessionCreate` (session_type, modules)
       - `StudySessionResponse` (id, session_type, items_completed, accuracy, time_spent, started_at)
       - `StudyItemResponse` (type, data) - Generic study item (card, question, etc.)
       - `StudyResultSubmit` (item_id, item_type, result)

169. **`app/api/websockets/study.py`**
     - Study session WebSocket
     - **Endpoint:** `/ws/study/{session_id}`
     - **Flow:**
       1. User connects
       2. Server sends first study item (card, question)
       3. User submits result (quality, answer)
       4. Server processes result, updates stats
       5. Server sends next item
       6. Repeat until session complete or user disconnects
     - **Messages:**
       - Server → Client:

```json
         {"type": "item", "data": {card_data}, "progress": {"completed": 5, "remaining": 10}}
         {"type": "feedback", "correct": true, "message": "Great job!", "next_review": "2025-11-20"}
         {"type": "progress", "completed": 6, "accuracy": 0.83}
         {"type": "complete", "summary": {...}}
```

       - Client → Server:

```json
         {"type": "result", "item_id": 123, "item_type": "flashcard", "quality": 4, "time_taken_ms": 5000}
         {"type": "skip"}
         {"type": "end_session"}
```

**Test:**

- Connect: `ws://localhost:8000/ws/study/{session_id}?token=<jwt>`
- Receive study items
- Submit results
- Verify SM-2 updates
- Check progress updates
- End session and verify summary

---

### **Step 7.4: Event System with Webhooks (Day 29)**

#### **Files to Create: 10**

170. **`app/core/events/__init__.py`**
     - Import event components

171. **`app/core/events/triggers.py`**
     - Event definitions
     - **Events:**

```python
       class EventType(str, Enum):
           # Flashcards
           CARD_CREATED = "card.created"
           CARD_UPDATED = "card.updated"
           CARD_REVIEWED = "card.reviewed"
           DECK_CREATED = "deck.created"

           # Notes
           NOTE_CREATED = "note.created"
           NOTE_UPDATED = "note.updated"

           # Documents
           DOCUMENT_UPLOADED = "document.uploaded"
           DOCUMENT_PROCESSED = "document.processed"
           DOCUMENT_FAILED = "document.failed"

           # Quizzes
           QUIZ_CREATED = "quiz.created"
           QUIZ_COMPLETED = "quiz.completed"

           # Chat
           CHAT_MESSAGE
```
### **Step 7.4: Event System with Webhooks (Day 29)** (continued)

#### **Files to Create: 10** (continued)

171. **`app/core/events/triggers.py`** (continued)
     - **Events:**
```python
       class EventType(str, Enum):
           # ... (previous events)
           
           # Chat
           CHAT_MESSAGE_SENT = "chat.message.sent"
           CHAT_SESSION_CREATED = "chat.session.created"
           
           # Study
           STUDY_SESSION_STARTED = "study.session.started"
           STUDY_SESSION_COMPLETED = "study.session.completed"
           
           # User
           USER_REGISTERED = "user.registered"
           USER_LOGIN = "user.login"
           
           # AI
           AI_QUOTA_WARNING = "ai.quota.warning"
           AI_QUOTA_EXHAUSTED = "ai.quota.exhausted"
           
           # Agent
           AGENT_EXECUTION_STARTED = "agent.execution.started"
           AGENT_EXECUTION_COMPLETED = "agent.execution.completed"
           AGENT_EXECUTION_FAILED = "agent.execution.failed"
```
     - **Event Schema:**
```python
       @dataclass
       class Event:
           type: EventType
           user_id: int
           data: Dict
           timestamp: datetime
           event_id: str  # UUID
```

172. **`app/core/events/dispatcher.py`** ⭐ **CRITICAL**
     - Event dispatcher
     - **Class:** `EventDispatcher`
     - **Pattern:** Singleton
     - **Attributes:**
       - `handlers: Dict[EventType, List[Callable]]` - Event → handlers mapping
       - `webhooks: List[Webhook]` - Registered webhooks
     - **Methods:**
       1. `def register_handler(self, event_type: EventType, handler: Callable):`
          - Add handler to event type
       2. `async def emit(self, event: Event):`
          - Call all handlers for event type
          - Send to webhooks
          - Log event
       3. `async def _call_handlers(self, event: Event):`
          - Execute handlers concurrently
          - Catch and log errors
       4. `async def _send_webhooks(self, event: Event):`
          - Filter webhooks by event type
          - Send HTTP requests
          - Handle retries

173. **`app/core/events/handlers.py`**
     - Handler registry
     - **Handlers to register:**
```python
       # Cache invalidation
       async def invalidate_cache_on_content_change(event: Event):
           if event.type in [CARD_UPDATED, NOTE_UPDATED, ...]:
               await cache_manager.delete(f"context:{event.user_id}")
       
       # Analytics update
       async def update_analytics_on_review(event: Event):
           if event.type == CARD_REVIEWED:
               # Update DuckDB analytics
               pass
       
       # Embedding generation
       async def generate_embedding_on_content_create(event: Event):
           if event.type in [CARD_CREATED, NOTE_CREATED]:
               # Trigger background task
               pass
```

174. **`app/models/webhook_event.py`**
     - Webhook event log
     - **Fields:**
       - `id`, `user_id` (FK)
       - `webhook_url` (String)
       - `event_type` (String)
       - `payload` (JSON)
       - `status` (Enum: pending, sent, failed)
       - `response_code` (Integer, nullable)
       - `response_body` (Text, nullable)
       - `attempts` (Integer, default 0)
       - `next_retry_at` (DateTime, nullable)
       - `created_at`, `sent_at` (DateTime)
     - Inherit: `Base`

**Create Migration**

175. **`app/core/events/webhooks/__init__.py`**
     - Import webhook components

176. **`app/core/events/webhooks/sender.py`**
     - HTTP webhook sender
     - **Function:** `async def send_webhook(webhook_url: str, event: Event, secret: str) -> Dict:`
       - Build payload:
```json
         {
           "event_id": "uuid",
           "event_type": "card.reviewed",
           "timestamp": "2025-11-06T12:00:00Z",
           "user_id": 1,
           "data": {...}
         }
```
       - Calculate HMAC signature: `hmac.new(secret, payload, sha256).hexdigest()`
       - Add header: `X-Webhook-Signature: sha256={signature}`
       - POST to webhook_url with httpx
       - Return: `{success, status_code, response}`

177. **`app/core/events/webhooks/validator.py`**
     - HMAC signature validation
     - **Function:** `def validate_signature(payload: bytes, signature: str, secret: str) -> bool:`
       - Calculate expected signature
       - Compare with provided signature
       - Use constant-time comparison: `hmac.compare_digest()`
       - Return True/False

178. **`app/core/events/webhooks/retry.py`**
     - Retry logic with exponential backoff
     - **Function:** `async def retry_failed_webhooks():`
       - Query webhook_events where status=failed and next_retry_at <= now
       - For each:
         - Attempt send
         - If success: update status=sent
         - If fail: increment attempts, calculate next_retry_at (exponential backoff)
         - Max attempts: 3
         - Backoff: 2^attempts minutes

179. **`app/core/events/subscribers/__init__.py`**
     - Import subscribers

180. **`app/core/events/subscribers/cache_invalidator.py`**
     - Cache invalidation subscriber
     - **Class:** `CacheInvalidationSubscriber`
     - **Method:** `async def on_event(self, event: Event):`
       - Map event types to cache keys
       - Invalidate relevant caches
       - Pattern-based invalidation:
```python
         if event.type == CARD_UPDATED:
             await cache.delete(f"context:{event.user_id}")
             await cache.delete(f"deck:{event.data['deck_id']}:*")
```

181. **`app/core/events/subscribers/analytics_updater.py`**
     - Analytics update subscriber
     - **Class:** `AnalyticsUpdateSubscriber`
     - **Method:** `async def on_event(self, event: Event):`
       - Trigger analytics updates
       - Refresh materialized views
       - Update DuckDB tables

**Register at Startup:**
- Update `app/main.py`:
```python
  # Initialize event system
  dispatcher = EventDispatcher()
  
  # Register internal subscribers
  dispatcher.register_handler(EventType.CARD_UPDATED, invalidate_cache_on_content_change)
  dispatcher.register_handler(EventType.CARD_REVIEWED, update_analytics_on_review)
  # ... register all handlers
```

**Usage in Services:**
- Example in FlashcardService:
```python
  async def review_card(self, card_id: int, user_id: int, quality: int):
      # ... review logic
      
      # Emit event
      await dispatcher.emit(Event(
          type=EventType.CARD_REVIEWED,
          user_id=user_id,
          data={
              "card_id": card_id,
              "quality": quality,
              "next_review": next_review_date,
              "ease_factor": new_ease_factor
          },
          timestamp=datetime.utcnow(),
          event_id=str(uuid4())
      ))
```

**Test:**
- Trigger event: Review a card
- Verify handlers called (check logs)
- Verify cache invalidated
- Register test webhook URL (use webhook.site for testing)
- Verify webhook received with correct signature

---

### **Step 7.5: Real-Time Monitoring with Redis (Day 29-30)**

#### **Files to Create: 5**

182. **`app/core/realtime/__init__.py`**
     - Import real-time components

183. **`app/core/realtime/counters.py`** ⭐ **CRITICAL**
     - Redis counter operations
     - **Functions:**
       1. `async def increment(key: str, amount: int = 1) -> int:`
          - Redis INCR or INCRBY
          - Return new value
       2. `async def decrement(key: str, amount: int = 1) -> int:`
          - Redis DECR or DECRBY
       3. `async def get_counter(key: str) -> int:`
          - Redis GET
          - Return 0 if not exists
       4. `async def reset_counter(key: str):`
          - Redis DEL
       5. `async def get_multiple(pattern: str) -> Dict[str, int]:`
          - Redis SCAN with pattern
          - GET all matching keys
          - Return dict

184. **`app/core/realtime/metrics.py`**
     - Real-time metric tracking
     - **Metrics to track:**
```python
       # Agent metrics
       await increment("agent:tutor:calls")
       await increment("agent:tutor:successes")
       await increment("agent:tutor:failures")
       
       # Quota metrics (handled by QuotaManager)
       await increment("gemini:flash:rpm:2025-11-06-12:00")
       
       # User activity
       await increment("active_users:2025-11-06")
       await increment("user:{user_id}:cards_reviewed:2025-11-06")
       
       # WebSocket connections
       await increment("websocket:connections")
       await decrement("websocket:connections")  # on disconnect
```
     - **Functions:**
       1. `async def track_agent_call(agent_name: str, success: bool, duration_ms: int):`
          - Increment call counter
          - Increment success/failure counter
          - Track response time (Redis sorted set)
       2. `async def get_agent_metrics(agent_name: str, period: str = "hour") -> Dict:`
          - Get calls, successes, failures
          - Calculate success rate
          - Get avg response time
          - Return metrics dict
       3. `async def track_user_activity(user_id: int, activity: str):`
          - Increment activity counter
          - Set last_active timestamp
       4. `async def get_active_users(period: str = "day") -> int:`
          - Count unique users active in period

185. **`app/core/realtime/alerts.py`**
     - Threshold monitoring and alerts
     - **Class:** `AlertManager`
     - **Thresholds:**
```python
       THRESHOLDS = {
           "agent_failure_rate": 0.10,  # 10%
           "agent_response_time": 5000,  # 5s
           "quota_remaining": 0.20,      # 20%
           "websocket_connections": 1000,
           "error_rate": 0.05            # 5%
       }
```
     - **Methods:**
       1. `async def check_thresholds():`
          - Run periodically (every 1 minute)
          - Check all metrics against thresholds
          - Trigger alerts if breached
       2. `async def check_agent_health(agent_name: str):`
          - Get agent metrics
          - Check failure rate
          - Check response time
          - Return: {healthy, warnings, alerts}
       3. `async def send_alert(alert_type: str, message: str, severity: str):`
          - Log alert
          - Send notification (email, Slack, etc.)
          - Trigger escalation if needed

186. **`app/core/realtime/pubsub.py`**
     - Redis pub/sub for broadcasting
     - **Functions:**
       1. `async def publish(channel: str, message: Dict):`
          - Redis PUBLISH
          - Serialize message to JSON
       2. `async def subscribe(channel: str, callback: Callable):`
          - Redis SUBSCRIBE
          - Listen for messages
          - Call callback on message
       3. `async def broadcast_to_user(user_id: int, message: Dict):`
          - Publish to user-specific channel
          - WebSocket manager subscribes to these
          - Forward to user's connections

**Integrate with Agent Middleware:**
- Update `app/core/ai/agents/middleware/context_injection.py`:
```python
  async def context_injection_middleware(agent: BaseAgent, stage: str, data: Dict):
      if stage == "pre":
          # Track call
          await track_agent_call(agent.name, success=None, duration_ms=0)
          data["start_time"] = time.time()
      
      elif stage == "post":
          # Track result
          duration = (time.time() - data["start_time"]) * 1000
          success = "error" not in data
          await track_agent_call(agent.name, success, duration)
          
          # Check thresholds
          metrics = await get_agent_metrics(agent.name)
          if metrics["failure_rate"] > 0.10:
              await send_alert(
                  "agent_failure",
                  f"Agent {agent.name} failure rate: {metrics['failure_rate']:.2%}",
                  "warning"
              )
```

**Create Background Task:**
- Update `app/services/background/tasks.py`:
```python
  async def monitor_agent_health():
      """Run every minute"""
      alert_manager = AlertManager()
      await alert_manager.check_thresholds()
```

**Schedule Task:**
- Update `app/main.py`:
```python
  from apscheduler.schedulers.asyncio import AsyncIOScheduler
  
  scheduler = AsyncIOScheduler()
  scheduler.add_job(monitor_agent_health, 'interval', minutes=1)
  scheduler.start()
```

**Test:**
- Call agent multiple times
- Check metrics: `await get_agent_metrics("tutor")`
- Verify counters in Redis: `redis-cli GET agent:tutor:calls`
- Trigger failures
- Verify alert triggered when threshold breached
- Check WebSocket clients receive real-time updates

---

## 📅 Phase 8: AI Tools & Advanced Features (Week 8)

### **Goal:** Complete AI tools, agent implementations, workflow examples

---

### **Step 8.1: Complete AI Tools (Day 30-31)**

#### **Files to Create: 4**

187. **`app/core/ai/tools/note_tools.py`**
     - Note manipulation tools
     - **Tools:**
       1. `CreateNoteTool` - Create note
       2. `SearchNotesTool` - Search notes
       3. `SummarizeNoteTool` - Generate summary
       4. `GenerateFlashcardsFromNoteTool` - Extract concepts

188. **`app/core/ai/tools/document_tools.py`**
     - Document tools
     - **Tools:**
       1. `SearchDocumentsTool` - Semantic search across documents
       2. `GetDocumentContentTool` - Retrieve document or chunk
       3. `AnalyzeDocumentTool` - Multimodal analysis
       4. `GenerateQuestionsFromDocumentTool` - Comprehension questions

189. **`app/core/ai/tools/quiz_tools.py`**
     - Quiz tools
     - **Tools:**
       1. `CreateQuizTool` - Generate quiz from content
       2. `EvaluateAnswerTool` - Grade answer with AI
       3. `GetQuizResultsTool` - Retrieve results

190. **`app/core/ai/tools/study_tools.py`**
     - Study tools
     - **Tools:**
       1. `GetStudyRecommendationsTool` - AI recommendations
       2. `CreateStudyPlanTool` - Generate plan
       3. `GetWeakAreasTool` - Identify gaps
       4. `TrackStudyProgressTool` - Log session

**Register All Tools:**
- Update `app/main.py`:
```python
  # Register all tools
  tool_registry = ToolRegistry()
  
  # Flashcard tools
  tool_registry.register_tool(CreateFlashcardTool())
  tool_registry.register_tool(SearchFlashcardsTool())
  # ... all tools
  
  # Generate function declarations for Gemini
  function_declarations = tool_registry.generate_function_declarations()
```

**Test:**
- Test each tool individually
- Verify schema generation
- Test with Gemini function calling

---

### **Step 8.2: Additional Agent Implementations (Day 31-32)**

#### **Files to Create: 2**

191. **`app/core/ai/agents/implementations/document_agent.py`**
     - Document analysis agent
     - **Purpose:** Analyze documents, extract insights, answer questions
     - **Tools:** [SearchDocumentsTool, GetDocumentContentTool, AnalyzeDocumentTool, GetUserContextTool]
     - **System Prompt:**
```
       You are a document analysis assistant.
       Your role:
       - Analyze document content thoroughly
       - Answer questions based on document context
       - Extract key insights and concepts
       - Generate study materials from documents
       
       Current document context: {document_context}
       User learning context: {user_context}
```

192. **`app/core/ai/agents/implementations/quiz_agent.py`**
     - Quiz generation agent
     - **Purpose:** Generate high-quality quiz questions
     - **Tools:** [CreateQuizTool, GetUserContextTool, SearchDocumentsTool, SearchNotesTool]
     - **System Prompt:**
```
       You are a quiz generation specialist.
       Your role:
       - Generate diverse question types
       - Create challenging but fair questions
       - Ensure questions cover key concepts
       - Focus on weak areas: {weak_areas}
       
       Guidelines:
       - Multiple choice: 4 options, 1 correct
       - Include explanations
       - Vary difficulty levels
```

**Register Agents:**
- Update `app/main.py`:
```python
  # Register agents
  agent_registry = AgentRegistry()
  
  tutor_agent = TutorAgent(llm=gemini_provider, tools=tools)
  document_agent = DocumentAgent(llm=gemini_provider, tools=tools)
  quiz_agent = QuizAgent(llm=gemini_provider, tools=tools)
  
  agent_registry.register(tutor_agent)
  agent_registry.register(document_agent)
  agent_registry.register(quiz_agent)
```

**Test:**
- Execute document agent: Analyze a document
- Execute quiz agent: Generate quiz from notes
- Verify agents use tools appropriately
- Check middleware (context injection, quota)

---

### **Step 8.3: LangGraph Workflows (Day 32)**

#### **Files to Create: 2**

193. **`app/core/ai/workflows/multi_agent_collab.py`**
     - Multi-agent collaboration workflow
     - **Use Case:** Complex tasks requiring multiple agents
     - **Example:** Document analysis → Quiz generation → Study plan
     - **Implementation:**
```python
       from langgraph.graph import StateGraph, END
       
       class MultiAgentState(TypedDict):
           user_id: int
           task: str
           document_id: Optional[int]
           analysis: Optional[Dict]
           quiz: Optional[Dict]
           study_plan: Optional[Dict]
           messages: List[str]
       
       def create_multi_agent_workflow():
           workflow = StateGraph(MultiAgentState)
           
           # Nodes
           workflow.add_node("analyze", analyze_document_node)
           workflow.add_node("generate_quiz", generate_quiz_node)
           workflow.add_node("create_plan", create_study_plan_node)
           
           # Edges
           workflow.add_edge("analyze", "generate_quiz")
           workflow.add_edge("generate_quiz", "create_plan")
           workflow.add_edge("create_plan", END)
           
           workflow.set_entry_point("analyze")
           
           return workflow.compile()
       
       async def analyze_document_node(state: MultiAgentState):
           agent = AgentRegistry().get_agent("document")
           analysis = await agent.execute(
               state["user_id"],
               f"Analyze document {state['document_id']}"
           )
           state["analysis"] = analysis
           state["messages"].append("Analysis complete")
           return state
       
       # ... other nodes
```

194. **`app/core/ai/workflows/human_review.py`**
     - Human-in-the-loop workflow
     - **Use Case:** AI generates content, human approves before use
     - **Example:** Quiz generation with review
     - **Implementation:**
```python
       class HumanReviewState(TypedDict):
           user_id: int
           content: Dict
           review_status: Optional[str]  # pending, approved, rejected
           feedback: Optional[str]
           revised_content: Optional[Dict]
       
       def create_human_review_workflow():
           workflow = StateGraph(HumanReviewState)
           
           workflow.add_node("generate", generate_content_node)
           workflow.add_node("wait_review", wait_for_review_node)
           workflow.add_node("revise", revise_content_node)
           workflow.add_node("finalize", finalize_node)
           
           workflow.add_edge("generate", "wait_review")
           workflow.add_conditional_edges(
               "wait_review",
               review_decision,
               {
                   "approved": "finalize",
                   "rejected": "revise",
                   "pending": "wait_review"  # Loop
               }
           )
           workflow.add_edge("revise", "wait_review")
           workflow.add_edge("finalize", END)
           
           workflow.set_entry_point("generate")
           
           return workflow.compile()
       
       async def wait_for_review_node(state: HumanReviewState):
           # Store state in database
           # Return state
           # External API allows human to approve/reject
           return state
       
       def review_decision(state: HumanReviewState) -> str:
           return state["review_status"]
```

**Test:**
- Execute multi-agent workflow
- Verify agents execute in sequence
- Check state passed between agents
- Test human review workflow
- Pause at review step
- Approve/reject via API
- Verify workflow resumes

---

### **Step 8.4: Advanced RAG Features (Day 33)**

#### **Files to Create: 3**

195. **`app/core/ai/rag/chunking/semantic.py`**
     - Semantic chunking strategy
     - **Purpose:** Chunk by topic shifts, not fixed size
     - **Implementation:**
       1. Split text into sentences
       2. Generate embeddings for each sentence
       3. Calculate cosine similarity between consecutive sentences
       4. Split where similarity drops below threshold (topic shift)
       5. Merge small chunks
       6. Return semantic chunks

196. **`app/core/ai/rag/chunking/factory.py`**
     - Chunker factory
     - **Function:** `def get_chunker(strategy: str) -> Chunker:`
       - Strategy: "semantic", "sentence", "fixed"
       - Return appropriate chunker

197. **`app/core/ai/rag/reranking/cross_encoder.py`**
     - Cross-encoder reranking
     - **Purpose:** More accurate reranking than cosine similarity
     - **Implementation:**
       1. Use cross-encoder model: `cross-encoder/ms-marco-MiniLM-L-6-v2`
       2. Score each (query, chunk) pair
       3. Re-sort by cross-encoder scores
       4. Return reranked results

**Integrate:**
- Update `synapse_bridge.py`:
```python
  async def query_with_synapse_context(...):
      # ... existing code
      
      # Rerank with cross-encoder
      if use_cross_encoder:
          reranked = await cross_encoder_rerank(query, results)
      
      # Then apply SYNAPSE-specific reranking
      final_results = await self._rerank_by_weak_areas(reranked, weak_areas)
```

**Test:**
- Compare chunking strategies (fixed vs semantic)
- Verify semantic chunks respect topic boundaries
- Test cross-encoder reranking
- Compare results quality with/without

---

## 📅 Phase 9: Background Tasks & Jobs (Week 9)

### **Goal:** Background processing, scheduled tasks, cleanup jobs

---

### **Step 9.1: Background Task System (Day 33-34)**

#### **Files to Create: 4**

198. **`app/services/background/tasks.py`** ⭐ **CRITICAL**
     - Task definitions
     - **Tasks:**
       1. **Document Processing:**
```python
          async def process_document_upload(document_id: int):
              service = DocumentService(db)
              await service.process_document(document_id)
```
       2. **Embedding Generation:**
```python
          async def generate_embeddings_batch(content_ids: List[int], content_type: str):
              # Batch generate embeddings
              # Store in LanceDB
              # Update database records
```
       3. **Analytics Aggregation:**
```python
          async def generate_daily_analytics():
              # Query reviews, study sessions
              # Aggregate with DuckDB
              # Export to Parquet
              # Refresh materialized views
```
       4. **Gemini File Maintenance:**
```python
          async def cleanup_expired_gemini_files():
              # Query documents with gemini_file_uri
              # Check expiration (48 hours)
              # Delete expired files
              # Re-upload if needed
```
       5. **Session Cleanup:**
```python
          async def cleanup_old_sessions():
              # Delete sessions older than 90 days
              # Delete expired JWT tokens from blacklist
```
       6. **Cache Warming:**
```python
          async def warm_user_caches():
              # Pre-generate context for active users
              # Cache for faster access
```
       7. **Email Notifications:**
```python
          async def send_study_reminders():
              # Find users with cards due
              # Send reminder emails
```
       8. **Weekly Reports:**
```python
          async def generate_weekly_reports():
              # Generate performance reports
              # Send via email
```

199. **`app/services/background/worker.py`**
     - Task worker
     - **Implementation:**
```python
       from concurrent.futures import ThreadPoolExecutor
       import asyncio
       
       class BackgroundWorker:
           def __init__(self, max_workers: int = 4):
               self.executor = ThreadPoolExecutor(max_workers=max_workers)
               self.running = False
           
           async def start(self):
               self.running = True
               # Start listening for tasks
           
           async def stop(self):
               self.running = False
               self.executor.shutdown(wait=True)
           
           async def submit_task(self, task: Callable, *args, **kwargs):
               # Submit task to executor
               loop = asyncio.get_event_loop()
               await loop.run_in_executor(self.executor, task, *args, **kwargs)
```

200. **`app/services/background/webhook_handlers.py`** ⭐ **CRITICAL**
     - Event → Task mapping
     - **Mappings:**
```python
       EVENT_TASK_MAPPING = {
           EventType.DOCUMENT_UPLOADED: process_document_upload,
           EventType.CARD_CREATED: generate_card_embedding,
           EventType.NOTE_CREATED: generate_note_embedding,
           EventType.CARD_REVIEWED: update_user_analytics,
           # ... all events
       }
       
       async def handle_event(event: Event):
           task = EVENT_TASK_MAPPING.get(event.type)
           if task:
               await background_worker.submit_task(task, event.data)
```

201. **`app/services/background/scheduler.py`**
     - Scheduled tasks
     - **Implementation:**
```python
       from apscheduler.schedulers.asyncio import AsyncIOScheduler
       from apscheduler.triggers.cron import CronTrigger
       
       scheduler = AsyncIOScheduler()
       
       # Every hour
       scheduler.add_job(
           cleanup_expired_gemini_files,
           'interval',
           hours=1
       )
       
       # Every day at midnight
       scheduler.add_job(
           generate_daily_analytics,
           CronTrigger(hour=0, minute=0)
       )
       
       # Every Monday at 9am
       scheduler.add_job(
           generate_weekly_reports,
           CronTrigger(day_of_week='mon', hour=9, minute=0)
       )
       
       # Every minute
       scheduler.add_job(
           monitor_agent_health,
           'interval',
           minutes=1
       )
```

**Integrate with Event System:**
- Update `EventDispatcher`:
```python
  async def emit(self, event: Event):
      # ... existing handlers
      
      # Trigger background tasks
      await handle_event(event)
```

**Start Worker at Startup:**
- Update `app/main.py`:
```python
  @app.on_event("startup")
  async def startup():
      # ... existing startup
      
      # Start background worker
      await background_worker.start()
      
      # Start scheduler
      scheduler.start()
  
  @app.on_event("shutdown")
  async def shutdown():
      # ... existing shutdown
      
      # Stop worker
      await background_worker.stop()
      
      # Stop scheduler
      scheduler.shutdown()
```

**Test:**
- Upload document
- Verify processing task triggered
- Check logs for task execution
- Verify document status updated
- Test scheduled tasks (change cron to run soon)
- Verify tasks execute at scheduled time

---

### **Step 9.2: Agent Monitoring & Escalation (Day 34)**

#### **Files to Create: 2**

202. **`app/core/ai/agents/monitoring/escalation.py`** ⭐ **CRITICAL**
     - Auto-escalation logic
     - **Escalation Levels:**
```python
       class EscalationLevel(Enum):
           NONE = 0
           LOG_WARNING = 1        # Just log
           SWITCH_MODEL = 2       # Use better model
           HUMAN_REVIEW = 3       # Flag for review
           DISABLE_AGENT = 4      # Disable agent
       
       async def check_escalation(agent_name: str) -> EscalationLevel:
           metrics = await get_agent_metrics(agent_name, period="hour")
           
           failure_rate = metrics["failure_rate"]
           avg_response_time = metrics["avg_response_time"]
           
           if failure_rate > 0.50:  # 50% failures
               return EscalationLevel.DISABLE_AGENT
           elif failure_rate > 0.30:
               return EscalationLevel.HUMAN_REVIEW
           elif failure_rate > 0.15:
               return EscalationLevel.SWITCH_MODEL
           elif failure_rate > 0.10:
               return EscalationLevel.LOG_WARNING
           
           if avg_response_time > 10000:  # 10s
               return EscalationLevel.SWITCH_MODEL
           
           return EscalationLevel.NONE
       
       async def execute_escalation(agent_name: str, level: EscalationLevel):
           if level == EscalationLevel.LOG_WARNING:
               logger.warning(f"Agent {agent_name} performance degraded")
           
           elif level == EscalationLevel.SWITCH_MODEL:
               # Update agent config to use better model
               agent = AgentRegistry().get_agent(agent_name)
               agent.llm.model = "gemini-1.5-pro"  # Upgrade to Pro
               logger.info(f"Upgraded {agent_name} to Pro model")
           
           elif level == EscalationLevel.HUMAN_REVIEW:
               # Send alert to admin
               await send_### **Step 9.2: Agent Monitoring & Escalation (Day 34)** (continued)

#### **Files to Create: 2** (continued)

202. **`app/core/ai/agents/monitoring/escalation.py`** (continued)
     - **Escalation Levels:** (continued)
```python
       # ... (previous code)
       
       async def execute_escalation(agent_name: str, level: EscalationLevel):
           # ... (previous levels)
           
           elif level == EscalationLevel.HUMAN_REVIEW:
               # Send alert to admin
               await send_alert(
                   "agent_escalation",
                   f"Agent {agent_name} requires human review. Failure rate: {metrics['failure_rate']:.2%}",
                   severity="high"
               )
               # Flag agent executions for review
               await flag_agent_for_review(agent_name)
           
           elif level == EscalationLevel.DISABLE_AGENT:
               # Disable agent completely
               agent = AgentRegistry().get_agent(agent_name)
               agent.enabled = False
               await send_alert(
                   "agent_disabled",
                   f"Agent {agent_name} disabled due to high failure rate: {metrics['failure_rate']:.2%}",
                   severity="critical"
               )
```

203. **`app/core/ai/agents/monitoring/alerts.py`**
     - Alert management
     - **Functions:**
       1. `async def send_alert(alert_type: str, message: str, severity: str):`
          - Log alert with severity
          - Send to notification channels:
            - Email (critical alerts)
            - Slack webhook (all alerts)
            - Database (all alerts for history)
          - Store alert in `agent_alerts` table
       2. `async def get_recent_alerts(hours: int = 24) -> List[Dict]:`
          - Query recent alerts
          - Return sorted by severity
       3. `async def acknowledge_alert(alert_id: int, user_id: int):`
          - Mark alert as acknowledged
          - Log who acknowledged

**Integrate with Monitoring:**
- Update `monitor_agent_health()` task:
```python
  async def monitor_agent_health():
      agents = AgentRegistry().list_agents()
      
      for agent_name in agents:
          # Check metrics
          level = await check_escalation(agent_name)
          
          if level != EscalationLevel.NONE:
              await execute_escalation(agent_name, level)
```

**Test:**
- Simulate agent failures
- Verify escalation levels triggered
- Check alerts sent
- Verify agent upgraded to better model
- Test disabling agent at high failure rate

---

## 📅 Phase 10: Final Integration & Polish (Week 10)

### **Goal:** Complete integration, testing, optimization, documentation

---

### **Step 10.1: API Endpoints Completion (Day 35-36)**

#### **Files to Create: 4**

204. **`app/api/rest/users.py`**
     - User management endpoints
     - **Endpoints:**
       1. `GET /api/v1/users/me` - Get profile
       2. `PUT /api/v1/users/me` - Update profile
       3. `PUT /api/v1/users/me/password` - Change password
       4. `DELETE /api/v1/users/me` - Delete account
       5. `GET /api/v1/users/me/statistics` - User stats

205. **`app/api/rest/study.py`**
     - Study session endpoints
     - **Endpoints:**
       1. `GET /api/v1/study/due` - Get all due items
       2. `GET /api/v1/study/recommendations` - AI recommendations
       3. `POST /api/v1/study/sessions` - Start session
       4. `GET /api/v1/study/sessions/{id}` - Get session
       5. `POST /api/v1/study/sessions/{id}/complete` - End session

206. **`app/api/rest/search.py`**
     - Cross-module search
     - **Endpoints:**
       1. `GET /api/v1/search` - Search all modules
          - Query params: query, modules, limit
          - Use hybrid search (vector + keyword)
          - Return ranked results from all modules
       2. `GET /api/v1/search/suggest` - Search suggestions
          - Autocomplete based on content

207. **`app/api/rest/analytics.py`**
     - Analytics endpoints
     - **Endpoints:**
       1. `GET /api/v1/analytics/overview` - Dashboard overview
       2. `GET /api/v1/analytics/weak-areas` - Weak areas
       3. `GET /api/v1/analytics/performance` - Performance metrics
       4. `GET /api/v1/analytics/heatmap` - Activity heatmap
       5. `POST /api/v1/analytics/export` - Export data

**Update router to include all**

**Test:**
- Test all endpoints
- Verify authentication
- Verify data validation
- Check error handling
- Test pagination
- Verify response formats

---

### **Step 10.2: Webhook Management API (Day 36)**

#### **Files to Create: 2**

208. **`app/api/rest/webhooks.py`**
     - Webhook management endpoints
     - **Endpoints:**
       1. `GET /api/v1/webhooks` - List user's webhooks
       2. `POST /api/v1/webhooks` - Create webhook
          - Input: url, events (list), secret
          - Validate URL
          - Store webhook
       3. `GET /api/v1/webhooks/{id}` - Get webhook
       4. `PUT /api/v1/webhooks/{id}` - Update webhook
       5. `DELETE /api/v1/webhooks/{id}` - Delete webhook
       6. `POST /api/v1/webhooks/{id}/test` - Test webhook
          - Send test event
          - Return success/failure
       7. `GET /api/v1/webhooks/events` - List event types
          - Return available event types
       8. `GET /api/v1/webhooks/logs` - Webhook delivery logs
          - Filter by webhook_id, status

209. **`app/api/webhooks/receivers.py`**
     - Incoming webhook endpoints
     - **Endpoints:**
       1. `POST /api/v1/webhooks/receive/{webhook_id}` - Receive webhook
          - Validate signature
          - Parse payload
          - Trigger event
          - Return 200 OK

**Test:**
- Create webhook
- Trigger event
- Verify webhook called
- Check logs
- Test signature validation
- Test retry on failure

---

### **Step 10.3: GraphQL API (Optional) (Day 36-37)**

**Note:** Can skip if REST + WebSocket sufficient

#### **Files to Create: 5**

210. **`app/api/graphql/schema.py`**
     - Root GraphQL schema
     - Compose Query, Mutation types

211. **`app/api/graphql/types.py`**
     - GraphQL types
     - Define types for User, Deck, Flashcard, Note, etc.

212. **`app/api/graphql/queries.py`**
     - Query resolvers
     - Implement queries for all models

213. **`app/api/graphql/mutations.py`**
     - Mutation resolvers
     - Implement mutations (create, update, delete)

214. **`app/api/graphql/dataloaders.py`**
     - DataLoaders to solve N+1 problem
     - Batch loading for relationships

**Mount GraphQL:**
- Update `app/main.py`:
```python
  from strawberry.fastapi import GraphQLRouter
  
  graphql_app = GraphQLRouter(schema)
  app.include_router(graphql_app, prefix="/graphql")
```

**Test:**
- Query user with nested data
- Verify no N+1 queries
- Test mutations
- Check authentication

---

### **Step 10.4: Materialized Views (Day 37)**

#### **Files to Create: 3**

215. **`app/sql/views/user_dashboard_stats.sql`**
     - Dashboard statistics view
     - **SQL:**
```sql
       CREATE MATERIALIZED VIEW user_dashboard_stats AS
       SELECT 
           u.id as user_id,
           COUNT(DISTINCT f.id) as total_cards,
           COUNT(DISTINCT CASE WHEN f.next_review <= NOW() THEN f.id END) as due_cards,
           COUNT(DISTINCT d.id) as total_decks,
           COUNT(DISTINCT n.id) as total_notes,
           COUNT(DISTINCT doc.id) as total_documents,
           AVG(f.ease_factor) as avg_ease_factor,
           SUM(CASE WHEN r.quality >= 3 THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(r.id), 0) as overall_accuracy,
           COUNT(DISTINCT r.reviewed_at::DATE) as study_streak,
           SUM(EXTRACT(EPOCH FROM (ss.ended_at - ss.started_at)))::INT as total_study_seconds
       FROM users u
       LEFT JOIN flashcards f ON f.user_id = u.id AND f.deleted_at IS NULL
       LEFT JOIN decks d ON d.user_id = u.id AND d.deleted_at IS NULL
       LEFT JOIN notes n ON n.user_id = u.id AND n.deleted_at IS NULL
       LEFT JOIN documents doc ON doc.user_id = u.id AND doc.deleted_at IS NULL
       LEFT JOIN reviews r ON r.user_id = u.id
       LEFT JOIN study_sessions ss ON ss.user_id = u.id
       GROUP BY u.id;
       
       CREATE UNIQUE INDEX ON user_dashboard_stats (user_id);
```

216. **`app/sql/views/module_performance.sql`**
     - Per-module performance view
     - **SQL:**
```sql
       CREATE MATERIALIZED VIEW module_performance AS
       WITH flashcard_performance AS (
           SELECT 
               user_id,
               'flashcards' as module,
               COUNT(DISTINCT f.id) as item_count,
               AVG(f.ease_factor) as avg_mastery,
               COUNT(r.id) as review_count,
               AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) as accuracy
           FROM flashcards f
           LEFT JOIN reviews r ON r.card_id = f.id
           WHERE f.deleted_at IS NULL
           GROUP BY user_id
       ),
       note_performance AS (
           SELECT 
               user_id,
               'notes' as module,
               COUNT(*) as item_count,
               NULL as avg_mastery,
               NULL as review_count,
               NULL as accuracy
           FROM notes
           WHERE deleted_at IS NULL
           GROUP BY user_id
       )
       SELECT * FROM flashcard_performance
       UNION ALL
       SELECT * FROM note_performance;
```

217. **`app/sql/views/learning_insights.sql`**
     - Learning insights view
     - **SQL:**
```sql
       CREATE MATERIALIZED VIEW learning_insights AS
       WITH weak_areas AS (
           SELECT 
               user_id,
               'weak_areas' as insight_type,
               json_agg(
                   json_build_object(
                       'topic', topic,
                       'accuracy', accuracy,
                       'review_count', review_count
                   )
               ) as data
           FROM (
               SELECT 
                   r.user_id,
                   f.topic,
                   AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) as accuracy,
                   COUNT(*) as review_count
               FROM reviews r
               JOIN flashcards f ON f.id = r.card_id
               GROUP BY r.user_id, f.topic
               HAVING AVG(CASE WHEN r.quality >= 3 THEN 1.0 ELSE 0.0 END) < 0.7
               ORDER BY review_count DESC
               LIMIT 5
           ) subq
           GROUP BY user_id
       )
       SELECT * FROM weak_areas;
```

**Refresh Schedule:**
- Update `app/services/background/tasks.py`:
```python
  async def refresh_materialized_views():
      await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY user_dashboard_stats")
      await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY module_performance")
      await db.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY learning_insights")
```

- Schedule (every hour):
```python
  scheduler.add_job(
      refresh_materialized_views,
      'interval',
      hours=1
  )
```

**Create Migration:**
- `alembic revision -m "add materialized views"`
- Include SQL to create views

**Test:**
- Create migration and run
- Verify views exist
- Query views
- Test refresh
- Verify performance improvement

---

### **Step 10.5: Optimization & Performance (Day 38)**

#### **Tasks (No New Files):**

1. **Database Optimization:**
   - Review query performance with EXPLAIN ANALYZE
   - Add missing indexes:
```sql
     CREATE INDEX idx_flashcards_user_next_review ON flashcards(user_id, next_review) WHERE deleted_at IS NULL;
     CREATE INDEX idx_reviews_user_created ON reviews(user_id, reviewed_at DESC);
     CREATE INDEX idx_notes_user_updated ON notes(user_id, updated_at DESC) WHERE deleted_at IS NULL;
     CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at DESC);
```
   - Configure connection pool:
```python
     engine = create_async_engine(
         DATABASE_URL,
         pool_size=20,
         max_overflow=10,
         pool_pre_ping=True
     )
```

2. **Cache Strategy:**
   - Implement multi-level caching:
     - L1: In-memory (function-level cache)
     - L2: Redis (application cache)
     - L3: Materialized views (database cache)
   - Cache key strategy:
```python
     # User context
     f"context:{user_id}"  # TTL: 5 minutes
     
     # Deck statistics
     f"deck:{deck_id}:stats"  # TTL: 15 minutes
     
     # Search results
     f"search:{hash(query)}:{user_id}"  # TTL: 30 minutes
     
     # AI responses
     f"ai:response:{hash(prompt)}:{hash(context)}"  # TTL: 1 hour
```

3. **Vector Store Optimization:**
   - Create IVF_PQ indexes:
```python
     # For large tables (>100K vectors)
     await lancedb_client.create_index(
         table='flashcards',
         index_type='IVF_PQ',
         n_clusters=256,
         n_bits=8
     )
```
   - Pre-filter strategy:
```python
     # Filter by user_id first, then vector search
     results = table.search(query_vector) \
         .where(f"user_id = {user_id}") \
         .limit(10) \
         .to_list()
```

4. **API Response Optimization:**
   - Enable response compression (already done)
   - Implement field selection:
```python
     @router.get("/decks")
     async def list_decks(
         fields: Optional[str] = Query(None)  # "id,name,card_count"
     ):
         # Return only requested fields
```
   - Use pagination everywhere
   - Lazy load relationships

5. **Embedding Generation Optimization:**
   - Batch processing:
```python
     async def generate_embeddings_batch(texts: List[str], batch_size: int = 32):
         results = []
         for i in range(0, len(texts), batch_size):
             batch = texts[i:i+batch_size]
             embeddings = model.encode(batch)
             results.extend(embeddings)
         return results
```
   - Parallel processing for documents:
```python
     async def process_document_parallel(document_id: int):
         chunks = await get_chunks(document_id)
         
         # Process chunks in parallel (4 at a time)
         async with asyncio.Semaphore(4):
             tasks = [generate_and_store_embedding(chunk) for chunk in chunks]
             await asyncio.gather(*tasks)
```

**Test:**
- Run load tests with locust or k6
- Measure response times (should be <200ms for most endpoints)
- Check database query performance
- Monitor cache hit rates
- Verify vector search performance

---

### **Step 10.6: Error Handling & Logging (Day 38-39)**

#### **Tasks:**

1. **Comprehensive Error Handling:**
   - Ensure all endpoints have try-except blocks
   - Return proper HTTP status codes
   - Include error details in development, hide in production
   - Log all errors with context

2. **Structured Logging:**
   - Already using structlog
   - Ensure all important operations logged:
```python
     logger.info("card_reviewed", user_id=user_id, card_id=card_id, quality=quality)
     logger.error("document_processing_failed", document_id=document_id, error=str(e))
```
   - Log levels:
     - DEBUG: Detailed info (dev only)
     - INFO: Normal operations
     - WARNING: Degraded performance, retries
     - ERROR: Handled errors
     - CRITICAL: System failures

3. **Request Tracing:**
   - Request ID already added in middleware
   - Include in all logs:
```python
     logger = logger.bind(request_id=request.state.request_id)
```
   - Pass to background tasks

4. **Error Notifications:**
   - Send alerts for critical errors
   - Aggregate similar errors (avoid alert fatigue)

**Test:**
- Trigger various error conditions
- Verify proper error responses
- Check logs for context
- Verify request tracing works

---

### **Step 10.7: Security Hardening (Day 39)**

#### **Tasks:**

1. **Input Validation:**
   - All inputs validated with Pydantic
   - Add length limits:
```python
     class NoteCreate(BaseModel):
         title: str = Field(..., max_length=500)
         content: str = Field(..., max_length=1000000)  # 1MB
```
   - Sanitize HTML inputs (notes, document annotations)

2. **Rate Limiting:**
   - Already implemented
   - Add per-endpoint limits:
```python
     @router.post("/cards/{id}/review")
     @rate_limit(max_calls=100, period=60)  # 100 reviews per minute
     async def review_card(...):
```

3. **SQL Injection Prevention:**
   - Using parameterized queries (already safe)
   - Verify all raw SQL uses parameters

4. **CORS Configuration:**
   - Whitelist specific origins (not '*')
   - Already configured

5. **JWT Security:**
   - Short expiration (1 hour)
   - Secure secret key (generate strong key)
   - Refresh tokens with rotation

6. **File Upload Security:**
   - Validate file types
   - Scan for malware (optional)
   - Limit file sizes
   - Store outside web root

7. **Secrets Management:**
   - Never commit .env files
   - Use environment variables
   - Rotate secrets regularly

**Test:**
- Attempt SQL injection
- Test XSS payloads
- Try exceeding rate limits
- Upload malicious files
- Test with invalid JWT

---

### **Step 10.8: Final Testing (Day 39-40)**

#### **Integration Testing:**

1. **End-to-End User Flows:**
   - Register → Create deck → Add cards → Review → Check context
   - Upload document → Process → Query via RAG → Generate quiz
   - Chat session → Ask questions → Use tools → Verify context injection
   - Study session → Review cards → Check SM-2 updates

2. **WebSocket Testing:**
   - Connect → Send messages → Receive streaming responses
   - Test disconnection and reconnection
   - Test multiple concurrent connections

3. **Agent Testing:**
   - Execute tutor agent with various queries
   - Verify context injection
   - Test tool usage
   - Check quota enforcement
   - Test escalation (simulate failures)

4. **Background Task Testing:**
   - Upload document → Verify processing completes
   - Trigger scheduled tasks
   - Verify webhooks sent
   - Check retry logic

5. **Performance Testing:**
   - Load test with 100+ concurrent users
   - Measure response times
   - Check resource usage
   - Verify no memory leaks

**Create Test Checklist:**
```markdown
## Test Checklist

### Authentication
- [ ] User registration
- [ ] User login
- [ ] JWT validation
- [ ] Token refresh
- [ ] Logout (token blacklist)

### Flashcards
- [ ] Create deck
- [ ] Add cards
- [ ] Review card (SM-2 calculation)
- [ ] Get due cards
- [ ] Deck statistics

### Notes
- [ ] Create note
- [ ] Update note (versioning)
- [ ] Note hierarchy
- [ ] Search notes (FTS + vector)

### Documents
- [ ] Upload document
- [ ] Process document (background)
- [ ] Chunk and embed
- [ ] Query via RAG
- [ ] Gemini Files API

### Quizzes
- [ ] Create quiz
- [ ] Start attempt
- [ ] Submit answers
- [ ] Grade and feedback

### Chat
- [ ] Create session
- [ ] Send message (REST)
- [ ] Streaming chat (WebSocket)
- [ ] Context injection
- [ ] Tool usage

### AI Agents
- [ ] Tutor agent execution
- [ ] Document agent
- [ ] Quiz agent
- [ ] Context injection middleware
- [ ] Quota checking

### RAG
- [ ] Llama Index query
- [ ] SYNAPSE bridge
- [ ] Weak area boosting
- [ ] Cross-encoder reranking

### Events & Webhooks
- [ ] Event emission
- [ ] Webhook sending
- [ ] Signature validation
- [ ] Retry logic

### Real-Time
- [ ] Redis counters
- [ ] Agent monitoring
- [ ] Threshold alerts
- [ ] Escalation

### Background Tasks
- [ ] Document processing
- [ ] Embedding generation
- [ ] Analytics aggregation
- [ ] Scheduled tasks

### Performance
- [ ] Response times <200ms
- [ ] Cache hit rates >80%
- [ ] Vector search <100ms
- [ ] SQL queries <50ms

### Security
- [ ] Input validation
- [ ] Rate limiting
- [ ] JWT security
- [ ] CORS configuration
```

---

### **Step 10.9: Documentation (Day 40)**

#### **Files to Create: 1**

218. **`README.md`** (Update)
     - Complete README with:
       - Project description
       - Features list
       - Architecture overview
       - Technology stack
       - Setup instructions:
         1. Clone repository
         2. Create virtual environment
         3. Install dependencies
         4. Configure .env
         5. Initialize database
         6. Seed data
         7. Run application
       - API documentation links
       - WebSocket protocol
       - Webhook setup
       - Environment variables reference
       - Troubleshooting
       - Contributing guidelines
       - License

**Generate API Documentation:**
- FastAPI auto-generates: `http://localhost:8000/docs`
- ReDoc format: `http://localhost:8000/redoc`

**Test Documentation:**
- Follow setup instructions on fresh machine
- Verify all steps work
- Check for missing information

---

## 🎉 **Implementation Complete!**

---

## 📊 **Final Checklist**

### **Core Functionality** ✅
- [x] Database (PostgreSQL, LanceDB, DuckDB, Redis)
- [x] Authentication (JWT, sessions)
- [x] Flashcards module (SM-2, spaced repetition)
- [x] Notes module (hierarchy, versioning)
- [x] Documents module (upload, processing, RAG)
- [x] Quizzes module (generation, grading)
- [x] Chat module (sessions, history)

### **AI Layer** ✅
- [x] Gemini integration (Pro/Flash/Flash-Lite)
- [x] Quota management
- [x] AI orchestrator
- [x] AI tools (flashcards, notes, documents, etc.)
- [x] DeepAgents (tutor, document, quiz)
- [x] LangGraph workflows (multi-agent, human review)

### **RAG Pipeline** ✅
- [x] Llama Index integration
- [x] all-MiniLM-L6-v2 embeddings
- [x] LanceDB vector store
- [x] SYNAPSE bridge (context-aware retrieval)
- [x] Reranking (weak area boosting)
- [x] Context builder

### **Real-Time & Events** ✅
- [x] WebSocket (chat, study sessions)
- [x] Event system (dispatcher, triggers)
- [x] Webhooks (sending, validation, retry)
- [x] Redis pub/sub
- [x] Real-time counters

### **Background Processing** ✅
- [x] Background worker
- [x] Task definitions
- [x] Scheduled tasks
- [x] Event → Task mapping

### **Monitoring & Alerts** ✅
- [x] Agent monitoring
- [x] Real-time metrics (Redis)
- [x] Threshold alerts
- [x] Auto-escalation

### **API Layer** ✅
- [x] REST API (all modules)
- [x] WebSocket API
- [x] GraphQL API (optional)
- [x] Webhook management

### **SQL Functions** ✅
- [x] SM-2 algorithm
- [x] Context building
- [x] Weak area detection
- [x] Mastery calculation
- [x] Note hierarchy
- [x] Full-text search
- [x] Materialized views

### **Optimization** ✅
- [x] Database indexes
- [x] Connection pooling
- [x] Caching strategy
- [x] Vector store indexes
- [x] Batch processing

### **Security** ✅
- [x] Input validation
- [x] Rate limiting
- [x] JWT security
- [x] CORS configuration
- [x] Error handling

### **Testing** ✅
- [x] Integration tests
- [x] End-to-end flows
- [x] Performance tests
- [x] Security tests

### **Documentation** ✅
- [x] README
- [x] API documentation
- [x] Setup instructions

---

## 🚀 **Next Steps After Implementation**

1. **Deploy to Production:**
   - Set up production environment
   - Configure Nginx reverse proxy
   - Set up SSL certificates
   - Configure monitoring (Prometheus, Grafana)
   - Set up backup strategy

2. **Scale:**
   - Multiple FastAPI instances with load balancer
   - Read replicas for PostgreSQL
   - Redis cluster
   - CDN for static files

3. **Monitor:**
   - Track metrics
   - Set up alerts
   - Monitor quota usage
   - Track agent performance

4. **Iterate:**
   - Gather user feedback
   - Add new features
   - Optimize based on usage patterns
   - Improve AI prompts and tools

---

## 🎯 **Estimated Timeline Summary**

- **Week 1:** Foundation (database, auth, basic API)
- **Week 2:** Core infrastructure (Redis, LanceDB, DuckDB, SQL functions)
- **Week 3:** First module (flashcards complete)
- **Week 4:** AI layer foundation (Gemini, tools, basic agent)
- **Week 5:** RAG with Llama Index
- **Week 6:** Remaining modules (notes, quizzes, chat, documents)
- **Week 7:** WebSocket, real-time, events
- **Week 8:** AI tools, agents, workflows
- **Week 9:** Background tasks, monitoring
- **Week 10:** Integration, testing, optimization, documentation

**Total:** ~10 weeks full-time (or 20 weeks part-time)

---

## 📝 **Key Success Factors**

1. **Start Simple:** Build foundation before adding complexity
2. **Test Continuously:** Don't wait until end to test
3. **Follow the Plan:** Each phase builds on previous
4. **SQL First:** Move logic to PostgreSQL early
5. **Event-Driven:** Use events for decoupling
6. **Monitor Everything:** Track metrics from day 1
7. **Context is King:** SYNAPSE context makes AI personalized
8. **Cache Aggressively:** But invalidate smartly
9. **Security Always:** Never compromise on security
10. **Document as You Go:** Future you will thank you

---

**This implementation plan covers all 218 files in your SYNAPSE project. Follow phase by phase, and you'll have a production-ready AI-powered learning platform!** 🚀

---

## 🎓 **Implementation Tips & Best Practices**

### **Development Workflow**

1. **Version Control:**
```bash
   # Create feature branches
   git checkout -b feature/flashcards-module
   
   # Commit frequently with clear messages
   git commit -m "feat(flashcards): implement SM-2 algorithm in SQL"
   
   # Merge when phase complete and tested
   git checkout develop
   git merge feature/flashcards-module
```

2. **Environment Management:**
```bash
   # Development
   export ENVIRONMENT=development
   
   # Testing
   export ENVIRONMENT=testing
   
   # Production
   export ENVIRONMENT=production
```

3. **Database Management:**
```bash
   # Create migration
   alembic revision --autogenerate -m "description"
   
   # Review before applying
   # Edit if needed
   
   # Apply migration
   alembic upgrade head
   
   # Rollback if needed
   alembic downgrade -1
```

4. **Testing Cycle:**
```bash
   # Run after each file/feature
   # 1. Unit test (if implemented)
   pytest tests/unit/test_feature.py
   
   # 2. Manual API test
   # Use Thunder Client, Postman, or curl
   
   # 3. Check logs
   tail -f logs/app.log
   
   # 4. Verify database changes
   psql synapse -c "SELECT * FROM table LIMIT 5;"
```

---

## 🛠️ **Development Commands Reference**

### **Essential Commands**
```bash
# Start application
make dev
# or
uvicorn app.main:app --reload

# Run migrations
make migrate
# or
alembic upgrade head

# Seed test data
python scripts/seed_data.py

# Format code
make format
# or
black app/ && isort app/

# Type check
mypy app/

# Check logs
tail -f logs/app.log

# Redis CLI
redis-cli

# PostgreSQL
psql synapse

# DuckDB
duckdb data/duckdb/analytics.duckdb
```

---

## 📦 **Project Dependencies Summary**

### **Core Framework**
- fastapi==0.104.1 (Web framework)
- uvicorn[standard]==0.24.0 (ASGI server)
- pydantic==2.5.0 (Validation)
- python-jose[cryptography]==3.3.0 (JWT)
- passlib[bcrypt]==1.7.4 (Password hashing)

### **Database**
- sqlalchemy[asyncio]==2.0.23 (ORM)
- asyncpg==0.29.0 (PostgreSQL driver)
- alembic==1.12.1 (Migrations)
- psycopg2-binary==2.9.9 (PostgreSQL adapter)

### **Vector & Analytics**
- lancedb==0.3.3 (Vector store)
- duckdb==0.9.2 (Analytics)
- redis==5.0.1 (Cache/pub-sub)

### **AI & ML**
- google-generativeai==0.3.1 (Gemini API)
- llama-index==0.9.14 (RAG framework)
- langchain==0.1.0 (Agent framework)
- langgraph==0.0.26 (Workflows)
- sentence-transformers==2.2.2 (Embeddings)

### **Utilities**
- python-multipart==0.0.6 (File uploads)
- httpx==0.25.2 (HTTP client)
- structlog==23.2.0 (Structured logging)
- apscheduler==3.10.4 (Task scheduling)

### **Document Processing**
- PyPDF2==3.0.1 (PDF extraction)
- python-docx==1.1.0 (DOCX extraction)
- pdfplumber==0.10.3 (Advanced PDF parsing)

---

## 🔍 **Troubleshooting Guide**

### **Common Issues & Solutions**

1. **Database Connection Error**
```
   Error: could not connect to server
   
   Solution:
   - Check PostgreSQL is running: systemctl status postgresql
   - Verify DATABASE_URL in .env
   - Check PostgreSQL logs: tail -f /var/log/postgresql/postgresql-15-main.log
```

2. **Redis Connection Error**
```
   Error: Error 111 connecting to localhost:6379
   
   Solution:
   - Start Redis: redis-server
   - Or: systemctl start redis
   - Check Redis is listening: redis-cli ping
```

3. **Migration Conflicts**
```
   Error: Target database is not up to date
   
   Solution:
   - Check current version: alembic current
   - View history: alembic history
   - Stamp to specific version: alembic stamp head
   - Or recreate database and run all migrations
```

4. **Import Errors**
```
   Error: ModuleNotFoundError: No module named 'app'
   
   Solution:
   - Ensure running from project root
   - Check PYTHONPATH: export PYTHONPATH="${PYTHONPATH}:${PWD}"
   - Verify virtual environment activated
```

5. **Gemini Quota Exceeded**
```
   Error: Quota exceeded
   
   Solution:
   - Check quota status: GET /api/v1/quota
   - Wait for reset (midnight Pacific)
   - Use fallback model (Flash-Lite)
   - Implement request queuing
```

6. **Slow Vector Search**
```
   Issue: Search taking >5 seconds
   
   Solution:
   - Create IVF_PQ index: python scripts/rebuild_indices.py
   - Pre-filter by user_id before vector search
   - Reduce vector dimensions (use 384 instead of 768)
   - Limit search to smaller dataset
```

7. **WebSocket Connection Drops**
```
   Issue: Connections closing unexpectedly
   
   Solution:
   - Implement ping/pong: send ping every 30s
   - Increase timeout in nginx: proxy_read_timeout 300s;
   - Check firewall rules
   - Implement auto-reconnect on client
```

8. **High Memory Usage**
```
   Issue: Memory usage growing over time
   
   Solution:
   - Check connection pool settings (reduce if needed)
   - Clear Redis caches: redis-cli FLUSHDB
   - Restart application periodically
   - Profile with memory_profiler
   - Check for circular references
```

---

## 📈 **Performance Benchmarks**

### **Target Metrics**

| Metric | Target | Excellent |
|--------|--------|-----------|
| API Response Time (p95) | <200ms | <100ms |
| Vector Search | <100ms | <50ms |
| SQL Query (simple) | <10ms | <5ms |
| SQL Query (complex) | <100ms | <50ms |
| WebSocket First Token | <1s | <500ms |
| Document Processing | <30s | <15s |
| Cache Hit Rate | >70% | >85% |
| Concurrent Users | >100 | >500 |

### **Load Testing**
```python
# Example locust test (create locustfile.py)
from locust import HttpUser, task, between

class SynapseUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password"
        })
        self.token = response.json()["access_token"]
    
    @task(3)
    def get_due_cards(self):
        self.client.get(
            "/api/v1/cards/due",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def review_card(self):
        self.client.post(
            "/api/v1/cards/1/review",
            json={"quality": 4},
            headers={"Authorization": f"Bearer {self.token}"}
        )

# Run: locust -f locustfile.py --host=http://localhost:8000
```

---

## 🔐 **Security Checklist**

- [ ] Strong JWT secret (64+ random characters)
- [ ] Password requirements enforced (min 8 chars, uppercase, lowercase, number)
- [ ] Rate limiting on all public endpoints
- [ ] SQL injection prevention (parameterized queries only)
- [ ] XSS prevention (sanitize HTML inputs)
- [ ] CORS configured (specific origins, not '*')
- [ ] HTTPS only in production
- [ ] Secure headers (X-Frame-Options, CSP, etc.)
- [ ] File upload validation (type, size, content)
- [ ] API key rotation policy
- [ ] Webhook signature validation
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] Logs don't contain passwords/tokens
- [ ] Regular dependency updates
- [ ] Environment variables not committed

---

## 🚀 **Deployment Checklist**

### **Pre-Deployment**
- [ ] All tests passing
- [ ] No critical security issues
- [ ] Documentation complete
- [ ] Environment variables configured
- [ ] SSL certificates obtained
- [ ] Database backups tested
- [ ] Rollback plan ready

### **Production Setup**
- [ ] Nginx configured with SSL
- [ ] PostgreSQL optimized (connection pool, shared_buffers)
- [ ] Redis persistence configured (AOF or RDB)
- [ ] LanceDB data backed up
- [ ] DuckDB data backed up
- [ ] Log rotation configured
- [ ] Monitoring dashboard setup (Grafana)
- [ ] Alerting configured (email, Slack)
- [ ] CDN for static files (optional)

### **Post-Deployment**
- [ ] Smoke tests run successfully
- [ ] Monitor error rates
- [ ] Check resource usage (CPU, memory, disk)
- [ ] Verify all services healthy
- [ ] Test all critical flows
- [ ] Monitor Gemini quota usage
- [ ] Check webhook deliveries
- [ ] Verify scheduled tasks running

---

## 📚 **Additional Resources**

### **Official Documentation**
- FastAPI: https://fastapi.tiangolo.com/
- SQLAlchemy 2.0: https://docs.sqlalchemy.org/en/20/
- Pydantic: https://docs.pydantic.dev/
- Gemini API: https://ai.google.dev/docs
- Llama Index: https://docs.llamaindex.ai/
- LangChain: https://python.langchain.com/docs/
- LangGraph: https://langchain-ai.github.io/langgraph/
- LanceDB: https://lancedb.github.io/lancedb/
- DuckDB: https://duckdb.org/docs/
- Redis: https://redis.io/docs/


---

## 🎉 **Conclusion**

You now have a **complete implementation plan** for SYNAPSE covering:

✅ **180+ essential files** organized in a clean, production-ready structure
✅ **10-week phased approach** with clear milestones
✅ **Step-by-step instructions** for each file and component
✅ **Best practices** for PostgreSQL-centric architecture
✅ **Integration guides** for Llama Index, DeepAgents, LangGraph
✅ **Event-driven architecture** with webhooks and real-time monitoring
✅ **Complete AI layer** with tools, agents, and RAG pipeline
✅ **Production-ready** with optimization, security, and monitoring

### **Key Innovations in This Architecture:**

1. **SQL-First Philosophy** - Business logic in PostgreSQL (30x faster)
2. **SYNAPSE Bridge** - Makes Llama Index context-aware
3. **DeepAgents Primary** - Simpler agentic layer (90% of use cases)
4. **Event-Driven** - Webhooks replace polling for instant reactions
5. **Redis Real-Time** - Sub-millisecond metrics for agent monitoring
6. **Repository Pattern** - Clean SQL separation from Python

### **What Makes This Special:**

- **No bloat** - Only essential files, no testing/docs/CI-CD clutter
- **PostgreSQL as engine** - Not just storage, active computation
- **Battle-tested tools** - Llama Index > custom RAG
- **Real-time everything** - Redis counters, WebSocket streaming
- **Context injection** - Every agent call personalized with SYNAPSE data
- **Auto-escalation** - Agents self-heal or escalate failures

---

## 🚀 **Ready to Build?**

Follow the phases **sequentially**:
1. Start with Phase 1 (Week 1) - Foundation
2. Don't skip phases - each builds on previous
3. Test after each step - catch issues early
4. Commit frequently - small, working increments
5. Deploy early - test in real environment

**Remember:** 
- Build the simplest version first
- Optimize based on actual usage
- Listen to your users
- Iterate quickly

---

## 💡 **Final Advice**

**Start Today:** Pick Phase 1, Day 1, File 1 (`.gitignore`) and begin.

**Stay Focused:** One phase at a time. Resist temptation to jump ahead.

**Test Continuously:** Don't accumulate technical debt.

**Document as You Go:** Future you will thank present you.

**Celebrate Milestones:** Each phase completion is an achievement!

---

## 🎯 **Your Journey Starts Now**

You have:
- ✅ Complete project structure
- ✅ Detailed implementation plan
- ✅ All 180+ files documented
- ✅ Integration strategies
- ✅ Best practices guide
- ✅ Troubleshooting reference

**Everything you need to build SYNAPSE from scratch.**

---

## 📞 **Support & Community**

When you get stuck (you will, everyone does):

1. **Check the logs** - 90% of issues show up in logs
2. **Read error messages** - They're usually helpful
3. **Google the error** - Someone's solved it before
4. **Check official docs** - They're comprehensive
5. **Ask specific questions** - Include error messages and context

---

## 🌟 **Good Luck Building SYNAPSE!**

**You've got this.** 💪

Take it one file at a time, one day at a time, one phase at a time.

Before you know it, you'll have a **production-ready, AI-powered learning platform** that helps students learn smarter, not harder.

**Now go build something amazing!** 🚀

---

# END OF SYNAPSE IMPLEMENTATION PLAN

**Total Coverage:**
- ✅ 218 files documented
- ✅ 10 phases detailed
- ✅ 40 days planned
- ✅ All integrations explained
- ✅ Best practices included
- ✅ Production-ready architecture

**Ready. Set. Build.** 🎯

Files to skip  from my  plan for now:

    alembic.ini

    alembic/env.py

    alembic/script.py.mako

    All alembic/versions/*.py files

    Complex migration scripts 🚫 Why You Should Skip Alembic Initially
1. Development Speed vs. Process

    With Alembic: 30+ minutes setting up, writing migrations, debugging issues

    Without: db.drop_all() → db.create_all() in 2 seconds

    Reality: You'll change your schema 50+ times in the first week

2. The "I'm Just Building" Phase

When you're prototyping:

    Your models WILL change constantly

    You DON'T care about data preservation

    You NEED rapid iteration

    Migration conflicts WILL slow you down
    
    
# 🗃️ SYNAPSE Database Configuration

## 📋 Quick Reference

### **Connection Details**
```bash
# Database URL
DATABASE_URL="postgresql+asyncpg://synapse_user:synapse_pass@localhost/synapse"

# With schema in connection string
DATABASE_URL_WITH_SCHEMA="postgresql+asyncpg://synapse_user:synapse_pass@localhost/synapse?options=-c%20search_path%3Ddeveloper_schema"

# Direct connection
psql -U synapse_user -d synapse -h localhost
```

### **Database Structure**
- **Database**: `synapse`
- **User**: `synapse_user` 
- **Password**: `synapse_pass`
- **Primary Schema**: `developer_schema`
- **Search Path**: `developer_schema, public`

## 🛠️ Setup Commands

### **Initial Setup (Already Done)**
```sql
CREATE USER synapse_user WITH PASSWORD 'synapse_pass' CREATEDB;
CREATE DATABASE synapse OWNER synapse_user;
GRANT ALL PRIVILEGES ON DATABASE synapse TO synapse_user;

-- In synapse database:
CREATE SCHEMA IF NOT EXISTS developer_schema AUTHORIZATION synapse_user;
ALTER USER synapse_user SET search_path TO developer_schema, public;
```

### **Service Management**
```bash
# Check status
sudo systemctl status postgresql

# Start/stop
sudo systemctl start postgresql
sudo systemctl stop postgresql

# Enable on boot
sudo systemctl enable postgresql
```

## 📁 Project Structure
```
synapse/
├── app/sql/
│   ├── functions/           # Business logic in SQL
│   ├── views/              # Materialized views
│   └── migrations/         # Schema changes
├── data/
│   ├── lancedb/           # Vector store
│   └── duckdb/            # Analytics database
└── .env.development       # Configuration
```

## 🔧 Common Operations

### **Load SQL Functions**
```bash
psql -U synapse_user -d synapse -f app/sql/functions/flashcards/calculate_sm2.sql
```

### **Test Connection**
```bash
psql -U synapse_user -d synapse -c "SELECT current_schema();"
```

### **List Tables**
```bash
psql -U synapse_user -d synapse -c "\dt developer_schema.*"
```

## 🚀 Quick Start After Reboot
```bash
# 1. Start PostgreSQL
sudo systemctl start postgresql

# 2. Test connection
psql -U synapse_user -d synapse -c "SELECT version();"

# 3. Verify schema
psql -U synapse_user -d synapse -c "SELECT current_schema();"
```

## 📝 Environment Variables
```bash
# .env.development
DATABASE_URL="postgresql+asyncpg://synapse_user:synapse_pass@localhost/synapse"
DATABASE_SCHEMA="developer_schema"
REDIS_URL="redis://localhost:6379"
LANCEDB_PATH="./data/lancedb"
DUCKDB_PATH="./data/duckdb/analytics.duckdb"
```

## 🎯 Current Status
- ✅ PostgreSQL running on Arch Linux
- ✅ SYNAPSE database created
- ✅ User `synapse_user` with proper permissions
- ✅ Schema `developer_schema` configured
- ✅ Connection tested and working

**Ready for SQL-first development!** 🚀
