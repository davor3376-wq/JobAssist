from app.core.config import settings
import httpx
import asyncio
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Jooble API docs: https://jooble.org/api/about
# Free tier: 100 requests/day
# Austria-only: all searches scoped to AT


async def search_jobs(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    job_type: Optional[str] = None,
    page: int = 1,
) -> dict:
    """
    Search for jobs in Austria using Jooble API.

    Args:
        keywords: Job title/keywords (e.g., "Praktikum IT")
        location: City in Austria (e.g., "Wien")
        job_type: Job type (e.g., "Vollzeit", "Praktikum")
        page: Page number (1-based)

    Returns:
        Dict with 'jobs' list and 'totalCount'
    """
    api_key = settings.JOOBLE_API_KEY

    if not api_key:
        logger.error("JOOBLE_API_KEY is not set in environment variables")
        return {
            "jobs": [],
            "total_count": 0,
            "page": page,
            "error": "Jooble API-Schlüssel nicht konfiguriert",
        }

    # Use the Austrian Jooble endpoint
    url = f"https://at.jooble.org/api/{api_key}"

    # Build search keywords — append job type to keywords for better filtering
    search_keywords = keywords or ""
    if job_type and job_type not in search_keywords:
        search_keywords = f"{search_keywords} {job_type}".strip()

    # Default to "Österreich" if no location specified
    search_location = location or "Österreich"

    payload = {
        "keywords": search_keywords,
        "location": search_location,
        "page": str(page),
    }

    try:
        async with httpx.AsyncClient(timeout=15, verify=False) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            logger.info(f"Jooble AT search successful: {len(data.get('jobs', []))} jobs found")

            return {
                "jobs": [
                    {
                        "title": job.get("title", ""),
                        "company": job.get("company", ""),
                        "location": job.get("location", ""),
                        "description": job.get("snippet", ""),
                        "full_url": job.get("link", ""),
                        "salary": job.get("salary", "Nicht angegeben"),
                        "source": "Jooble AT",
                        "source_id": job.get("id", ""),
                        "updated": job.get("updated", ""),
                    }
                    for job in data.get("jobs", [])
                ],
                "total_count": data.get("totalCount", 0),
                "page": page,
            }
    except httpx.HTTPStatusError as e:
        logger.error(f"Jooble API HTTP error: {e.response.status_code} - {e.response.text}")
        return _get_mock_jobs(keywords, location, job_type, page)
    except Exception as e:
        logger.error(f"Jooble API error: {str(e)}")
        logger.warning("Falling back to mock job data for development")
        return _get_mock_jobs(keywords, location, job_type, page)


async def search_jobs_by_preferences(user_profile: dict, page: int = 1) -> dict:
    """
    Search Austrian jobs based on user's stored preferences.
    """
    locations = user_profile.get("desired_locations", [])
    job_types = user_profile.get("job_types", [])

    if not locations:
        locations = ["Wien"]  # Default to Wien

    all_jobs = []
    tasks = []

    for location in locations[:3]:
        for job_type in job_types[:2]:
            task = search_jobs(
                location=location,
                job_type=job_type,
                page=page,
            )
            tasks.append(task)

    # If no job types, still search each location
    if not job_types:
        for location in locations[:3]:
            tasks.append(search_jobs(location=location, page=page))

    results = await asyncio.gather(*tasks)

    seen = set()
    for result in results:
        for job in result.get("jobs", []):
            key = (job.get("source_id"), job.get("company"), job.get("title"))
            if key not in seen:
                seen.add(key)
                all_jobs.append(job)

    return {
        "jobs": all_jobs[:50],
        "total_count": len(all_jobs),
        "page": page,
    }


def _get_mock_jobs(keywords: Optional[str] = None, location: Optional[str] = None, job_type: Optional[str] = None, page: int = 1) -> dict:
    """Austrian mock job data for development."""
    mock_jobs_db = [
        {
            "id": "mock_1",
            "title": "Praktikum Softwareentwicklung",
            "company": "TechAustria GmbH",
            "location": "Wien",
            "snippet": "Pflichtpraktikum für Studierende der Informatik. Erfahrung mit Python oder Java erwünscht.",
            "full_url": "https://example.com/jobs/1",
            "salary": "€ 1.200/Monat",
            "source": "Mock",
        },
        {
            "id": "mock_2",
            "title": "Samstagsjob Verkauf",
            "company": "SPAR Österreich",
            "location": "Graz",
            "snippet": "Samstagsaushilfe im Verkauf. Freundliches Auftreten und Teamfähigkeit erwünscht.",
            "full_url": "https://example.com/jobs/2",
            "salary": "€ 12,50/Stunde",
            "source": "Mock",
        },
        {
            "id": "mock_3",
            "title": "Ferialjob Lager/Logistik",
            "company": "Post AG",
            "location": "Linz",
            "snippet": "Ferialjob im Logistikzentrum für Juli und August. Körperlich belastbar.",
            "full_url": "https://example.com/jobs/3",
            "salary": "€ 1.800/Monat",
            "source": "Mock",
        },
        {
            "id": "mock_4",
            "title": "Vollzeit Bürokauffrau/-mann",
            "company": "Raiffeisen Bank",
            "location": "Salzburg",
            "snippet": "Kaufmännische Ausbildung, MS Office Kenntnisse, Deutsch auf Muttersprachniveau.",
            "full_url": "https://example.com/jobs/4",
            "salary": "€ 2.200 – 2.800/Monat",
            "source": "Mock",
        },
        {
            "id": "mock_5",
            "title": "Teilzeit Kellner/in",
            "company": "Café Central",
            "location": "Wien",
            "snippet": "20 Stunden/Woche. Erfahrung in der Gastronomie von Vorteil.",
            "full_url": "https://example.com/jobs/5",
            "salary": "€ 1.100/Monat",
            "source": "Mock",
        },
        {
            "id": "mock_6",
            "title": "Geringfügig Nachhilfe Mathematik",
            "company": "LernQuadrat",
            "location": "Innsbruck",
            "snippet": "Nachhilfe für Unterstufe und Oberstufe. Pädagogische Erfahrung erwünscht.",
            "full_url": "https://example.com/jobs/6",
            "salary": "€ 18/Stunde",
            "source": "Mock",
        },
    ]

    filtered_jobs = mock_jobs_db
    if keywords:
        keywords_lower = keywords.lower()
        filtered_jobs = [j for j in filtered_jobs if keywords_lower in j["title"].lower() or keywords_lower in j["snippet"].lower()]

    if location:
        location_lower = location.lower()
        filtered_jobs = [j for j in filtered_jobs if location_lower in j["location"].lower()]

    logger.info(f"Returning {len(filtered_jobs)} mock AT jobs (keywords={keywords}, location={location})")

    return {
        "jobs": [
            {
                "title": j["title"],
                "company": j["company"],
                "location": j["location"],
                "description": j["snippet"],
                "full_url": j["full_url"],
                "salary": j["salary"],
                "source": j["source"],
                "source_id": j["id"],
            }
            for j in filtered_jobs[:50]
        ],
        "total_count": len(filtered_jobs),
        "page": page,
        "source": "mock",
    }
