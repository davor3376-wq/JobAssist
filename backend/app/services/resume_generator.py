"""
Resume generator — renders resume data into HTML using premium Tailwind templates.
Uses safe string substitution (_safe_render) so user data with { } never breaks rendering.
"""

import html as _html
import re
from typing import Optional

TRANSLATIONS = {
    "de": {
        "professional_summary": "Profil",
        "work_experience":      "Berufserfahrung",
        "education":            "Bildungsweg",
        "skills":               "Kenntnisse",
        "certifications":       "Zertifizierungen",
        "present":              "Heute",
        "personal_details":     "Persönliche Daten",
        "praktikum":            "Praktika",
        "languages":            "Sprachkenntnisse",
        "interests":            "Interessen",
    },
}


def translate(key: str, language: str = "de") -> str:
    return TRANSLATIONS.get(language, TRANSLATIONS["de"]).get(key, key)


def _e(text) -> str:
    if text is None:
        return ""
    return _html.escape(str(text))


def _safe_render(template: str, **kwargs) -> str:
    LBRACE = "\x00LCURLY\x00"
    RBRACE = "\x00RCURLY\x00"
    result = template.replace("{{", LBRACE).replace("}}", RBRACE)
    for key, value in kwargs.items():
        result = result.replace("{" + key + "}", value)
    return result.replace(LBRACE, "{").replace(RBRACE, "}")


def _date_range(job: dict, language: str) -> str:
    start = job.get("startDate", "")
    end = job.get("endDate")
    is_current = job.get("isCurrentPosition", False)
    if is_current or not end:
        return f"{start} – {translate('present', language)}"
    return f"{start} – {end}"


# ── Data cleaning helpers ──────────────────────────────────────────────────────

def clean_summary(text: str) -> str:
    """Strip embedded skills/competencies sections from summary text."""
    if not text:
        return text
    _MARKERS = [
        r'Key Expertise', r'Core Competencies', r'Areas of Expertise',
        r'Technical Skills', r'Key Skills', r'Professional Skills',
        r'Competencies\s*:', r'Expertise\s*:', r'Skills\s*:', r'Strengths\s*:',
    ]
    for marker in _MARKERS:
        m = re.search(marker, text, re.IGNORECASE)
        if m and m.start() > 20:
            text = text[:m.start()].strip()
            break
    m2 = re.search(r'\.\s*(?=[A-Z][a-z]{2,20}\s*:)', text)
    if m2 and m2.start() > 60:
        text = text[:m2.start() + 1].strip()
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', text.strip())
    if len(sentences) > 4:
        text = ' '.join(sentences[:4])
    return text.strip().rstrip('.,')


def clean_skill_item(text: str) -> str:
    """Clean a single skill string into a concise label."""
    text = re.sub(r'\s*\([^)]*\)', '', text)
    text = re.sub(r'\s*\)', '', text)
    if ':' in text:
        text = text.split(':')[0]
    text = re.sub(r'\.{2,}.*', '', text)
    text = text.strip().strip('.,;-\u2013\u2022\u25b8\u25c6\u203a')
    text = re.sub(r'([a-z])([A-Z][a-z]{3,})', lambda m: m.group(2), text)
    return text.strip()


def clean_skills_list(items: list) -> list:
    """Parse skills that may be stored as verbose concatenated paragraphs."""
    result = []
    seen = set()
    _noise = {
        'core competencies', 'software', 'tools', 'leadership',
        'management', 'key expertise', 'technical skills',
    }

    def _add(text: str) -> None:
        text = text.strip()
        if not text or not text[0].isalpha():
            return
        if not (2 <= len(text) <= 40):
            return
        lower = text.lower()
        if lower in _noise or lower in seen:
            return
        seen.add(lower)
        result.append(text)

    for raw in items:
        raw = str(raw).strip()
        if not raw:
            continue
        if len(raw) > 60 and re.search(r'[A-Z][^:]{2,35}:\s', raw):
            cleaned_raw = re.sub(r'\s*\([^)]*\)', '', raw)
            segments = re.split(r'\.\s*(?=[A-Z])', cleaned_raw)
            for seg in segments:
                parts = re.split(r'(?<=[a-z&])(?=[A-Z][a-z]{2,})', seg)
                for part in parts:
                    _add(clean_skill_item(part))
        else:
            _add(clean_skill_item(raw))
    return result


def highlight_metrics(text: str) -> str:
    """Wrap dollar amounts, percentages, and large numbers in <strong>."""
    text = re.sub(r'(\$[\d,.]+\s*[MBKTmbtk]?\+?)', r'<strong>\1</strong>', text)
    text = re.sub(r'(\b\d+\.?\d*%)', r'<strong>\1</strong>', text)
    text = re.sub(r'(\b[\d,]{3,}\+)', r'<strong>\1</strong>', text)
    return text


def split_description(text: str) -> list:
    """Split a job description blob into individual bullet point strings."""
    if not text:
        return []
    text = text.strip()
    if '\n' in text:
        lines = [l.strip().lstrip('\u2022\u25b8\u25c6\u203a-\u2013*').strip() for l in text.split('\n')]
        lines = [l.rstrip('.') for l in lines if len(l.strip()) > 5]
        if len(lines) > 1:
            return lines
    if re.search(r'[\u2022\u25b8\u25c6\u203a]', text):
        parts = re.split(r'\s*[\u2022\u25b8\u25c6\u203a]\s*', text)
        parts = [p.strip().rstrip('.') for p in parts if len(p.strip()) > 5]
        if len(parts) > 1:
            return parts
    parts = re.split(r'(?<=[a-z])\.\s+(?=[A-Z])', text)
    parts = [p.strip().rstrip('.') for p in parts if len(p.strip()) > 5]
    if len(parts) > 1:
        return parts
    return [text.rstrip('.')]


# ── SVG icon constants ─────────────────────────────────────────────────────────

_SVG_CHECK_SMALL = (
    '<svg class="w-3 h-3 text-rose-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">'
    '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414'
    'L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>'
)
_SVG_V5_EMAIL = (
    '<svg class="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
    'd="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>'
)
_SVG_V5_PHONE = (
    '<svg class="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
    'd="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13'
    'a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19'
    'a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>'
)
_SVG_V5_LOC = (
    '<svg class="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">'
    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" '
    'd="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>'
)


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 1 — Modern Split (dark sidebar · sky blue)
# ═══════════════════════════════════════════════════════════════════════════════

def _t1_contact(data: dict) -> str:
    items = []
    if data.get("email"):
        items.append(f'<p class="text-[11px] text-slate-300 mb-2 break-all">{_e(data["email"])}</p>')
    if data.get("phone"):
        items.append(f'<p class="text-[11px] text-slate-300 mb-2">{_e(data["phone"])}</p>')
    if data.get("location"):
        items.append(f'<p class="text-[11px] text-slate-300 mb-2">{_e(data["location"])}</p>')
    if data.get("linkedin"):
        items.append(f'<p class="text-[11px] text-slate-300 mb-2 break-all">{_e(data["linkedin"])}</p>')
    return "".join(items)


def _t1_personal_data(data: dict, language: str) -> str:
    """Renders 'Persönliche Daten' sidebar block for Austrian Lebenslauf (T1)."""
    items = []
    p = lambda v: f'<p class="text-[11px] text-slate-300 mb-2">{_e(v)}</p>'
    # Address lines
    addr_lines = data.get("addressLines") or []
    if addr_lines:
        for line in addr_lines:
            if line and line.strip():
                items.append(p(line))
    elif data.get("location"):
        items.append(p(data["location"]))
    if data.get("birthInfo"):
        items.append(p(data["birthInfo"]))
    if data.get("nationality"):
        items.append(p(data["nationality"]))
    if data.get("staatsbuergerschaft"):
        items.append(p(f'Staatsbürgerschaft: {data["staatsbuergerschaft"]}'))
    if data.get("familienstand"):
        items.append(p(f'Familienstand: {data["familienstand"]}'))
    if data.get("fuehrerschein"):
        items.append(p(f'Führerschein: {data["fuehrerschein"]}'))
    if data.get("religion"):
        items.append(p(f'Religion: {data["religion"]}'))
    if not items:
        return ""
    label = translate("personal_details", language)
    return (
        f'<div class="border-t border-slate-700 mb-6" style="width:100%; box-sizing:border-box;"></div>'
        f'<div class="mb-7">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-sky-400 mb-3.5">{label}</h2>'
        + "".join(items) +
        f'</div>'
    )


def _t1_skills(data: dict) -> str:
    raw = data.get("skills", [])
    skills = clean_skills_list(raw) if raw else []
    if not skills:
        return ""
    items = "".join(
        f'<span class="inline-block bg-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1.5">{_e(s)}</span>'
        for s in skills
    )
    return items


def _t1_certs(data: dict) -> str:
    certs = data.get("certifications", [])
    if not certs:
        return '<p class="text-slate-400 text-[11px]">—</p>'
    items = []
    for c in certs:
        name = _e(c.get("name", ""))
        issuer = _e(c.get("issuer", ""))
        year = _e(c.get("year", ""))
        items.append(
            f'<div class="mb-2">'
            f'<p class="text-[11px] font-semibold text-slate-200">{name}</p>'
            f'<p class="text-[10px] text-slate-400">{issuer}{" · " + year if year else ""}</p>'
            f'</div>'
        )
    return "".join(items)


def _t1_summary(data: dict, language: str) -> str:
    summary = clean_summary(data.get("professionalSummary", ""))
    if not summary:
        return ""
    label = translate("professional_summary", language)
    return (
        f'<section class="mb-10">'
        f'<h2 class="text-[11px] font-bold tracking-[0.2em] uppercase text-sky-500 mb-4 pb-2 border-b border-slate-100">{label}</h2>'
        f'<p class="text-[13px] text-slate-600 leading-loose">{_e(summary)}</p>'
        f'</section>'
    )


def _t1_experience(data: dict, language: str) -> str:
    jobs = data.get("workExperience", [])
    if not jobs:
        return ""
    label = translate("work_experience", language)
    html = (
        f'<section class="mb-10">'
        f'<h2 class="text-[11px] font-bold tracking-[0.2em] uppercase text-sky-500 mb-5 pb-2 border-b border-slate-100">{label}</h2>'
        f'<div class="space-y-7">'
    )
    for i, job in enumerate(jobs):
        title = _e(job.get("jobTitle", ""))
        company = _e(job.get("companyName", ""))
        date_str = _date_range(job, language)
        desc = job.get("description", "")
        bullets = split_description(desc)
        bullet_html = "".join(
            f'<li class="text-[12.5px] text-slate-600 leading-loose">{highlight_metrics(_e(b))}</li>'
            for b in bullets
        )
        divider = '<div class="border-t border-slate-100 my-3"></div>' if i > 0 else ""
        html += (
            f'{divider}'
            f'<div class="job-entry">'
            f'<div class="flex items-baseline justify-between mb-1">'
            f'<h3 class="text-[14px] font-semibold text-slate-800">{title}</h3>'
            f'<span class="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{_e(date_str)}</span>'
            f'</div>'
            f'<p class="text-[11px] font-semibold text-sky-600 mb-3">{company}</p>'
            f'<ul class="list-disc list-inside space-y-2">{bullet_html}</ul>'
            f'</div>'
        )
    html += '</div></section>'
    return html


def _t1_education(data: dict, language: str) -> str:
    edu = data.get("education", [])
    if not edu:
        return ""
    label = translate("education", language)
    html = (
        f'<section>'
        f'<h2 class="text-[11px] font-bold tracking-[0.2em] uppercase text-sky-500 mb-5 pb-2 border-b border-slate-100">{label}</h2>'
        f'<div class="space-y-5">'
    )
    for e in edu:
        degree = _e(e.get("degree", ""))
        school = _e(e.get("institution", ""))
        year = _e(e.get("graduationYear", ""))
        html += (
            f'<div class="edu-entry">'
            f'<h3 class="text-[13px] font-semibold text-slate-800">{degree}</h3>'
            f'<p class="text-[11px] font-semibold text-sky-600 mt-0.5">{school}</p>'
            f'<p class="text-[10px] text-slate-400 mt-0.5">{year}</p>'
            f'</div>'
        )
    html += '</div></section>'
    return html


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 2 — Executive Header (indigo banner · two-column)
# ═══════════════════════════════════════════════════════════════════════════════

def _t2_contact(data: dict) -> str:
    items = []
    for field, label in [("email", ""), ("phone", ""), ("location", ""), ("linkedin", "")]:
        val = data.get(field)
        if val:
            items.append(
                f'<div class="flex items-center gap-2 mb-2">'
                f'<span class="text-[11px] text-slate-600 break-all">{_e(val)}</span>'
                f'</div>'
            )
    return "".join(items)


def _t2_personal_data(data: dict, language: str) -> str:
    """Renders 'Persönliche Daten' sidebar block for Austrian Lebenslauf (T2)."""
    items = []
    row = lambda v: (
        f'<div class="flex items-center gap-2 mb-2">'
        f'<span class="text-[11px] text-slate-600 break-all">{_e(v)}</span>'
        f'</div>'
    )
    addr_lines = data.get("addressLines") or []
    if addr_lines:
        for line in addr_lines:
            if line and line.strip():
                items.append(row(line))
    elif data.get("location"):
        items.append(row(data["location"]))
    if data.get("birthInfo"):
        items.append(row(data["birthInfo"]))
    if data.get("nationality"):
        items.append(row(data["nationality"]))
    if data.get("staatsbuergerschaft"):
        items.append(row(f'Staatsbürgerschaft: {data["staatsbuergerschaft"]}'))
    if data.get("familienstand"):
        items.append(row(f'Familienstand: {data["familienstand"]}'))
    if data.get("fuehrerschein"):
        items.append(row(f'Führerschein: {data["fuehrerschein"]}'))
    if data.get("religion"):
        items.append(row(f'Religion: {data["religion"]}'))
    if not items:
        return ""
    label = translate("personal_details", language)
    return (
        f'<div class="mb-6">'
        f'<h2 class="text-[9px] font-bold tracking-[0.22em] uppercase text-indigo-600 mb-3 pb-1.5 border-b border-indigo-100">{label}</h2>'
        + "".join(items) +
        f'</div>'
    )


def _t2_skills(data: dict, language: str) -> str:
    raw = data.get("skills", [])
    skills = clean_skills_list(raw) if raw else []
    if not skills:
        return ""
    label = translate("skills", language)
    items = "".join(
        f'<span class="inline-block bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1.5">{_e(s)}</span>'
        for s in skills
    )
    return (
        f'<div class="mb-6">'
        f'<h2 class="text-[9px] font-bold tracking-[0.22em] uppercase text-indigo-600 mb-3 pb-1.5 border-b border-indigo-100">{label}</h2>'
        f'<div>{items}</div>'
        f'</div>'
    )


def _t2_certs(data: dict, language: str) -> str:
    certs = data.get("certifications", [])
    if not certs:
        return ""
    label = translate("certifications", language)
    html = (
        f'<div>'
        f'<h2 class="text-[9px] font-bold tracking-[0.22em] uppercase text-indigo-600 mb-3 pb-1.5 border-b border-indigo-100">{label}</h2>'
        f'<div class="space-y-2">'
    )
    for c in certs:
        name = _e(c.get("name", ""))
        issuer = _e(c.get("issuer", ""))
        year = _e(c.get("year", ""))
        html += (
            f'<div>'
            f'<p class="text-[11px] font-semibold text-slate-700">{name}</p>'
            f'<p class="text-[10px] text-slate-400">{issuer}{" · " + year if year else ""}</p>'
            f'</div>'
        )
    html += '</div></div>'
    return html


def _t2_summary(data: dict, language: str) -> str:
    summary = clean_summary(data.get("professionalSummary", ""))
    if not summary:
        return ""
    label = translate("professional_summary", language)
    return (
        f'<section class="mb-9">'
        f'<h2 class="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-700 mb-4 pb-1.5 border-b border-indigo-100">{label}</h2>'
        f'<p class="text-[13px] text-slate-600 leading-loose">{_e(summary)}</p>'
        f'</section>'
    )


def _t2_experience(data: dict, language: str) -> str:
    jobs = data.get("workExperience", [])
    if not jobs:
        return ""
    label = translate("work_experience", language)
    html = (
        f'<section class="mb-9">'
        f'<h2 class="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-700 mb-5 pb-1.5 border-b border-indigo-100">{label}</h2>'
        f'<div class="space-y-7">'
    )
    for i, job in enumerate(jobs):
        title = _e(job.get("jobTitle", ""))
        company = _e(job.get("companyName", ""))
        date_str = _date_range(job, language)
        bullets = split_description(job.get("description", ""))
        bullet_html = "".join(
            f'<li class="text-[12.5px] text-slate-600 leading-loose">{highlight_metrics(_e(b))}</li>'
            for b in bullets
        )
        divider = '<div class="border-t border-slate-100 my-3"></div>' if i > 0 else ""
        html += (
            f'{divider}<div class="job-entry">'
            f'<div class="flex items-baseline justify-between mb-1">'
            f'<h3 class="text-[14px] font-semibold text-slate-800">{title}</h3>'
            f'<span class="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{_e(date_str)}</span>'
            f'</div>'
            f'<p class="text-[11px] font-semibold text-indigo-600 mb-3">{company}</p>'
            f'<ul class="list-disc list-inside space-y-2">{bullet_html}</ul>'
            f'</div>'
        )
    html += '</div></section>'
    return html


def _t2_education(data: dict, language: str) -> str:
    edu = data.get("education", [])
    if not edu:
        return ""
    label = translate("education", language)
    html = (
        f'<section>'
        f'<h2 class="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-700 mb-4 pb-1.5 border-b border-indigo-100">{label}</h2>'
        f'<div class="space-y-5">'
    )
    for e in edu:
        degree = _e(e.get("degree", ""))
        school = _e(e.get("institution", ""))
        year = _e(e.get("graduationYear", ""))
        html += (
            f'<div class="edu-entry">'
            f'<h3 class="text-[13px] font-semibold text-slate-800">{degree}</h3>'
            f'<p class="text-[11px] font-semibold text-indigo-600 mt-0.5">{school}</p>'
            f'<p class="text-[10px] text-slate-400 mt-0.5">{year}</p>'
            f'</div>'
        )
    html += '</div></section>'
    return html


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 3 — Minimalist Grid (alternating bands · emerald)
# ═══════════════════════════════════════════════════════════════════════════════

def _t3_summary_band(data: dict, language: str) -> str:
    summary = clean_summary(data.get("professionalSummary", ""))
    if not summary:
        return ""
    label = translate("professional_summary", language)
    return (
        f'<section class="py-9 border-b border-gray-100">'
        f'<div class="flex gap-10">'
        f'<div class="w-32 flex-shrink-0"><h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-400">{label}</h2></div>'
        f'<div class="flex-1"><p class="text-gray-700 text-[13.5px] leading-loose font-light">{_e(summary)}</p></div>'
        f'</div></section>'
    )


def _t3_skills_band(data: dict, language: str) -> str:
    raw = data.get("skills", [])
    skills = clean_skills_list(raw) if raw else []
    if not skills:
        return ""
    label = translate("skills", language)
    # Group into 3 columns of up to 5
    cols = [skills[i:i+5] for i in range(0, min(len(skills), 15), 5)]
    while len(cols) < 3:
        cols.append([])
    col_labels = ["Core", "Domain", "Tools"]
    col_color = "text-emerald-600"
    grid_html = ""
    for idx, col in enumerate(cols[:3]):
        if not col:
            continue
        col_label = col_labels[idx] if idx < len(col_labels) else ""
        items_html = "".join(f'<p class="text-xs text-gray-700">{_e(s)}</p>' for s in col)
        grid_html += (
            f'<div>'
            f'<p class="text-[9px] font-bold tracking-widest uppercase {col_color} mb-2">{col_label}</p>'
            f'<div class="space-y-1">{items_html}</div>'
            f'</div>'
        )
    return (
        f'<section class="py-7 -mx-14 px-14 border-b border-gray-100 bg-gray-50">'
        f'<div class="flex gap-10">'
        f'<div class="w-32 flex-shrink-0 pt-0.5"><h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-400">{label}</h2></div>'
        f'<div class="flex-1"><div class="t3-skills-grid grid grid-cols-3 gap-x-8 gap-y-1">{grid_html}</div></div>'
        f'</div></section>'
    )


def _t3_experience_band(data: dict, language: str) -> str:
    jobs = data.get("workExperience", [])
    if not jobs:
        return ""
    label = translate("work_experience", language)
    jobs_html = ""
    for i, job in enumerate(jobs):
        title = _e(job.get("jobTitle", ""))
        company = _e(job.get("companyName", ""))
        date_str = _date_range(job, language)
        bullets = split_description(job.get("description", ""))
        bullet_html = "".join(
            f'<p class="text-[12.5px] text-gray-600 leading-loose flex items-start gap-2.5">'
            f'<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0"></span>'
            f'{highlight_metrics(_e(b))}</p>'
            for b in bullets
        )
        divider = '<div class="border-t border-gray-100 my-2"></div>' if i > 0 else ""
        jobs_html += (
            f'{divider}<div class="job-entry">'
            f'<div class="flex items-baseline justify-between mb-1">'
            f'<h3 class="text-[14px] font-semibold text-gray-900">{title}</h3>'
            f'<span class="text-xs text-gray-400 font-medium">{_e(date_str)}</span>'
            f'</div>'
            f'<p class="text-xs font-semibold text-emerald-700 mb-3 tracking-wide">{company}</p>'
            f'<div class="space-y-2.5">{bullet_html}</div>'
            f'</div>'
        )
    return (
        f'<section class="py-9 border-b border-gray-100">'
        f'<div class="flex gap-10">'
        f'<div class="w-32 flex-shrink-0 pt-0.5"><h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-400">{label}</h2></div>'
        f'<div class="flex-1 space-y-7">{jobs_html}</div>'
        f'</div></section>'
    )


def _t3_edu_certs_band(data: dict, language: str) -> str:
    edu = data.get("education", [])
    certs = data.get("certifications", [])
    edu_label = translate("education", language)
    certs_label = translate("certifications", language)
    edu_html = ""
    for e in edu:
        degree = _e(e.get("degree", ""))
        school = _e(e.get("institution", ""))
        year = _e(e.get("graduationYear", ""))
        edu_html += (
            f'<div class="edu-entry">'
            f'<h3 class="text-[13px] font-semibold text-gray-900">{degree}</h3>'
            f'<p class="text-xs text-emerald-700 font-semibold mt-0.5">{school}</p>'
            f'<p class="text-xs text-gray-400 mt-0.5">{year}</p>'
            f'</div>'
        )
    certs_html = ""
    for c in certs:
        abbr = _e(c.get("abbreviation", c.get("name", "")[:3].upper()))
        name = _e(c.get("name", ""))
        issuer = _e(c.get("issuer", ""))
        year = _e(c.get("year", ""))
        certs_html += (
            f'<div class="flex items-start gap-3">'
            f'<div class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-[9px] flex-shrink-0">{abbr}</div>'
            f'<div>'
            f'<p class="text-xs font-semibold text-gray-900">{name}</p>'
            f'<p class="text-[11px] text-gray-400">{issuer}{" · " + year if year else ""}</p>'
            f'</div></div>'
        )
    right_html = certs_html if certs_html else '<p class="text-xs text-gray-400">—</p>'
    return (
        f'<section class="py-7 -mx-14 px-14 bg-gray-50">'
        f'<div class="flex gap-10">'
        f'<div class="w-32 flex-shrink-0 pt-0.5">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-gray-400">{edu_label} &amp;<br/>{certs_label}</h2>'
        f'</div>'
        f'<div class="flex-1 grid grid-cols-2 gap-6">'
        f'<div class="space-y-4">{edu_html}</div>'
        f'<div class="space-y-3">{right_html}</div>'
        f'</div></div></section>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 4 — Accent Column (rose bar · SVG icon contact)
# ═══════════════════════════════════════════════════════════════════════════════

def _t4_contact(data: dict) -> str:
    items = []
    for field in ["email", "phone", "location", "linkedin"]:
        val = data.get(field)
        if val:
            items.append(f'<p class="text-[11px] text-gray-500 mb-1 break-all">{_e(val)}</p>')
    return "".join(items)


def _t4_summary(data: dict, language: str) -> str:
    summary = clean_summary(data.get("professionalSummary", ""))
    if not summary:
        return ""
    label = translate("professional_summary", language)
    return (
        f'<section class="mb-2">'
        f'<h2 class="text-[10px] font-bold tracking-[0.2em] uppercase text-rose-600 mb-4 pb-1.5 border-b border-rose-100">{label}</h2>'
        f'<p class="text-[13px] text-gray-600 leading-loose">{_e(summary)}</p>'
        f'</section>'
    )


def _t4_experience(data: dict, language: str) -> str:
    jobs = data.get("workExperience", [])
    if not jobs:
        return ""
    label = translate("work_experience", language)
    html = (
        f'<section>'
        f'<h2 class="text-[10px] font-bold tracking-[0.2em] uppercase text-rose-600 mb-5 pb-1.5 border-b border-rose-100">{label}</h2>'
        f'<div class="space-y-7">'
    )
    for i, job in enumerate(jobs):
        title = _e(job.get("jobTitle", ""))
        company = _e(job.get("companyName", ""))
        date_str = _date_range(job, language)
        bullets = split_description(job.get("description", ""))
        bullet_html = "".join(
            f'<li class="text-[12.5px] text-gray-600 leading-loose flex items-start gap-2">'
            f'{_SVG_CHECK_SMALL}{highlight_metrics(_e(b))}</li>'
            for b in bullets
        )
        divider = '<div class="border-t border-gray-100 my-3"></div>' if i > 0 else ""
        html += (
            f'{divider}<div class="job-entry">'
            f'<div class="flex items-baseline justify-between mb-1">'
            f'<h3 class="text-[14px] font-bold text-gray-900">{title}</h3>'
            f'<span class="text-[10px] text-gray-400 whitespace-nowrap ml-2">{_e(date_str)}</span>'
            f'</div>'
            f'<p class="text-[11px] font-semibold text-rose-600 mb-3">{company}</p>'
            f'<ul class="space-y-2.5">{bullet_html}</ul>'
            f'</div>'
        )
    html += '</div></section>'
    return html


def _t4_aside_skills(data: dict, language: str) -> str:
    raw = data.get("skills", [])
    skills = clean_skills_list(raw) if raw else []
    if not skills:
        return ""
    label = translate("skills", language)
    items = "".join(
        f'<span class="inline-block bg-rose-50 text-rose-700 border border-rose-100 text-[10px] px-2 py-0.5 rounded-full mr-1 mb-1.5">{_e(s)}</span>'
        for s in skills
    )
    return (
        f'<div>'
        f'<h2 class="text-[9px] font-bold tracking-[0.2em] uppercase text-rose-500 mb-3">{label}</h2>'
        f'<div>{items}</div>'
        f'</div>'
    )


def _t4_aside_education(data: dict, language: str) -> str:
    edu = data.get("education", [])
    if not edu:
        return ""
    label = translate("education", language)
    html = (
        f'<div>'
        f'<h2 class="text-[9px] font-bold tracking-[0.2em] uppercase text-rose-500 mb-3">{label}</h2>'
        f'<div class="space-y-3">'
    )
    for e in edu:
        degree = _e(e.get("degree", ""))
        school = _e(e.get("institution", ""))
        year = _e(e.get("graduationYear", ""))
        html += (
            f'<div class="edu-entry">'
            f'<p class="text-[11px] font-semibold text-gray-800">{degree}</p>'
            f'<p class="text-[10px] text-rose-600 mt-0.5">{school}</p>'
            f'<p class="text-[10px] text-gray-400">{year}</p>'
            f'</div>'
        )
    html += '</div></div>'
    return html


def _t4_aside_certs(data: dict, language: str) -> str:
    certs = data.get("certifications", [])
    if not certs:
        return ""
    label = translate("certifications", language)
    html = (
        f'<div>'
        f'<h2 class="text-[9px] font-bold tracking-[0.2em] uppercase text-rose-500 mb-3">{label}</h2>'
        f'<div class="space-y-2">'
    )
    for c in certs:
        name = _e(c.get("name", ""))
        issuer = _e(c.get("issuer", ""))
        year = _e(c.get("year", ""))
        html += (
            f'<div>'
            f'<p class="text-[11px] font-semibold text-gray-800">{name}</p>'
            f'<p class="text-[10px] text-gray-400">{issuer}{" · " + year if year else ""}</p>'
            f'</div>'
        )
    html += '</div></div>'
    return html


def _t4_personal_data(data: dict, language: str) -> str:
    """Renders 'Persönliche Daten' aside block for Austrian Lebenslauf (T4)."""
    items = []
    p = lambda v: f'<p class="text-[11px] text-gray-600 mb-1">{_e(v)}</p>'
    addr_lines = data.get("addressLines") or []
    if addr_lines:
        for line in addr_lines:
            if line and line.strip():
                items.append(p(line))
    elif data.get("location"):
        items.append(p(data["location"]))
    if data.get("birthInfo"):
        items.append(p(data["birthInfo"]))
    if data.get("nationality"):
        items.append(p(data["nationality"]))
    if data.get("staatsbuergerschaft"):
        items.append(p(f'Staatsbürgerschaft: {data["staatsbuergerschaft"]}'))
    if data.get("familienstand"):
        items.append(p(f'Familienstand: {data["familienstand"]}'))
    if data.get("fuehrerschein"):
        items.append(p(f'Führerschein: {data["fuehrerschein"]}'))
    if data.get("religion"):
        items.append(p(f'Religion: {data["religion"]}'))
    if not items:
        return ""
    label = translate("personal_details", language)
    return (
        f'<div>'
        f'<h2 class="text-[9px] font-bold tracking-[0.2em] uppercase text-rose-500 mb-3">{label}</h2>'
        f'<div>' + "".join(items) + f'</div>'
        f'</div>'
    )


# ═══════════════════════════════════════════════════════════════════════════════
# TEMPLATE 5 — Card Interface (floating cards · violet)
# ═══════════════════════════════════════════════════════════════════════════════

def _t5_contact_spans(data: dict) -> str:
    spans = []
    if data.get("email"):
        spans.append(
            f'<span class="flex items-center gap-1 text-[11px] text-slate-500">'
            f'{_SVG_V5_EMAIL}{_e(data["email"])}</span>'
        )
    if data.get("phone"):
        spans.append(
            f'<span class="flex items-center gap-1 text-[11px] text-slate-500">'
            f'{_SVG_V5_PHONE}{_e(data["phone"])}</span>'
        )
    if data.get("location"):
        spans.append(
            f'<span class="flex items-center gap-1 text-[11px] text-slate-500">'
            f'{_SVG_V5_LOC}{_e(data["location"])}</span>'
        )
    if data.get("linkedin"):
        spans.append(
            f'<span class="flex items-center gap-1 text-[11px] text-slate-500">'
            f'{_SVG_V5_EMAIL}{_e(data["linkedin"])}</span>'
        )
    return "".join(spans)


def _t5_summary_card(data: dict, language: str) -> str:
    summary = clean_summary(data.get("professionalSummary", ""))
    label = translate("professional_summary", language)
    content = _e(summary) if summary else '<span class="text-slate-400">—</span>'
    return (
        f'<div class="t5-top-card col-span-3 bg-white rounded-2xl shadow-lg p-8">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-violet-500 mb-4">{label}</h2>'
        f'<p class="text-[13px] text-slate-600 leading-loose">{content}</p>'
        f'</div>'
    )


def _t5_skills_card(data: dict, language: str) -> str:
    raw = data.get("skills", [])
    skills = clean_skills_list(raw) if raw else []
    label = translate("skills", language)
    if skills:
        items = "".join(
            f'<span class="inline-block bg-violet-50 text-violet-700 border border-violet-100 text-[10px] px-2.5 py-0.5 rounded-full mr-1 mb-1.5">{_e(s)}</span>'
            for s in skills
        )
    else:
        items = '<span class="text-slate-400 text-xs">—</span>'
    return (
        f'<div class="t5-top-card col-span-2 bg-white rounded-2xl shadow-lg p-7">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-violet-500 mb-3">{label}</h2>'
        f'<div>{items}</div>'
        f'</div>'
    )


def _t5_experience_card(data: dict, language: str) -> str:
    jobs = data.get("workExperience", [])
    if not jobs:
        return ""
    label = translate("work_experience", language)
    # Each job gets its own card so the printer can paginate cleanly
    # without ever slicing a card across a page boundary.
    cards_html = ""
    for job in jobs:
        title = _e(job.get("jobTitle", ""))
        company = _e(job.get("companyName", ""))
        date_str = _date_range(job, language)
        bullets = split_description(job.get("description", ""))
        bullet_html = "".join(
            f'<li class="text-[12.5px] text-slate-600 leading-loose">{highlight_metrics(_e(b))}</li>'
            for b in bullets
        )
        cards_html += (
            f'<div class="t5-job-card job-entry bg-white rounded-2xl shadow-md p-7">'
            f'<div class="flex items-baseline justify-between mb-1">'
            f'<h3 class="text-[14px] font-semibold text-slate-800">{title}</h3>'
            f'<span class="text-[10px] text-slate-400 font-medium whitespace-nowrap ml-2">{_e(date_str)}</span>'
            f'</div>'
            f'<p class="text-[11px] font-semibold text-violet-600 mb-3">{company}</p>'
            f'<ul class="list-disc list-inside space-y-2">{bullet_html}</ul>'
            f'</div>'
        )
    return (
        f'<div>'
        f'<p class="text-[9px] font-bold tracking-[0.25em] uppercase text-violet-500 mb-3 px-1">{label}</p>'
        f'<div class="space-y-4">{cards_html}</div>'
        f'</div>'
    )


def _t5_edu_certs(data: dict, language: str) -> str:
    edu = data.get("education", [])
    certs = data.get("certifications", [])
    edu_label = translate("education", language)
    certs_label = translate("certifications", language)
    edu_html = ""
    for e in edu:
        degree = _e(e.get("degree", ""))
        school = _e(e.get("institution", ""))
        year = _e(e.get("graduationYear", ""))
        edu_html += (
            f'<div class="edu-entry">'
            f'<h3 class="text-[13px] font-semibold text-slate-800">{degree}</h3>'
            f'<p class="text-[11px] font-semibold text-violet-600 mt-0.5">{school}</p>'
            f'<p class="text-[10px] text-slate-400">{year}</p>'
            f'</div>'
        )
    certs_html = ""
    for c in certs:
        name = _e(c.get("name", ""))
        issuer = _e(c.get("issuer", ""))
        year = _e(c.get("year", ""))
        certs_html += (
            f'<div>'
            f'<p class="text-[11px] font-semibold text-slate-800">{name}</p>'
            f'<p class="text-[10px] text-slate-400">{issuer}{" · " + year if year else ""}</p>'
            f'</div>'
        )
    edu_card = (
        f'<div class="t5-edu-card bg-white rounded-2xl shadow-lg p-7">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-violet-500 mb-4">{edu_label}</h2>'
        f'<div class="space-y-4">{edu_html if edu_html else "<p class=text-slate-400 text-xs>—</p>"}</div>'
        f'</div>'
    )
    certs_card = (
        f'<div class="t5-cert-card bg-white rounded-2xl shadow-lg p-7">'
        f'<h2 class="text-[9px] font-bold tracking-[0.25em] uppercase text-violet-500 mb-4">{certs_label}</h2>'
        f'<div class="space-y-3">{certs_html if certs_html else "<p class=text-slate-400 text-xs>—</p>"}</div>'
        f'</div>'
    )
    return f'<div class="grid grid-cols-2 gap-4">{edu_card}{certs_card}</div>'


# ═══════════════════════════════════════════════════════════════════════════════
# Data normalizer — bridges snake_case DB format ↔ camelCase generator keys
# ═══════════════════════════════════════════════════════════════════════════════

def _normalize_data(data: dict) -> dict:
    """
    Accept either camelCase (AI-parsed) or snake_case (DB/schema) format and
    return a unified camelCase dict that all _tN_ helpers can read without change.
    """
    # ── Name ──────────────────────────────────────────────────────────────────
    if data.get("firstName") or data.get("lastName"):
        first = data.get("firstName", "")
        last  = data.get("lastName", "")
    else:
        parts = (data.get("full_name") or "").strip().split(" ", 1)
        first = parts[0]
        last  = parts[1] if len(parts) > 1 else ""

    # ── Work experience ────────────────────────────────────────────────────────
    raw_we = data.get("workExperience") or data.get("work_experience") or []
    work_exp = []
    for job in raw_we:
        work_exp.append({
            "jobTitle":          job.get("jobTitle") or job.get("title", ""),
            "companyName":       job.get("companyName") or job.get("company", ""),
            "startDate":         job.get("startDate", ""),
            "endDate":           job.get("endDate"),
            "isCurrentPosition": job.get("isCurrentPosition", False),
            "description":       job.get("description", ""),
        })

    # ── Education ──────────────────────────────────────────────────────────────
    raw_edu = data.get("education") or []
    education = []
    for e in raw_edu:
        education.append({
            "degree":         e.get("degree", ""),
            "institution":    e.get("institution") or e.get("school", ""),
            "graduationYear": e.get("graduationYear") or e.get("graduationDate", ""),
        })

    # ── Skills ─────────────────────────────────────────────────────────────────
    # Handle [{category: "...", items: [...]}] (schema format) → flat list
    raw_skills = data.get("skills") or []
    if raw_skills and isinstance(raw_skills[0], dict) and "items" in raw_skills[0]:
        flat: list = []
        for group in raw_skills:
            flat.extend(group.get("items", []))
        skills = flat
    else:
        skills = raw_skills

    # ── Certifications ─────────────────────────────────────────────────────────
    raw_certs = data.get("certifications") or []
    certs = []
    for c in raw_certs:
        certs.append({
            "name":         c.get("name", ""),
            "abbreviation": c.get("abbreviation", ""),
            "issuer":       c.get("issuer", ""),
            "year":         c.get("year") or c.get("date", ""),
        })

    return {
        "firstName":          first,
        "lastName":           last,
        "currentJobTitle":    data.get("currentJobTitle") or data.get("current_job_title", ""),
        "email":              data.get("email", ""),
        "phone":              data.get("phone", ""),
        "location":           data.get("location", ""),
        "linkedin":           data.get("linkedin", ""),
        "birthInfo":          data.get("birthInfo") or data.get("birth_info", ""),
        "nationality":        data.get("nationality", ""),
        "staatsbuergerschaft": data.get("staatsbuergerschaft", ""),
        "familienstand":      data.get("familienstand", ""),
        "fuehrerschein":      data.get("fuehrerschein", ""),
        "religion":           data.get("religion", ""),
        "addressLines":       data.get("addressLines") or data.get("address_lines") or [],
        "professionalSummary": data.get("professionalSummary") or data.get("professional_summary", ""),
        "workExperience":     work_exp,
        "education":          education,
        "skills":             skills,
        "certifications":     certs,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# Main render function
# ═══════════════════════════════════════════════════════════════════════════════

_FIT_TO_PAGE_SCRIPT = """<script>
(function(){
  function fit(){
    var r=document.querySelector('.resume');
    if(!r)return;
    var PAGE=1056;
    var h=r.scrollHeight;
    if(h<=PAGE)return;
    var s=PAGE/h;
    r.style.transform='scale('+s+')';
    r.style.transformOrigin='top left';
    r.style.marginBottom='-'+Math.ceil(h*(1-s))+'px';
    var st=document.createElement('style');
    st.textContent='@media print{.resume{transform:scale('+s+') !important;transform-origin:top left !important;}}';
    document.head.appendChild(st);
  }
  if(document.readyState==='loading')window.addEventListener('load',fit);
  else setTimeout(fit,100);
})();
</script>"""


def _inject_fit_script(html: str) -> str:
    """Injects the fit-to-page script before </body> if present, else appends it."""
    if "</body>" in html:
        return html.replace("</body>", _FIT_TO_PAGE_SCRIPT + "</body>", 1)
    return html + _FIT_TO_PAGE_SCRIPT


def render_resume_html(resume_data: dict, template_id: int = 1, language: str = "en", fit_to_page: bool = False) -> str:
    from .resume_templates import get_template

    data = _normalize_data(resume_data)
    template = get_template(template_id)

    # Shared values
    full_name = f'{data.get("firstName", "")} {data.get("lastName", "")}'.strip()
    first = data.get("firstName", "")
    last = data.get("lastName", "")
    initials = (first[:1] + last[:1]).upper() if (first or last) else "?"
    current_title = data.get("currentJobTitle", "")
    email = data.get("email", "")
    phone = data.get("phone", "")
    location = data.get("location", "")

    def _maybe_fit(html: str) -> str:
        return _inject_fit_script(html) if fit_to_page else html

    if template_id == 1:
        return _maybe_fit(_safe_render(
            template,
            full_name=_e(full_name),
            initials=_e(initials),
            current_title=_e(current_title),
            contact_items=_t1_contact(data),
            personal_data_section=_t1_personal_data(data, language),
            skills_items=_t1_skills(data),
            certs_items=_t1_certs(data),
            summary_section=_t1_summary(data, language),
            experience_section=_t1_experience(data, language),
            education_section=_t1_education(data, language),
        ))

    elif template_id == 2:
        return _maybe_fit(_safe_render(
            template,
            full_name=_e(full_name),
            initials=_e(initials),
            current_title=_e(current_title),
            contact_items=_t2_contact(data),
            personal_data_section=_t2_personal_data(data, language),
            skills_section=_t2_skills(data, language),
            certs_section=_t2_certs(data, language),
            summary_section=_t2_summary(data, language),
            experience_section=_t2_experience(data, language),
            education_section=_t2_education(data, language),
        ))

    elif template_id == 3:
        return _maybe_fit(_safe_render(
            template,
            full_name=_e(full_name),
            current_title=_e(current_title),
            email=_e(email),
            phone=_e(phone),
            location=_e(location),
            summary_band=_t3_summary_band(data, language),
            skills_band=_t3_skills_band(data, language),
            experience_band=_t3_experience_band(data, language),
            edu_certs_band=_t3_edu_certs_band(data, language),
        ))

    elif template_id == 4:
        return _maybe_fit(_safe_render(
            template,
            full_name=_e(full_name),
            current_title=_e(current_title),
            contact_items=_t4_contact(data),
            summary_section=_t4_summary(data, language),
            experience_section=_t4_experience(data, language),
            aside_skills=_t4_aside_skills(data, language),
            aside_education=_t4_aside_education(data, language),
            aside_certs=_t4_aside_certs(data, language),
            personal_data_section=_t4_personal_data(data, language),
        ))

    elif template_id == 5:
        return _maybe_fit(_safe_render(
            template,
            full_name=_e(full_name),
            initials=_e(initials),
            current_title=_e(current_title),
            contact_spans=_t5_contact_spans(data),
            summary_card=_t5_summary_card(data, language),
            skills_card=_t5_skills_card(data, language),
            experience_card=_t5_experience_card(data, language),
            edu_certs_section=_t5_edu_certs(data, language),
        ))

    # Fallback to template 1
    return render_resume_html(resume_data, template_id=1, language=language, fit_to_page=fit_to_page)
