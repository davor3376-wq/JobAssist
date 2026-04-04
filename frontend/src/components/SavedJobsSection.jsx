import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, FileText, Sparkles } from "lucide-react";

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
 * 40x40 rounded logo placeholder showing company initial + accent color.
 * @param {object} props
 * @param {string} props.company
 * @param {string} props.status
 */
function LogoField({ company, status }) {
  const initial = (company || "?").charAt(0).toUpperCase();
  const cfg = STATUS_CFG[status] || STATUS_CFG.bookmarked;
  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center"
      style={{
        background: `${cfg.color}12`,
        boxShadow: `inset 0 0 0 1px ${cfg.color}18`,
      }}
    >
      <span className="text-[14px] font-semibold" style={{ color: cfg.color }}>
        {initial}
      </span>
    </div>
  );
}

/**
 * Thin neon match-score ring (36px) — Apple Wallet style.
 * @param {object} props
 * @param {number|null} props.score
 */
function NeonMatchRing({ score }) {
  const normalized = Number.isFinite(score)
    ? Math.max(0, Math.min(100, Math.round(score)))
    : null;
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset =
    normalized == null ? circ * 0.35 : circ - (normalized / 100) * circ;

  const color =
    normalized == null
      ? "#3a3a42"
      : normalized >= 70
        ? "#10b981"
        : normalized >= 50
          ? "#3b82f6"
          : "#f59e0b";

  return (
    <div className="relative w-9 h-9 flex-shrink-0">
      <svg viewBox="0 0 36 36" className="-rotate-90 w-9 h-9">
        <defs>
          <filter id={`nrGlow-${normalized}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx="18" cy="18" r={r} fill="none" stroke="#111114" strokeWidth="1.5" />
        <circle
          cx="18" cy="18" r={r} fill="none"
          stroke={color} strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
          filter={`url(#nrGlow-${normalized})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums"
        style={{ color }}
      >
        {normalized != null ? normalized : "—"}
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
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  return `Vor ${days}T`;
}

/**
 * Premium "Gespeicherte Stellen" section — row-based transaction list.
 *
 * Apple Wallet / Revolut design language:
 * - 72px rows, deep black, 1px gradient separators
 * - 40x40 logo field, thin neon match ring
 * - Glass hover with quick-action icons
 * - 12-col CSS Grid
 *
 * @param {object} props
 * @param {Array} props.jobs - Array of saved job objects
 * @param {string} [props.className]
 */
export default function SavedJobsSection({ jobs = [], className = "" }) {
  const [activeTab, setActiveTab] = useState("all");
  const [sortBy, setSortBy] = useState("score");

  if (!jobs.length) {
    return (
      <section className={`col-span-12 ${className}`}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="block text-[10px] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Kuratierte Auswahl
            </span>
            <h2 className="mt-1 text-[22px] sm:text-[26px] font-semibold text-white tracking-tight leading-none">
              Gespeicherte Stellen
            </h2>
          </div>
        </div>
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(180deg, #080808 0%, #030303 100%)",
            boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
          }}
        >
          <Sparkles size={24} className="text-[#3a3a42] mx-auto mb-3" />
          <p className="text-[13px] font-medium text-[#505058]">Noch keine Stellen gespeichert</p>
          <p className="text-[10px] text-[#3a3a42] mt-1">Suche unten nach Jobs und speichere deine Favoriten</p>
        </div>
      </section>
    );
  }

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
        className="inline-flex gap-1 p-1 rounded-xl mb-6"
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

      {/* ─── Row-based list — transaction style ─── */}
      <div
        className="rounded-2xl overflow-hidden max-h-[520px] overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1C2333] [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{
          background: "linear-gradient(180deg, #080808 0%, #030303 100%)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        {visible.map((job, i) => {
          const score =
            job.match_score != null ? Math.round(job.match_score) : null;
          const dateLabel = timeAgo(job.updated_at || job.created_at);
          const statusCfg = STATUS_CFG[job.status] || STATUS_CFG.bookmarked;

          return (
            <Link
              key={job.id}
              to={`/jobs/${job.id}`}
              className="group flex items-center gap-4 px-5 transition-all duration-200 hover:bg-[#080808]"
              style={{
                height: "72px",
                ...(i > 0
                  ? {
                      borderTop: "1px solid transparent",
                      borderImage:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%) 1",
                    }
                  : {}),
              }}
            >
              {/* 40x40 Logo field */}
              <LogoField company={job.company} status={job.status || "bookmarked"} />

              {/* Title + Company — full focus on title */}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-white truncate leading-tight">
                  {job.role}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-[#505058] truncate">
                    {job.company}
                  </span>
                  {/* Status dot */}
                  <span
                    className="flex-shrink-0 h-1 w-1 rounded-full"
                    style={{
                      background: statusCfg.color,
                      boxShadow: `0 0 4px ${statusCfg.color}40`,
                    }}
                  />
                  <span className="text-[9px] tracking-[0.14em] uppercase text-[#3a3a42] flex-shrink-0">
                    {statusCfg.label}
                  </span>
                </div>
              </div>

              {/* Muted metadata — location + date */}
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {job.location && (
                  <span className="text-[10px] text-[#3a3a42] truncate max-w-[100px]">
                    {job.location}
                  </span>
                )}
                {dateLabel && (
                  <span className="text-[10px] text-[#2a2a32] tabular-nums">
                    {dateLabel}
                  </span>
                )}
              </div>

              {/* Quick-action icons — glass hover reveal */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
                <span
                  className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                  title="Anzeige öffnen"
                >
                  <ExternalLink size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                </span>
                <span
                  className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                  title="Anschreiben"
                >
                  <FileText size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                </span>
                <span
                  className="grid place-items-center w-7 h-7 rounded-lg transition-colors hover:bg-white/[0.04]"
                  title="Analysieren"
                >
                  <Sparkles size={13} className="text-[#3a3a42] group-hover:text-[#505058]" />
                </span>
              </div>

              {/* Thin neon match ring — visual highlight */}
              <NeonMatchRing score={score} />

              {/* Chevron */}
              <ChevronRight
                size={14}
                className="text-[#1a1a22] transition-colors group-hover:text-[#3a3a42] flex-shrink-0"
              />
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
