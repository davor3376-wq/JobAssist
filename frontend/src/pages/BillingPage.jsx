import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, ExternalLink, Zap, AlertCircle, Star, Rocket, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

import { CardSkeleton } from "../components/PageSkeleton";
import { billingApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../utils/billingState";

// ─── Linear usage bar (color-coded) ──────────────────────────────────────────
// blue ≤ 60% · yellow 60–79% · red ≥ 80% (atLimit = red with "Limit erreicht")
function UsageBar({ feature, used, limit }) {
  const { label, unlimited, pct, displayLimit } = getUsageBarState(feature, used, limit);
  const isAtLimit = !unlimited && pct >= 100;
  const isWarn    = !unlimited && pct >= 80 && !isAtLimit;

  const barColor = isAtLimit ? "bg-red-500" : isWarn ? "bg-amber-400" : "bg-blue-500";
  const textColor = isAtLimit ? "text-red-600" : isWarn ? "text-amber-600" : "text-slate-900";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-900 truncate">{label}</span>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {isAtLimit && (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-500">
              <AlertCircle className="h-2.5 w-2.5" />
              Limit
            </span>
          )}
          {isWarn && !isAtLimit && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
              Fast voll
            </span>
          )}
          <span className={`text-xs font-semibold ${textColor}`}>
            {unlimited ? "∞" : `${used} / ${displayLimit}`}
          </span>
        </div>
      </div>
      {/* Track */}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: unlimited ? "0%" : `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Pro & Max benefits list ──────────────────────────────────────────────────
const PLAN_BENEFITS = [
  { label: "Mehr KI-Nachrichten pro Monat",       sub: "Deutlich höheres Nachrichtenlimit" },
  { label: "20 Lebenslauf-Analysen / Monat",       sub: "KI-Feedback zu deinen Unterlagen" },
  { label: "Bis zu 10 Job-Alerts",                 sub: "Automatisch passende Stellen" },
  { label: "Mehr Jobsuchen täglich",                sub: "Kein frühzeitiges Tageslimit" },
  { label: "Prioritäts-Support",                   sub: "Schnellere Antwortzeiten" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function BillingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    let didToast = false;
    if (params.get("success") === "true") {
      toast.success("Upgrade erfolgreich! Willkommen bei deinem neuen Plan.");
      didToast = true;
    }
    if (params.get("canceled") === "true") {
      toast("Checkout abgebrochen.");
      didToast = true;
    }
    if (didToast) {
      const cleanUrl = getCleanBillingUrl(window.location.pathname, window.location.hash);
      window.history.replaceState({}, "", cleanUrl);
    }
  }, [params]);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview().then((r) => {
      try { localStorage.setItem("billing", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("billing");
        return saved ? JSON.parse(saved) : undefined;
      } catch { return undefined; }
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: true,
  });

  const { data: initData } = useQuery({ queryKey: ["init"] });

  const handleManage = async () => {
    try {
      const res = await billingApi.createPortal();
      window.location.href = res.data.portal_url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Öffnen der Abonnement-Verwaltung"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <div className="mb-2 h-7 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const usage = initData?.usage || data?.usage || [];
  const planName = getPlanName(sub?.plan || initData?.plan);
  const isPaid = sub?.plan && sub.plan !== "basic";
  const isMax = sub?.plan === "max" || sub?.plan === "enterprise";

  // Next milestone: first feature that's nearest to its limit
  const nextMilestone = usage.length
    ? [...usage]
        .filter((item) => item.limit > 0 && item.limit !== -1)
        .sort((a, b) => (b.used / b.limit) - (a.used / a.limit))[0]
    : null;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abrechnung</h1>
        <p className="mt-1 text-sm text-slate-500">Verwalte deinen Plan und deine Nutzung.</p>
      </div>

      {/* ── 3-column layout ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Col 1 — Subscription management */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aktiver Plan</p>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{planName}</h2>
              </div>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {isPaid
                ? `Aktiv bis ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("de-AT") : "—"}`
                : "Kostenloses Konto — auf Basis-Limits beschränkt"}
            </p>

            <div className="space-y-2">
              {isPaid && (
                <button
                  onClick={handleManage}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abo verwalten
                </button>
              )}
              {!isMax && (
                <button
                  onClick={() => navigate("/pricing")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  <Zap className="h-4 w-4" />
                  Upgrade auf Pro
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Zahlungsmethoden */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800">Zahlungsmethoden</p>
            </div>
            {isPaid ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-500 tracking-wider">KARTE</span>
                  <span className="text-sm text-slate-700">•••• {sub?.last4 || "****"}</span>
                </div>
                <button onClick={handleManage} className="text-xs font-semibold text-blue-600 hover:text-blue-700">Bearbeiten</button>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Keine Zahlungsmethode hinterlegt — kostenloser Plan.</p>
            )}
          </div>

          {/* Dein nächster Meilenstein */}
          {nextMilestone && (
            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <p className="text-sm font-semibold text-slate-800">Nächster Meilenstein</p>
              </div>
              <p className="text-xs text-slate-500 mb-2">Am meisten genutzt diesen Monat:</p>
              <UsageBar {...nextMilestone} />
              {!isMax && (
                <p className="mt-3 text-xs text-slate-400">
                  Upgrade auf Pro für mehr Kapazität und unbegrenzte KI-Nutzung.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Col 2 — Usage Status */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-sm font-bold text-slate-900">Nutzungs-Status</h3>
          <p className="mb-4 text-xs text-slate-500">Aktueller Verbrauch in diesem Zeitraum</p>

          {usage.length === 0 ? (
            <p className="text-xs text-slate-400">Keine Nutzungsdaten verfügbar.</p>
          ) : (
            <div className="space-y-4">
              {usage.map((item) => (
                <UsageBar key={item.feature} {...item} />
              ))}
            </div>
          )}
        </div>

        {/* Col 3 — Premium benefits */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500">
              <Star className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Pro & Max Vorteile</h3>
              <p className="text-[11px] text-slate-500">Verfügbar mit Pro oder Max</p>
            </div>
          </div>

          <ul className="space-y-3 mb-5">
            {PLAN_BENEFITS.map((benefit) => (
              <li key={benefit.label} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{benefit.label}</p>
                  <p className="text-[11px] text-slate-500">{benefit.sub}</p>
                </div>
              </li>
            ))}
          </ul>

          {!isMax && (
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-semibold text-blue-700">Upgrade jetzt</p>
              </div>
              <p className="text-xs text-slate-600 mb-3">
                Schalte alle Pro-Features frei und bewirb dich ohne Limits.
              </p>
              <button
                onClick={() => navigate("/pricing")}
                className="w-full rounded-xl bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Pläne vergleichen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
