import re
from typing import Optional

import fitz

from app.services.openrouter_service import ChatMessage, get_openrouter_service


MAX_EXTRACTED_CHARS = 12000


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract readable text from a PDF file using PyMuPDF."""
    try:
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            text_parts = []
            for page in document:
                page_text = page.get_text("text").strip()
                if page_text:
                    text_parts.append(page_text)

        extracted_text = "\n\n".join(text_parts)
        return re.sub(r"\s+", " ", extracted_text).strip()
    except Exception:
        return ""


def strip_markdown_code_fences(text: str) -> str:
    """Remove optional markdown code fences around JSON or text output."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json|javascript|txt)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


class PDFAnalyzerService:
    """Service for analyzing PDF notes and generating educational summaries."""

    def __init__(self):
        self.openrouter = get_openrouter_service()

    async def analyze_pdf(self, file_bytes: bytes, filename: Optional[str] = None) -> str:
        if not self.openrouter.is_configured:
            return "PDF analysis is unavailable because OPENROUTER_API_KEY is not configured. Set the backend environment variable to enable live AI summaries."

        extracted_text = extract_text_from_pdf(file_bytes)

        if not extracted_text:
            return (
                "No readable text could be extracted from this PDF. "
                "The file may be image-only, scanned, or contain no selectable text. "
                "Try uploading a text-based PDF or a document with clearly selectable text."
            )

        limited_text = extracted_text[:MAX_EXTRACTED_CHARS]
        prompt = f"""You are an educational study assistant. Summarize the following lecture notes or PDF content for a college student.

Requirements:
- Start with a short Overview.
- List the Key concepts.
- Highlight Important points.
- Include Important definitions.
- End with Exam-focused takeaways.
- Keep the response concise, clear, and useful for studying.
- Use markdown headings and bullet points.

Source document:
{limited_text}
"""

        response_text = ""
        async for chunk in self.openrouter.chat_completion(
            messages=[ChatMessage(role="user", content=prompt)],
            stream=False,
        ):
            response_text += chunk

        cleaned_summary = strip_markdown_code_fences(response_text).strip()
        return cleaned_summary or "Unable to generate a summary from the provided PDF."
