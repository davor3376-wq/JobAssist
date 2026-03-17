from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import auth, resume, jobs, cover_letter, interview, settings as settings_routes, resume_data, motivationsschreiben, ai_assistant

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) # (This command generates the database tables based on your SQLAlchemy models)
    yield
    # Shutdown
    await engine.dispose() # (This command safely closes the active database connection pool)

app = FastAPI(
    title="Job Application Assistant API",
    version="0.1.0",
    lifespan=lifespan,
    redirect_slashes=True, # Allow both /api/route and /api/route/ to work
)

app.add_middleware(
    CORSMiddleware, # (This command attaches the CORS configuration to your application instance so the frontend can securely connect)
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router,            prefix="/api/auth",         tags=["Auth"]) # (This command registers the authentication endpoints to the main API)
app.include_router(settings_routes.router, prefix="/api/settings",     tags=["Settings"])
app.include_router(resume.router,          prefix="/api/resume",       tags=["Resume"])
app.include_router(resume_data.router,     prefix="/api/resume-data",  tags=["Resume Builder"])
app.include_router(jobs.router,            prefix="/api/jobs",         tags=["Jobs"])
app.include_router(cover_letter.router,    prefix="/api/cover-letter", tags=["Cover Letter"])
app.include_router(interview.router,       prefix="/api/interview",    tags=["Interview Prep"])
app.include_router(motivationsschreiben.router, prefix="/api/motivationsschreiben", tags=["Motivationsschreiben"])
app.include_router(ai_assistant.router,       prefix="/api/ai-assistant",        tags=["KI-Assistent"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}