"""
Analytics service — powered by PostgreSQL.

Provides OLAP analytics, learning metrics, and report generation.
SQL functions live in: app/sql/functions/analytics/
"""

from app.services.analytics.queries import UserAnalyticsQueries
from app.services.analytics.reports import ReportGenerator

# Alias for convenience
AnalyticsQueries = UserAnalyticsQueries

__all__ = [
    "AnalyticsQueries",
    "UserAnalyticsQueries",
    "ReportGenerator",
]
