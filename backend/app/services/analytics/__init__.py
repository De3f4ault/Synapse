"""
Analytics service using DuckDB.

Provides OLAP analytics capabilities for fast aggregations,
complex queries, and report generation on application data.
"""

from app.services.analytics.client import AnalyticsClient
from app.services.analytics.queries import UserAnalyticsQueries
from app.services.analytics.reports import ReportGenerator

# Export with alias for convenience
AnalyticsQueries = UserAnalyticsQueries

__all__ = [
    "AnalyticsClient",
    "AnalyticsQueries",
    "UserAnalyticsQueries",
    "ReportGenerator",
]
