import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { Trash2, Zap, FileText, MessageSquare, Copy, Check, ChevronDown, Download, SearchCheck } from "lucide-react";
import { jobApi, coverLetterApi, interviewApi, resumeApi, researchApi } from "../services/api";
import ResearchModal from "../components/ResearchModal";
import { getApiErrorMessage } from "../utils/apiError";

const loadStored = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const LoadingSpinner = () => (
  <div className="inline-block">
    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
  </div>
);

const CircularScore = ({ score }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 90) return { bg: "#bbf7d0", stroke: "#16a34a", text: "#15803d" };
    if (s >= 80) return { bg: "#bbf7d0", stroke: "#22c55e", text: "#166534" };
    if (s >= 70) return { bg: "#dcfce7", stroke: "#4ade80", text: "#15803d" };
    if (s >= 60) return { bg: "#f0fdf4", stroke: "#86efac", text: "#16a34a" };
    if (s >= 50) return { bg: "#fef3c7", stroke: "#f59e0b", text: "#d97706" };
    if (s >= 40) return { bg: "#ffedd5", stroke: "#fb923c", text: "#ea580c" };
    return { bg: "#fee2e2", stroke: "#ef4444", text: "#dc2626" };
  };

  const colors = getColor(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill={colors.bg}
            stroke="#e5e7eb"
            strokeWidth="2"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: colors.text }}>
              {score}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const { data: initData } = useQuery({ queryKey: ["init"] });

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId).then((r) => {
      const allJobs = loadStored("jobs") || [];
      const merged = allJobs.some((entry) => String(entry.id) === String(jobId))
        ? allJobs.map((entry) => (String(entry.id) === String(jobId) ? r.data : entry))
        : [r.data, ...allJobs];
      saveStored("jobs", merged);
      return r.data;
    }),
    placeholderData: () =>
      qc.getQueryData(["jobs"])?.find((entry) => String(entry.id) === String(jobId)) ||
      loadStored("jobs")?.find((entry) => String(entry.id) === String(jobId)),
  });

  const { data: resumesQuery = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      saveStored("resumes", r.data);
      return r.data;
    }),
    initialData: () =>
      qc.getQueryData(["resumes"]) ||
      initData?.resumes ||
      loadStored("resumes"),
  });
  const resumes = resumesQuery?.length ? resumesQuery : initData?.resumes || loadStored("resumes") || [];

  const [selectedResume, setSelectedResume] = useState(null);
  const resumeId = selectedResume ?? resumes[0]?.id;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["jobs"] });

  const matchMutation = useMutation({
    mutationFn: () => jobApi.match(Number(jobId), resumeId),
    onSuccess: (res) => {
      qc.setQueryData(["jobs", jobId], res.data);
      invalidate();
      toast.success("Match-Bewertung erstellt!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Match-Bewertung konnte nicht erstellt werden")),
  });

  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: () => { invalidate(); setActiveTab("cover-letter"); toast.success("Anschreiben fertig!"); },
    onError: () => toast.error("Fehler beim Erstellen des Anschreibens"),
  });

  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: () => { invalidate(); setActiveTab("interview"); toast.success("Gesprächsvorbereitung fertig!"); },
    onError: () => toast.error("Fehler beim Erstellen der Gesprächsvorbereitung"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { navigate("/jobs"); toast.success("Stelle gelöscht"); },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2 text-gray-600">
          <LoadingSpinner />
          <span>Stellendetails werden geladen...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600 font-medium">Stelle nicht gefunden.</p>
      </div>
    );
  }

  const matchFeedback = (() => { try { return job.match_feedback ? JSON.parse(job.match_feedback) : null; } catch { return null; } })();
  const interviewQA = (() => { try { return job.interview_qa ? JSON.parse(job.interview_qa) : null; } catch { return null; } })();

  const tabs = [
    { id: "overview", label: "Übersicht" },
    { id: "cover-letter", label: "Anschreiben", disabled: !job.cover_letter },
    { id: "interview", label: "Gesprächsvorbereitung", disabled: !job.interview_qa },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="animate-fade-in mb-8">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-1">{job.role || "Ohne Titel"}</h1>
            <p className="text-lg text-gray-600">{job.company || "Unbekanntes Unternehmen"}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Stelle löschen"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Resume selector */}
      {resumes.length > 0 && (
        <div className="animate-slide-up mb-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <label className="text-sm font-semibold text-gray-700 block mb-2">Lebenslauf auswählen</label>
          <div className="relative">
            <select
              value={resumeId}
              onChange={e => setSelectedResume(Number(e.target.value))}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 appearance-none cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0 transition-all"
            >
              {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
          </div>
        </div>
      )}

      {resumes.length === 0 && (
        <div className="animate-slide-up mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm font-medium text-amber-900">Für Match-Bewertung, Anschreiben und Gesprächsvorbereitung brauchst du zuerst einen Lebenslauf.</p>
          <Link to="/resume" className="inline-flex mt-3 text-sm font-semibold text-amber-800 hover:text-amber-900">
            Lebenslauf hochladen
          </Link>
        </div>
      )}

      {/* Action buttons */}
      <div className="animate-slide-up flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => matchMutation.mutate()}
          disabled={matchMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-400 disabled:to-gray-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:shadow-none"
        >
          {matchMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Wird analysiert…</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Match-Bewertung</span>
            </>
          )}
        </button>
        <button
          onClick={() => coverLetterMutation.mutate()}
          disabled={coverLetterMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:from-gray-400 disabled:to-gray-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:shadow-none"
        >
          {coverLetterMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Wird erstellt…</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Anschreiben</span>
            </>
          )}
        </button>
        <button
          onClick={() => interviewMutation.mutate()}
          disabled={interviewMutation.isPending || !resumeId}
          className="flex items-center gap-2 px-5 py-3 font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:cursor-not-allowed disabled:shadow-none"
        >
          {interviewMutation.isPending ? (
            <>
              <LoadingSpinner />
              <span>Wird erstellt…</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4" />
              <span>Gesprächsvorbereitung</span>
            </>
          )}
        </button>
        <button
          onClick={async () => {
            // If saved research exists, show it immediately
            if (job.research_data) {
              try {
                setResearchData(JSON.parse(job.research_data));
              } catch { setResearchData(null); }
              setResearchOpen(true);
              return;
            }
            setResearchData(null);
            setResearchOpen(true);
            setResearchLoading(true);
            try {
              const res = await researchApi.research(job.company || "", job.description || "");
              setResearchData(res.data);
            } catch (err) {
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
              }
              setResearchOpen(false);
            } finally {
              setResearchLoading(false);
            }
          }}
          disabled={!job?.company}
          className={`flex items-center gap-2 px-5 py-3 font-semibold rounded-lg transition-all duration-200 shadow-sm ${job?.research_data ? "text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-600" : "text-emerald-700 bg-white border border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400"} disabled:opacity-50`}
        >
          <SearchCheck className="w-4 h-4" />
          <span>{job?.research_data ? "Recherche ansehen" : "Recherche"}</span>
        </button>
      </div>

      {/* Match score banner */}
      {job.match_score != null && (
        <div className="animate-slide-up mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-6">Match-Analyse</h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0">
                <CircularScore score={job.match_score} />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 leading-relaxed">{matchFeedback?.summary}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs - Modern pill-style */}
      <div className="animate-slide-up mb-8">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-white text-indigo-600 shadow-sm"
                  : tab.disabled
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-slide-up">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Job Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gradient-to-b from-indigo-600 to-indigo-400 rounded-full"></span>
                Stellenbeschreibung
              </h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </div>

            {/* Strengths & Gaps */}
            {matchFeedback && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="bg-white rounded-xl border border-green-200 border-l-4 border-l-emerald-500 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Stärken
                    </h3>
                    <ul className="space-y-3">
                      {matchFeedback.strengths?.map((s, i) => (
                        <li key={i} className="flex gap-3 text-gray-700">
                          <span className="text-emerald-500 font-bold flex-shrink-0">+</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gaps */}
                  <div className="bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Verbesserungsvorschläge
                    </h3>
                    <ul className="space-y-3">
                      {matchFeedback.gaps?.map((g, i) => (
                        <li key={i} className="flex gap-3 text-gray-700">
                          <span className="text-red-500 font-bold flex-shrink-0">-</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                {matchFeedback.recommendations?.length > 0 && (
                  <div className="bg-white rounded-xl border border-blue-200 border-l-4 border-l-blue-500 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Empfehlungen
                    </h3>
                    <ul className="space-y-3">
                      {matchFeedback.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-3 text-gray-700">
                          <span className="text-blue-500 font-bold flex-shrink-0">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "cover-letter" && job.cover_letter && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
              <div className="flex flex-wrap justify-between items-center mb-6 gap-3">
                <h3 className="text-lg font-semibold text-gray-900">Erstelltes Anschreiben</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(job.cover_letter);
                      setCopiedIndex(-1);
                      setTimeout(() => setCopiedIndex(null), 2000);
                      toast.success("In Zwischenablage kopiert!");
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all duration-200 border border-indigo-200"
                  >
                    {copiedIndex === -1 ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Kopiert</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Kopieren</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([job.cover_letter], { type: "text/plain;charset=utf-8" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Anschreiben_${job.company || "Bewerbung"}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all duration-200 border border-gray-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={() => {
                      const escaped = job.cover_letter.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Anschreiben</title><style>@page{margin:2cm;size:A4}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000;}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit;">${escaped}</pre></body></html>`;
                      const blob = new Blob([html], { type: "text/html" });
                      const url = URL.createObjectURL(blob);
                      const win = window.open(url);
                      win.addEventListener("load", () => { win.print(); URL.revokeObjectURL(url); });
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 border border-red-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      const esc = (s) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Anschreiben</title></head><body><p style="font-family:Arial;font-size:12pt;">${esc(job.cover_letter).replace(/\n/g,"</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
                      const blob = new Blob(["\ufeff", html], { type: "application/msword" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `Anschreiben_${job.company || "Bewerbung"}.doc`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-blue-200"
                  >
                    <Download className="w-4 h-4" />
                    <span>DOCX</span>
                  </button>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{job.cover_letter}</p>
            </div>
          </div>
        )}

        {activeTab === "interview" && interviewQA && (
          <div className="space-y-4">
            {/* Export buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={() => {
                  const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                  const rows = interviewQA.map((item, i) => {
                    const tip = item.tip ? `<div style="background:#fef3c7;padding:8px 12px;border-radius:6px;font-size:10pt;color:#92400e;margin-top:8px;"><strong>Tipp:</strong> ${esc(item.tip)}</div>` : "";
                    return `<div style="margin-bottom:28px;page-break-inside:avoid;">
                      <div style="font-weight:bold;font-size:13pt;margin-bottom:4px;">F${i+1}: ${esc(item.question)}</div>
                      <div style="font-size:9pt;color:#6b7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">${esc(item.type)}</div>
                      <div style="font-size:11pt;margin-bottom:4px;"><strong>Antwort:</strong></div>
                      <div style="font-size:11pt;color:#374151;">${esc(item.answer).replace(/\n/g,"<br>")}</div>
                      ${tip}
                    </div>`;
                  }).join('<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">');
                  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gesprächsvorbereitung</title><style>@page{margin:2cm;size:A4}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000;}</style></head><body><h1 style="font-size:18pt;margin-bottom:4px;">${esc(job.role||"Stelle")}</h1><p style="color:#6b7280;margin-bottom:28px;">${esc(job.company||"")}</p>${rows}</body></html>`;
                  const blob = new Blob([html], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const win = window.open(url);
                  win.addEventListener("load", () => { win.print(); URL.revokeObjectURL(url); });
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all duration-200 border border-red-200"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
              <button
                onClick={() => {
                  const esc = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                  const rows = interviewQA.map((item, i) =>
                    `<h3>F${i+1}: ${esc(item.question)}</h3><p><em>${esc(item.type)}</em></p><p><strong>Antwort:</strong></p><p>${esc(item.answer).replace(/\n/g,"</p><p>")}</p>${item.tip ? `<p><strong>Tipp:</strong> ${esc(item.tip)}</p>` : ""}`
                  ).join("<hr>");
                  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>Gesprächsvorbereitung</title></head><body><h1>${esc(job.role||"Stelle")}</h1><h2>${esc(job.company||"")}</h2>${rows}</body></html>`;
                  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `Gespraechsvorbereitung_${job.company||"Bewerbung"}.doc`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-blue-200"
              >
                <Download className="w-4 h-4" />
                <span>DOCX</span>
              </button>
            </div>

            {interviewQA.map((item, i) => (
              <div
                key={i}
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  expandedQuestion === i
                    ? "bg-white border-indigo-200 shadow-md"
                    : "bg-gray-50 border-gray-200 hover:border-gray-300"
                }`}
              >
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === i ? null : i)}
                  className="w-full px-6 py-4 flex items-start justify-between gap-4 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-1">
                      <span className="text-sm font-semibold text-gray-400 flex-shrink-0">
                        Q{i + 1}
                      </span>
                      <p className="font-semibold text-gray-900 text-sm">{item.question}</p>
                    </div>
                    <div className="flex gap-2 ml-7 flex-wrap">
                      {(() => {
                        const typeMap = {
                          "behavioral": "Verhalten", "behaviour": "Verhalten", "behaviour-based": "Verhalten",
                          "technical": "Fachlich", "technical knowledge": "Fachlich", "fachwissen": "Fachlich",
                          "situational": "Situativ", "situation": "Situativ",
                          "motivation": "Motivation", "motivational": "Motivation",
                          "competency": "Kompetenz", "competence": "Kompetenz",
                          "culture": "Kultur", "cultural fit": "Kultur", "culture fit": "Kultur",
                          "leadership": "Führung", "management": "Führung",
                          "problem-solving": "Problemlösung", "problem solving": "Problemlösung", "analytical": "Problemlösung",
                          "creativity": "Kreativität", "creative": "Kreativität",
                          "communication": "Kommunikation", "interpersonal": "Kommunikation",
                          "teamwork": "Teamarbeit", "collaboration": "Teamarbeit", "team": "Teamarbeit",
                          "adaptability": "Anpassung", "flexibility": "Anpassung", "adaptabilität": "Anpassung",
                          "stress": "Stressresistenz", "stress management": "Stressresistenz",
                          "time management": "Zeitmanagement", "organization": "Zeitmanagement",
                          "sales": "Vertrieb", "customer": "Kundenorientierung", "service": "Kundenorientierung",
                        };
                        const raw = item.type || "";
                        const t = typeMap[raw] || typeMap[raw.toLowerCase()] || raw;
                        const tagColor =
                          t === "Fachlich"         ? "bg-blue-100 text-blue-700" :
                          t === "Verhalten"        ? "bg-violet-100 text-violet-700" :
                          t === "Situativ"         ? "bg-amber-100 text-amber-700" :
                          t === "Motivation"       ? "bg-emerald-100 text-emerald-700" :
                          t === "Kompetenz"        ? "bg-rose-100 text-rose-700" :
                          t === "Kultur"           ? "bg-teal-100 text-teal-700" :
                          t === "Führung"          ? "bg-indigo-100 text-indigo-700" :
                          t === "Problemlösung"    ? "bg-orange-100 text-orange-700" :
                          t === "Kreativität"      ? "bg-pink-100 text-pink-700" :
                          t === "Kommunikation"    ? "bg-cyan-100 text-cyan-700" :
                          t === "Teamarbeit"       ? "bg-lime-100 text-lime-700" :
                          t === "Anpassung"        ? "bg-sky-100 text-sky-700" :
                          t === "Stressresistenz"  ? "bg-red-100 text-red-700" :
                          t === "Zeitmanagement"   ? "bg-yellow-100 text-yellow-700" :
                          t === "Vertrieb"         ? "bg-green-100 text-green-700" :
                          t === "Kundenorientierung" ? "bg-purple-100 text-purple-700" :
                                                    "bg-gray-100 text-gray-700";
                        return (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${tagColor}`}>
                            {t}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      expandedQuestion === i ? "transform rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedQuestion === i && (
                  <div className="border-t border-gray-200 bg-white px-6 py-4 space-y-4 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Antwort</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                    {item.tip && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-900 mb-1">PROFI-TIPP</p>
                        <p className="text-sm text-amber-900">{item.tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {researchOpen && (
        <ResearchModal
          companyName={job?.company || ""}
          data={researchData}
          loading={researchLoading}
          jobId={job?.id}
          onRefresh={async () => {
            setResearchLoading(true);
            try {
              const res = await researchApi.research(job?.company || "", job?.description || "");
              setResearchData(res.data);
            } catch (err) {
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
              }
            } finally {
              setResearchLoading(false);
            }
          }}
          onClose={() => { setResearchOpen(false); setResearchData(null); }}
        />
      )}
    </div>
  );
}
