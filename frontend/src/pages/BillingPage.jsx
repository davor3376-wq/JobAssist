import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, CreditCard, ExternalLink, Zap, AlertCircle,
  CheckCircle2, XCircle, Rocket, Crown, Sparkles, Shield,
} from "lucide-react";
import toast from "react-hot-toast";

import { CardSkeleton } from "../components/PageSkeleton";
import { billingApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../utils/billingState";

// ─── Plan definitions (static) ────────────────────────────────────────────────
const PLANS = [
  {
    key: "basic",
    name: "Basic",
    price: "0",
    period: "kostenlos",
    iconCls: "from-slate-400 to-slate-500",
    borderCls: "border-slate-200",
    badgeCls: "bg-slate-100 text-slate-600",
    btnCls: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    Icon: Shield,
    features: [
      { label: "KI-Nachrichten / Monat",   value: "20" },
      { label: "Lebenslauf-Analysen",       value: "3" },
      { label: "Job-Alerts",                value: "1" },
      { label: "Jobsuchen täglich",         value: "10" },
      { label: "Anschreiben",               value: "3" },
      { label: "Prioritäts-Support",        value: false },
      { label: "Interview-Simulator",       value: true },
      { label: "Assessment Center",         value: true },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "9,99€",
    period: "/ Monat",
    badge: "Beliebt",
    iconCls: "from-indigo-500 to-violet-600",
    borderCls: "border-indigo-300",
    badgeCls: "bg-indigo-600 text-white",
    btnCls: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
    Icon: Sparkles,
    features: [
      { label: "KI-Nachrichten / Monat",   value: "200" },
      { label: "Lebenslauf-Analysen",       value: "20" },
      { label: "Job-Alerts",                value: "10" },
      { label: "Jobsuchen täglich",         value: "100" },
      { label: "Anschreiben",               value: "Unbegrenzt" },
      { label: "Prioritäts-Support",        value: true },
      { label: "Interview-Simulator",       value: true },
      { label: "Assessment Center",         value: true },
    ],
  },
  {
    key: "max",
    name: "Max",
    price: "19,99€",
    period: "/ Monat",
    iconCls: "from-amber-400 to-orange-500",
    borderCls: "border-amber-300",
    badgeCls: "bg-amber-500 text-white",
    btnCls: "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-md shadow-amber-200",
    Icon: Crown,
    features: [
      { label: "KI-Nachrichten / Monat",   value: "Unbegrenzt" },
      { label: "Lebenslauf-Analysen",       value: "Unbegrenzt" },
      { label: "Job-Alerts",                value: "Unbegrenzt" },
      { label: "Jobsuchen täglich",         value: "Unbegrenzt" },
      { label: "Anschreiben",               value: "Unbegrenzt" },
      { label: "Prioritäts-Support",        value: true },
      { label: "Interview-Simulator",       value: true },
      { label: "Assessment Center",         value: true },
    ],
  },
];

// ─── SVG donut gauge ──────────────────────────────────────────────────────────
function DonutGauge({ feature, used, limit }) {
  const { label, unlimited, pct, displayLimit } = getUsageBarState(feature, used, limit);
  const isAtLimit = !unlimited && pct >= 100;
  const isWarn    = !unlimited && pct >= 80 && !isAtLimit;
  const stroke    = isAtLimit ? "#ef4444" : isWarn ? "#f59e0b" : "#6366f1";
  const trackClr  = isAtLimit ? "#fee2e2" : isWarn ? "#fef3c7" : "#e0e7ff";
  const r = 30;
  const circ = 2 * Math.PI * r;
  const fill = unlimited ? 0 : Math.min(1, pct / 100);

  return (
    <div className="flex flex-col items-center gap-2 p-3 sm:p-4">
      <div className="relative">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90" aria-hidden="true">
          <circle cx="40" cy="40" r={r} fill="none" stroke={trackClr} strokeWidth="7" />
          {!unlimited && (
            <circle
              cx="40" cy="40" r={r}
              fill="none" stroke={stroke} strokeWidth="7"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - fill)}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isAtLimit && <AlertCircle className="h-4 w-4 text-red-500" />}
          {!isAtLimit && (
            <span className="text-sm font-bold text-slate-900">
              {unlimited ? "∞" : `${Math.round(Math.min(100, pct))}%`}
            </span>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-[11px] sm:text-xs font-semibold text-slate-700 leading-tight">{label}</p>
        <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
          {unlimited ? "Unbegrenzt" : `${used} / ${displayLimit}`}
        </p>
        {isAtLimit && (
          <span className="mt-1 inline-block rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-500">LIMIT</span>
        )}
        {isWarn && !isAtLimit && (
          <span className="mt-1 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">FAST VOLL</span>
        )}
      </div>
    </div>
  );
}

// ─── Horizontal usage bar with percentage label ───────────────────────────────
function UsageRow({ feature, used, limit }) {
  const { label, unlimited, pct, displayLimit } = getUsageBarState(feature, used, limit);
  const isAtLimit = !unlimited && pct >= 100;
  const isWarn    = !unlimited && pct >= 80 && !isAtLimit;
  const barColor  = isAtLimit ? "bg-red-500" : isWarn ? "bg-amber-400" : "bg-indigo-500";
  const pctLabel  = unlimited ? "∞" : `${Math.round(Math.min(100, pct))}%`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs sm:text-sm font-medium text-slate-700 truncate">{label}</span>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-[11px] text-slate-400">{unlimited ? "∞" : `${used} / ${displayLimit}`}</span>
          <span className={`min-w-[36px] text-right text-xs font-bold ${isAtLimit ? "text-red-600" : isWarn ? "text-amber-600" : "text-indigo-600"}`}>
            {pctLabel}
          </span>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: unlimited ? "4px" : `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

// ─── Plan comparison card ─────────────────────────────────────────────────────
function PlanCard({ plan, isCurrent, onUpgrade }) {
  const { Icon } = plan;
  return (
    <div className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 sm:p-6 transition-shadow hover:shadow-lg ${
      isCurrent ? plan.borderCls + " shadow-md" : "border-slate-100"
    }`}>
      {plan.badge && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-[11px] font-bold shadow-sm ${plan.badgeCls}`}>
          {plan.badge}
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-3 py-0.5 text-[11px] font-bold text-white shadow-sm">
          Aktuell
        </span>
      )}

      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${plan.iconCls}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>

      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl sm:text-3xl font-bold text-slate-900">{plan.price}</span>
        <span className="text-sm text-slate-400">{plan.period}</span>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2.5">
            {f.value === false ? (
              <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
            )}
            <span className="text-xs sm:text-sm text-slate-600">
              {f.value === true || f.value === false
                ? f.label
                : <><span className="font-semibold text-slate-800">{f.value}</span> {f.label}</>
              }
            </span>
          </li>
        ))}
      </ul>

      {!isCurrent && onUpgrade && (
        <button
          onClick={onUpgrade}
          className={`mt-6 w-full rounded-xl py-2.5 text-sm font-semibold transition-all ${plan.btnCls}`}
        >
          {plan.key === "basic" ? "Aktueller Plan" : `Zu ${plan.name} wechseln`}
        </button>
      )}
      {isCurrent && (
        <div className="mt-6 w-full rounded-xl bg-emerald-50 py-2.5 text-center text-sm font-semibold text-emerald-600">
          ✓ Dein aktueller Plan
        </div>
      )}
    </div>
  );
}

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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton lines={3} />
          <CardSkeleton lines={5} />
          <CardSkeleton lines={4} />
        </div>
      </div>
    );
  }

  const sub      = data?.subscription;
  const usage    = initData?.usage || data?.usage || [];
  const planKey  = sub?.plan || initData?.plan || "basic";
  const planName = getPlanName(planKey);
  const isPaid   = planKey && planKey !== "basic";
  const isMax    = planKey === "max" || planKey === "enterprise";
  const currentPlan = PLANS.find((p) => p.key === planKey) || PLANS[0];

  const periodEnd = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString("de-AT", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Overall usage health: average pct across limited features
  const limitedItems = usage.filter((u) => u.limit > 0 && u.limit !== -1);
  const avgUsagePct  = limitedItems.length
    ? Math.round(limitedItems.reduce((s, u) => s + Math.min(100, (u.used / u.limit) * 100), 0) / limitedItems.length)
    : 0;
  const healthColor  = avgUsagePct >= 80 ? "text-red-600" : avgUsagePct >= 60 ? "text-amber-600" : "text-emerald-600";
  const healthLabel  = avgUsagePct >= 80 ? "Kritisch" : avgUsagePct >= 60 ? "Mittel" : "Gut";

  return (
    <div className="max-w-5xl space-y-8 animate-slide-up">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Abrechnung</h1>
        <p className="mt-1 text-sm text-slate-500">Verwalte deinen Plan, deine Nutzung und Zahlungsmethoden.</p>
      </div>

      {/* ── Plan hero card ───────────────────────────────────────────────────── */}
      <div className={`relative overflow-hidden rounded-2xl border-2 bg-white p-5 sm:p-6 shadow-sm ${currentPlan.borderCls}`}>
        {/* Gradient glow */}
        <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${currentPlan.iconCls} opacity-10 blur-3xl`} />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${currentPlan.iconCls} shadow-md`}>
              <currentPlan.Icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aktiver Plan</p>
              <h2 className="mt-0.5 text-2xl sm:text-3xl font-bold text-slate-900">{planName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {isPaid && periodEnd
                  ? `Verlängert automatisch am ${periodEnd}`
                  : "Kostenloses Konto — auf Basis-Limits beschränkt"}
              </p>
              {usage.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-slate-500">Gesamtnutzung:</span>
                  <span className={`text-sm font-bold ${healthColor}`}>{avgUsagePct}% — {healthLabel}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            {isPaid && (
              <button
                onClick={handleManage}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                Abo verwalten
              </button>
            )}
            {!isMax && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 whitespace-nowrap"
              >
                <Zap className="h-4 w-4" />
                Upgrade auf Pro
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {isPaid && sub?.last4 && (
              <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <CreditCard className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600">•••• {sub.last4}</span>
                <button onClick={handleManage} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 ml-1">Ändern</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Usage: donut gauges ───────────────────────────────────────────────── */}
      {usage.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Deine Nutzung</h3>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">Aktueller Verbrauch in diesem Abrechnungszeitraum</p>
            </div>
            <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              avgUsagePct >= 80 ? "bg-red-50 text-red-600" :
              avgUsagePct >= 60 ? "bg-amber-50 text-amber-600" :
              "bg-emerald-50 text-emerald-600"
            }`}>
              Ø {avgUsagePct}%
            </span>
          </div>

          {/* Donut gauges — 2 cols on mobile, 3 on sm, up to 6 on lg */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-slate-50 border border-slate-50 rounded-2xl overflow-hidden">
            {usage.map((item) => (
              <DonutGauge key={item.feature} {...item} />
            ))}
          </div>

          {/* Horizontal bar chart below gauges */}
          <div className="mt-6 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Detail-Übersicht</p>
            {usage.map((item) => (
              <UsageRow key={item.feature} {...item} />
            ))}
          </div>

          {!isMax && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Rocket className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-indigo-700 font-medium">
                  Upgrade für mehr Kapazität und unbegrenzte KI-Nutzung.
                </p>
              </div>
              <button
                onClick={() => navigate("/pricing")}
                className="flex-shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                Mehr erfahren
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Plan comparison ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="mb-4 text-sm sm:text-base font-bold text-slate-900">Planvergleich</h3>

        {/* Cards — horizontal scroll on mobile, grid on desktop */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={plan.key === planKey}
              onUpgrade={plan.key !== "basic" && plan.key !== planKey && !isMax
                ? () => navigate("/pricing")
                : null}
            />
          ))}
        </div>

        {/* Feature comparison table — desktop only, hidden on mobile */}
        <div className="mt-6 hidden sm:block overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400 w-2/5">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.key} className={`px-4 py-4 text-center text-sm font-bold ${p.key === planKey ? "text-indigo-600" : "text-slate-700"}`}>
                    <span className="flex items-center justify-center gap-1.5">
                      {p.key === planKey && <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />}
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PLANS[0].features.map((f, i) => (
                <tr key={f.label} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-700">{f.label}</td>
                  {PLANS.map((p) => {
                    const v = p.features[i].value;
                    return (
                      <td key={p.key} className={`px-4 py-3.5 text-center ${p.key === planKey ? "bg-indigo-50/40" : ""}`}>
                        {v === true  ? <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" /> :
                         v === false ? <XCircle      className="mx-auto h-4 w-4 text-slate-300" /> :
                         <span className={`text-sm font-semibold ${p.key === planKey ? "text-indigo-700" : "text-slate-700"}`}>{v}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Pricing row */}
              <tr className="bg-slate-50 border-t-2 border-slate-200">
                <td className="px-5 py-4 text-sm font-bold text-slate-800">Preis</td>
                {PLANS.map((p) => (
                  <td key={p.key} className={`px-4 py-4 text-center ${p.key === planKey ? "bg-indigo-50/40" : ""}`}>
                    <span className={`text-base font-bold ${p.key === planKey ? "text-indigo-700" : "text-slate-800"}`}>{p.price}</span>
                    <span className="text-xs text-slate-400 ml-1">{p.period}</span>
                  </td>
                ))}
              </tr>
              {/* CTA row */}
              <tr className="bg-white">
                <td className="px-5 py-4" />
                {PLANS.map((p) => (
                  <td key={p.key} className={`px-4 py-4 ${p.key === planKey ? "bg-indigo-50/40" : ""}`}>
                    {p.key === planKey ? (
                      <div className="w-full rounded-xl bg-emerald-50 py-2 text-center text-xs font-semibold text-emerald-600">✓ Aktuell</div>
                    ) : p.key !== "basic" && !isMax ? (
                      <button
                        onClick={() => navigate("/pricing")}
                        className={`w-full rounded-xl py-2 text-xs font-semibold transition-all ${p.btnCls}`}
                      >
                        Wechseln
                      </button>
                    ) : null}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom: payment + no-open-invoices ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Payment method */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-800">Zahlungsmethode</p>
          </div>
          {isPaid && sub?.last4 ? (
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 tracking-wider">VISA</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">•••• •••• •••• {sub.last4}</p>
                  <p className="text-[11px] text-slate-400">Standardzahlungsmethode</p>
                </div>
              </div>
              <button onClick={handleManage} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                Bearbeiten
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
              <CreditCard className="h-5 w-5 text-slate-300" />
              <div>
                <p className="text-sm font-medium text-slate-500">Keine Zahlungsmethode</p>
                <p className="text-xs text-slate-400">Kostenloser Plan — keine Karte erforderlich.</p>
              </div>
            </div>
          )}
        </div>

        {/* Billing summary */}
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-slate-400" />
            <p className="text-sm font-bold text-slate-800">Zusammenfassung</p>
          </div>
          <dl className="space-y-2.5">
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Plan</dt>
              <dd className="font-semibold text-slate-800">{planName}</dd>
            </div>
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Status</dt>
              <dd className={`font-semibold ${isPaid ? "text-emerald-600" : "text-slate-500"}`}>
                {isPaid ? "Aktiv" : "Kostenlos"}
              </dd>
            </div>
            {periodEnd && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Nächste Verlängerung</dt>
                <dd className="font-semibold text-slate-800">{periodEnd}</dd>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <dt className="text-slate-500">Monatlicher Betrag</dt>
              <dd className="font-semibold text-slate-800">
                {PLANS.find((p) => p.key === planKey)?.price || "0"}{" "}
                <span className="font-normal text-slate-400">{isPaid ? "/ Monat" : ""}</span>
              </dd>
            </div>
          </dl>
          {isPaid && (
            <button
              onClick={handleManage}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ExternalLink className="h-4 w-4" />
              Rechnungen & Verlauf
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
