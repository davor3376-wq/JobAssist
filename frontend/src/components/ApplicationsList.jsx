import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { MapPin, DollarSign, Trash2, CheckCircle, Zap, FileText, Brain, ChevronDown, ChevronUp, MoreVertical, ExternalLink, Send, SearchCheck } from "lucide-react";
import { jobApi, resumeApi, motivationsschreibenApi, researchApi } from "../services/api";
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

const getMatchColorClass = (score) => {
  if (score < 30) return "bg-red-100 text-red-800";
  if (score < 40) return "bg-orange-100 text-orange-800";
  if (score < 50) return "bg-amber-100 text-amber-800";
  if (score < 60) return "bg-yellow-100 text-yellow-800";
  if (score < 70) return "bg-green-100 text-green-700";
  if (score < 80) return "bg-green-200 text-green-800";
  if (score < 90) return "bg-green-300 text-green-900";
  if (score < 100) return "bg-green-400 text-white";
  return "bg-green-600 text-white";
};

export default function ApplicationsList({ jobs, onJobsUpdate }) {
  const qc = useQueryClient();
  const [processingJobId, setProcessingJobId] = useState(null);
  const [processingFeature, setProcessingFeature] = useState(null);
  const [expandedJobId, setExpandedJobId] = useState(null);
  const [collapsedJobCards, setCollapsedJobCards] = useState({});
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [draftTexts, setDraftTexts] = useState({});
  const [draftLoading, setDraftLoading] = useState(null);
  const [researchModal, setResearchModal] = useState(null); // { jobId, companyName }
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);

  const { data: initData } = useQuery({ queryKey: ["init"] });
  const me = initData?.me;

  // Fetch user's resumes
  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => r.data),
  });

  // Default to first available resume once loaded
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes]);

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMinMatch, setFilterMinMatch] = useState(0);
  const [sortBy, setSortBy] = useState("recent"); // recent, match-high, match-low, salary-high, salary-low
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [notesInput, setNotesInput] = useState({});

  // Apply search + status filters (hard filter — removes from DOM)
  // Match score filter is applied via CSS for smooth animation
  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = !searchQuery ||
        job.role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || job.status === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch(sortBy) {
        case "match-high":
          return (b.match_score || 0) - (a.match_score || 0);
        case "match-low":
          return (a.match_score || 0) - (b.match_score || 0);
        case "salary-high":
          const salaryA = parseInt(a.salary) || 0;
          const salaryB = parseInt(b.salary) || 0;
          return salaryB - salaryA;
        case "salary-low":
          return parseInt(a.salary) || 0 - (parseInt(b.salary) || 0);
        default: // recent
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }) => jobApi.updateStatus(jobId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success("Status aktualisiert!");
    },
    onError: () => toast.error("Status konnte nicht aktualisiert werden"),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId) => jobApi.delete(jobId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success("Stelle entfernt");
    },
    onError: () => toast.error("Stelle konnte nicht gelöscht werden"),
  });

  const matchMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateMatch(jobId, resumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Match-Bewertung erstellt!");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
    onError: () => {
      toast.error("Match-Bewertung konnte nicht erstellt werden");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
  });

  const coverLetterMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateCoverLetter(jobId, resumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Motivationsschreiben erstellt!");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
    onError: () => {
      toast.error("Motivationsschreiben konnte nicht erstellt werden");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
  });

  const interviewPrepMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateInterviewPrep(jobId, resumeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Gesprächsvorbereitung erstellt!");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
    onError: () => {
      toast.error("Gesprächsvorbereitung konnte nicht erstellt werden");
      setProcessingJobId(null);
      setProcessingFeature(null);
    },
  });

  const updateNotesMutation = useMutation({
    mutationFn: ({ jobId, notes }) => jobApi.updateNotes(jobId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Notizen konnten nicht gespeichert werden"),
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ status }) => {
      const promises = Array.from(selectedJobs).map(jobId =>
        jobApi.updateStatus(jobId, status)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success(`${selectedJobs.size} Stellen aktualisiert!`);
      setSelectedJobs(new Set());
    },
    onError: () => toast.error("Stellen konnten nicht aktualisiert werden"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedJobs).map(jobId =>
        jobApi.delete(jobId)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success(`${selectedJobs.size} Stellen gelöscht`);
      setSelectedJobs(new Set());
    },
    onError: () => toast.error("Stellen konnten nicht gelöscht werden"),
  });

  const updateDeadlineMutation = useMutation({
    mutationFn: ({ jobId, deadline }) => jobApi.updateDeadline(jobId, deadline),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Frist aktualisiert!");
    },
    onError: () => toast.error("Frist konnte nicht gespeichert werden"),
  });

  const updateUrlMutation = useMutation({
    mutationFn: ({ jobId, url }) => jobApi.updateUrl(jobId, url),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
    onError: () => toast.error("Link konnte nicht gespeichert werden"),
  });

  const handleDraftEmail = async (job) => {
    const id = job.id;
    const userName = me?.full_name || me?.email?.split("@")[0] || "Bewerber";
    const jobForLink = { ...job, title: job.role || job.title, role: job.role || job.title, company: job.company };

    if (draftTexts[id]) {
      window.location.href = generateMailtoLink(jobForLink, draftTexts[id], userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
      return;
    }
    // Use existing cover letter if already generated
    if (job.cover_letter) {
      window.location.href = generateMailtoLink(jobForLink, job.cover_letter, userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
      return;
    }
    setDraftLoading(id);
    try {
      const res = await motivationsschreibenApi.generate({
        company: job.company || "",
        role: job.role || "",
        job_description: job.description || `${job.role} bei ${job.company}`,
        tone: "formell",
        resume_id: resumes[0]?.id || null,
        applicant_name: me?.full_name || "",
      });
      const text = res.data?.text || "";
      if (!text) {
        toast.error("KI hat keinen Text zurückgegeben. Bitte erneut versuchen.");
        return;
      }
      setDraftTexts((prev) => ({ ...prev, [id]: text }));
      window.location.href = generateMailtoLink(jobForLink, text, userName);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
    } catch (err) {
      // Interceptor handles 403 usage_limit (UpgradeModal) and 429 (rate toast)
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Brief-Entwurf konnte nicht generiert werden"));
    } finally {
      setDraftLoading(null);
    }
  };

  const handleResearch = async (job) => {
    // Show saved research immediately if available
    if (job.research_data) {
      try {
        setResearchData(JSON.parse(job.research_data));
      } catch { setResearchData(null); }
      setResearchModal({ jobId: job.id, companyName: job.company || "" });
      return;
    }
    setResearchData(null);
    setResearchModal({ jobId: job.id, companyName: job.company || "" });
    setResearchLoading(true);
    try {
      const res = await researchApi.research(job.company || "", job.description || "");
      setResearchData(res.data);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") { setResearchModal(null); return; }
      if (err.response?.status === 429) { setResearchModal(null); return; }
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 animate-slide-up">
        <p className="text-gray-500 mb-4">Noch keine Stellen gespeichert. Starte mit der Stellensuche!</p>
      </div>
    );
  }

  // Group jobs by status in the correct order
  const jobsByStatus = {};
  STATUS_ORDER.forEach(status => {
    jobsByStatus[status] = filteredJobs.filter(j => j.status === status);
  });

  return (
    <div className="space-y-6">
      {/* Resume Selector */}
      {resumes.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 animate-slide-up">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📄 Lebenslauf für Inhaltserstellung auswählen
          </label>
          <select
            value={selectedResumeId}
            onChange={(e) => setSelectedResumeId(Number(e.target.value))}
            className="w-full sm:max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            {resumes.map(resume => (
              <option key={resume.id} value={resume.id}>
                {resume.name || resume.filename || `Lebenslauf ${resume.id}`}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Dieser Lebenslauf wird für Match-Bewertung, Motivationsschreiben und Gesprächsvorbereitung verwendet</p>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">🔍 Suche</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Stellentitel oder Unternehmen..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">📌 Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Status</option>
              {STATUS_ORDER.map(status => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>

          {/* Filter by Min Match Score */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">✨ Min. Match: {filterMinMatch}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={filterMinMatch}
              onChange={(e) => setFilterMinMatch(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">↕️ Sortieren</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Neueste zuerst</option>
              <option value="match-high">Match (höchste)</option>
              <option value="match-low">Match (niedrigste)</option>
              <option value="salary-high">Gehalt (höchste)</option>
              <option value="salary-low">Gehalt (niedrigste)</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Zeige {filteredJobs.filter(j => !j.match_score || j.match_score >= filterMinMatch).length} von {jobs.length} Stellen
          {selectedJobs.size > 0 && ` • ${selectedJobs.size} ausgewählt`}
        </p>
      </div>

      {/* Bulk Actions */}
      {selectedJobs.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedJobs.size} Stelle{selectedJobs.size !== 1 ? 'n' : ''} ausgewählt
            </span>
            <div className="flex gap-2 flex-wrap">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    bulkUpdateStatusMutation.mutate({ status: e.target.value });
                    e.target.value = "";
                  }
                }}
                className="px-3 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                defaultValue=""
              >
                <option value="">Auswahl markieren als...</option>
                {STATUS_ORDER.map(status => (
                  <option key={status} value={status}>{STATUS_LABELS[status]}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (window.confirm(`${selectedJobs.size} Stelle(n) löschen?`)) {
                    bulkDeleteMutation.mutate();
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
                className="px-3 py-1 border border-red-300 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Auswahl löschen
              </button>
              <button
                onClick={() => setSelectedJobs(new Set())}
                className="px-3 py-1 border border-gray-300 rounded text-xs hover:bg-gray-100"
              >
                Auswahl aufheben
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
      {STATUS_ORDER.map(status => {
        const statusJobs = jobsByStatus[status];
        if (statusJobs.length === 0) return null;

        return (
          <div key={status} className="animate-slide-up">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {STATUS_LABELS[status]} ({statusJobs.length})
              </h3>
            </div>

            <div className="space-y-3">
              {statusJobs.map(job => {
                const isCollapsed = collapsedJobCards[job.id];
                const isScoreHidden = job.match_score != null && job.match_score < filterMinMatch;
                return (
                <div
                  key={job.id}
                  className={`rounded-lg border border-gray-200 hover:border-blue-300 overflow-hidden transition-all duration-300 ${isScoreHidden ? 'opacity-0 max-h-0 border-0 !mt-0 pointer-events-none' : 'opacity-100 max-h-[2000px]'}`}
                >
                  {/* Minimized Header */}
                  <div className={`p-4 ${isCollapsed ? 'hover:bg-blue-50' : 'bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={selectedJobs.has(job.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedJobs);
                            if (e.target.checked) {
                              newSelected.add(job.id);
                            } else {
                              newSelected.delete(job.id);
                            }
                            setSelectedJobs(newSelected);
                          }}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">{job.role || "Ohne Titel"}</h4>
                            {job.url && (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex-shrink-0 text-blue-500 hover:text-blue-700 transition-colors"
                                title="Stellenanzeige öffnen"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{job.company || "Unbekanntes Unternehmen"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end max-w-[160px] sm:max-w-none">
                        {job.deadline && (() => {
                          const now = new Date();
                          const deadline = new Date(job.deadline);
                          const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                          return (
                            <div className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                              daysLeft < 0 ? 'bg-red-100 text-red-800' :
                              daysLeft <= 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              📅 {daysLeft < 0 ? 'Überfällig' : daysLeft === 0 ? 'Heute' : `${daysLeft}T`}
                            </div>
                          );
                        })()}
                        {job.match_score !== null && job.match_score !== undefined && (
                          <div
                            className={`text-xs font-medium px-1.5 py-0.5 rounded cursor-help ${getMatchColorClass(job.match_score)}`}
                            title={(() => { try { return JSON.parse(job.match_feedback)?.summary || ""; } catch { return job.match_feedback || ""; } })()}
                          >
                            ✨ {Math.round(job.match_score)}%
                          </div>
                        )}
                        <span className={`hidden sm:inline px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                          {STATUS_LABELS[job.status]}
                        </span>
                        <button
                          onClick={() => setCollapsedJobCards(prev => ({ ...prev, [job.id]: !prev[job.id] }))}
                          className="text-gray-500 hover:text-gray-700 transition-colors p-0.5"
                        >
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => deleteJobMutation.mutate(job.id)}
                          disabled={deleteJobMutation.isPending}
                          className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 p-0.5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {!isCollapsed && (
                  <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">

                    {/* Location & Salary */}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      {job.salary && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{job.salary}</span>
                        </div>
                      )}
                    </div>

                    {/* Match Feedback Summary */}
                    {job.match_score != null && job.match_feedback && (
                      <div className="border-t border-gray-300 pt-3">
                        <p className="text-xs font-semibold text-gray-700 mb-1">✨ Match-Analyse</p>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {(() => { try { return JSON.parse(job.match_feedback)?.summary || job.match_feedback; } catch { return job.match_feedback; } })()}
                        </p>
                      </div>
                    )}

                    {/* Stellenanzeige URL */}
                    <div className="border-t border-gray-300 pt-3">
                      <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-1">
                        🔗 Stellenanzeige Link
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:text-blue-700 transition-colors" title="Link öffnen">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </label>
                      <input
                        type="url"
                        key={`${job.id}-url`}
                        defaultValue={job.url || ""}
                        onBlur={(e) => {
                          const val = e.target.value.trim() || null;
                          if (val !== (job.url || null)) {
                            updateUrlMutation.mutate({ jobId: job.id, url: val });
                          }
                        }}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Job Description */}
                    {job.description && (
                      <div className="border-t border-gray-300 pt-3">
                        <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          📋 Stellenanzeige
                        </p>
                        <div className="p-3 bg-white border border-blue-300 rounded-lg text-sm text-gray-700 max-h-96 overflow-y-auto whitespace-pre-wrap font-normal leading-relaxed">
                          {job.description}
                        </div>
                      </div>
                    )}

                    {/* Deadline */}
                    <div className="border-t border-gray-300 pt-3">
                      <label className="text-sm font-semibold text-gray-700 block mb-2">📅 Bewerbungsfrist</label>
                      <input
                        type="date"
                        key={`${job.id}-${job.deadline}`}
                        defaultValue={job.deadline ? job.deadline.split('T')[0] : ""}
                        onBlur={(e) => updateDeadlineMutation.mutate({ jobId: job.id, deadline: e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : null })}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Notes */}
                    <div className="border-t border-gray-300 pt-3">
                      <label className="text-sm font-semibold text-gray-700 block mb-2">📝 Notizen</label>
                      <textarea
                        value={notesInput[job.id] !== undefined ? notesInput[job.id] : (job.notes || "")}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setNotesInput(prev => ({ ...prev, [job.id]: newValue }));
                          // Debounced save: save after user stops typing for 1 second
                          clearTimeout(window.notesTimeout?.[job.id]);
                          const timeout = setTimeout(() => {
                            updateNotesMutation.mutate({ jobId: job.id, notes: newValue });
                          }, 1000);
                          window.notesTimeout = window.notesTimeout || {};
                          window.notesTimeout[job.id] = timeout;
                        }}
                        placeholder="Persönliche Notizen zu dieser Bewerbung..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows={2}
                      />
                      {updateNotesMutation.isPending && (
                        <p className="text-xs text-gray-500 mt-1">Wird gespeichert...</p>
                      )}
                    </div>

                    {/* Status Update Dropdown */}
                    <div className="flex gap-2 flex-wrap">
                      {STATUS_ORDER.filter(s => s !== job.status).map(nextStatus => (
                        <button
                          key={nextStatus}
                          onClick={() =>
                            updateStatusMutation.mutate({ jobId: job.id, status: nextStatus })
                          }
                          disabled={updateStatusMutation.isPending}
                          className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Als {STATUS_LABELS[nextStatus]} markieren
                        </button>
                      ))}
                    </div>

                    {/* Content Generation Features */}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setProcessingJobId(job.id);
                          setProcessingFeature("match");
                          matchMutation.mutate({ jobId: job.id, resumeId: selectedResumeId });
                        }}
                        disabled={processingJobId === job.id && processingFeature === "match" || !selectedResumeId}
                        className="text-xs px-3 py-1.5 rounded border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Zap className="w-3 h-3" />
                        {processingJobId === job.id && processingFeature === "match" ? "Wird berechnet..." : "Match berechnen"}
                      </button>
                      <button
                        onClick={() => {
                          setProcessingJobId(job.id);
                          setProcessingFeature("cover");
                          coverLetterMutation.mutate({ jobId: job.id, resumeId: selectedResumeId });
                        }}
                        disabled={processingJobId === job.id && processingFeature === "cover" || !selectedResumeId}
                        className="text-xs px-3 py-1.5 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        {processingJobId === job.id && processingFeature === "cover" ? "Wird erstellt..." : "Motivationsschreiben"}
                      </button>
                      <button
                        onClick={() => {
                          setProcessingJobId(job.id);
                          setProcessingFeature("interview");
                          interviewPrepMutation.mutate({ jobId: job.id, resumeId: selectedResumeId });
                        }}
                        disabled={processingJobId === job.id && processingFeature === "interview" || !selectedResumeId}
                        className="text-xs px-3 py-1.5 rounded border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Brain className="w-3 h-3" />
                        {processingJobId === job.id && processingFeature === "interview" ? "Wird vorbereitet..." : "Gesprächsvorbereitung"}
                      </button>
                      <button
                        onClick={() => handleDraftEmail(job)}
                        disabled={draftLoading === job.id}
                        className="text-xs px-3 py-1.5 rounded border border-blue-300 bg-white text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {draftLoading === job.id ? (
                          <><div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Generiert…</>
                        ) : (
                          <><Send className="w-3 h-3" />Brief-Entwurf</>
                        )}
                      </button>
                      <button
                        onClick={() => handleResearch(job)}
                        disabled={!job.company}
                        className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ${job.research_data ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700" : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"}`}
                      >
                        <SearchCheck className="w-3 h-3" />
                        {job.research_data ? "Recherche ansehen" : "Recherche"}
                      </button>
                    </div>

                    {/* Generated Content Display */}
                    {job.cover_letter && (
                      <div className="border-t border-gray-300 pt-3">
                        <button
                          onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                          className="text-sm font-semibold text-green-700 hover:text-green-800 flex items-center gap-2 transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          Erstelltes Motivationsschreiben
                        </button>
                        {expandedJobId === job.id && (
                          <div className="mt-3 p-3 bg-white border border-green-300 rounded-lg text-sm text-gray-700 max-h-64 overflow-y-auto whitespace-pre-wrap font-normal leading-relaxed">
                            {job.cover_letter}
                          </div>
                        )}
                      </div>
                    )}

                    {job.interview_qa && (
                      <div className="border-t border-gray-300 pt-3">
                        <button
                          onClick={() => setExpandedJobId(expandedJobId === `interview-${job.id}` ? null : `interview-${job.id}`)}
                          className="text-sm font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-2 transition-colors"
                        >
                          <Brain className="w-4 h-4" />
                          Fragen zur Gesprächsvorbereitung
                        </button>
                        {expandedJobId === `interview-${job.id}` && (
                          <div className="mt-3 p-3 bg-white border border-purple-300 rounded-lg text-sm text-gray-700 max-h-64 overflow-y-auto">
                            {(() => {
                              try {
                                const parsed = JSON.parse(job.interview_qa);
                                return Array.isArray(parsed) ? (
                                  <ol className="space-y-3">
                                    {parsed.map((qa, idx) => (
                                      <li key={idx} className="text-sm">
                                        <strong className="text-gray-900">{idx + 1}. {qa.question || qa}</strong>
                                        {qa.suggested_answer && <div className="mt-2 ml-4 text-gray-600 text-xs italic border-l-2 border-purple-200 pl-2">{qa.suggested_answer}</div>}
                                      </li>
                                    ))}
                                  </ol>
                                ) : (
                                  <p>{JSON.stringify(parsed)}</p>
                                );
                              } catch (e) {
                                return <p className="text-gray-600">{job.interview_qa}</p>;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>
        );
      })}
      </div>

      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          jobId={researchModal.jobId}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}
    </div>
  );
}
