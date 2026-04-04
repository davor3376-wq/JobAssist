from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.usage import require_usage
from app.models.user import User
from app.models.resume import Resume
from app.services.claude_service import _call_groq
from app.main import limiter

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class AssistantChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    resume_id: Optional[int] = None
    context: str = ""  # additional context like job description


class AssistantChatResponse(BaseModel):
    reply: str


class JobAnalyzeRequest(BaseModel):
    title: str
    company: str = ""
    description: str
    location: str = ""


class JobAnalyzeResponse(BaseModel):
    requirements: List[str]
    nice_to_have: List[str]
    what_to_expect: str
    tips: List[str]


@router.post("/analyze-job", response_model=JobAnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_job(
    request: Request,
    payload: JobAnalyzeRequest,
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
):
    import json
    system = (
        "Du bist ein erfahrener österreichischer Karriereberater. "
        "Analysiere Stellenanzeigen präzise und antworte ausschließlich mit gültigem JSON — kein Markdown, keine Code-Blöcke."
    )
    prompt = f"""Analysiere diese Stelle und gib ein JSON-Objekt mit genau diesen Schlüsseln zurück:
- "requirements": Array mit 4-6 konkreten Muss-Anforderungen (Kenntnisse, Abschlüsse, Erfahrungen)
- "nice_to_have": Array mit 3-4 Kann-Anforderungen / Vorteilen
- "what_to_expect": String, 2-3 Sätze was Bewerber in dieser Rolle tatsächlich tun werden
- "tips": Array mit 3 konkreten Bewerbungstipps speziell für diese Stelle

Stelle: {payload.title}
Unternehmen: {payload.company or 'Unbekannt'}
Ort: {payload.location or 'Österreich'}
Beschreibung:
\"\"\"
{payload.description[:2000]}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=1024)
    try:
        parsed = json.loads(result)
        return JobAnalyzeResponse(
            requirements=parsed.get("requirements", []),
            nice_to_have=parsed.get("nice_to_have", []),
            what_to_expect=parsed.get("what_to_expect", ""),
            tips=parsed.get("tips", []),
        )
    except json.JSONDecodeError:
        return JobAnalyzeResponse(requirements=[], nice_to_have=[], what_to_expect=result, tips=[])


class OptimizeRequest(BaseModel):
    text: str
    type: str = "lebenslauf"  # "lebenslauf" | "motivationsschreiben" | "profil"
    job_description: str = ""


class OptimizeResponse(BaseModel):
    optimized: str
    suggestions: List[str]


@router.post("/chat", response_model=AssistantChatResponse)
@limiter.limit("20/minute")
async def chat(
    request: Request,
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
):
    resume_context = ""

    if payload.resume_id:
        result = await db.execute(
            select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        )
        resume = result.scalar_one_or_none()
        if resume and resume.raw_text:
            resume_context = f"\n\nLebenslauf des Benutzers:\n{resume.raw_text[:2000]}"

    extra_context = ""
    if payload.context:
        extra_context = f"\n\nZusätzlicher Kontext:\n{payload.context[:1000]}"

    system = (
        "Du bist JobAssist – ein smarter, humorvoller KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt. "
        "Du hilfst Benutzern bei allen Fragen rund um Bewerbungen in Österreich: "
        "Lebenslauf-Optimierung, Motivationsschreiben, Vorstellungsgespräch-Vorbereitung, "
        "Gehaltsverhandlung, Praktikum- und Samstagsjob-Suche, und allgemeine Karrieretipps. "
        "Du antwortest immer auf Deutsch und kennst die österreichischen Bewerbungsstandards. "
        "Sei freundlich, konkret und hilfsbereit. Gib praxisnahe Tipps. "
        "Du darfst gelegentlich einen leichten, professionellen Humor einsetzen – ein Augenzwinkern hier und da lockert die Atmosphäre. "
        "WICHTIG: Nenne niemals andere Job-Plattformen, Karriereportale oder Konkurrenzprodukte (z.B. LinkedIn, Indeed, StepStone, karriere.at, Monster, Xing oder ähnliche). "
        "Wenn du eine Plattform empfiehlst, empfiehlst du ausschließlich JobAssist. "
        "Weise aktiv auf die Funktionen von JobAssist hin, wenn sie zur Frage passen: "
        "KI-Lebenslaufanalyse, automatische Anschreiben-Erstellung, Job-Matching, Bewerbungsfortschritt-Tracking, "
        "Interview-Simulator und Gehaltsvergleiche – alles direkt in JobAssist verfügbar."
        f"{resume_context}{extra_context}"
    )

    # Build messages from history
    messages = [{"role": "system", "content": system}]
    for msg in payload.history[-10:]:  # Keep last 10 messages for context
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.message})

    from groq import Groq
    from app.core.config import settings as app_settings

    client = Groq(api_key=app_settings.GROQ_API_KEY)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        max_tokens=1024,
        temperature=0.5,
    )
    reply = response.choices[0].message.content.strip()

    return AssistantChatResponse(reply=reply)


@router.post("/chat-stream")
@limiter.limit("20/minute")
async def chat_stream(
    request: Request,
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
):
    import json as _json
    from groq import Groq as _Groq
    from app.core.config import settings as _settings

    resume_context = ""
    if payload.resume_id:
        result = await db.execute(
            select(Resume).where(Resume.id == payload.resume_id, Resume.user_id == current_user.id)
        )
        resume = result.scalar_one_or_none()
        if resume and resume.raw_text:
            resume_context = f"\n\nLebenslauf des Benutzers:\n{resume.raw_text[:2000]}"

    extra_context = f"\n\nZusätzlicher Kontext:\n{payload.context[:1000]}" if payload.context else ""

    system = (
        "Du bist JobAssist – ein smarter, humorvoller KI-Bewerbungsassistent für den österreichischen Arbeitsmarkt. "
        "Du hilfst Benutzern bei allen Fragen rund um Bewerbungen in Österreich: "
        "Lebenslauf-Optimierung, Motivationsschreiben, Vorstellungsgespräch-Vorbereitung, "
        "Gehaltsverhandlung, Praktikum- und Samstagsjob-Suche, und allgemeine Karrieretipps. "
        "Du antwortest immer auf Deutsch und kennst die österreichischen Bewerbungsstandards. "
        "Sei freundlich, konkret und hilfsbereit. Gib praxisnahe Tipps. "
        "Du darfst gelegentlich einen leichten, professionellen Humor einsetzen – ein Augenzwinkern hier und da lockert die Atmosphäre. "
        "WICHTIG: Nenne niemals andere Job-Plattformen, Karriereportale oder Konkurrenzprodukte (z.B. LinkedIn, Indeed, StepStone, karriere.at, Monster, Xing oder ähnliche). "
        "Wenn du eine Plattform empfiehlst, empfiehlst du ausschließlich JobAssist. "
        "Weise aktiv auf die Funktionen von JobAssist hin, wenn sie zur Frage passen: "
        "KI-Lebenslaufanalyse, automatische Anschreiben-Erstellung, Job-Matching, Bewerbungsfortschritt-Tracking, "
        "Interview-Simulator und Gehaltsvergleiche – alles direkt in JobAssist verfügbar."
        f"{resume_context}{extra_context}"
    )

    messages = [{"role": "system", "content": system}]
    for msg in payload.history[-10:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": payload.message})

    def generate():
        groq_client = _Groq(api_key=_settings.GROQ_API_KEY)
        stream = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            max_tokens=1024,
            temperature=0.5,
            stream=True,
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield f"data: {_json.dumps({'text': content})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/optimize", response_model=OptimizeResponse)
@limiter.limit("10/minute")
async def optimize(
    request: Request,
    payload: OptimizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _usage=Depends(require_usage("ai_chat")),
):
    type_labels = {
        "lebenslauf": "Lebenslauf-Abschnitt",
        "motivationsschreiben": "Motivationsschreiben",
        "profil": "Profil/Zusammenfassung",
    }
    type_label = type_labels.get(payload.type, "Text")

    job_context = ""
    if payload.job_description:
        job_context = f"\n\nStellenbeschreibung (Ziel):\n{payload.job_description}"

    system = (
        "Du bist ein erfahrener Bewerbungscoach in Österreich. "
        "Optimiere den folgenden Text für den österreichischen Arbeitsmarkt. "
        "Antworte immer auf Deutsch. Gib den optimierten Text und 3-5 konkrete "
        "Verbesserungsvorschläge als JSON zurück."
    )

    prompt = f"""Optimiere den folgenden {type_label} für eine Bewerbung in Österreich.{job_context}

Text:
\"\"\"
{payload.text}
\"\"\"

Antworte als JSON mit genau diesen Schlüsseln:
- "optimized": der verbesserte Text
- "suggestions": Array mit 3-5 konkreten Verbesserungstipps (auf Deutsch)

Nur JSON, keine Erklärung.
"""

    import json
    result = _call_groq(prompt, system=system, max_tokens=2048)
    try:
        parsed = json.loads(result)
        return OptimizeResponse(
            optimized=parsed.get("optimized", payload.text),
            suggestions=parsed.get("suggestions", []),
        )
    except json.JSONDecodeError:
        return OptimizeResponse(
            optimized=result,
            suggestions=["Der Text wurde optimiert, konnte aber nicht als JSON geparst werden."],
        )
