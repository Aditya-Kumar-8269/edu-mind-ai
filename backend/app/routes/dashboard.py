"""
Dashboard API Routes
Provides statistics, recent learning activity history, and progress milestones
"""

from fastapi import APIRouter
from app.services.stats_service import (
    get_dashboard_stats,
    get_recent_activities,
    get_dashboard_progress,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats():
    """Retrieve overall educational statistics from SQLite database."""
    return get_dashboard_stats()


@router.get("/activity")
async def dashboard_activity():
    """Retrieve recent learning activities from SQLite database."""
    return get_recent_activities(limit=6)


@router.get("/progress")
async def dashboard_progress():
    """Retrieve learning progress calculated from actual student usage."""
    return get_dashboard_progress()
