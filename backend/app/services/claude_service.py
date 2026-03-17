import json
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)
MODEL = "llama-3.3-70b-versatile"


def _call_groq(prompt: str, system: str = "", max_tokens: int = 2048) -> str:
    """Base helper to call Groq and return text."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    response = client.chat.completions.create(
        model=MODEL,
        messages=messages,
        max_tokens=max_tokens,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


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


def match_resume_to_job(resume_text: str, job_description: str) -> dict:
    """Score how well a resume matches a job description."""
    system = (
        "You are a senior technical recruiter who evaluates resume-job fit. "
        "Always respond with valid JSON only — no markdown, no code fences, no commentary."
    )
    prompt = f"""Compare this resume against the job description and return a JSON object with:
- score (integer 0-100)
- summary (2-3 sentence overall assessment)
- strengths (array of strings: things the candidate does well relative to the role)
- gaps (array of strings: missing skills or experience)
- recommendations (array of strings: specific improvements to boost fit)

Resume:
\"\"\"
{resume_text}
\"\"\"

Job Description:
\"\"\"
{job_description}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=1024)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return {"score": None, "summary": result, "strengths": [], "gaps": [], "recommendations": []}


def generate_cover_letter(
    resume_text: str,
    job_description: str,
    company: str = "",
    role: str = "",
    tone: str = "professional",
) -> str:
    """Generate a tailored cover letter."""
    system = (
        "You are an expert career coach who writes compelling, tailored cover letters. "
        "Write in first person. Be specific — reference real details from the resume and job description. "
        "Avoid generic phrases like 'I am writing to express my interest'."
    )
    tone_instructions = {
        "professional": "formal and polished",
        "enthusiastic": "warm, energetic, and passionate",
        "concise": "brief (under 200 words), punchy, and direct",
    }
    tone_desc = tone_instructions.get(tone, "professional and polished")

    prompt = f"""Write a {tone_desc} cover letter for the following:

Company: {company or 'the company'}
Role: {role or 'the position'}

Resume:
\"\"\"
{resume_text}
\"\"\"

Job Description:
\"\"\"
{job_description}
\"\"\"

Output only the cover letter text, no subject line or metadata.
"""
    return _call_groq(prompt, system=system, max_tokens=1024)


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
        "Verwende die Sie-Form. Beziehe dich konkret auf den Lebenslauf und die Stellenbeschreibung."
    )
    tone_map = {
        "formell": "formell und professionell",
        "modern": "modern und dynamisch, aber respektvoll",
        "kreativ": "kreativ und individuell, aber seriös",
    }
    tone_desc = tone_map.get(tone, "formell und professionell")

    name_line = f"\nName des Bewerbers: {applicant_name}" if applicant_name else ""
    address_line = f"\nAdresse des Bewerbers: {applicant_address}" if applicant_address else ""

    prompt = f"""Verfasse ein {tone_desc}es Motivationsschreiben auf Deutsch für folgende Bewerbung:

Unternehmen: {company or 'das Unternehmen'}
Stellenbezeichnung: {role or 'die ausgeschriebene Position'}{name_line}{address_line}

Lebenslauf:
\"\"\"
{resume_text}
\"\"\"

Stellenbeschreibung:
\"\"\"
{job_description}
\"\"\"

Gib nur den Text des Motivationsschreibens aus — kein Betreff, keine Metadaten.
Beginne mit Datum und Ort (falls verfügbar), dann Absender, Empfänger, Betreffzeile und den eigentlichen Brief.
"""
    return _call_groq(prompt, system=system, max_tokens=2048)


def generate_interview_prep(
    resume_text: str,
    job_description: str,
    num_questions: int = 10,
) -> list[dict]:
    """Generate interview Q&A tailored to the resume and job."""
    system = (
        "You are an expert interviewer who creates highly specific, role-relevant interview questions. "
        "Always respond with valid JSON only — no markdown, no code fences, no commentary."
    )
    prompt = f"""Generate {num_questions} interview questions and strong example answers for a candidate applying to this role.
Mix behavioral (STAR format), technical, and situational questions.
Base answers on the candidate's actual resume — be specific, not generic.

Return a JSON array of objects with keys:
- question (string)
- type (string: "behavioral" | "technical" | "situational")
- answer (string: strong example answer using candidate's background)
- tip (string: short coaching tip for this question)

Resume:
\"\"\"
{resume_text}
\"\"\"

Job Description:
\"\"\"
{job_description}
\"\"\"
"""
    result = _call_groq(prompt, system=system, max_tokens=4096)
    try:
        return json.loads(result)
    except json.JSONDecodeError:
        return [{"question": "Could not parse", "type": "unknown", "answer": result, "tip": ""}]
