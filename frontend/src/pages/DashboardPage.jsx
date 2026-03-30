import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp, Target, Award, ArrowRight, AlertTriangle,
  Upload, Search, CheckCircle, Bookmark, MessageSquare,
  Bot, Zap, Star, Clock, Sparkles, FileText,
  ChevronRight, BarChart2, Wand2,
} from "lucide-react";
import { jobApi } from "../services/api";

// ─── Design tokens ─────────────────────────────────────────────────────────────

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const NEON = {
  green:  { stroke: "#10b981", glow: "drop-shadow(0 0 8px rgba(16,185,129,0.8))",  track: "#d1fae5", text: "#059669" },
  yellow: { stroke: "#f59e0b", glow: "drop-shadow(0 0 8px rgba(245,158,11,0.8))",  track: "#fef3c7", text: "#d97706" },
  orange: { stroke: "#ef4444", glow: "drop-shadow(0 0 8px rgba(239,68,68,0.8))",   track: "#fee2e2", text: "#dc2626" },
  gray:   { stroke: "#cbd5e1", glow: "none",                                         track: "#f1f5f9", text: "#94a3b8" },
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
const LOGO_GRADIENTS = [
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

  const grad = LOGO_GRADIENTS[(company || "?").charCodeAt(0) % LOGO_GRADIENTS.length];
  const showInitials = !domain || imgStatus === "fallback";

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
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
          <circle cx={cx} cy={cx} r={r} fill="none"
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

// ─── Activity Bars (Violet → Emerald gradient = "growth") ────────────────────

function ActivityBars({ values }) {
  const max = Math.max(...values, 1);
  const todayIdx = values.length - 1;

  return (
    <div className="flex items-end gap-1 h-16">
      {values.map((v, i) => {
        const isToday = i === todayIdx;
        const intensity = v / max;
        // Bars progress from violet (older) toward emerald (today)
        const barGradient = isToday
          ? "linear-gradient(to top, #059669, #10b981)"
          : v > 0
            ? "linear-gradient(to top, #6d28d9, #8b5cf6)"
            : "transparent";
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative flex items-end" style={{ height: 48 }}>
              <div className="absolute inset-x-0 bottom-0 h-full rounded-md bg-slate-100/80" />
              <div
                className="relative w-full rounded-md transition-all duration-700"
                style={{
                  height: v > 0 ? `${Math.max(10, intensity * 100)}%` : "10%",
                  background: barGradient,
                  boxShadow: isToday && v > 0
                    ? "0 0 10px rgba(16,185,129,0.45)"
                    : v > 0
                      ? "0 0 6px rgba(124,58,237,0.25)"
                      : "none",
                  opacity: v === 0 ? 0.3 : 1,
                }}
              />
            </div>
            <span className={`text-[8px] font-bold ${isToday ? "text-emerald-600" : "text-slate-300"}`}>
              {DAY_LABELS[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Markt-Kompatibilität (bento card) ───────────────────────────────────────

function MarketCard({ jobs, avgScore, activitySeries, scoredJobs }) {
  const total     = jobs?.length ?? 0;
  const applied   = (jobs || []).filter(j => ["applied","interviewing","offered"].includes(j.status)).length;
  const interviews = (jobs || []).filter(j => j.status === "interviewing").length;
  const rückläufer = total > 0 ? Math.round((applied / total) * 100) : 0;
  const todayCount = activitySeries[activitySeries.length - 1] ?? 0;
  const n = getNeon(avgScore);

  // Large frosted-glass score ring
  const ringSize = 112;
  const ringR = 44;
  const ringCirc = 2 * Math.PI * ringR;

  return (
    <div className="rounded-2xl overflow-hidden bg-white border border-slate-100/80 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-violet-200">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">Markt-Kompatibilität</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">KI-gestützte Übersicht deiner Bewerbungsstärke</p>
          </div>
        </div>
        {avgScore != null && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: `${n.stroke}18`, borderColor: `${n.stroke}40`, color: n.text }}>
            {avgScore >= 60 ? "Auf Erfolgskurs" : avgScore >= 40 ? "Ausbaufähig" : "Optimierungsbedarf"}
          </span>
        )}
      </div>

      {/* Bento grid — desktop */}
      <div className="hidden sm:grid gap-px bg-slate-100/50" style={{ gridTemplateColumns: "156px 1fr 1fr 168px", gridTemplateRows: "auto auto" }}>

        {/* Score ring — frosted glass, row-span 2 */}
        <div className="bg-white/80 flex flex-col items-center justify-center gap-3 px-4 py-6 backdrop-blur-sm" style={{ gridRow: "1 / 3" }}>
          {/* Frosted glass ring card */}
          <div className="relative flex items-center justify-center rounded-2xl"
            style={{
              width: ringSize, height: ringSize,
              background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(238,242,255,0.8) 100%)",
              boxShadow: avgScore != null
                ? `0 0 0 1px rgba(255,255,255,0.8), 0 4px 20px ${n.stroke}28, inset 0 1px 0 rgba(255,255,255,0.9)`
                : "0 0 0 1px rgba(255,255,255,0.8), 0 4px 16px rgba(0,0,0,0.06)",
              backdropFilter: "blur(8px)",
            }}>
            <svg width={ringSize} height={ringSize} className="-rotate-90">
              <circle cx={ringSize/2} cy={ringSize/2} r={ringR} fill="none" stroke={n.track} strokeWidth="8" />
              {avgScore != null && (
                <circle
                  cx={ringSize/2} cy={ringSize/2} r={ringR} fill="none"
                  stroke={n.stroke} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={ringCirc}
                  strokeDashoffset={ringCirc * (1 - avgScore / 100)}
                  style={{ filter: n.glow, transition: "stroke-dashoffset 0.9s ease" }}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-extrabold tabular-nums leading-none" style={{ color: avgScore != null ? n.text : "#94a3b8" }}>
                {avgScore != null ? `${avgScore}%` : "—"}
              </span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Matching-Quote</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-400 text-center leading-snug">
            {scoredJobs.length > 0 ? `Ø aus ${scoredJobs.length} analysierten Stellen` : "Noch keine Analyse"}
          </p>
        </div>

        {/* Beworben */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Beworben</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{applied}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">von {total} Stellen</p>
        </div>

        {/* Matching-Quote bar */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Matching-Quote</p>
          <p className="text-3xl font-extrabold tabular-nums leading-none" style={{ color: avgScore != null ? n.text : "#94a3b8" }}>
            {avgScore != null ? `${avgScore}%` : "—"}
          </p>
          {avgScore != null && (
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: n.track }}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${avgScore}%`, background: `linear-gradient(to right, #7c3aed, ${n.stroke})` }} />
            </div>
          )}
        </div>

        {/* Activity chart — row-span 2 */}
        <div className="bg-white px-4 py-4 flex flex-col" style={{ gridRow: "1 / 3" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Aktivitätsverlauf</p>
            {todayCount > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                +{todayCount} heute
              </span>
            )}
          </div>
          <div className="flex-1 flex items-end">
            <ActivityBars values={activitySeries} />
          </div>
          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <p className="text-[9px] text-slate-400">
              {activitySeries.reduce((s, v) => s + v, 0)} Analysen diese Woche
            </p>
          </div>
        </div>

        {/* Interviews */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Interviews</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{interviews}</p>
          <p className="text-[10px] text-slate-400 mt-1.5">aktive Gespräche</p>
        </div>

        {/* Rücklaufquote */}
        <div className="bg-white px-5 py-4 flex flex-col justify-center">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Rücklaufquote</p>
          <p className="text-3xl font-extrabold text-slate-900 leading-none tabular-nums">{rückläufer}%</p>
          <p className="text-[10px] text-slate-400 mt-1.5">Bewerbungen aktiv</p>
        </div>
      </div>

      {/* Mobile fallback */}
      <div className="sm:hidden grid grid-cols-2 gap-px bg-slate-100/50">
        {[
          { label: "Beworben", value: applied },
          { label: "Matching-Quote", value: avgScore != null ? `${avgScore}%` : "—" },
          { label: "Interviews", value: interviews },
          { label: "Rücklaufquote", value: `${rückläufer}%` },
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

// ─── Aktivitäten table ────────────────────────────────────────────────────────

function RecentJobsTable({ jobs }) {
  if (!jobs?.length) return null;
  return (
    <div className="rounded-2xl bg-white border border-slate-100/80 shadow-[0_2px_16px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
            <Bookmark className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-none">Deine Aktivitäten</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Zuletzt gespeicherte Stellen</p>
          </div>
        </div>
        <Link to="/jobs" className="flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          Alle <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Column headers */}
      <div className="hidden sm:grid px-5 py-2 border-b border-slate-50" style={{ gridTemplateColumns: "1fr auto auto auto" }}>
        {["Stelle", "Status", "Matching-Quote", ""].map(h => (
          <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{h}</span>
        ))}
      </div>

      <div className="divide-y divide-slate-50">
        {jobs.map(job => (
          <Link
            key={job.id}
            to={`/jobs/${job.id}`}
            className="grid items-center px-5 py-3 hover:bg-slate-50/60 transition-colors group"
            style={{ gridTemplateColumns: "1fr auto auto auto" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo company={job.company} url={job.url} researchData={job.research_data} size={34} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate leading-snug group-hover:text-violet-700 transition-colors">
                  {job.role || "Ohne Titel"}
                </p>
                <p className="text-[11px] text-slate-400 truncate">{job.company || "Unbekannt"}</p>
              </div>
            </div>
            <div className="px-3 hidden sm:block">
              <StatusBadge status={job.status} />
            </div>
            <div className="px-3 flex items-center gap-2">
              <NeonRing score={job.match_score} size={40} />
              {job.match_score != null && (
                <div className="hidden md:block">
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: getNeon(job.match_score).text }}>
                    {job.match_score >= 60 ? "Stark" : job.match_score >= 40 ? "Mittel" : "Niedrig"}
                  </p>
                  <div className="mt-0.5 w-14 h-1 rounded-full overflow-hidden" style={{ backgroundColor: getNeon(job.match_score).track }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${job.match_score}%`, background: `linear-gradient(to right, #7c3aed, ${getNeon(job.match_score).stroke})` }}
                    />
                  </div>
                </div>
              )}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── KI Co-Pilot sidebar ──────────────────────────────────────────────────────

const SUGGESTION_STYLES = {
  action:  { bg: "bg-violet-50",  border: "border-violet-100", iconBg: "bg-violet-100",  iconColor: "text-violet-600",  cta: "bg-violet-600 hover:bg-violet-700 text-white" },
  insight: { bg: "bg-blue-50",    border: "border-blue-100",   iconBg: "bg-blue-100",    iconColor: "text-blue-600",    cta: "bg-blue-600 hover:bg-blue-700 text-white" },
  alert:   { bg: "bg-red-50",     border: "border-red-100",    iconBg: "bg-red-100",     iconColor: "text-red-600",     cta: "bg-red-600 hover:bg-red-700 text-white" },
  tip:     { bg: "bg-emerald-50", border: "border-emerald-100",iconBg: "bg-emerald-100", iconColor: "text-emerald-600", cta: "bg-emerald-600 hover:bg-emerald-700 text-white" },
};

const SUGGESTION_ICONS = {
  upload: Upload, zap: Zap, message: MessageSquare, clock: Clock,
  star: Star, sparkles: Sparkles, trending: TrendingUp, file: FileText,
  target: Target, award: Award, wand: Wand2,
};

function SuggestionBubble({ s, index }) {
  const style = SUGGESTION_STYLES[s.type] || SUGGESTION_STYLES.tip;
  const Icon = SUGGESTION_ICONS[s.icon] || Sparkles;
  return (
    <div className={`rounded-2xl border p-3.5 ${style.bg} ${style.border} animate-fade-in`}
      style={{ animationDelay: `${index * 70}ms`, animationFillMode: "both" }}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${style.iconBg}`}>
          <Icon className={`w-4 h-4 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 leading-snug">{s.title}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{s.text}</p>
          {s.to && s.cta && (
            <Link to={s.to} className={`inline-flex items-center gap-1 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${style.cta}`}>
              {s.cta} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function AICopilotSidebar({ suggestions, userName, featuredTip }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0D1117] to-[#1a1630] p-4 text-white border border-[#1C2333] shadow-[0_4px_24px_rgba(0,0,0,0.12)]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="text-xs font-extrabold text-white leading-none tracking-tight">KI Co-Pilot</p>
            <p className="text-[9px] text-slate-400 mt-0.5 font-semibold uppercase tracking-widest">Live-Tipps</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-bold">Aktiv</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          {greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}! Dein persönlicher KI-Bewerbungsbegleiter ist bereit.
        </p>
      </div>

      {/* Featured "Co-Pilot" message — highest match job */}
      {featuredTip && (
        <div className="rounded-2xl border border-emerald-500/25 p-3.5"
          style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(5,150,105,0.05) 100%)" }}>
          <div className="flex items-start gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0 mt-1.5" />
            <div className="min-w-0">
              <p className="text-[11px] text-slate-700 leading-relaxed">
                Dein Lebenslauf passt zu{" "}
                <span className="font-extrabold text-emerald-700" style={{ color: "#059669" }}>{featuredTip.score}%</span>{" "}
                auf die Stelle <span className="font-bold text-slate-900">„{featuredTip.role}"</span>
                {featuredTip.company ? ` bei ${featuredTip.company}` : ""}.{" "}
                {!featuredTip.hasCoverLetter && "Soll ich das Anschreiben optimieren?"}
              </p>
              <Link to={`/jobs/${featuredTip.jobId}`}
                className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-700 hover:text-emerald-600 transition-colors">
                {featuredTip.hasCoverLetter ? "Anschreiben ansehen" : "Anschreiben erstellen"} <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion bubbles */}
      <div className="space-y-2.5">
        {suggestions.map((s, i) => <SuggestionBubble key={i} s={s} index={i} />)}
      </div>

      {/* Direkt-Aktionen */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-3">Direkt-Aktionen</p>
        <div className="space-y-1.5">
          {[
            { to: "/resume", icon: FileText, label: "Lebenslauf hochladen", color: "violet" },
            { to: "/jobs",   icon: Search,   label: "Stelle hinzufügen",    color: "slate" },
            { to: "/ai-assistant", icon: Wand2, label: "KI-Assistent öffnen", color: "emerald" },
          ].map(({ to, icon: Icon, label, color }) => {
            const colors = {
              violet:  { hover: "hover:bg-violet-50 hover:text-violet-700",  iconBg: "bg-violet-100",  iconColor: "text-violet-600" },
              slate:   { hover: "hover:bg-slate-50",                          iconBg: "bg-slate-100",   iconColor: "text-slate-500" },
              emerald: { hover: "hover:bg-emerald-50 hover:text-emerald-700", iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
            };
            const c = colors[color];
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors group ${c.hover}`}>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                  <Icon className={`w-3 h-3 ${c.iconColor}`} />
                </div>
                {label}
              </Link>
            );
          })}
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
    <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-sm ${urgent ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${urgent ? "bg-red-100" : "bg-amber-100"}`}>
        <AlertTriangle className={`w-4 h-4 ${urgent ? "text-red-600" : "text-amber-600"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-900 truncate">{job.role} · {job.company}</p>
        <p className={`text-[11px] ${urgent ? "text-red-600" : "text-amber-700"}`}>
          Frist: {new Date(job.deadline).toLocaleDateString("de-AT")} · <strong>noch {daysLeft > 0 ? `${daysLeft} Tag${daysLeft !== 1 ? "e" : ""}` : "heute"}</strong>
        </p>
      </div>
      <Link to={`/jobs/${job.id}`}
        className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white transition-colors shadow-sm ${urgent ? "bg-red-600 hover:bg-red-700" : "bg-amber-500 hover:bg-amber-600"}`}>
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

  const nextDeadline = useMemo(() =>
    [...(jobs || [])].filter(j => j.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null
  , [jobs]);

  // Featured Co-Pilot tip: highest match score job
  const featuredTip = useMemo(() => {
    const top = [...(jobs || [])].filter(j => j.match_score != null).sort((a, b) => b.match_score - a.match_score)[0];
    if (!top || top.match_score < 45) return null;
    return { role: top.role, company: top.company, score: top.match_score, jobId: top.id, hasCoverLetter: !!top.cover_letter };
  }, [jobs]);

  const aiSuggestions = useMemo(() => {
    const list = [];
    const applied      = (jobs || []).filter(j => ["applied","interviewing","offered"].includes(j.status));
    const unanalyzed   = (jobs || []).filter(j => j.match_score == null);
    const interviewing = (jobs || []).filter(j => j.status === "interviewing");
    const noIntPrep    = interviewing.filter(j => !j.interview_qa);

    if (resumes.length === 0)
      list.push({ type: "action", icon: "upload", title: "Lebenslauf fehlt", text: "Lade deinen Lebenslauf hoch, um Matching-Analysen und KI-Optimierungen zu aktivieren.", to: "/resume", cta: "Jetzt hochladen" });
    if (unanalyzed.length > 0)
      list.push({ type: "insight", icon: "zap", title: `${unanalyzed.length} Stelle${unanalyzed.length > 1 ? "n" : ""} noch unanalysiert`, text: "Starte den Qualifikations-Check, um deine Matching-Quote realistisch einzuschätzen.", to: "/jobs", cta: "Analysieren" });
    if (noIntPrep.length > 0) {
      const first = noIntPrep[0];
      list.push({ type: "action", icon: "message", title: "Gesprächsvorbereitung fehlt", text: `Bereite dich auf das Interview bei ${first.company || "deinem nächsten Arbeitgeber"} professionell vor.`, to: `/jobs/${first.id}?tab=interview`, cta: "Vorbereiten" });
    }
    if (nextDeadline) {
      const d = Math.ceil((new Date(nextDeadline.deadline) - new Date()) / 86400000);
      if (d <= 14) list.push({ type: "alert", icon: "clock", title: `Bewerbungsfrist in ${d} Tag${d !== 1 ? "en" : ""}`, text: `${nextDeadline.role || "Stelle"} bei ${nextDeadline.company || "Unternehmen"} — handle jetzt!`, to: `/jobs/${nextDeadline.id}`, cta: "Öffnen" });
    }
    if (applied.length === 0 && (jobs?.length ?? 0) > 2)
      list.push({ type: "tip", icon: "star", title: "Tipp: Bewirb dich aktiv!", text: "Du hast gespeicherte Stellen aber noch keine Bewerbung abgeschickt. Nutze deinen Schwung!", to: "/jobs", cta: "Stellen öffnen" });
    if (avgScore != null && avgScore < 55 && scoredJobs.length > 0)
      list.push({ type: "tip", icon: "wand", title: "Matching-Quote verbessern", text: "Dein Ø-Score ist optimierbar. Passe deinen Lebenslauf gezielt an die Stellenanforderungen an.", to: "/resume", cta: "Lebenslauf optimieren" });
    if (list.length === 0)
      list.push({ type: "tip", icon: "award", title: "Auf Erfolgskurs!", text: "Deine Bewerbungen sind auf einem starken Niveau. Halte den Schwung und entdecke neue Chancen.", to: "/jobs", cta: "Neue Stellen" });
    return list.slice(0, 4);
  }, [jobs, resumes, avgScore, nextDeadline, scoredJobs]);

  const neon = getNeon(avgScore);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  return (
    <div className="space-y-5 animate-slide-up">

      {/* ── Kopfzeile ─────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-none">
            {greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {new Date().toLocaleDateString("de-AT", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {(jobs?.length ?? 0) > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 rounded-xl px-3 py-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.06)]">
              {jobs.length} Stellen verfolgt
            </span>
          )}
          {avgScore != null && (
            <span className="text-xs font-bold text-white rounded-xl px-3 py-1.5 shadow-sm"
              style={{ backgroundColor: neon.stroke, boxShadow: `0 0 14px ${neon.stroke}55` }}>
              Matching-Quote {avgScore}%
            </span>
          )}
        </div>
      </div>

      {/* ── Frist-Hinweis ─────────────────────────────────────────────────────── */}
      {nextDeadline && <DeadlineBanner job={nextDeadline} />}

      {/* ── Zweispaltiges Layout ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_288px] gap-5">

        {/* ── Hauptspalte ──────────────────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">

          {/* Markt-Kompatibilität bento */}
          <MarketCard jobs={jobs} avgScore={avgScore} activitySeries={activitySeries} scoredJobs={scoredJobs} />

          {/* Deine Aktivitäten table */}
          <RecentJobsTable jobs={recentJobs} />

          {/* Leerzustand */}
          {(!jobs || jobs.length === 0) && (
            <div className="rounded-2xl bg-white border-2 border-dashed border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Noch keine Stellen gespeichert</h3>
              <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">Füge deine erste Stelle hinzu und nutze die KI-gestützte Analyse.</p>
              <Link to="/jobs"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
                <Search className="w-4 h-4" /> Stelle hinzufügen
              </Link>
            </div>
          )}
        </div>

        {/* ── KI Co-Pilot Sidebar ───────────────────────────────────────────────── */}
        <AICopilotSidebar suggestions={aiSuggestions} userName={userName} featuredTip={featuredTip} />
      </div>
    </div>
  );
}
