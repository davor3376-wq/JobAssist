import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell, BellOff, Briefcase, Mail, MapPin, Pencil, Play, Plus,
  RefreshCw, Trash2, X, Clock3, CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { jobAlertsApi } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";
import { getRewriteState, updateUsageList } from "../utils/jobAlertsState";

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  } catch { return undefined; }
}

function syncStoredAlerts(alerts) {
  try { localStorage.setItem("job_alerts", JSON.stringify(alerts)); } catch {}
}

// ─── Alert list card (light mode) ────────────────────────────────────────────

function AlertListCard({ alert, isSelected, onSelect }) {
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Stellen";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? "border-blue-400 bg-blue-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{alert.keywords}</p>
          <p className="mt-0.5 text-xs text-slate-500">{alert.location || "Ohne Ortsfilter"}</p>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          alert.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {alert.is_active ? "Aktiv" : "Pausiert"}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{typeLabel}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{freqLabel}</span>
      </div>
    </button>
  );
}

// ─── Alert detail panel (light mode) ─────────────────────────────────────────

function AlertDetailPanel({ alert, onToggle, onDelete, onRunNow, onEdit, isRunning }) {
  const typeLabel = JOB_TYPES.find((t) => t.value === alert.job_type)?.label || "Alle Stellenarten";
  const freqLabel = FREQUENCIES.find((f) => f.value === alert.frequency)?.label || alert.frequency;

  const configItems = [
    { icon: MapPin,  label: "Ort",        value: alert.location || "Kein Ortsfilter" },
    { icon: Briefcase, label: "Stellenart", value: typeLabel },
    { icon: Clock3,  label: "Rhythmus",   value: freqLabel },
    { icon: Mail,    label: "E-Mail",      value: alert.email },
  ];

  return (
    <div className="space-y-4">
      {/* Alert header card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Alert-Profil</p>
            <h2 className="mt-1.5 text-xl font-bold text-slate-900">{alert.keywords}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {alert.is_active
                ? `Aktiv · ${freqLabel}`
                : "Pausiert — sendet keine Benachrichtigungen"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Jetzt ausführen — disabled only while request is in flight */}
            <button
              onClick={() => onRunNow(alert.id)}
              disabled={isRunning}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                isRunning
                  ? "cursor-not-allowed bg-slate-100 text-slate-400"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isRunning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Jetzt ausführen
            </button>
            <button
              onClick={() => onToggle(alert.id, !alert.is_active)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {alert.is_active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {alert.is_active ? "Pausieren" : "Aktivieren"}
            </button>
            <button
              onClick={() => onEdit(alert)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Pencil className="h-4 w-4" />
              Bearbeiten
            </button>
            <button
              onClick={() => onDelete(alert.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Löschen
            </button>
          </div>
        </div>
      </div>

      {/* Configuration grid — replaces the fake metric bars */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Alert-Konfiguration
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {configItems.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200">
                <Icon className="h-3.5 w-3.5 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-slate-400">{label}</p>
                <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last sent info */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <p className="text-sm font-semibold text-slate-800">Letzter Versand</p>
        </div>
        <p className="text-sm text-slate-600">
          {alert.last_sent_at
            ? `Zuletzt gesendet am ${new Date(alert.last_sent_at).toLocaleString("de-AT", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}`
            : "Noch kein Versand protokolliert. Klicke auf 'Jetzt ausführen', um die erste Suche zu starten."}
        </p>
      </div>
    </div>
  );
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────

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

  const handleSubmit = (e) => {
    e.preventDefault();
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15,23,42,0.5)", padding: "16px" }}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Suchbegriff *</label>
            <input
              type="text"
              value={form.keywords}
              onChange={(e) => setValue("keywords", e.target.value)}
              placeholder="z. B. Grafikdesign, Lagerarbeit oder Büro"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Standort</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setValue("location", e.target.value)}
              placeholder="z. B. Wien, Graz oder Österreich"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stellenart</label>
            <select
              value={form.job_type}
              onChange={(e) => setValue("job_type", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200"
            >
              {JOB_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">E-Mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="w-full cursor-not-allowed rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-400"
            />
            <p className="mt-1 text-xs text-slate-400">Alerts werden nur an deine registrierte E-Mail-Adresse gesendet.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Häufigkeit</label>
            <div className="flex gap-4">
              {FREQUENCIES.map((f) => (
                <label key={f.value} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value={f.value}
                    checked={form.frequency === f.value}
                    onChange={() => setValue("frequency", f.value)}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-slate-700">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobAlertsPage() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlert, setEditingAlert] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [selectedAlertId, setSelectedAlertId] = useState(null);

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => {
      try {
        const raw = localStorage.getItem("init");
        return raw ? JSON.parse(raw) : queryClient.getQueryData(["init"]);
      } catch { return queryClient.getQueryData(["init"]); }
    },
    staleTime: 1000 * 60 * 2,
  });

  const me = initData?.me;
  const { guardedRun } = useUsageGuard("job_alerts");

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () =>
      jobAlertsApi.list().then((r) => {
        syncStoredAlerts(r.data);
        return r.data;
      }),
    initialData: () => queryClient.getQueryData(["job-alerts"]) ?? loadStoredAlerts(),
    staleTime: 1000 * 60 * 2,
  });

  // Auto-select first alert
  useEffect(() => {
    if (!alerts.length) { setSelectedAlertId(null); return; }
    if (!alerts.some((a) => a.id === selectedAlertId)) setSelectedAlertId(alerts[0].id);
  }, [alerts, selectedAlertId]);

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: (res) => {
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = [res.data, ...old];
        syncStoredAlerts(next);
        return next;
      });
      setSelectedAlertId(res.data.id);
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
      const prev = queryClient.getQueryData(["job-alerts"]);
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.map((a) => (a.id === id ? { ...a, ...data, updated_at: new Date().toISOString() } : a));
        syncStoredAlerts(next);
        return next;
      });
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) { queryClient.setQueryData(["job-alerts"], ctx.prev); syncStoredAlerts(ctx.prev); }
      toast.error(getApiErrorMessage(err, "Fehler beim Aktualisieren"));
    },
    onSuccess: (res) => {
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.map((a) => (a.id === res.data.id ? res.data : a));
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
      const prev = {
        alerts: queryClient.getQueryData(["job-alerts"]),
        billing: queryClient.getQueryData(["billing-overview"]),
        init: queryClient.getQueryData(["init"]),
      };
      queryClient.setQueryData(["job-alerts"], (old = []) => {
        const next = old.filter((a) => a.id !== id);
        syncStoredAlerts(next);
        return next;
      });
      bumpJobAlertUsageCaches(queryClient, -1);
      toast.success("Alert gelöscht");
      return prev;
    },
    onError: (err, _id, ctx) => {
      if (ctx?.alerts) { queryClient.setQueryData(["job-alerts"], ctx.alerts); syncStoredAlerts(ctx.alerts); }
      if (ctx?.billing) queryClient.setQueryData(["billing-overview"], ctx.billing);
      if (ctx?.init) queryClient.setQueryData(["init"], ctx.init);
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
    try {
      await jobAlertsApi.runNow(id);
      toast.success("Suche gestartet. Du erhältst bald eine E-Mail.", { duration: 5000 });
    } catch (err) {
      if (err.response?.status === 429) return;
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      toast.error(getApiErrorMessage(err, "Fehler beim Starten der Suche"));
    } finally {
      setRunningId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.is_active).length;
  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || null;

  if (isLoading) {
    return <div className="animate-slide-up"><ListSkeleton rows={4} /></div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200">
          <Bell className="h-8 w-8 text-blue-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Noch keine Job-Alerts</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Erstelle deinen ersten Alert und lasse passende Stellen automatisch an deine E-Mail-Adresse senden.
        </p>
        <button
          onClick={() => guardedRun(() => setShowCreate(true))}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
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
    <div className="animate-slide-up rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Header stats ── */}
      <div className="grid gap-4 border-b border-slate-100 p-5 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Alerts gesamt</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{alerts.length}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aktiv</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Aktion</p>
            <p className="mt-1 text-sm text-slate-600">Neuen Alert hinzufügen</p>
          </div>
          <button
            onClick={() => guardedRun(() => setShowCreate(true))}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Neuer Alert
          </button>
        </div>
      </div>

      {/* ── Split layout ── */}
      <div className="grid md:min-h-[600px] grid-cols-1 md:grid-cols-12">
        {/* List sidebar */}
        <aside className="border-b border-slate-100 p-4 md:col-span-4 md:h-full md:overflow-y-auto md:border-b-0 md:border-r">
          <div className="space-y-2">
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

        {/* Detail panel */}
        <main className="p-4 md:col-span-8 md:h-full md:overflow-y-auto md:p-6">
          {selectedAlert && (
            <AlertDetailPanel
              alert={selectedAlert}
              onToggle={(id, is_active) => updateMutation.mutate({ id, data: { is_active } })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRunNow={handleRunNow}
              onEdit={(current) => {
                const { canRewrite, remainingMin } = getRewriteState(current);
                if (!canRewrite) {
                  toast.error(`Du kannst diesen Alert in ${remainingMin} Minuten erneut bearbeiten.`);
                  return;
                }
                setEditingAlert(current);
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
