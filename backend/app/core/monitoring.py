import logging


logger = logging.getLogger(__name__)


def configure_sentry(dsn: str = "", traces_sample_rate: float = 0.0) -> bool:
    if not dsn:
        return False

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
    except Exception:
        logger.warning("Sentry DSN configured but sentry-sdk is not installed")
        return False

    sentry_sdk.init(
        dsn=dsn,
        traces_sample_rate=traces_sample_rate,
        integrations=[FastApiIntegration(), SqlalchemyIntegration()],
    )
    logger.info("Sentry configured")
    return True
