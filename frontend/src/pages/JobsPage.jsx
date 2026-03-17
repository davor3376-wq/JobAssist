import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Briefcase, ArrowRight, Search, MapPin, Euro, Zap, CheckCircle } from "lucide-react";
import { jobApi } from "../services/api";
import PipelineStats from "../components/PipelineStats";
import ApplicationsList from "../components/ApplicationsList";

export default function JobsPage() {
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState("applications");
  const [showForm, setShowForm] = useState(false);
  const [searchTab, setSearchTab] = useState("recommended");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [savingJobId, setSavingJobId] = useState(null);
  const [customSearchParams, setCustomSearchParams] = useState({
    keywords: "",
    location: "",
    jobType: "",
  });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  // Tracked jobs
  const { data: jobs = [], isLoading, error: jobsError } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list().then(r => r.data),
    retry: 1,
  });

  // Recommended search (based on preferences)
  const {
    data: recommendedResults = [],
    isLoading: recommendedLoading,
    error: recommendedError,
    refetch: refetchRecommended,
  } = useQuery({
    queryKey: ["search", "recommended"],
    queryFn: () => jobApi.searchRecommended(1).then(r => r.data.jobs || []),
    enabled: false,
    retry: 1,
  });

  // Custom search
  const {
    data: customResults = [],
    isLoading: customLoading,
    error: customError,
    refetch: refetchCustom,
  } = useQuery({
    queryKey: ["search", "custom", customSearchParams],
    retry: 1,
    queryFn: () =>
      jobApi.searchCustom(
        customSearchParams.keywords,
        customSearchParams.location,
        customSearchParams.jobType,
        1
      ).then(r => r.data.jobs || []),
    enabled: false,
  });

  // Create job mutation (manual form)
  const createMutation = useMutation({
    mutationFn: jobApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Stelle hinzugefügt!");
      reset();
      setShowForm(false);
    },
    onError: () => toast.error("Stelle konnte nicht hinzugefügt werden"),
  });

  // Save job from search results
  const saveJobMutation = useMutation({
    mutationFn: jobApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Stelle gespeichert!");
      setSavingJobId(null);
    },
    onError: () => {
      toast.error("Stelle konnte nicht gespeichert werden");
      setSavingJobId(null);
    },
  });

  const handleRecommendedSearch = () => {
    refetchRecommended();
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    refetchCustom();
  };

  const handleSaveSearchResult = (result) => {
    setSavingJobId(result.id);
    saveJobMutation.mutate({
      company: result.company,
      role: result.title,
      description: result.snippet || `${result.title} at ${result.company} in ${result.location}`,
    });
  };

  const getMatchScoreBadgeClasses = (score) => {
    if (score >= 75) return "score-high";
    if (score >= 50) return "score-mid";
    return "score-low";
  };

  const searchResults = searchTab === "recommended" ? recommendedResults : customResults;
  const searchLoading = searchTab === "recommended" ? recommendedLoading : customLoading;
  const searchError = searchTab === "recommended" ? recommendedError : customError;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8 animate-slide-up">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Bewerbungen
          </h1>
          <p className="text-gray-600 mt-1">Verwalte deine Bewerbungen und finde neue Stellenangebote</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-8 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setMainTab("applications")}
          className={`pb-4 px-4 font-medium transition-colors ${
            mainTab === "applications"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Meine Bewerbungen
          </div>
        </button>
        <button
          onClick={() => setMainTab("search")}
          className={`pb-4 px-4 font-medium transition-colors ${
            mainTab === "search"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Stellen finden
          </div>
        </button>
      </div>

      {/* My Applications Tab */}
      {mainTab === "applications" && (
        <div className="space-y-6">
          <PipelineStats />
          <ApplicationsList jobs={jobs} />
        </div>
      )}

      {/* Search for Jobs Tab */}
      {mainTab === "search" && (
        <div className="space-y-8">
          <button
            onClick={() => setSearchExpanded(!searchExpanded)}
            className="w-full flex items-center justify-between p-5 rounded-lg border border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:border-blue-300 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Stellen suchen</span>
            </div>
            <div
              className={`transform transition-transform duration-200 ${
                searchExpanded ? "rotate-180" : ""
              }`}
            >
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {searchExpanded && (
            <div
              className="mt-4 overflow-hidden"
              style={{
                animation: "slideDown 0.3s ease-out",
              }}
            >
              <div className="card bg-white border border-gray-200 shadow-md">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setSearchTab("recommended")}
                    className={`flex-1 px-4 py-3 font-medium text-sm transition-all ${
                      searchTab === "recommended"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="w-4 h-4" />
                      Empfohlen (basierend auf Präferenzen)
                    </div>
                  </button>
                  <button
                    onClick={() => setSearchTab("custom")}
                    className={`flex-1 px-4 py-3 font-medium text-sm transition-all ${
                      searchTab === "custom"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Search className="w-4 h-4" />
                      Eigene Suche
                    </div>
                  </button>
                </div>

                {/* Recommended Tab */}
                {searchTab === "recommended" && (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Finde Stellen, die zu deinen gespeicherten Präferenzen und Fähigkeiten passen
                    </p>
                    <button
                      onClick={handleRecommendedSearch}
                      disabled={recommendedLoading}
                      className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {recommendedLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Suche läuft…
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Empfohlene Stellen laden
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Custom Search Tab */}
                {searchTab === "custom" && (
                  <form onSubmit={handleCustomSearch} className="space-y-4">
                    <div className="space-y-2">
                      <label className="label text-sm font-medium text-gray-700">Suchbegriffe</label>
                      <input
                        type="text"
                        placeholder="z.B. Verkauf, Gastro, IT, Praktikum"
                        value={customSearchParams.keywords}
                        onChange={(e) =>
                          setCustomSearchParams({
                            ...customSearchParams,
                            keywords: e.target.value,
                          })
                        }
                        className="input w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label text-sm font-medium text-gray-700">Ort</label>
                      <input
                        type="text"
                        placeholder="z.B. Wien, Graz, Linz, Salzburg"
                        value={customSearchParams.location}
                        onChange={(e) =>
                          setCustomSearchParams({
                            ...customSearchParams,
                            location: e.target.value,
                          })
                        }
                        className="input w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="label text-sm font-medium text-gray-700">Stellenart</label>
                      <select
                        value={customSearchParams.jobType}
                        onChange={(e) =>
                          setCustomSearchParams({
                            ...customSearchParams,
                            jobType: e.target.value,
                          })
                        }
                        className="input w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      >
                        <option value="">Alle Stellenarten</option>
                        <option value="Vollzeit">Vollzeit</option>
                        <option value="Teilzeit">Teilzeit</option>
                        <option value="Praktikum">Praktikum</option>
                        <option value="Samstagsjob">Samstagsjob</option>
                        <option value="Ferialjob">Ferialjob</option>
                        <option value="Geringfügig">Geringfügig</option>
                        <option value="Freiberuflich">Freiberuflich</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={customLoading || !customSearchParams.keywords}
                      className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {customLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Suche läuft…
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Stellen suchen
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      Ergebnisse ({searchResults.length})
                    </h3>
                    <div className="space-y-3">
                      {searchResults.map((result, index) => (
                        <div
                          key={`${result.id}-${index}`}
                          className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                          style={{
                            animation: "slideUp 0.3s ease-out",
                            animationDelay: `${index * 50}ms`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">
                                {result.title || "Ohne Titel"}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {result.company || "Unbekanntes Unternehmen"}
                              </p>
                            </div>
                            <button
                              onClick={() => handleSaveSearchResult(result)}
                              disabled={savingJobId === result.id}
                              className="px-3 py-1.5 rounded text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex-shrink-0"
                            >
                              {savingJobId === result.id ? "Wird gespeichert…" : "Speichern"}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                            {result.location && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{result.location}</span>
                              </div>
                            )}
                            {result.salary && (
                              <div className="flex items-center gap-1">
                                <Euro className="w-3.5 h-3.5" />
                                <span>{result.salary}</span>
                              </div>
                            )}
                          </div>
                          {result.snippet && (
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {result.snippet}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error States */}
                {searchError && (
                  <div className="mt-6 p-4 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700">
                      Suchergebnisse konnten nicht geladen werden. Bitte versuche es erneut.
                    </p>
                  </div>
                )}

                {/* No Results */}
                {!searchLoading &&
                  searchResults.length === 0 &&
                  (searchTab === "recommended" ? recommendedResults : customResults) !==
                    undefined &&
                  (searchTab === "custom" &&
                    customSearchParams.keywords) && (
                    <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200 text-center">
                      <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Keine Stellen zu deinen Suchkriterien gefunden
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
