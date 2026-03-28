import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  TrendingUp, Target, Award, ArrowRight, Activity,
  CalendarClock, AlertTriangle, Upload, Search,
  CheckCircle, Bookmark, MessageSquare, XCircle,
} from "lucide-react";

import { jobApi } from "../services/api";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function loadStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

// ── Activity bar chart ────────────────────────────────────────────────────────
// todayIdx = 6 (last element = today). Today's bar always uses the gradient.
function MiniActivityChart({ values }) {
  const max = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);
  const todayIdx = values.length - 1;
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1.5">
        {values.map((value, index) => {
          const isToday = index === todayIdx;
          const isHovered = hoveredIdx === index;
          return (
            <div
              key={DAY_LABELS[index]}
              className="relative flex flex-1 flex-col items-center gap-2"
              onMouseEnter={() => setHoveredIdx(index)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                  {value} Job{value !== 1 ? "s" : ""}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
                </div>
              )}
              <div className="relative flex h-24 w-full items-end">
                {/* Track */}
                <div className="absolute inset-x-0 bottom-0 h-full rounded-full bg-slate-100" />
                {/* Bar */}
                <div
                  className={`relative w-full rounded-full transition-all duration-500 ${
                    value === 0
                      ? "bg-slate-100"
                      : isToday || isHovered
                      ? "bg-gradient-to-t from-indigo-500 to-violet-500"
                      : "bg-slate-200"
                  }`}
                  style={{ height: value > 0 ? `${Math.max(14, (value / max) * 100)}%` : "18%" }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${isToday ? "text-indigo-600" : "text-slate-400"}`}>
                {DAY_LABELS[index]}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Analysierte Jobs diese Woche</span>
        <span className="font-semibold text-slate-600">{total} gesamt</span>
      </div>
    </div>
  );
}

// ── Slim stat card ────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, iconCls, Icon }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl shadow-sm ${iconCls}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold leading-none text-slate-900">{value}</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => queryClient.getQueryData(["init"]) || loadStored("init"),
    staleTime: 1000 * 60 * 2,
  });

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      jobApi.list().then((r) => {
        try {
          localStorage.setItem("dashboard_jobs", JSON.stringify(r.data));
          localStorage.setItem("jobs", JSON.stringify(r.data));
        } catch {}
        return r.data;
      }),
    initialData: () =>
      queryClient.getQueryData(["jobs"]) ||
      loadStored("dashboard_jobs") ||
      loadStored("jobs") ||
      [],
    staleTime: 1000 * 60 * 2,
  });

  const resumes     = initData?.resumes || loadStored("resumes") || [];
  const recentJobs  = jobs?.slice(0, 5) ?? [];
  const scoredJobs  = jobs?.filter((j) => j.match_score != null) ?? [];
  const avgScore    = scoredJobs.length
    ? Math.round(scoredJobs.reduce((s, j) => s + j.match_score, 0) / scoredJobs.length)
    : null;

  const activitySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((day, i) =>
      (jobs || []).filter((job) => {
        if (job.match_score == null) return false;
        const stamp = job.updated_at || job.created_at;
        if (!stamp) return i >= 5;
        const parsed = new Date(stamp);
        return parsed >= day && parsed < new Date(day.getTime() + 86_400_000);
      }).length
    );
  }, [jobs, scoredJobs.length]);

  const jobsNeedingReview = useMemo(
    () => (jobs || []).filter((j) => j.status === "bookmarked" || j.match_score == null).length,
    [jobs]
  );
  const openInterviews = useMemo(
    () => (jobs || []).filter((j) => j.status === "interviewing").length,
    [jobs]
  );
  const nextDeadline = useMemo(() => {
    const dated = (jobs || [])
      .filter((j) => j.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return dated[0] || null;
  }, [jobs]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Guten Morgen";
    if (h < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const STATUS_META = {
    bookmarked:   { Icon: Bookmark,      color: "text-blue-500",   bg: "bg-blue-50",   label: "Gespeichert" },
    applied:      { Icon: CheckCircle,   color: "text-emerald-500",bg: "bg-emerald-50",label: "Beworben" },
    interviewing: { Icon: MessageSquare, color: "text-violet-500", bg: "bg-violet-50", label: "Gespräch" },
    offered:      { Icon: Award,         color: "text-amber-500",  bg: "bg-amber-50",  label: "Angebot" },
    rejected:     { Icon: XCircle,       color: "text-red-400",    bg: "bg-red-50",    label: "Abgelehnt" },
  };

  const recentActions = [...(jobs || [])]
    .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
    .slice(0, 4);

  return (
    <div className="max-w-6xl space-y-6 animate-slide-up">

      {/* ── Greeting ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting()}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Dein aktueller Bewerbungsüberblick auf einen Blick.
        </p>
      </div>

      {/* ── Row 1: slim stats (left) + Activity widget (right) ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">

        {/* Left: 3 slim stat cards stacked vertically — full-width in 280px column */}
        <div className="flex flex-col gap-4">
          <StatCard
            label="Gespeicherte Stellen"
            value={jobs?.length ?? 0}
            sub="Aktuell in deiner Liste"
            iconCls="bg-gradient-to-br from-indigo-500 to-violet-600"
            Icon={Bookmark}
          />
          <StatCard
            label="Offen zu Prüfen"
            value={jobsNeedingReview}
            sub="Ohne Abschluss oder Match"
            iconCls="bg-gradient-to-br from-amber-400 to-orange-500"
            Icon={AlertTriangle}
          />
          <StatCard
            label="Interviews"
            value={openInterviews}
            sub="Vorstellungsgespräche aktiv"
            iconCls="bg-gradient-to-br from-emerald-400 to-teal-500"
            Icon={MessageSquare}
          />
        </div>

        {/* Right: Activity widget */}
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Aktivität</p>
              <p className="mt-1 text-sm text-slate-600">
                {scoredJobs.length} Stellen bewertet.{" "}
                {nextDeadline ? "Nächste Frist ist eingetragen." : "Keine offene Frist."}
              </p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
              <CalendarClock className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:flex-1 min-w-0">
              <MiniActivityChart values={activitySeries} />
            </div>

            {/* Recent actions feed */}
            {recentActions.length > 0 && (
            <div className="lg:flex-1 min-w-0">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Letzte Aktionen
              </p>
              <div className="space-y-1.5">
                {recentActions.map((job) => {
                  const meta = STATUS_META[job.status] || STATUS_META.bookmarked;
                  const { Icon } = meta;
                  const stamp = job.updated_at || job.created_at;
                  const when = stamp
                    ? new Date(stamp).toLocaleDateString("de-AT", { day: "numeric", month: "short" })
                    : "";
                  return (
                    <Link
                      key={job.id}
                      to={`/jobs?jobId=${job.id}`}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${meta.bg}`}>
                        <Icon className={`h-4.5 w-4.5 ${meta.color}`} style={{ width: "1.125rem", height: "1.125rem" }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-slate-800">{job.role || "Stelle"}</span>
                        <span className="block truncate text-[10px] text-slate-500">{job.company || ""}</span>
                      </span>
                      <span className="flex-shrink-0 text-[10px] text-slate-400">{when}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          </div>

          {/* Deadline alert */}
          {nextDeadline ? (() => {
            const daysLeft = Math.ceil(
              (new Date(nextDeadline.deadline).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0))
              / 86_400_000
            );
            const isUrgent = daysLeft <= 7;
            return (
              <div className={`mt-4 rounded-xl border p-4 ${isUrgent ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isUrgent ? "text-red-500" : "text-amber-500"}`} />
                    <div>
                      {isUrgent && (
                        <span className="mb-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
                          Dringend
                        </span>
                      )}
                      <p className="text-xs font-semibold text-slate-700">
                        {nextDeadline.role || "Stelle"} · {nextDeadline.company || "Unternehmen"}
                      </p>
                      <p className={`mt-0.5 text-xs ${isUrgent ? "text-red-600" : "text-amber-700"}`}>
                        Frist: {new Date(nextDeadline.deadline).toLocaleDateString("de-AT")}
                        {" · "}
                        <strong>noch {daysLeft > 0 ? `${daysLeft} Tag${daysLeft !== 1 ? "e" : ""}` : "heute"}</strong>
                      </p>
                    </div>
                  </div>
                  <Link
                    to={`/jobs?jobId=${nextDeadline.id}`}
                    className={`flex-shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      isUrgent ? "bg-red-600 text-white hover:bg-red-700" : "bg-amber-500 text-white hover:bg-amber-600"
                    }`}
                  >
                    Details
                  </Link>
                </div>
              </div>
            );
          })() : (
            <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
              Keine offenen Fristen — entspannt!
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: CVs / Jobs / Match score ───────────────────────────────── */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 sm:mx-0 sm:px-0">

        {/* CVs */}
        <div className="flex-none w-[82vw] snap-start sm:flex-auto sm:w-auto">
        <div className="group rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md h-full">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Lebensläufe</p>
              <p className="mt-1 text-4xl font-bold text-slate-900">{resumes.length}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-3.5 transition-shadow group-hover:shadow-lg group-hover:shadow-indigo-200">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">Dokumente verwalten</p>
            <Link
              to="/resume"
              className="flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              <Upload className="h-3 w-3" /> Hochladen
            </Link>
          </div>
        </div>
        </div>

        {/* Jobs tracked */}
        <div className="flex-none w-[82vw] snap-start sm:flex-auto sm:w-auto">
        <div className="group rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md h-full">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Stellen verfolgt</p>
              <p className="mt-1 text-4xl font-bold text-slate-900">{jobs?.length ?? 0}</p>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 p-3.5 transition-shadow group-hover:shadow-lg group-hover:shadow-violet-200">
              <Target className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">Behalte den Überblick</p>
            <Link
              to="/jobs"
              className="flex items-center gap-1 rounded-lg border border-violet-200 px-2.5 py-1 text-[11px] font-semibold text-violet-600 transition-colors hover:bg-violet-50"
            >
              <Search className="h-3 w-3" /> Öffnen
            </Link>
          </div>
        </div>
        </div>

        {/* Match score with ring */}
        <div className="flex-none w-[82vw] snap-start sm:flex-auto sm:w-auto">
        <div className="group rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md h-full">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Ø Match-Score</p>
              <p className="mt-1 text-4xl font-bold text-slate-900">{avgScore != null ? `${avgScore}%` : "—"}</p>
            </div>
            {/* Radial ring gauge */}
            <div className="relative flex-shrink-0">
              <svg width="56" height="56" className="-rotate-90" aria-hidden="true">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#d1fae5" strokeWidth="6" />
                {avgScore != null && (
                  <circle
                    cx="28" cy="28" r="22"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="6"
                    strokeDasharray={2 * Math.PI * 22}
                    strokeDashoffset={2 * Math.PI * 22 * (1 - avgScore / 100)}
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <Award className="absolute inset-0 m-auto h-5 w-5 text-emerald-500" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <Activity className="h-3.5 w-3.5 text-emerald-500" />
            Qualität deiner Übereinstimmungen
          </div>
        </div>
        </div>
      </div>

      {/* ── Schnellzugriff ─────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md">
        <h2 className="mb-4 text-sm font-bold text-slate-900">Schnellzugriff</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/resume"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-all hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-sm sm:flex-none"
          >
            <Upload className="h-4 w-4" />
            Lebenslauf hochladen
          </Link>
          <Link
            to="/jobs"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm sm:flex-none"
          >
            <Search className="h-4 w-4" />
            Stelle hinzufügen
          </Link>
        </div>
      </div>

      {/* ── Letzte Stellen ─────────────────────────────────────────────────── */}
      {recentJobs.length > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white/80 p-6 shadow-sm backdrop-blur-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Letzte Stellen</h2>
            <Link
              to="/jobs"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-700"
            >
              Alle anzeigen <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-1">
            {recentJobs.map((job) => {
              const initials = (job.company || "?")
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const score = job.match_score;
              const ringColor =
                score == null ? "#94a3b8"
                : score >= 60  ? "#10b981"
                : score >= 40  ? "#f59e0b"
                : "#ef4444";
              const circ = 2 * Math.PI * 14;
              return (
                <Link
                  key={job.id}
                  to={`/jobs?jobId=${job.id}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent p-2.5 transition-all hover:border-slate-100 hover:bg-slate-50 hover:shadow-sm"
                >
                  {/* Avatar with company initials */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-bold text-slate-600">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{job.role || "Ohne Titel"}</p>
                    <p className="truncate text-xs text-slate-500">{job.company || "Unbekanntes Unternehmen"}</p>
                  </div>
                  {/* Radial progress ring */}
                  {score != null ? (
                    <div className="relative flex-shrink-0">
                      <svg width="36" height="36" className="-rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                        <circle
                          cx="18" cy="18" r="14"
                          fill="none"
                          stroke={ringColor}
                          strokeWidth="3.5"
                          strokeDasharray={circ}
                          strokeDashoffset={circ * (1 - score / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        className="absolute inset-0 flex items-center justify-center text-[9px] font-bold"
                        style={{ color: ringColor }}
                      >
                        {Math.round(score)}%
                      </span>
                    </div>
                  ) : (
                    <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-400">—</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
