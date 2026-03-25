import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Trash2,
  Zap,
  FileText,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  Download,
  SearchCheck,
} from "lucide-react";
import { coverLetterApi, interviewApi, jobApi, researchApi, resumeApi } from "../services/api";
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

const parseJson = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const LoadingSpinner = () => (
  <div className="inline-block">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
  </div>
);

const CircularScore = ({ score }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colors =
    score >= 80
      ? { bg: "#dcfce7", stroke: "#16a34a", text: "#166534" }
      : score >= 60
        ? { bg: "#fef3c7", stroke: "#f59e0b", text: "#b45309" }
        : { bg: "#fee2e2", stroke: "#ef4444", text: "#b91c1c" };

  return (
    <div className="relative h-32 w-32">
      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill={colors.bg} stroke="#e5e7eb" strokeWidth="2" />
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
      <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold" style={{ color: colors.text }}>
        {score}%
      </div>
    </div>
  );
};

const escapeHtml = (value) =>
  String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [researchOpen, setResearchOpen] = useState(false);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const { data: initData } = useQuery({ queryKey: ["init"] });

  const updateJobCaches = (nextJob) => {
    if (!nextJob) return;
    queryClient.setQueryData(["jobs", jobId], nextJob);
    queryClient.setQueryData(["jobs"], (old = []) =>
      old.map((entry) => (String(entry.id) === String(nextJob.id) ? nextJob : entry))
    );
    const allJobs = loadStored("jobs") || [];
    const merged = allJobs.some((entry) => String(entry.id) === String(nextJob.id))
      ? allJobs.map((entry) => (String(entry.id) === String(nextJob.id) ? nextJob : entry))
      : [nextJob, ...allJobs];
    saveStored("jobs", merged);
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () =>
      jobApi.get(jobId).then((res) => {
        updateJobCaches(res.data);
        return res.data;
      }),
    placeholderData: () =>
      queryClient.getQueryData(["jobs"])?.find((entry) => String(entry.id) === String(jobId)) ||
      loadStored("jobs")?.find((entry) => String(entry.id) === String(jobId)),
  });

  const { data: resumesQuery = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () =>
      resumeApi.list().then((res) => {
        saveStored("resumes", res.data);
        return res.data;
      }),
    initialData: () => queryClient.getQueryData(["resumes"]) || initData?.resumes || loadStored("resumes"),
  });

  const resumes = resumesQuery?.length ? resumesQuery : initData?.resumes || loadStored("resumes") || [];
  const resumeId = selectedResume ?? resumes[0]?.id;
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["jobs"] });

  const matchMutation = useMutation({
    mutationFn: () => jobApi.match(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches(res.data);
      invalidateJobs();
      toast.success("Match-Bewertung erstellt!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Match-Bewertung konnte nicht erstellt werden")),
  });

  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches(res.data);
      invalidateJobs();
      setActiveTab("cover-letter");
      toast.success("Anschreiben fertig!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Anschreiben konnte nicht erstellt werden")),
  });

  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => {
      queryClient.setQueryData(["jobs", jobId], res.data);
      updateJobCaches(res.data);
      invalidateJobs();
      setActiveTab("interview");
      toast.success("Gesprächsvorbereitung fertig!");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung konnte nicht erstellt werden")),
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => {
      toast.success("Stelle gelöscht");
      navigate("/jobs");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Stelle konnte nicht gelöscht werden")),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-2 text-gray-600">
          <LoadingSpinner />
          <span>Stellendetails werden geladen...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-medium text-red-600">Stelle nicht gefunden.</p>
      </div>
    );
  }

  const matchFeedback = parseJson(job.match_feedback);
  const interviewQA = parseJson(job.interview_qa);
  const tabs = [
    { id: "overview", label: "Übersicht" },
    { id: "cover-letter", label: "Anschreiben", disabled: !job.cover_letter },
    { id: "interview", label: "Gesprächsvorbereitung", disabled: !job.interview_qa },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <style>{`
        @keyframes slide-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.4s ease-out; }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
      `}</style>

      <div className="animate-fade-in mb-8">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex-1">
            <h1 className="mb-1 text-4xl font-bold text-gray-900">{job.role || "Ohne Titel"}</h1>
            <p className="text-lg text-gray-600">{job.company || "Unbekanntes Unternehmen"}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="rounded-lg p-2 text-gray-400 transition-all duration-200 hover:bg-red-50 hover:text-red-600"
            title="Stelle löschen"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {resumes.length > 0 && (
        <div className="animate-slide-up mb-6 rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-3">
          <label className="mb-2 block text-sm font-semibold text-gray-700">Lebenslauf auswählen</label>
          <div className="relative">
            <select
              value={resumeId}
              onChange={(e) => setSelectedResume(Number(e.target.value))}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.filename}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          </div>
        </div>
      )}

      {resumes.length === 0 && (
        <div className="animate-slide-up mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Für Match-Bewertung, Anschreiben und Gesprächsvorbereitung brauchst du zuerst einen Lebenslauf.
          </p>
          <Link to="/resume" className="mt-3 inline-flex text-sm font-semibold text-amber-800 hover:text-amber-900">
            Lebenslauf hochladen
          </Link>
        </div>
      )}

      <div className="animate-slide-up mb-8 flex flex-wrap gap-3">
        <ActionButton
          pending={matchMutation.isPending}
          disabled={!resumeId}
          onClick={() => matchMutation.mutate()}
          icon={<Zap className="h-4 w-4" />}
          pendingLabel="Wird analysiert..."
          label="Match-Bewertung"
          className="from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
        />
        <ActionButton
          pending={coverLetterMutation.isPending}
          disabled={!resumeId}
          onClick={() => coverLetterMutation.mutate()}
          icon={<FileText className="h-4 w-4" />}
          pendingLabel="Wird erstellt..."
          label="Anschreiben"
          className="from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
        />
        <ActionButton
          pending={interviewMutation.isPending}
          disabled={!resumeId}
          onClick={() => interviewMutation.mutate()}
          icon={<MessageSquare className="h-4 w-4" />}
          pendingLabel="Wird erstellt..."
          label="Gesprächsvorbereitung"
          className="from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        />
        <button
          onClick={async () => {
            if (job.research_data) {
              setResearchData(parseJson(job.research_data));
              setResearchOpen(true);
              return;
            }
            setResearchData(null);
            setResearchOpen(true);
            setResearchLoading(true);
            try {
              const res = await researchApi.research(job.company || "", job.description || "");
              setResearchData(res.data);
              updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
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
          className={`flex items-center gap-2 rounded-lg px-5 py-3 font-semibold shadow-sm ${
            job?.research_data
              ? "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-emerald-300 bg-white text-emerald-700 hover:border-emerald-400 hover:bg-emerald-50"
          } disabled:opacity-50`}
        >
          <SearchCheck className="h-4 w-4" />
          <span>{job?.research_data ? "Recherche ansehen" : "Recherche"}</span>
        </button>
      </div>

      {job.match_score != null && (
        <div className="animate-slide-up mb-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-600">Match-Analyse</h2>
          <div className="flex flex-col items-center gap-8 md:flex-row">
            <CircularScore score={job.match_score} />
            <p className="flex-1 leading-relaxed text-gray-700">{matchFeedback?.summary}</p>
          </div>
        </div>
      )}

      <div className="animate-slide-up mb-8 flex w-fit gap-2 rounded-xl bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              activeTab === tab.id
                ? "bg-white text-indigo-600 shadow-sm"
                : tab.disabled
                  ? "cursor-not-allowed text-gray-400"
                  : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="animate-slide-up space-y-6">
          <Card title="Stellenbeschreibung">
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{job.description}</p>
          </Card>

          {matchFeedback && (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                <ListCard title="Stärken" accent="emerald" items={matchFeedback.strengths} positive />
                <ListCard title="Verbesserungsvorschläge" accent="red" items={matchFeedback.gaps} />
              </div>
              {!!matchFeedback.recommendations?.length && (
                <ListCard title="Empfehlungen" accent="blue" items={matchFeedback.recommendations} arrow />
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "cover-letter" && job.cover_letter && (
        <div className="animate-slide-up rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900">Erstelltes Anschreiben</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(job.cover_letter);
                  setCopiedIndex(-1);
                  setTimeout(() => setCopiedIndex(null), 2000);
                  toast.success("In Zwischenablage kopiert!");
                }}
                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100"
              >
                {copiedIndex === -1 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedIndex === -1 ? "Kopiert" : "Kopieren"}</span>
              </button>
              <DownloadButton kind="TXT" onClick={() => downloadTxt(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.txt`)} />
              <DownloadButton kind="PDF" danger onClick={() => printHtml("Anschreiben", `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(job.cover_letter)}</pre>`)} />
              <DownloadButton kind="DOCX" blue onClick={() => downloadDoc(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.doc`)} />
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.cover_letter}</p>
        </div>
      )}

      {activeTab === "interview" && interviewQA && (
        <div className="animate-slide-up space-y-4">
          <div className="flex flex-wrap justify-end gap-2">
            <DownloadButton
              kind="PDF"
              danger
              onClick={() =>
                printHtml(
                  "Gesprächsvorbereitung",
                  `<h1 style="font-size:18pt;margin-bottom:4px;">${escapeHtml(job.role || "Stelle")}</h1><p style="color:#6b7280;margin-bottom:28px;">${escapeHtml(job.company || "")}</p>${interviewQA
                    .map((item, index) => {
                      const tip = item.tip ? `<div style="background:#fef3c7;padding:8px 12px;border-radius:6px;font-size:10pt;color:#92400e;margin-top:8px;"><strong>Tipp:</strong> ${escapeHtml(item.tip)}</div>` : "";
                      return `<div style="margin-bottom:28px;page-break-inside:avoid;"><div style="font-weight:bold;font-size:13pt;margin-bottom:4px;">F${index + 1}: ${escapeHtml(item.question)}</div><div style="font-size:9pt;color:#6b7280;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(item.type)}</div><div style="font-size:11pt;margin-bottom:4px;"><strong>Antwort:</strong></div><div style="font-size:11pt;color:#374151;">${escapeHtml(item.answer).replace(/\n/g, "<br>")}</div>${tip}</div>`;
                    })
                    .join('<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;">')}`
                )
              }
            />
            <DownloadButton
              kind="DOCX"
              blue
              onClick={() =>
                downloadDoc(
                  interviewQA
                    .map((item, index) => `F${index + 1}: ${item.question}\n\nTyp: ${item.type}\n\nAntwort:\n${item.answer}${item.tip ? `\n\nTipp: ${item.tip}` : ""}`)
                    .join("\n\n--------------------\n\n"),
                  `Gespraechsvorbereitung_${job.company || "Bewerbung"}.doc`
                )
              }
            />
          </div>

          {interviewQA.map((item, index) => {
            const type = TYPE_MAP[item.type] || TYPE_MAP[(item.type || "").toLowerCase()] || item.type;
            return (
              <div
                key={index}
                className={`overflow-hidden rounded-xl border transition-all duration-200 ${
                  expandedQuestion === index ? "border-indigo-200 bg-white shadow-md" : "border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                  className="flex w-full items-start justify-between gap-4 px-6 py-4 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start gap-3">
                      <span className="flex-shrink-0 text-sm font-semibold text-gray-400">Q{index + 1}</span>
                      <p className="text-sm font-semibold text-gray-900">{item.question}</p>
                    </div>
                    <div className="ml-7 flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${TAG_COLORS[type] || "bg-gray-100 text-gray-700"}`}>{type}</span>
                    </div>
                  </div>
                  <ChevronDown className={`h-5 w-5 flex-shrink-0 text-gray-400 ${expandedQuestion === index ? "rotate-180 transform" : ""}`} />
                </button>
                {expandedQuestion === index && (
                  <div className="animate-fade-in space-y-4 border-t border-gray-200 bg-white px-6 py-4">
                    <div>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Antwort</h4>
                      <p className="text-sm leading-relaxed text-gray-700">{item.answer}</p>
                    </div>
                    {item.tip && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-1 text-xs font-semibold text-amber-900">PROFI-TIPP</p>
                        <p className="text-sm text-amber-900">{item.tip}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {researchOpen && (
        <ResearchModal
          companyName={job.company || ""}
          data={researchData}
          loading={researchLoading}
          jobId={job.id}
          onRefresh={async () => {
            setResearchLoading(true);
            try {
              const res = await researchApi.research(job.company || "", job.description || "");
              setResearchData(res.data);
              updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
            } catch (err) {
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429) {
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
              }
            } finally {
              setResearchLoading(false);
            }
          }}
          onClose={() => {
            setResearchOpen(false);
            setResearchData(null);
          }}
        />
      )}
    </div>
  );
}

function ActionButton({ pending, disabled, onClick, icon, pendingLabel, label, className }) {
  return (
    <button
      onClick={onClick}
      disabled={pending || disabled}
      className={`flex items-center gap-2 rounded-lg bg-gradient-to-r px-5 py-3 font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 ${className}`}
    >
      {pending ? (
        <>
          <LoadingSpinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

function ListCard({ title, items, accent, positive = false, arrow = false }) {
  const accentMap = {
    emerald: "border-emerald-200 border-l-emerald-500 text-emerald-900",
    red: "border-red-200 border-l-red-500 text-red-900",
    blue: "border-blue-200 border-l-blue-500 text-blue-900",
  };
  const prefix = arrow ? "→" : positive ? "+" : "-";
  const prefixClass = arrow ? "text-blue-500" : positive ? "text-emerald-500" : "text-red-500";

  return (
    <div className={`rounded-xl border border-l-4 bg-white p-6 shadow-sm ${accentMap[accent]}`}>
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      <ul className="space-y-3">
        {items?.map((item, index) => (
          <li key={index} className="flex gap-3 text-gray-700">
            <span className={`flex-shrink-0 font-bold ${prefixClass}`}>{prefix}</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DownloadButton({ kind, onClick, danger = false, blue = false }) {
  const classes = danger
    ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
    : blue
      ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
      : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100";

  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold ${classes}`}>
      <Download className="h-4 w-4" />
      <span>{kind}</span>
    </button>
  );
}

function downloadTxt(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDoc(content, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><p style="font-family:Arial;font-size:12pt;">${escapeHtml(content).replace(/\n/g, "</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function printHtml(title, bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:2cm;size:A4}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000;}</style></head><body>${bodyHtml}</body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url);
  win.addEventListener("load", () => {
    win.print();
    URL.revokeObjectURL(url);
  });
}
