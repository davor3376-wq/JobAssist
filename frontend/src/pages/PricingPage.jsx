import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Star, Zap, Crown, Building2, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { billingApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import toast from "react-hot-toast";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen / Monat",
  cover_letter: "Anschreiben / Monat",
  job_alerts: "Aktive Job-Alerts",
  ai_chat: "KI-Nachrichten / Monat",
  job_search: "Jobsuche / Tag",
};

function formatLimit(v) {
  return v === -1 ? "Unbegrenzt" : v;
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
    price: "14,99",
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
    if (!token) { navigate("/register"); return; }
    if (planKey === "enterprise") {
      window.location.href = "mailto:kontakt@jobassist.app?subject=Enterprise-Anfrage";
      return;
    }
    setLoadingPlan(planKey);
    try {
      const res = await billingApi.createCheckout(planKey);
      window.location.href = res.data.checkout_url;
    } catch {
      toast.error("Fehler beim Starten des Checkout-Prozesses");
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Back button */}
      {token && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        {/* Header */}
        <div className="text-center mb-14 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold tracking-wider uppercase px-4 py-1.5 rounded-full mb-5">
            <Zap className="w-3.5 h-3.5" /> Preise
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Finde den passenden Plan
          </h1>
          <p className="text-gray-500 text-base md:text-lg max-w-md mx-auto leading-relaxed">
            Starte kostenlos und upgrade jederzeit, wenn du mehr brauchst.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch animate-slide-up" style={{ animationDelay: "100ms" }}>
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const Icon = plan.icon;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl border-2 flex flex-col transition-all duration-300 hover:shadow-xl ${
                  plan.highlighted
                    ? `${cardBorder[plan.color]} shadow-xl shadow-blue-100/50`
                    : `${cardBorder[plan.color]} shadow-sm`
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className={`text-[11px] font-bold px-3.5 py-1 rounded-full text-white shadow-md whitespace-nowrap ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-blue-500 to-blue-600"
                        : "bg-gradient-to-r from-purple-500 to-purple-600"
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-6 flex flex-col flex-1">
                  {/* Icon + Title */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconBg[plan.color]}`}>
                      <Icon className={`w-5 h-5 ${iconFg[plan.color]}`} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900">{plan.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{plan.subtitle}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[40px] font-extrabold leading-none text-gray-900 tracking-tight">
                          {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                        </span>
                        {plan.period && (
                          <span className="text-sm text-gray-400 font-medium">{plan.period}</span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-baseline">
                        <span className="text-2xl font-bold text-gray-900">Auf Anfrage</span>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 mb-5" />

                  {/* Features */}
                  <ul className="space-y-3 flex-1 mb-6">
                    {Object.entries(plan.limits).map(([feat, val]) => (
                      <li key={feat} className="flex items-start gap-2.5 text-[13px] leading-snug">
                        <div className="w-4.5 h-4.5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span>
                          <span className="font-semibold text-gray-800">{formatLimit(val)}</span>{" "}
                          <span className="text-gray-500">{FEATURE_LABELS[feat]}</span>
                        </span>
                      </li>
                    ))}
                    {plan.extras.map((extra) => (
                      <li key={extra} className="flex items-start gap-2.5 text-[13px] leading-snug text-gray-400">
                        <div className="w-4.5 h-4.5 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-gray-300" />
                        </div>
                        {extra}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                    >
                      Aktueller Plan
                    </button>
                  ) : plan.key === "basic" ? (
                    <button
                      disabled
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-50 text-gray-300"
                    >
                      Inklusive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loadingPlan === plan.key}
                      className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 ${ctaStyle[plan.key]}`}
                    >
                      {loadingPlan === plan.key ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Wird geladen...</>
                      ) : (
                        <>{plan.key === "enterprise" ? "Kontaktiere uns" : "Jetzt upgraden"}<ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Alle Preise inkl. MwSt. Jederzeit kündbar. Keine versteckten Kosten.
        </p>
      </div>
    </div>
  );
}
