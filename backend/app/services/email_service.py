import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_job_alert_html(keywords: str, location: str, jobs: List[Dict[str, Any]]) -> str:
    rows = ""
    for job in jobs[:20]:
        title = job.get("title", "Ohne Titel")
        company = job.get("company", "Unbekannt")
        loc = job.get("location", location or "")
        url = job.get("full_url", "#")
        salary = job.get("salary_range", "")
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
        {count} neue Stellen für <strong>{keywords}</strong>{f' in {location}' if location else ''}
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


def send_job_alert_email(to_email: str, keywords: str, location: str, jobs: List[Dict[str, Any]]) -> bool:
    if not settings.SMTP_HOST or not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — skipping email send")
        return False

    if not jobs:
        logger.info(f"No jobs found for alert '{keywords}' — skipping email")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"JobAssist: {len(jobs)} neue Stellen für '{keywords}'"
        msg["From"] = settings.EMAILS_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = to_email

        html = _build_job_alert_html(keywords, location or "", jobs)
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())

        logger.info(f"Job alert email sent to {to_email} ({len(jobs)} jobs for '{keywords}')")
        return True
    except Exception as e:
        logger.error(f"Failed to send job alert email to {to_email}: {e}", exc_info=True)
        return False
