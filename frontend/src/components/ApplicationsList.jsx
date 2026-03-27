import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquare,
  SearchCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { jobApi, motivationsschreibenApi, researchApi, resumeApi } from "../services/api";
import { generateMailtoLink } from "../utils/emailHelpers";
import { getApiErrorMessage } from "../utils/apiError";
import {
  filterAndSortJobs,
  getDeadlineMeta,
  getDisabledReason,
  getMatchColorClass,
  getMatchSummary,
  parseJson,
  updateJobList,
} from "../utils/applicationsState";
import ResearchModal from "./ResearchModal";

const STATUS_LABELS = {
  bookmarked: "Gespeichert",
  applied: "Beworben",
  interviewing: "Vorstellungsgespräch",
  offered: "Angebot",
  rejected: "Abgelehnt",
};

const STATUS_COLORS = {
  bookmarked: "bg-blue-100 text-blue-800",
  applied: "bg-green-100 text-green-800",
  interviewing: "bg-purple-100 text-purple-800",
  offered: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
};

const STATUS_ORDER = ["bookmarked", "applied", "interviewing", "offered", "rejected"];

const TYPE_MAP = {
  behavioral: "Verhalten",
  behaviour: "Verhalten",
  "behaviour-based": "Verhalten",
  technical: "Fachlich",
  "technical knowledge": "Fachlich",
  fachwissen: "Fachlich",
  situational: "Situativ",
  situation: "Situativ",
  motivation: "Motivation",
  motivational: "Motivation",
  competency: "Kompetenz",
  competence: "Kompetenz",
  culture: "Kultur",
  "cultural fit": "Kultur",
  "culture fit": "Kultur",
  leadership: "Führung",
  management: "Führung",
  "problem-solving": "Problemlösung",
  "problem solving": "Problemlösung",
  analytical: "Problemlösung",
  creativity: "Kreativität",
  creative: "Kreativität",
  communication: "Kommunikation",
  interpersonal: "Kommunikation",
  teamwork: "Teamarbeit",
  collaboration: "Teamarbeit",
  team: "Teamarbeit",
  adaptability: "Anpassung",
  flexibility: "Anpassung",
  stress: "Stressresistenz",
  "stress management": "Stressresistenz",
  "time management": "Zeitmanagement",
  organization: "Zeitmanagement",
  sales: "Vertrieb",
  customer: "Kundenorientierung",
  service: "Kundenorientierung",
};

const TAG_COLORS = {
  Fachlich: "bg-blue-100 text-blue-700",
  Verhalten: "bg-violet-100 text-violet-700",
  Situativ: "bg-amber-100 text-amber-700",
  Motivation: "bg-emerald-100 text-emerald-700",
  Kompetenz: "bg-rose-100 text-rose-700",
  Kultur: "bg-teal-100 text-teal-700",
  Führung: "bg-indigo-100 text-indigo-700",
  Problemlösung: "bg-orange-100 text-orange-700",
  Kreativität: "bg-pink-100 text-pink-700",
  Kommunikation: "bg-cyan-100 text-cyan-700",
  Teamarbeit: "bg-lime-100 text-lime-700",
  Anpassung: "bg-sky-100 text-sky-700",
  Stressresistenz: "bg-red-100 text-red-700",
  Zeitmanagement: "bg-yellow-100 text-yellow-700",
  Vertrieb: "bg-green-100 text-green-700",
  Kundenorientierung: "bg-purple-100 text-purple-700",
};

function MatchDetailCard({ title, items, tone, collapsed, onToggle, className = "" }) {
  if (!Array.isArray(items) || items.length === 0) return null;

  const styles = {
    success: {
      card: "border-emerald-300 bg-white",
      title: "text-emerald-700",
      bullet: "text-emerald-500",
    },
    danger: {
      card: "border-red-300 bg-white",
      title: "text-red-700",
      bullet: "text-red-400",
    },
    info: {
      card: "border-blue-300 bg-white",
      title: "text-blue-700",
      bullet: "text-blue-500",
    },
  };

  const toneStyle = styles[tone] || styles.info;

  return (
    <div className={`h-fit self-start rounded-xl border p-4 ${toneStyle.card} ${className}`}>
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-3 text-left">
        <h4 className={`text-base font-semibold ${toneStyle.title}`}>{title}</h4>
        <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${collapsed ? "" : "rotate-180"} ${toneStyle.title}`} />
      </button>
      {!collapsed && (
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex items-start gap-2">
              <span className={`mt-0.5 text-sm font-bold ${toneStyle.bullet}`}>{tone === "success" ? "+" : "-"}</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionButton({ onClick, disabled, disabledReason, color, icon, label }) {
  const styles = {
    indigo: "border-indigo-600 bg-indigo-600 text-white shadow-sm hover:border-indigo-700 hover:bg-indigo-700",
    emerald: "border-emerald-600 bg-emerald-600 text-white shadow-sm hover:border-emerald-700 hover:bg-emerald-700",
    amber: "border-amber-500 bg-amber-500 text-white shadow-sm hover:border-amber-600 hover:bg-amber-600",
    "emerald-outline": "border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50",
    "emerald-solid": "border-emerald-500 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
  };

  return (
    <span title={disabled ? disabledReason : ""}>
      <button
        onClick={onClick}
        disabled={disabled}
        aria-disabled={disabled}
        className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles[color]}`}
      >
        {icon}
        {label}
      </button>
    </span>
  );
}

export default function ApplicationsList({ jobs, onJobsUpdate, focusedJobId = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notesTimeoutsRef = useRef({});
  const jobRefs = useRef({});

  const [collapsedJobCards, setCollapsedJobCards] = useState({});
  const [collapsedDescriptions, setCollapsedDescriptions] = useState({});
  const [collapsedMatchSections, setCollapsedMatchSections] = useState({});
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMinMatch, setFilterMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState("recent");
  const [processing, setProcessing] = useState({ jobId: null, feature: null });
  const [draftLoading, setDraftLoading] = useState(null);
  const [draftTexts, setDraftTexts] = useState({});
  const [notesInput, setNotesInput] = useState({});
  const [notesSaving, setNotesSaving] = useState({});
  const [jobUiState, setJobUiState] = useState({});
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [researchModal, setResearchModal] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);

  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((res) => res.data),
  });

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) setSelectedResumeId(resumes[0].id);
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    const timeouts = notesTimeoutsRef.current;
    return () => Object.values(timeouts).forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (!focusedJobId) return;
    setCollapsedJobCards((old) => ({ ...old, [focusedJobId]: false }));
    const timer = window.setTimeout(() => {
      jobRefs.current[focusedJobId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [focusedJobId]);

  const syncJobs = (updater) => {
    queryClient.setQueryData(["jobs"], (old = []) => updater(old));
    if (typeof onJobsUpdate === "function") onJobsUpdate((old = []) => updater(old));
  };

  const setJobFlag = (jobId, key, value) => {
    setJobUiState((old) => ({
      ...old,
      [jobId]: {
        ...(old[jobId] || {}),
        [key]: value,
      },
    }));
  };

  const isJobFlagActive = (jobId, key) => Boolean(jobUiState[jobId]?.[key]);

  const applyJobUpdate = (job) => {
    if (!job) return;
    queryClient.setQueryData(["jobs", String(job.id)], job);
    syncJobs((old = []) => updateJobList(old, job));
  };

  const filteredJobs = useMemo(() => {
    return filterAndSortJobs(jobs, { searchQuery, filterStatus, filterMinMatch, sortBy });
  }, [jobs, searchQuery, filterStatus, filterMinMatch, sortBy]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }) => jobApi.updateStatus(jobId, status),
    onMutate: async ({ jobId, status }) => {
      setJobFlag(jobId, "status", true);
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const previousJobs = queryClient.getQueryData(["jobs"]);
      const previousJob = queryClient.getQueryData(["jobs", String(jobId)]);

      syncJobs((old = []) =>
        old.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status,
                updated_at: new Date().toISOString(),
              }
            : job
        )
      );
      if (previousJob) {
        queryClient.setQueryData(["jobs", String(jobId)], {
          ...previousJob,
          status,
          updated_at: new Date().toISOString(),
        });
      }

      return { previousJobs, previousJob };
    },
    onSuccess: (res) => {
      applyJobUpdate(res.data);
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success("Status aktualisiert!");
    },
    onError: (err, vars, context) => {
      if (context?.previousJobs) queryClient.setQueryData(["jobs"], context.previousJobs);
      if (context?.previousJob) queryClient.setQueryData(["jobs", String(vars.jobId)], context.previousJob);
      if (typeof onJobsUpdate === "function" && context?.previousJobs) onJobsUpdate(context.previousJobs);
      toast.error(getApiErrorMessage(err, "Status konnte nicht aktualisiert werden"));
    },
    onSettled: (_data, _error, vars) => setJobFlag(vars.jobId, "status", false),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ status, jobIds }) => {
      const results = await Promise.all(jobIds.map((jobId) => jobApi.updateStatus(jobId, status)));
      return results.map((result) => result.data);
    },
    onMutate: async ({ status, jobIds }) => {
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const previousJobs = queryClient.getQueryData(["jobs"]);
      const jobIdSet = new Set(jobIds);
      syncJobs((old = []) =>
        old.map((job) =>
          jobIdSet.has(job.id)
            ? {
                ...job,
                status,
                updated_at: new Date().toISOString(),
              }
            : job
        )
      );
      return { previousJobs };
    },
    onSuccess: (updatedJobs) => {
      const byId = new Map(updatedJobs.map((job) => [job.id, job]));
      syncJobs((old = []) => old.map((job) => byId.get(job.id) || job));
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success(`${updatedJobs.length} Stellen aktualisiert!`);
      setSelectedJobs(new Set());
    },
    onError: (err, _vars, context) => {
      if (context?.previousJobs) {
        queryClient.setQueryData(["jobs"], context.previousJobs);
        if (typeof onJobsUpdate === "function") onJobsUpdate(context.previousJobs);
      }
      toast.error(getApiErrorMessage(err, "Stellen konnten nicht aktualisiert werden"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId) => jobApi.delete(jobId),
    onMutate: (jobId) => setJobFlag(jobId, "delete", true),
    onSuccess: (_res, jobId) => {
      queryClient.removeQueries({ queryKey: ["jobs", String(jobId)], exact: true });
      syncJobs((old = []) => old.filter((job) => job.id !== jobId));
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success("Stelle entfernt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Stelle konnte nicht gelöscht werden")),
    onSettled: (_data, _error, jobId) => setJobFlag(jobId, "delete", false),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (jobIds) => Promise.all(jobIds.map((jobId) => jobApi.delete(jobId))),
    onSuccess: (_res, jobIds) => {
      const deletedIds = new Set(jobIds);
      syncJobs((old = []) => old.filter((job) => !deletedIds.has(job.id)));
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success(`${jobIds.length} Stellen gelöscht`);
      setSelectedJobs(new Set());
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Stellen konnten nicht gelöscht werden")),
  });

  const matchMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateMatch(jobId, resumeId),
    onSuccess: (res) => {
      applyJobUpdate(res.data);
      toast.success("Match-Bewertung erstellt!");
      setProcessing({ jobId: null, feature: null });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Match-Bewertung konnte nicht erstellt werden"));
      setProcessing({ jobId: null, feature: null });
    },
  });

  const notesMutation = useMutation({
    mutationFn: ({ jobId, notes }) => jobApi.updateNotes(jobId, notes),
    onSuccess: (res, vars) => {
      applyJobUpdate(res.data);
      setNotesSaving((old) => ({ ...old, [vars.jobId]: false }));
    },
    onError: (err, vars) => {
      setNotesSaving((old) => ({ ...old, [vars.jobId]: false }));
      toast.error(getApiErrorMessage(err, "Notizen konnten nicht gespeichert werden"));
    },
  });

  const deadlineMutation = useMutation({
    mutationFn: ({ jobId, deadline }) => jobApi.updateDeadline(jobId, deadline),
    onMutate: ({ jobId }) => setJobFlag(jobId, "deadline", true),
    onSuccess: (res) => {
      applyJobUpdate(res.data);
      toast.success("Frist aktualisiert!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Frist konnte nicht gespeichert werden")),
    onSettled: (_data, _error, vars) => setJobFlag(vars.jobId, "deadline", false),
  });

  const urlMutation = useMutation({
    mutationFn: ({ jobId, url }) => jobApi.updateUrl(jobId, url),
    onMutate: ({ jobId }) => setJobFlag(jobId, "url", true),
    onSuccess: (res) => applyJobUpdate(res.data),
    onError: (err) => toast.error(getApiErrorMessage(err, "Link konnte nicht gespeichert werden")),
    onSettled: (_data, _error, vars) => setJobFlag(vars.jobId, "url", false),
  });

  const hasResume = Boolean(selectedResumeId);
  const isProcessing = (jobId, feature) => processing.jobId === jobId && processing.feature === feature;

  const openInterviewWorkspace = (job) => {
    document.body.classList.add("page-blur-transition");
    window.setTimeout(() => document.body.classList.remove("page-blur-transition"), 420);
    const params = new URLSearchParams({ tab: "interview" });
    if (selectedResumeId) params.set("resumeId", String(selectedResumeId));
    navigate(`/jobs/${job.id}?${params.toString()}`);
  };

  const handleDraftEmail = async (job) => {
    const userName = initData?.me?.full_name || initData?.me?.email?.split("@")[0] || "Bewerber";
    const jobForLink = { ...job, title: job.role || job.title, role: job.role || job.title };
    if (draftTexts[job.id]) {
      window.location.href = generateMailtoLink(jobForLink, draftTexts[job.id], userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
      return;
    }
    if (job.cover_letter) {
      window.location.href = generateMailtoLink(jobForLink, job.cover_letter, userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
      return;
    }
    setDraftLoading(job.id);
    try {
      const res = await motivationsschreibenApi.generate({ company: job.company || "", role: job.role || "", job_description: job.description || `${job.role} bei ${job.company}`, tone: "formell", resume_id: selectedResumeId || resumes[0]?.id || null, applicant_name: initData?.me?.full_name || "" });
      const text = res.data?.text || "";
      if (!text) throw new Error("empty");
      setDraftTexts((old) => ({ ...old, [job.id]: text }));
      window.location.href = generateMailtoLink(jobForLink, text, userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(err.message === "empty" ? "KI hat keinen Text zurückgegeben. Bitte erneut versuchen." : getApiErrorMessage(err, "Brief-Entwurf konnte nicht generiert werden"));
    } finally {
      setDraftLoading(null);
    }
  };

  const handleResearch = async (job, force = false) => {
    if (!force && job.research_data) {
      setResearchData(parseJson(job.research_data));
      setResearchModal({ jobId: job.id, companyName: job.company || "" });
      return;
    }
    setResearchModal({ jobId: job.id, companyName: job.company || "" });
    setResearchLoading(true);
    try {
      const res = await researchApi.research(job.company || "", job.description || "");
      setResearchData(res.data);
      applyJobUpdate({ ...job, research_data: JSON.stringify(res.data) });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  if (jobs.length === 0) {
    return <div className="animate-slide-up py-12 text-center text-gray-500">Noch keine Stellen gespeichert. Starte mit der Stellensuche!</div>;
  }

  return (
    <div className="space-y-6">
      <div className="animate-slide-up rounded-lg border border-gray-200 bg-white p-4">
        {resumes.length > 0 ? (
          <>
            <label className="mb-2 block text-sm font-medium text-gray-700">Lebenslauf für Inhaltserstellung auswählen</label>
            <select value={selectedResumeId || ""} onChange={(e) => setSelectedResumeId(Number(e.target.value))} className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm">
              {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name || resume.filename || `Lebenslauf ${resume.id}`}</option>)}
            </select>
          </>
        ) : (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Für Match, Motivationsschreiben und Gesprächsvorbereitung brauchst du zuerst einen Lebenslauf.</div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Stellentitel oder Unternehmen..." className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="all">Alle Status</option>{STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
          <div><label className="mb-1 block text-xs font-medium text-gray-700">Min. Match: {filterMinMatch}%</label><input type="range" min="0" max="100" value={filterMinMatch} onChange={(e) => setFilterMinMatch(Number(e.target.value))} className="w-full" /></div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="recent">Neueste zuerst</option><option value="match-high">Match (höchste)</option><option value="match-low">Match (niedrigste)</option><option value="salary-high">Gehalt (höchste)</option><option value="salary-low">Gehalt (niedrigste)</option></select>
        </div>
      </div>

      {selectedJobs.size > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-blue-900">{selectedJobs.size} Stelle{selectedJobs.size !== 1 ? "n" : ""} ausgewählt</span>
            <div className="flex flex-wrap gap-2">
              <select defaultValue="" disabled={bulkStatusMutation.isPending || bulkDeleteMutation.isPending} onChange={(e) => { if (e.target.value) { bulkStatusMutation.mutate({ status: e.target.value, jobIds: Array.from(selectedJobs) }); e.target.value = ""; } }} className="rounded border border-blue-300 bg-white px-3 py-1 text-xs disabled:cursor-not-allowed disabled:bg-gray-100">
                <option value="">Auswahl markieren als...</option>
                {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
              </select>
              <button onClick={() => { const ids = Array.from(selectedJobs); if (window.confirm(`${ids.length} Stelle(n) löschen?`)) bulkDeleteMutation.mutate(ids); }} disabled={bulkDeleteMutation.isPending || bulkStatusMutation.isPending} className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">{bulkDeleteMutation.isPending ? "Lösche Auswahl..." : "Auswahl löschen"}</button>
              <button onClick={() => setSelectedJobs(new Set())} disabled={bulkDeleteMutation.isPending || bulkStatusMutation.isPending} className="rounded border border-blue-300 bg-white px-3 py-1 text-xs text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60">Auswahl aufheben</button>
            </div>
          </div>
          {(bulkStatusMutation.isPending || bulkDeleteMutation.isPending) && <p className="mt-2 text-xs text-blue-800">{bulkStatusMutation.isPending ? "Auswahl wird aktualisiert..." : "Auswahl wird gelöscht..."}</p>}
        </div>
      )}

      {filteredJobs.map((job) => {
        const meta = getDeadlineMeta(job.deadline);
        const matchFeedback = parseJson(job.match_feedback);
        const isCollapsed = !!collapsedJobCards[job.id];
        const interviewQa = parseJson(job.interview_qa);
        const showActionHint = !hasResume || !job.company;
        const isDeleting = isJobFlagActive(job.id, "delete");
        const isStatusUpdating = isJobFlagActive(job.id, "status");
        const isDeadlineSaving = isJobFlagActive(job.id, "deadline");
        const isUrlSaving = isJobFlagActive(job.id, "url");

        const isDescriptionCollapsed = collapsedDescriptions[job.id] ?? true;
        const isFocused = focusedJobId != null && String(focusedJobId) === String(job.id);
        const isMatchSectionCollapsed = (section) => Boolean(collapsedMatchSections[`${job.id}-${section}`]);

        return (
          <div key={job.id} ref={(node) => { jobRefs.current[job.id] = node; }} className={`card card-hover overflow-hidden rounded-xl border bg-white shadow-sm transition-all duration-300 ${isFocused ? "border-blue-400 ring-2 ring-blue-100" : "border-gray-200"}`}>
            <div className="border-b border-gray-100 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => setSelectedJobs((old) => { const next = new Set(old); next.has(job.id) ? next.delete(job.id) : next.add(job.id); return next; })} className="h-4 w-4 rounded" />
                    <button onClick={() => navigate(`/jobs/${job.id}`)} className="truncate text-left text-base font-semibold text-gray-900 hover:text-indigo-700 sm:text-lg">{job.role || "Ohne Titel"}</button>
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Stellenanzeige öffnen"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  </div>
                  <p className="text-sm text-gray-600">{job.company || "Unbekanntes Unternehmen"}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{meta && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>}{job.match_score != null && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getMatchColorClass(job.match_score)}`}>{Math.round(job.match_score)}%</span>}<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span></div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCollapsedJobCards((old) => ({ ...old, [job.id]: !old[job.id] }))} className="p-1 text-gray-500 hover:text-gray-700">{isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
                  <span title={isDeleting ? "Stelle wird gerade gelöscht" : "Stelle löschen"}>
                    <button onClick={() => deleteMutation.mutate(job.id)} disabled={isDeleting} aria-disabled={isDeleting} className="p-1 text-red-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                  </span>
                </div>
              </div>
            </div>

            {!isCollapsed && <div className="space-y-4 bg-gray-50 p-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">{job.location && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /><span>{job.location}</span></div>}{job.salary && <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /><span>{job.salary}</span></div>}</div>
              {job.match_score != null && job.match_feedback && <div className="border-t border-gray-300 pt-3"><p className="mb-1 text-xs font-semibold text-gray-700">Match-Analyse</p><p className="text-xs leading-relaxed text-gray-600">{getMatchSummary(job.match_feedback)}</p></div>}
              {matchFeedback && (
                <div className="flex flex-wrap items-start gap-3">
                  <MatchDetailCard
                    title="Stärken"
                    items={matchFeedback.strengths}
                    tone="success"
                    collapsed={isMatchSectionCollapsed("strengths")}
                    onToggle={() => setCollapsedMatchSections((old) => ({ ...old, [`${job.id}-strengths`]: !old[`${job.id}-strengths`] }))}
                    className={isMatchSectionCollapsed("strengths") ? "w-full md:w-64" : "min-w-0 w-full md:flex-1"}
                  />
                  <MatchDetailCard
                    title="Verbesserungsvorschläge"
                    items={matchFeedback.gaps}
                    tone="danger"
                    collapsed={isMatchSectionCollapsed("gaps")}
                    onToggle={() => setCollapsedMatchSections((old) => ({ ...old, [`${job.id}-gaps`]: !old[`${job.id}-gaps`] }))}
                    className={isMatchSectionCollapsed("gaps") ? "w-full md:w-64" : "min-w-0 w-full md:flex-1"}
                  />
                  <MatchDetailCard
                    title="Empfehlungen"
                    items={matchFeedback.recommendations}
                    tone="info"
                    collapsed={isMatchSectionCollapsed("recommendations")}
                    onToggle={() => setCollapsedMatchSections((old) => ({ ...old, [`${job.id}-recommendations`]: !old[`${job.id}-recommendations`] }))}
                    className="w-full"
                  />
                </div>
              )}
              {job.description && <div className="border-t border-gray-300 pt-3"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-gray-700">Stellenbeschreibung</p><button onClick={() => setCollapsedDescriptions((old) => ({ ...old, [job.id]: !isDescriptionCollapsed }))} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">{isDescriptionCollapsed ? "Anzeigen" : "Minimieren"}</button></div>{!isDescriptionCollapsed && <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-blue-300 bg-white p-3 text-sm leading-relaxed text-gray-700">{job.description}</div>}</div>}
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Stellenanzeige Link</label><input type="url" defaultValue={job.url || ""} onBlur={(e) => { const value = e.target.value.trim() || null; if (value !== (job.url || null)) urlMutation.mutate({ jobId: job.id, url: value }); }} disabled={isUrlSaving} className="w-full rounded border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100" />{isUrlSaving && <p className="mt-1 text-xs text-gray-500">Link wird gespeichert...</p>}</div>
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Bewerbungsfrist</label><input type="date" defaultValue={job.deadline ? job.deadline.split("T")[0] : ""} onBlur={(e) => deadlineMutation.mutate({ jobId: job.id, deadline: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })} disabled={isDeadlineSaving} className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100" />{isDeadlineSaving && <p className="mt-1 text-xs text-gray-500">Frist wird gespeichert...</p>}</div>
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Notizen</label><textarea value={notesInput[job.id] ?? job.notes ?? ""} onChange={(e) => { const value = e.target.value; setNotesInput((old) => ({ ...old, [job.id]: value })); setNotesSaving((old) => ({ ...old, [job.id]: true })); clearTimeout(notesTimeoutsRef.current[job.id]); notesTimeoutsRef.current[job.id] = setTimeout(() => notesMutation.mutate({ jobId: job.id, notes: value }), 800); }} placeholder="Persönliche Notizen zu dieser Bewerbung..." className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm" rows={2} />{notesSaving[job.id] && <p className="mt-1 text-xs text-gray-500">Wird gespeichert...</p>}</div>
              <div className="flex flex-wrap gap-2">{STATUS_ORDER.filter((status) => status !== job.status).map((status) => <span key={status} title={isStatusUpdating ? "Status wird gerade aktualisiert" : ""}><button onClick={() => updateStatusMutation.mutate({ jobId: job.id, status })} disabled={isStatusUpdating} aria-disabled={isStatusUpdating} className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50">Als {STATUS_LABELS[status]} markieren</button></span>)}</div>
              {isStatusUpdating && <p className="text-xs text-gray-500">Status wird aktualisiert...</p>}
              {isDeleting && <p className="text-xs text-gray-500">Stelle wird gelöscht...</p>}
              {showActionHint && <div className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700">{!hasResume && <div>Bitte zuerst einen Lebenslauf auswählen, um Match und Gesprächsvorbereitung zu nutzen.</div>}{!job.company && <div>Recherche ist für diese Stelle nicht verfügbar, weil der Firmenname fehlt.</div>}</div>}
              <div className="flex flex-wrap gap-2">
                <ActionButton color="indigo" disabled={!hasResume || isProcessing(job.id, "match")} disabledReason={getDisabledReason({ feature: "match", job, hasResume, isProcessing: isProcessing(job.id, "match"), draftLoading: draftLoading === job.id })} onClick={() => { setProcessing({ jobId: job.id, feature: "match" }); matchMutation.mutate({ jobId: job.id, resumeId: selectedResumeId }); }} icon={<Zap className="h-4 w-4" />} label={isProcessing(job.id, "match") ? "Wird berechnet..." : "Match-Bewertung"} />
                <ActionButton color="emerald" disabled={draftLoading === job.id} disabledReason={getDisabledReason({ feature: "draft", job, hasResume, isProcessing: false, draftLoading: draftLoading === job.id })} onClick={() => handleDraftEmail(job)} icon={draftLoading === job.id ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <FileText className="h-4 w-4" />} label={draftLoading === job.id ? "Wird erstellt..." : "Anschreiben"} />
                <ActionButton color="amber" disabled={!hasResume} disabledReason={getDisabledReason({ feature: "interview", job, hasResume, isProcessing: false, draftLoading: draftLoading === job.id })} onClick={() => openInterviewWorkspace(job)} icon={<MessageSquare className="h-4 w-4" />} label="Gesprächsvorbereitung" />
                <ActionButton color={job.research_data ? "emerald-solid" : "emerald-outline"} disabled={!job.company} disabledReason={getDisabledReason({ feature: "research", job, hasResume, isProcessing: false, draftLoading: draftLoading === job.id })} onClick={() => handleResearch(job)} icon={<SearchCheck className="h-4 w-4" />} label="Recherche" />
              </div>
              {job.cover_letter && <div className="border-t border-gray-300 pt-3"><button onClick={() => setExpandedPanel(expandedPanel === `cover-${job.id}` ? null : `cover-${job.id}`)} className="flex items-center gap-2 text-sm font-semibold text-green-700"><FileText className="h-4 w-4" /> Erstelltes Motivationsschreiben</button>{expandedPanel === `cover-${job.id}` && <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-green-300 bg-white p-3 text-sm text-gray-700">{job.cover_letter}</div>}</div>}
              {job.interview_qa && (
                <div className="border-t border-gray-300 pt-3">
                  <button onClick={() => setExpandedPanel(expandedPanel === `interview-${job.id}` ? null : `interview-${job.id}`)} className="flex items-center gap-2 text-sm font-semibold text-purple-700">
                    <Brain className="h-4 w-4" /> Fragen zur Gesprächsvorbereitung
                  </button>
                  {expandedPanel === `interview-${job.id}` && (
                    <div className="mt-3 space-y-3">
                      {Array.isArray(interviewQa)
                        ? interviewQa.map((item, index) => {
                            const key = `${job.id}-${index}`;
                            const type = TYPE_MAP[item.type] || TYPE_MAP[(item.type || "").toLowerCase()] || item.type || "Frage";
                            const open = expandedQuestion === key;
                            return (
                              <div
                                key={key}
                                className={`overflow-hidden rounded-xl border transition-all duration-200 ${
                                  open ? "border-indigo-200 bg-white shadow-md" : "border-gray-200 bg-white"
                                }`}
                              >
                                <button
                                  onClick={() => setExpandedQuestion(open ? null : key)}
                                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-start gap-3">
                                      <span className="flex-shrink-0 text-xs font-semibold text-gray-400">Q{index + 1}</span>
                                      <p className="text-sm font-semibold text-gray-900">{item.question || item}</p>
                                    </div>
                                    <div className="ml-6 flex flex-wrap gap-2">
                                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TAG_COLORS[type] || "bg-gray-100 text-gray-700"}`}>{type}</span>
                                    </div>
                                  </div>
                                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
                                </button>
                                {open && (
                                  <div className="space-y-3 border-t border-gray-200 bg-white px-4 py-3">
                                    <div>
                                      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Antwort</h4>
                                      <p className="text-sm leading-relaxed text-gray-700">{item.answer || item.suggested_answer || ""}</p>
                                    </div>
                                    {(item.tip || item.suggested_answer) && (
                                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                        <p className="mb-1 text-[11px] font-semibold text-amber-900">PROFI-TIPP</p>
                                        <p className="text-sm text-amber-900">{item.tip || item.suggested_answer}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        : <div className="rounded-lg border border-purple-300 bg-white p-3 text-sm text-gray-700">{job.interview_qa}</div>}
                    </div>
                  )}
                </div>
              )}
            </div>}
          </div>
        );
      })}

      {researchModal && <ResearchModal companyName={researchModal.companyName} data={researchData} loading={researchLoading} jobId={researchModal.jobId} onRefresh={() => { const job = jobs.find((entry) => entry.id === researchModal.jobId); if (job) handleResearch(job, true); }} onClose={() => { setResearchModal(null); setResearchData(null); }} />}
    </div>
  );
}
