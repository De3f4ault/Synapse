#!/bin/bash
# Quick fix script - reinstall services and restart

echo "Reinstalling services with updated paths..."
sudo ./scripts/install-services.sh

echo ""
echo "Restarting all services..."
sudo systemctl daemon-reload
sudo systemctl restart qdrant
sudo systemctl restart synapse
sudo systemctl restart synapse-celery-worker  
sudo systemctl restart synapse-celery-beat

echo ""
echo "Checking status..."
make services-status
