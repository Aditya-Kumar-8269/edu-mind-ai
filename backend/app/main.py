from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="EduMind AI API",
    description="AI Learning & Project Assistant Backend",
    version="0.1.0"
)

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        frontend_url,
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
from app.routes.chat import router as chat_router
from app.routes.dashboard import router as dashboard_router
from app.services.stats_service import get_dashboard_stats, get_recent_activities

app.include_router(chat_router)
app.include_router(dashboard_router)

# Frontend static serving
frontend_dir = Path(__file__).resolve().parent.parent.parent / "frontend"
if (frontend_dir / "css").exists():
    app.mount("/css", StaticFiles(directory=str(frontend_dir / "css")), name="css")
if (frontend_dir / "js").exists():
    app.mount("/js", StaticFiles(directory=str(frontend_dir / "js")), name="js")


class HealthResponse(BaseModel):
    status: str
    application: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify API status"""
    return {
        "status": "healthy",
        "application": "EduMind AI",
        "version": "0.1.0"
    }


@app.get("/stats")
async def stats_endpoint():
    """Return dashboard statistics from SQLite database"""
    return get_dashboard_stats()


@app.get("/")
async def root():
    """Serve the frontend index.html directly or API fallback"""
    index_file = frontend_dir / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "message": "EduMind AI API",
        "version": "0.1.0",
        "docs": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
