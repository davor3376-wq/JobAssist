import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink, FileText, Sparkles, RefreshCw } from "lucide-react";

const STATUS_CFG = {
  bookmarked:   { label: "Gespeichert",  color: "#94a3b8" },
  applied:      { label: "Beworben",     color: "#10b981" },
  interviewing: { label: "Gespräch",     color: "#3b82f6" },
  offered:      { label: "Angebot",      color: "#fbbf24" },
  rejected:     { label: "Abgelehnt",    color: "#ef4444" },
};

const FILTER_TABS = [
  { key: "all",        label: "Alle" },
  { key: "bookmarked", label: "Gespeichert" },
  { key: "applied",    label: "Beworben" },
];

const PULL_THRESHOLD = 60;
const PAGE_SIZE = 12;

function LogoField({ company, status, url }) {
  const [imgError, setImgError] = useState(false);
  const initial = (company || "?").charAt(0).toUpperCase();
  const cfg = STATUS_CFG[status] || STATUS_CFG.bookmarked;

  const logoSrc = (() => {
    if (imgError) return null;
    let domain = null;
    if (url) {
      try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}
    }
    if (!domain && company) {
      domain = company.toLowerCase().replace(/\s+(gmbh|ag|inc|ltd|llc|corp|se|kg|kg|mbh|co\.?)$/i, "").replace(/[^a-z0-9]/g, "") + ".com";
    }
    return domain ? `https://logo.clearbit.com/${domain}?size=512` : null;
  })();

  return (
    <div
      className="flex-shrink-0 w-10 h-10 rounded-[10px] flex items-center justify-center overflow-hidden"
      style={{
        background: imgError || !logoSrc ? `${cfg.color}12` : "rgba(255,255,255,0.04)",
        boxShadow: `inset 0 0 0 1px ${imgError || !logoSrc ? `${cfg.color}18` : "rgba(255,255,255,0.06)"}`,
      }}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={company || ""}
          className="w-7 h-7 object-contain"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[0.875rem] font-semibold" style={{ color: cfg.color }}>
          {initial}
        </span>
      )}
    </div>
  );
}

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
        className="absolute inset-0 flex items-center justify-center text-[0.5625rem] font-semibold tabular-nums"
        style={{ color }}
      >
        {normalized != null ? normalized : "—"}
      </span>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  return `Vor ${days}T`;
}

function SkeletonRow({ style }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 animate-pulse" style={style}>
      <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-white/[0.05]" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3 bg-white/[0.07] rounded-md w-3/5" />
        <div className="h-2.5 bg-white/[0.04] rounded-md w-2/5" />
      </div>
      <div className="w-9 h-9 rounded-full bg-white/[0.04] flex-shrink-0" />
      <div className="w-3.5 h-3.5 bg-white/[0.03] rounded flex-shrink-0" />
    </div>
  );
}

/**
 * Premium "Gespeicherte Stellen" section — row-based transaction list.
 *
 * @param {object} props
 * @param {Array}   props.jobs      - Array of saved job objects
 * @param {boolean} [props.loading] - Show skeleton rows while fetching
 * @param {Function} [props.onRefresh] - Async callback for pull-to-refresh
 * @param {string}  [props.className]
 */
export default function SavedJobsSection({ jobs = [], loading = false, onRefresh, className = "" }) {
  const [activeTab, setActiveTab]   = useState("all");
  const [sortBy, setSortBy]         = useState("score");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pullDist, setPullDist]     = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sentinelRef  = useRef(null);
  const touchStartY  = useRef(0);
  const sectionRef   = useRef(null);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeTab, sortBy]);

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
  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  /* --- Tab counts --- */
  const counts = {
    all:       jobs.length,
    bookmarked: jobs.filter((j) => !j.status || j.status === "bookmarked").length,
    applied:   jobs.filter((j) =>
      ["applied", "interviewing", "offered"].includes(j.status)
    ).length,
  };

  // IntersectionObserver — auto-load next page when sentinel scrolls into view
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((c) => c + PAGE_SIZE);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount]); // sentinel position changes with visibleCount

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (window.scrollY > 5 || !onRefresh) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDist(Math.min(delta * 0.4, PULL_THRESHOLD));
    }
  }, [onRefresh]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDist >= PULL_THRESHOLD - 5 && onRefresh) {
      setIsRefreshing(true);
      try { await onRefresh(); } finally { setIsRefreshing(false); }
    }
    setPullDist(0);
  }, [pullDist, onRefresh]);

  // ── Empty / initial state ───────────────────────────────────────────────
  if (!jobs.length && !loading) {
    return (
      <section className={`col-span-12 ${className}`}>
        <div className="flex items-end justify-between mb-6">
          <div>
            <span className="block text-[0.625rem] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Kuratierte Auswahl
            </span>
            <h2 className="mt-1 text-[1.375rem] sm:text-[1.625rem] font-semibold text-white tracking-tight leading-none">
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
          <p className="text-[0.8125rem] font-medium text-[#505058]">Noch keine Stellen gespeichert</p>
          <p className="text-[0.625rem] text-[#3a3a42] mt-1">
            Suche unten nach Jobs und speichere deine Favoriten
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className={`col-span-12 ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Pull-to-refresh indicator ── */}
      {(pullDist > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-150"
          style={{ height: isRefreshing ? 40 : pullDist }}
        >
          <RefreshCw
            size={16}
            className={`text-[#505058] transition-transform ${isRefreshing ? "animate-spin" : ""}`}
            style={{ transform: isRefreshing ? undefined : `rotate(${(pullDist / PULL_THRESHOLD) * 180}deg)` }}
          />
        </div>
      )}

      {/* ── Sticky section header + filter bar ── */}
      <div
        className="sticky top-0 z-10 pb-4"
        style={{
          background: "rgba(0,0,0,0.92)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="flex items-end justify-between pt-4 mb-4">
          <div>
            <span className="block text-[0.625rem] font-medium tracking-[0.18em] uppercase text-[#505058]">
              Kuratierte Auswahl
            </span>
            <h2 className="mt-1 text-[1.375rem] sm:text-[1.625rem] font-semibold text-white tracking-tight leading-none">
              Gespeicherte Stellen
            </h2>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[0.625rem] tracking-[0.14em] uppercase px-3 py-1.5 rounded-lg bg-transparent text-[#505058] focus:outline-none appearance-none cursor-pointer"
          >
            <option value="score">Match ↓</option>
            <option value="date">Datum</option>
            <option value="status">Status</option>
          </select>
        </div>

        {/* Filter tabs */}
        <div
          className="inline-flex gap-1 p-1 rounded-xl"
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
                className="relative px-4 py-2 rounded-lg transition-all duration-200 min-h-[44px]"
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
                  className={`text-[0.625rem] font-medium tracking-[0.14em] uppercase transition-colors ${
                    isActive ? "text-white" : "text-[#3a3a42] hover:text-[#606068]"
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`ml-1.5 text-[0.625rem] tabular-nums ${
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
      </div>

      {/* ── Row-based list ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #080808 0%, #030303 100%)",
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
        }}
      >
        {/* Initial skeleton while loading with no data */}
        {loading && !visible.length
          ? Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow
                key={i}
                style={i > 0 ? { borderTop: "1px solid rgba(255,255,255,0.04)" } : undefined}
              />
            ))
          : visible.map((job, i) => {
              const score      = job.match_score != null ? Math.round(job.match_score) : null;
              const dateLabel  = timeAgo(job.updated_at || job.created_at);
              const statusCfg  = STATUS_CFG[job.status] || STATUS_CFG.bookmarked;

              return (
                <Link
                  key={job.id}
                  to={`/jobs/${job.id}`}
                  className="group flex items-start gap-3 px-5 py-3.5 transition-all duration-200 hover:bg-white/[0.02] active:bg-white/[0.04]"
                  style={
                    i > 0
                      ? {
                          borderTop: "1px solid transparent",
                          borderImage:
                            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 20%, rgba(255,255,255,0.04) 80%, transparent 100%) 1",
                        }
                      : {}
                  }
                >
                  {/* Logo */}
                  <div className="flex-shrink-0 mt-0.5">
                    <LogoField company={job.company} status={job.status || "bookmarked"} url={job.url} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.8125rem] font-medium text-white truncate leading-tight">
                      {job.role}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[0.6875rem] text-[#505058] truncate">
                        {job.company}
                      </span>
                      <span
                        className="flex-shrink-0 h-1 w-1 rounded-full"
                        style={{
                          background: statusCfg.color,
                          boxShadow: `0 0 4px ${statusCfg.color}40`,
                        }}
                      />
                      <span className="text-[0.5625rem] tracking-[0.14em] uppercase text-[#3a3a42] flex-shrink-0">
                        {statusCfg.label}
                      </span>
                      {job.location && (
                        <span className="text-[0.625rem] text-[#3a3a42] truncate max-w-[100px]">
                          {job.location}
                        </span>
                      )}
                      {dateLabel && (
                        <span className="text-[0.625rem] text-[#2a2a32] tabular-nums">
                          {dateLabel}
                        </span>
                      )}
                    </div>

                    {/* Score ring — mobile only, below company row */}
                    <div className="mt-2 sm:hidden">
                      <NeonMatchRing score={score} />
                    </div>

                    {/* Quick actions — desktop hover only */}
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
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
                  </div>

                  {/* Right side: score ring (desktop) + chevron */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-center">
                    <div className="hidden sm:block">
                      <NeonMatchRing score={score} />
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-[#1a1a22] transition-colors group-hover:text-[#3a3a42]"
                    />
                  </div>
                </Link>
              );
            })}

        {/* Trailing skeletons while fetching more */}
        {loading && visible.length > 0 && (
          <>
            <SkeletonRow style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }} />
            <SkeletonRow style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }} />
          </>
        )}
      </div>

      {/* Infinite scroll sentinel — triggers next page load */}
      {hasMore && <div ref={sentinelRef} className="h-1" />}
    </section>
  );
}
