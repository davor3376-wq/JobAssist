import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CreditCard, ExternalLink, Zap } from "lucide-react";
import toast from "react-hot-toast";

import { CardSkeleton } from "../components/PageSkeleton";
import { billingApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getCleanBillingUrl, getPlanName, getUsageBarState } from "../utils/billingState";

function UsageRing({ feature, used, limit }) {
  const { label, unlimited, pct, isNearLimit, displayLimit } = getUsageBarState(feature, used, limit);
  const progress = unlimited ? 0 : Math.max(0, Math.min(100, pct));
  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;
  const ringClass = isNearLimit ? "text-red-500" : "text-indigo-600";
  const ringStroke = isNearLimit ? "#ef4444" : "#4f46e5";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">Diesen Monat</p>
        </div>
        {isNearLimit && (
          <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-500 animate-pulse">
            Limit erreicht
          </span>
        )}
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
            {!unlimited && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={ringStroke}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className={isNearLimit ? "animate-pulse" : ""}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-lg font-bold ${ringClass}`}>{used}</span>
            <span className="text-[11px] font-medium text-gray-400">von {displayLimit}</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${ringClass}`}>
            {unlimited ? "Unbegrenzt verfügbar" : `${progress}% genutzt`}
          </p>
        </div>
      </div>
    </div>
  );
}

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
      try {
        localStorage.setItem("billing", JSON.stringify(r.data));
      } catch {}
      return r.data;
    }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("billing");
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
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
          <div className="mb-2 h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <CardSkeleton lines={3} />
        <CardSkeleton lines={4} />
      </div>
    );
  }

  const sub = data?.subscription;
  const usage = initData?.usage || data?.usage || [];
  const planName = getPlanName(sub?.plan || initData?.plan);
  const isPaid = sub?.plan && sub.plan !== "basic";

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Abrechnung</h1>
        <p className="mt-1 text-sm text-gray-500">Verwalte deinen Plan und deine Nutzung.</p>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <CreditCard className="h-6 w-6 text-white" />
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
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                <ExternalLink className="h-4 w-4" />
                Abo verwalten
              </button>
            )}

            {sub?.plan !== "max" && sub?.plan !== "enterprise" && (
              <button
                onClick={() => navigate("/pricing")}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Zap className="h-4 w-4" />
                Upgrade
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-bold text-gray-900">Nutzung</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {usage.map((item) => (
            <UsageRing key={item.feature} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
