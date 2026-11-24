# EduMind AI - AI Learning & Project Assistant

A full-stack AI web application for college and university students, featuring AI tutoring, PDF note analysis, and quiz generation.

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Python FastAPI
- **LLM API**: OpenRouter
- **PDF Processing**: PyMuPDF
- **Streaming**: FastAPI StreamingResponse or Server-Sent Events
- **Containerization**: Docker
- **Deployment**: AWS App Runner

## Features

1. **AI Tutor** - Ask academic questions and receive clear educational explanations with streaming responses
2. **PDF Notes Analyzer** - Upload PDF notes and generate AI-powered summaries
3. **Quiz Generator** - Enter a topic to generate quizzes with multiple choice questions
4. **Modern Dashboard** - Responsive AI SaaS-style interface for desktop and mobile

## Project Structure

```
edumind-ai/
├── frontend/          # HTML5, CSS3, Vanilla JavaScript
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── backend/           # FastAPI Backend
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   └── services/
│   ├── requirements.txt
│   └── .env.example
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.10+
- OpenRouter API key
- A web browser (for viewing the frontend)

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

4. Install dependencies:
```bash
pip install -r requirements.txt
```

5. Create environment file:
```bash
copy .env.example .env
```

6. Edit `.env` and add your OpenRouter API key:
```
OPENROUTER_API_KEY=your_actual_api_key_here
```

### Frontend Setup

The frontend uses plain HTML, CSS, and JavaScript with no build process required. Simply open `frontend/index.html` in a web browser or serve it with a simple HTTP server.

## Running the Application

### Windows (One-Command Startup)

For Windows users, simply run the PowerShell script from the project root:

```powershell
.\run.ps1
```

This script will:
- Start the FastAPI backend on port 8000 using the existing `.venv` virtual environment
- Start the frontend HTTP server on port 3000 using Python
- Open `http://localhost:3000` in your default browser automatically
- Keep both servers running in separate PowerShell windows

**Note**: Ensure you have completed the backend setup (virtual environment creation and dependency installation) before running this script.

### Manual Startup

#### Start Backend

From the backend directory:
```bash
cd backend
.venv\Scripts\activate  # On Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

#### Start Frontend

Option 1: Open directly in browser
```bash
# Simply open frontend/index.html in your web browser
```

Option 2: Use Python's built-in HTTP server
```bash
cd frontend
python -m http.server 3000
```

The frontend will be available at `http://localhost:3000`

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Root endpoint with API info
- `GET /docs` - Interactive API documentation (Swagger UI)

## Development

The frontend communicates with the backend via HTTP requests to `http://localhost:8000`. No build process or proxy configuration is needed.

## Deployment

The application is designed to be deployed on AWS App Runner using Docker containers. Docker configuration will be added in future phases.

## License

MIT
