import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Bell, BellOff, Trash2, Play, Plus, X, Mail, MapPin, Briefcase, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { jobAlertsApi } from "../services/api";
import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

const JOB_TYPES = [
  { value: "", label: "Alle" },
  { value: "Full-time", label: "Vollzeit" },
  { value: "Part-time", label: "Teilzeit" },
  { value: "Contract", label: "Befristet" },
  { value: "Internship", label: "Praktikum" },
  { value: "Lehre", label: "Lehre" },
  { value: "Samstagsjob", label: "Samstagsjob" },
];
const FREQUENCIES = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
];

const REFRESH_MAX = 3;
const REFRESH_WINDOW_MS = 4 * 60 * 60 * 1000;

function getRefreshState(refreshState) {
  const windowStart = refreshState?.manual_refresh_window_start ? new Date(refreshState.manual_refresh_window_start) : null;
  const windowExpired = !windowStart || (Date.now() - windowStart.getTime()) >= REFRESH_WINDOW_MS;
  const used = windowExpired ? 0 : (refreshState?.manual_refresh_count || 0);
  const atLimit = used >= REFRESH_MAX;
  let resetInMin = null;
  if (atLimit && windowStart) {
    const resetAt = windowStart.getTime() + REFRESH_WINDOW_MS;
    resetInMin = Math.ceil((resetAt - Date.now()) / 60000);
  }
  return { used, remaining: REFRESH_MAX - used, atLimit, resetInMin };
}

function AlertCard({ alert, refreshState, onToggle, onDelete, onRunNow, isRunning }) {
  const { used, remaining, atLimit, resetInMin } = getRefreshState(refreshState);

  return (
    <div className={`bg-white rounded-xl border p-5 flex flex-col gap-3 shadow-sm transition-opacity ${!alert.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-base">{alert.keywords}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {alert.is_active ? "Aktiv" : "Pausiert"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-500">
            {alert.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {alert.location}
              </span>
            )}
            {alert.job_type && (
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5" /> {JOB_TYPES.find(t => t.value === alert.job_type)?.label || alert.job_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {alert.email}
            </span>
            <span className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              {FREQUENCIES.find(f => f.value === alert.frequency)?.label || alert.frequency}
            </span>
          </div>
          {alert.last_sent_at && (
            <p className="text-xs text-gray-400 mt-1">
              Zuletzt gesendet: {new Date(alert.last_sent_at).toLocaleString("de-AT")}
            </p>
          )}
          {/* Refresh cooldown indicator */}
          <div className="flex items-center gap-1.5 mt-1.5">
            {[...Array(REFRESH_MAX)].map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i < used ? "bg-orange-400" : "bg-gray-200"}`} />
            ))}
            <span className="text-xs text-gray-400">
              {atLimit
                ? `Cooldown — verfügbar in ${resetInMin}min`
                : `${remaining} Aktualisierung${remaining !== 1 ? "en" : ""} heute (alle 4h)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onRunNow(alert.id)}
            disabled={isRunning || atLimit}
            title={atLimit ? `Cooldown — verfügbar in ${resetInMin}min` : "Jetzt ausführen"}
            className={`p-2 rounded-lg transition-colors ${atLimit ? "text-gray-300 cursor-not-allowed" : "text-blue-600 hover:bg-blue-50"} disabled:opacity-50`}
          >
            {isRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onToggle(alert.id, !alert.is_active)}
            title={alert.is_active ? "Pausieren" : "Aktivieren"}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {alert.is_active ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(alert.id)}
            title="Löschen"
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAlertModal({ onClose, onCreate, defaultEmail }) {
  const [form, setForm] = useState({
    keywords: "",
    location: "",
    job_type: "",
    email: defaultEmail || "",
    frequency: "daily",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.keywords.trim()) return toast.error("Bitte Suchbegriff eingeben");
    if (!form.email.trim()) return toast.error("Bitte E-Mail-Adresse eingeben");
    onCreate({
      keywords: form.keywords.trim(),
      location: form.location.trim() || null,
      job_type: form.job_type || null,
      email: form.email.trim(),
      frequency: form.frequency,
    });
  };

  return createPortal(
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: "16px", margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Neuer Job-Alert</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Suchbegriff *</label>
            <input
              type="text"
              value={form.keywords}
              onChange={e => set("keywords", e.target.value)}
              placeholder="z.B. Software Engineer, Marketing Manager"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ort</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set("location", e.target.value)}
              placeholder="z.B. Wien, Remote, Österreich"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stellenart</label>
            <select
              value={form.job_type}
              onChange={e => set("job_type", e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {JOB_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Alerts werden nur an deine registrierte E-Mail-Adresse gesendet.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Häufigkeit</label>
            <div className="flex gap-3">
              {FREQUENCIES.map(f => (
                <label key={f.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value={f.value}
                    checked={form.frequency === f.value}
                    onChange={() => set("frequency", f.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Alert erstellen
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function JobAlertsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [refreshState, setRefreshState] = useState(() => {
    try {
      const saved = localStorage.getItem("job_alert_refresh_state");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const me = initData?.me;
  const { guardedRun, atLimit } = useUsageGuard("job_alerts");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () => jobAlertsApi.list().then(r => {
      try { localStorage.setItem("job_alerts", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => { try { const s = localStorage.getItem("job_alerts"); return s ? JSON.parse(s) : undefined; } catch { return undefined; } },
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!alerts.length || refreshState?.manual_refresh_window_start) return;

    const freshestAlertState = alerts.reduce((best, alert) => {
      const nextTs = alert.manual_refresh_window_start ? new Date(alert.manual_refresh_window_start).getTime() : 0;
      const bestTs = best?.manual_refresh_window_start ? new Date(best.manual_refresh_window_start).getTime() : 0;
      return nextTs > bestTs
        ? {
            manual_refresh_count: alert.manual_refresh_count || 0,
            manual_refresh_window_start: alert.manual_refresh_window_start || null,
          }
        : best;
    }, null);

    if (freshestAlertState?.manual_refresh_window_start) {
      setRefreshState(freshestAlertState);
    }
  }, [alerts, refreshState?.manual_refresh_window_start]);

  useEffect(() => {
    try {
      if (refreshState) localStorage.setItem("job_alert_refresh_state", JSON.stringify(refreshState));
      else localStorage.removeItem("job_alert_refresh_state");
    } catch {}
  }, [refreshState]);

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-alerts"] });
      setShowCreate(false);
      toast.success("Alert erstellt!");
    },
    onError: (err) => {
      // UpgradeModal already shows for usage_limit
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Fehler beim Erstellen des Alerts"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobAlertsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["job-alerts"] });
      const prev = qc.getQueryData(["job-alerts"]);
      qc.setQueryData(["job-alerts"], (old = []) =>
        old.map((a) => (a.id === id ? { ...a, ...data } : a))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["job-alerts"], ctx.prev);
      toast.error("Fehler beim Aktualisieren");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["job-alerts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => jobAlertsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-alerts"] });
      toast.success("Alert gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen"),
  });

  const handleRunNow = async (id) => {
    setRunningId(id);
    try {
      const res = await jobAlertsApi.runNow(id);
      const nextRefreshState = {
        manual_refresh_count: res.data?.refreshes_used ?? 0,
        manual_refresh_window_start: new Date().toISOString(),
      };
      setRefreshState(nextRefreshState);
      qc.setQueryData(["job-alerts"], (old = []) =>
        old.map((alert) => ({ ...alert, ...nextRefreshState }))
      );
      const remaining = res.data?.refreshes_remaining ?? "?";
      toast.success(
        `Suche gestartet! Falls Stellen gefunden werden, erhältst du eine E-Mail. (Noch ${remaining} Aktualisierungen)`,
        { duration: 5000 }
      );
      qc.invalidateQueries({ queryKey: ["job-alerts"] });
    } catch (err) {
      if (err.response?.status === 429) return; // interceptor shows rate-limited toast
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      toast.error(getApiErrorMessage(err, "Fehler beim Starten der Suche"));
    } finally {
      setRunningId(null);
    }
  };

  const activeCount = alerts.filter(a => a.is_active).length;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job-Alerts</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Lass neue Stellenangebote automatisch per E-Mail zu dir kommen.
          </p>
        </div>
        <button
          onClick={() => guardedRun(() => setShowCreate(true))}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Alert
        </button>
      </div>

      {/* Stats */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-3 gap-4 animate-slide-up">
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{alerts.length}</p>
            <p className="text-sm text-gray-500 mt-0.5">Alerts gesamt</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-sm text-gray-500 mt-0.5">Aktiv</p>
          </div>
          <div className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{alerts.length - activeCount}</p>
            <p className="text-sm text-gray-500 mt-0.5">Pausiert</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="animate-slide-up"><ListSkeleton rows={3} /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Noch keine Job-Alerts</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">
            Erstelle deinen ersten Alert und erhalte passende Stellenangebote direkt per E-Mail.
          </p>
          <button
            onClick={() => guardedRun(() => setShowCreate(true))}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Alert erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-slide-up">
          {alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              refreshState={refreshState ?? alert}
              onToggle={(id, is_active) => updateMutation.mutate({ id, data: { is_active } })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRunNow={handleRunNow}
              isRunning={runningId === alert.id}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onCreate={(data) => createMutation.mutate(data)}
          defaultEmail={me?.email || ""}
        />
      )}

    </div>
  );
}
