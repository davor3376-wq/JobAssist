import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { CreditCard, ExternalLink, Zap, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { billingApi } from "../services/api";
import { CardSkeleton } from "../components/PageSkeleton";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Stellensuchen / Tag",
};

const PLAN_NAMES = {
  basic: "Basic (Gratis)",
  pro: "Pro",
  max: "Max",
  enterprise: "Enterprise",
};

function UsageBar({ feature, used, limit }) {
  const label = FEATURE_LABELS[feature] || feature;
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isNearLimit = !unlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className={`font-semibold ${isNearLimit ? "text-red-500" : "text-gray-900"}`}>
          {used} / {unlimited ? "\u221e" : limit}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isNearLimit ? "bg-red-400" : "bg-blue-500"
          }`}
          style={{ width: unlimited ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get("success") === "true") {
      toast.success("Upgrade erfolgreich! Willkommen bei deinem neuen Plan.");
    }
    if (params.get("canceled") === "true") {
      toast("Checkout abgebrochen.");
    }
  }, [params]);

  const cachedBilling = (() => { try { const s = localStorage.getItem("billing"); return s ? JSON.parse(s) : undefined; } catch { return undefined; } })();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview().then((r) => {
      try { localStorage.setItem("billing", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: cachedBilling,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const handleManage = async () => {
    try {
      const res = await billingApi.createPortal();
      window.location.href = res.data.portal_url;
    } catch {
      toast.error("Fehler beim Öffnen der Abonnement-Verwaltung");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
        </div>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  const sub = data?.subscription;
  const usage = data?.usage || [];
  const planName = PLAN_NAMES[sub?.plan] || "Basic (Gratis)";
  const isPaid = sub?.plan && sub.plan !== "basic";

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abrechnung</h1>
        <p className="text-gray-500 mt-1 text-sm">Verwalte deinen Plan und deine Nutzung.</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{planName}</h2>
              <p className="text-sm text-gray-500">
                {isPaid
                  ? `Aktiv bis ${sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("de-AT") : "—"}`
                  : "Kostenloses Konto"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {isPaid && (
              <button
                onClick={handleManage}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abo verwalten
              </button>
            )}
            {sub?.plan !== "max" && sub?.plan !== "enterprise" && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Upgrade
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Nutzung diesen Monat</h3>
        <div className="space-y-4">
          {usage.map((u) => (
            <UsageBar key={u.feature} {...u} />
          ))}
        </div>
      </div>
    </div>
  );
}
