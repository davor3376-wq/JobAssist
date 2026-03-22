import asyncio
import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.plans import PLAN_LIMITS, PLAN_NAMES, PLAN_PRICES
from app.core.usage import get_user_plan, get_all_usage
from app.models.user import User
from app.models.subscription import Subscription
from app.schemas.billing import (
    CheckoutRequest, CheckoutResponse, PortalResponse, BillingOverview,
    SubscriptionOut, UsageOut,
)

logger = logging.getLogger(__name__)
router = APIRouter()

PRICE_TO_PLAN = {}  # populated lazily from settings


def _init_stripe():
    stripe.api_key = settings.STRIPE_SECRET_KEY
    if settings.STRIPE_PRICE_PRO:
        PRICE_TO_PLAN[settings.STRIPE_PRICE_PRO] = "pro"
    if settings.STRIPE_PRICE_MAX:
        PRICE_TO_PLAN[settings.STRIPE_PRICE_MAX] = "max"


def _get_price_id(plan: str) -> str:
    if plan == "pro":
        return settings.STRIPE_PRICE_PRO
    if plan == "max":
        return settings.STRIPE_PRICE_MAX
    raise HTTPException(status_code=400, detail="Invalid plan")


# ── Billing overview ─────────────────────────────────────────

@router.get("/overview", response_model=BillingOverview)
async def billing_overview(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    plan = await get_user_plan(db, current_user.id)
    usage = await get_all_usage(db, current_user.id, plan)

    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()

    return BillingOverview(
        subscription=SubscriptionOut(
            plan=plan,
            status=sub.status if sub else "active",
            current_period_end=sub.current_period_end if sub else None,
        ),
        usage=[UsageOut(**u) for u in usage],
    )


# ── Plans info (public) ─────────────────────────────────────

@router.get("/plans")
async def list_plans():
    plans = []
    for key in ["basic", "pro", "max", "enterprise"]:
        plans.append({
            "key": key,
            "name": PLAN_NAMES[key],
            "price": PLAN_PRICES[key],
            "limits": PLAN_LIMITS[key],
        })
    return plans


# ── Stripe Checkout ──────────────────────────────────────────

@router.post("/create-checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _init_stripe()
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    price_id = _get_price_id(payload.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail="Price not configured for this plan")

    # Get or create Stripe customer
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()
    customer_id = sub.stripe_customer_id if sub else None

    if not customer_id:
        customer = await asyncio.to_thread(
            stripe.Customer.create,
            email=current_user.email,
            name=current_user.full_name or "",
            metadata={"user_id": str(current_user.id)},
        )
        customer_id = customer.id

        if sub:
            sub.stripe_customer_id = customer_id
        else:
            sub = Subscription(
                user_id=current_user.id,
                stripe_customer_id=customer_id,
                plan="basic",
                status="active",
            )
            db.add(sub)
        await db.commit()

    try:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=f"{settings.FRONTEND_URL}/billing?success=true",
            cancel_url=f"{settings.FRONTEND_URL}/billing?canceled=true",
            metadata={"user_id": str(current_user.id), "plan": payload.plan},
        )
    except stripe.error.StripeError as e:
        logger.error(f"Stripe checkout error: {e.user_message or e}")
        raise HTTPException(status_code=400, detail=f"Stripe error: {e.user_message or str(e)}")

    return CheckoutResponse(checkout_url=session.url)


# ── Stripe Customer Portal ───────────────────────────────────

@router.post("/create-portal-session", response_model=PortalResponse)
async def create_portal_session(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _init_stripe()
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = result.scalar_one_or_none()

    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=400, detail="Kein aktives Abonnement gefunden")

    session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=sub.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/billing",
    )
    return PortalResponse(portal_url=session.url)


# ── Stripe Webhook ───────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    _init_stripe()
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info(f"Stripe webhook: {event_type}")

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "invoice.paid":
        await _handle_invoice_paid(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)

    return {"status": "ok"}


async def _handle_checkout_completed(db: AsyncSession, session: dict):
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")
    plan = session.get("metadata", {}).get("plan", "pro")

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        logger.warning(f"No subscription row for Stripe customer {customer_id}")
        return

    sub.stripe_subscription_id = subscription_id
    sub.plan = plan
    sub.status = "active"
    await db.commit()
    logger.info(f"User {sub.user_id} upgraded to {plan}")


async def _handle_invoice_paid(db: AsyncSession, invoice: dict):
    customer_id = invoice.get("customer")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    sub.status = "active"
    # Update period end from subscription
    stripe_sub_id = invoice.get("subscription")
    if stripe_sub_id:
        try:
            stripe_sub = await asyncio.to_thread(stripe.Subscription.retrieve, stripe_sub_id)
            sub.current_period_end = datetime.fromtimestamp(
                stripe_sub.current_period_end, tz=timezone.utc
            )
        except Exception:
            pass
    await db.commit()


async def _handle_payment_failed(db: AsyncSession, invoice: dict):
    customer_id = invoice.get("customer")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "past_due"
        await db.commit()
        logger.warning(f"Payment failed for user {sub.user_id}")


async def _handle_subscription_updated(db: AsyncSession, stripe_sub: dict):
    customer_id = stripe_sub.get("customer")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        return

    # Determine plan from price ID
    _init_stripe()
    items = stripe_sub.get("items", {}).get("data", [])
    if items:
        price_id = items[0].get("price", {}).get("id", "")
        sub.plan = PRICE_TO_PLAN.get(price_id, sub.plan)

    sub.status = stripe_sub.get("status", sub.status)
    period_end = stripe_sub.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, stripe_sub: dict):
    customer_id = stripe_sub.get("customer")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.plan = "basic"
        sub.status = "canceled"
        sub.stripe_subscription_id = None
        await db.commit()
        logger.info(f"User {sub.user_id} subscription canceled → basic")
