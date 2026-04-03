import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Check } from "lucide-react";

/**
 * Status configuration for saved-job pipeline stages.
 * @type {Record<string, {label: string, color: string}>}
 */
const STATUS_CFG = {
  bookmarked:   { label: "Gespeichert",  color: "#94a3b8" },
  applied:      { label: "Beworben",     color: "#10b981" },
  interviewing: { label: "Gespräch",     color: "#3b82f6" },
  offered:      { label: "Angebot",      color: "#fbbf24" },
  rejected:     { label: "Abgelehnt",    color: "#ef4444" },
};

/**
 * Tabs displayed in the glassmorphism filter bar.
 * @type {Array<{key: string, label: string}>}
 */
const FILTER_TABS = [
  { key: "all",        label: "Alle" },
  { key: "bookmarked", label: "Gespeichert" },
  { key: "applied",    label: "Beworben" },
];

/**
 * Glowing SVG ring showing the match-score percentage.
 * Uses a conic-like stroke-dasharray trick for a clean arc.
 * @param {object} props
 * @param {number|null} props.score - 0-100 match percentage
 */
function ScoreRing({ score }) {
  const normalized = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : null;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset =
    normalized == null ? circ * 0.65 : circ - (normalized / 100) * circ;

  const arcColor =
    normalized == null
      ? "#3a3a42"
      : normalized >= 70
        ? "#10b981"
        : normalized >= 50
          ? "#3b82f6"
          : "#f59e0b";

  const glowColor =
    normalized == null
      ? "none"
      : normalized >= 70
        ? "drop-shadow(0 0 6px rgba(16,185,129,0.45))"
        : normalized >= 50
          ? "drop-shadow(0 0 6px rgba(59,130,246,0.45))"
          : "drop-shadow(0 0 6px rgba(245,158,11,0.35))";

  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg viewBox="0 0 44 44" className="-rotate-90 w-12 h-12">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          style={{ filter: glowColor }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums"
        style={{ color: arcColor }}
      >
        {normalized != null ? `${normalized}` : "—"}
      </span>
    </div>
  );
}

/**
 * Tiny pulsing status indicator dot.
 * Blue pulse = "Neu" (bookmarked), Green check = "Bereit" (applied).
 * @param {object} props
 * @param {string} props.status
 */
function StatusLight({ status }) {
  if (status === "applied" || status === "interviewing" || status === "offered") {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className="grid place-items-center h-4 w-4 rounded-full"
          style={{ background: "rgba(16,185,129,0.12)" }}
        >
          <Check size={9} strokeWidth={3} color="#10b981" />
        </div>
        <span className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#3a3a42]">
          {STATUS_CFG[status]?.label ?? "Bereit"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
          style={{ background: "#3b82f6" }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{
            background: "#3b82f6",
            boxShadow: "0 0 6px rgba(59,130,246,0.5)",
          }}
        />
      </span>
      <span className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#3a3a42]">
        Neu
      </span>
    </div>
  );
}

/**
 * Time-ago helper — returns a short German string.
 * @param {string|null} dateStr
 * @returns {string|null}
 */
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "HEUTE";
  if (days === 1) return "GESTERN";
  return `VOR ${days}T`;
}

/**
 * Premium "Gespeicherte Stellen" section — curated career opportunities.
 *
 * Apple / Revolut design language:
 * - #000 background, cards with #080808→#030303 gradient, no border
 * - Glassmorphism filter bar
 * - Match-score ring, status lights, ALL-CAPS meta labels
 * - 12-col CSS Grid, mobile card-stack
 *
 * @param {object} props
 * @param {Array} props.jobs - Array of saved job objects
 * @param {string} [props.className]
 */
export default function SavedJobsSection({ jobs = [], className = "" }) {
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  if (!jobs.length) return null;

  /* --- Filtering --- */
  const tabFilter = (job) => {
    if (activeTab === "all") return true;
    if (activeTab === "bookmarked") return !job.status || job.status === "bookmarked";
    if (activeTab === "applied")
      return ["applied", "interviewing", "offered"].includes(job.status);
    return job.status === activeTab;
  };
  const filtered = jobs.filter(tabFilter);

  /* --- Sorting --- */
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "score") return (b.match_score ?? -1) - (a.match_score ?? -1);
    if (sortBy === "date")
      return new Date(b.updated_at || b.created_at || 0) -
             new Date(a.updated_at || a.created_at || 0);
    return (a.status || "").localeCompare(b.status || "");
  });
  const visible = sorted.slice(0, 12);

  /* --- Tab counts --- */
  const counts = {
    all: jobs.length,
    bookmarked: jobs.filter((j) => !j.status || j.status === "bookmarked").length,
    applied: jobs.filter((j) =>
      ["applied", "interviewing", "offered"].includes(j.status)
    ).length,
  };

  return (
    <section className={`col-span-12 ${className}`}>
      {/* ─── Section header ─── */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="block text-[10px] font-medium tracking-[0.18em] uppercase text-[#505058]">
            Kuratierte Auswahl
          </span>
          <h2 className="mt-1 text-[22px] sm:text-[26px] font-semibold text-white tracking-tight leading-none">
            Gespeicherte Stellen
          </h2>
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-[10px] tracking-[0.14em] uppercase px-3 py-1.5 rounded-lg bg-transparent text-[#505058] focus:outline-none appearance-none cursor-pointer"
        >
          <option value="score">Match ↓</option>
          <option value="date">Datum</option>
          <option value="status">Status</option>
        </select>
      </div>

      {/* ─── Glassmorphism filter bar ─── */}
      <div
        className="inline-flex gap-1 p-1 rounded-xl mb-8"
        style={{
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative px-4 py-2 rounded-lg transition-all duration-200"
              style={
                isActive
                  ? {
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
                      boxShadow:
                        "inset 0 1px 0 0 rgba(255,255,255,0.08), 0 0 12px rgba(59,130,246,0.08)",
                    }
                  : {}
              }
            >
              <span
                className={`text-[10px] font-medium tracking-[0.14em] uppercase transition-colors ${
                  isActive ? "text-white" : "text-[#3a3a42] hover:text-[#606068]"
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`ml-1.5 text-[10px] tabular-nums ${
                  isActive ? "text-[#606068]" : "text-[#2a2a32]"
                }`}
              >
                {counts[tab.key]}
              </span>
              {/* Active indicator line */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-5 rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
                    boxShadow: "0 0 8px rgba(59,130,246,0.5)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Cards grid: desktop = 3-col compact, mobile = stacked ─── */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {visible.map((job) => {
          const score =
            job.match_score != null ? Math.round(job.match_score) : null;
          const dateLabel = timeAgo(job.updated_at || job.created_at);

          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="col-span-12 sm:col-span-6 lg:col-span-4 group rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background:
                  "linear-gradient(180deg, #080808 0%, #030303 100%)",
                boxShadow:
                  "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 2px 8px -2px rgba(0,0,0,0.4)",
              }}
            >
              {/* Top: status light + chevron */}
              <div className="flex items-center justify-between mb-4">
                <StatusLight status={job.status || "bookmarked"} />
                <ChevronRight
                  size={14}
                  className="text-[#1a1a22] transition-colors group-hover:text-[#505058]"
                />
              </div>

              {/* Middle: title + company alongside score ring */}
              <div className="flex items-center gap-4">
                <ScoreRing score={score} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-white truncate leading-tight">
                    {job.role}
                  </p>
                  <p className="text-[12px] text-[#707078] truncate mt-1">
                    {job.company}
                  </p>
                </div>
              </div>

              {/* Bottom: meta labels */}
              <div className="flex items-center gap-4 mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
                {job.location && (
                  <span className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#3a3a42]">
                    {job.location}
                  </span>
                )}
                {dateLabel && (
                  <span className="text-[9px] font-medium tracking-[0.16em] uppercase text-[#3a3a42]">
                    {dateLabel}
                  </span>
                )}
                {score != null && (
                  <span
                    className="ml-auto text-[9px] font-semibold tracking-[0.14em] uppercase"
                    style={{
                      color:
                        score >= 70
                          ? "#10b981"
                          : score >= 50
                            ? "#3b82f6"
                            : "#f59e0b",
                    }}
                  >
                    {score}% MATCH
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Overflow note */}
      {sorted.length > 12 && (
        <p className="text-center text-[10px] tracking-[0.14em] uppercase text-[#3a3a42] mt-6">
          +{sorted.length - 12} weitere Stellen
        </p>
      )}
    </section>
  );
}
