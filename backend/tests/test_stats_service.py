import unittest
from app.services.stats_service import (
    init_db,
    get_dashboard_stats,
    increment_questions,
    increment_notes,
    record_quiz_result,
    record_activity,
    get_recent_activities,
    get_dashboard_progress,
)


class StatsServiceTests(unittest.TestCase):
    def setUp(self):
        init_db()

    def test_get_dashboard_stats_structure(self):
        stats = get_dashboard_stats()
        self.assertIn("questions", stats)
        self.assertIn("notes", stats)
        self.assertIn("quizzes", stats)
        self.assertIn("avg_score", stats)

    def test_increment_questions_updates_count_and_activity(self):
        before = get_dashboard_stats()["questions"]
        after = increment_questions(1, title="What is an OS?")["questions"]
        self.assertEqual(after, before + 1)
        activities = get_recent_activities(limit=5)
        self.assertGreaterEqual(len(activities), 1)
        self.assertIn("What is an OS?", activities[0]["title"])

    def test_increment_notes_updates_count_and_activity(self):
        before = get_dashboard_stats()["notes"]
        after = increment_notes(1, filename="lecture_notes.pdf")["notes"]
        self.assertEqual(after, before + 1)
        activities = get_recent_activities(limit=5)
        self.assertIn("lecture_notes.pdf", activities[0]["title"])

    def test_record_quiz_updates_score_and_activity(self):
        before = get_dashboard_stats()["quizzes"]
        updated = record_quiz_result(score=9, total=10, topic="Data Structures")
        self.assertEqual(updated["quizzes"], before + 1)
        self.assertGreaterEqual(updated["avg_score"], 0)
        activities = get_recent_activities(limit=5)
        self.assertIn("Data Structures", activities[0]["title"])

    def test_dashboard_progress_calculation(self):
        progress = get_dashboard_progress()
        self.assertIn("overall_progress", progress)
        self.assertIn("questions_progress", progress)
        self.assertIn("notes_progress", progress)
        self.assertIn("quizzes_progress", progress)
        self.assertGreaterEqual(progress["overall_progress"], 0)


if __name__ == "__main__":
    unittest.main()
