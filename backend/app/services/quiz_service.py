import json
import re
from typing import Any, Dict, List

from app.services.openrouter_service import ChatMessage, get_openrouter_service


def strip_markdown_code_fences(text: str) -> str:
    """Remove optional markdown code fences around a JSON response."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json|javascript|txt)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def parse_quiz_response(raw_response: str, topic: str, difficulty: str, count: int) -> Dict[str, Any]:
    """Parse and validate quiz JSON returned by the LLM."""
    cleaned_response = strip_markdown_code_fences(raw_response)

    try:
        parsed = json.loads(cleaned_response)
    except json.JSONDecodeError as exc:
        raise ValueError(f"The LLM did not return valid JSON: {exc}") from exc

    if isinstance(parsed, dict) and isinstance(parsed.get("questions"), list):
        questions = parsed["questions"]
    elif isinstance(parsed, list):
        questions = parsed
    else:
        raise ValueError("The quiz response must be a JSON array or an object with a questions array")

    normalized_questions: List[Dict[str, Any]] = []
    for item in questions[:count]:
        if not isinstance(item, dict):
            continue

        question_text = str(item.get("question", "")).strip()
        options = item.get("options", [])
        correct_answer = item.get("correct_answer", "")
        explanation = str(item.get("explanation", "")).strip()

        if not question_text or not isinstance(options, list) or len(options) != 4:
            raise ValueError("Each quiz question must include a question and exactly four options")

        normalized_options = [str(option).strip() for option in options if str(option).strip()]
        if len(normalized_options) != 4:
            raise ValueError("Each quiz question must include exactly four non-empty options")

        if not str(correct_answer).strip() or not explanation:
            raise ValueError("Each quiz question must include a correct_answer and explanation")

        normalized_questions.append(
            {
                "question": question_text,
                "options": normalized_options,
                "correct_answer": str(correct_answer).strip(),
                "explanation": explanation,
            }
        )

    if not normalized_questions:
        raise ValueError("The quiz response did not include any valid questions")

    return {
        "topic": topic,
        "difficulty": difficulty,
        "questions": normalized_questions,
    }


class QuizService:
    """Service for generating educational quiz questions using OpenRouter."""

    def __init__(self):
        self.openrouter = get_openrouter_service()

    async def generate_quiz(self, topic: str, difficulty: str, count: int) -> Dict[str, Any]:
        if not self.openrouter.is_configured:
            raise RuntimeError("Quiz generation is unavailable because OPENROUTER_API_KEY is not configured. Set the backend environment variable to enable live quiz generation.")

        prompt = f"""You are an educational quiz generator for college students.

Generate a quiz about the topic: {topic}
Difficulty: {difficulty}
Number of questions: {count}

Return ONLY valid JSON. The top-level value must be an array of objects.
Each object must contain:
- question: string
- options: array of exactly four strings
- correct_answer: one of the option strings
- explanation: short explanation of why the answer is correct

Do not include markdown code fences or extra commentary."""

        response_text = ""
        async for chunk in self.openrouter.chat_completion(
            messages=[ChatMessage(role="user", content=prompt)],
            stream=False,
        ):
            response_text += chunk

        return parse_quiz_response(response_text, topic=topic, difficulty=difficulty, count=count)
