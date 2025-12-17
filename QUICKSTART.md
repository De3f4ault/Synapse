# SYNAPSE Quick Start Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+
- Redis or Valkey
- Qdrant vector database

## Development

### 1. Initial Setup

```bash
make setup    # Install all dependencies and create directories
```

### 2. Start Development

```bash
make dev      # Start frontend + backend with hot reload
```

This starts:

- Backend API: <http://localhost:8000>
- Frontend: <http://localhost:5173>
- API Docs: <http://localhost:8000/docs>

### 3. Check Health

```bash
make health   # Verify all services are running
```

## Production

Synapse uses **Supervisor** for process management in production.

### Start Production

```bash
# Build frontend
cd frontend && npm run build

# Start all services with Supervisor
make prod-start
```

### Manage Services

```bash
make prod-status    # Check service status
make prod-restart   # Restart all services
make prod-stop      # Stop all services
```

### View Logs

```bash
make logs           # Tail all service logs
```

## Command Reference

| Command | Description |
|---------|-------------|
| `make dev` | Start development environment |
| `make prod-start` | Start production with Supervisor |
| `make prod-stop` | Stop all production services |
| `make prod-status` | Check service status |
| `make health` | Health check all services |
| `make logs` | View application logs |
| `make clean` | Clean build artifacts |
| `make help` | Show all commands |

## Troubleshooting

### Services won't start

```bash
make health           # Check what's running
cd backend && make logs  # Check logs
```

### Port conflicts

Default ports: 8000 (API), 5173 (dev frontend), 5432 (PostgreSQL), 6379 (Redis), 6333 (Qdrant)

```bash
sudo ss -tlnp | grep :8000   # Check what's using a port
```
