import logging
import html as html_lib
from typing import List, Dict, Any
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"


def _safe_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if parsed.scheme in ("http", "https"):
            return html_lib.escape(url)
    except Exception:
        pass
    return "#"


def _build_job_alert_html(keywords: str, location: str, jobs: List[Dict[str, Any]]) -> str:
    rows = ""
    for job in jobs[:20]:
        title = html_lib.escape(job.get("title", "Ohne Titel"))
        company = html_lib.escape(job.get("company", "Unbekannt"))
        loc = html_lib.escape(job.get("location", location or ""))
        url = _safe_url(job.get("full_url", "#"))
        salary = html_lib.escape(job.get("salary_range") or job.get("salary", ""))
        salary_html = f'<span style="color:#6b7280;font-size:13px;">{salary}</span>' if salary else ""
        rows += f"""
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #f3f4f6;">
            <a href="{url}" style="font-size:15px;font-weight:600;color:#2563eb;text-decoration:none;">{title}</a><br>
            <span style="color:#374151;font-size:13px;">{company}</span>
            {f' &bull; <span style="color:#6b7280;font-size:13px;">{loc}</span>' if loc else ''}
            {f'<br>{salary_html}' if salary_html else ''}
          </td>
        </tr>"""

    count = len(jobs)
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">JobAssist — Neue Stellenangebote</h1>
      <p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:14px;">
        {count} neue Stellen für <strong>{html_lib.escape(keywords)}</strong>{f' in {html_lib.escape(location)}' if location else ''}
      </p>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        {rows}
      </table>
      <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center;">
        Diese E-Mail wurde von JobAssist gesendet.<br>
        Du hast einen Job-Alert eingerichtet. Du kannst ihn jederzeit in deinen Einstellungen deaktivieren.
      </p>
    </div>
  </div>
</body>
</html>"""


def _send_transactional_email(to_email: str, subject: str, html_body: str) -> bool:
    """Generic helper to send a single transactional email via Brevo."""
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured — skipping email send")
        return False

    from_email = settings.EMAILS_FROM_EMAIL or "noreply@jobassist.app"
    from_name = settings.EMAILS_FROM_NAME or "JobAssist"

    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    try:
        api_key = settings.BREVO_API_KEY.strip()
        with httpx.Client(timeout=15) as client:
            response = client.post(
                BREVO_SEND_URL, json=payload,
                headers={"api-key": api_key, "Content-Type": "application/json"},
            )
            if not response.is_success:
                logger.error(f"Brevo response {response.status_code}: {response.text}")
            response.raise_for_status()
        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
        return False


def send_verification_email(to_email: str, token: str) -> bool:
    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">E-Mail-Adresse bestätigen</h1>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:15px;color:#374151;">Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen:</p>
      <a href="{html_lib.escape(verify_url)}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none;font-size:15px;">E-Mail bestätigen</a>
      <p style="font-size:13px;color:#9ca3af;margin-top:16px;">Dieser Link ist 24 Stunden gültig. Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.</p>
    </div>
  </div>
</body></html>"""
    return _send_transactional_email(to_email, "JobAssist — E-Mail bestätigen", html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:0;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#3b82f6,#7c3aed);padding:28px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Passwort zurücksetzen</h1>
    </div>
    <div style="padding:24px 32px;">
      <p style="font-size:15px;color:#374151;">Du hast eine Passwort-Zurücksetzung angefordert. Klicke auf den Button:</p>
      <a href="{html_lib.escape(reset_url)}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#3b82f6;color:#fff;font-weight:600;border-radius:8px;text-decoration:none;font-size:15px;">Passwort zurücksetzen</a>
      <p style="font-size:13px;color:#9ca3af;margin-top:16px;">Dieser Link ist 1 Stunde gültig. Falls du kein neues Passwort angefordert hast, ignoriere diese E-Mail.</p>
    </div>
  </div>
</body></html>"""
    return _send_transactional_email(to_email, "JobAssist — Passwort zurücksetzen", html)


def send_job_alert_email(to_email: str, keywords: str, location: str, jobs: List[Dict[str, Any]]) -> bool:
    if not settings.BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not configured — skipping email send")
        return False

    if not jobs:
        logger.info(f"No jobs found for alert '{keywords}' — skipping email")
        return False

    from_email = settings.EMAILS_FROM_EMAIL or "noreply@jobassist.app"
    from_name = settings.EMAILS_FROM_NAME or "JobAssist"

    html_body = _build_job_alert_html(keywords, location or "", jobs)

    payload = {
        "sender": {"name": from_name, "email": from_email},
        "to": [{"email": to_email}],
        "subject": f"JobAssist: {len(jobs)} neue Stellen für '{keywords.strip()}'",
        "htmlContent": html_body,
    }

    try:
        api_key = settings.BREVO_API_KEY.strip()
        logger.info(f"Brevo key prefix: {api_key[:12]}... length={len(api_key)}")
        with httpx.Client(timeout=15) as client:
            response = client.post(
                BREVO_SEND_URL,
                json=payload,
                headers={
                    "api-key": api_key,
                    "Content-Type": "application/json",
                },
            )
            if not response.is_success:
                logger.error(f"Brevo response {response.status_code}: {response.text}")
            response.raise_for_status()

        logger.info(f"Job alert email sent to {to_email} ({len(jobs)} jobs for '{keywords}')")
        return True
    except Exception as e:
        logger.error(f"Failed to send job alert email to {to_email}: {e}", exc_info=True)
        return False
