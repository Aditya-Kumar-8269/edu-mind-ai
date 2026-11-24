# AGENTS.md

## Project overview
- EduMind AI is a small full-stack app with a FastAPI backend and a static frontend built with plain HTML, CSS, and vanilla JavaScript.
- The main user experience is an AI tutor chat flow backed by OpenRouter.

## Working conventions
- Keep frontend and backend changes separated:
  - Backend logic belongs in [backend/app](backend/app)
  - Frontend UI and behavior belongs in [frontend](frontend)
- Prefer small, focused changes over broad rewrites.
- Preserve the current simple architecture; this project does not use a build step for the frontend.

## Common commands
- Windows startup:
  - Run [run.ps1](run.ps1) from the repository root.
- Backend setup:
  - Create and activate a virtual environment in [backend](backend).
  - Install dependencies with `pip install -r requirements.txt`.
  - Start the API with `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` from [backend](backend).
- Frontend preview:
  - Serve [frontend](frontend) with `python -m http.server 3000`.

## Architecture notes
- Backend entrypoint: [backend/app/main.py](backend/app/main.py)
  - Creates the FastAPI app, configures CORS, and includes the chat router.
- API routes: [backend/app/routes/chat.py](backend/app/routes/chat.py)
  - Exposes the chat streaming and clear-history endpoints.
- Business logic/services:
  - [backend/app/services/openrouter_service.py](backend/app/services/openrouter_service.py) handles OpenRouter requests.
  - [backend/app/services/tutor_service.py](backend/app/services/tutor_service.py) manages the tutor system prompt and conversation history.
- Frontend app logic: [frontend/js/app.js](frontend/js/app.js)
  - Handles navigation, chat UI, mock quiz/PDF flows, and API calls to the backend.

## Environment and configuration
- Backend configuration is loaded from environment variables.
- The required key is `OPENROUTER_API_KEY`.
- If adding new environment-dependent behavior, document it clearly and keep defaults safe.

## When making changes
- If you add a new backend feature, wire it through the router and service layers rather than embedding logic directly in the app entrypoint.
- If you update the frontend, keep the UI behavior consistent with the existing vanilla JavaScript structure and CSS conventions.
- When documentation is already present in [README.md](README.md), link to it instead of duplicating it here.
