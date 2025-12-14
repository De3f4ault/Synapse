# Synapse
### The Next-Generation AI Study Companion

Synapse is an intelligent, privacy-focused study environment that fuses traditional productivity tools with advanced AI capabilities.

> **Note**: This is the root repository. For detailed documentation on specific components, please visit:
> - **[Backend Documentation](./backend/README.md)**: Architecture, Python logic, and API details.
> - **[Frontend Documentation](./frontend/README.md)**: React components, Design System, and UI details.

---

## Quick Start (Complete Environment)

Follow these instructions to get the **full** Synapse environment (Frontend + Backend) running on your machine.

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18+)
- **Python** (v3.11+)
- **PostgreSQL** (running and accessible)

### 2. Clone Repository
```bash
git clone https://github.com/yourusername/synapse.git
cd synapse
```

### 3. Backend Setup (Terminal 1)
Initialize the brain of Synapse.

```bash
cd backend

# Setup Virtual Environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install Deps & Setup Database
pip install -r requirements.txt
# (Ensure your .env is configured with DB connection)
alembic upgrade head

# Launch Server
uvicorn app.main:app --reload
```
*The API will be available at `http://localhost:8000`*

### 4. Frontend Setup (Terminal 2)
Initialize the face of Synapse.

```bash
cd frontend

# Install Deps
npm install

# Launch UI
npm run dev
```
*The App will be available at `http://localhost:3000`*

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
