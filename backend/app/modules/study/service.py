"""
Study Session Service

Business logic for study session operations.
"""

from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc

from app.models.study_session import StudySession, StudySessionType


class StudyService:
    """
    Service layer for study session business logic.

    Handles:
    - Study session CRUD
    - Performance tracking
    - Session analytics
    """

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session

    async def create_session(
        self,
        user_id: int,
        session_type: StudySessionType,
        modules_used: dict
    ) -> StudySession:
        """
        Create a new study session.

        Args:
            user_id: User ID
            session_type: Type of study session
            modules_used: Dictionary of modules being used

        Returns:
            Created StudySession instance
        """
        study_session = StudySession(
            user_id=user_id,
            session_type=session_type,
            modules_used=modules_used,
            started_at=datetime.utcnow(),
            items_completed=0,
            items_correct=0,
            time_spent_seconds=0
        )

        self.session.add(study_session)
        await self.session.commit()
        await self.session.refresh(study_session)

        return study_session

    async def get_session(
        self,
        session_id: int,
        user_id: int
    ) -> Optional[StudySession]:
        """
        Get a study session by ID.

        Args:
            session_id: Session ID
            user_id: User ID (for access control)

        Returns:
            StudySession if found and user has access, None otherwise
        """
        query = select(StudySession).where(
            and_(
                StudySession.id == session_id,
                StudySession.user_id == user_id
            )
        )

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def update_session_progress(
        self,
        session_id: int,
        user_id: int,
        items_completed: Optional[int] = None,
        items_correct: Optional[int] = None,
        time_spent_seconds: Optional[int] = None,
        performance_data: Optional[dict] = None
    ) -> Optional[StudySession]:
        """
        Update study session progress.

        Args:
            session_id: Session ID
            user_id: User ID
            items_completed: Number of items completed
            items_correct: Number of items answered correctly
            time_spent_seconds: Time spent in seconds
            performance_data: Detailed performance metrics

        Returns:
            Updated StudySession instance
        """
        study_session = await self.get_session(session_id, user_id)

        if not study_session:
            return None

        # Update fields if provided
        if items_completed is not None:
            study_session.items_completed = items_completed

        if items_correct is not None:
            study_session.items_correct = items_correct

        if time_spent_seconds is not None:
            study_session.time_spent_seconds = time_spent_seconds

        if performance_data is not None:
            study_session.performance_data = performance_data

        await self.session.commit()
        await self.session.refresh(study_session)

        return study_session

    async def end_session(
        self,
        session_id: int,
        user_id: int
    ) -> Optional[StudySession]:
        """
        End a study session.

        Args:
            session_id: Session ID
            user_id: User ID

        Returns:
            Updated StudySession instance
        """
        study_session = await self.get_session(session_id, user_id)

        if not study_session:
            return None

        study_session.ended_at = datetime.utcnow()

        await self.session.commit()
        await self.session.refresh(study_session)

        return study_session

    async def list_user_sessions(
        self,
        user_id: int,
        limit: int = 50,
        offset: int = 0,
        completed_only: bool = False
    ) -> List[StudySession]:
        """
        List user's study sessions.

        Args:
            user_id: User ID
            limit: Maximum sessions to return
            offset: Pagination offset
            completed_only: Only return completed sessions

        Returns:
            List of StudySession instances
        """
        query = select(StudySession).where(
            StudySession.user_id == user_id
        )

        if completed_only:
            query = query.where(StudySession.ended_at.isnot(None))

        query = query.order_by(desc(StudySession.started_at))
        query = query.limit(limit).offset(offset)

        result = await self.session.execute(query)
        sessions = result.scalars().all()

        return list(sessions)

    async def get_active_session(
        self,
        user_id: int
    ) -> Optional[StudySession]:
        """
        Get user's currently active (not ended) session.

        Args:
            user_id: User ID

        Returns:
            Active StudySession if exists, None otherwise
        """
        query = select(StudySession).where(
            and_(
                StudySession.user_id == user_id,
                StudySession.ended_at.is_(None)
            )
        ).order_by(desc(StudySession.started_at))

        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    def session_to_dict(self, session: StudySession) -> Dict:
        """Convert StudySession to dictionary."""
        return {
            "id": session.id,
            "user_id": session.user_id,
            "session_type": session.session_type.value,
            "modules_used": session.modules_used,
            "started_at": session.started_at.isoformat(),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "items_completed": session.items_completed,
            "items_correct": session.items_correct,
            "time_spent_seconds": session.time_spent_seconds,
            "performance_data": session.performance_data,
            "is_completed": session.is_completed,
            "accuracy": session.accuracy,
            "duration_minutes": session.duration_minutes
        }
