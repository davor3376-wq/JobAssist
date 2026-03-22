import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Bell, BellOff, Trash2, Play, Plus, X, Mail, MapPin, Briefcase, RefreshCw, Send, SearchCheck } from "lucide-react";
import toast from "react-hot-toast";
import { jobAlertsApi, authApi, motivationsschreibenApi, resumeApi, researchApi } from "../services/api";
import { generateMailtoLink } from "../utils/emailHelpers";
import ResearchModal from "../components/ResearchModal";

const JOB_TYPES = ["", "Full-time", "Part-time", "Remote", "Contract", "Internship"];
const FREQUENCIES = [
  { value: "daily", label: "Täglich" },
  { value: "weekly", label: "Wöchentlich" },
];

function AlertCard({ alert, onToggle, onDelete, onRunNow, isRunning, onDraft, isDrafting, onResearch }) {
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
                <Briefcase className="w-3.5 h-3.5" /> {alert.job_type}
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
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => onDraft(alert)}
            disabled={isDrafting}
            title="Brief-Entwurf öffnen"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {isDrafting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="text-xs">Brief-Entwurf</span>
          </button>
          <button
            onClick={() => onResearch(alert)}
            title="Unternehmensrecherche"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium border border-emerald-300 text-emerald-700 bg-white hover:bg-emerald-50 transition-colors"
          >
            <SearchCheck className="w-3.5 h-3.5" />
            <span className="text-xs">Recherche</span>
          </button>
          <button
            onClick={() => onRunNow(alert.id)}
            disabled={isRunning}
            title="Jetzt ausführen"
            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 transition-colors"
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
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
              <option value="">Alle</option>
              {JOB_TYPES.filter(Boolean).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="deine@email.com"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
    </div>
  );
}

export default function JobAlertsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [draftingId, setDraftingId] = useState(null);
  const [researchModal, setResearchModal] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => authApi.me().then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });
  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const handleDraftEmail = async (alert) => {
    const userName = me?.full_name || me?.email?.split("@")[0] || "Bewerber";
    setDraftingId(alert.id);
    try {
      const res = await motivationsschreibenApi.generate({
        company: "",
        role: alert.keywords,
        job_description: `Stelle gesucht: ${alert.keywords}${alert.location ? ` in ${alert.location}` : ""}${alert.job_type ? `, ${alert.job_type}` : ""}`,
        tone: "formell",
        resume_id: resumes[0]?.id || null,
        applicant_name: me?.full_name || "",
      });
      const text = res.data?.text || "";
      const jobForLink = { title: alert.keywords, role: alert.keywords };
      window.location.href = generateMailtoLink(jobForLink, text, userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
    } catch {
      toast.error("Brief-Entwurf konnte nicht generiert werden");
    } finally {
      setDraftingId(null);
    }
  };

  const handleResearch = async (alert) => {
    const company = alert.keywords; // use keywords as company hint
    setResearchData(null);
    setResearchModal({ companyName: company });
    setResearchLoading(true);
    try {
      const res = await researchApi.research(company, "");
      setResearchData(res.data);
    } catch {
      toast.error("Recherche fehlgeschlagen");
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["job-alerts"],
    queryFn: () => jobAlertsApi.list().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => jobAlertsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-alerts"] });
      setShowCreate(false);
      toast.success("Alert erstellt!");
    },
    onError: () => toast.error("Fehler beim Erstellen des Alerts"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => jobAlertsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-alerts"] }),
    onError: () => toast.error("Fehler beim Aktualisieren"),
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
      await jobAlertsApi.runNow(id);
      toast.success("Suche gestartet — E-Mail kommt in Kürze!");
    } catch {
      toast.error("Fehler beim Starten der Suche");
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
          onClick={() => setShowCreate(true)}
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
        <div className="text-center py-16 text-gray-400">Lade Alerts...</div>
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
            onClick={() => setShowCreate(true)}
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
              onToggle={(id, is_active) => updateMutation.mutate({ id, data: { is_active } })}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRunNow={handleRunNow}
              isRunning={runningId === alert.id}
              onDraft={handleDraftEmail}
              isDrafting={draftingId === alert.id}
              onResearch={handleResearch}
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

      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}
    </div>
  );
}
