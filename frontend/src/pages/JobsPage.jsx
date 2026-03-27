import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Briefcase, ArrowRight, Search, MapPin, Zap, CheckCircle, ExternalLink, ChevronDown, Sparkles, Building2, Clock, Check, Send, SearchCheck } from "lucide-react";
import { jobApi, aiAssistantApi, motivationsschreibenApi, resumeApi, researchApi } from "../services/api";
import { generateMailtoLink } from "../utils/emailHelpers";
import ApplicationsList from "../components/ApplicationsList";
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
  const qc = useQueryClient();
  const [mainTab, setMainTab] = useState("applications");
  const [searchTab, setSearchTab] = useState("recommended");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [savingJobId, setSavingJobId] = useState(null);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobAnalyses, setJobAnalyses] = useState({});
  const [analyzingJobId, setAnalyzingJobId] = useState(null);
  const [draftTexts, setDraftTexts] = useState(() => loadStored("job-search-drafts") || {});   // source_id -> generated text
  const [draftLoading, setDraftLoading] = useState(null); // source_id being generated
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
  const focusedJobId = searchParams.get("jobId");
  const { data: initData } = useQuery({ queryKey: ["init"] });
  const me = initData?.me;
  const { guardedRun: guardSearch } = useUsageGuard("job_search");
  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      saveStored("resumes", r.data);
      return r.data;
    }),
    initialData: () => loadStored("resumes"),
    staleTime: 1000 * 60 * 5,
  });

  // Tracked jobs
  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => jobApi.list().then((r) => {
      saveStored("jobs", r.data);
      return r.data;
    }),
    initialData: () => loadStored("jobs"),
    retry: 1,
  });

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

  useEffect(() => {
    if (focusedJobId) {
      setMainTab("applications");
    }
  }, [focusedJobId]);

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
    const alreadySaved = jobs.some(
      (j) =>
        (result.full_url && j.url === result.full_url) ||
        (j.company?.toLowerCase() === result.company?.toLowerCase() &&
          j.role?.toLowerCase() === result.title?.toLowerCase())
    );
    if (alreadySaved) {
      toast("Diese Stelle ist bereits gespeichert", { icon: "ℹ️" });
      setSavedJobIds((prev) => new Set([...prev, result.source_id]));
      return;
    }
    setSavingJobId(result.source_id);
    saveJobMutation.mutate({
      company: result.company,
      role: result.title,
      description: result.description || `${result.title} at ${result.company} in ${result.location}`,
      url: result.full_url || null,
    });
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

  const handleDraftEmail = async (result) => {
    const id = result.source_id;
    const userName = me?.full_name || me?.email?.split("@")[0] || "Bewerber";

    // Use cached text if available
    if (draftTexts[id]) {
      window.location.href = generateMailtoLink(result, draftTexts[id], userName, result.contact_email);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
      return;
    }

    setDraftLoading(id);
    try {
      const res = await motivationsschreibenApi.generate({
        company: result.company || "",
        role: result.title || "",
        job_description: result.description || `${result.title} bei ${result.company}`,
        tone: "formell",
        resume_id: resumes[0]?.id || null,
        applicant_name: me?.full_name || "",
      });
      const text = res.data?.text || "";
      setDraftTexts((prev) => {
        const next = { ...prev, [id]: text };
        saveStored("job-search-drafts", next);
        return next;
      });
      window.location.href = generateMailtoLink(result, text, userName, result.contact_email);
      toast.success("Brief-Entwurf geöffnet! Vergiss nicht, deinen Lebenslauf als Anhang hinzuzufügen.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Brief-Entwurf konnte nicht generiert werden"));
    } finally {
      setDraftLoading(null);
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
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-4 sm:mb-8 animate-slide-up">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            Bewerbungen
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Verwalte deine Bewerbungen und finde neue Stellenangebote</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="mb-4 sm:mb-8 flex gap-1 sm:gap-4 border-b border-gray-200 animate-slide-up">
        <button
          onClick={() => setMainTab("applications")}
          className={`pb-3 sm:pb-4 px-2 sm:px-4 text-sm font-medium transition-colors ${
            mainTab === "applications"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <CheckCircle className="w-4 h-4" />
            <span className="hidden xs:inline">Meine </span>Bewerbungen
          </div>
        </button>
        <button
          onClick={() => setMainTab("search")}
          className={`pb-3 sm:pb-4 px-2 sm:px-4 text-sm font-medium transition-colors ${
            mainTab === "search"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Search className="w-4 h-4" />
            Stellen finden
          </div>
        </button>
      </div>

      {/* My Applications Tab */}
      {mainTab === "applications" && (
        <div className="animate-slide-up">
          <ApplicationsList jobs={jobs} focusedJobId={focusedJobId} />
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
            <div className="mt-4 overflow-hidden animate-slide-up">
              <div className="card bg-white border border-gray-200 shadow-md">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-6">
                  <button
                    onClick={() => setSearchTab("recommended")}
                    className={`flex-1 px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all ${
                      searchTab === "recommended"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <Zap className="w-4 h-4 flex-shrink-0" />
                      <span className="sm:hidden">Empfohlen</span>
                      <span className="hidden sm:inline">Empfohlen (basierend auf Präferenzen)</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSearchTab("custom")}
                    className={`flex-1 px-2 sm:px-4 py-3 font-medium text-xs sm:text-sm transition-all ${
                      searchTab === "custom"
                        ? "border-b-2 border-blue-600 text-blue-600"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                      <Search className="w-4 h-4 flex-shrink-0" />
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
                      className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-[0.98] text-white font-medium transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
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
                        <option value="Lehre">Lehre</option>
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
                            className={`rounded-xl border bg-white transition-all duration-200 overflow-hidden ${
                              isExpanded
                                ? "border-blue-300 shadow-lg ring-1 ring-blue-100"
                                : "border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200"
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
                              <div className="border-t border-blue-100 bg-gradient-to-b from-blue-50/40 to-gray-50 p-5 space-y-4">
                                {/* Description */}
                                {result.description && (
                                  <div className="bg-white rounded-lg border border-gray-100 p-4">
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
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Zur Stellenanzeige
                                    </a>
                                  )}
                                  <button
                                    onClick={() => handleSaveSearchResult(result)}
                                    disabled={savingJobId === result.source_id || savedJobIds.has(result.source_id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                                      savedJobIds.has(result.source_id)
                                        ? "bg-green-600 text-white scale-95"
                                        : "bg-blue-600 text-white hover:bg-blue-700"
                                    } disabled:cursor-not-allowed`}
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {analyzingJobId === index ? "Analysiert…" : "KI-Analyse"}
                                  </button>
                                  <button
                                    onClick={() => handleDraftEmail(result)}
                                    disabled={draftLoading === result.source_id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 transition-colors disabled:opacity-50"
                                  >
                                    {draftLoading === result.source_id ? (
                                      <><div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />Generiert…</>
                                    ) : (
                                      <><Send className="w-3.5 h-3.5" />Brief-Entwurf</>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleResearch(result)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
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
                                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
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
                          className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                          Mehr anzeigen ({searchResults.length - visibleCount} weitere)
                        </button>
                      )}
                      {visibleCount > 5 && (
                        <button
                          type="button"
                          onClick={() => setVisibleCount(5)}
                          className="px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
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

      {researchModal && (
        <ResearchModal
          companyName={researchModal.companyName}
          data={researchData}
          loading={researchLoading}
          onRefresh={handleRefreshResearch}
          onClose={() => { setResearchModal(null); setResearchData(null); }}
        />
      )}
    </div>
  );
}
