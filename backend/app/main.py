from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import Response, JSONResponse
from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import traceback
import re

limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

from app.core.config import settings
from app.core.database import engine, Base, get_db
from app.core.security import get_current_user
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.api.routes import auth, resume, jobs, cover_letter, interview, settings as settings_routes, motivationsschreiben, ai_assistant, job_alerts, research, billing

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

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
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
    headers = {}
    origin_allowed = (
        origin in settings.allowed_origins_list
        or (bool(settings.ALLOWED_ORIGIN_REGEX) and bool(re.fullmatch(settings.ALLOWED_ORIGIN_REGEX, origin)))
    )
    if origin_allowed:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    traceback.print_exc()
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
        headers=headers,
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    # Reject oversized request bodies (5 MB max, except file uploads handled by route)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 5 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"detail": "Request body too large"})

    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cache-Control"] = "no-store"
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
app.include_router(billing.router,           prefix="/api/billing",               tags=["Billing"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/init")
async def init(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Single endpoint that returns all bootstrap data to reduce page-load round trips."""
    from sqlalchemy import select
    from app.models.user_profile import UserProfile
    from app.models.resume import Resume
    from app.core.usage import get_user_plan, get_all_usage

    profile_result = await db.execute(select(UserProfile).where(UserProfile.user_id == current_user.id))
    profile = profile_result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    resumes_result = await db.execute(
        select(Resume).where(Resume.user_id == current_user.id).order_by(Resume.created_at.desc())
    )
    resumes = resumes_result.scalars().all()

    plan = await get_user_plan(db, current_user.id)
    usage = await get_all_usage(db, current_user.id, plan)

    return {
        "me": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "currency": current_user.currency,
            "location": current_user.location,
            "language": current_user.language,
        },
        "profile": {
            "id": profile.id,
            "user_id": profile.user_id,
            "desired_locations": profile.desired_locations,
            "salary_min": profile.salary_min,
            "salary_max": profile.salary_max,
            "job_types": profile.job_types,
            "industries": profile.industries,
            "experience_level": profile.experience_level,
            "is_open_to_relocation": profile.is_open_to_relocation,
            "avatar": profile.avatar,
            "created_at": profile.created_at,
            "updated_at": profile.updated_at,
        },
        "resumes": [
            {"id": r.id, "filename": r.filename, "created_at": r.created_at}
            for r in resumes
        ],
        "plan": plan,
        "usage": usage,
    }