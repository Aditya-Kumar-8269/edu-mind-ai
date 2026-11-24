"""
Chat Routes
API endpoints for AI Tutor chat functionality and AI study tools
"""

from typing import Optional
from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.pdf_analyzer_service import PDFAnalyzerService
from app.services.quiz_service import QuizService
from app.services.tutor_service import get_tutor_service
from app.services.stats_service import (
    get_dashboard_stats,
    increment_questions,
    increment_notes,
    record_quiz_result,
    get_recent_activities,
    get_dashboard_progress,
)


router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str


class QuizRequest(BaseModel):
    """Quiz generation request model"""
    topic: str
    difficulty: str
    number_of_questions: int


MAX_PDF_SIZE = 10 * 1024 * 1024


@router.post("/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat endpoint for AI Tutor

    Args:
        request: Chat request with user message

    Returns:
        Streaming response with AI-generated text
    """
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Record question asked and log activity in SQLite database
    increment_questions(1, title=request.message)

    tutor_service = get_tutor_service()

    async def generate():
        try:
            async for chunk in tutor_service.chat_stream(request.message):
                yield chunk
        except Exception as e:
            yield f"\n\n[Error: {str(e)}]"

    return StreamingResponse(
        generate(),
        media_type="text/plain; charset=utf-8",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/analyze-pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    """Upload a PDF and return an educational AI summary."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    if len(contents) > MAX_PDF_SIZE:
        raise HTTPException(status_code=413, detail="PDF file is too large. Please upload a smaller file")

    try:
        analyzer_service = PDFAnalyzerService()
        summary = await analyzer_service.analyze_pdf(contents, file.filename)
        # Record analyzed notes document and log activity in SQLite database
        increment_notes(1, filename=file.filename)
        return {"summary": summary}
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to analyze PDF: {str(exc)}") from exc


@router.post("/generate-quiz")
async def generate_quiz(request: QuizRequest):
    """Generate educational quiz questions using the OpenRouter service."""
    topic = request.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    if request.difficulty not in {"easy", "medium", "hard"}:
        raise HTTPException(status_code=400, detail="Difficulty must be easy, medium, or hard")

    if request.number_of_questions < 1 or request.number_of_questions > 15:
        raise HTTPException(status_code=400, detail="Number of questions must be between 1 and 15")

    try:
        quiz_service = QuizService()
        quiz_data = await quiz_service.generate_quiz(
            topic=topic,
            difficulty=request.difficulty,
            count=request.number_of_questions,
        )
        return quiz_data
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(exc)}") from exc


@router.post("/clear")
async def clear_chat():
    """
    Clear conversation history

    Returns:
        Success message
    """
    tutor_service = get_tutor_service()
    tutor_service.clear_conversation()
    return {"message": "Conversation cleared"}


class QuizRecordRequest(BaseModel):
    score: int
    total: int
    topic: Optional[str] = None


@router.post("/record-quiz")
async def record_quiz(request: QuizRecordRequest):
    """Save quiz completion score into SQLite database and return updated stats."""
    if request.total < 1:
        raise HTTPException(status_code=400, detail="Total questions must be at least 1")
    stats = record_quiz_result(score=request.score, total=request.total, topic=request.topic or "")
    return stats


@router.get("/stats")
async def get_stats():
    """Retrieve current dashboard metrics from SQLite database."""
    return get_dashboard_stats()


@router.get("/activity")
async def get_activity():
    """Retrieve recent learning activity records from SQLite database."""
    return get_recent_activities(limit=5)


@router.get("/progress")
async def get_progress():
    """Retrieve educational milestone progress calculated from actual data."""
    return get_dashboard_progress()
