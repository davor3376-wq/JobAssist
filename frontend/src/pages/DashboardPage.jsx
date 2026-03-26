import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, Target, Award, ArrowRight } from "lucide-react";

import { jobApi } from "../services/api";

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

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";
    return "Guten Abend";
  };

  const isLoading = !initData && !jobs?.length;

  return (
    <div className="max-w-5xl">
      <div className="mb-8 animate-slide-up">
        <h1 className="mb-2 text-4xl font-bold text-gray-900">{greeting()}</h1>
        <p className="text-gray-500">Hier ist der aktuelle Stand deiner Stellensuche</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 animate-slide-up md:grid-cols-3">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <div className="card card-hover group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Lebensläufe hochgeladen</p>
                  <p className="text-4xl font-bold text-gray-900">{resumes.length}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-indigo-500/30">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">Verwalte alle deine Dokumente</p>
            </div>

            <div className="card card-hover group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Stellen verfolgt</p>
                  <p className="text-4xl font-bold text-gray-900">{jobs?.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/30">
                  <Target className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">Behalte den Überblick über Möglichkeiten</p>
            </div>

            <div className="card card-hover group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-500">Match-Bewertung</p>
                  <p className="text-4xl font-bold text-gray-900">{avgScore ? `${avgScore}%` : "—"}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-emerald-500/30">
                  <Award className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500">Qualität deiner Übereinstimmungen</p>
            </div>
          </>
        )}
      </div>

      <div className="card card-hover mb-8 animate-slide-up">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Schnellzugriff</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            to="/resume"
            className="btn-primary flex-1 text-center transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30 sm:flex-none"
          >
            Lebenslauf hochladen
          </Link>
          <Link
            to="/cover-letter"
            className="btn-secondary flex-1 text-center transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 sm:flex-none"
          >
            Motivationsschreiben
          </Link>
          <Link
            to="/jobs"
            className="btn-secondary flex-1 text-center transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20 sm:flex-none"
          >
            Stelle hinzufügen
          </Link>
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div className="card card-hover animate-slide-up">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Letzte Stellen</h2>
            <Link to="/jobs" className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700">
              Alle anzeigen <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs?jobId=${job.id}`}
                className="card-hover block rounded-lg p-4 transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{job.role || "Ohne Titel"}</p>
                    <p className="truncate text-xs text-gray-500">{job.company || "Unbekanntes Unternehmen"}</p>
                  </div>
                  {job.match_score != null && (
                    <span className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getMatchColorClass(job.match_score)}`}>
                      {job.match_score}%
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
