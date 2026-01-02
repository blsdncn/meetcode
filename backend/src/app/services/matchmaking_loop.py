import asyncio
import os
import logging
from app.services.matchmaker import matchmaking_service
from app.dependencies import get_db

logger = logging.getLogger(__name__)

# Single-worker validation: Store PID on first run to detect multiple workers
_matchmaking_pid = None

def _validate_single_worker():
    """
    Warn if matchmaking loop is started in multiple processes.
    
    The in-memory matchmaking singleton requires exactly 1 Uvicorn worker.
    Multiple workers would create separate queues that never match users.
    """
    global _matchmaking_pid
    current_pid = os.getpid()
    
    if _matchmaking_pid is None:
        _matchmaking_pid = current_pid
        logger.info(f"Matchmaking loop initialized in process {current_pid}")
    elif _matchmaking_pid != current_pid:
        logger.critical(
            f"⚠️  CRITICAL: Matchmaking loop detected in multiple processes! "
            f"(PID {_matchmaking_pid} and {current_pid}). "
            f"Users will NOT match correctly. Run with --workers 1"
        )

async def matchmaking_loop():
    """Runs the matchmaking cycle every 2 seconds in the background."""
    _validate_single_worker()
    
    gen = get_db()
    db = next(gen)

    try:
        while True:
            await matchmaking_service.execute_matchmaking_cycle(db)
            await asyncio.sleep(2)
    finally:
        gen.close()
