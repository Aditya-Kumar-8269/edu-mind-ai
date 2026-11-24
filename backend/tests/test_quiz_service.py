import unittest

from app.services.quiz_service import parse_quiz_response


class QuizServiceTests(unittest.TestCase):
    def test_parse_quiz_response_removes_fences_and_validates(self):
        raw_response = """```json
[
  {
    \"question\": \"What is AI?\",
    \"options\": [\"A field of computer science\", \"A type of hardware\", \"A network protocol\", \"A database\"],
    \"correct_answer\": \"A field of computer science\",
    \"explanation\": \"AI studies systems that perform tasks normally requiring human intelligence.\"
  }
]
```"""

        parsed = parse_quiz_response(raw_response, topic="AI", difficulty="easy", count=1)

        self.assertEqual(parsed["topic"], "AI")
        self.assertEqual(parsed["difficulty"], "easy")
        self.assertEqual(len(parsed["questions"]), 1)
        self.assertEqual(parsed["questions"][0]["question"], "What is AI?")


if __name__ == "__main__":
    unittest.main()
