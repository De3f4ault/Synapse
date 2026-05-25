"""
Gunicorn Configuration for SYNAPSE Backend
Production-ready ASGI server configuration with Uvicorn workers
"""

import multiprocessing
import os

# ============================================================================
# Server Socket
# ============================================================================
bind = "0.0.0.0:8000"
backlog = 2048

# ============================================================================
# Worker Processes (OPTIMIZED for resource-constrained systems)
# ============================================================================
# Worker class - MUST use uvicorn for ASGI/FastAPI support
worker_class = "uvicorn.workers.UvicornWorker"

# Number of workers
# Original formula: (2 x CPU cores) + 1 = 17 for 8-thread CPU (too aggressive)
# Optimized: 3 workers balances performance and memory usage
# Can be overridden via GUNICORN_WORKERS environment variable
workers = int(os.getenv("GUNICORN_WORKERS", 3))

# Worker threads (per worker)
threads = 1  # Keep at 1 for async workers

# Maximum requests a worker will process before restarting
# Helps prevent memory leaks
max_requests = 1000
max_requests_jitter = 50  # Randomize restart to avoid all workers restarting simultaneously

# ============================================================================
# Timeouts
# ============================================================================
timeout = 120  # Worker timeout in seconds (increased for long model inference)
graceful_timeout = 30  # Graceful shutdown timeout
keepalive = 2  # Keep-alive connections

# ============================================================================
# Logging
# ============================================================================
# Access log
accesslog = os.getenv("GUNICORN_ACCESS_LOG", "-")  # "-" = stdout
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Error log
errorlog = os.getenv("GUNICORN_ERROR_LOG", "-")  # "-" = stderr
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# ============================================================================
# Process Naming
# ============================================================================
proc_name = "synapse-backend"

# ============================================================================
# Server Mechanics
# ============================================================================
daemon = False  # Run in foreground (systemd will manage)
pidfile = None  # No PID file needed with systemd
umask = 0o007
user = None  # Run as current user (set in systemd service)
group = None
tmp_upload_dir = None

# ============================================================================
# App Loading
# ============================================================================
# CRITICAL: Keep preload_app=False.
# SQLAlchemy engines (async + sync) in session.py are created at module level.
# If preload_app=True, the master process imports the app and creates engines
# BEFORE forking workers. Every child inherits the same connection pool and
# underlying socket FDs — causing "SSL connection has been closed unexpectedly"
# errors under load that are nearly impossible to diagnose.
# With preload_app=False (default), each worker imports the app independently
# after forking, creating its own isolated connection pool. This is correct.
preload_app = False

# ============================================================================
# SSL (Optional - Nginx handles this)
# ============================================================================
# keyfile = None
# certfile = None


# ============================================================================
# Server Hooks
# ============================================================================
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("Starting Gunicorn server...")


def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("Reloading Gunicorn server...")


def when_ready(server):
    """Called just after the server is started."""
    server.log.info(f"Gunicorn server is ready. Listening on: {bind}")
    server.log.info(f"Workers: {workers} | Worker class: {worker_class}")


def worker_int(worker):
    """Called when a worker receives SIGINT or SIGQUIT."""
    worker.log.info(f"Worker {worker.pid} received interrupt signal")


def worker_abort(worker):
    """Called when a worker times out."""
    worker.log.warning(f"Worker {worker.pid} timed out and will be restarted")


def pre_fork(server, worker):
    """Dispose all SQLAlchemy engines before forking.

    Although preload_app=False means engines aren't normally inherited,
    this hook acts as a defensive safety net. If preload_app is ever
    accidentally enabled, this prevents connection pool corruption across
    forked processes.

    Safe to call even if the app hasn't been imported yet (import guard).
    """
    try:
        from app.db.session import engine, sync_engine

        # Sync engine — standard synchronous dispose, no event loop needed
        sync_engine.dispose()

        # Async engine — needs a temporary event loop just for dispose()
        import asyncio
        _loop = asyncio.new_event_loop()
        _loop.run_until_complete(engine.dispose())
        _loop.close()

        server.log.info("pre_fork: SQLAlchemy engines disposed before worker fork")
    except ImportError:
        # App module not yet imported (preload_app=False normal path)
        # Nothing to dispose — this is expected and fine.
        pass
    except Exception as exc:
        # Log but do not raise — a failed dispose should not block the fork
        server.log.warning(f"pre_fork: engine dispose warning: {exc}")


def post_fork(server, worker):
    """Log worker spawn.

    Engines are NOT recreated here — SQLAlchemy creates new connections
    lazily on first use within the child process. Each worker builds its
    own isolated connection pool independently.
    """
    server.log.info(f"Worker {worker.pid} spawned — isolated DB connection pool will be created on first use")


def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    server.log.info(f"Worker {worker.pid} exited")


# ============================================================================
# Application Loading
# ============================================================================
# If you have special app loading requirements, configure here
# wsgi_app = "app.main:app"  # Not needed, passed via CLI
