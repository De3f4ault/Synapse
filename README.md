# Synapse

### The Next-Generation AI Study Companion

Synapse is an intelligent, privacy-focused study environment that fuses traditional productivity tools with advanced AI capabilities.

> **Note**: This is the root repository. For detailed documentation on specific components, please visit:
>
> - **[Backend Documentation](./backend/README.md)**: Architecture, Python logic, and API details.
> - **[Frontend Documentation](./frontend/README.md)**: React components, Design System, and UI details.

---

## Quick Start

**TL;DR - One Command Setup:**

```bash
# Install dependencies and set up environment
make setup

# Start development environment (frontend + backend)
make dev
```

**For detailed setup instructions, see [QUICKSTART.md](./QUICKSTART.md)**

### Traditional Setup

Alternatively, you can set up each component manually:

#### Backend (Terminal 1)

```bash
cd backend
make setup          # Set up environment and dependencies
make dev            # Start development server
```

*The API will be available at `http://localhost:8000`*

#### Frontend (Terminal 2)

```bash
cd frontend
npm install         # Install dependencies
npm run dev         # Start Vite dev server
```

*The App will be available at `http://localhost:5173`*

### Common Commands

```bash
make help           # Show all available commands
make health         # Check health of all services
make services-start # Start all production services
make prod-deploy    # Full production deployment
```

For more commands and detailed documentation, run `make help` or see [QUICKSTART.md](./QUICKSTART.md).

---

## Features Overview

| Feature | Description |
| :--- | :--- |
| **Intelligent Notes** | Document-style editor with "Paper-Glass" aesthetic, AI insights panel, and masonry grid layouts. |
| **Neural Flashcards** | Active recall powered by AI. Generate decks from notes instantly. |
| **Deep Chat** | Context-aware AI tutor that chat with your entire knowledge base. |
| **Analytics** | Visual dashboards tracking your learning velocity and retention. |

---

## Stack Summary

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind, Framer Motion, Zustand |
| **Backend** | FastAPI, Python 3.11, LangChain, Pydantic v2 |
| **Data** | PostgreSQL, SQLAlchemy, PGVector |

---

<div align="center">
  <p><i>Check the sub-directories for in-depth contribution guides.</i></p>
  <p>Built for the pursuit of knowledge.</p>
</div>
