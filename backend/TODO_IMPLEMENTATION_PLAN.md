# TODO Implementation Plan - SYNAPSE Backend

**Total Items:** 31 TODOs
**Generated:** 2025-01-21
**Priority Levels:** Critical, High, Medium, Low

---

## 🔴 Phase 1: Critical - System Stability & Core Infrastructure (8 items)

**Goal:** Ensure system health monitoring and core security features are operational.
**Estimated Time:** 1-2 weeks

### 1.1 Health Check System (5 items)
**File:** `app/api/rest/health.py`

#### Priority Order:
1. **Redis Cache Health Check**
   - Add Redis ping test
   - Check connection pool status
   - Return latency metrics
   ```python
   async def check_redis_health() -> HealthStatus:
       try:
           await redis_client.ping()
           return HealthStatus(service="redis", status="healthy")
       except Exception as e:
           return HealthStatus(service="redis", status="unhealthy", error=str(e))
   ```

2. **PostgreSQL Health Check Enhancement**
   - Already implemented but verify query performance
   - Add connection pool metrics

3. **LanceDB Vector Store Health Check**
   - Test connection to LanceDB
   - Verify table existence
   - Check embedding dimensions
   ```python
   async def check_lancedb_health() -> HealthStatus:
       try:
           db = lancedb.connect(settings.LANCEDB_PATH)
           tables = db.table_names()
           return HealthStatus(service="lancedb", status="healthy", details={"tables": len(tables)})
       except Exception as e:
           return HealthStatus(service="lancedb", status="unhealthy", error=str(e))
   ```

4. **DuckDB Analytics Health Check**
   - Connect to DuckDB
   - Verify analytics tables exist
   - Test simple query execution
   ```python
   async def check_duckdb_health() -> HealthStatus:
       try:
           conn = duckdb.connect(settings.DUCKDB_PATH)
           result = conn.execute("SELECT COUNT(*) FROM information_schema.tables").fetchone()
           return HealthStatus(service="duckdb", status="healthy", details={"tables": result[0]})
       except Exception as e:
           return HealthStatus(service="duckdb", status="unhealthy", error=str(e))
   ```

5. **Gemini API Health Check**
   - Make lightweight API call (e.g., list models)
   - Check quota/rate limit status
   - Verify API key validity
   ```python
   async def check_gemini_health() -> HealthStatus:
       try:
           import google.generativeai as genai
           genai.configure(api_key=settings.GEMINI_API_KEY)
           models = genai.list_models()
           return HealthStatus(service="gemini", status="healthy", details={"models": len(list(models))})
       except Exception as e:
           return HealthStatus(service="gemini", status="unhealthy", error=str(e))
   ```

### 1.2 Security Enhancement (1 item)
**File:** `app/api/rest/auth.py`

#### Token Blacklisting Implementation
- Create Redis set for blacklisted tokens: `blacklisted_tokens:{user_id}`
- Add token to blacklist on logout
- Check blacklist on every authenticated request (in middleware)
- Set expiration to match JWT expiration time

```python
async def logout(token: str, db: AsyncSession):
    # Decode token to get user_id and expiration
    payload = decode_jwt(token)
    user_id = payload["sub"]
    exp = payload["exp"]

    # Add to Redis blacklist
    redis_key = f"blacklisted_tokens:{user_id}"
    await redis_client.sadd(redis_key, token)
    await redis_client.expireat(redis_key, exp)

    return {"message": "Logged out successfully"}

# In middleware: app/core/middleware/authentication.py
async def check_token_blacklisted(token: str, user_id: int) -> bool:
    redis_key = f"blacklisted_tokens:{user_id}"
    return await redis_client.sismember(redis_key, token)
```

### 1.3 Analytics Infrastructure (4 items)
**File:** `app/core/events/subscribers/analytics_updater.py`

#### DuckDB Analytics Updates
All four events need DuckDB table inserts/updates:

1. **Flashcard Review Analytics**
   ```python
   async def update_flashcard_review_analytics(event: Event):
       conn = duckdb.connect(settings.DUCKDB_PATH)
       conn.execute("""
           INSERT INTO flashcard_reviews (user_id, card_id, quality, timestamp, ease_factor)
           VALUES (?, ?, ?, ?, ?)
       """, (event.user_id, event.data['card_id'], event.data['quality'],
             event.timestamp, event.data['ease_factor']))
   ```

2. **Note Creation Analytics**
   ```python
   async def update_note_creation_analytics(event: Event):
       conn = duckdb.connect(settings.DUCKDB_PATH)
       conn.execute("""
           INSERT INTO note_activity (user_id, note_id, action, timestamp, word_count)
           VALUES (?, ?, 'created', ?, ?)
       """, (event.user_id, event.data['note_id'], event.timestamp,
             event.data.get('word_count', 0)))
   ```

3. **Quiz Completion Analytics**
   ```python
   async def update_quiz_completion_analytics(event: Event):
       conn = duckdb.connect(settings.DUCKDB_PATH)
       conn.execute("""
           INSERT INTO quiz_results (user_id, quiz_id, score, timestamp, time_spent_seconds)
           VALUES (?, ?, ?, ?, ?)
       """, (event.user_id, event.data['quiz_id'], event.data['score'],
             event.timestamp, event.data['time_spent']))
   ```

4. **Document Processing Analytics**
   ```python
   async def update_document_processing_analytics(event: Event):
       conn = duckdb.connect(settings.DUCKDB_PATH)
       conn.execute("""
           INSERT INTO document_activity (user_id, document_id, action, timestamp, chunk_count)
           VALUES (?, ?, 'processed', ?, ?)
       """, (event.user_id, event.data['document_id'], event.timestamp,
             event.data.get('chunk_count', 0)))
   ```

**Prerequisites:** Create DuckDB schema/tables first (add to migrations or init script)

---

## 🟠 Phase 2: High Priority - Core Features (9 items)

**Goal:** Complete critical feature implementations that affect user functionality.
**Estimated Time:** 2-3 weeks

### 2.1 Document Processing Pipeline (4 items)
**File:** `app/api/rest/documents.py`

1. **Background Processing Task Trigger**
   - Use Celery task queue for async processing
   - Trigger chunking, embedding, and vector storage
   ```python
   from app.services.background.tasks import process_document_task

   @router.post("/documents", response_model=DocumentResponse)
   async def upload_document(file: UploadFile, db: AsyncSession):
       # Save document record
       document = await document_service.create(...)

       # Trigger background task
       process_document_task.delay(document.id)

       return document
   ```

2. **LanceDB Vector Store Cleanup**
   - Delete document embeddings on document deletion
   ```python
   @router.delete("/documents/{document_id}")
   async def delete_document(document_id: int, db: AsyncSession):
       # Delete from PostgreSQL
       await document_service.delete(document_id)

       # Delete from LanceDB
       from app.services.vector_store.operations import delete_document_vectors
       await delete_document_vectors(document_id)
   ```

3. **Gemini Files API Cleanup**
   - If document was uploaded to Gemini Files API, delete it
   ```python
   async def delete_from_gemini(document: Document):
       if document.gemini_file_id:
           import google.generativeai as genai
           genai.configure(api_key=settings.GEMINI_API_KEY)
           genai.delete_file(document.gemini_file_id)
   ```

4. **Physical File Cleanup**
   - Add query parameter: `?delete_file=true`
   - Remove file from storage if requested
   ```python
   @router.delete("/documents/{document_id}")
   async def delete_document(
       document_id: int,
       delete_file: bool = False,
       db: AsyncSession
   ):
       document = await document_service.get(document_id)

       if delete_file and document.file_path:
           import os
           os.remove(document.file_path)
   ```

### 2.2 Webhook Management (4 items)
**Files:** `app/api/rest/webhooks.py`, `app/api/webhooks/receivers.py`

1. **Webhook Listing Endpoint**
   ```python
   @router.get("/webhooks", response_model=List[WebhookResponse])
   async def list_webhooks(
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   ):
       webhooks = await db.execute(
           select(WebhookEvent).where(WebhookEvent.user_id == current_user.id)
       )
       return webhooks.scalars().all()
   ```

2. **Webhook Creation Endpoint**
   ```python
   @router.post("/webhooks", response_model=WebhookResponse)
   async def create_webhook(
       webhook_data: WebhookCreate,
       current_user: User = Depends(get_current_user),
       db: AsyncSession = Depends(get_db)
   ):
       # Generate webhook secret
       import secrets
       webhook_secret = secrets.token_urlsafe(32)

       # Save to database
       webhook = WebhookEvent(
           user_id=current_user.id,
           url=webhook_data.url,
           events=webhook_data.events,
           secret=webhook_secret,
           active=True
       )
       db.add(webhook)
       await db.commit()

       return webhook
   ```

3. **Webhook Secret Retrieval**
   ```python
   async def get_webhook_secret(webhook_id: str, db: AsyncSession) -> str:
       result = await db.execute(
           select(WebhookEvent.secret).where(WebhookEvent.id == webhook_id)
       )
       return result.scalar_one()
   ```

4. **Webhook Event Processing**
   ```python
   async def process_webhook_event(event_type: str, payload: dict, db: AsyncSession):
       # Route to appropriate handler based on event type
       handlers = {
           "flashcard.reviewed": handle_flashcard_review,
           "note.created": handle_note_creation,
           "quiz.completed": handle_quiz_completion,
       }

       handler = handlers.get(event_type)
       if handler:
           await handler(payload, db)
   ```

### 2.3 User Features (1 item)
**File:** `app/api/rest/users.py`

#### User Statistics Queries
```python
@router.get("/users/me/statistics", response_model=UserStatistics)
async def get_user_statistics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Query from analytics tables and PostgreSQL
    stats = {
        "total_flashcards": await count_user_flashcards(current_user.id, db),
        "total_notes": await count_user_notes(current_user.id, db),
        "total_documents": await count_user_documents(current_user.id, db),
        "study_streak_days": await get_study_streak(current_user.id, db),
        "reviews_today": await count_reviews_today(current_user.id, db),
        "average_accuracy": await get_average_accuracy(current_user.id, db),
    }
    return stats
```

---

## 🟡 Phase 3: Medium Priority - Enhanced Features (8 items)

**Goal:** Improve user experience and add advanced capabilities.
**Estimated Time:** 2-3 weeks

### 3.1 WebSocket Enhancements (3 items)

1. **WebSocket Cleanup Logic** (`app/api/websockets/manager.py`)
   - Remove disconnected connections
   - Clean up user session data
   ```python
   async def cleanup_connection(self, connection_id: str):
       if connection_id in self.active_connections:
           del self.active_connections[connection_id]

       # Clean up Redis session data
       await redis_client.delete(f"ws_session:{connection_id}")
   ```

2. **AI Streaming Implementation** (`app/api/websockets/chat.py`)
   - Stream AI responses token-by-token
   ```python
   async def handle_chat_message(websocket: WebSocket, message: dict):
       # Get AI response with streaming
       async for token in stream_ai_response(message["text"]):
           await websocket.send_json({
               "type": "token",
               "content": token
           })

       await websocket.send_json({"type": "done"})
   ```

3. **Study Session Logic** (`app/api/websockets/study.py`)
   - Implement real-time study session updates
   - Track progress, send next items
   ```python
   async def handle_study_session(websocket: WebSocket, user_id: int):
       session = await create_study_session(user_id)

       while session.active:
           # Get next item
           item = await get_next_study_item(session)
           await websocket.send_json({"type": "item", "data": item})

           # Wait for response
           response = await websocket.receive_json()
           await record_study_result(session, item, response)
   ```

### 3.2 Study System (1 item)
**File:** `app/api/rest/study.py`

#### Add Quiz Items to Study Endpoint
```python
@router.get("/study/due", response_model=List[StudyItem])
async def get_due_study_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Get flashcards (already implemented)
    flashcards = await get_due_flashcards(current_user.id, db)

    # Add quiz items
    quizzes = await db.execute(
        select(Quiz)
        .join(QuizAttempt)
        .where(
            Quiz.user_id == current_user.id,
            QuizAttempt.next_review_date <= datetime.utcnow()
        )
    )

    return format_study_items(flashcards, quizzes.scalars().all())
```

### 3.3 Agent Monitoring (2 items)
**File:** `app/core/ai/agents/monitoring/escalation.py`

1. **Database Queries for Escalation Rules**
   ```python
   async def get_escalation_rules(user_id: int, db: AsyncSession) -> List[EscalationRule]:
       result = await db.execute(
           select(EscalationRule).where(EscalationRule.user_id == user_id)
       )
       return result.scalars().all()
   ```

2. **Database Updates for Escalation**
   ```python
   async def record_escalation(
       user_id: int,
       agent_name: str,
       reason: str,
       db: AsyncSession
   ):
       escalation = AgentEscalation(
           user_id=user_id,
           agent_name=agent_name,
           reason=reason,
           timestamp=datetime.utcnow()
       )
       db.add(escalation)
       await db.commit()
   ```

### 3.4 Notification System (2 items)

1. **Agent Alert Notifications** (`app/core/ai/agents/monitoring/alerts.py`)
   ```python
   async def send_alert_notification(alert: Alert):
       channels = alert.notification_channels or ["email"]

       for channel in channels:
           if channel == "email":
               await send_email_alert(alert)
           elif channel == "slack":
               await send_slack_alert(alert)
           elif channel == "webhook":
               await send_webhook_alert(alert)
   ```

2. **Realtime Alert Notifications** (`app/core/realtime/alerts.py`)
   - Similar implementation as above
   - Add WebSocket notification channel for in-app alerts

---

## 🟢 Phase 4: Low Priority - Enhancements & Optimizations (6 items)

**Goal:** Polish features and improve performance.
**Estimated Time:** 1-2 weeks

### 4.1 Data Export (1 item)
**File:** `app/api/rest/analytics.py`

#### CSV/JSON Export Implementation
```python
@router.get("/analytics/export")
async def export_learning_data(
    format: str = "json",  # json or csv
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Gather all user data
    data = await gather_user_learning_data(current_user.id, db)

    if format == "csv":
        return generate_csv_response(data)
    else:
        return data  # JSON by default
```

### 4.2 Chat AI Response (1 item)
**File:** `app/api/rest/chat.py`

#### AI Response Generation
```python
@router.post("/chat/{session_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    session_id: int,
    message: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Save user message
    user_msg = await chat_service.create_message(session_id, message.text, "user")

    # Generate AI response
    from app.core.ai.agents.factory import AgentFactory
    agent = AgentFactory.create_agent("tutor")

    context = await get_user_context(current_user.id, db)
    result = await agent.execute(current_user.id, message.text, context)

    # Save AI response
    ai_msg = await chat_service.create_message(session_id, result.output, "assistant")

    return ai_msg
```

### 4.3 Algorithm Migration (1 item)
**File:** `app/api/rest/flashcards.py`

#### SM-2 Logic to SQL Function
Move current Python SM-2 algorithm to PostgreSQL function:

```sql
-- Create in app/sql/functions/flashcards/update_sm2_parameters.sql
CREATE OR REPLACE FUNCTION update_sm2_parameters(
    p_card_id INT,
    p_quality INT
) RETURNS TABLE(
    new_ease_factor DECIMAL,
    new_interval INT,
    new_repetitions INT,
    next_review_date TIMESTAMP
) AS $$
DECLARE
    v_ease_factor DECIMAL;
    v_interval INT;
    v_repetitions INT;
BEGIN
    -- Get current values
    SELECT ease_factor, interval, repetitions
    INTO v_ease_factor, v_interval, v_repetitions
    FROM flashcards
    WHERE id = p_card_id;

    -- Apply SM-2 algorithm
    IF p_quality >= 3 THEN
        v_repetitions := v_repetitions + 1;
        IF v_repetitions = 1 THEN
            v_interval := 1;
        ELSIF v_repetitions = 2 THEN
            v_interval := 6;
        ELSE
            v_interval := ROUND(v_interval * v_ease_factor);
        END IF;
    ELSE
        v_repetitions := 0;
        v_interval := 1;
    END IF;

    v_ease_factor := v_ease_factor + (0.1 - (5 - p_quality) * (0.08 + (5 - p_quality) * 0.02));
    v_ease_factor := GREATEST(v_ease_factor, 1.3);

    -- Update flashcard
    UPDATE flashcards
    SET ease_factor = v_ease_factor,
        interval = v_interval,
        repetitions = v_repetitions,
        next_review_date = NOW() + (v_interval || ' days')::INTERVAL
    WHERE id = p_card_id;

    RETURN QUERY
    SELECT v_ease_factor, v_interval, v_repetitions,
           NOW() + (v_interval || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
```

Then call from Python:
```python
result = await db.execute(
    text("SELECT * FROM update_sm2_parameters(:card_id, :quality)"),
    {"card_id": card_id, "quality": quality}
)
```

### 4.4 Background Task Setup (3 items)
**Prerequisite for Document Processing**

1. **Create Celery Task** (`app/services/background/tasks.py`)
   ```python
   @celery_app.task
   def process_document_task(document_id: int):
       # Chunk document
       chunks = chunk_document(document_id)

       # Generate embeddings
       embeddings = generate_embeddings(chunks)

       # Store in LanceDB
       store_vectors(document_id, chunks, embeddings)

       # Update document status
       update_document_status(document_id, "processed")
   ```

2. **Start Celery Worker**
   - Add to Makefile: `celery-worker`
   - Document in README

3. **Configure Task Queue**
   - Set up Redis as Celery broker
   - Configure result backend

---

## 📊 Implementation Metrics

### Estimated Timeline:
- **Phase 1 (Critical):** 1-2 weeks
- **Phase 2 (High):** 2-3 weeks
- **Phase 3 (Medium):** 2-3 weeks
- **Phase 4 (Low):** 1-2 weeks

**Total Estimated Time:** 6-10 weeks

### Priority Distribution:
- Critical: 13 items (42%)
- High: 9 items (29%)
- Medium: 8 items (26%)
- Low: 6 items (19%)

### Risk Areas:
1. DuckDB analytics integration (no tables defined yet)
2. Celery/background task infrastructure not set up
3. Gemini Files API integration needs testing
4. WebSocket streaming requires testing at scale

---

## 🚀 Getting Started

### Recommended Implementation Order:
1. Start with **Health Checks** - immediate visibility into system status
2. Implement **Token Blacklisting** - security critical
3. Set up **DuckDB schema** for analytics
4. Implement **Analytics Updates** - enables data-driven features
5. Complete **Document Processing** - high user value
6. Build out **Webhook Management** - enables integrations
7. Continue with remaining items by priority

### Testing Strategy:
- Unit tests for each TODO item
- Integration tests for workflows (document processing, webhooks)
- Load tests for WebSocket features
- Manual verification of health checks

### Dependencies to Install:
```bash
# For background tasks
pip install celery

# For CSV export
pip install pandas

# Already in requirements.txt:
# - redis, duckdb, lancedb, google-generativeai
```

---

## 📝 Notes

- All database changes require migrations (Alembic)
- Update API documentation (OpenAPI) as endpoints are completed
- Consider adding feature flags for gradual rollout
- Monitor performance impact of new features (especially analytics updates)
- Keep security in mind (webhook secrets, token validation)

---

**Document Last Updated:** 2025-01-21
**Status:** Ready for Implementation
**Next Review:** After Phase 1 completion
