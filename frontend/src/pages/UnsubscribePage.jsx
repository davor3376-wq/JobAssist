import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Bell, BellOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { jobAlertsApi } from "../services/api";

export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Kein gültiger Abmelde-Token gefunden.");
      return;
    }
    jobAlertsApi.unsubscribe(token)
      .then(() => {
        setStatus("success");
        setMessage("Du wirst keine weiteren Job-Alerts von diesem Alert erhalten.");
      })
      .catch((err) => {
        setStatus("error");
        const detail = err?.response?.data?.detail;
        setMessage(typeof detail === "string" ? detail : "Der Link ist ungültig oder bereits abgelaufen.");
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center">
        {status === "loading" && (
          <>
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Abmeldung wird verarbeitet…</h1>
            <p className="text-sm text-gray-500">Bitte warte einen Moment.</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Erfolgreich abgemeldet</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link
              to="/job-alerts"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <Bell className="w-4 h-4" /> Alerts verwalten
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-2">Abmeldung fehlgeschlagen</h1>
            <p className="text-sm text-gray-500 mb-6">{message}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Zur Startseite
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
