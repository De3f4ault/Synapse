#!/bin/bash
# Celery worker startup script for SYNAPSE

# Navigate to project directory
cd "$(dirname "$0")"

# Activate virtual environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Start Celery worker
echo "Starting Celery worker for document processing..."
celery -A app.services.background.celery_app:celery_app worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=documents,default \
    --hostname=worker@%h

# To run in background with logs:
# celery -A app.services.background.celery_app:celery_app worker \
#     --loglevel=info \
#     --concurrency=4 \
#     --queues=documents,default \
#     --logfile=logs/celery_worker.log \
#     --detach
