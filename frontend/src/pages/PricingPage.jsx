import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Star, Zap, Building2, ArrowRight } from "lucide-react";
import { billingApi } from "../services/api";
import useAuthStore from "../hooks/useAuthStore";
import toast from "react-hot-toast";

const FEATURE_LABELS = {
  cv_analysis: "CV-Analysen / Monat",
  cover_letter: "Anschreiben / Monat",
  job_alerts: "Aktive Job-Alerts",
  ai_chat: "KI-Nachrichten / Monat",
};

const PLAN_META = {
  basic: { icon: Star, color: "gray", badge: null },
  pro: { icon: Zap, color: "blue", badge: "Beliebt" },
  max: { icon: Zap, color: "purple", badge: "Bestes Angebot" },
  enterprise: { icon: Building2, color: "slate", badge: null },
};

function formatLimit(v) {
  return v === -1 ? "Unbegrenzt" : v;
}

export default function PricingPage() {
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const currentPlan = initData?.plan || "basic";

  const handleUpgrade = async (planKey) => {
    if (!token) {
      navigate("/register");
      return;
    }
    if (planKey === "enterprise") {
      window.location.href = "mailto:kontakt@jobassist.app?subject=Enterprise-Anfrage";
      return;
    }
    try {
      const res = await billingApi.createCheckout(planKey);
      window.location.href = res.data.checkout_url;
    } catch {
      toast.error("Fehler beim Starten des Checkout-Prozesses");
    }
  };

  const plans = [
    {
      key: "basic",
      name: "Basic",
      price: "0",
      period: "Kostenlos für immer",
      limits: { cv_analysis: 2, cover_letter: 1, job_alerts: 1, ai_chat: 15 },
      extras: ["Lebenslauf hochladen", "Job-Suche", "Pipeline-Tracking"],
    },
    {
      key: "pro",
      name: "Pro",
      price: "7,99",
      period: "/ Monat",
      limits: { cv_analysis: 15, cover_letter: 10, job_alerts: 10, ai_chat: 200 },
      extras: ["Prioritäts-Support", "Alles aus Basic"],
    },
    {
      key: "max",
      name: "Max",
      price: "14,99",
      period: "/ Monat",
      limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1 },
      extras: ["24h Support", "Alles aus Pro", "Unbegrenzte Nutzung"],
    },
    {
      key: "enterprise",
      name: "Enterprise",
      price: null,
      period: "Kontaktiere uns",
      limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1 },
      extras: ["Dedizierter Manager", "Custom Integrationen", "SLA & Compliance"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Finde den passenden Plan
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Starte kostenlos. Upgrade, wenn du mehr brauchst.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const meta = PLAN_META[plan.key];
            const Icon = meta.icon;
            const isCurrent = currentPlan === plan.key;
            const isHighlighted = plan.key === "pro";

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl border-2 p-6 flex flex-col ${
                  isHighlighted ? "border-blue-500 shadow-lg shadow-blue-100" : "border-gray-200"
                }`}
              >
                {meta.badge && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white ${
                    plan.key === "pro" ? "bg-blue-500" : "bg-purple-500"
                  }`}>
                    {meta.badge}
                  </span>
                )}

                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-${meta.color}-100`}>
                  <Icon className={`w-5 h-5 text-${meta.color}-600`} />
                </div>

                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>

                <div className="mt-2 mb-4">
                  {plan.price !== null ? (
                    <span className="text-3xl font-extrabold text-gray-900">
                      {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                    </span>
                  ) : (
                    <span className="text-xl font-bold text-gray-700">Auf Anfrage</span>
                  )}
                  {plan.price !== null && plan.price !== "0" && (
                    <span className="text-gray-400 text-sm ml-1">{plan.period}</span>
                  )}
                </div>

                {/* Limits */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {Object.entries(plan.limits).map(([feat, val]) => (
                    <li key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="font-medium">{formatLimit(val)}</span>{" "}
                      <span className="text-gray-500">{FEATURE_LABELS[feat]}</span>
                    </li>
                  ))}
                  {plan.extras.map((extra) => (
                    <li key={extra} className="flex items-center gap-2 text-sm text-gray-500">
                      <Check className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      {extra}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed"
                  >
                    Aktueller Plan
                  </button>
                ) : plan.key === "basic" ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400"
                  >
                    Inklusive
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.key)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                      isHighlighted
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : plan.key === "max"
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-800 text-white hover:bg-gray-900"
                    }`}
                  >
                    {plan.key === "enterprise" ? "Kontaktiere uns" : "Upgrade"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
