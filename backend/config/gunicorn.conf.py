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
timeout = 30  # Worker timeout in seconds
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
    """Called just before a worker is forked."""
    pass


def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"Worker {worker.pid} spawned")


def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    server.log.info(f"Worker {worker.pid} exited")


# ============================================================================
# Application Loading
# ============================================================================
# If you have special app loading requirements, configure here
# wsgi_app = "app.main:app"  # Not needed, passed via CLI
