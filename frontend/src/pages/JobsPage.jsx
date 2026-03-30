import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Briefcase, Search, MapPin, Zap, ExternalLink, ChevronDown, Sparkles, Building2, Clock, Check, SearchCheck, FileText, X, Copy } from "lucide-react";
import { jobApi, aiAssistantApi, coverLetterApi, researchApi, resumeApi } from "../services/api";
import ViennaMap from "../components/ViennaMap";
import CityMap from "../components/CityMap";
import ResearchModal from "../components/ResearchModal";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

const loadStored = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
};

const saveStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const CITY_DISTRICTS = {
  "graz": [
    { value: "8010", label: "1. Bezirk – Innere Stadt" },
    { value: "8010", label: "2. Bezirk – St. Leonhard" },
    { value: "8010", label: "3. Bezirk – Geidorf" },
    { value: "8020", label: "4. Bezirk – Lend" },
    { value: "8020", label: "5. Bezirk – Gries" },
    { value: "8010", label: "6. Bezirk – Jakomini" },
    { value: "8041", label: "7. Bezirk – Liebenau" },
    { value: "8042", label: "8. Bezirk – St. Peter" },
    { value: "8010", label: "9. Bezirk – Waltendorf" },
    { value: "8047", label: "10. Bezirk – Ries" },
    { value: "8044", label: "11. Bezirk – Mariatrost" },
    { value: "8051", label: "12. Bezirk – Andritz" },
    { value: "8052", label: "13. Bezirk – Gösting" },
    { value: "8020", label: "14. Bezirk – Eggenberg" },
    { value: "8054", label: "15. Bezirk – Wetzelsdorf" },
    { value: "8054", label: "16. Bezirk – Straßgang" },
    { value: "8055", label: "17. Bezirk – Puntigam" },
  ],
  "linz": [
    { value: "4020", label: "Innenstadt" },
    { value: "4020", label: "Bulgariplatz" },
    { value: "4020", label: "Franckviertel" },
    { value: "4020", label: "Kaplanhof" },
    { value: "4020", label: "Neue Heimat" },
    { value: "4020", label: "Bindermichl" },
    { value: "4020", label: "Spallerhof" },
    { value: "4040", label: "Urfahr" },
    { value: "4040", label: "Dornach-Auhof" },
    { value: "4030", label: "Ebelsberg" },
    { value: "4030", label: "Pichling" },
  ],
  "salzburg": [
    { value: "5020", label: "Altstadt" },
    { value: "5020", label: "Mülln" },
    { value: "5020", label: "Nonntal" },
    { value: "5020", label: "Elisabeth-Vorstadt" },
    { value: "5020", label: "Schallmoos" },
    { value: "5020", label: "Lehen" },
    { value: "5020", label: "Maxglan" },
    { value: "5020", label: "Gneis" },
    { value: "5020", label: "Leopoldskron-Moos" },
    { value: "5026", label: "Aigen" },
    { value: "5026", label: "Gnigl" },
    { value: "5023", label: "Itzling" },
    { value: "5023", label: "Liefering" },
  ],
  "innsbruck": [
    { value: "6020", label: "Innere Stadt" },
    { value: "6020", label: "Wilten" },
    { value: "6020", label: "Pradl" },
    { value: "6020", label: "Saggen" },
    { value: "6020", label: "Dreiheiligen" },
    { value: "6020", label: "Hötting" },
    { value: "6020", label: "Mariahilf–St. Nikolaus" },
    { value: "6020", label: "St. Nikolaus" },
    { value: "6020", label: "Hötting West" },
    { value: "6020", label: "Sieglanger–Mentlberg" },
    { value: "6020", label: "Amras" },
    { value: "6020", label: "Arzl" },
    { value: "6020", label: "Mühlau" },
    { value: "6020", label: "Rum" },
  ],
  "klagenfurt": [
    { value: "9020", label: "Innere Stadt" },
    { value: "9020", label: "Völkendorf" },
    { value: "9020", label: "Waidmannsdorf" },
    { value: "9020", label: "St. Ruprecht" },
    { value: "9020", label: "Annabichl" },
    { value: "9020", label: "Viktring" },
  ],
  "st. pölten": [
    { value: "3100", label: "Innenstadt" },
    { value: "3100", label: "Harland" },
    { value: "3100", label: "Pottenbrunn" },
    { value: "3100", label: "Spratzern" },
  ],
  "wels": [
    { value: "4600", label: "Innenstadt" },
    { value: "4600", label: "Neustadt" },
    { value: "4600", label: "Lichtenegg" },
  ],
  "villach": [
    { value: "9500", label: "Innere Stadt" },
    { value: "9500", label: "Völkendorf" },
    { value: "9500", label: "Perau" },
  ],
};

export default function JobsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [searchTab, setSearchTab] = useState("recommended");
  const [coverLetterModal, setCoverLetterModal] = useState(null); // { text, role, company }
  const [copiedCover, setCopiedCover] = useState(false);
const [savingJobId, setSavingJobId] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobAnalyses, setJobAnalyses] = useState({});
  const [analyzingJobId, setAnalyzingJobId] = useState(null);
  const [researchModal, setResearchModal] = useState(null); // { companyName, jobDescription }
  const [researchData, setResearchData] = useState(null);
  const [researchCache, setResearchCache] = useState(() => loadStored("job-search-research") || {});
  const [researchLoading, setResearchLoading] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [visibleCount, setVisibleCount] = useState(5);
  const [customSearchParams, setCustomSearchParams] = useState({
    keywords: "",
    location: "",
    jobType: "",
    bezirk: "",
  });
  // Tracks what was last submitted — drives the query key so cache is reused for identical searches
  const [submittedCustomParams, setSubmittedCustomParams] = useState(null);
  const [recommendedEnabled, setRecommendedEnabled] = useState(false);
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const { data: resumes = [] } = useQuery({ queryKey: ["resumes"], queryFn: () => resumeApi.list().then(r => r.data), initialData: () => loadStored("resumes") || [] });
  const resumeId = resumes[0]?.id;
  const { guardedRun: guardSearch } = useUsageGuard("job_search");

  // Recommended search (based on preferences)
  const {
    data: recommendedResults = [],
    isFetching: recommendedLoading,
  } = useQuery({
    queryKey: ["search", "recommended"],
    queryFn: () => jobApi.searchRecommended(1).then(r => r.data.jobs || []),
    enabled: recommendedEnabled,
    placeholderData: () => qc.getQueryData(["search", "recommended"]),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  // Custom search — query key includes submitted params so identical searches reuse cache
  const {
    data: customResults = [],
    isFetching: customLoading,
  } = useQuery({
    queryKey: ["search", "custom", submittedCustomParams],
    retry: 1,
    queryFn: () => {
      if (!submittedCustomParams) return [];
      const loc = submittedCustomParams.bezirk || submittedCustomParams.location || "";
      return jobApi.searchCustom(
        submittedCustomParams.keywords,
        loc,
        submittedCustomParams.jobType,
        1
      ).then(r => r.data.jobs || []);
    },
    enabled: !!submittedCustomParams,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  });

  // Save job from search results
  const saveJobMutation = useMutation({
    mutationFn: jobApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Stelle gespeichert!");
      setSavedJobIds((prev) => new Set([...prev, savingJobId]));
      setSavingJobId(null);
    },
    onError: () => {
      toast.error("Stelle konnte nicht gespeichert werden");
      setSavingJobId(null);
    },
  });

  // Re-run search automatically when bezirk changes (only if a search was already submitted)
  useEffect(() => {
    if (
      searchTab === "custom" &&
      submittedCustomParams &&
      customSearchParams.bezirk &&
      customSearchParams.keywords
    ) {
      setSubmittedCustomParams({ ...customSearchParams });
    }
  }, [customSearchParams, searchTab, submittedCustomParams]);

  const handleRecommendedSearch = () => {
    guardSearch(() => {
      if (recommendedEnabled) {
        qc.invalidateQueries({ queryKey: ["search", "recommended"] });
      } else {
        setRecommendedEnabled(true);
      }
    });
  };

  const handleCustomSearch = (e) => {
    e.preventDefault();
    guardSearch(() => { setVisibleCount(5); setSubmittedCustomParams({ ...customSearchParams }); });
  };

  const handleSaveSearchResult = (result) => {
    setSavingJobId(result.source_id);
    saveJobMutation.mutate({
      company: result.company,
      role: result.title,
      description: result.description || `${result.title} bei ${result.company} in ${result.location}`,
      url: result.full_url || null,
    });
  };

  const handleCoverLetter = async (result, index) => {
    if (!resumeId) { toast("Bitte zuerst einen Lebenslauf hochladen.", { icon: "📄" }); return; }
    setAnalyzingJobId(`cl-${index}`);
    try {
      // Save job first, then generate cover letter
      let savedJob = null;
      try {
        const saveRes = await jobApi.create({
          company: result.company, role: result.title,
          description: result.description || `${result.title} bei ${result.company}`,
          url: result.full_url || null,
        });
        savedJob = saveRes.data;
        qc.invalidateQueries({ queryKey: ["jobs"] });
      } catch {}
      if (savedJob?.id) {
        const clRes = await coverLetterApi.generate(savedJob.id, resumeId);
        const text = clRes.data?.cover_letter || clRes.data;
        setCoverLetterModal({ text: typeof text === "string" ? text : JSON.stringify(text), role: result.title, company: result.company });
        setSavedJobIds((prev) => new Set([...prev, result.source_id]));
      } else {
        toast.error("Stelle konnte nicht gespeichert werden");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Anschreiben konnte nicht erstellt werden"));
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleAnalyzeJob = async (result, idx) => {
    setAnalyzingJobId(idx);
    try {
      const res = await aiAssistantApi.analyzeJob({
        title: result.title,
        company: result.company,
        description: result.description,
        location: result.location,
      });
      setJobAnalyses((prev) => ({ ...prev, [idx]: res.data }));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "KI-Analyse fehlgeschlagen"));
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleResearch = async (result) => {
    const cachedResearch = researchCache[result.source_id];
    if (cachedResearch) {
      setResearchData(cachedResearch);
      setResearchModal({ companyName: result.company, jobDescription: result.description || "", sourceId: result.source_id });
      return;
    }
    setResearchData(null);
    setResearchModal({ companyName: result.company, jobDescription: result.description || "", sourceId: result.source_id });
    setResearchLoading(true);
    try {
      const res = await researchApi.research(result.company, result.description || "");
      setResearchData(res.data);
      setResearchCache((prev) => {
        const next = { ...prev, [result.source_id]: res.data };
        saveStored("job-search-research", next);
        return next;
      });
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") { setResearchModal(null); return; }
      if (err.response?.status === 429) { setResearchModal(null); return; }
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
      setResearchModal(null);
    } finally {
      setResearchLoading(false);
    }
  };

  const handleRefreshResearch = async () => {
    if (!researchModal) return;
    setResearchLoading(true);
    try {
      const res = await researchApi.research(researchModal.companyName || "", researchModal.jobDescription || "");
      setResearchData(res.data);
      if (researchModal.sourceId) {
        setResearchCache((prev) => {
          const next = { ...prev, [researchModal.sourceId]: res.data };
          saveStored("job-search-research", next);
          return next;
        });
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") return;
      if (err.response?.status === 429) return;
      toast.error(getApiErrorMessage(err, "Recherche fehlgeschlagen"));
    } finally {
      setResearchLoading(false);
    }
  };

  const rawSearchResults = searchTab === "recommended" ? recommendedResults : customResults;
  const searchLoading = searchTab === "recommended" ? recommendedLoading : customLoading;

  const activeBezirk = searchTab === "custom" ? customSearchParams.bezirk : "";

  // Adzuna returns district names in location.display_name (e.g. "Wien, Meidling"), not postal codes
  const BEZIRK_NAMES = {
    "1010": "innere stadt", "1020": "leopoldstadt", "1030": "landstraße",
    "1040": "wieden",       "1050": "margareten",   "1060": "mariahilf",
    "1070": "neubau",       "1080": "josefstadt",   "1090": "alsergrund",
    "1100": "favoriten",    "1110": "simmering",    "1120": "meidling",
    "1130": "hietzing",     "1140": "penzing",      "1150": "rudolfsheim",
    "1160": "ottakring",    "1170": "hernals",      "1180": "währing",
    "1190": "döbling",      "1200": "brigittenau",  "1210": "floridsdorf",
    "1220": "donaustadt",   "1230": "liesing",
  };

  const filteredResults = activeBezirk
    ? rawSearchResults.filter((r) => {
        const loc  = (r.location    || "").toLowerCase();
        const desc = (r.description || "").toLowerCase();
        const districtName = BEZIRK_NAMES[activeBezirk];
        const districtNum  = parseInt(activeBezirk.slice(1, 3), 10); // "1230" → 23

        // 1. Location field explicitly matches the selected district
        if (districtName && loc.includes(districtName)) return true;
        if (loc.includes(activeBezirk)) return true;

        // 2. Description mentions the postal code, district name, or number pattern
        if (desc.includes(activeBezirk)) return true;
        if (districtName && desc.includes(districtName)) return true;
        if (desc.includes(`${districtNum}. bezirk`)) return true;
        if (desc.includes(`${districtNum}. wiener`)) return true;

        // 3. Location is generic Wien (no specific district) — keep as ambiguous
        const isGenericWien = (loc === "wien" || loc === "vienna" || loc === "" || loc === "österreich");
        if (isGenericWien) return true;

        // 4. Everything else (Korneuburg, Graz, specific wrong district) — exclude
        return false;
      })
    : rawSearchResults;

  const searchResults = [...filteredResults].sort((a, b) => {
    if (sortBy === "date") return new Date(b.updated || 0) - new Date(a.updated || 0);
    if (sortBy === "title") return (a.title || "").localeCompare(b.title || "", "de");
    if (sortBy === "company") return (a.company || "").localeCompare(b.company || "", "de");
    if (sortBy === "salary") return (b.salary ? 1 : 0) - (a.salary ? 1 : 0);
    return 0;
  });

  return (
    <div className="max-w-4xl mx-auto pb-16" style={{ fontFamily: "Inter, Roboto, sans-serif" }}>
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Stellenmarkt</h1>
          <p className="text-sm text-gray-500 mt-0.5">Passende Stellen finden und direkt bewerben</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5">
                {/* Tab Navigation */}
                <div className="flex gap-1 rounded-2xl bg-gray-100 p-1 mb-5">
                  <button
                    onClick={() => setSearchTab("recommended")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                      searchTab === "recommended" ? "bg-white shadow-sm text-[#2D5BFF]" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Zap className="w-4 h-4 flex-shrink-0" />
                    <span className="sm:hidden">Empfohlen</span>
                    <span className="hidden sm:inline">Empfohlen (basierend auf Präferenzen)</span>
                  </button>
                  <button
                    onClick={() => setSearchTab("custom")}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all min-h-[44px] ${
                      searchTab === "custom" ? "bg-white shadow-sm text-[#2D5BFF]" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <Search className="w-4 h-4 flex-shrink-0" />
                    Eigene Suche
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
                      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm min-h-[44px] disabled:opacity-50 transition-all hover:opacity-90"
                      style={{ backgroundColor: "#2D5BFF" }}
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
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Suchbegriffe</label>
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
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Ort</label>
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
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 min-h-[44px]"
                      />
                    </div>
                    {/wien|vienna/i.test(customSearchParams.location) && (
                      <ViennaMap
                        value={customSearchParams.bezirk}
                        onChange={(val) => setCustomSearchParams({ ...customSearchParams, bezirk: val })}
                      />
                    )}
                    {customSearchParams.location && !(/wien|vienna/i.test(customSearchParams.location)) && (() => {
                      const cityKey = customSearchParams.location.trim().toLowerCase();
                      const MAP_CITIES = ["graz", "linz", "salzburg", "innsbruck"];
                      if (MAP_CITIES.includes(cityKey)) {
                        return (
                          <CityMap
                            cityKey={cityKey}
                            selected={customSearchParams.bezirk}
                            onSelect={(val) => setCustomSearchParams({ ...customSearchParams, bezirk: val || "" })}
                          />
                        );
                      }
                      if (CITY_DISTRICTS[cityKey]) {
                        return (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Bezirk</label>
                            <select
                              value={customSearchParams.bezirk}
                              onChange={(e) => setCustomSearchParams({ ...customSearchParams, bezirk: e.target.value })}
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Alle Bezirke</option>
                              {CITY_DISTRICTS[cityKey].map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Stellenart</label>
                      <select
                        value={customSearchParams.jobType}
                        onChange={(e) =>
                          setCustomSearchParams({
                            ...customSearchParams,
                            jobType: e.target.value,
                          })
                        }
                        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 min-h-[44px]"
                      >
                        <option value="">Alle Stellenarten</option>
                        <option value="Vollzeit">Vollzeit</option>
                        <option value="Teilzeit">Teilzeit</option>
                        <option value="Praktikum">Praktikum</option>
                        <option value="Samstagsjob">Samstagsjob</option>
                        <option value="Ferialjob">Ferialjob</option>
                        <option value="Geringfügig">Geringfügig</option>
                        <option value="Freiberuflich">Freiberuflich</option>
                        <option value="Lehre">Lehre</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={customLoading || !customSearchParams.keywords}
                      className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm min-h-[44px] disabled:opacity-50 transition-all hover:opacity-90"
                      style={{ backgroundColor: "#2D5BFF" }}
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
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          Ergebnisse ({searchResults.length})
                        </h3>
                        {activeBezirk && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3" />
                            {activeBezirk}
                            {rawSearchResults.length !== searchResults.length && (
                              <span className="text-blue-500">
                                ({rawSearchResults.length - searchResults.length} gefiltert)
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600"
                      >
                        <option value="date">Neueste zuerst</option>
                        <option value="title">Titel A–Z</option>
                        <option value="company">Unternehmen A–Z</option>
                        <option value="salary">Mit Gehalt zuerst</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      {searchResults.slice(0, visibleCount).map((result, index) => {
                        const isExpanded = expandedJob === index;
                        const analysis = jobAnalyses[index];
                        return (
                          <div
                            key={`${result.source_id}-${index}`}
                            className={`rounded-2xl border bg-white transition-all duration-200 overflow-hidden ${
                              isExpanded
                                ? "border-[#C7D2FE] shadow-md"
                                : "border-gray-100 shadow-sm hover:shadow-md hover:border-[#C7D2FE]"
                            }`}
                          >
                            {/* Card header — always visible */}
                            <button
                              className="w-full p-5 text-left hover:bg-blue-50/30 transition-colors"
                              onClick={() => {
                                const newExpanded = isExpanded ? null : index;
                                if (newExpanded !== null && expandedJob !== null && expandedJob !== newExpanded) {
                                  setJobAnalyses((prev) => { const next = { ...prev }; delete next[expandedJob]; return next; });
                                }
                                setExpandedJob(newExpanded);
                              }}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-gray-900 text-base leading-snug">{result.title || "Ohne Titel"}</h4>
                                    {result.full_url && (
                                      <a
                                        href={result.full_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline flex-shrink-0"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Stellenanzeige
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                    <p className="text-sm font-medium text-gray-600">{result.company || "Unbekanntes Unternehmen"}</p>
                                  </div>
                                  <div className="flex flex-wrap gap-3 mt-2.5">
                                    {result.location && (
                                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <MapPin className="w-3 h-3" />{result.location}
                                      </span>
                                    )}
                                    {result.salary && (
                                      <span className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                        {result.salary}
                                      </span>
                                    )}
                                    {result.updated && (
                                      <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                        <Clock className="w-3 h-3" />{new Date(result.updated).toLocaleDateString("de-AT")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                              </div>
                            </button>

                            {/* Expanded detail panel */}
                            {isExpanded && (
                              <div className="border-t border-gray-100 bg-gray-50/60 p-5 space-y-4">
                                {/* Description */}
                                {result.description && (
                                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Beschreibung</p>
                                    <p className="text-sm text-gray-700 leading-relaxed">{result.description}</p>
                                  </div>
                                )}

                                {/* Actions row */}
                                <div className="flex flex-wrap gap-2">
                                  {result.full_url && (
                                    <a
                                      href={result.full_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:border-[#C7D2FE] hover:text-[#2D5BFF] transition-colors min-h-[44px]"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Zur Stellenanzeige
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleSaveSearchResult(result)}
                                    disabled={savingJobId === result.source_id || savedJobIds.has(result.source_id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 min-h-[44px] ${
                                      savedJobIds.has(result.source_id)
                                        ? "bg-emerald-600 text-white"
                                        : "text-white hover:opacity-90"
                                    } disabled:cursor-not-allowed`}
                                    style={!savedJobIds.has(result.source_id) ? { backgroundColor: "#2D5BFF" } : undefined}
                                  >
                                    {savingJobId === result.source_id ? (
                                      <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Wird gespeichert…</>
                                    ) : savedJobIds.has(result.source_id) ? (
                                      <><Check className="w-3.5 h-3.5" />Gespeichert</>
                                    ) : (
                                      "In Bewerbungen speichern"
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleAnalyzeJob(result, index)}
                                    disabled={analyzingJobId === index}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-colors disabled:opacity-50 min-h-[44px]"
                                    style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {analyzingJobId === index ? "Analysiert…" : "KI-Analyse"}
                                  </button>
                                  <button
                                    onClick={() => handleCoverLetter(result, index)}
                                    disabled={analyzingJobId === `cl-${index}`}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:border-[#C7D2FE] hover:text-[#2D5BFF] transition-colors min-h-[44px] disabled:opacity-50"
                                  >
                                    {analyzingJobId === `cl-${index}` ? (
                                      <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Erstellt…</>
                                    ) : (
                                      <><FileText className="w-3.5 h-3.5" />Anschreiben</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleResearch(result)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors min-h-[44px]"
                                  >
                                    <SearchCheck className="w-3.5 h-3.5" />
                                    Recherche
                                  </button>
                                </div>

                                {/* AI Analysis */}
                                {analysis && (
                                  <div className="space-y-3 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1">
                                      <Sparkles className="w-3 h-3" /> KI-Analyse
                                    </p>

                                    {analysis.what_to_expect && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">Was dich erwartet</p>
                                        <p className="text-sm text-gray-700">{analysis.what_to_expect}</p>
                                      </div>
                                    )}

                                    {analysis.requirements?.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">Anforderungen</p>
                                        <ul className="space-y-1">
                                          {analysis.requirements.map((r, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex gap-2">
                                              <span className="text-blue-500 font-bold flex-shrink-0">•</span>{r}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {analysis.nice_to_have?.length > 0 && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-1">Von Vorteil</p>
                                        <ul className="space-y-1">
                                          {analysis.nice_to_have.map((r, i) => (
                                            <li key={i} className="text-sm text-gray-700 flex gap-2">
                                              <span className="text-emerald-500 font-bold flex-shrink-0">+</span>{r}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}

                                    {analysis.tips?.length > 0 && (
                                      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                                        <p className="text-xs font-semibold text-amber-800 mb-1">Bewerbungstipps</p>
                                        <ul className="space-y-1">
                                          {analysis.tips.map((t, i) => (
                                            <li key={i} className="text-sm text-amber-900 flex gap-2">
                                              <span className="flex-shrink-0">{i + 1}.</span>{t}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex gap-2">
                      {visibleCount < searchResults.length && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount((c) => c + 5)}
                          className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px]"
                        >
                          Mehr anzeigen ({searchResults.length - visibleCount} weitere)
                        </button>
                      )}
                      {visibleCount > 5 && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(5)}
                          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px]"
                        >
                          Weniger anzeigen
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* No Results */}
                {!searchLoading &&
                  searchResults.length === 0 &&
                  (searchTab === "recommended" ? recommendedResults : customResults) !==
                    undefined &&
                  (searchTab === "custom" &&
                    submittedCustomParams?.keywords) && (
                    <div className="mt-6 p-6 rounded-2xl bg-white border border-gray-100 shadow-sm text-center">
                      <Briefcase className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Keine Stellen zu deinen Suchkriterien gefunden
                      </p>
                    </div>
                  )}
        </div>
      </div>

      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          onRefresh={handleRefreshResearch}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}

      {coverLetterModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                  <FileText className="w-4 h-4 text-[#2D5BFF]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Anschreiben</h3>
                  <p className="text-xs text-gray-500">{coverLetterModal.role} · {coverLetterModal.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(coverLetterModal.text);
                    setCopiedCover(true);
                    setTimeout(() => setCopiedCover(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:border-[#C7D2FE] hover:text-[#2D5BFF] transition-colors"
                >
                  {copiedCover ? <><Check className="w-3.5 h-3.5 text-emerald-500" />Kopiert!</> : <><Copy className="w-3.5 h-3.5" />Kopieren</>}
                </button>
                <button
                  onClick={() => setCoverLetterModal(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">{coverLetterModal.text}</pre>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
