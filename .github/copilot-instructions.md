# GitHub Copilot Instructions for EduMind AI

## Project purpose
- EduMind AI is an AI-powered learning assistant for college and university students.
- The app combines a frontend study dashboard with a FastAPI backend and live AI tutoring features.

## Architecture and stack
- Frontend: HTML, CSS, and Vanilla JavaScript only. Do not migrate to React, Vue, Angular, Tailwind CSS, or Node.js.
- Backend: Python with FastAPI and Uvicorn.
- AI integration: OpenRouter API via backend services.
- Streaming: FastAPI StreamingResponse on the backend and Fetch API ReadableStream on the frontend.
- PDF processing: PyMuPDF for real PDF analysis features.
- Deployment target: Docker and AWS App Runner.

## Existing project status
- Phase 1 completed: project foundation, frontend shell, FastAPI backend, health endpoint, CORS, and environment variable setup.
- Phase 2 completed: dashboard, AI Tutor UI, PDF Analyzer UI, Quiz Generator UI, responsive layout, and light/dark theme.
- Phase 3 completed: OpenRouter integration, reusable backend service, streaming tutor responses, frontend progressive rendering, loading states, error handling, and clear chat.

## Important product constraints
- PDF Analyzer and Quiz Generator are currently mock features and should not be treated as fully implemented yet.
- Preserve the existing architecture and avoid broad rewrites.
- Preserve working AI Tutor streaming functionality.
- Keep changes MVP-focused and deadline-driven.
- Inspect existing code before editing.
- Test existing features after major changes.

## Security and implementation rules
- Never expose API keys or secrets in frontend JavaScript.
- Keep secrets in backend environment variables only.
- Do not add authentication, RAG, or vector databases.
- Do not hardcode the OpenRouter model; use environment configuration.
