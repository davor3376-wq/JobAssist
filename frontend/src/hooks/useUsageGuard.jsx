import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Jobsuchen",
};

const FEATURE_PERIODS = {
  cv_analysis: "diesen Monat",
  cover_letter: "diesen Monat",
  job_alerts: "diesen Monat",
  ai_chat: "diesen Monat",
  job_search: "heute",
};

export default function useUsageGuard(feature) {
  const navigate = useNavigate();
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: billingData } = useQuery({ queryKey: ["billing-overview"], staleTime: 1000 * 60 * 2 });

  const usageList = billingData?.usage || initData?.usage || [];
  const entry = usageList.find((u) => u.feature === feature);

  const used = entry?.used ?? 0;
  const limit = entry?.limit ?? 0;
  const remaining = entry?.remaining ?? 0;
  const unlimited = limit === -1;
  const atLimit = !unlimited && remaining <= 0;
  const nearLimit = !unlimited && !atLimit && limit > 0 && remaining <= Math.max(1, Math.ceil(limit * 0.2));
  const label = FEATURE_LABELS[feature] || feature;
  const periodLabel = FEATURE_PERIODS[feature] || "diesen Monat";

  const guardedRun = (fn) => {
    if (atLimit) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-gray-900">Limit erreicht</p>
            <p className="text-sm text-gray-600">
              Du hast alle {limit} {label} {periodLabel} verbraucht.
            </p>
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  navigate("/pricing");
                }}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Upgrade
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
              >
                OK
              </button>
            </div>
          </div>
        ),
        { duration: 8000, style: { maxWidth: "360px" } }
      );
      return;
    }

    if (nearLimit) {
      toast(`Noch ${remaining} ${label} übrig ${periodLabel}`, {
        icon: "⚠️",
        duration: 4000,
      });
    }

    return fn();
  };

  return { canUse: !atLimit, remaining, used, limit, unlimited, atLimit, nearLimit, guardedRun, label };
}
