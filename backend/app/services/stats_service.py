"""
Database Service for Dashboard Statistics
Stores persistent metrics in SQLite
"""

import sqlite3
from pathlib import Path
from typing import Dict, Any

DB_PATH = Path(__file__).resolve().parent.parent.parent / "edumind.db"


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize SQLite database, stats table, and activities table."""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS stats (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                questions_asked INTEGER NOT NULL DEFAULT 0,
                notes_analyzed INTEGER NOT NULL DEFAULT 0,
                quizzes_taken INTEGER NOT NULL DEFAULT 0,
                total_score INTEGER NOT NULL DEFAULT 0,
                total_possible INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            INSERT OR IGNORE INTO stats (id, questions_asked, notes_analyzed, quizzes_taken, total_score, total_possible)
            VALUES (1, 0, 0, 0, 0, 0)
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_type TEXT NOT NULL,
                title TEXT NOT NULL,
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()


def record_activity(activity_type: str, title: str, details: str = "") -> None:
    """Record an educational activity in SQLite."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO activities (activity_type, title, details)
            VALUES (?, ?, ?)
            """,
            (activity_type, title, details)
        )
        conn.commit()


def get_recent_activities(limit: int = 5) -> list[Dict[str, Any]]:
    """Retrieve the most recent learning activities from SQLite."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT id, activity_type, title, details, created_at
            FROM activities
            ORDER BY id DESC
            LIMIT ?
            """,
            (limit,)
        )
        rows = cursor.fetchall()
        return [
            {
                "id": r["id"],
                "type": r["activity_type"],
                "title": r["title"],
                "details": r["details"],
                "time": r["created_at"]
            }
            for r in rows
        ]


def get_dashboard_stats() -> Dict[str, Any]:
    """Retrieve current dashboard statistics from SQLite."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM stats WHERE id = 1")
        row = cursor.fetchone()
        if not row:
            return {"questions": 0, "notes": 0, "quizzes": 0, "avg_score": 0}

        questions = row["questions_asked"]
        notes = row["notes_analyzed"]
        quizzes = row["quizzes_taken"]
        total_score = row["total_score"]
        total_possible = row["total_possible"]

        avg_score = round((total_score / total_possible) * 100) if total_possible > 0 else 0

        return {
            "questions": questions,
            "notes": notes,
            "quizzes": quizzes,
            "avg_score": avg_score
        }


def get_dashboard_progress() -> Dict[str, Any]:
    """Calculate educational milestone progress from actual data."""
    stats = get_dashboard_stats()
    # Baseline learning goals: 20 questions, 5 notes, 5 quizzes
    q_pct = min(100, round((stats["questions"] / 20) * 100)) if stats["questions"] > 0 else 0
    n_pct = min(100, round((stats["notes"] / 5) * 100)) if stats["notes"] > 0 else 0
    z_pct = min(100, round((stats["quizzes"] / 5) * 100)) if stats["quizzes"] > 0 else 0
    overall = round((q_pct + n_pct + z_pct) / 3)
    return {
        "overall_progress": overall,
        "questions_progress": q_pct,
        "notes_progress": n_pct,
        "quizzes_progress": z_pct,
        "avg_score": stats["avg_score"]
    }


def increment_questions(amount: int = 1, title: str = "") -> Dict[str, Any]:
    """Increment the count of questions asked and optionally log activity."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE stats
            SET questions_asked = questions_asked + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (amount,)
        )
        conn.commit()
    if title:
        clean_title = title.strip()[:70]
        record_activity("question", f"Asked: \"{clean_title}\"", "AI Tutor Q&A")
    return get_dashboard_stats()


def increment_notes(amount: int = 1, filename: str = "") -> Dict[str, Any]:
    """Increment the count of notes analyzed and optionally log activity."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE stats
            SET notes_analyzed = notes_analyzed + ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (amount,)
        )
        conn.commit()
    if filename:
        record_activity("note", f"Analyzed: {filename}", "PDF Notes Document")
    return get_dashboard_stats()


def record_quiz_result(score: int, total: int, topic: str = "") -> Dict[str, Any]:
    """Record a completed quiz score and log activity in the database."""
    init_db()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE stats
            SET quizzes_taken = quizzes_taken + 1,
                total_score = total_score + ?,
                total_possible = total_possible + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (score, total)
        )
        conn.commit()
    pct = round((score / total) * 100) if total > 0 else 0
    activity_title = f"Quiz: {topic.strip()}" if topic else "Completed Practice Quiz"
    record_activity("quiz", activity_title, f"Score: {score}/{total} ({pct}%)")
    return get_dashboard_stats()
