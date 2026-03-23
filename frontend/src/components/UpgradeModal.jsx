import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, Zap } from "lucide-react";

const FEATURE_LABELS = {
  cv_analysis: "Lebenslauf-Analysen",
  cover_letter: "Anschreiben",
  job_alerts: "Job-Alerts",
  ai_chat: "KI-Nachrichten",
  job_search: "Stellensuchen / Tag",
};

export default function UpgradeModal() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => setData(e.detail);
    window.addEventListener("usage-limit", handler);
    return () => window.removeEventListener("usage-limit", handler);
  }, []);

  if (!data) return null;

  const featureLabel = FEATURE_LABELS[data.feature] || data.feature;

  return createPortal(
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh",
        zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)", padding: "16px",
      }}
      onClick={() => setData(null)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <button onClick={() => setData(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Limit erreicht</h2>
        <p className="text-gray-600 mb-4">
          Du hast <strong>{data.used}/{data.limit}</strong> {featureLabel} in deinem <strong>{data.plan === "basic" ? "Basic (Gratis)" : data.plan}</strong>-Plan verwendet.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Upgrade auf Pro oder Max, um mehr Funktionen freizuschalten.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => { setData(null); navigate("/pricing"); }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            Pläne ansehen
          </button>
          <button
            onClick={() => setData(null)}
            className="px-4 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            Später
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
