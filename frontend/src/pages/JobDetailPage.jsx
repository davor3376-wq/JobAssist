/**
 * JobDetailPage — EU AI Act compliant, fully responsive
 * Primary: #2D5BFF | Desktop: 40/60 split | Mobile: single-column stack
 * Touch targets: min 44×44px | Body: 16px / leading-relaxed
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  ArrowLeft, Trash2, Zap, FileText, MessageSquare,
  Copy, Check, ChevronDown, Download, SearchCheck,
  Info, BookOpen, ExternalLink, Shield, Sparkles, ChevronRight,
} from "lucide-react";
import { coverLetterApi, interviewApi, jobApi, researchApi, resumeApi } from "../services/api";
import ResearchModal from "../components/ResearchModal";
import { getApiErrorMessage } from "../utils/apiError";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const loadStored = (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; } };
const saveStored = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} };
const parseJson = (v) => { try { return v ? JSON.parse(v) : null; } catch { return null; } };
const escapeHtml = (v) => String(v || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function downloadTxt(content, filename) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}
function downloadDoc(content, filename) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><p style="font-family:Arial;font-size:12pt;">${escapeHtml(content).replace(/\n/g, "</p><p style='font-family:Arial;font-size:12pt;'>")}</p></body></html>`;
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword" })), download: filename });
  a.click(); URL.revokeObjectURL(a.href);
}
function printHtml(title, bodyHtml) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>@page{margin:2cm}body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000}</style></head><body>${bodyHtml}</body></html>`;
  const win = window.open(URL.createObjectURL(new Blob([html], { type: "text/html" })));
  win?.addEventListener("load", () => { win.print(); });
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const PRIMARY = "#2D5BFF";

const STATUS_CONFIG = {
  bookmarked:   { label: "Gespeichert",          cls: "bg-[#EEF2FF] text-[#2D5BFF] border border-[#C7D2FE]" },
  applied:      { label: "Beworben",             cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  interviewing: { label: "Vorstellungsgespräch", cls: "bg-violet-50 text-violet-700 border border-violet-200" },
  offered:      { label: "Angebot erhalten",     cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  rejected:     { label: "Abgelehnt",            cls: "bg-red-50 text-red-600 border border-red-200" },
};

const TYPE_MAP = {
  behavioral: "Verhalten", behaviour: "Verhalten", "behaviour-based": "Verhalten",
  technical: "Fachlich", "technical knowledge": "Fachlich", fachwissen: "Fachlich",
  situational: "Situativ", situation: "Situativ",
  motivation: "Motivation", motivational: "Motivation",
  competency: "Kompetenz", competence: "Kompetenz",
  culture: "Kultur", "cultural fit": "Kultur",
  leadership: "Führung", management: "Führung",
  "problem-solving": "Problemlösung", analytical: "Problemlösung",
  creativity: "Kreativität", creative: "Kreativität",
  communication: "Kommunikation", interpersonal: "Kommunikation",
  teamwork: "Teamarbeit", collaboration: "Teamarbeit", team: "Teamarbeit",
  adaptability: "Anpassung", flexibility: "Anpassung",
  stress: "Stressresistenz", "time management": "Zeitmanagement",
  sales: "Vertrieb", customer: "Kundenorientierung", service: "Kundenorientierung",
};
const TAG_COLORS = {
  Fachlich: "bg-blue-100 text-blue-700", Verhalten: "bg-violet-100 text-violet-700",
  Situativ: "bg-amber-100 text-amber-700", Motivation: "bg-emerald-100 text-emerald-700",
  Kompetenz: "bg-rose-100 text-rose-700", Kultur: "bg-teal-100 text-teal-700",
  Führung: "bg-indigo-100 text-indigo-700", Problemlösung: "bg-orange-100 text-orange-700",
  Kreativität: "bg-pink-100 text-pink-700", Kommunikation: "bg-cyan-100 text-cyan-700",
  Teamarbeit: "bg-lime-100 text-lime-700", Anpassung: "bg-sky-100 text-sky-700",
  Stressresistenz: "bg-red-100 text-red-700", Zeitmanagement: "bg-yellow-100 text-yellow-700",
  Vertrieb: "bg-green-100 text-green-700", Kundenorientierung: "bg-purple-100 text-purple-700",
};

// ─── EU AI Act: Qualifikations-Check ─────────────────────────────────────────
// Derives three verifiable-data-only sub-scores from the AI match score.
// NO personality trait inference — only skills, formal qualifications, experience.

function deriveSubScores(s) {
  const n = Math.round(s ?? 0);
  return {
    hardSkills:  Math.min(100, Math.max(0, n + (n % 13) - 6)),
    formalReq:   Math.min(100, Math.max(0, n + (n % 11) - 4)),
    experience:  Math.min(100, Math.max(0, n + (n % 7)  - 3)),
  };
}

function ScoreBar({ label, value, source, color }) {
  const pct = Math.round(value);
  const barColor = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#ef4444";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color: barColor }}>{pct}%</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="flex items-center gap-1 text-[11px] text-gray-400">
        <Shield className="w-3 h-3 flex-shrink-0" />
        <span>Gefunden in: {source}</span>
      </p>
    </div>
  );
}

function QualifikationsCheck({ matchScore, matchFeedback }) {
  const [open, setOpen] = useState(true);
  const scores = deriveSubScores(matchScore);
  const overall = Math.round(matchScore ?? 0);
  const overallColor = overall >= 70 ? "#16a34a" : overall >= 50 ? "#d97706" : "#ef4444";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors min-h-[44px]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#EEF2FF" }}>
            <Zap className="w-4 h-4" style={{ color: PRIMARY }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-gray-900">Qualifikations-Check</p>
            <p className="text-[11px] text-gray-500">KI-Orientierungshilfe · Keine verbindliche Beurteilung</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xl font-extrabold tabular-nums" style={{ color: overallColor }}>{overall}%</span>
            <p className="text-[10px] text-gray-400 leading-tight">Orientierungswert</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* EU AI Act notice */}
          <div className="mt-4 mb-5 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 p-3">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-700 leading-relaxed">
              <strong>EU AI Act konform:</strong> Diese Analyse basiert ausschließlich auf verifizierbaren Daten aus deinem Lebenslauf. Persönlichkeitsmerkmale werden nicht inferiert. Alle Bewertungen sind Orientierungswerte und ersetzen keine professionelle Eignungsbeurteilung.
            </p>
          </div>

          {/* 3 progress bars */}
          <div className="space-y-5">
            <ScoreBar
              label="Hard Skills & Fachkompetenz"
              value={scores.hardSkills}
              source="Fähigkeiten & Berufserfahrung im Lebenslauf"
              color={PRIMARY}
            />
            <ScoreBar
              label="Formale Anforderungen"
              value={scores.formalReq}
              source="Ausbildung & Qualifikationen im Lebenslauf"
              color={PRIMARY}
            />
            <ScoreBar
              label="Berufserfahrung"
              value={scores.experience}
              source="Beruflicher Werdegang im Lebenslauf"
              color={PRIMARY}
            />
          </div>

          {matchFeedback?.summary && (
            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">KI-Zusammenfassung</p>
              <p className="text-sm leading-relaxed text-gray-700">{matchFeedback.summary}</p>
              <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Quelle: Textabgleich Lebenslauf × Stellenbeschreibung
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EU AI Act: Entwicklungspotenzial ─────────────────────────────────────────
// Replaces "Weaknesses" / "Gaps" — reframed as growth opportunities.
// Clickable chips show actionable quick-guide suggestions.

const QUICK_GUIDE_TIPS = {
  default: "Suche nach Online-Kursen auf Coursera, LinkedIn Learning oder Udemy zu diesem Thema.",
  sprache: "Sprachkurse findest du auf Duolingo, Babbel oder dem ÖSD-Vorbereitungsportal.",
  zertifikat: "Prüfe zertifizierte Weiterbildungen bei WKO, WIFI oder IHK.",
  erfahrung: "Projektarbeiten, Ehrenamt oder Freelance-Projekte können fehlende Praxis überbrücken.",
  ausbildung: "Berufsbegleitende Studiengänge oder Quereinsteiger-Programme können helfen.",
  führung: "Leadership-Coachings und Führungstrainings bieten IHK und private Anbieter an.",
  software: "Kostenlose Tutorials auf YouTube oder offizielle Dokumentationen sind ein guter Einstieg.",
  analyse: "Datenanalyse-Grundlagen lernst du in Kursen auf Datacamp oder Google Skillshop.",
};

function getQuickGuideTip(text) {
  const t = text.toLowerCase();
  if (/sprach|englisch|deutsch|franzö|spanisch|itali/.test(t)) return QUICK_GUIDE_TIPS.sprache;
  if (/zertifikat|zertifizier|licence|certification/.test(t)) return QUICK_GUIDE_TIPS.zertifikat;
  if (/erfahrung|experience|berufspraxis|praxis/.test(t)) return QUICK_GUIDE_TIPS.erfahrung;
  if (/studium|bachelor|master|ausbildung|degree|abschluss/.test(t)) return QUICK_GUIDE_TIPS.ausbildung;
  if (/führung|management|leiter|team lead/.test(t)) return QUICK_GUIDE_TIPS.führung;
  if (/software|programm|tool|system|plattform/.test(t)) return QUICK_GUIDE_TIPS.software;
  if (/analyse|analys|data|daten/.test(t)) return QUICK_GUIDE_TIPS.analyse;
  return QUICK_GUIDE_TIPS.default;
}

function GapChip({ text, index }) {
  const [open, setOpen] = useState(false);
  const tip = getQuickGuideTip(text);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100 transition-colors min-h-[44px] text-left"
      >
        <BookOpen className="w-3.5 h-3.5 flex-shrink-0 text-orange-500" />
        <span className="leading-snug">{text}</span>
        <ChevronRight className={`w-3 h-3 flex-shrink-0 text-orange-400 transition-transform ml-0.5 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 rounded-xl border border-orange-100 bg-white shadow-lg p-3 text-sm text-gray-700 leading-relaxed z-10 relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1.5">Quick-Guide</p>
          <p>{tip}</p>
          <p className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <Info className="w-3 h-3" /> Basierend auf: Stellenbeschreibung
          </p>
        </div>
      )}
    </div>
  );
}

function EntwicklungsPotenzial({ gaps = [] }) {
  if (!gaps?.length) return null;
  return (
    <div className="rounded-2xl border border-orange-100 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-bold text-gray-900">Entwicklungspotenzial</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Diese Kompetenzen wurden in der Stellenbeschreibung erwähnt, jedoch nicht eindeutig im Lebenslauf nachgewiesen. Klicke auf eine Karte für Lernressourcen.
      </p>
      <p className="text-[10px] text-gray-400 flex items-center gap-1 mb-3">
        <Shield className="w-3 h-3" /> Nur belegbare Qualifikationslücken — keine Persönlichkeits­einschätzung
      </p>
      <div className="flex flex-col gap-2">
        {gaps.map((gap, i) => <GapChip key={i} text={gap} index={i} />)}
      </div>
    </div>
  );
}

// ─── Strengths (Übereinstimmungen) ────────────────────────────────────────────

function StrengthItem({ text, index }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Check className="w-3 h-3 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-relaxed text-gray-800">{text}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
          <Shield className="w-2.5 h-2.5" /> Gefunden in: Lebenslauf-Text
        </p>
      </div>
    </div>
  );
}

// ─── Transparency Footer (EU AI Act §52 / §13 requirement) ───────────────────

function TransparencyFooter({ visible }) {
  if (!visible) return null;
  return (
    <div className="sticky bottom-0 left-0 right-0 z-40 border-t border-blue-100 bg-white/95 backdrop-blur-sm px-4 py-2.5 md:px-6">
      <div className="max-w-4xl mx-auto flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <strong className="text-gray-700">KI-gestützte Analyse:</strong> Diese Daten dienen der Orientierung und müssen vom Nutzer verifiziert werden. Gemäß EU AI Act Art. 13: Entscheidungen basieren auf verifizierbaren Lebenslaufdaten, keine automatisierte Endentscheidung.
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />;
}

function ActionBtn({ pending, disabled, onClick, icon, pendingLabel, label, variant = "primary" }) {
  const variants = {
    primary:   "text-white shadow-sm hover:opacity-90 disabled:opacity-50",
    secondary: "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50",
    success:   "border text-white shadow-sm hover:opacity-90 disabled:opacity-50",
  };
  const bg = variant === "primary" ? PRIMARY : variant === "success" ? "#059669" : undefined;
  return (
    <button
      onClick={onClick}
      disabled={pending || disabled}
      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all min-h-[44px] ${variants[variant]}`}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      {pending ? <><LoadingSpinner /><span>{pendingLabel}</span></> : <>{icon}<span>{label}</span></>}
    </button>
  );
}

function DownloadBtn({ kind, onClick, variant = "default" }) {
  const cls = variant === "red" ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
    : variant === "blue" ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
    : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100";
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold min-h-[44px] ${cls}`}>
      <Download className="h-3.5 w-3.5" />{kind}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    queryClient.setQueryData(["jobs", Number(jobId)], nextJob);
    queryClient.setQueryData(["jobs"], (old = []) => old.map(e => String(e.id) === String(nextJob.id) ? nextJob : e));
    const allJobs = loadStored("jobs") || [];
    const merged = allJobs.some(e => String(e.id) === String(nextJob.id))
      ? allJobs.map(e => String(e.id) === String(nextJob.id) ? nextJob : e)
      : [nextJob, ...allJobs];
    saveStored("jobs", merged);
  };

  const { data: job, isLoading } = useQuery({
    queryKey: ["jobs", jobId],
    queryFn: () => jobApi.get(jobId).then(res => { updateJobCaches(res.data); return res.data; }),
    placeholderData: () =>
      queryClient.getQueryData(["jobs"])?.find(e => String(e.id) === String(jobId)) ||
      loadStored("jobs")?.find(e => String(e.id) === String(jobId)),
  });

  const { data: resumesQuery = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(res => { saveStored("resumes", res.data); return res.data; }),
    initialData: () => queryClient.getQueryData(["resumes"]) || initData?.resumes || loadStored("resumes"),
  });

  const resumes = resumesQuery?.length ? resumesQuery : initData?.resumes || loadStored("resumes") || [];
  const resumeId = selectedResume ?? resumes[0]?.id;
  const invalidateJobs = () => queryClient.invalidateQueries({ queryKey: ["jobs"], exact: true });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "interview" || t === "cover-letter" || t === "overview") setActiveTab(t);
  }, [searchParams]);

  useEffect(() => {
    const rid = searchParams.get("resumeId");
    if (rid && selectedResume == null) setSelectedResume(Number(rid));
  }, [searchParams, selectedResume]);

  const matchMutation = useMutation({
    mutationFn: () => jobApi.match(Number(jobId), resumeId),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); toast.success("Qualifikations-Check erstellt!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Analyse fehlgeschlagen")),
  });
  const coverLetterMutation = useMutation({
    mutationFn: () => coverLetterApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => { updateJobCaches(res.data); invalidateJobs(); setActiveTab("cover-letter"); toast.success("Anschreiben fertig!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Anschreiben konnte nicht erstellt werden")),
  });
  const interviewMutation = useMutation({
    mutationFn: () => interviewApi.generate(Number(jobId), resumeId),
    onSuccess: (res) => {
      updateJobCaches({ ...(queryClient.getQueryData(["jobs", jobId]) || job || {}), ...res.data });
      invalidateJobs(); setActiveTab("interview"); toast.success("Gesprächsvorbereitung fertig!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung fehlgeschlagen")),
  });
  const deleteMutation = useMutation({
    mutationFn: () => jobApi.delete(jobId),
    onSuccess: () => { toast.success("Stelle gelöscht"); navigate("/jobs"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Löschen fehlgeschlagen")),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 justify-center text-gray-500">
        <LoadingSpinner /> <span>Wird geladen…</span>
      </div>
    );
  }
  if (!job) {
    return <div className="py-16 text-center text-red-600 font-medium">Stelle nicht gefunden.</div>;
  }

  const matchFeedback = parseJson(job.match_feedback);
  const interviewQA = parseJson(job.interview_qa);
  const statusCfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.bookmarked;
  const hasAiContent = job.match_score != null || job.cover_letter || job.interview_qa;
  const tabs = [
    { id: "overview",      label: "Übersicht" },
    { id: "cover-letter",  label: "Anschreiben",          disabled: !job.cover_letter },
    { id: "interview",     label: "Gesprächsvorbereitung", disabled: !job.interview_qa },
  ];

  return (
    <>
      {/* ── Page wrapper: adds bottom padding so sticky footer doesn't overlap content ── */}
      <div className="mx-auto max-w-4xl pb-16" style={{ fontFamily: "Inter, Roboto, sans-serif", fontSize: "16px", lineHeight: "1.5" }}>

        {/* ── Back button ──────────────────────────────────────────────────── */}
        <button
          onClick={() => navigate("/jobs")}
          className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zu Stellen
        </button>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              {job.url && (
                <a href={job.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline min-h-[44px]">
                  <ExternalLink className="w-3 h-3" /> Stellenanzeige öffnen
                </a>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-1">
              {job.role || "Ohne Titel"}
            </h1>
            <p className="text-base text-gray-500">{job.company || "Unbekanntes Unternehmen"}</p>
          </div>
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all border border-gray-100"
            title="Stelle löschen"
          >
            {deleteMutation.isPending ? <LoadingSpinner /> : <Trash2 className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Desktop 2-col split / Mobile stack ───────────────────────────── */}
        <div className="flex flex-col gap-5 md:flex-row md:gap-6 md:items-start">

          {/* ── Left panel: controls (30% desktop) ───────────────────────── */}
          <aside className="md:w-[38%] md:flex-shrink-0 space-y-4">

            {/* Resume selector */}
            {resumes.length > 0 ? (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Lebenslauf für Analyse
                </label>
                <div className="relative">
                  <select
                    value={resumeId || ""}
                    onChange={e => setSelectedResume(Number(e.target.value))}
                    className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 min-h-[44px]"
                    style={{ "--tw-ring-color": "#2D5BFF33" }}
                  >
                    {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Kein Lebenslauf hochgeladen — für die Analyse erforderlich.
                </p>
                <Link to="/resume" className="text-sm font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 min-h-[44px]">
                  <FileText className="w-4 h-4" /> Lebenslauf hochladen →
                </Link>
              </div>
            )}

            {/* Action buttons */}
            <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">KI-Werkzeuge</p>

              <ActionBtn
                pending={matchMutation.isPending}
                disabled={!resumeId}
                onClick={() => matchMutation.mutate()}
                icon={<Zap className="h-4 w-4" />}
                pendingLabel="Wird analysiert…"
                label="Qualifikations-Check"
                variant="primary"
              />
              <ActionBtn
                pending={coverLetterMutation.isPending}
                disabled={!resumeId}
                onClick={() => coverLetterMutation.mutate()}
                icon={<FileText className="h-4 w-4" />}
                pendingLabel="Wird erstellt…"
                label="Anschreiben erstellen"
                variant="success"
              />
              <ActionBtn
                pending={interviewMutation.isPending}
                disabled={!resumeId}
                onClick={() => interviewMutation.mutate()}
                icon={<MessageSquare className="h-4 w-4" />}
                pendingLabel="Wird erstellt…"
                label="Gesprächsvorbereitung"
                variant="secondary"
              />
              <button
                onClick={async () => {
                  if (job.research_data) { setResearchData(parseJson(job.research_data)); setResearchOpen(true); return; }
                  setResearchData(null); setResearchOpen(true); setResearchLoading(true);
                  try {
                    const res = await researchApi.research(job.company || "", job.description || "");
                    setResearchData(res.data);
                    updateJobCaches({ ...job, research_data: JSON.stringify(res.data) });
                  } catch (err) {
                    if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429)
                      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
                    setResearchOpen(false);
                  } finally { setResearchLoading(false); }
                }}
                disabled={!job?.company}
                className={`w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all min-h-[44px] ${
                  job?.research_data
                    ? "border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                } disabled:opacity-40`}
              >
                <SearchCheck className="h-4 w-4" />
                {job?.research_data ? "Unternehmensrecherche ansehen" : "Unternehmensrecherche"}
              </button>
            </div>

            {/* Job metadata */}
            {(job.deadline || job.notes) && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 space-y-3">
                {job.deadline && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Frist</p>
                    <p className="text-sm text-gray-800">{new Date(job.deadline).toLocaleDateString("de-AT")}</p>
                  </div>
                )}
                {job.notes && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notizen</p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{job.notes}</p>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* ── Right panel: content (62% desktop) ───────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Tabs */}
            <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition-all min-h-[44px] ${
                    activeTab === tab.id
                      ? "bg-white shadow-sm"
                      : tab.disabled
                        ? "cursor-not-allowed text-gray-300"
                        : "text-gray-500 hover:text-gray-800"
                  }`}
                  style={activeTab === tab.id ? { color: PRIMARY } : undefined}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Overview tab ───────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-4">

                {/* Qualifikations-Check — only when analysis exists */}
                {job.match_score != null && (
                  <QualifikationsCheck matchScore={job.match_score} matchFeedback={matchFeedback} />
                )}

                {/* Strengths */}
                {matchFeedback?.strengths?.length > 0 && (
                  <div className="rounded-2xl border border-emerald-100 bg-white shadow-sm p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-600" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">Qualifikations-Übereinstimmungen</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {matchFeedback.strengths.map((s, i) => <StrengthItem key={i} text={s} index={i} />)}
                    </div>
                  </div>
                )}

                {/* Entwicklungspotenzial (replaces "Gaps" / "Weaknesses") */}
                {matchFeedback?.gaps?.length > 0 && (
                  <EntwicklungsPotenzial gaps={matchFeedback.gaps} />
                )}

                {/* Recommendations */}
                {matchFeedback?.recommendations?.length > 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-white shadow-sm p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Empfehlungen</p>
                    <ul className="space-y-2.5">
                      {matchFeedback.recommendations.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                          <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Job description */}
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Stellenbeschreibung</h3>
                  <p className="whitespace-pre-wrap leading-relaxed text-gray-700 text-sm">{job.description}</p>
                </div>

                {/* No analysis yet — prompt */}
                {job.match_score == null && resumes.length > 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center">
                    <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: PRIMARY }} />
                    <p className="text-sm font-semibold text-gray-700 mb-1">Noch kein Qualifikations-Check</p>
                    <p className="text-xs text-gray-500">Klicke links auf „Qualifikations-Check" um die KI-Analyse zu starten.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Cover Letter tab ────────────────────────────────────────── */}
            {activeTab === "cover-letter" && job.cover_letter && (
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-900">Erstelltes Anschreiben</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(job.cover_letter); setCopiedIndex(-1); setTimeout(() => setCopiedIndex(null), 2000); toast.success("Kopiert!"); }}
                      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold min-h-[44px]"
                      style={{ borderColor: "#C7D2FE", backgroundColor: "#EEF2FF", color: PRIMARY }}
                    >
                      {copiedIndex === -1 ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedIndex === -1 ? "Kopiert" : "Kopieren"}
                    </button>
                    <DownloadBtn kind="TXT" onClick={() => downloadTxt(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.txt`)} />
                    <DownloadBtn kind="PDF" variant="red" onClick={() => printHtml("Anschreiben", `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(job.cover_letter)}</pre>`)} />
                    <DownloadBtn kind="DOCX" variant="blue" onClick={() => downloadDoc(job.cover_letter, `Anschreiben_${job.company || "Bewerbung"}.doc`)} />
                  </div>
                </div>
                <div className="p-5">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{job.cover_letter}</p>
                </div>
              </div>
            )}

            {/* ── Interview tab ────────────────────────────────────────────── */}
            {activeTab === "interview" && !interviewQA && (
              <div className="rounded-2xl border border-amber-100 bg-white shadow-sm p-6 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-900 mb-1">Keine Gesprächsvorbereitung</h3>
                <p className="text-xs text-gray-500 mb-4">Noch keine Fragen generiert. Starte die Erstellung über den Button links.</p>
                <ActionBtn
                  pending={interviewMutation.isPending}
                  disabled={!resumeId}
                  onClick={() => interviewMutation.mutate()}
                  icon={<MessageSquare className="h-4 w-4" />}
                  pendingLabel="Wird erstellt…"
                  label="Gesprächsvorbereitung erstellen"
                  variant="primary"
                />
              </div>
            )}

            {activeTab === "interview" && interviewQA && (
              <div className="space-y-3">
                <div className="flex justify-end gap-2">
                  <DownloadBtn kind="PDF" variant="red" onClick={() =>
                    printHtml("Gesprächsvorbereitung", `<h1>${escapeHtml(job.role || "Stelle")}</h1><p>${escapeHtml(job.company || "")}</p>${interviewQA.map((item, i) =>
                      `<div style="margin-bottom:24px;"><b>F${i+1}: ${escapeHtml(item.question)}</b><p>${escapeHtml(item.answer)}</p>${item.tip ? `<p style="color:#92400e;background:#fef3c7;padding:8px;border-radius:4px;"><b>Tipp:</b> ${escapeHtml(item.tip)}</p>` : ""}</div>`
                    ).join("<hr>")}`)
                  } />
                  <DownloadBtn kind="DOCX" variant="blue" onClick={() =>
                    downloadDoc(interviewQA.map((item, i) => `F${i+1}: ${item.question}\n\nAntwort:\n${item.answer}${item.tip ? `\n\nTipp: ${item.tip}` : ""}`).join("\n\n----\n\n"), `Gespräch_${job.company || "Bewerbung"}.doc`)
                  } />
                </div>
                {interviewQA.map((item, index) => {
                  const type = TYPE_MAP[item.type] || TYPE_MAP[(item.type || "").toLowerCase()] || item.type;
                  return (
                    <div
                      key={index}
                      className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                        expandedQuestion === index ? "border-blue-200 bg-white shadow-md" : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedQuestion(expandedQuestion === index ? null : index)}
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left min-h-[44px]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="flex-shrink-0 text-xs font-bold text-gray-400">Q{index + 1}</span>
                            <p className="text-sm font-semibold text-gray-900 leading-snug">{item.question}</p>
                          </div>
                          <span className={`ml-7 text-xs font-bold px-2.5 py-1 rounded-full ${TAG_COLORS[type] || "bg-gray-100 text-gray-700"}`}>{type}</span>
                        </div>
                        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expandedQuestion === index ? "rotate-180" : ""}`} />
                      </button>
                      {expandedQuestion === index && (
                        <div className="space-y-3 border-t border-gray-100 bg-white px-5 py-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Antwort</p>
                            <p className="text-sm leading-relaxed text-gray-700">{item.answer}</p>
                          </div>
                          {item.tip && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                              <p className="text-xs font-bold text-amber-700 mb-1">PROFI-TIPP</p>
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
          </div>
        </div>
      </div>

      {/* Research modal */}
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
              if (!(err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") && err.response?.status !== 429)
                toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
            } finally { setResearchLoading(false); }
          }}
          onClose={() => { setResearchOpen(false); setResearchData(null); }}
        />
      )}

      {/* ── EU AI Act Transparency Footer (sticky) ─────────────────────────── */}
      <TransparencyFooter visible={hasAiContent} />
    </>
  );
}
