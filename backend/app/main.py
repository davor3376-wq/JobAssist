from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager
import traceback

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import auth, resume, jobs, cover_letter, interview, settings as settings_routes, motivationsschreiben, ai_assistant, job_alerts, research

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
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

app.add_middleware(
    CORSMiddleware, # (This command attaches the CORS configuration to your application instance so the frontend can securely connect)
    allow_origins=settings.allowed_origins_list,
    allow_origin_regex=settings.ALLOWED_ORIGIN_REGEX or None,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    allowed = settings.allowed_origins_list
    headers = {}
    if origin in allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers=headers,
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# Routers
app.include_router(auth.router,            prefix="/api/auth",         tags=["Auth"]) # (This command registers the authentication endpoints to the main API)
app.include_router(settings_routes.router, prefix="/api/settings",     tags=["Settings"])
app.include_router(resume.router,          prefix="/api/resume",       tags=["Resume"])
app.include_router(jobs.router,            prefix="/api/jobs",         tags=["Jobs"])
app.include_router(cover_letter.router,    prefix="/api/cover-letter", tags=["Cover Letter"])
app.include_router(interview.router,       prefix="/api/interview",    tags=["Interview Prep"])
app.include_router(motivationsschreiben.router, prefix="/api/motivationsschreiben", tags=["Motivationsschreiben"])
app.include_router(ai_assistant.router,       prefix="/api/ai-assistant",        tags=["KI-Assistent"])
app.include_router(job_alerts.router,         prefix="/api/job-alerts",           tags=["Job Alerts"])
app.include_router(research.router,           prefix="/api/research",              tags=["Research"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}