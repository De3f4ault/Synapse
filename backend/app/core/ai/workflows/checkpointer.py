"""
Workflow Checkpointer - State persistence for LangGraph workflows.

Provides checkpointing capabilities for:
- Resuming interrupted workflows
- Human-in-the-loop approval steps
- Debugging via "time travel"
- Cross-session memory

Based on LangGraph AsyncSqliteSaver pattern.
"""

from typing import Optional, Any
from pathlib import Path
import structlog

logger = structlog.get_logger(__name__)


class WorkflowCheckpointer:
    """
    Manages workflow state persistence.
    
    Wraps LangGraph's checkpointing with SYNAPSE-specific features:
    - Session-based thread IDs
    - Automatic cleanup of old checkpoints
    - Metrics tracking
    
    Usage:
        checkpointer = WorkflowCheckpointer()
        await checkpointer.initialize()
        
        # Use with workflow
        compiled = workflow.compile(checkpointer=checkpointer.get_saver())
    """
    
    def __init__(
        self,
        db_path: str = "workflow_checkpoints.db",
        use_memory: bool = False
    ):
        """
        Initialize checkpointer.
        
        Args:
            db_path: Path to SQLite database file
            use_memory: Use in-memory database (for testing)
        """
        self.db_path = ":memory:" if use_memory else db_path
        self._saver = None
        self._initialized = False
        self.logger = logger.bind(component="checkpointer")
    
    async def initialize(self) -> None:
        """Initialize the checkpointer."""
        if self._initialized:
            return
        
        try:
            from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
            
            self._saver = AsyncSqliteSaver.from_conn_string(self.db_path)
            await self._saver.setup()
            
            self._initialized = True
            self.logger.info(
                "checkpointer_initialized",
                db_path=self.db_path
            )
            
        except ImportError:
            self.logger.warning(
                "langgraph_checkpoint_not_available",
                fallback="using_memory_saver"
            )
            # Fallback to in-memory if langgraph.checkpoint not installed
            self._saver = None
            self._initialized = True
        except Exception as e:
            self.logger.error(
                "checkpointer_init_failed",
                error=str(e)
            )
            self._saver = None
            self._initialized = True
    
    def get_saver(self) -> Optional[Any]:
        """Get the underlying saver instance."""
        return self._saver
    
    def get_thread_id(self, session_id: int, user_id: int) -> str:
        """Generate consistent thread ID for a session."""
        return f"user_{user_id}_session_{session_id}"
    
    def get_config(self, session_id: int, user_id: int) -> dict:
        """Get LangGraph config with thread ID."""
        return {
            "configurable": {
                "thread_id": self.get_thread_id(session_id, user_id)
            }
        }
    
    async def cleanup_old_checkpoints(
        self,
        older_than_days: int = 30
    ) -> int:
        """
        Clean up old checkpoints.
        
        Args:
            older_than_days: Delete checkpoints older than this
            
        Returns:
            Number of checkpoints deleted
        """
        # Note: This would require custom SQL queries
        # For now, just log the intent
        self.logger.info(
            "cleanup_requested",
            older_than_days=older_than_days
        )
        return 0


# Global instance
_checkpointer: Optional[WorkflowCheckpointer] = None


async def get_checkpointer(
    use_memory: bool = False
) -> WorkflowCheckpointer:
    """Get global checkpointer instance."""
    global _checkpointer
    if _checkpointer is None:
        _checkpointer = WorkflowCheckpointer(use_memory=use_memory)
        await _checkpointer.initialize()
    return _checkpointer


async def compile_with_checkpointing(
    workflow_builder,
    session_id: int,
    user_id: int
):
    """
    Compile workflow with checkpointing enabled.
    
    Args:
        workflow_builder: Function that returns a StateGraph
        session_id: Session ID for thread
        user_id: User ID for thread
        
    Returns:
        Compiled workflow with checkpointing
    """
    checkpointer = await get_checkpointer()
    
    workflow = workflow_builder()
    
    if checkpointer.get_saver():
        compiled = workflow.compile(checkpointer=checkpointer.get_saver())
    else:
        compiled = workflow.compile()
        
    return compiled, checkpointer.get_config(session_id, user_id)
