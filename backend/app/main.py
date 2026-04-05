import asyncio
from datetime import datetime, timedelta
import hmac
import logging
import time

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
from app.core.monitoring import configure_sentry
from app.core.startup_migrations import run_startup_migrations
from app.core.logging import configure_logging, elapsed_ms, new_request_id, reset_request_id, set_request_id
from app.core.provider_health import get_provider_health
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal, engine, Base, get_db
from app.core.security import get_current_user
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from app.api.routes import auth, resume, jobs, cover_letter, interview, settings as settings_routes, motivationsschreiben, ai_assistant, job_alerts, research, billing, contact

configure_logging(settings.LOG_LEVEL)
configure_sentry(settings.SENTRY_DSN, settings.SENTRY_TRACES_SAMPLE_RATE)
logger = logging.getLogger(__name__)


async def delete_stale_unverified_users():
    cutoff = datetime.utcnow() - timedelta(hours=24)
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(
                User.is_verified.is_(False),
                User.created_at < cutoff,
            )
        )
        stale_users = result.scalars().all()
        if not stale_users:
            return
        for user in stale_users:
            await session.delete(user)
        await session.commit()
        logger.info("Deleted stale unverified users", extra={"count": len(stale_users)})


async def stale_user_cleanup_loop():
    while True:
        try:
            await delete_stale_unverified_users()
        except Exception:
            traceback.print_exc()
        await asyncio.sleep(60 * 60)


# ── Job alert scheduler ───────────────────────────────────────────────────────
async def run_due_job_alerts():
    """Find alerts due for sending and dispatch them."""
    from app.models.job_alert import JobAlert
    from app.services.job_search import search_jobs
    from app.services.email_service import send_job_alert_email
    from sqlalchemy import select as _select

    from datetime import timezone as _tz
    now = datetime.now(_tz.utc)
    _BATCH = 100
    offset = 0

    while True:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                _select(JobAlert)
                .where(JobAlert.is_active.is_(True))
                .order_by(JobAlert.id)
                .limit(_BATCH)
                .offset(offset)
            )
            alerts = result.scalars().all()
        if not alerts:
            break
        offset += len(alerts)

        for alert in alerts:
            try:
                # Determine if this alert is due
                last = alert.last_sent_at
                if last and last.tzinfo is None:
                    last = last.replace(tzinfo=_tz.utc)

                if alert.frequency == "daily":
                    due = last is None or (now - last).total_seconds() >= 86_400
                elif alert.frequency == "weekly":
                    due = last is None or (now - last).total_seconds() >= 604_800
                else:
                    due = False

                if not due:
                    continue

                results = await search_jobs(
                    keywords=alert.keywords,
                    location=alert.location or "",
                    job_type=alert.job_type or "",
                    page=1,
                )
                jobs = results.get("jobs", [])
                if jobs:
                    from app.api.routes.job_alerts import _make_unsubscribe_token
                    token = _make_unsubscribe_token(alert.id)
                    app_url = getattr(settings, "FRONTEND_URL", "https://jobassist.tech")
                    unsubscribe_url = f"{app_url}/unsubscribe?token={token}"
                    await asyncio.to_thread(
                        send_job_alert_email,
                        to_email=alert.email,
                        keywords=alert.keywords,
                        location=alert.location or "",
                        jobs=jobs,
                        unsubscribe_url=unsubscribe_url,
                    )
                    # Update last_sent_at
                    async with AsyncSessionLocal() as session:
                        res = await session.execute(
                            _select(JobAlert).where(JobAlert.id == alert.id)
                        )
                        a = res.scalar_one_or_none()
                        if a:
                            a.last_sent_at = now
                            await session.commit()
                    logger.info("Job alert sent: id=%s job_count=%s", alert.id, len(jobs))
            except Exception:
                traceback.print_exc()


async def job_alert_scheduler_loop():
    """Check for due alerts every hour."""
    while True:
        try:
            await run_due_job_alerts()
        except Exception:
            traceback.print_exc()
        await asyncio.sleep(60 * 60)


# ── Daily usage-counter reset ─────────────────────────────────────────────────
async def reset_daily_alert_counts():
    """Set daily_manual_run_count and daily_creation_count to 0 for every user."""
    from sqlalchemy import update as _update
    now = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    async with AsyncSessionLocal() as session:
        await session.execute(
            _update(User).values(
                daily_manual_run_count=0,
                daily_creation_count=0,
                daily_counts_reset_at=now,
            )
        )
        await session.commit()
    logger.info("Daily alert usage counts reset for all users")


async def daily_count_reset_loop():
    """Sleep until the next 00:00 UTC, reset daily counts, then repeat."""
    while True:
        now = datetime.utcnow()
        next_midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        await asyncio.sleep((next_midnight - now).total_seconds())
        try:
            await reset_daily_alert_counts()
        except Exception:
            traceback.print_exc()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) # (This command generates the database tables based on your SQLAlchemy models)
        await run_startup_migrations(conn)
    cleanup_task = asyncio.create_task(stale_user_cleanup_loop())
    alert_task = asyncio.create_task(job_alert_scheduler_loop())
    reset_task = asyncio.create_task(daily_count_reset_loop())
    try:
        yield
    finally:
        for task in (cleanup_task, alert_task, reset_task):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
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
    logger.exception("Unhandled exception", extra={"path": str(request.url.path), "method": request.method})
    detail = str(exc) if settings.DEBUG else "Internal server error"
    return JSONResponse(
        status_code=500,
        content={"detail": detail, "request_id": getattr(request.state, "request_id", "-")},
        headers=headers,
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or new_request_id()
    request.state.request_id = request_id
    token = set_request_id(request_id)
    start_time = time.perf_counter()

    # Reject oversized request bodies (5 MB max, except file uploads handled by route)
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > 5 * 1024 * 1024:
        response = JSONResponse(status_code=413, content={"detail": "Request body too large", "request_id": request_id})
        response.headers["X-Request-ID"] = request_id
        reset_request_id(token)
        return response

    try:
        response: Response = await call_next(request)
    finally:
        duration_ms = elapsed_ms(start_time)
        logger.info(
            "HTTP request completed",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": getattr(locals().get("response"), "status_code", 500),
                "duration_ms": duration_ms,
            },
        )
        reset_request_id(token)

    response.headers["X-Request-ID"] = request_id
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
app.include_router(contact.router,           prefix="/api/contact",               tags=["Contact"])

@app.get("/health")
async def health_check(request: Request):
    return {
        "status": "ok",
        "version": "0.1.0",
        "request_id": getattr(request.state, "request_id", "-"),
    }


@app.post("/api/admin/reset-usage")
async def admin_reset_usage(request: Request, db: AsyncSession = Depends(get_db)):
    """Reset all usage_tracking counts to zero. Requires X-Admin-Secret header."""
    from fastapi import HTTPException as _HTTPException
    from app.models.usage import UsageRecord
    from sqlalchemy import delete as _delete

    secret = request.headers.get("x-admin-secret", "")
    if not settings.ADMIN_SECRET or not hmac.compare_digest(secret, settings.ADMIN_SECRET):
        raise _HTTPException(status_code=403, detail="Forbidden")
    await db.execute(_delete(UsageRecord))
    await db.commit()
    logger.info("Admin: usage_tracking table cleared")
    return {"status": "ok", "message": "All usage records deleted"}


@app.get("/health/dependencies")
async def health_dependencies(request: Request):
    database = {"ok": False}
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        database = {"ok": True}
    except Exception as exc:
        logger.warning("Database health check failed", extra={"error": str(exc)})
        database = {"ok": False, "error": str(exc) if settings.DEBUG else "unavailable"}

    providers = get_provider_health()
    providers_ok = (
        providers["groq"]["configured"]
        and providers["adzuna"]["configured"]
        and providers["email"]["active_provider"] is not None
        and providers["stripe"]["configured"]
    )

    return {
        "status": "ok" if database["ok"] else "degraded",
        "request_id": getattr(request.state, "request_id", "-"),
        "database": database,
        "providers": providers,
        "ready": database["ok"] and providers_ok,
    }


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
            "is_verified": current_user.is_verified,
            "currency": current_user.currency,
            "location": current_user.location,
            "language": current_user.language,
            "daily_manual_run_count": current_user.daily_manual_run_count or 0,
            "daily_creation_count": current_user.daily_creation_count or 0,
            "daily_counts_reset_at": current_user.daily_counts_reset_at,
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
