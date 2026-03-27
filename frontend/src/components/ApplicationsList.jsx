/**
 * ApplicationsList — Split-View Job Tracking Dashboard
 *
 * Desktop: 1 (list) : 2 (detail) flex split with fixed panel heights
 * Mobile:  single-column list → full-screen overlay on tap
 *
 * Tailwind explanations are written as comments on key layout elements.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Award, Bookmark, Brain, ChevronDown, ChevronLeft,
  DollarSign, Download, ExternalLink, FileText, MapPin, MessageSquare,
  Search, SearchCheck, Send, Trash2, X, XCircle, Zap,
} from "lucide-react";
import { jobApi, motivationsschreibenApi, researchApi, resumeApi } from "../services/api";
import { generateMailtoLink } from "../utils/emailHelpers";
import { getApiErrorMessage } from "../utils/apiError";
import {
  filterAndSortJobs, getDeadlineMeta, getDisabledReason,
  getMatchColorClass, getMatchSummary, parseJson, updateJobList,
} from "../utils/applicationsState";
import ResearchModal from "./ResearchModal";

// ─── Download helpers ─────────────────────────────────────────────────────────

function _triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function _qaToPlainText(job, qaList) {
  const lines = [
    `Gesprächsvorbereitung — ${job.role || "Stelle"} bei ${job.company || "Unternehmen"}`,
    "=".repeat(60),
    "",
  ];
  qaList.forEach((item, i) => {
    lines.push(`Frage ${i + 1}: ${item.question || item}`);
    if (item.answer) lines.push(`Antwort: ${item.answer}`);
    if (item.tip)    lines.push(`Tipp: ${item.tip}`);
    lines.push("");
  });
  return lines.join("\n");
}

export function downloadQaTxt(job, qaList) {
  const text = _qaToPlainText(job, qaList);
  _triggerDownload(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
    `gesprächsvorbereitung-${(job.company || "job").replace(/\s+/g, "-").toLowerCase()}.txt`
  );
}

export function downloadQaPdf(job, qaList) {
  const rows = qaList.map((item, i) => `
    <div class="qa">
      <p class="q">Frage ${i + 1}: ${item.question || item}</p>
      ${item.answer ? `<p class="a"><strong>Antwort:</strong> ${item.answer}</p>` : ""}
      ${item.tip    ? `<p class="tip"><strong>Tipp:</strong> ${item.tip}</p>` : ""}
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Gesprächsvorbereitung</title>
    <style>
      body { font-family: Arial, sans-serif; max-width: 740px; margin: 40px auto; color: #111; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 14px; font-weight: normal; color: #555; margin-bottom: 32px; }
      .qa { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
      .q  { font-weight: 700; margin-bottom: 8px; }
      .a  { color: #374151; margin-bottom: 6px; }
      .tip { color: #92400e; background: #fef3c7; padding: 8px 12px; border-radius: 6px; }
      @media print { body { margin: 20px; } }
    </style></head><body>
    <h1>Gesprächsvorbereitung</h1>
    <h2>${job.role || "Stelle"} bei ${job.company || "Unternehmen"}</h2>
    ${rows}
  </body></html>`;

  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 400);
}

export function downloadQaDocx(job, qaList) {
  const rows = qaList.map((item, i) => `
    <p style="font-weight:bold;margin-bottom:4px;">Frage ${i + 1}: ${item.question || item}</p>
    ${item.answer ? `<p style="margin-bottom:4px;"><b>Antwort:</b> ${item.answer}</p>` : ""}
    ${item.tip    ? `<p style="color:#92400e;margin-bottom:4px;"><b>Tipp:</b> ${item.tip}</p>` : ""}
    <p>&nbsp;</p>`).join("");

  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'
    xmlns:w='urn:schemas-microsoft-com:office:word'
    xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8">
    <style>body{font-family:Arial,sans-serif;font-size:11pt;}</style></head>
    <body>
    <h1 style="font-size:16pt;">Gesprächsvorbereitung</h1>
    <p style="color:#555;">${job.role || "Stelle"} bei ${job.company || "Unternehmen"}</p>
    <hr>${rows}
    </body></html>`;

  _triggerDownload(
    new Blob(["\ufeff", html], { type: "application/msword" }),
    `gesprächsvorbereitung-${(job.company || "job").replace(/\s+/g, "-").toLowerCase()}.doc`
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  bookmarked:   "Gespeichert",
  applied:      "Beworben",
  interviewing: "Vorstellungsgespräch",
  offered:      "Angebot",
  rejected:     "Abgelehnt",
};

const STATUS_COLORS = {
  bookmarked:   "bg-blue-100 text-blue-800",
  applied:      "bg-green-100 text-green-800",
  interviewing: "bg-purple-100 text-purple-800",
  offered:      "bg-amber-100 text-amber-800",
  rejected:     "bg-red-100 text-red-800",
};

const STATUS_ORDER = ["bookmarked", "applied", "interviewing", "offered", "rejected"];

const PIPELINE_CONFIG = [
  { key: "bookmarked",   label: "Gespeichert", icon: Bookmark,      cardCls: "bg-blue-50   border-blue-200",   iconCls: "text-blue-500"   },
  { key: "applied",      label: "Beworben",    icon: Send,           cardCls: "bg-green-50  border-green-200",  iconCls: "text-green-500"  },
  { key: "interviewing", label: "Gespräch",    icon: MessageSquare,  cardCls: "bg-purple-50 border-purple-200", iconCls: "text-purple-500" },
  { key: "offered",      label: "Angebot",     icon: Award,          cardCls: "bg-amber-50  border-amber-200",  iconCls: "text-amber-500"  },
  { key: "rejected",     label: "Abgelehnt",   icon: XCircle,        cardCls: "bg-red-50    border-red-200",    iconCls: "text-red-500"    },
];

const TYPE_MAP = {
  behavioral: "Verhalten", behaviour: "Verhalten", "behaviour-based": "Verhalten",
  technical: "Fachlich", "technical knowledge": "Fachlich", fachwissen: "Fachlich",
  situational: "Situativ", situation: "Situativ",
  motivation: "Motivation", motivational: "Motivation",
  competency: "Kompetenz", competence: "Kompetenz",
  culture: "Kultur", "cultural fit": "Kultur", "culture fit": "Kultur",
  leadership: "Führung", management: "Führung",
  "problem-solving": "Problemlösung", "problem solving": "Problemlösung", analytical: "Problemlösung",
  creativity: "Kreativität", creative: "Kreativität",
  communication: "Kommunikation", interpersonal: "Kommunikation",
  teamwork: "Teamarbeit", collaboration: "Teamarbeit", team: "Teamarbeit",
  adaptability: "Anpassung", flexibility: "Anpassung",
  stress: "Stressresistenz", "stress management": "Stressresistenz",
  "time management": "Zeitmanagement", organization: "Zeitmanagement",
  sales: "Vertrieb",
  customer: "Kundenorientierung", service: "Kundenorientierung",
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

// ─── CircularGauge ────────────────────────────────────────────────────────────

/**
 * SVG ring gauge for match score.
 * The SVG is rotated -90° so the arc starts at 12 o'clock.
 */
function CircularGauge({ score, size = 48 }) {
  const sw = 5; // strokeWidth
  const r  = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const pct  = score != null ? Math.max(0, Math.min(100, score)) : null;
  const dash = pct != null ? circ - (pct / 100) * circ : circ;
  const color =
    pct == null ? "#94a3b8"   // slate-400 — no score yet
    : pct >= 70 ? "#16a34a"  // green-600  (matches getMatchColorClass ≥70)
    : pct >= 60 ? "#15803d"  // green-700  (matches ≥60)
    : pct >= 50 ? "#ca8a04"  // yellow-600 (matches ≥50)
    : pct >= 40 ? "#d97706"  // amber-600  (matches ≥40)
    : pct >= 30 ? "#ea580c"  // orange-600 (matches ≥30)
    : "#dc2626";             // red-600    (<30)

  return (
    // relative (position context for the score label overlay)
    // flex-shrink-0 (prevent the gauge from being squished in a flex row)
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* -rotate-90 (rotate so the arc starts at top instead of right) */}
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        {/* Track ring (always visible grey circle) */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={sw} />
        {/* Coloured progress arc */}
        {pct != null && (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
          />
        )}
      </svg>
      {/* absolute inset-0 (overlay div fills the same space as the SVG) */}
      {/* flex items-center justify-center (centres the score text) */}
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold leading-none"
        style={{ color }}
      >
        {pct != null ? `${Math.round(pct)}%` : "–"}
      </span>
    </div>
  );
}

// ─── MatchBar ─────────────────────────────────────────────────────────────────

/**
 * A single horizontal progress bar representing one feedback point.
 * Hover on desktop / click on mobile reveals the full text as a tooltip.
 * Width decreases for later items to visually rank importance.
 */
function MatchBar({ text, index, barColor, bgColor, isLast }) {
  const [open, setOpen] = useState(false);
  const barWidth = Math.max(22, 100 - index * 16); // First bar is widest

  return (
    // relative (tooltip is positioned relative to this container)
    // mb-2 (8px margin between bars, except the last)
    <div className={`relative ${!isLast ? "mb-2" : ""}`}>
      <div
        className="flex items-center gap-2 cursor-pointer group"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        {/* flex-1 (track stretches to fill remaining width) */}
        {/* h-4 (16px height for the bar) */}
        {/* rounded-full (pill shape) */}
        {/* overflow-hidden (keeps the fill within the track's rounded corners) */}
        <div className={`relative flex-1 h-4 ${bgColor} rounded-full overflow-hidden`}>
          {/* transition-all duration-500 (smooth width animation on mount) */}
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {/* Index bubble — flex-shrink-0 (never compress the number badge) */}
        <span className="w-4 h-4 flex-shrink-0 rounded-full bg-slate-100 text-slate-500 text-[9px] flex items-center justify-center font-bold group-hover:bg-slate-200 transition-colors">
          {index + 1}
        </span>
      </div>

      {/* Tooltip — absolute (detaches from flow), z-20 (above other content) */}
      {open && (
        <div className="absolute z-20 left-0 top-6 w-full max-w-xs rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs text-gray-700 leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}

// ─── MatchSection ─────────────────────────────────────────────────────────────

function MatchSection({ title, items = [], barColor, bgColor }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    // space-y-1 (4px between the label and bars)
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {items.map((text, i) => (
        <MatchBar
          key={i} text={text} index={i}
          barColor={barColor} bgColor={bgColor}
          isLast={i === items.length - 1}
        />
      ))}
    </div>
  );
}

function ApplicationPhaseStepper({ status }) {
  const currentStep = status === "bookmarked"
    ? 0
    : status === "applied"
      ? 1
      : status === "interviewing"
        ? 2
        : 3;

  const finalLabel = status === "rejected" ? "Absage" : "Zusage";
  const steps = ["Entwurf", "Beworben", "Interview", finalLabel];

  return (
    <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">Bewerbungs-Phase</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">Fortschritt bis zur Entscheidung</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[status]}`}>
          {status === "bookmarked" ? "Entwurf" : STATUS_LABELS[status]}
        </span>
      </div>

      <div className="flex items-start gap-2 overflow-x-auto pb-1">
        {steps.map((step, index) => {
          const active = index <= currentStep;
          const isFinal = index === steps.length - 1;
          return (
            <div key={step} className="flex min-w-[88px] flex-1 items-center gap-2">
              <div className="flex flex-col items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  active ? "bg-indigo-600 text-white" : "border border-slate-200 bg-white text-slate-400"
                }`}>
                  {index + 1}
                </div>
                <span className={`text-[11px] font-semibold ${active ? "text-gray-900" : "text-gray-400"}`}>{step}</span>
              </div>
              {!isFinal && (
                <div className="mt-4 h-[2px] flex-1 rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${index < currentStep ? "bg-indigo-500" : "bg-slate-200"}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── JobListCard ──────────────────────────────────────────────────────────────

/**
 * Condensed card shown in the left list panel.
 * Shows: circular gauge, job title, company, status badge, deadline badge.
 */
function JobListCard({ job, isSelected, onClick }) {
  const deadlineMeta = getDeadlineMeta(job.deadline);

  return (
    <button
      onClick={onClick}
      // w-full (stretch to parent width), text-left (override button centering)
      // rounded-xl (12px rounded corners — SaaS aesthetic)
      // border (1px stroke), transition-all duration-150 (smooth state change)
      className={`w-full text-left p-3 rounded-xl border transition-all duration-150
        ${isSelected
          ? "border-blue-400 bg-blue-50 shadow-sm ring-1 ring-blue-200"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
        }`}
    >
      {/* flex items-start (align at top), gap-3 (12px between gauge and text) */}
      <div className="flex items-start gap-3">
        <CircularGauge score={job.match_score} size={44} />

        {/* min-w-0 (allow flex child to shrink and trigger text truncation) */}
        {/* flex-1 (grow to fill remaining space) */}
        <div className="min-w-0 flex-1">
          {/* truncate (single-line ellipsis overflow) */}
          <p className="truncate text-sm font-semibold text-gray-900 leading-tight">
            {job.role || "Ohne Titel"}
          </p>
          <p className="truncate text-xs text-gray-500 mt-0.5">
            {job.company || "Unbekannt"}
          </p>
          {/* flex-wrap (wrap badges to next line on narrow cards) */}
          {/* gap-1 (4px between badges) */}
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${STATUS_COLORS[job.status]}`}>
              {STATUS_LABELS[job.status]}
            </span>
            {deadlineMeta && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${deadlineMeta.className}`}>
                {deadlineMeta.label}
              </span>
            )}
          </div>
        </div>

        {/* External link icon — flex-shrink-0 prevents compression */}
        {job.url && (
          <a
            href={job.url} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-slate-400 hover:text-blue-500 transition-colors mt-0.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </button>
  );
}

// ─── DetailPanel ─────────────────────────────────────────────────────────────

/**
 * The full detail view for a selected job.
 * Rendered both in the right desktop column and the mobile full-screen overlay.
 */
function DetailPanel({
  job,
  resumes,
  selectedResumeId,
  onResumeChange,
  processing,
  draftLoading,
  notesSaving,
  notesInput,
  jobUiState,
  expandedPanel,
  setExpandedPanel,
  descCollapsed,
  setDescCollapsed,
  notesTimeoutsRef,
  updateStatusMutation,
  deleteMutation,
  matchMutation,
  interviewMutation,
  notesMutation,
  deadlineMutation,
  urlMutation,
  onDraftEmail,
  onResearch,
  setNotesInput,
  setNotesSaving,
  onClose,        // mobile back button callback
  isMobileOverlay,
}) {
  if (!job) {
    return (
      // flex-1 (fill all available space in the right panel)
      // flex items-center justify-center (centre the placeholder text)
      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Search className="w-7 h-7" />
        </div>
        <p className="text-sm font-medium">Stelle auswählen um Details zu sehen</p>
      </div>
    );
  }

  const matchFeedback  = parseJson(job.match_feedback);
  const interviewQa    = parseJson(job.interview_qa);
  const hasResume      = Boolean(selectedResumeId);
  const isStatusUp     = Boolean(jobUiState[job.id]?.status);
  const isDeadlineSave = Boolean(jobUiState[job.id]?.deadline);
  const isUrlSave      = Boolean(jobUiState[job.id]?.url);
  const isDeleting     = Boolean(jobUiState[job.id]?.delete);
  const isMatchProc    = processing.jobId === job.id && processing.feature === "match";
  const [urlInput, setUrlInput] = useState(job.url || "");
  const [deadlineInput, setDeadlineInput] = useState(job.deadline ? job.deadline.split("T")[0] : "");
  const [matchCollapsed, setMatchCollapsed] = useState(false);
  const [collapsedQA, setCollapsedQA] = useState(new Set());

  useEffect(() => {
    setUrlInput(job.url || "");
    setDeadlineInput(job.deadline ? job.deadline.split("T")[0] : "");
  }, [job.id, job.url, job.deadline]);

  return (
    // flex flex-col (stack header, scrollable body, action bar vertically)
    // h-full (fill the panel — the parent controls height)
    <div className="flex flex-col h-full">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      {/* flex-shrink-0 (header never shrinks, stays fixed at top) */}
      {/* border-b (separator line between header and body) */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-slate-200 bg-white">
        {/* flex items-start justify-between (title on left, actions on right) */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            {/* Mobile back button */}
            {isMobileOverlay && (
              <button
                onClick={onClose}
                // mb-2 (8px below back button before the title)
                // flex items-center (icon + label inline)
                className="mb-2 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Zurück
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {job.role || "Ohne Titel"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{job.company || "Unbekanntes Unternehmen"}</p>
          </div>
          {/* Header action cluster */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {job.url && (
              <a
                href={job.url} target="_blank" rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                title="Stellenanzeige öffnen"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={() => deleteMutation.mutate(job.id)}
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Stelle löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Meta row: location, salary, status badge, match score */}
        {/* flex-wrap (wrap to next line on narrow panels) */}
        <div className="flex flex-wrap items-center gap-2">
          {job.location && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              {job.location}
            </span>
          )}
          {job.salary && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <DollarSign className="w-3 h-3 flex-shrink-0" />
              {job.salary}
            </span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[job.status]}`}>
            {STATUS_LABELS[job.status]}
          </span>
          {job.match_score != null && (
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getMatchColorClass(job.match_score)}`}>
              {Math.round(job.match_score)}% Match
            </span>
          )}
        </div>
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      {/* flex-1 (expand to fill all space between header and action bar) */}
      {/* overflow-y-auto (scroll just this section, not the whole page) */}
      {/* space-y-5 (20px between each section block) */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-slate-50">
        <ApplicationPhaseStepper status={job.status} />

        {/* Resume selector */}
        {resumes.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Lebenslauf</label>
            <select
              value={selectedResumeId || ""}
              onChange={(e) => onResumeChange(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name || r.filename || `Lebenslauf ${r.id}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* ── Match Analysis ──────────────────────────────────────────────── */}
        {(matchFeedback || job.match_score != null) && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
            <button
              onClick={() => setMatchCollapsed((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <h3 className="text-sm font-semibold text-gray-900">Match-Analyse</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {job.match_score != null && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${getMatchColorClass(job.match_score)}`}>
                    {Math.round(job.match_score)}%
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${matchCollapsed ? "" : "rotate-180"}`} />
              </div>
            </button>

            {!matchCollapsed && (
              <>
                {/* Summary text */}
                {job.match_score != null && matchFeedback?.summary && (
                  <p className="text-xs leading-relaxed text-gray-600">{matchFeedback.summary}</p>
                )}

                {/* Progress bars */}
                {matchFeedback && (
                  <div className="space-y-4">
                    <MatchSection title="Stärken" items={matchFeedback.strengths} barColor="bg-emerald-500" bgColor="bg-emerald-100" />
                    <MatchSection title="Verbesserungen" items={matchFeedback.gaps} barColor="bg-red-400" bgColor="bg-red-100" />
                    <MatchSection title="Empfehlungen" items={matchFeedback.recommendations} barColor="bg-blue-400" bgColor="bg-blue-100" />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Status Switcher ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Status ändern</h3>
          {/* flex-wrap (wrap status pills to multiple rows if needed) */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.filter((s) => s !== job.status).map((status) => (
              <button
                key={status}
                onClick={() => updateStatusMutation.mutate({ jobId: job.id, status })}
                disabled={isStatusUp}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* ── Details (description, URL, deadline, notes) ─────────────────── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Details</h3>

          {/* Description */}
          {job.description && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold text-gray-600">Stellenbeschreibung</p>
                <button
                  onClick={() => setDescCollapsed((v) => !v)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  {descCollapsed ? "Anzeigen" : "Minimieren"}
                </button>
              </div>
              {!descCollapsed && (
                // max-h-48 (192px max height — scroll rather than grow infinitely)
                // overflow-y-auto (scroll inside the description box)
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-gray-700">
                  {job.description}
                </div>
              )}
            </div>
          )}

          {/* URL */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Stellenanzeige Link</label>
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onBlur={() => {
                  const value = urlInput.trim() || null;
                  if (value !== (job.url || null)) urlMutation.mutate({ jobId: job.id, url: value });
                }}
                disabled={isUrlSave}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="https://..."
              />
              <a
                href={urlInput.trim() || job.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { if (!urlInput.trim() && !job.url) e.preventDefault(); }}
                className={`inline-flex flex-shrink-0 items-center gap-1.5 justify-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  urlInput.trim() || job.url
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "cursor-not-allowed bg-slate-100 text-slate-400"
                }`}
              >
                <ExternalLink className="w-3 h-3" />
                Öffnen
              </a>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Bewerbungsfrist</label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              onBlur={() => {
                const nextDeadline = deadlineInput ? new Date(`${deadlineInput}T12:00:00`).toISOString() : null;
                if (nextDeadline !== (job.deadline || null)) {
                  deadlineMutation.mutate({
                    jobId: job.id,
                    deadline: nextDeadline,
                  });
                }
              }}
              disabled={isDeadlineSave}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Notizen</label>
            <textarea
              value={notesInput[job.id] ?? job.notes ?? ""}
              onChange={(e) => {
                const value = e.target.value;
                setNotesInput((old) => ({ ...old, [job.id]: value }));
                setNotesSaving((old) => ({ ...old, [job.id]: true }));
                clearTimeout(notesTimeoutsRef.current[job.id]);
                notesTimeoutsRef.current[job.id] = setTimeout(
                  () => notesMutation.mutate({ jobId: job.id, notes: value }),
                  800
                );
              }}
              placeholder="Persönliche Notizen..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs"
              rows={3}
            />
            {notesSaving[job.id] && <p className="mt-0.5 text-[10px] text-slate-400">Speichert…</p>}
          </div>
        </div>

        {/* ── Expanded: Cover Letter ───────────────────────────────────────── */}
        {job.cover_letter && (
          <div className="rounded-xl border border-green-200 bg-white shadow-sm">
            <button
              onClick={() => setExpandedPanel((v) => (v === `cover-${job.id}` ? null : `cover-${job.id}`))}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-green-700"
            >
              <FileText className="w-4 h-4 flex-shrink-0" />
              Motivationsschreiben
              <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${expandedPanel === `cover-${job.id}` ? "rotate-180" : ""}`} />
            </button>
            {expandedPanel === `cover-${job.id}` && (
              <div className="max-h-64 overflow-y-auto whitespace-pre-wrap border-t border-green-200 px-4 py-3 text-xs leading-relaxed text-gray-700">
                {job.cover_letter}
              </div>
            )}
          </div>
        )}

        {/* ── Expanded: Interview Q&A ──────────────────────────────────────── */}
        {job.interview_qa && Array.isArray(interviewQa) && (
          <div className="rounded-xl border border-purple-200 bg-white shadow-sm">
            <div className="flex items-center px-4 py-3 gap-2">
              <button
                onClick={() => setExpandedPanel((v) => (v === `interview-${job.id}` ? null : `interview-${job.id}`))}
                className="flex flex-1 items-center gap-2 text-sm font-semibold text-purple-700 text-left"
              >
                <Brain className="w-4 h-4 flex-shrink-0" />
                Gesprächsvorbereitung
                <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${expandedPanel === `interview-${job.id}` ? "rotate-180" : ""}`} />
              </button>
              {/* Download buttons — only visible when there's Q&A data */}
              <div className="flex items-center gap-1 flex-shrink-0 border-l border-purple-100 pl-2">
                <button
                  onClick={() => downloadQaTxt(job, interviewQa)}
                  title="Als TXT herunterladen"
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Download className="w-3 h-3" /> TXT
                </button>
                <button
                  onClick={() => downloadQaPdf(job, interviewQa)}
                  title="Als PDF drucken / speichern"
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button
                  onClick={() => downloadQaDocx(job, interviewQa)}
                  title="Als Word-Dokument herunterladen"
                  className="flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Download className="w-3 h-3" /> DOCX
                </button>
              </div>
            </div>
            {expandedPanel === `interview-${job.id}` && (
              <div className="border-t border-purple-200 px-4 py-3 space-y-2">
                {interviewQa.map((item, idx) => {
                  const type = TYPE_MAP[(item.type || "").toLowerCase()] || item.type || "Frage";
                  const isQCollapsed = collapsedQA.has(idx);
                  return (
                    <div key={idx} className="rounded-lg border border-gray-100 bg-slate-50">
                      <button
                        onClick={() => setCollapsedQA((prev) => {
                          const next = new Set(prev);
                          next.has(idx) ? next.delete(idx) : next.add(idx);
                          return next;
                        })}
                        className="flex w-full items-start gap-2 p-3 text-left"
                      >
                        <span className="text-[10px] font-bold text-gray-400 flex-shrink-0 mt-0.5">Q{idx + 1}</span>
                        <p className="flex-1 text-xs font-semibold text-gray-800 min-w-0">{item.question || item}</p>
                        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 text-gray-400 transition-transform duration-150 ${isQCollapsed ? "" : "rotate-180"}`} />
                      </button>
                      {!isQCollapsed && (
                        <div className="px-3 pb-3 pt-0 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_COLORS[type] || "bg-gray-100 text-gray-700"}`}>
                              {type}
                            </span>
                          </div>
                          {item.answer && (
                            <p className="text-xs leading-relaxed text-gray-600">{item.answer}</p>
                          )}
                          {item.tip && (
                            <p className="text-xs leading-relaxed text-amber-800 bg-amber-50 rounded-lg px-2.5 py-2">{item.tip}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Bottom spacer so content clears the action bar on mobile */}
        {isMobileOverlay && <div className="h-20" />}
      </div>

      {/* ── Action Bar ──────────────────────────────────────────────────────── */}
      {/*
        Desktop: flex-shrink-0 at bottom of the detail column
        Mobile:  sticky bottom-0 with shadow-up — always visible above keyboard
        In both cases: flex items-center gap-2, wrap on small widths
      */}
      <div className={`flex-shrink-0 border-t border-slate-200 bg-white px-4 py-3
        ${isMobileOverlay ? "sticky bottom-0 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]" : ""}
      `}>
        {!hasResume && (
          <p className="mb-2 text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-1.5">
            Wähle einen Lebenslauf für Match, Anschreiben &amp; Gespräch.
          </p>
        )}
        {/* flex-wrap (wrap to a second line on very narrow panels) */}
        <div className="flex flex-wrap gap-2">
          {/* Match-Bewertung */}
          <button
            onClick={() => {
              if (!hasResume || isMatchProc) return;
              onDraftEmail._setProcessing({ jobId: job.id, feature: "match" });
              onDraftEmail._matchMutation.mutate({ jobId: job.id, resumeId: selectedResumeId });
            }}
            disabled={!hasResume || isMatchProc}
            title={!hasResume ? "Lebenslauf auswählen" : ""}
            // flex items-center gap-1.5 (icon + label inline with 6px gap)
            // flex-1 (each button grows equally to fill the row)
            // min-w-0 (allow flex children to shrink)
            className="flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-indigo-600 bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isMatchProc
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <Zap className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span className="truncate">{isMatchProc ? "Berechne…" : "Match"}</span>
          </button>

          {/* Anschreiben */}
          <button
            onClick={() => onDraftEmail(job)}
            disabled={draftLoading === job.id}
            className="flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {draftLoading === job.id
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              : <FileText className="w-3.5 h-3.5 flex-shrink-0" />
            }
            <span className="truncate">{draftLoading === job.id ? "Erstelle…" : "Anschreiben"}</span>
          </button>

          {/* Gesprächsvorbereitung */}
          <button
            onClick={() => {
              if (job.interview_qa) {
                setExpandedPanel((v) => (v === `interview-${job.id}` ? null : `interview-${job.id}`));
              } else {
                interviewMutation.mutate({ jobId: job.id, resumeId: selectedResumeId || undefined });
              }
            }}
            disabled={!hasResume || interviewMutation.isPending}
            className="flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Gespräch</span>
          </button>

          {/* Recherche */}
          <button
            onClick={() => onResearch(job)}
            disabled={!job.company}
            title={!job.company ? "Firmenname fehlt" : ""}
            className={`flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${job.research_data
                ? "border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700"
                : "border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-50"
              }`}
          >
            <SearchCheck className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">Recherche</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ApplicationsList({ jobs, onJobsUpdate, focusedJobId = null }) {
  const queryClient = useQueryClient();
  const notesTimeoutsRef = useRef({});

  // ── UI State ─────────────────────────────────────────────────────────────────
  const [selectedJobId,    setSelectedJobId]    = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [searchQuery,      setSearchQuery]      = useState("");
  const [filterStatus,     setFilterStatus]     = useState("all");
  const [sortBy,           setSortBy]           = useState("recent");
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [processing,       setProcessing]       = useState({ jobId: null, feature: null });
  const [draftLoading,     setDraftLoading]     = useState(null);
  const [draftTexts,       setDraftTexts]       = useState({});
  const [notesInput,       setNotesInput]       = useState({});
  const [notesSaving,      setNotesSaving]      = useState({});
  const [jobUiState,       setJobUiState]       = useState({});
  const [expandedPanel,    setExpandedPanel]    = useState(null);
  const [descCollapsed,    setDescCollapsed]    = useState(true);
  const [researchModal,    setResearchModal]    = useState(null);
  const [researchData,     setResearchData]     = useState(null);
  const [researchLoading,  setResearchLoading]  = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((res) => res.data),
  });

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) setSelectedResumeId(resumes[0].id);
  }, [resumes, selectedResumeId]);

  // Auto-expand focused job from URL param
  useEffect(() => {
    if (!focusedJobId) return;
    setSelectedJobId(Number(focusedJobId));
    setMobileDetailOpen(true);
  }, [focusedJobId]);

  // Clear notes timers on unmount
  useEffect(() => {
    const timeouts = notesTimeoutsRef.current;
    return () => Object.values(timeouts).forEach(clearTimeout);
  }, []);

  // ── Derived State ────────────────────────────────────────────────────────────
  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const filteredJobs = useMemo(
    () => filterAndSortJobs(jobs, { searchQuery, filterStatus, filterMinMatch: 0, sortBy }),
    [jobs, searchQuery, filterStatus, sortBy]
  );

  const pipelineStats = useMemo(() => {
    const out = {};
    PIPELINE_CONFIG.forEach(({ key }) => { out[key] = jobs.filter((j) => j.status === key).length; });
    return out;
  }, [jobs]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const syncJobs = (updater) => {
    queryClient.setQueryData(["jobs"], (old = []) => updater(old));
    if (typeof onJobsUpdate === "function") onJobsUpdate((old = []) => updater(old));
  };

  const setJobFlag = (jobId, key, value) =>
    setJobUiState((old) => ({ ...old, [jobId]: { ...(old[jobId] || {}), [key]: value } }));

  const applyJobUpdate = (job) => {
    if (!job) return;
    queryClient.setQueryData(["jobs", String(job.id)], job);
    syncJobs((old = []) => updateJobList(old, job));
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId);
    setDescCollapsed(true);
    setExpandedPanel(null);
    setMobileDetailOpen(true);
  };

  // ── Mutations ────────────────────────────────────────────────────────────────

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }) => jobApi.updateStatus(jobId, status),
    onMutate: async ({ jobId, status }) => {
      setJobFlag(jobId, "status", true);
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const prev = queryClient.getQueryData(["jobs"]);
      syncJobs((old = []) =>
        old.map((j) => (j.id === jobId ? { ...j, status, updated_at: new Date().toISOString() } : j))
      );
      return { prev };
    },
    onSuccess: (res) => {
      applyJobUpdate(res.data);
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      toast.success("Status aktualisiert!");
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["jobs"], ctx.prev);
      toast.error(getApiErrorMessage(err, "Status konnte nicht aktualisiert werden"));
    },
    onSettled: (_, __, vars) => setJobFlag(vars.jobId, "status", false),
  });

  const deleteMutation = useMutation({
    mutationFn: (jobId) => jobApi.delete(jobId),
    onMutate: (jobId) => {
      setJobFlag(jobId, "delete", true);
      clearTimeout(notesTimeoutsRef.current[jobId]);
      delete notesTimeoutsRef.current[jobId];
    },
    onSuccess: (_, jobId) => {
      queryClient.removeQueries({ queryKey: ["jobs", String(jobId)], exact: true });
      syncJobs((old = []) => old.filter((j) => j.id !== jobId));
      queryClient.invalidateQueries({ queryKey: ["pipeline", "stats"] });
      // Deselect if the deleted job was selected
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setMobileDetailOpen(false);
      }
      toast.success("Stelle entfernt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Stelle konnte nicht gelöscht werden")),
    onSettled: (_, __, jobId) => setJobFlag(jobId, "delete", false),
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

  const interviewMutation = useMutation({
    mutationFn: ({ jobId, resumeId }) => jobApi.generateInterviewPrep(jobId, resumeId),
    onSuccess: (res, vars) => {
      applyJobUpdate(res.data);
      setExpandedPanel(`interview-${vars.jobId}`);
      toast.success("Gesprächsvorbereitung fertig!");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Gesprächsvorbereitung konnte nicht erstellt werden")),
  });

  const notesMutation = useMutation({
    mutationFn: ({ jobId, notes }) => jobApi.updateNotes(jobId, notes),
    onSuccess: (res, vars) => {
      applyJobUpdate(res.data);
      setNotesSaving((old) => ({ ...old, [vars.jobId]: false }));
    },
    onError: (err, vars) => {
      setNotesSaving((old) => ({ ...old, [vars.jobId]: false }));
      if (err?.response?.status !== 404) {
        toast.error(getApiErrorMessage(err, "Notizen konnten nicht gespeichert werden"));
      }
    },
  });

  const deadlineMutation = useMutation({
    mutationFn: ({ jobId, deadline }) => jobApi.updateDeadline(jobId, deadline),
    onMutate: ({ jobId }) => setJobFlag(jobId, "deadline", true),
    onSuccess: (res) => { applyJobUpdate(res.data); toast.success("Frist aktualisiert!"); },
    onError: (err) => toast.error(getApiErrorMessage(err, "Frist konnte nicht gespeichert werden")),
    onSettled: (_, __, vars) => setJobFlag(vars.jobId, "deadline", false),
  });

  const urlMutation = useMutation({
    mutationFn: ({ jobId, url }) => jobApi.updateUrl(jobId, url),
    onMutate: ({ jobId }) => setJobFlag(jobId, "url", true),
    onSuccess: (res) => applyJobUpdate(res.data),
    onError: (err) => toast.error(getApiErrorMessage(err, "Link konnte nicht gespeichert werden")),
    onSettled: (_, __, vars) => setJobFlag(vars.jobId, "url", false),
  });

  // ── Action Handlers ───────────────────────────────────────────────────────────

  const handleDraftEmail = async (job) => {
    const userName = initData?.me?.full_name || initData?.me?.email?.split("@")[0] || "Bewerber";
    const jobForLink = { ...job, title: job.role || job.title, role: job.role || job.title };
    if (draftTexts[job.id]) {
      window.location.href = generateMailtoLink(jobForLink, draftTexts[job.id], userName);
      toast.success("Brief-Entwurf geöffnet!");
      return;
    }
    if (job.cover_letter) {
      window.location.href = generateMailtoLink(jobForLink, job.cover_letter, userName);
      toast.success("Brief-Entwurf geöffnet!");
      return;
    }
    setDraftLoading(job.id);
    try {
      const res = await motivationsschreibenApi.generate({
        company: job.company || "",
        role: job.role || "",
        job_description: job.description || `${job.role} bei ${job.company}`,
        tone: "formell",
        resume_id: selectedResumeId || resumes[0]?.id || null,
        applicant_name: initData?.me?.full_name || "",
      });
      const text = res.data?.text || "";
      if (!text) throw new Error("empty");
      setDraftTexts((old) => ({ ...old, [job.id]: text }));
      window.location.href = generateMailtoLink(jobForLink, text, userName);
      toast.success("Brief-Entwurf geöffnet!");
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(
        err.message === "empty"
          ? "KI hat keinen Text zurückgegeben."
          : getApiErrorMessage(err, "Brief-Entwurf konnte nicht generiert werden")
      );
    } finally {
      setDraftLoading(null);
    }
  };

  // Attach helpers that DetailPanel needs to call match inline
  handleDraftEmail._setProcessing = setProcessing;
  handleDraftEmail._matchMutation = matchMutation;

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

  // ── Empty State ───────────────────────────────────────────────────────────────
  if (jobs.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500 animate-slide-up">
        Noch keine Stellen gespeichert. Starte mit der Stellensuche!
      </div>
    );
  }

  // ── Shared DetailPanel props ──────────────────────────────────────────────────
  const detailProps = {
    job: selectedJob,
    resumes,
    selectedResumeId,
    onResumeChange: setSelectedResumeId,
    processing,
    draftLoading,
    notesSaving,
    notesInput,
    jobUiState,
    expandedPanel,
    setExpandedPanel,
    descCollapsed,
    setDescCollapsed,
    notesTimeoutsRef,
    updateStatusMutation,
    deleteMutation,
    matchMutation,
    interviewMutation,
    notesMutation,
    deadlineMutation,
    urlMutation,
    onDraftEmail: handleDraftEmail,
    onResearch: handleResearch,
    setNotesInput,
    setNotesSaving,
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    // animate-slide-up (page entrance animation from globals)
    <div className="animate-slide-up space-y-4">

      {/* ══ Pipeline Stats Header ════════════════════════════════════════════════
          Mobile:  flex-nowrap overflow-x-auto → horizontally scrollable row
          Desktop: grid grid-cols-5            → full-width 5-column grid
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:pb-0">
        {/* flex-nowrap (prevent cards from wrapping — forces horizontal scroll on mobile) */}
        {/* md:grid md:grid-cols-5 (switch to 5-column grid on medium+ screens) */}
        {PIPELINE_CONFIG.map(({ key, label, icon: Icon, cardCls, iconCls }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            // min-w-[120px] (min card width so cards don't get too squished in scroll)
            // flex-shrink-0 (prevent cards from shrinking below min-w in the flex row)
            // rounded-xl border (SaaS card style)
            // ring-2 (highlight ring when this status is actively filtered)
            className={`min-w-[120px] flex-shrink-0 rounded-xl border p-3 text-left transition-all duration-150 md:min-w-0
              ${cardCls}
              ${filterStatus === key ? "ring-2 ring-offset-1 ring-blue-400 shadow-md" : "hover:shadow-sm"}
            `}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconCls}`} />
              <span className="text-[11px] font-semibold text-gray-600 truncate">{label}</span>
            </div>
            {/* text-2xl font-bold (large counter number) */}
            <div className="text-2xl font-bold text-gray-900">{pipelineStats[key] ?? 0}</div>
          </button>
        ))}
      </div>

      {/* ══ Split-View Dashboard ════════════════════════════════════════════════
          Mobile:  flex-col  → stacked (list only; detail opens as overlay)
          Desktop: flex-row  → side-by-side (left list + right detail)

          h-[calc(100svh-320px)]  →  fixed height so both columns scroll
                                      independently without the page scrolling
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col md:flex-row rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden md:h-[calc(100svh-320px)]">
        {/* ── Left Column: Job List ─────────────────────────────────────────────
            w-full (full width on mobile), md:w-72 lg:w-80 (fixed width on desktop)
            flex-shrink-0 (never compress the list column)
            flex flex-col (stack search bar + list vertically)
            border-r (separator line between list and detail on desktop)
            overflow-hidden (clip children; individual sections scroll)
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="w-full md:w-72 lg:w-80 flex-shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 overflow-hidden">

          {/* Search + Sort bar */}
          {/* flex-shrink-0 (search bar never shrinks; only the list scrolls) */}
          <div className="flex-shrink-0 p-3 border-b border-slate-100 space-y-2">
            {/* relative (position the search icon inside the input) */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              {/* pl-8 (left padding clears the icon) */}
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche…"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
              />
            </div>
            {/* grid grid-cols-2 (sort and status filter side by side) */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs"
              >
                <option value="all">Alle Status</option>
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-xs"
              >
                <option value="recent">Neueste</option>
                <option value="match-high">Match ↓</option>
                <option value="match-low">Match ↑</option>
              </select>
            </div>
          </div>

          {/* Job list — flex-1 (fill remaining height), overflow-y-auto (scroll) */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredJobs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">Keine Stellen gefunden</p>
            ) : (
              filteredJobs.map((job) => (
                <JobListCard
                  key={job.id}
                  job={job}
                  isSelected={job.id === selectedJobId}
                  onClick={() => handleSelectJob(job.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right Column: Detail Panel (desktop only) ─────────────────────────
            hidden md:flex  (invisible on mobile, flex column on desktop)
            flex-1          (grow to fill all remaining horizontal space)
            overflow-hidden (DetailPanel manages its own internal scroll)
        ─────────────────────────────────────────────────────────────────────── */}
        <div className="hidden md:flex flex-1 flex-col overflow-hidden">
          <DetailPanel
            key={selectedJob?.id || "desktop-empty"}
            {...detailProps}
            isMobileOverlay={false}
            onClose={() => {}}
          />
        </div>
      </div>

      {/* ══ Mobile Full-Screen Overlay ══════════════════════════════════════════
          fixed inset-0  (covers the entire viewport — top/right/bottom/left: 0)
          z-50           (above all other content)
          md:hidden      (only visible on mobile; desktop uses the split panel)
          flex flex-col  (DetailPanel fills the height)
          bg-white       (solid white background)
      ══════════════════════════════════════════════════════════════════════════ */}
      {mobileDetailOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white md:hidden overflow-hidden">
          <DetailPanel
            key={selectedJob?.id || "mobile-empty"}
            {...detailProps}
            isMobileOverlay={true}
            onClose={() => setMobileDetailOpen(false)}
          />
        </div>
      )}

      {/* Research Modal (portal-style, sits outside the layout) */}
      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          jobId={researchModal.jobId}
          onRefresh={() => {
            const job = jobs.find((j) => j.id === researchModal.jobId);
            if (job) handleResearch(job, true);
          }}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}
    </div>
  );
}
