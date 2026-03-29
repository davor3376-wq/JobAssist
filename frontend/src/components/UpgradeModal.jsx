import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Zap } from "lucide-react";
import toast from "react-hot-toast";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Jobsuche / Tag",
};

export default function UpgradeModal() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => setData(e.detail);
    window.addEventListener("usage-limit", handler);
    return () => window.removeEventListener("usage-limit", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => toast.error(e.detail.message, { duration: 5000, id: "rate-limit-toast" });
    window.addEventListener("rate-limited", handler);
    return () => window.removeEventListener("rate-limited", handler);
  }, []);

  if (!data) return null;

  const featureLabel = FEATURE_LABELS[data.feature] || data.feature;

  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "16px",
      }}
      onClick={() => setData(null)}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <button onClick={() => setData(null)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 className="mb-2 text-xl font-bold text-gray-900">Limit erreicht</h2>
        <p className="mb-4 text-gray-600">
          Du hast <strong>{data.used}/{data.limit}</strong> {featureLabel} in deinem{" "}
          <strong>{data.plan === "basic" ? "Basic" : data.plan}</strong>-Plan verwendet.
        </p>
        <p className="mb-6 text-sm text-gray-500">
          Upgrade auf Pro oder Max, um mehr Funktionen freizuschalten.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setData(null);
              navigate("/pricing");
            }}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Pläne ansehen
          </button>
          <button
            onClick={() => setData(null)}
            className="rounded-xl px-4 py-2.5 font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            Später
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
