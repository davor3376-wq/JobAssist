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
};

function formatLimit(v) {
  return v === -1 ? "Unbegrenzt" : v;
}

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
      limits: { cv_analysis: 2, cover_letter: 1, job_alerts: 1, ai_chat: 15 },
      extras: ["Lebenslauf hochladen", "Job-Suche", "Pipeline-Tracking"],
    },
    {
      key: "pro",
      name: "Pro",
      subtitle: "Für aktive Bewerber",
      price: "7,99",
      period: "/ Monat",
      icon: Zap,
      color: "blue",
      highlighted: true,
      badge: "Beliebt",
      limits: { cv_analysis: 15, cover_letter: 10, job_alerts: 10, ai_chat: 200 },
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
      limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1 },
      extras: ["24h Support", "Alles aus Pro", "Unbegrenzte Nutzung"],
    },
    {
      key: "enterprise",
      name: "Enterprise",
      subtitle: "Für Teams & Agenturen",
      price: null,
      period: "Kontaktiere uns",
      icon: Building2,
      color: "slate",
      highlighted: false,
      badge: null,
      limits: { cv_analysis: -1, cover_letter: -1, job_alerts: -1, ai_chat: -1 },
      extras: ["Dedizierter Manager", "Custom Integrationen", "SLA & Compliance"],
    },
  ];

  const iconBg = {
    gray: "bg-gray-100",
    blue: "bg-blue-100",
    purple: "bg-purple-100",
    slate: "bg-slate-100",
  };
  const iconFg = {
    gray: "text-gray-500",
    blue: "text-blue-600",
    purple: "text-purple-600",
    slate: "text-slate-600",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Top bar */}
      {token && (
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Zurück
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 tracking-wide uppercase mb-3">Preise</p>
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Finde den passenden Plan
          </h1>
          <p className="text-base md:text-lg text-gray-500 max-w-lg mx-auto">
            Starte kostenlos und upgrade jederzeit, wenn du mehr brauchst.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            const Icon = plan.icon;

            return (
              <div
                key={plan.key}
                className={`relative bg-white rounded-2xl flex flex-col transition-all duration-200 ${
                  plan.highlighted
                    ? "border-2 border-blue-500 shadow-xl shadow-blue-100/60 scale-[1.02]"
                    : "border border-gray-200 shadow-sm hover:shadow-lg hover:border-gray-300"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 inset-x-0 flex justify-center">
                    <span className={`text-xs font-bold px-4 py-1 rounded-full text-white shadow-sm ${
                      plan.highlighted ? "bg-blue-500" : "bg-purple-500"
                    }`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Top section: Icon + Name + Price */}
                <div className="p-6 pb-0">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg[plan.color]}`}>
                      <Icon className={`w-5 h-5 ${iconFg[plan.color]}`} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900 leading-tight">{plan.name}</h3>
                      <p className="text-xs text-gray-400 leading-tight mt-0.5">{plan.subtitle}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="h-14 flex items-end mb-5">
                    {plan.price !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-gray-900">
                          {plan.price === "0" ? "Gratis" : `€${plan.price}`}
                        </span>
                        {plan.period && (
                          <span className="text-sm text-gray-400 font-medium">{plan.period}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xl font-bold text-gray-600">Auf Anfrage</span>
                    )}
                  </div>

                  <hr className="border-gray-100" />
                </div>

                {/* Features — flex-1 to equalize heights */}
                <div className="p-6 pt-4 flex-1">
                  <ul className="space-y-2.5">
                    {Object.entries(plan.limits).map(([feat, val]) => (
                      <li key={feat} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <span className="font-semibold text-gray-800">{formatLimit(val)}</span>{" "}
                          <span className="text-gray-500">{FEATURE_LABELS[feat]}</span>
                        </span>
                      </li>
                    ))}
                    {plan.extras.map((extra) => (
                      <li key={extra} className="flex items-start gap-2.5 text-sm text-gray-400">
                        <Check className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        {extra}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA — always at bottom */}
                <div className="p-6 pt-0">
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
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-50 text-gray-400"
                    >
                      Inklusive
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={loadingPlan === plan.key}
                      className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 ${
                        plan.highlighted
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200 hover:shadow-lg"
                          : plan.key === "max"
                          ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200 hover:shadow-lg"
                          : "bg-gray-800 text-white hover:bg-gray-900"
                      }`}
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

        {/* Bottom note */}
        <p className="text-center text-xs text-gray-400 mt-12">
          Alle Preise inkl. MwSt. Jederzeit kündbar. Keine versteckten Kosten.
        </p>
      </div>
    </div>
  );
}
