"""
Report generation utilities for analytics.

Generates formatted reports from analytics data including
user summaries, performance reports, and usage insights.
"""

import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

from .client import AnalyticsClient
from .queries import UserAnalyticsQueries

logger = logging.getLogger(__name__)


class ReportGenerator:
    """
    Generate analytical reports from data.

    Creates formatted reports for different stakeholders
    with visualizations and key metrics.
    """

    def __init__(self, client: AnalyticsClient):
        """
        Initialize report generator.

        Args:
            client: AnalyticsClient instance
        """
        self.client = client
        self.queries = UserAnalyticsQueries(client)
        logger.debug("Initialized ReportGenerator")

    def generate_user_report(
        self,
        user_id: str,
        period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Generate comprehensive user activity report.

        Args:
            user_id: User ID
            period_days: Report period in days

        Returns:
            dict: User report data
        """
        start_date = datetime.now() - timedelta(days=period_days)

        # User activity
        activity_query = f"""
        SELECT
            COUNT(*) as total_queries,
            AVG(response_time_ms) as avg_response_time,
            COUNT(DISTINCT DATE(timestamp)) as active_days,
            AVG(relevance_score) as avg_relevance
        FROM queries
        WHERE user_id = '{user_id}'
        AND timestamp >= '{start_date.isoformat()}'
        """

        activity = self.client.query(activity_query).iloc[0].to_dict()

        # Most accessed documents
        docs_query = f"""
        SELECT
            document_id,
            COUNT(*) as access_count
        FROM query_results
        WHERE user_id = '{user_id}'
        AND timestamp >= '{start_date.isoformat()}'
        GROUP BY document_id
        ORDER BY access_count DESC
        LIMIT 10
        """

        top_documents = self.client.query(docs_query).to_dict('records')

        # Daily activity trend
        trend_query = f"""
        SELECT
            DATE(timestamp) as date,
            COUNT(*) as queries
        FROM queries
        WHERE user_id = '{user_id}'
        AND timestamp >= '{start_date.isoformat()}'
        GROUP BY DATE(timestamp)
        ORDER BY date
        """

        daily_trend = self.client.query(trend_query).to_dict('records')

        return {
            "user_id": user_id,
            "period_days": period_days,
            "generated_at": datetime.now().isoformat(),
            "activity_summary": activity,
            "top_documents": top_documents,
            "daily_trend": daily_trend,
        }

    def generate_system_health_report(
        self,
        period_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Generate system health and performance report.

        Args:
            period_hours: Report period in hours

        Returns:
            dict: System health report
        """
        start_time = datetime.now() - timedelta(hours=period_hours)

        # Overall metrics
        metrics_query = f"""
        SELECT
            COUNT(*) as total_requests,
            COUNT(DISTINCT user_id) as unique_users,
            AVG(response_time_ms) as avg_response_time,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as error_count,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
        FROM queries
        WHERE timestamp >= '{start_time.isoformat()}'
        """

        metrics = self.client.query(metrics_query).iloc[0].to_dict()

        # Hourly breakdown
        hourly_query = f"""
        SELECT
            DATE_TRUNC('hour', timestamp) as hour,
            COUNT(*) as request_count,
            AVG(response_time_ms) as avg_response_time,
            SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as errors
        FROM queries
        WHERE timestamp >= '{start_time.isoformat()}'
        GROUP BY hour
        ORDER BY hour
        """

        hourly_breakdown = self.client.query(hourly_query).to_dict('records')

        # Slowest queries
        slow_queries = f"""
        SELECT
            query_text,
            response_time_ms,
            timestamp,
            user_id
        FROM queries
        WHERE timestamp >= '{start_time.isoformat()}'
        ORDER BY response_time_ms DESC
        LIMIT 10
        """

        slowest = self.client.query(slow_queries).to_dict('records')

        return {
            "report_period_hours": period_hours,
            "generated_at": datetime.now().isoformat(),
            "overall_metrics": metrics,
            "hourly_breakdown": hourly_breakdown,
            "slowest_queries": slowest,
        }

    def generate_weekly_summary(
        self,
        week_offset: int = 0
    ) -> Dict[str, Any]:
        """
        Generate weekly summary report.

        Args:
            week_offset: Weeks back from current (0 = this week)

        Returns:
            dict: Weekly summary report
        """
        end_date = datetime.now() - timedelta(weeks=week_offset)
        start_date = end_date - timedelta(days=7)

        # User metrics
        user_metrics = self.queries.user_activity_summary(start_date, end_date)

        # Document stats
        doc_stats = self.queries.document_usage_stats(top_n=20)

        # Top queries
        top_queries = self.queries.top_queries(limit=20)

        # Performance metrics
        perf_metrics = self.queries.performance_metrics(
            start_date, end_date, bucket_size="1 day"
        )

        return {
            "week_start": start_date.isoformat(),
            "week_end": end_date.isoformat(),
            "generated_at": datetime.now().isoformat(),
            "user_summary": {
                "total_users": len(user_metrics),
                "total_queries": int(user_metrics["total_queries"].sum()),
                "avg_queries_per_user": float(user_metrics["total_queries"].mean()),
            },
            "top_users": user_metrics.head(10).to_dict('records'),
            "popular_documents": doc_stats.head(10).to_dict('records'),
            "top_queries": top_queries.head(10).to_dict('records'),
            "daily_performance": perf_metrics.to_dict('records'),
        }

    def export_report_csv(
        self,
        report_data: Dict[str, Any],
        output_path: Path
    ) -> None:
        """
        Export report data to CSV files.

        Args:
            report_data: Report dictionary
            output_path: Output directory path
        """
        output_path = Path(output_path)
        output_path.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        for key, value in report_data.items():
            if isinstance(value, (list, pd.DataFrame)):
                df = pd.DataFrame(value) if isinstance(value, list) else value
                file_path = output_path / f"{key}_{timestamp}.csv"
                df.to_csv(file_path, index=False)
                logger.info(f"Exported {key} to {file_path}")

    def generate_custom_report(
        self,
        query: str,
        report_name: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate custom report from SQL query.

        Args:
            query: SQL query string
            report_name: Report identifier
            parameters: Query parameters

        Returns:
            dict: Custom report data
        """
        results = self.queries.execute_custom_query(query, parameters)

        return {
            "report_name": report_name,
            "generated_at": datetime.now().isoformat(),
            "parameters": parameters or {},
            "row_count": len(results),
            "data": results.to_dict('records'),
        }
