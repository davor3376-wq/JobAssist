import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp, Target, Award, ArrowRight, Activity,
  AlertTriangle, Upload, Search, CheckCircle, Bookmark,
  MessageSquare, XCircle, Bot, Zap, Star, Clock,
  Sparkles, FileText, ChevronRight, BarChart2, Users,
} from "lucide-react";
import { jobApi } from "../services/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const NEON = {
  green:  { stroke: "#00D4A0", glow: "drop-shadow(0 0 7px rgba(0,212,160,0.85))",  track: "#d1faf0", text: "#00D4A0" },
  yellow: { stroke: "#F5C400", glow: "drop-shadow(0 0 7px rgba(245,196,0,0.85))",  track: "#fef9c3", text: "#d4a500" },
  orange: { stroke: "#FF6B35", glow: "drop-shadow(0 0 7px rgba(255,107,53,0.85))", track: "#ffe8df", text: "#FF6B35" },
  gray:   { stroke: "#94a3b8", glow: "none",                                         track: "#e2e8f0", text: "#94a3b8" },
};

function getNeon(score) {
  if (score == null) return NEON.gray;
  if (score >= 60) return NEON.green;
  if (score >= 40) return NEON.yellow;
  return NEON.orange;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function loadStored(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
}

// ─── Company Logo ─────────────────────────────────────────────────────────────

const JOB_BOARDS = new Set([
  "linkedin.com","indeed.com","karriere.at","stepstone.at","stepstone.de",
  "xing.com","glassdoor.com","willhaben.at","monster.at","ams.at",
  "hokify.at","jobswipe.at","jobs.at","herojobs.at","kununu.com",
]);
const GRADIENTS = [
  "from-violet-500 to-indigo-500","from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500","from-pink-400 to-rose-500",
  "from-cyan-400 to-blue-500","from-purple-400 to-fuchsia-500",
];

function CompanyLogo({ company, url, researchData, size = 36 }) {
  const [imgStatus, setImgStatus] = useState("idle");
  const initials = (company || "?").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const domain = (() => {
    if (researchData) {
      try {
        const d = typeof researchData === "string" ? JSON.parse(researchData) : researchData;
        const w = d?.contact_info?.website || d?.website;
        if (w) return new URL(w.startsWith("http") ? w : `https://${w}`).hostname.replace(/^www\./, "");
      } catch {}
    }
    if (url) {
      try {
        const h = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
        const root = h.split(".").slice(-2).join(".");
        if (!JOB_BOARDS.has(root)) return h;
      } catch {}
    }
    if (company) {
      const clean = company.replace(/\s+(gmbh|ag|kg|og|se|inc|ltd)\.?\s*$/i, "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (clean.length >= 2) return `${clean}.at`;
    }
    return null;
  })();

  const grad = GRADIENTS[(company || "?").charCodeAt(0) % GRADIENTS.length];
  const showInitials = !domain || imgStatus === "fallback";
  const s = size;

  return (
    <div className="relative flex-shrink-0" style={{ width: s, height: s }}>
      <div className={`absolute inset-0 flex items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-[10px] font-bold text-white transition-opacity ${showInitials ? "opacity-100" : "opacity-0"}`}>
        {initials}
      </div>
      {domain && imgStatus !== "fallback" && (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={company || ""}
          onLoad={() => setImgStatus("ok")}
          onError={() => setImgStatus("fallback")}
          className={`absolute inset-0 h-full w-full rounded-xl object-contain bg-white border border-slate-100 p-1 transition-opacity ${imgStatus === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}

// ─── Neon Ring ────────────────────────────────────────────────────────────────

function NeonRing({ score, size = 44 }) {
  const r = size / 2 - 4;
  const circ = 2 * Math.PI * r;
  const n = getNeon(score);
  const cx = size / 2;
  return (
    <div className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={n.track} strokeWidth="3.5" />
        {score != null && (
          <circle
            cx={cx} cy={cx} r={r} fill="none"
            stroke={n.stroke} strokeWidth="3.5"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)}
            strokeLinecap="round"
            style={{ filter: n.glow, transition: "stroke-dashoffset 0.6s ease" }}
          />
        )}
      </svg>
      <span className="absolute text-[9px] font-extrabold tabular-nums" style={{ color: n.text }}>
        {score != null ? `${Math.round(score)}` : "—"}
      </span>
    </div>
  );
}

// ─── Mini Activity Bars ───────────────────────────────────────────────────────

function ActivityBars({ values }) {
  const max = Math.max(...values, 1);
  const todayIdx = values.length - 1;
  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => {
        const isToday = i === todayIdx;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex items-end" style={{ height: 48 }}>
              <div className="absolute inset-x-0 bottom-0 h-full rounded-sm bg-slate-100" />
              <div
                className="relative w-full rounded-sm transition-all duration-500"
                style={{
                  height: v > 0 ? `${Math.max(12, (v / max) * 100)}%` : "12%",
                  background: isToday
                    ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                    : v > 0 ? "#e0e7ff" : "#e2e8f0",
                  boxShadow: isToday ? "0 0 8px rgba(124,58,237,0.5)" : "none",
                }}
              />
            </div>
            <span className={`text-[8px] font-semibold ${isToday ? "text-violet-600" : "text-slate-300"}`}>
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Bento Market Compatibility Card ─────────────────────────────────────────

function MarketCompatibilityCard({ jobs, avgScore, activitySeries, scoredJobs }) {
  const total = jobs?.length ?? 0;
  const applied = (jobs || []).filter(j => ["applied", "interviewing", "offered"].includes(j.status)).length;
  const interviews = (jobs || []).filter(j => j.status === "interviewing").length;
  const responseRate = total > 0 ? Math.round((applied / total) * 100) : 0;
  const todayCount = activitySeries[activitySeries.length - 1] ?? 0;
  const n = getNeon(avgScore);

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-card">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">Market Compatibility</h2>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-none">KI-gestützter Überblick deiner Bewerbungschancen</p>
          </div>
        </div>
        {avgScore != null && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ backgroundColor: `${n.stroke}18`, borderColor: `${n.stroke}40`, color: n.text }}>
            {avgScore >= 60 ? "Stark" : avgScore >= 40 ? "Mittel" : "Ausbaubar"}
          </span>
        )}
      </div>

      {/* Bento Grid — desktop */}
      <div className="hidden sm:grid gap-px bg-slate-100/70" style={{ gridTemplateColumns: "148px 1fr 1fr 160px", gridTemplateRows: "auto auto" }}>

        {/* Cell: Big score ring — row span 2 */}
        <div className="bg-white flex flex-col items-center justify-center gap-3 px-4 py-6" style={{ gridRow: "1 / 3" }}>
          <div className="relative flex items-center justify-center" style={{ width: 100, height: 100 }}>
            <svg width="100" height="100" className="-rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke={n.track} strokeWidth="8" />
              {avgScore != null && (
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={n.stroke} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 40}
                  strokeDashoffset={2 * Math.PI * 40 * (1 - avgScore / 100)}
                  style={{ filter: n.glow, transition: "stroke-dashoffset 0.8s ease" }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-extrabold tabular-nums leading-none" style={{ color: avgScore != null ? n.text : "#94a3b8" }}>
                {avgScore != null ? `${avgScore}%` : "—"}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Match Ø</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-slate-500 leading-snug">
              {scoredJobs.length > 0 ? `Aus ${scoredJobs.length} analysierten Stellen` : "Noch keine Analyse"}
            </p>
          </div>
        </div>

        {/* Cell: Applied */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Beworben</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{applied}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">von {total} Stellen</p>
        </div>

        {/* Cell: Match Avg bar */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Match Ø</p>
          <p className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: avgScore != null ? n.text : "#94a3b8" }}>
            {avgScore != null ? `${avgScore}%` : "—"}
          </p>
          {avgScore != null && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: n.track }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${avgScore}%`, backgroundColor: n.stroke }} />
            </div>
          )}
        </div>

        {/* Cell: Activity chart — row span 2 */}
        <div className="bg-white px-4 py-4 flex flex-col" style={{ gridRow: "1 / 3" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">7-Tage-Aktivität</p>
            {todayCount > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100">
                +{todayCount} heute
              </span>
            )}
          </div>
          <div className="flex-1 flex items-end">
            <ActivityBars values={activitySeries} />
          </div>
          <div className="mt-2 pt-2 border-t border-slate-50">
            <p className="text-[9px] text-slate-400">
              {activitySeries.reduce((s, v) => s + v, 0)} Jobs analysiert diese Woche
            </p>
          </div>
        </div>

        {/* Cell: Interviews */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Interviews</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{interviews}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">aktive Gespräche</p>
        </div>

        {/* Cell: Response Rate */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Response Rate</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{responseRate}%</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Bewerbungen aktiv</p>
        </div>

      </div>

      {/* Mobile fallback: simple flex row */}
      <div className="sm:hidden grid grid-cols-2 gap-px bg-slate-100/70">
        {[
          { label: "Beworben", value: applied },
          { label: "Match Ø", value: avgScore != null ? `${avgScore}%` : "—" },
          { label: "Interviews", value: interviews },
          { label: "Response", value: `${responseRate}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  bookmarked:   { label: "Gespeichert",  cls: "bg-slate-100 text-slate-600 border-slate-200" },
  applied:      { label: "Beworben",     cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  interviewing: { label: "Gespräch",     cls: "bg-violet-50 text-violet-700 border-violet-200" },
  offered:      { label: "Angebot",      cls: "bg-amber-50 text-amber-700 border-amber-200" },
  rejected:     { label: "Abgelehnt",    cls: "bg-red-50 text-red-600 border-red-200" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.bookmarked;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Recent Jobs Table ────────────────────────────────────────────────────────

function RecentJobsTable({ jobs }) {
  if (!jobs?.length) return null;
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-sm font-bold text-slate-900">Letzte Stellen</h2>
        </div>
        <Link to="/jobs" className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          Alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Table header */}
      <div className="hidden sm:grid px-5 py-2 border-b border-slate-50" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
        {["Stelle", "Status", "Match Stärke", ""].map(h => (
          <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{h}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-50">
        {jobs.map(job => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="grid items-center px-5 py-3 hover:bg-slate-50/70 transition-colors group"
            style={{ gridTemplateColumns: "1fr auto auto auto" }}
          >
            {/* Company + Role */}
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo company={job.company} url={job.url} researchData={job.research_data} size={34} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate leading-snug group-hover:text-violet-700 transition-colors">
                  {job.role || "Ohne Titel"}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{job.company || "Unbekannt"}</p>
              </div>
            </div>

            {/* Status */}
            <div className="px-3 hidden sm:block">
              <StatusBadge status={job.status} />
            </div>

            {/* Neon Ring */}
            <div className="px-3 flex items-center gap-2">
              <NeonRing score={job.match_score} size={40} />
              {job.match_score != null && (
                <div className="hidden md:block">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: getNeon(job.match_score).text }}>
                    {job.match_score >= 60 ? "Stark" : job.match_score >= 40 ? "Mittel" : "Niedrig"}
                  </p>
                  <div className="mt-0.5 w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: getNeon(job.match_score).track }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${job.match_score}%`, backgroundColor: getNeon(job.match_score).stroke }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── AI Proactive Sidebar ─────────────────────────────────────────────────────

const SUGGESTION_STYLES = {
  action:   { bg: "bg-violet-50",  border: "border-violet-100", iconBg: "bg-violet-100",  iconColor: "text-violet-600",  ctaCls: "bg-violet-600 text-white hover:bg-violet-700" },
  insight:  { bg: "bg-blue-50",    border: "border-blue-100",   iconBg: "bg-blue-100",    iconColor: "text-blue-600",    ctaCls: "bg-blue-600 text-white hover:bg-blue-700" },
  alert:    { bg: "bg-red-50",     border: "border-red-100",    iconBg: "bg-red-100",     iconColor: "text-red-600",     ctaCls: "bg-red-600 text-white hover:bg-red-700" },
  tip:      { bg: "bg-emerald-50", border: "border-emerald-100",iconBg: "bg-emerald-100", iconColor: "text-emerald-600", ctaCls: "bg-emerald-600 text-white hover:bg-emerald-700" },
};

const SUGGESTION_ICONS = {
  upload: Upload, zap: Zap, message: MessageSquare, clock: Clock,
  star: Star, sparkles: Sparkles, trending: TrendingUp, file: FileText,
  target: Target, users: Users, award: Award,
};

function SuggestionBubble({ suggestion, index }) {
  const style = SUGGESTION_STYLES[suggestion.type] || SUGGESTION_STYLES.tip;
  const Icon = SUGGESTION_ICONS[suggestion.icon] || Sparkles;
  return (
    <div
      className={`rounded-2xl border p-3.5 ${style.bg} ${style.border} animate-fade-in`}
      style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 leading-snug">{suggestion.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{suggestion.text}</p>
          {suggestion.to && suggestion.cta && (
            <Link
              to={suggestion.to}
              className={`inline-flex items-center gap-1 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${style.ctaCls}`}
            >
              {suggestion.cta} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function AISuggestionsSidebar({ suggestions, userName }) {
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };
  return (
    <div className="space-y-3">
      {/* Header card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0D1117] to-[#1a1f2e] p-4 text-white border border-[#1C2333]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Bot className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white leading-none">KI-Assistent</p>
            <p className="text-[9px] text-slate-400 mt-0.5">Proaktive Empfehlungen</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-semibold">Live</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {greeting()}{userName ? `, ${userName}` : ""}! Hier sind deine personalisierten Tipps für heute.
        </p>
      </div>

      {/* Suggestion bubbles */}
      <div className="space-y-2.5">
        {suggestions.map((s, i) => (
          <SuggestionBubble key={i} suggestion={s} index={i} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-card p-3.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Schnellzugriff</p>
        <div className="space-y-1.5">
          <Link to="/resume" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors group">
            <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-colors">
              <Upload className="w-3 h-3 text-violet-600" />
            </div>
            Lebenslauf hochladen
          </Link>
          <Link to="/jobs" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors group">
            <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
              <Search className="w-3 h-3 text-slate-500" />
            </div>
            Stelle hinzufügen
          </Link>
          <Link to="/ai-assistant" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group">
            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <Sparkles className="w-3 h-3 text-emerald-600" />
            </div>
            KI-Assistent öffnen
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Deadline Banner ──────────────────────────────────────────────────────────

function DeadlineBanner({ job }) {
  if (!job) return null;
  const daysLeft = Math.ceil((new Date(job.deadline).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  const urgent = daysLeft <= 7;
  return (
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? "bg-red-100" : "bg-amber-100"}`}>
        <AlertTriangle className={`w-4 h-4 ${urgent ? "text-red-600" : "text-amber-600"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-900 truncate">{job.role} · {job.company}</p>
        <p className={`text-[11px] ${urgent ? "text-red-600" : "text-amber-700"}`}>
          Frist: {new Date(job.deadline).toLocaleDateString("de-AT")} · <strong>noch {daysLeft > 0 ? `${daysLeft} Tag${daysLeft !== 1 ? "e" : ""}` : "heute"}</strong>
        </p>
      </div>
      <Link to={`/jobs/${job.id}`} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-colors ${urgent ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}>
        Details
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => queryClient.getQueryData(["init"]) || loadStored("init"),
    staleTime: 1000 * 60 * 2,
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list().then(r => {
      try { localStorage.setItem("dashboard_jobs", JSON.stringify(r.data)); localStorage.setItem("jobs", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => queryClient.getQueryData(["jobs"]) || loadStored("dashboard_jobs") || loadStored("jobs") || [],
    staleTime: 1000 * 60 * 2,
  });

  const resumes    = initData?.resumes || loadStored("resumes") || [];
  const recentJobs = (jobs || []).slice(0, 6);
  const scoredJobs = (jobs || []).filter(j => j.match_score != null);
  const avgScore   = scoredJobs.length ? Math.round(scoredJobs.reduce((s, j) => s + j.match_score, 0) / scoredJobs.length) : null;
  const userName   = initData?.me?.full_name || initData?.me?.email?.split("@")[0] || "";

  const activitySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d;
    });
    return days.map((day, i) =>
      (jobs || []).filter(job => {
        if (job.match_score == null) return false;
        const stamp = job.updated_at || job.created_at;
        if (!stamp) return i >= 5;
        const p = new Date(stamp);
        return p >= day && p < new Date(day.getTime() + 86400000);
      }).length
    );
  }, [jobs]);

  const nextDeadline = useMemo(() => {
    return [...(jobs || [])].filter(j => j.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null;
  }, [jobs]);

  const aiSuggestions = useMemo(() => {
    const list = [];
    const applied     = (jobs || []).filter(j => ["applied", "interviewing", "offered"].includes(j.status));
    const unanalyzed  = (jobs || []).filter(j => j.match_score == null);
    const interviewing = (jobs || []).filter(j => j.status === "interviewing");
    const noIntPrep   = interviewing.filter(j => !j.interview_qa);

    if (resumes.length === 0) {
      list.push({ type: "action", icon: "upload", title: "Lebenslauf fehlt", text: "Lade deinen Lebenslauf hoch, um KI-Analysen und Match-Scores zu aktivieren.", to: "/resume", cta: "Hochladen" });
    }
    if (unanalyzed.length > 0) {
      list.push({ type: "insight", icon: "zap", title: `${unanalyzed.length} Stelle${unanalyzed.length > 1 ? "n" : ""} unanalysiert`, text: "Starte den Qualifikations-Check, um deine Chancen realistisch einzuschätzen.", to: "/jobs", cta: "Jetzt analysieren" });
    }
    if (noIntPrep.length > 0) {
      const first = noIntPrep[0];
      list.push({ type: "action", icon: "message", title: "Gesprächsvorbereitung fehlt", text: `Bereite dich auf das Interview bei ${first.company || "deinem nächsten Arbeitgeber"} vor.`, to: `/jobs/${first.id}?tab=interview`, cta: "Vorbereiten" });
    }
    if (nextDeadline) {
      const d = Math.ceil((new Date(nextDeadline.deadline) - new Date()) / 86400000);
      if (d <= 14) list.push({ type: "alert", icon: "clock", title: `Frist in ${d} Tag${d !== 1 ? "en" : ""}`, text: `${nextDeadline.role || "Stelle"} bei ${nextDeadline.company || "Unternehmen"} — handle jetzt!`, to: `/jobs/${nextDeadline.id}`, cta: "Öffnen" });
    }
    if (applied.length === 0 && (jobs?.length ?? 0) > 2) {
      list.push({ type: "tip", icon: "star", title: "Tipp: Bewirb dich aktiv!", text: "Du hast gespeicherte Stellen, aber noch keine Bewerbung. Jetzt ist der richtige Moment.", to: "/jobs", cta: "Stellen öffnen" });
    }
    if (avgScore != null && avgScore < 55 && scoredJobs.length > 0) {
      list.push({ type: "tip", icon: "trending", title: "Match-Score verbessern", text: "Dein Ø-Score ist optimierbar. Passe deinen Lebenslauf an die Stellenanforderungen an.", to: "/resume", cta: "Lebenslauf anpassen" });
    }
    if (list.length === 0) {
      list.push({ type: "tip", icon: "award", title: "Starke Performance!", text: "Du bist auf einem sehr guten Weg. Halte den Schwung aufrecht und entdecke neue Stellen.", to: "/jobs", cta: "Neue Stellen" });
    }
    return list.slice(0, 4);
  }, [jobs, resumes, avgScore, nextDeadline, scoredJobs]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
            {greeting()}{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {new Date().toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {jobs?.length > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-card">
              {jobs.length} Stellen verfolgt
            </span>
          )}
          {avgScore != null && (
            <span className="text-xs font-semibold text-white rounded-xl px-3 py-1.5" style={{ backgroundColor: getNeon(avgScore).stroke, boxShadow: `0 0 12px ${getNeon(avgScore).stroke}60` }}>
              Match Ø {avgScore}%
            </span>
          )}
        </div>
      </div>

      {/* ── Deadline alert ─────────────────────────────────────────────────── */}
      {nextDeadline && <DeadlineBanner job={nextDeadline} />}

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-5">

        {/* ── Main column ──────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Market Compatibility bento */}
          <MarketCompatibilityCard
            jobs={jobs}
            avgScore={avgScore}
            activitySeries={activitySeries}
            scoredJobs={scoredJobs}
          />

          {/* Recent Jobs table */}
          <RecentJobsTable jobs={recentJobs} />

          {/* Empty state */}
          {(!jobs || jobs.length === 0) && (
            <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Noch keine Stellen gespeichert</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">Füge deine erste Stelle hinzu und nutze die KI-gestützte Analyse.</p>
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: "#7C3AED" }}
              >
                <Search className="w-4 h-4" /> Erste Stelle hinzufügen
              </Link>
            </div>
          )}
        </div>

        {/* ── AI Sidebar ───────────────────────────────────────────────────── */}
        <div>
          <AISuggestionsSidebar suggestions={aiSuggestions} userName={userName} />
        </div>
      </div>
    </div>
  );
}
