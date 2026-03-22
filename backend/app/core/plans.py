"""Plan definitions and usage limits for each subscription tier."""

PLAN_LIMITS = {
    "basic": {
        "cv_analysis": 2,
        "cover_letter": 1,
        "job_alerts": 1,
        "ai_chat": 15,
    },
    "pro": {
        "cv_analysis": 15,
        "cover_letter": 10,
        "job_alerts": 10,
        "ai_chat": 200,
    },
    "max": {
        "cv_analysis": -1,  # unlimited
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
    },
    "enterprise": {
        "cv_analysis": -1,
        "cover_letter": -1,
        "job_alerts": -1,
        "ai_chat": -1,
    },
}

PLAN_PRICES = {
    "basic": 0,
    "pro": 7.99,
    "max": 14.99,
    "enterprise": None,  # contact us
}

PLAN_NAMES = {
    "basic": "Basic (Free)",
    "pro": "Pro",
    "max": "Max",
    "enterprise": "Enterprise",
}


def get_limit(plan: str, feature: str) -> int:
    """Return the limit for a feature on a plan. -1 means unlimited."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["basic"]).get(feature, 0)
