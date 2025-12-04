"""
Activity Service

Business logic for activity logging and session detection.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.activity_log import ActivityLog, ActivityType, ModuleType


class ActivityService:
    """
    Service layer for activity logging.

    Handles:
    - Activity logging
    - Activity retrieval
    - Session detection (backend-side)
    """

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session

    async def log_activity(
        self,
        user_id: int,
        activity_type: ActivityType,
        module: ModuleType,
        resource_id: Optional[int] = None,
        resource_title: Optional[str] = None,
        metadata: Optional[dict] = None
    ) -> ActivityLog:
        """
        Log a user activity.

        Args:
            user_id: User ID
            activity_type: Type of activity
            module: Module where activity occurred
            resource_id: Optional resource ID
            resource_title: Optional resource title
            metadata: Optional additional metadata

        Returns:
            Created ActivityLog instance
        """
        activity = ActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            module=module,
            resource_id=resource_id,
            resource_title=resource_title,
            meta_data=metadata or {}
        )

        self.session.add(activity)
        await self.session.commit()
        await self.session.refresh(activity)

        return activity

    async def get_user_activities(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        module: Optional[ModuleType] = None,
        activity_type: Optional[ActivityType] = None,
        since: Optional[datetime] = None
    ) -> List[ActivityLog]:
        """
        Get user activities with optional filters.

        Args:
            user_id: User ID
            limit: Maximum activities to return
            offset: Pagination offset
            module: Optional module filter
            activity_type: Optional activity type filter
            since: Optional datetime filter (activities after this time)

        Returns:
            List of ActivityLog instances
        """
        query = select(ActivityLog).where(
            ActivityLog.user_id == user_id
        )

        # Apply filters
        if module:
            query = query.where(ActivityLog.module == module)

        if activity_type:
            query = query.where(ActivityLog.activity_type == activity_type)

        if since:
            query = query.where(ActivityLog.created_at >= since)

        # Order by most recent first
        query = query.order_by(desc(ActivityLog.created_at))

        # Pagination
        query = query.limit(limit).offset(offset)

        result = await self.session.execute(query)
        activities = result.scalars().all()

        return list(activities)

    async def get_recent_activities(
        self,
        user_id: int,
        hours: int = 24,
        limit: int = 100
    ) -> List[ActivityLog]:
        """
        Get user's recent activities within specified hours.

        Args:
            user_id: User ID
            hours: Number of hours to look back
            limit: Maximum activities to return

        Returns:
            List of recent ActivityLog instances
        """
        since = datetime.utcnow() - timedelta(hours=hours)

        return await self.get_user_activities(
            user_id=user_id,
            limit=limit,
            since=since
        )

    async def detect_sessions(
        self,
        user_id: int,
        hours: int = 24,
        session_timeout_minutes: int = 30,
        min_activities: int = 2
    ) -> List[Dict]:
        """
        Detect study sessions from user activities.

        Uses sliding window algorithm to group activities into sessions
        based on time gaps.

        Args:
            user_id: User ID
            hours: Hours to look back
            session_timeout_minutes: Max gap between activities in same session
            min_activities: Minimum activities to count as session

        Returns:
            List of detected sessions with metadata
        """
        # Get recent activities
        activities = await self.get_recent_activities(user_id, hours)

        if not activities:
            return []

        # Sort by timestamp (oldest first for session detection)
        sorted_activities = sorted(activities, key=lambda a: a.created_at)

        sessions = []
        current_session = None
        session_timeout = timedelta(minutes=session_timeout_minutes)

        for activity in sorted_activities:
            if current_session is None:
                # Start new session
                current_session = {
                    "start_time": activity.created_at,
                    "activities": [activity],
                    "modules": {activity.module.value}
                }
            else:
                # Check time gap from last activity
                last_activity = current_session["activities"][-1]
                gap = activity.created_at - last_activity.created_at

                if gap <= session_timeout:
                    # Continue current session
                    current_session["activities"].append(activity)
                    current_session["modules"].add(activity.module.value)
                else:
                    # Close current session if it meets minimum
                    if len(current_session["activities"]) >= min_activities:
                        sessions.append(self._build_session_dict(current_session))

                    # Start new session
                    current_session = {
                        "start_time": activity.created_at,
                        "activities": [activity],
                        "modules": {activity.module.value}
                    }

        # Close final session
        if current_session and len(current_session["activities"]) >= min_activities:
            sessions.append(self._build_session_dict(current_session))

        return sessions

    def _build_session_dict(self, session_data: dict) -> dict:
        """Build session dictionary from accumulated data."""
        activities = session_data["activities"]
        start_time = session_data["start_time"]
        end_time = activities[-1].created_at
        duration = (end_time - start_time).total_seconds()

        return {
            "id": f"session-{int(start_time.timestamp())}",
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration": duration,
            "activity_count": len(activities),
            "modules_used": list(session_data["modules"]),
            "resources_accessed": self._extract_resources(activities)
        }

    def _extract_resources(self, activities: List[ActivityLog]) -> List[dict]:
        """Extract unique resources from activities."""
        resources_map = {}

        for activity in activities:
            if activity.resource_id:
                key = f"{activity.module.value}-{activity.resource_id}"
                if key not in resources_map:
                    resources_map[key] = {
                        "type": activity.module.value,
                        "id": activity.resource_id,
                        "title": activity.resource_title
                    }

        return list(resources_map.values())

    async def get_activity_count(
        self,
        user_id: int,
        since: Optional[datetime] = None
    ) -> int:
        """
        Get total activity count for a user.

        Args:
            user_id: User ID
            since: Optional datetime filter

        Returns:
            Total count of activities
        """
        query = select(ActivityLog).where(
            ActivityLog.user_id == user_id
        )

        if since:
            query = query.where(ActivityLog.created_at >= since)

        result = await self.session.execute(query)
        activities = result.scalars().all()

        return len(activities)
