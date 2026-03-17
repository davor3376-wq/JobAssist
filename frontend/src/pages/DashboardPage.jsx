import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { TrendingUp, Target, Award, ArrowRight } from "lucide-react";
import { resumeApi, jobApi } from "../services/api";

export default function DashboardPage() {
  const { data: resumes } = useQuery({ queryKey: ["resumes"], queryFn: () => resumeApi.list().then(r => r.data) });
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: () => jobApi.list().then(r => r.data) });

  const recentJobs = jobs?.slice(0, 5) ?? [];
  const avgScore = jobs?.length
    ? Math.round(jobs.filter(j => j.match_score).reduce((a, j) => a + j.match_score, 0) / jobs.filter(j => j.match_score).length)
    : null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Guten Morgen";
    if (hour < 18) return "Guten Tag";
    return "Guten Abend";
  };

  return (
    <div className="max-w-5xl">
      {/* Welcome Header */}
      <div className="animate-slide-up mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{greeting()}</h1>
        <p className="text-gray-500">Hier ist der aktuelle Stand deiner Stellensuche</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
        {/* Resumes Card */}
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

        {/* Jobs Card */}
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

        {/* Average Score Card */}
        <div className="card card-hover group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium mb-1">Ø Match-Bewertung</p>
              <p className="text-4xl font-bold text-gray-900">{avgScore ? `${avgScore}%` : "—"}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-xl group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">Qualität deiner Übereinstimmungen</p>
        </div>
      </div>

      {/* Quick Actions */}
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

      {/* Recent Jobs */}
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
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap ${
                      job.match_score >= 75 ? "score-high" :
                      job.match_score >= 50 ? "score-mid" :
                      "score-low"
                    }`}>
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
