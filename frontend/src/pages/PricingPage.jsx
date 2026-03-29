import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Star, Zap, Crown, Building2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { billingApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import { getApiErrorMessage } from "../utils/apiError";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen / Monat",
  cover_letter: "Anschreiben / Monat",
  job_alerts: "Aktive Job-Alerts",
  ai_chat: "KI-Nachrichten / Monat",
  job_search: "Jobsuche / Tag",
};

function formatLimit(value) {
  return value === -1 ? "Unbegrenzt" : value;
}

const plans = [
  {
    key: "basic",
    name: "Basic",
    subtitle: "Zum Ausprobieren",
    price: "0",
    period: "",
    icon: Star,
    color: "gray",
    highlighted: false,
    badge: null,
    limits: { cv_analysis: 5, cover_letter: 5, job_alerts: 2, ai_chat: 15, job_search: 5 },
    extras: ["Lebenslauf hochladen", "Job-Suche", "Pipeline-Tracking"],
  },
  {
    key: "pro",
    name: "Pro",
    subtitle: "Für aktive Bewerber",
    price: "4,99",
    period: "/ Monat",
    icon: Zap,
    color: "blue",
    highlighted: true,
    badge: "Beliebt",
    limits: { cv_analysis: 15, cover_letter: 25, job_alerts: 10, ai_chat: 200, job_search: 20 },
    extras: ["Prioritäts-Support", "Alles aus Basic"],
  },
  {
    key: "max",
    name: "Max",
    subtitle: "Unbegrenzte Power",
    price: "7,99",
    period: "/ Monat",
    icon: Crown,
    color: "purple",
    highlighted: false,
    badge: "Bestes Angebot",
    limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1, job_search: -1 },
    extras: ["24h Support", "Alles aus Pro", "Unbegrenzte Nutzung"],
  },
  {
    key: "enterprise",
    name: "Enterprise",
    subtitle: "Für Teams & Agenturen",
    price: null,
    period: "",
    icon: Building2,
    color: "slate",
    highlighted: false,
    badge: null,
    limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1, job_search: -1 },
    extras: ["Dedizierter Manager", "Custom Integrationen", "SLA & Compliance"],
  },
];

const cardBorder = {
  gray: "border-gray-200 hover:border-gray-300",
  blue: "border-blue-500 ring-1 ring-blue-500/20",
  purple: "border-gray-200 hover:border-purple-300",
  slate: "border-gray-200 hover:border-slate-300",
};

const iconBg = {
  gray: "bg-gray-100",
  blue: "bg-blue-50",
  purple: "bg-purple-50",
  slate: "bg-slate-100",
};

const iconFg = {
  gray: "text-gray-500",
  blue: "text-blue-600",
  purple: "text-purple-600",
  slate: "text-slate-500",
};

const ctaStyle = {
  basic: "bg-gray-50 text-gray-400 cursor-default",
  pro: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30",
  max: "bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30",
  enterprise: "bg-gray-900 text-white hover:bg-gray-800",
};

export default function PricingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const currentPlan = initData?.plan || "basic";
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleUpgrade = async (planKey) => {
    if (!token) {
      navigate("/register");
      return;
    }

    if (planKey === "enterprise") {
      window.location.href = "mailto:jobassistsupport@gmail.com?subject=Enterprise-Anfrage";
      return;
    }

    setLoadingPlan(planKey);
    try {
      const res = await billingApi.createCheckout(planKey);
      window.location.href = res.data.checkout_url;
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Fehler beim Starten des Checkout-Prozesses"));
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {token && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" /> Zurück
          </button>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6">
        <div className="mb-14 text-center animate-slide-up">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-blue-700">
            <Zap className="h-3.5 w-3.5" /> Preise
          </div>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight text-gray-900 sm:text-4xl md:text-5xl">
            Finde den passenden Plan
          </h1>
          <p className="mx-auto max-w-md text-base leading-relaxed text-gray-500 md:text-lg">
            Starte kostenlos und upgrade jederzeit, wenn du mehr brauchst.
          </p>
        </div>

        <div
          className="grid animate-slide-up grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4"
          style={{ animationDelay: "100ms" }}
        >
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const Icon = plan.icon;

            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border-2 bg-white transition-all duration-300 hover:shadow-xl ${
                  plan.highlighted
                    ? `${cardBorder[plan.color]} shadow-xl shadow-blue-100/50`
                    : `${cardBorder[plan.color]} shadow-sm`
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`whitespace-nowrap rounded-full px-3.5 py-1 text-[11px] font-bold text-white shadow-md ${
                        plan.highlighted
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : "bg-gradient-to-r from-purple-500 to-purple-600"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg[plan.color]}`}>
                      <Icon className={`h-5 w-5 ${iconFg[plan.color]}`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">{plan.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">{plan.subtitle}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[40px] font-extrabold leading-none tracking-tight text-gray-900">
                          {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                        </span>
                        {plan.period && <span className="text-sm font-medium text-gray-400">{plan.period}</span>}
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">Auf Anfrage</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-5 h-px bg-gray-100" />

                  <ul className="mb-6 flex-1 space-y-3">
                    {Object.entries(plan.limits).map(([feature, value]) => (
                      <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
                          <Check className="h-3 w-3 text-green-600" />
                        </div>
                        <span>
                          <span className="font-semibold text-gray-800">{formatLimit(value)}</span>{" "}
                          <span className="text-gray-500">{FEATURE_LABELS[feature]}</span>
                        </span>
                      </li>
                    ))}
                    {plan.extras.map((extra) => (
                      <li key={extra} className="flex items-start gap-2.5 text-[13px] leading-snug text-gray-400">
                        <div className="mt-0.5 flex h-4.5 w-4.5 flex-shrink-0 items-center justify-center rounded-full bg-gray-50">
                          <Check className="h-3 w-3 text-gray-300" />
                        </div>
                        {extra}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full cursor-not-allowed rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-400"
                    >
                      Aktueller Plan
                    </button>
                  ) : plan.key === "basic" ? (
                    <button disabled className="w-full rounded-xl bg-gray-50 py-3 text-sm font-semibold text-gray-300">
                      Inklusive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loadingPlan === plan.key}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-70 ${ctaStyle[plan.key]}`}
                    >
                      {loadingPlan === plan.key ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen...
                        </>
                      ) : (
                        <>
                          {plan.key === "enterprise" ? "Kontaktiere uns" : "Jetzt upgraden"}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-gray-400">
          Keine MwSt. ausgewiesen. Jederzeit kündbar. Keine versteckten Kosten.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-gray-400">
          <Link to="/terms" className="transition-colors hover:text-gray-600">
            AGB
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-gray-600">
            Datenschutz
          </Link>
          <Link to="/impressum" className="transition-colors hover:text-gray-600">
            Impressum
          </Link>
          <Link to="/contact" className="transition-colors hover:text-gray-600">
            Kontakt
          </Link>
        </div>
      </div>
    </div>
  );
}
