import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Briefcase, Mail, MapPin, Pencil, Play, Plus, RefreshCw, Trash2, X, Gauge, Radio, Clock3 } from "lucide-react";
import toast from "react-hot-toast";

import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { jobAlertsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getRefreshState, getRewriteState, REFRESH_MAX, updateUsageList } from "../utils/jobAlertsState";

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

function bumpJobAlertUsageCaches(queryClient, delta) {
  queryClient.setQueryData(["billing-overview"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
  queryClient.setQueryData(["init"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
}

function loadStoredAlerts() {
  try {
    const raw = localStorage.getItem("job_alerts");
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function syncStoredAlerts(alerts) {
  try {
    localStorage.setItem("job_alerts", JSON.stringify(alerts));
  } catch {}
}

function getCoverageMetrics(alert) {
  const keywordCount = (alert.keywords || "").split(/[,\s/]+/).filter(Boolean).length;
  return [
    {
      label: "Suchpräzision",
      value: Math.min(100, 42 + keywordCount * 12),
      hint: keywordCount > 2 ? "Mehrere Begriffe verengen die Suche." : "Ein breiter Suchbegriff liefert mehr Streuung.",
    },
    {
      label: "Ortsfilter",
      value: alert.location ? 84 : 38,
      hint: alert.location ? `Gefiltert auf ${alert.location}.` : "Kein Ortsfilter gesetzt.",
    },
    {
      label: "Stellenart",
      value: alert.job_type ? 78 : 44,
      hint: alert.job_type ? `Fokus auf ${JOB_TYPES.find((type) => type.value === alert.job_type)?.label || alert.job_type}.` : "Alle Stellenarten erlaubt.",
    },
    {
      label: "Rhythmus",
      value: alert.frequency === "daily" ? 86 : 62,
      hint: alert.frequency === "daily" ? "Tägliche Aktualisierung." : "Wöchentliche Zusammenfassung.",
    },
  ];
}

function MetricBar({ label, value, hint }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{hint}</p>
    </div>
  );
}

function AlertListCard({ alert, isSelected, onSelect }) {
  const typeLabel = JOB_TYPES.find((type) => type.value === alert.job_type)?.label || alert.job_type || "Alle Stellen";
  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition-all ${
        isSelected
          ? "border-indigo-500 bg-slate-900 text-white shadow-lg shadow-indigo-950/40"
          : "border-slate-800 bg-slate-900/50 text-slate-200 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{alert.keywords}</p>
          <p className="mt-1 text-xs text-slate-400">{alert.location || "Ohne Ortsfilter"}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${alert.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
          {alert.is_active ? "Aktiv" : "Pausiert"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
        <span className="rounded-full bg-slate-800 px-2 py-1">{typeLabel}</span>
        <span className="rounded-full bg-slate-800 px-2 py-1">
          {FREQUENCIES.find((frequency) => frequency.value === alert.frequency)?.label || alert.frequency}
        </span>
      </div>
    </button>
  );
}

function AlertDetailPanel({ alert, refreshState, onToggle, onDelete, onRunNow, onEdit, isRunning }) {
  const { used, remaining, atLimit, resetInMin } = getRefreshState(refreshState);
  const metrics = getCoverageMetrics(alert);
  const typeLabel = JOB_TYPES.find((type) => type.value === alert.job_type)?.label || "Alle Stellenarten";
  const frequencyLabel = FREQUENCIES.find((frequency) => frequency.value === alert.frequency)?.label || alert.frequency;

  return (
    <div className="h-full rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-slate-100 shadow-2xl shadow-black/20">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Status</p>
          <p className="mt-2 text-2xl font-bold">{alert.is_active ? "Aktiv" : "Pausiert"}</p>
          <p className="mt-1 text-xs text-slate-400">Alert {alert.is_active ? "wird ausgeführt" : "liefert aktuell keine Mails"}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Rhythmus</p>
          <p className="mt-2 text-2xl font-bold">{frequencyLabel}</p>
          <p className="mt-1 text-xs text-slate-400">Benachrichtigung an {alert.email}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Refresh-Limit</p>
          <p className="mt-2 text-2xl font-bold">{atLimit ? "Limit" : remaining}</p>
          <p className="mt-1 text-xs text-slate-400">
            {atLimit ? `Erneut verfügbar in ${resetInMin} Minuten` : `${remaining} manuelle Aktualisierungen heute`}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl bg-slate-900/70 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Alert-Details</p>
            <h2 className="mt-2 text-2xl font-bold text-white">{alert.keywords}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
                <MapPin className="h-3.5 w-3.5" /> {alert.location || "Ohne Ortsfilter"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
                <Briefcase className="h-3.5 w-3.5" /> {typeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1">
                <Mail className="h-3.5 w-3.5" /> {alert.email}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onRunNow(alert.id)}
              disabled={isRunning || atLimit}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                atLimit ? "cursor-not-allowed bg-slate-800 text-slate-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Jetzt ausführen
            </button>
            <button
              onClick={() => onToggle(alert.id, !alert.is_active)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              {alert.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {alert.is_active ? "Pausieren" : "Aktivieren"}
            </button>
            <button
              onClick={() => onEdit(alert)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              onClick={() => onDelete(alert.id)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/25"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl bg-slate-900/70 p-5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-indigo-300" />
            <h3 className="text-sm font-semibold text-white">So ist dieser Alert konfiguriert</h3>
          </div>
          <div className="mt-4 space-y-4">
            {metrics.map((metric) => (
              <MetricBar key={metric.label} {...metric} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/70 p-5">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-300" />
              <h3 className="text-sm font-semibold text-white">Nächster Versand</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {alert.last_sent_at
                ? `Zuletzt gesendet am ${new Date(alert.last_sent_at).toLocaleString("de-AT")}.`
                : "Noch kein Versand protokolliert."}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900/70 p-5">
            <div className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-amber-300" />
              <h3 className="text-sm font-semibold text-white">Manuelle Aktualisierung</h3>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              {[...Array(REFRESH_MAX)].map((_, index) => (
                <div key={index} className={`h-2 w-2 rounded-full ${index < used ? "bg-amber-400" : "bg-slate-700"}`} />
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {atLimit
                ? `Heute keine weitere manuelle Aktualisierung möglich. Wieder frei in ${resetInMin} Minuten.`
                : `${remaining} manuelle Aktualisierungen verbleiben heute.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAlertModal({
  onClose,
  onSubmit,
  defaultEmail,
  initialData,
  title = "Neuer Job-Alert",
  submitLabel = "Alert erstellen",
}) {
  const [form, setForm] = useState({
    keywords: initialData?.keywords || "",
    location: initialData?.location || "",
    job_type: initialData?.job_type || "",
    email: defaultEmail || "",
    frequency: initialData?.frequency || "daily",
  });

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.keywords.trim()) return toast.error("Bitte Suchbegriff eingeben");
    if (!form.email.trim()) return toast.error("Bitte E-Mail-Adresse eingeben");

    onSubmit({
      keywords: form.keywords.trim(),
      location: form.location.trim() || null,
      job_type: form.job_type || null,
      email: form.email.trim(),
      frequency: form.frequency,
    });
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(2,6,23,0.65)", padding: "16px", margin: 0 }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Suchbegriff *</label>
            <input
              type="text"
              value={form.keywords}
              onChange={(event) => setValue("keywords", event.target.value)}
              placeholder="z. B. Marketing, Teilzeit Verkauf oder Software-Test"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Ort</label>
            <input
              type="text"
              value={form.location}
              onChange={(event) => setValue("location", event.target.value)}
              placeholder="z. B. Wien, Linz oder Remote"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Stellenart</label>
            <select
              value={form.job_type}
              onChange={(event) => setValue("job_type", event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {JOB_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">E-Mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-500">Alerts werden nur an deine registrierte E-Mail-Adresse gesendet.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-300">Häufigkeit</label>
            <div className="flex gap-3">
              {FREQUENCIES.map((frequency) => (
                <label key={frequency.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value={frequency.value}
                    checked={form.frequency === frequency.value}
                    onChange={() => setValue("frequency", frequency.value)}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-slate-300">{frequency.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function JobAlertsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);
  const [localRefreshState, setLocalRefreshState] = useState({
    manual_refresh_count: 0,
    manual_refresh_window_start: null,
  });
  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => {
      try {
        const raw = localStorage.getItem("init");
        return raw ? JSON.parse(raw) : queryClient.getQueryData(["init"]);
      } catch {
        return queryClient.getQueryData(["init"]);
      }
    },
    staleTime: 1000 * 60 * 2,
  });
  const me = initData?.me;
  const { guardedRun } = useUsageGuard("job_alerts");

  useEffect(() => {
    setLocalRefreshState({
      manual_refresh_count: me?.alert_refresh_count ?? 0,
      manual_refresh_window_start: me?.alert_refresh_window_start ?? null,
    });
  }, [me?.alert_refresh_count, me?.alert_refresh_window_start]);

  const refreshState = localRefreshState;

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () =>
      jobAlertsApi.list().then((response) => {
        syncStoredAlerts(response.data);
        return response.data;
      }),
    initialData: () => queryClient.getQueryData(["job-alerts"]) ?? loadStoredAlerts(),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    if (!alerts.length) {
      setSelectedAlertId(null);
      return;
    }
    if (!alerts.some((alert) => alert.id === selectedAlertId)) {
      setSelectedAlertId(alerts[0].id);
    }
  }, [alerts, selectedAlertId]);

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: (response) => {
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = [response.data, ...old];
        syncStoredAlerts(next);
        return next;
      });
      setSelectedAlertId(response.data.id);
      bumpJobAlertUsageCaches(queryClient, 1);
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
      setShowCreate(false);
      toast.success("Alert erstellt!");
    },
    onError: (err) => {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Fehler beim Erstellen des Alerts"));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobAlertsApi.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["job-alerts"] });
      const previousAlerts = queryClient.getQueryData(["job-alerts"]);
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.map((alert) => (alert.id === id ? { ...alert, ...data, updated_at: new Date().toISOString() } : alert));
        syncStoredAlerts(next);
        return next;
      });
      return { previousAlerts };
    },
    onError: (err, _vars, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(["job-alerts"], context.previousAlerts);
        syncStoredAlerts(context.previousAlerts);
      }
      toast.error(getApiErrorMessage(err, "Fehler beim Aktualisieren"));
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.map((alert) => (alert.id === response.data.id ? response.data : alert));
        syncStoredAlerts(next);
        return next;
      });
      setEditingAlert(null);
      toast.success("Alert aktualisiert!");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["job-alerts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => jobAlertsApi.delete(id),
    onMutate: async (id) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["job-alerts"] }),
        queryClient.cancelQueries({ queryKey: ["billing-overview"] }),
        queryClient.cancelQueries({ queryKey: ["init"] }),
      ]);

      const previousAlerts = queryClient.getQueryData(["job-alerts"]);
      const previousBilling = queryClient.getQueryData(["billing-overview"]);
      const previousInit = queryClient.getQueryData(["init"]);

      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.filter((alert) => alert.id !== id);
        syncStoredAlerts(next);
        return next;
      });
      bumpJobAlertUsageCaches(queryClient, -1);
      toast.success("Alert gelöscht");

      return { previousAlerts, previousBilling, previousInit };
    },
    onError: (err, _id, context) => {
      if (context?.previousAlerts) {
        queryClient.setQueryData(["job-alerts"], context.previousAlerts);
        syncStoredAlerts(context.previousAlerts);
      }
      if (context?.previousBilling) queryClient.setQueryData(["billing-overview"], context.previousBilling);
      if (context?.previousInit) queryClient.setQueryData(["init"], context.previousInit);
      toast.error(getApiErrorMessage(err, "Fehler beim Löschen"));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["job-alerts"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["billing-overview"], refetchType: "none" });
      queryClient.invalidateQueries({ queryKey: ["init"], refetchType: "none" });
    },
  });

  const handleRunNow = async (id) => {
    setRunningId(id);

    const previousCount = me?.alert_refresh_count ?? 0;
    const previousWindowStart = me?.alert_refresh_window_start ?? null;
    const nextWindowStart = previousWindowStart ?? new Date().toISOString();
    setLocalRefreshState({
      manual_refresh_count: previousCount + 1,
      manual_refresh_window_start: nextWindowStart,
    });
    queryClient.setQueryData(["init"], (old) =>
      old
        ? {
            ...old,
            me: {
              ...old.me,
              alert_refresh_count: previousCount + 1,
              alert_refresh_window_start: nextWindowStart,
            },
          }
        : old
    );

    try {
      const response = await jobAlertsApi.runNow(id);
      const used = response.data?.refreshes_used ?? previousCount + 1;
      const remaining = response.data?.refreshes_remaining ?? "?";
      setLocalRefreshState({
        manual_refresh_count: used,
        manual_refresh_window_start: nextWindowStart,
      });

      queryClient.setQueryData(["init"], (old) =>
        old
          ? {
              ...old,
              me: {
                ...old.me,
                alert_refresh_count: used,
                alert_refresh_window_start: nextWindowStart,
              },
            }
          : old
      );
      queryClient.invalidateQueries({ queryKey: ["init"] });

      toast.success(
        `Suche gestartet. Noch ${remaining} Aktualisierung${remaining !== 1 ? "en" : ""} heute verfügbar.`,
        { duration: 5000 }
      );
    } catch (err) {
      setLocalRefreshState({
        manual_refresh_count: previousCount,
        manual_refresh_window_start: previousWindowStart,
      });
      queryClient.setQueryData(["init"], (old) =>
        old
          ? {
              ...old,
              me: {
                ...old.me,
                alert_refresh_count: previousCount,
                alert_refresh_window_start: previousWindowStart,
              },
            }
          : old
      );
      if (err.response?.status === 429) return;
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      toast.error(getApiErrorMessage(err, "Fehler beim Starten der Suche"));
    } finally {
      setRunningId(null);
    }
  };

  const activeCount = alerts.filter((alert) => alert.is_active).length;
  const selectedAlert = alerts.find((alert) => alert.id === selectedAlertId) || null;

  if (isLoading) {
    return <div className="animate-slide-up"><ListSkeleton rows={4} /></div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="animate-slide-up rounded-3xl border border-slate-800 bg-slate-950 p-10 text-center text-slate-200 shadow-2xl">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900">
          <Bell className="h-8 w-8 text-indigo-300" />
        </div>
        <h1 className="text-2xl font-bold text-white">Noch keine Job-Alerts</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">
          Erstelle deinen ersten Alert und lasse passende Stellen automatisch an deine E-Mail-Adresse senden.
        </p>
        <button
          onClick={() => guardedRun(() => setShowCreate(true))}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Alert erstellen
        </button>

        {showCreate && (
          <CreateAlertModal
            onClose={() => setShowCreate(false)}
            onSubmit={(data) => createMutation.mutate(data)}
            defaultEmail={me?.email || ""}
          />
        )}
      </div>
    );
  }

  return (
    <div className="animate-slide-up rounded-3xl border border-slate-800 bg-slate-950 text-slate-200 shadow-2xl">
      <div className="grid gap-4 border-b border-slate-800 p-6 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Alerts gesamt</p>
          <p className="mt-2 text-2xl font-bold text-white">{alerts.length}</p>
        </div>
        <div className="rounded-2xl bg-slate-900/70 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Aktiv</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">{activeCount}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-900/70 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Aktion</p>
            <p className="mt-2 text-sm text-slate-300">Neuen Alert hinzufügen oder bestehende Alerts prüfen</p>
          </div>
          <button
            onClick={() => guardedRun(() => setShowCreate(true))}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Neuer Alert
          </button>
        </div>
      </div>

      <div className="grid min-h-[720px] grid-cols-1 md:grid-cols-12">
        <aside className="border-b border-slate-800 p-4 md:col-span-4 md:h-full md:overflow-y-auto md:border-b-0 md:border-r">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertListCard
                key={alert.id}
                alert={alert}
                isSelected={alert.id === selectedAlertId}
                onSelect={() => setSelectedAlertId(alert.id)}
              />
            ))}
          </div>
        </aside>

        <main className="bg-slate-900/20 p-4 md:col-span-8 md:h-full md:overflow-y-auto md:p-8">
          {selectedAlert && (
            <AlertDetailPanel
              alert={selectedAlert}
              refreshState={refreshState}
              onToggle={(id, is_active) => updateMutation.mutate({ id, data: { is_active } })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRunNow={handleRunNow}
              onEdit={(currentAlert) => {
                const { canRewrite, remainingMin } = getRewriteState(currentAlert);
                if (!canRewrite) {
                  toast.error(`Du kannst diesen Alert in ${remainingMin} Minuten erneut bearbeiten.`);
                  return;
                }
                setEditingAlert(currentAlert);
              }}
              isRunning={runningId === selectedAlert.id}
            />
          )}
        </main>
      </div>

      {showCreate && (
        <CreateAlertModal
          onClose={() => setShowCreate(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          defaultEmail={me?.email || ""}
        />
      )}

      {editingAlert && (
        <CreateAlertModal
          onClose={() => setEditingAlert(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingAlert.id, data })}
          defaultEmail={me?.email || ""}
          initialData={editingAlert}
          title="Job-Alert bearbeiten"
          submitLabel="Änderungen speichern"
        />
      )}
    </div>
  );
}
