import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, CreditCard, ExternalLink, Zap, AlertCircle,
  CheckCircle2, Rocket, Crown, Sparkles, Shield, Building2, Star,
} from "lucide-react";
import toast from "react-hot-toast";

import { CardSkeleton } from "../components/PageSkeleton";
import { billingApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../utils/billingState";

// ─── Plan definitions — sourced from pricing page screenshot ──────────────────
// soon:true = grayed-out "coming soon" feature (shown muted, not crossed out)
const PLANS = [
  {
    key: "basic",
    name: "Basic",
    sub: "Zum Ausprobieren",
    price: "Gratis",
    period: "",
    iconCls: "from-slate-400 to-slate-500",
    borderCls: "border-slate-200",
    badgeCls: "",
    btnCls: "border border-slate-200 text-slate-500 cursor-default bg-slate-50",
    Icon: Star,
    features: [
      { label: "5 Lebenslauf-Analysen / Monat" },
      { label: "5 Anschreiben / Monat" },
      { label: "2 Aktive Job-Alerts" },
      { label: "15 KI-Nachrichten / Monat" },
      { label: "5 Jobsuche / Tag" },
      { label: "Lebenslauf hochladen",    soon: true },
      { label: "Job-Suche",               soon: true },
      { label: "Pipeline-Tracking",       soon: true },
    ],
  },
  {
    key: "pro",
    name: "Pro",
    sub: "Für aktive Bewerber",
    price: "€4,99",
    period: "/ Monat",
    badge: "Beliebt",
    iconCls: "from-blue-500 to-indigo-600",
    borderCls: "border-blue-400",
    badgeCls: "bg-blue-600 text-white",
    btnCls: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200",
    Icon: Zap,
    features: [
      { label: "15 Lebenslauf-Analysen / Monat" },
      { label: "25 Anschreiben / Monat" },
      { label: "10 Aktive Job-Alerts" },
      { label: "200 KI-Nachrichten / Monat" },
      { label: "20 Jobsuche / Tag" },
      { label: "Prioritäts-Support",      soon: true },
      { label: "Alles aus Basic",         soon: true },
    ],
  },
  {
    key: "max",
    name: "Max",
    sub: "Unbegrenzte Power",
    price: "€14,99",
    period: "/ Monat",
    badge: "Bestes Angebot",
    iconCls: "from-violet-500 to-purple-600",
    borderCls: "border-violet-400",
    badgeCls: "bg-violet-600 text-white",
    btnCls: "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200",
    Icon: Crown,
    features: [
      { label: "Unbegrenzt Lebenslauf-Analysen / Monat" },
      { label: "Unbegrenzt Anschreiben / Monat" },
      { label: "Unbegrenzt Aktive Job-Alerts" },
      { label: "Unbegrenzt KI-Nachrichten / Monat" },
      { label: "Unbegrenzt Jobsuche / Tag" },
      { label: "24h Support",             soon: true },
      { label: "Alles aus Pro",           soon: true },
      { label: "Unbegrenzte Nutzung",     soon: true },
    ],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    sub: "Für Teams & Agenturen",
    price: "Auf Anfrage",
    period: "",
    iconCls: "from-slate-500 to-slate-700",
    borderCls: "border-slate-300",
    badgeCls: "",
    btnCls: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
    btnLabel: "Kontaktiere uns",
    Icon: Building2,
    features: [
      { label: "Unbegrenzt Lebenslauf-Analysen / Monat" },
      { label: "Unbegrenzt Anschreiben / Monat" },
      { label: "Unbegrenzt Aktive Job-Alerts" },
      { label: "Unbegrenzt KI-Nachrichten / Monat" },
      { label: "Unbegrenzt Jobsuche / Tag" },
      { label: "Dedizierter Manager",     soon: true },
      { label: "Custom Integrationen",    soon: true },
      { label: "SLA & Compliance",        soon: true },
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
    <div className={`relative flex flex-col rounded-2xl border-2 bg-white p-5 transition-shadow hover:shadow-lg ${
      isCurrent ? plan.borderCls + " shadow-md" : "border-slate-100"
    }`}>
      {/* Badge (Beliebt / Bestes Angebot) */}
      {plan.badge && (
        <span className={`absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold shadow-sm whitespace-nowrap ${plan.badgeCls}`}>
          {plan.badge}
        </span>
      )}
      {/* Current plan indicator */}
      {isCurrent && (
        <span className="absolute -top-3.5 right-4 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm">
          Aktuell
        </span>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${plan.iconCls}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">{plan.name}</h3>
          <p className="text-[11px] text-slate-400">{plan.sub}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
        {plan.period && <span className="text-sm text-slate-400">{plan.period}</span>}
      </div>

      {/* Features */}
      <ul className="flex-1 space-y-2 mb-5">
        {plan.features.map((f) => (
          <li key={f.label} className="flex items-start gap-2">
            <CheckCircle2 className={`mt-0.5 h-4 w-4 flex-shrink-0 ${f.soon ? "text-slate-300" : "text-emerald-500"}`} />
            <span className={`text-xs leading-snug ${f.soon ? "text-slate-400" : "text-slate-700"}`}>
              {f.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA button */}
      {isCurrent ? (
        <div className="w-full rounded-xl bg-slate-100 py-2.5 text-center text-sm font-semibold text-slate-500">
          Aktueller Plan
        </div>
      ) : (
        <button
          onClick={onUpgrade}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${plan.btnCls}`}
          disabled={!onUpgrade}
        >
          {plan.btnLabel || "Jetzt upgraden"}
          {!plan.btnLabel && <ArrowRight className="h-4 w-4" />}
        </button>
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

        {/* Cards: 1-col mobile → 2-col sm → 4-col xl */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              isCurrent={plan.key === planKey}
              onUpgrade={() => navigate("/pricing")}
            />
          ))}
        </div>

        {/* Feature comparison table — scrollable on all screen sizes */}
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.key} className={`px-3 py-4 text-center text-xs font-bold ${p.key === planKey ? "text-blue-600" : "text-slate-600"}`}>
                    <span className="flex flex-col items-center gap-0.5">
                      {p.key === planKey && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                      {p.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { row: "Lebenslauf-Analysen / Monat", vals: ["5", "15", "Unbegrenzt", "Unbegrenzt"] },
                { row: "Anschreiben / Monat",          vals: ["5", "25", "Unbegrenzt", "Unbegrenzt"] },
                { row: "Aktive Job-Alerts",             vals: ["2", "10", "Unbegrenzt", "Unbegrenzt"] },
                { row: "KI-Nachrichten / Monat",       vals: ["15", "200", "Unbegrenzt", "Unbegrenzt"] },
                { row: "Jobsuche / Tag",                vals: ["5", "20", "Unbegrenzt", "Unbegrenzt"] },
                { row: "Prioritäts-Support",            vals: [null, null, null, true], soon: [false, true, true, false] },
                { row: "24h Support",                   vals: [null, null, null, true], soon: [false, false, true, false] },
                { row: "Dedizierter Manager",           vals: [null, null, null, null], soon: [false, false, false, true] },
              ].map(({ row, vals, soon = [] }, ri) => (
                <tr key={row} className={ri % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                  <td className="px-4 py-3 text-xs sm:text-sm font-medium text-slate-700 whitespace-nowrap">{row}</td>
                  {vals.map((v, ci) => {
                    const isCur = PLANS[ci].key === planKey;
                    const isSoon = soon[ci];
                    return (
                      <td key={ci} className={`px-3 py-3 text-center ${isCur ? "bg-blue-50/30" : ""}`}>
                        {v === true ? (
                          <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : v === null ? (
                          isSoon
                            ? <span className="text-[10px] font-semibold text-slate-300">Bald</span>
                            : <span className="text-slate-200 text-base leading-none">—</span>
                        ) : (
                          <span className={`text-xs sm:text-sm font-semibold ${isCur ? "text-blue-700" : "text-slate-700"}`}>{v}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Price row */}
              <tr className="border-t-2 border-slate-100 bg-slate-50">
                <td className="px-4 py-3.5 text-xs sm:text-sm font-bold text-slate-800">Preis / Monat</td>
                {PLANS.map((p) => (
                  <td key={p.key} className={`px-3 py-3.5 text-center ${p.key === planKey ? "bg-blue-50/30" : ""}`}>
                    <span className={`text-sm sm:text-base font-bold ${p.key === planKey ? "text-blue-700" : "text-slate-800"}`}>{p.price}</span>
                    {p.period && <span className="text-[10px] text-slate-400 ml-0.5">{p.period}</span>}
                  </td>
                ))}
              </tr>
              {/* CTA row */}
              <tr className="bg-white">
                <td className="px-4 py-3" />
                {PLANS.map((p) => (
                  <td key={p.key} className={`px-3 py-3 ${p.key === planKey ? "bg-blue-50/30" : ""}`}>
                    {p.key === planKey ? (
                      <div className="rounded-lg bg-slate-100 py-1.5 text-center text-[11px] font-semibold text-slate-500">Aktuell</div>
                    ) : (
                      <button
                        onClick={() => navigate("/pricing")}
                        className={`w-full rounded-lg py-1.5 text-[11px] font-semibold transition-all ${p.btnCls}`}
                      >
                        {p.btnLabel || "Upgraden"}
                      </button>
                    )}
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
