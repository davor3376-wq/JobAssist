import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Brain, ChevronDown, ChevronUp, DollarSign, ExternalLink, FileText, MapPin, SearchCheck, Send, Trash2, Zap } from "lucide-react";
import { jobApi, motivationsschreibenApi, researchApi, resumeApi } from "../services/api";
import { generateMailtoLink } from "../utils/emailHelpers";
import { getApiErrorMessage } from "../utils/apiError";
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

const parseJson = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const deadlineMeta = (value) => {
  if (!value) return null;
  const days = Math.ceil((new Date(value) - new Date()) / 86400000);
  if (days < 0) return { label: "Überfällig", className: "bg-red-100 text-red-800" };
  if (days === 0) return { label: "Heute", className: "bg-orange-100 text-orange-800" };
  if (days <= 3) return { label: `${days}T`, className: "bg-orange-100 text-orange-800" };
  return { label: `${days}T`, className: "bg-green-100 text-green-800" };
};

const matchColor = (score) => {
  if (score < 40) return "bg-red-100 text-red-800";
  if (score < 60) return "bg-amber-100 text-amber-800";
  if (score < 80) return "bg-green-100 text-green-700";
  return "bg-green-500 text-white";
};

export default function ApplicationsList({ jobs, onJobsUpdate }) {
  const queryClient = useQueryClient();
  const notesTimers = useRef({});
  const [collapsed, setCollapsed] = useState({});
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
  const [researchModal, setResearchModal] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);

  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: resumes = [] } = useQuery({ queryKey: ["resumes"], queryFn: () => resumeApi.list().then((res) => res.data) });

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) setSelectedResumeId(resumes[0].id);
  }, [resumes, selectedResumeId]);

  useEffect(() => () => Object.values(notesTimers.current).forEach(clearTimeout), []);

  const syncJobs = (updater) => {
    queryClient.setQueryData(["jobs"], (old = []) => updater(old));
    if (typeof onJobsUpdate === "function") onJobsUpdate((old = []) => updater(old));
  };

  const applyJob = (job) => {
    if (!job) return;
    queryClient.setQueryData(["jobs", String(job.id)], job);
    syncJobs((old = []) => old.map((entry) => (entry.id === job.id ? job : entry)));
  };

  const filteredJobs = useMemo(() => {
    return [...jobs]
      .filter((job) => {
        const matchesSearch = !searchQuery || job.role?.toLowerCase().includes(searchQuery.toLowerCase()) || job.company?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "all" || job.status === filterStatus;
        const matchesScore = job.match_score == null || job.match_score >= filterMinMatch;
        return matchesSearch && matchesStatus && matchesScore;
      })
      .sort((a, b) => {
        if (sortBy === "match-high") return (b.match_score || 0) - (a.match_score || 0);
        if (sortBy === "match-low") return (a.match_score || 0) - (b.match_score || 0);
        if (sortBy === "salary-high") return (parseInt(b.salary, 10) || 0) - (parseInt(a.salary, 10) || 0);
        if (sortBy === "salary-low") return (parseInt(a.salary, 10) || 0) - (parseInt(b.salary, 10) || 0);
        return new Date(b.created_at) - new Date(a.created_at);
      });
  }, [jobs, searchQuery, filterStatus, filterMinMatch, sortBy]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }) => jobApi.updateStatus(jobId, status),
    onSuccess: (res) => { applyJob(res.data); queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] }); toast.success("Status aktualisiert!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Status konnte nicht aktualisiert werden")),
  });
  const deleteMutation = useMutation({
    mutationFn: (jobId) => jobApi.delete(jobId),
    onSuccess: (_res, jobId) => { queryClient.removeQueries({ queryKey: ["jobs", String(jobId)], exact: true }); syncJobs((old = []) => old.filter((job) => job.id !== jobId)); queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] }); toast.success("Stelle entfernt"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Stelle konnte nicht gelöscht werden")),
  });
  const matchMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateMatch(jobId, resumeId),
    onSuccess: (res) => { applyJob(res.data); toast.success("Match-Bewertung erstellt!"); setProcessing({ jobId: null, feature: null }); },
    onError: (err) => { toast.error(getApiErrorMessage(err, "Match-Bewertung konnte nicht erstellt werden")); setProcessing({ jobId: null, feature: null }); },
  });
  const coverMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateCoverLetter(jobId, resumeId),
    onSuccess: (res) => { applyJob(res.data); toast.success("Motivationsschreiben erstellt!"); setProcessing({ jobId: null, feature: null }); },
    onError: (err) => { toast.error(getApiErrorMessage(err, "Motivationsschreiben konnte nicht erstellt werden")); setProcessing({ jobId: null, feature: null }); },
  });
  const interviewMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateInterviewPrep(jobId, resumeId),
    onSuccess: (res) => { applyJob(res.data); toast.success("Gesprächsvorbereitung erstellt!"); setProcessing({ jobId: null, feature: null }); },
    onError: (err) => { toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung konnte nicht erstellt werden")); setProcessing({ jobId: null, feature: null }); },
  });
  const notesMutation = useMutation({
    mutationFn: ({ jobId, notes }) => jobApi.updateNotes(jobId, notes),
    onSuccess: (res) => applyJob(res.data),
    onError: (err) => toast.error(getApiErrorMessage(err, "Notizen konnten nicht gespeichert werden")),
  });
  const deadlineMutation = useMutation({
    mutationFn: ({ jobId, deadline }) => jobApi.updateDeadline(jobId, deadline),
    onSuccess: (res) => { applyJob(res.data); toast.success("Frist aktualisiert!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Frist konnte nicht gespeichert werden")),
  });
  const urlMutation = useMutation({
    mutationFn: ({ jobId, url }) => jobApi.updateUrl(jobId, url),
    onSuccess: (res) => applyJob(res.data),
    onError: (err) => toast.error(getApiErrorMessage(err, "Link konnte nicht gespeichert werden")),
  });

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
      applyJob({ ...job, research_data: JSON.stringify(res.data) });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  if (jobs.length === 0) return <div className="animate-slide-up py-12 text-center text-gray-500">Noch keine Stellen gespeichert. Starte mit der Stellensuche!</div>;

  return (
    <div className="space-y-6">
      <div className="animate-slide-up rounded-lg border border-gray-200 bg-white p-4">
        {resumes.length > 0 && <select value={selectedResumeId || ""} onChange={(e) => setSelectedResumeId(Number(e.target.value))} className="mb-4 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm">{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name || resume.filename || `Lebenslauf ${resume.id}`}</option>)}</select>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Stellentitel oder Unternehmen..." className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="all">Alle Status</option>{STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select>
          <div><label className="mb-1 block text-xs font-medium text-gray-700">Min. Match: {filterMinMatch}%</label><input type="range" min="0" max="100" value={filterMinMatch} onChange={(e) => setFilterMinMatch(Number(e.target.value))} className="w-full" /></div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded border border-gray-300 px-3 py-2 text-sm"><option value="recent">Neueste zuerst</option><option value="match-high">Match (höchste)</option><option value="match-low">Match (niedrigste)</option><option value="salary-high">Gehalt (höchste)</option><option value="salary-low">Gehalt (niedrigste)</option></select>
        </div>
      </div>

      {filteredJobs.map((job) => {
        const meta = deadlineMeta(job.deadline);
        const isCollapsed = !!collapsed[job.id];
        const interviewQa = parseJson(job.interview_qa);
        return (
          <div key={job.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={selectedJobs.has(job.id)} onChange={() => setSelectedJobs((old) => { const next = new Set(old); next.has(job.id) ? next.delete(job.id) : next.add(job.id); return next; })} className="h-4 w-4 rounded" />
                    <h4 className="truncate font-semibold text-gray-900">{job.role || "Ohne Titel"}</h4>
                    {job.url && <a href={job.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Stellenanzeige öffnen"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  </div>
                  <p className="text-sm text-gray-600">{job.company || "Unbekanntes Unternehmen"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{meta && <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${meta.className}`}>{meta.label}</span>}{job.match_score != null && <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${matchColor(job.match_score)}`}>{Math.round(job.match_score)}%</span>}<span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status]}`}>{STATUS_LABELS[job.status]}</span></div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setCollapsed((old) => ({ ...old, [job.id]: !old[job.id] }))} className="p-1 text-gray-500 hover:text-gray-700">{isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}</button>
                  <button onClick={() => deleteMutation.mutate(job.id)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            {!isCollapsed && <div className="space-y-4 bg-gray-50 p-4">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">{job.location && <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /><span>{job.location}</span></div>}{job.salary && <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /><span>{job.salary}</span></div>}</div>
              {job.match_score != null && job.match_feedback && <div className="border-t border-gray-300 pt-3"><p className="mb-1 text-xs font-semibold text-gray-700">Match-Analyse</p><p className="text-xs leading-relaxed text-gray-600">{parseJson(job.match_feedback)?.summary || job.match_feedback}</p></div>}
              {job.description && <div className="border-t border-gray-300 pt-3"><p className="mb-2 text-sm font-semibold text-gray-700">Stellenanzeige</p><div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-blue-300 bg-white p-3 text-sm text-gray-700">{job.description}</div></div>}
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Stellenanzeige Link</label><input type="url" defaultValue={job.url || ""} onBlur={(e) => { const value = e.target.value.trim() || null; if (value !== (job.url || null)) urlMutation.mutate({ jobId: job.id, url: value }); }} className="w-full rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Bewerbungsfrist</label><input type="date" defaultValue={job.deadline ? job.deadline.split("T")[0] : ""} onBlur={(e) => deadlineMutation.mutate({ jobId: job.id, deadline: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })} className="w-full max-w-xs rounded border border-gray-300 px-3 py-2 text-sm" /></div>
              <div className="border-t border-gray-300 pt-3"><label className="mb-2 block text-sm font-semibold text-gray-700">Notizen</label><textarea value={notesInput[job.id] ?? job.notes ?? ""} onChange={(e) => { const value = e.target.value; setNotesInput((old) => ({ ...old, [job.id]: value })); clearTimeout(notesTimers.current[job.id]); notesTimers.current[job.id] = setTimeout(() => notesMutation.mutate({ jobId: job.id, notes: value }), 800); }} placeholder="Persönliche Notizen zu dieser Bewerbung..." className="w-full resize-none rounded border border-gray-300 px-3 py-2 text-sm" rows={2} /></div>
              <div className="flex flex-wrap gap-2">{STATUS_ORDER.filter((status) => status !== job.status).map((status) => <button key={status} onClick={() => updateStatusMutation.mutate({ jobId: job.id, status })} className="rounded border border-gray-300 px-3 py-1 text-xs hover:bg-gray-100">Als {STATUS_LABELS[status]} markieren</button>)}</div>
              <div className="flex flex-wrap gap-2">
                <TinyButton color="blue" disabled={!selectedResumeId} onClick={() => { setProcessing({ jobId: job.id, feature: "match" }); matchMutation.mutate({ jobId: job.id, resumeId: selectedResumeId }); }} icon={<Zap className="h-3 w-3" />} label={processing.jobId === job.id && processing.feature === "match" ? "Wird berechnet..." : "Match berechnen"} />
                <TinyButton color="green" disabled={!selectedResumeId} onClick={() => { setProcessing({ jobId: job.id, feature: "cover" }); coverMutation.mutate({ jobId: job.id, resumeId: selectedResumeId }); }} icon={<FileText className="h-3 w-3" />} label={processing.jobId === job.id && processing.feature === "cover" ? "Wird erstellt..." : "Motivationsschreiben"} />
                <TinyButton color="purple" disabled={!selectedResumeId} onClick={() => { setProcessing({ jobId: job.id, feature: "interview" }); interviewMutation.mutate({ jobId: job.id, resumeId: selectedResumeId }); }} icon={<Brain className="h-3 w-3" />} label={processing.jobId === job.id && processing.feature === "interview" ? "Wird vorbereitet..." : "Gesprächsvorbereitung"} />
                <TinyButton color="white" disabled={draftLoading === job.id} onClick={() => handleDraftEmail(job)} icon={draftLoading === job.id ? <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /> : <Send className="h-3 w-3" />} label={draftLoading === job.id ? "Generiert..." : "Brief-Entwurf"} />
                <TinyButton color={job.research_data ? "emerald-solid" : "emerald"} disabled={!job.company} onClick={() => handleResearch(job)} icon={<SearchCheck className="h-3 w-3" />} label={job.research_data ? "Recherche ansehen" : "Recherche"} />
              </div>
              {job.cover_letter && <div className="border-t border-gray-300 pt-3"><button onClick={() => setExpandedPanel(expandedPanel === `cover-${job.id}` ? null : `cover-${job.id}`)} className="flex items-center gap-2 text-sm font-semibold text-green-700"><FileText className="h-4 w-4" /> Erstelltes Motivationsschreiben</button>{expandedPanel === `cover-${job.id}` && <div className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg border border-green-300 bg-white p-3 text-sm text-gray-700">{job.cover_letter}</div>}</div>}
              {job.interview_qa && <div className="border-t border-gray-300 pt-3"><button onClick={() => setExpandedPanel(expandedPanel === `interview-${job.id}` ? null : `interview-${job.id}`)} className="flex items-center gap-2 text-sm font-semibold text-purple-700"><Brain className="h-4 w-4" /> Fragen zur Gesprächsvorbereitung</button>{expandedPanel === `interview-${job.id}` && <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-purple-300 bg-white p-3 text-sm text-gray-700">{Array.isArray(interviewQa) ? <ol className="space-y-3">{interviewQa.map((qa, i) => <li key={i}><strong>{i + 1}. {qa.question || qa}</strong>{qa.suggested_answer && <div className="mt-1 text-xs italic text-gray-600">{qa.suggested_answer}</div>}</li>)}</ol> : job.interview_qa}</div>}</div>}
            </div>}
          </div>
        );
      })}

      {researchModal && <ResearchModal companyName={researchModal.companyName} data={researchData} loading={researchLoading} jobId={researchModal.jobId} onRefresh={() => { const job = jobs.find((entry) => entry.id === researchModal.jobId); if (job) handleResearch(job, true); }} onClose={() => { setResearchModal(null); setResearchData(null); }} />}
    </div>
  );
}

function TinyButton({ onClick, disabled, color, icon, label }) {
  const styles = {
    blue: "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100",
    green: "border-green-300 bg-green-50 text-green-700 hover:bg-green-100",
    purple: "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100",
    white: "border-blue-300 bg-white text-blue-700 hover:bg-blue-50",
    emerald: "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50",
    "emerald-solid": "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return <button onClick={onClick} disabled={disabled} className={`flex items-center gap-1 rounded border px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${styles[color]}`}>{icon}{label}</button>;
}
