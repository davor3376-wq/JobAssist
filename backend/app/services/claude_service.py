import json
import re
from datetime import date
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"


def get_groq_provider_status() -> dict:
    return {
        "configured": bool(settings.GROQ_API_KEY),
        "model": MODEL,
    }


def _call_groq(prompt: str, system: str = "", max_tokens: int = 2048, temperature: float = 0.3, **kwargs) -> str:
    """Base helper to call Groq and return text."""
    from fastapi import HTTPException
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            **kwargs,
        )
        content = response.choices[0].message.content
        if not content:
            raise HTTPException(status_code=502, detail="KI hat keine Antwort zurückgegeben. Bitte erneut versuchen.")
        return content.strip()
    except HTTPException:
        raise
    except Exception as e:
        err = str(e).lower()
        if "rate" in err or "429" in err:
            raise HTTPException(status_code=429, detail="Zu viele Anfragen. Bitte in einigen Sekunden erneut versuchen.")
        if "api key" in err or "authentication" in err or "401" in err:
            raise HTTPException(status_code=503, detail="KI-Dienst temporär nicht verfügbar.")
        raise HTTPException(status_code=502, detail="Fehler beim KI-Dienst. Bitte erneut versuchen.")


def _strip_code_fences(text: str) -> str:
    """Remove ```json ... ``` or ``` ... ``` wrappers the model sometimes adds."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def parse_resume(raw_text: str) -> dict:
    """Extract structured info from raw resume text."""
    system = (
        "You are an expert resume parser. Extract structured information from resumes. "
        "Always respond with valid JSON only — no markdown, no code fences, no commentary."
    )
    prompt = f"""Parse the following resume and return a JSON object with these keys:
- name (string)
- email (string)
- phone (string)
- summary (string)
- skills (array of strings)
- experience (array of objects: company, title, dates, bullets)
- education (array of objects: institution, degree, dates)
- certifications (array of strings)

Resume:
\"\"\"
{raw_text}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=2048)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"raw": result}


def _translate_match_to_german(match: dict) -> dict:
    """Translate any English text fields in a match result to German."""
    text_to_translate = json.dumps({
        "summary": match.get("summary", ""),
        "strengths": match.get("strengths", []),
        "gaps": match.get("gaps", []),
        "recommendations": match.get("recommendations", []),
    }, ensure_ascii=False)

    system = (
        "Du bist ein professioneller Übersetzer. "
        "Übersetze den gesamten JSON-Inhalt vollständig ins Deutsche. "
        "Gib NUR das JSON zurück — kein Markdown, keine Erklärungen, keine Code-Blöcke."
    )
    prompt = (
        "Übersetze ALLE Texte in diesem JSON vollständig und ausschließlich ins Deutsche. "
        "Behalte die JSON-Struktur und alle Schlüssel exakt bei:\n\n"
        + text_to_translate
    )
    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=2048,
                temperature=0,
            )
            result = _strip_code_fences(response.choices[0].message.content)
            translated = json.loads(result)
            match["summary"] = translated.get("summary", match.get("summary", ""))
            match["strengths"] = translated.get("strengths", match.get("strengths", []))
            match["gaps"] = translated.get("gaps", match.get("gaps", []))
            match["recommendations"] = translated.get("recommendations", match.get("recommendations", []))
            break
        except (json.JSONDecodeError, Exception):
            if attempt == 1:
                pass  # Keep original on repeated failure
    return match



def match_resume_to_job(resume_text: str, job_description: str) -> dict:
    """Score how well a resume matches a job description.

    The final score is computed in Python from per-requirement evaluations
    so the LLM cannot anchor to a fixed number.
    """
    system = (
        "Du bist ein erfahrener österreichischer Personalvermittler. "
        "Antworte AUSSCHLIESSLICH auf Deutsch. "
        "Antworte nur mit gültigem JSON — kein Markdown, keine Code-Blöcke, kein Kommentar. "
        "Alle Textwerte im JSON müssen auf Deutsch sein."
    )
    prompt = f"""Analysiere die Übereinstimmung zwischen Lebenslauf und Stellenbeschreibung.
Alle Texte im JSON müssen auf Deutsch sein.

AUFGABE:
1. Identifiziere die 6 wichtigsten Anforderungen der Stelle.
2. Bewerte jede Anforderung einzeln gegen den Lebenslauf:
   - 2 = vollständig erfüllt
   - 1 = teilweise erfüllt / verwandtes Potenzial vorhanden
   - 0 = nicht erfüllt / keine Hinweise
3. Schätze Bonus- und Abzugspunkte (ganze Zahlen):
   - bonus: 0–20 (für passende Ausbildung, Branchenerfahrung, Soft Skills, Sprachen)
   - penalty: 0–20 (für fehlende Kernanforderungen, Qualifikationslücken)

Gib genau dieses JSON zurück (kein "score"-Feld — der Score wird extern berechnet):
{{
  "requirements": [
    {{"req": "<Anforderung 1 aus der Stellenbeschreibung>", "score": <0|1|2>, "note": "<1 Satz Begründung>"}},
    {{"req": "<Anforderung 2>", "score": <0|1|2>, "note": "<Begründung>"}},
    {{"req": "<Anforderung 3>", "score": <0|1|2>, "note": "<Begründung>"}},
    {{"req": "<Anforderung 4>", "score": <0|1|2>, "note": "<Begründung>"}},
    {{"req": "<Anforderung 5>", "score": <0|1|2>, "note": "<Begründung>"}},
    {{"req": "<Anforderung 6>", "score": <0|1|2>, "note": "<Begründung>"}}
  ],
  "bonus": <ganze Zahl 0–20>,
  "penalty": <ganze Zahl 0–20>,
  "summary": "<2–3 Sätze Gesamtbewertung auf Deutsch>",
  "strengths": ["<Stärke 1>", "<Stärke 2>", "<Stärke 3>", "<Stärke 4>", "<Stärke 5>", "<Stärke 6>", "<Stärke 7>", "<Stärke 8>"],
  "gaps": ["<Lücke 1>", "<Lücke 2>", "<Lücke 3>", "<Lücke 4>", "<Lücke 5>", "<Lücke 6>"],
  "recommendations": ["<Empfehlung 1>", "<Empfehlung 2>", "<Empfehlung 3>", "<Empfehlung 4>", "<Empfehlung 5>"]
}}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"
"""
    result = _strip_code_fences(_call_groq(prompt, system=system, max_tokens=2048, temperature=0.7))
    try:
        raw = json.loads(result)
    except json.JSONDecodeError:
        return {"score": None, "summary": result, "strengths": [], "gaps": [], "recommendations": []}

    # Compute score in Python — bypasses LLM anchoring entirely
    reqs = raw.get("requirements", [])
    req_total = sum(
        min(2, max(0, int(r.get("score", 0))))
        for r in reqs if isinstance(r, dict)
    )
    bonus   = min(20, max(0, int(raw.get("bonus",   0))))
    penalty = min(20, max(0, int(raw.get("penalty", 0))))
    base    = round(req_total / 12 * 100)
    computed_score = max(42, min(95, base + bonus - penalty))

    return {
        "score":           computed_score,
        "summary":         raw.get("summary", ""),
        "strengths":       raw.get("strengths", []),
        "gaps":            raw.get("gaps", []),
        "recommendations": raw.get("recommendations", []),
    }


def generate_cover_letter(
    resume_text: str,
    job_description: str,
    company: str = "",
    role: str = "",
    tone: str = "professional",
) -> str:
    """Generate a tailored cover letter."""
    system = (
        "Du bist ein erfahrener Bewerbungscoach, der überzeugende, maßgeschneiderte Anschreiben auf Deutsch verfasst. "
        "Schreibe in der Ich-Form. Sei konkret — beziehe dich auf echte Details aus dem Lebenslauf und der Stellenbeschreibung. "
        "Vermeide generische Formulierungen. Schreibe auf Deutsch."
    )
    tone_instructions = {
        "professional": "formell und professionell",
        "enthusiastic": "warmherzig, dynamisch und leidenschaftlich",
        "concise": "knapp (unter 200 Wörter), prägnant und direkt",
    }
    tone_desc = tone_instructions.get(tone, "formell und professionell")

    prompt = f"""Verfasse ein {tone_desc}es Anschreiben auf Deutsch für folgende Bewerbung:

Unternehmen: {company or 'das Unternehmen'}
Stelle: {role or 'die ausgeschriebene Position'}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"

Gib nur den Text des Anschreibens aus, ohne Betreffzeile oder Metadaten.
"""
    return _call_groq(prompt, system=system, max_tokens=1024)


_CLOSING_MARKERS = [
    "mit freundlichen grüßen",
    "mit freundlichen grüssen",
    "hochachtungsvoll",
    "freundliche grüße",
    "freundlichem grüßen",
]


def _is_complete(text: str) -> bool:
    """Return True if the letter contains a recognisable closing formula."""
    lowered = text.lower()
    return any(marker in lowered for marker in _CLOSING_MARKERS)


def _ensure_complete(text: str, applicant_name: str = "") -> str:
    """If the letter was cut off before the closing, append a proper closing."""
    if _is_complete(text):
        return text
    name_line = f"\n{applicant_name}" if applicant_name else ""
    closing = (
        "\n\nÜber die Möglichkeit, mich in einem persönlichen Gespräch vorzustellen, "
        "würde ich mich sehr freuen und stehe Ihnen gerne für weitere Informationen zur Verfügung."
        "\n\nMit freundlichen Grüßen"
        f"{name_line}"
    )
    return text.rstrip() + closing


def generate_motivationsschreiben(
    resume_text: str,
    job_description: str,
    company: str = "",
    role: str = "",
    tone: str = "formell",
    applicant_name: str = "",
    applicant_address: str = "",
) -> str:
    """Generate an Austrian-style Motivationsschreiben in German."""
    system = (
        "Du bist ein erfahrener Bewerbungscoach in Österreich, der überzeugende "
        "Motivationsschreiben auf Deutsch verfasst. Du kennst die österreichischen "
        "Bewerbungsstandards und schreibst in einem professionellen, authentischen Stil. "
        "Das Schreiben soll den österreichischen Normen entsprechen: "
        "formelle Anrede (Sehr geehrte Damen und Herren / Sehr geehrte/r Frau/Herr ...), "
        "klare Struktur (Einleitung, Hauptteil mit Bezug auf Qualifikationen, Schluss), "
        "und eine höfliche Schlussformel (Mit freundlichen Grüßen). "
        "Verwende die Sie-Form. Beziehe dich konkret auf den Lebenslauf und die Stellenbeschreibung. "
        "Schreibe den Brief VOLLSTÄNDIG von Anfang bis Ende. Fasse NICHT zusammen. "
        "Du MUSST eine formelle Schlussformel ('Mit freundlichen Grüßen') und den Namen des Bewerbers am Ende einfügen."
    )
    tone_map = {
        "formell": "formell und professionell",
        "modern": "modern und dynamisch, aber respektvoll",
        "kreativ": "kreativ und individuell, aber seriös",
    }
    tone_desc = tone_map.get(tone, "formell und professionell")

    name_line = f"\nName des Bewerbers: {applicant_name}" if applicant_name else ""
    address_line = f"\nAdresse des Bewerbers: {applicant_address}" if applicant_address else ""
    _months_de = ["Jänner","Februar","März","April","Mai","Juni",
                  "Juli","August","September","Oktober","November","Dezember"]
    _d = date.today()
    today = f"{_d.day}. {_months_de[_d.month - 1]} {_d.year}"

    prompt = f"""Verfasse ein {tone_desc}es Motivationsschreiben auf Deutsch für folgende Bewerbung:

Unternehmen: {company or 'das Unternehmen'}
Stellenbezeichnung: {role or 'die ausgeschriebene Position'}{name_line}{address_line}
Heutiges Datum: {today}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"

WICHTIGE ANFORDERUNGEN:
1. Trenne jeden Absatz mit einer Leerzeile (zwei Zeilenumbrüche). Datum, Anrede, Einleitung, Hauptteil, Schluss und Grußformel sind jeweils eigene Absätze.
2. Höre NICHT auf, bevor du "Mit freundlichen Grüßen" und den Namen des Bewerbers geschrieben hast.
3. Der Schlussabsatz MUSS die Bereitschaft zu einem Vorstellungsgespräch erwähnen.
4. Gib nur den Text aus — kein Betreff, keine Metadaten.
5. Beginne mit Datum ({today}) und Ort, dann Absender, Empfänger, Betreffzeile und den eigentlichen Brief.
"""
    result = _call_groq(
        prompt,
        system=system,
        max_tokens=4096,
        temperature=0.4,
        frequency_penalty=0,
        presence_penalty=0,
    )
    return _ensure_complete(result, applicant_name)


def generate_company_research(company_name: str, job_description: str = "", known_data: dict = None) -> dict:
    """Generate a company briefing: summary, hot topics, smart questions."""
    known_info = ""
    if known_data:
        parts = []
        if known_data.get("ceo"):        parts.append(f"CEO: {known_data['ceo']}")
        if known_data.get("mission"):    parts.append(f"Mission: {known_data['mission']}")
        if known_data.get("industry"):   parts.append(f"Branche: {known_data['industry']}")
        if known_data.get("employees"):  parts.append(f"Mitarbeiter: {known_data['employees']}")
        if known_data.get("founded"):    parts.append(f"Gegründet: {known_data['founded']}")
        if known_data.get("hq"):         parts.append(f"Hauptsitz: {known_data['hq']}")
        known_info = "\n".join(parts)

    system = (
        "Du bist ein Karriere-Recherche-Assistent. "
        "Antworte AUSSCHLIESSLICH mit gültigem JSON — kein Markdown, keine Erklärungen. "
        "Alle Texte auf Deutsch. Jahr 2026."
    )
    prompt = f"""Erstelle ein Bewerbungs-Briefing für folgendes Unternehmen auf Deutsch.

Unternehmen: {company_name}
{f"Bekannte Daten:{chr(10)}{known_info}" if known_info else ""}
{f"Stellenbeschreibung:{chr(10)}{job_description[:800]}" if job_description else ""}

Gib exakt dieses JSON zurück:
{{
  "summary": "<2 prägnante Sätze über das Unternehmen, seine Stärken und Marktposition>",
  "contact_info": {{
    "email": "<allgemeine Recruiting- oder Karriere-E-Mail, sonst leer>",
    "phone": "<allgemeine Recruiting- oder Zentrale-Telefonnummer, sonst leer>",
    "location": "<relevanter Standort / Büro / Hauptsitz für Bewerbungen, sonst leer>",
    "website": "<offizielle Website oder Karriereseite, sonst leer>"
  }},
  "hot_topics": [
    "<Aktuelles Thema oder Trend 2026 das das Unternehmen betrifft>",
    "<Weiteres relevantes Thema oder Entwicklung 2026>"
  ],
  "smart_questions": [
    "<Intelligente Frage an den Recruiter zur Unternehmenskultur oder Rolle>",
    "<Frage zur Teamstruktur oder Wachstumsstrategie>",
    "<Frage zu Herausforderungen oder Zielen der Abteilung>"
  ]
}}"""
    result = _call_groq(prompt, system=system, max_tokens=800, temperature=0.5,
                        frequency_penalty=0, presence_penalty=0)
    try:
        return json.loads(_strip_code_fences(result))
    except json.JSONDecodeError:
        return {
            "summary": result,
            "contact_info": {},
            "hot_topics": [],
            "smart_questions": [],
        }


def generate_interview_prep(
    resume_text: str,
    job_description: str,
    num_questions: int = 10,
) -> list[dict]:
    """Generate interview Q&A tailored to the resume and job."""
    system = (
        "Du bist ein erfahrener Interviewer, der hochspezifische, rollenrelevante Interviewfragen auf Deutsch erstellt. "
        "Antworte ausschließlich auf Deutsch. "
        "Antworte immer nur mit gültigem JSON — kein Markdown, keine Code-Blöcke, kein Kommentar."
    )
    prompt = f"""Erstelle {num_questions} Interviewfragen mit starken Beispielantworten auf Deutsch für einen Kandidaten, der sich auf diese Stelle bewirbt.
Mische verhaltensbasierte (STAR-Format), technische und situative Fragen.
Beziehe Antworten auf den tatsächlichen Lebenslauf des Kandidaten — sei konkret, nicht generisch.

Gib ein JSON-Array von Objekten zurück mit folgenden Schlüsseln:
- question (string: Frage auf Deutsch)
- type (string: NUR eines dieser deutschen Wörter: "Verhalten" | "Fachlich" | "Situativ" | "Motivation" | "Kompetenz" | "Führung" | "Teamarbeit" | "Kommunikation" | "Problemlösung")
- answer (string: starke Beispielantwort auf Deutsch basierend auf dem Lebenslauf)
- tip (string: kurzer Coaching-Tipp auf Deutsch für diese Frage)

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=4096)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return [{"question": "Could not parse", "type": "unknown", "answer": result, "tip": ""}]
