import { useQuery } from "@tanstack/react-query";
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

function StatSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-10 w-16 bg-gray-200 rounded" />
        </div>
        <div className="w-14 h-14 bg-gray-200 rounded-xl" />
      </div>
      <div className="h-3 w-40 bg-gray-100 rounded mt-4" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const resumes = initData?.resumes;

  const { data: jobs } = useQuery({
    queryKey: ["jobs"],
    queryFn: () =>
      jobApi.list().then((r) => {
        try {
          localStorage.setItem("dashboard_jobs", JSON.stringify(r.data));
        } catch {}
        return r.data;
      }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("dashboard_jobs");
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    },
    staleTime: 1000 * 60 * 2,
  });

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

  const isLoading = !initData && !jobs;

  return (
    <div className="max-w-5xl">
      <div className="animate-slide-up mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{greeting()}</h1>
        <p className="text-gray-500">Hier ist der aktuelle Stand deiner Stellensuche</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
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
                  <p className="text-gray-500 text-sm font-medium mb-1">Lebensläufe hochgeladen</p>
                  <p className="text-4xl font-bold text-gray-900">{resumes?.length ?? 0}</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl group-hover:shadow-lg group-hover:shadow-indigo-500/30 transition-all duration-300">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Verwalte alle deine Dokumente</p>
            </div>

            <div className="card card-hover group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Stellen verfolgt</p>
                  <p className="text-4xl font-bold text-gray-900">{jobs?.length ?? 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all duration-300">
                  <Target className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Behalte den Überblick über Möglichkeiten</p>
            </div>

            <div className="card card-hover group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">Match-Bewertung</p>
                  <p className="text-4xl font-bold text-gray-900">{avgScore ? `${avgScore}%` : "—"}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                  <Award className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">Qualität deiner Übereinstimmungen</p>
            </div>
          </>
        )}
      </div>

      <div className="card card-hover mb-8 animate-slide-up">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/resume"
            className="btn-primary flex-1 sm:flex-none text-center transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/30"
          >
            Lebenslauf hochladen
          </Link>
          <Link
            to="/cover-letter"
            className="btn-secondary flex-1 sm:flex-none text-center transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20"
          >
            Motivationsschreiben
          </Link>
          <Link
            to="/jobs"
            className="btn-secondary flex-1 sm:flex-none text-center transition-all duration-300 hover:shadow-lg hover:shadow-gray-500/20"
          >
            Stelle hinzufügen
          </Link>
        </div>
      </div>

      {recentJobs.length > 0 && (
        <div className="card card-hover animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Letzte Stellen</h2>
            <Link to="/jobs" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
              Alle anzeigen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="card-hover block p-4 rounded-lg transition-all duration-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{job.role || "Ohne Titel"}</p>
                    <p className="text-xs text-gray-500 truncate">{job.company || "Unbekanntes Unternehmen"}</p>
                  </div>
                  {job.match_score != null && (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap ${getMatchColorClass(job.match_score)}`}>
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
