# ADR 001: Adoption of Modular Monolith Architecture

## Status
**Proposed**

## Context
The current backend structure is a "Layered Architecture" (`api/`, `services/`, `schemas/`).
As the application has grown, strict separation between these layers has blurred.
- **Problem 1**: "God Files" (e.g., `chat.py` > 2000 lines) contain mixed concerns.
- **Problem 2**: Feature logic is scattered across the file tree.
- **Problem 3**: Implicit coupling between features (e.g., `Quizzes` importing `Chat` database models) makes refactoring dangerous.

## Decision
We will transition to a **Modular Monolith** architecture with **Strict Boundaries**.

### 1. Module Structure
Code will be organized by **Domain Feature**, not technical layer.
```text
backend/app/modules/<feature>/
├── api.py           # Public HTTP Routes
├── service.py       # Internal Business Logic
├── schemas.py       # Data Transfer Objects
├── models.py        # Database Models
├── interface.py     # PUBLIC Gateway (The only file other modules can import)
└── __init__.py 
```

### 2. Strict Rules
1.  **No Cross-Module Internals**: Module A cannot import `ModuleB.service` or `ModuleB.models`. It must use `ModuleB.interface`.
2.  **Shared Kernel**: Common utilities live in `app/shared/` or `app/core/`.
3.  **Event-Driven**: Side effects (e.g., "Update stats after quiz") should use an Event Bus where possible.

## Consequences
### Positive
- **Maintainability**: Features are self-contained.
- **Cognitive Load**: Developers only need to look at one folder.
- **Scalability**: Easier to extract modules into microservices later.

### Negative
- **Initial Friction**: Requires defining strict interfaces.
- **Refactoring Effort**: moving existing code requires careful dependency chain management.
