import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, Target, Award, ArrowRight, Activity, CalendarClock, AlertTriangle, Upload, Search, CheckCircle, Bookmark, MessageSquare, XCircle } from "lucide-react";

import { jobApi } from "../services/api";

const DAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const getMatchColorClass = (score) => {
  if (score < 30) return "bg-red-100 text-red-800";
  if (score < 40) return "bg-orange-100 text-orange-800";
  if (score < 50) return "bg-amber-100 text-amber-800";
  if (score < 60) return "bg-yellow-100 text-yellow-800";
  if (score < 70) return "bg-green-100 text-green-700";
  if (score < 80) return "bg-green-200 text-green-800";
  if (score < 90) return "bg-green-300 text-green-900";
  if (score < 100) return "bg-green-400 text-white";
  return "bg-green-600 text-white";
};

function loadStored(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-3 h-4 w-32 rounded bg-gray-200" />
          <div className="h-10 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-14 w-14 rounded-xl bg-gray-200" />
      </div>
      <div className="mt-4 h-3 w-40 rounded bg-gray-100" />
    </div>
  );
}

function MiniActivityChart({ values }) {
  const max = Math.max(...values, 1);
  const total = values.reduce((s, v) => s + v, 0);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        {values.map((value, index) => (
          <div
            key={DAY_LABELS[index]}
            className="relative flex flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setHoveredIdx(index)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Tooltip */}
            {hoveredIdx === index && (
              <div className="absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                {value} Job{value !== 1 ? "s" : ""}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
              </div>
            )}
            <div className="relative flex h-24 w-full items-end">
              {/* Gray track */}
              <div className="absolute inset-x-0 bottom-0 h-full rounded-full bg-gray-100" />
              {/* Filled bar */}
              <div
                className={`relative w-full rounded-full transition-all duration-500 ${
                  hoveredIdx === index
                    ? "bg-gradient-to-t from-blue-600 to-violet-600"
                    : "bg-gradient-to-t from-blue-500 to-violet-500"
                }`}
                style={{ height: value > 0 ? `${Math.max(14, (value / max) * 100)}%` : 0 }}
              />
            </div>
            <span className="text-[11px] font-medium text-gray-600">{DAY_LABELS[index]}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>Analysierte Jobs diese Woche</span>
        <span>{total} gesamt</span>
      </div>
    </div>
  );
}

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
    initialData: () => queryClient.getQueryData(["jobs"]) || loadStored("dashboard_jobs") || loadStored("jobs") || [],
    staleTime: 1000 * 60 * 2,
  });

  const resumes = initData?.resumes || loadStored("resumes") || [];
  const recentJobs = jobs?.slice(0, 5) ?? [];
  const scoredJobs = jobs?.filter((job) => job.match_score != null) ?? [];
  const avgScore = scoredJobs.length
    ? Math.round(scoredJobs.reduce((sum, job) => sum + job.match_score, 0) / scoredJobs.length)
    : null;

  const activitySeries = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const current = new Date();
      current.setHours(0, 0, 0, 0);
      current.setDate(current.getDate() - (6 - index));
      return current;
    });

    return days.map((day, index) => {
      const count = (jobs || []).filter((job) => {
        if (job.match_score == null) return false;
        const stamp = job.updated_at || job.created_at;
        if (!stamp) return index >= 5;
        const parsed = new Date(stamp);
        return parsed >= day && parsed < new Date(day.getTime() + 24 * 60 * 60 * 1000);
      }).length;

      return count;
    });
  }, [jobs, scoredJobs.length]);

  const jobsNeedingReview = useMemo(
    () => (jobs || []).filter((job) => job.status === "bookmarked" || job.match_score == null).length,
    [jobs]
  );
  const openInterviews = useMemo(
    () => (jobs || []).filter((job) => job.status === "interviewing").length,
    [jobs]
  );
  const nextDeadline = useMemo(() => {
    const datedJobs = (jobs || [])
      .filter((job) => job.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return datedJobs[0] || null;
  }, [jobs]);

  const savedJobs = jobs?.length ?? 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const isLoading = !initData && !jobs?.length;

  return (
    <div className="max-w-6xl space-y-8">
      <div className="animate-slide-up rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-violet-50 p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h1 className="mb-2 text-4xl font-bold text-gray-900">{greeting()}</h1>
            <p className="text-gray-600">
              Überblick über deine gespeicherten Stellen, den aktuellen Bearbeitungsstand und die nächste Frist.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Gespeicherte Stellen</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{savedJobs}</p>
                <p className="mt-1 text-xs text-gray-500">Aktuell in deiner Liste</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Offen zu prüfen</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{jobsNeedingReview}</p>
                <p className="mt-1 text-xs text-gray-500">Ohne Abschluss oder noch ohne Match</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Interviews</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{openInterviews}</p>
                <p className="mt-1 text-xs text-gray-500">Status Vorstellungsgespräch</p>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl rounded-2xl border border-indigo-100 bg-white/90 p-5 shadow-sm">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">Aktivität</p>
                <p className="mt-2 text-sm leading-6 text-gray-700">
                  {scoredJobs.length} Stellen wurden bereits bewertet. {nextDeadline ? "Die nächste bekannte Frist ist bereits eingetragen." : "Aktuell ist keine Frist eingetragen."}
                </p>
              </div>
              <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-sm">
                <CalendarClock className="h-5 w-5" />
              </div>
            </div>
            <MiniActivityChart values={activitySeries} />

            {/* Frist-Monitor */}
            {/* ── Letzte Aktionen feed ──────────────────────── */}
            {jobs && jobs.length > 0 && (() => {
              const STATUS_META = {
                bookmarked:   { Icon: Bookmark,     color: "text-blue-500",   bg: "bg-blue-50",   label: "Gespeichert" },
                applied:      { Icon: CheckCircle,  color: "text-green-500",  bg: "bg-green-50",  label: "Beworben" },
                interviewing: { Icon: MessageSquare,color: "text-purple-500", bg: "bg-purple-50", label: "Gespräch" },
                offered:      { Icon: Award,        color: "text-amber-500",  bg: "bg-amber-50",  label: "Angebot" },
                rejected:     { Icon: XCircle,      color: "text-red-400",    bg: "bg-red-50",    label: "Abgelehnt" },
              };
              const recentActions = [...jobs]
                .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0))
                .slice(0, 4);
              return (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Letzte Aktionen</p>
                  {recentActions.map((job) => {
                    const meta = STATUS_META[job.status] || STATUS_META.bookmarked;
                    const { Icon } = meta;
                    const stamp = job.updated_at || job.created_at;
                    const when = stamp ? new Date(stamp).toLocaleDateString("de-AT", { day: "numeric", month: "short" }) : "";
                    return (
                      <Link
                        key={job.id}
                        to={`/jobs?jobId=${job.id}`}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 hover:bg-white/70 transition-colors"
                      >
                        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                          <Icon className={`h-5 w-5 ${meta.color}`} />
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
              );
            })()}

            {nextDeadline ? (() => {
              const daysLeft = Math.ceil(
                (new Date(nextDeadline.deadline).setHours(0,0,0,0) - new Date().setHours(0,0,0,0))
                / (1000 * 60 * 60 * 24)
              );
              const isUrgent = daysLeft <= 7;
              return (
                <div className={`mt-4 rounded-xl border p-4 ${
                  isUrgent ? "border-red-200 bg-red-50" : "border-amber-100 bg-amber-50"
                }`}>
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
                          Bewerbungsfrist: {new Date(nextDeadline.deadline).toLocaleDateString("de-AT")}
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
      </div>

      <div className="grid grid-cols-1 gap-6 animate-slide-up md:grid-cols-3">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            {/* CV tile with upload CTA */}
            <div className="card group rounded-2xl hover:shadow-md transition-shadow duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Lebensläufe hochgeladen</p>
                  <p className="text-4xl font-bold text-gray-900">{resumes.length}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">Verwalte alle deine Dokumente</p>
                <Link
                  to="/resume"
                  className="flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  <Upload className="h-3 w-3" /> Hochladen
                </Link>
              </div>
            </div>

            {/* Jobs tracked tile */}
            <div className="card group rounded-2xl hover:shadow-md transition-shadow duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Stellen verfolgt</p>
                  <p className="text-4xl font-bold text-gray-900">{jobs?.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/30">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">Behalte den Überblick über Möglichkeiten</p>
                <Link
                  to="/jobs"
                  className="flex items-center gap-1 rounded-lg border border-purple-200 px-2.5 py-1 text-[11px] font-semibold text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Search className="h-3 w-3" /> Suchen
                </Link>
              </div>
            </div>

            {/* Match score tile with ring gauge */}
            <div className="card group rounded-2xl hover:shadow-md transition-shadow duration-150">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Match-Bewertung</p>
                  <p className="text-4xl font-bold text-gray-900">{avgScore ? `${avgScore}%` : "—"}</p>
                </div>
                {/* Circular ring gauge — always green */}
                <div className="relative flex-shrink-0">
                  <svg width="56" height="56" className="-rotate-90" aria-hidden="true">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#bbf7d0" strokeWidth="6" />
                    {avgScore != null && (
                      <circle
                        cx="28" cy="28" r="22"
                        fill="none"
                        stroke="#16a34a"
                        strokeWidth="6"
                        strokeDasharray={2 * Math.PI * 22}
                        strokeDashoffset={2 * Math.PI * 22 * (1 - avgScore / 100)}
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                  <Award className="absolute inset-0 m-auto h-5 w-5 text-emerald-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                Qualität deiner Übereinstimmungen
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card card-hover animate-slide-up rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Schnellzugriff</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/resume"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition-all hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm sm:flex-none"
          >
            <Upload className="h-4 w-4" />
            Lebenslauf hochladen
          </Link>
          <Link
            to="/jobs"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm sm:flex-none"
          >
            <Search className="h-4 w-4" />
            Stelle hinzufügen
          </Link>
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div className="card card-hover animate-slide-up rounded-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Letzte Stellen</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-2">
            {recentJobs.map((job) => {
              const initials = (job.company || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
              const score = job.match_score;
              const ringColor = score == null ? "#94a3b8" : score >= 60 ? "#16a34a" : score >= 40 ? "#ca8a04" : "#dc2626";
              const circ = 2 * Math.PI * 14;
              return (
                <Link
                  key={job.id}
                  to={`/jobs?jobId=${job.id}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                >
                  {/* Company initials avatar */}
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-bold text-slate-600">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{job.role || "Ohne Titel"}</p>
                    <p className="truncate text-xs text-gray-500">{job.company || "Unbekanntes Unternehmen"}</p>
                  </div>
                  {/* Match ring */}
                  {score != null ? (
                    <div className="relative flex-shrink-0">
                      <svg width="36" height="36" className="-rotate-90">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#e2e8f0" strokeWidth="4" />
                        <circle
                          cx="18" cy="18" r="14" fill="none"
                          stroke={ringColor} strokeWidth="4"
                          strokeDasharray={circ}
                          strokeDashoffset={circ * (1 - score / 100)}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold" style={{ color: ringColor }}>
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
