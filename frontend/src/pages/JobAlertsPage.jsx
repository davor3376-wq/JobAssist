import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Briefcase, Mail, MapPin, Pencil, Play, Plus, RefreshCw, Trash2, X } from "lucide-react";
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
  { value: "daily", label: "T\u00e4glich" },
  { value: "weekly", label: "W\u00f6chentlich" },
];

function bumpJobAlertUsageCaches(queryClient, delta) {
  queryClient.setQueryData(["billing-overview"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
  queryClient.setQueryData(["init"], (old) =>
    old ? { ...old, usage: updateUsageList(old.usage, delta) } : old
  );
}

function AlertCard({ alert, refreshState, onToggle, onDelete, onRunNow, onEdit, isRunning }) {
  const { used, remaining, atLimit, resetInMin } = getRefreshState(refreshState);
  const { canRewrite, remainingMin } = getRewriteState(alert);

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
                <Briefcase className="w-3.5 h-3.5" /> {JOB_TYPES.find((type) => type.value === alert.job_type)?.label || alert.job_type}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> {alert.email}
            </span>
            <span className="flex items-center gap-1">
              <Bell className="w-3.5 h-3.5" />
              {FREQUENCIES.find((frequency) => frequency.value === alert.frequency)?.label || alert.frequency}
            </span>
          </div>

          {alert.last_sent_at && (
            <p className="text-xs text-gray-400 mt-1">
              Zuletzt gesendet: {new Date(alert.last_sent_at).toLocaleString("de-AT")}
            </p>
          )}

          <div className="flex items-center gap-1.5 mt-1.5">
            {[...Array(REFRESH_MAX)].map((_, index) => (
              <div key={index} className={`w-2 h-2 rounded-full ${index < used ? "bg-orange-400" : "bg-gray-200"}`} />
            ))}
            <span className="text-xs text-gray-400">
              {atLimit
                ? `Cooldown \u2014 verf\u00fcgbar in ${resetInMin}min`
                : `${remaining} Aktualisierung${remaining !== 1 ? "en" : ""} heute (alle 4h)`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onRunNow(alert.id)}
            disabled={isRunning || atLimit}
            title={atLimit ? `Cooldown \u2014 verf\u00fcgbar in ${resetInMin}min` : "Jetzt ausf\u00fchren"}
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
            onClick={() => onEdit(alert)}
            disabled={!canRewrite}
            title={canRewrite ? "Alert bearbeiten" : `Bearbeiten in ${remainingMin}min verf\u00fcgbar`}
            className={`p-2 rounded-lg transition-colors ${canRewrite ? "text-gray-500 hover:bg-gray-100" : "text-gray-300 cursor-not-allowed"}`}
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => onDelete(alert.id)}
            title="L\u00f6schen"
            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.4)", padding: "16px", margin: 0 }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
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
              onChange={(event) => setValue("keywords", event.target.value)}
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
              onChange={(event) => setValue("location", event.target.value)}
              placeholder="z.B. Wien, Remote, \u00d6sterreich"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stellenart</label>
            <select
              value={form.job_type}
              onChange={(event) => setValue("job_type", event.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {JOB_TYPES.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">H\u00e4ufigkeit</label>
            <div className="flex gap-3">
              {FREQUENCIES.map((frequency) => (
                <label key={frequency.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="frequency"
                    value={frequency.value}
                    checked={form.frequency === frequency.value}
                    onChange={() => setValue("frequency", frequency.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{frequency.label}</span>
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
  const [localRefreshState, setLocalRefreshState] = useState({
    manual_refresh_count: 0,
    manual_refresh_window_start: null,
  });
  const { data: initData } = useQuery({ queryKey: ["init"] });
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
    queryFn: () => jobAlertsApi.list().then((response) => response.data),
    staleTime: 1000 * 60 * 2,
  });

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: (response) => {
      queryClient.setQueryData(["job-alerts"], (old = []) => [response.data, ...old]);
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
      queryClient.setQueryData(["job-alerts"], (old = []) =>
        old.map((alert) => (alert.id === id ? { ...alert, ...data, updated_at: new Date().toISOString() } : alert))
      );
      return { previousAlerts };
    },
    onError: (err, _vars, context) => {
      if (context?.previousAlerts) queryClient.setQueryData(["job-alerts"], context.previousAlerts);
      toast.error(getApiErrorMessage(err, "Fehler beim Aktualisieren"));
    },
    onSuccess: (response) => {
      queryClient.setQueryData(["job-alerts"], (old = []) =>
        old.map((alert) => (alert.id === response.data.id ? response.data : alert))
      );
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

      queryClient.setQueryData(["job-alerts"], (old = []) => old.filter((alert) => alert.id !== id));
      bumpJobAlertUsageCaches(queryClient, -1);
      toast.success("Alert gelöscht");

      return { previousAlerts, previousBilling, previousInit };
    },
    onError: (err, _id, context) => {
      if (context?.previousAlerts) queryClient.setQueryData(["job-alerts"], context.previousAlerts);
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
        `Suche gestartet! Falls Stellen gefunden werden, erhältst du eine E-Mail. (Noch ${remaining} Aktualisierung${remaining !== 1 ? "en" : ""})`,
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

  return (
    <div className="space-y-6 animate-slide-up">
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
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
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
              isRunning={runningId === alert.id}
            />
          ))}
        </div>
      )}

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
