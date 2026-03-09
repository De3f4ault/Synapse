# Backward-compatible shim — real implementation in endpoints/dashboard.py
from .endpoints.dashboard import dashboard_websocket_endpoint  # noqa: F401
