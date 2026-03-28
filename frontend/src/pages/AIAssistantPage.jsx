import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bot, Send, Sparkles, FileText, Briefcase, GraduationCap,
  Euro, Lightbulb, Trash2, Lock, Plus, MessageSquare, Clock,
  ClipboardList, Upload, Search,
} from "lucide-react";
import { resumeApi, aiAssistantApi } from "../services/api";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_HISTORY_KEY = "ai_chat_history";
const MAX_HISTORY = 30;

function loadHistory() {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(history)); } catch {}
}

function loadStoredResumes() {
  try {
    const raw = localStorage.getItem("resumes");
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

// ─── Schnell-Aktionen ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: FileText,      label: "Lebenslauf verbessern",    sub: "Stärken und Schwächen erkennen",   prompt: "Kannst du meinen Lebenslauf analysieren und Verbesserungsvorschläge machen?", requiresResume: true },
  { icon: Briefcase,     label: "Bewerbungstipps",          sub: "Erfolgreich bewerben in AT",        prompt: "Was sind die wichtigsten Tipps für eine erfolgreiche Bewerbung in Österreich?" },
  { icon: GraduationCap, label: "Praktikum finden",         sub: "Als Student durchstarten",          prompt: "Wie finde ich ein gutes Praktikum in Österreich als Student?" },
  { icon: Euro,          label: "Gehaltsauskunft",          sub: "Marktübliche Gehälter kennen",      prompt: "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?" },
  { icon: Lightbulb,     label: "Vorstellungsgespräch",     sub: "Selbstsicher auftreten",             prompt: "Wie bereite ich mich am besten auf ein Vorstellungsgespräch in Österreich vor?" },
  { icon: Sparkles,      label: "Motivationsschreiben",     sub: "Überzeugend formulieren",            prompt: "Kannst du mir Tipps für ein überzeugendes Motivationsschreiben geben?" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function makeTitle(messages) {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Neues Gespräch";
  const text = first.content.slice(0, 40);
  return text.length < first.content.length ? text + "…" : text;
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000)  return "Gerade eben";
  if (diff < 3_600_000) return `Vor ${Math.floor(diff / 60_000)} Min.`;
  if (diff < 86_400_000) return `Vor ${Math.floor(diff / 3_600_000)} Std.`;
  return new Date(ts).toLocaleDateString("de-AT", { day: "numeric", month: "short" });
}

function getConvCategory(conv) {
  const first = conv.messages.find((m) => m.role === "user")?.content || "";
  if (first.includes("Interview-Simulator")) return { label: "Simulation", cls: "bg-violet-100 text-violet-700" };
  if (first.includes("Assessment")) return { label: "Assessment", cls: "bg-blue-100 text-blue-700" };
  return { label: "Chat", cls: "bg-slate-100 text-slate-500" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIAssistantPage() {
  const [conversations, setConversations] = useState(() => loadHistory());
  const [activeId,      setActiveId]      = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [historySearch,  setHistorySearch]  = useState("");

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const { guardedRun } = useUsageGuard("ai_chat");

  const { data: uploadedResumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      try { localStorage.setItem("resumes", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => loadStoredResumes(),
    staleTime: 1000 * 60 * 2,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (messages.length === 0) return;
    setConversations((prev) => {
      const title = makeTitle(messages);
      if (activeId) {
        const updated = prev.map((c) =>
          c.id === activeId ? { ...c, messages, title, updatedAt: Date.now() } : c
        );
        saveHistory(updated);
        return updated;
      }
      const newConv = { id: makeId(), title, messages, createdAt: Date.now(), updatedAt: Date.now() };
      setActiveId(newConv.id);
      const updated = [newConv, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const chatMutation = useMutation({
    mutationFn: (data) => aiAssistantApi.chat(data),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Fehler bei der KI-Antwort"));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut." },
      ]);
    },
  });

  const handleSend = useCallback((text) => {
    const message = (text ?? input).trim();
    if (!message) return;
    guardedRun(() => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setInput("");
      chatMutation.mutate({
        message,
        history: messages.slice(-10),
        ...(selectedResumeId ? { resume_id: selectedResumeId } : {}),
      });
    });
  }, [input, messages, selectedResumeId, guardedRun, chatMutation]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSimulationMode(false);
    setAssessmentMode(false);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const handleSelectConversation = (conv) => {
    setActiveId(conv.id);
    setMessages(conv.messages);
    setSidebarOpen(false);
  };

  const handleDeleteConversation = (e, id) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      saveHistory(updated);
      return updated;
    });
    if (activeId === id) {
      setActiveId(null);
      setMessages([]);
    }
  };

  const startSimulation = useCallback(() => {
    setSimulationMode(true);
    setAssessmentMode(false);
    handleSend("Starte bitte einen Interview-Simulator für mich. Stelle mir nacheinander präzise Fragen und warte jeweils auf meine Antwort.");
  }, [handleSend]);

  const startAssessment = useCallback(() => {
    setAssessmentMode(true);
    setSimulationMode(false);
    handleSend("Starte bitte ein strukturiertes Karriere-Assessment für mich. Analysiere meine Stärken, Interessen und Fähigkeiten durch gezielte Fragen, und gib mir am Ende eine fundierte Einschätzung meines Bewerberprofils.");
  }, [handleSend]);

  const simulatorActions = [
    { label: "Nächste Frage",  prompt: "Stelle mir bitte die nächste Interviewfrage für diese Simulation." },
    { label: "Feedback geben", prompt: "Gib mir bitte direktes Feedback auf meine letzte Antwort und sage mir, was ich verbessern soll." },
    { label: "Tipp anzeigen",  prompt: "Gib mir bitte einen kurzen Tipp, wie ich die aktuelle Interviewfrage stärker beantworten kann." },
  ];

  const assessmentActions = [
    { label: "Weiter",           prompt: "Fahre mit der nächsten Assessment-Frage fort." },
    { label: "Auswertung jetzt", prompt: "Gib mir jetzt schon eine Zwischenauswertung meines Bewerberprofils basierend auf dem bisherigen Gespräch." },
    { label: "Abschließen",      prompt: "Schließe das Assessment ab und gib mir eine vollständige Profilauswertung mit konkreten Empfehlungen." },
  ];

  const resumeContextLabel = uploadedResumes.find((r) => r.id === selectedResumeId)?.filename;
  const filteredConversations = historySearch.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(historySearch.toLowerCase()))
    : conversations;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto h-[calc(100svh-120px)] flex flex-col animate-slide-up">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent truncate">
            KI-Bewerbungsassistent
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Resume context selector */}
          <select
            value={selectedResumeId || ""}
            onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
            className="hidden sm:block px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
          >
            <option value="">Kein Lebenslauf</option>
            {uploadedResumes.map((r) => (
              <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
            ))}
          </select>

          {/* Lebenslauf hochladen CTA */}
          <Link
            to="/resume"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Lebenslauf hochladen
          </Link>

          <button
            onClick={startSimulation}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 text-violet-700 text-xs font-semibold hover:bg-violet-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Simulation starten
          </button>

          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Neues Gespräch</span>
          </button>
        </div>
      </div>

      {/* ── Main layout: sidebar + chat ───────────────────────────────────── */}
      <div className="flex-1 flex gap-3 min-h-0 relative">

        {/* ── Chat-Historie Sidebar ────────────────────────────────────────── */}
        <aside className={`
          absolute inset-y-0 left-0 z-30 w-64 flex flex-col bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden transition-transform duration-200
          md:relative md:w-[260px] md:flex-shrink-0 md:translate-x-0 md:shadow-sm md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-[110%] md:translate-x-0"}
        `}>
          {/* Sidebar header */}
          <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-800 tracking-wide">Chat-Historie</span>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3 h-3" /> Neu
              </button>
            </div>
            {/* Search input */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Stelle eine Frage…"
                className="flex-1 bg-transparent text-[11px] text-slate-700 placeholder:text-slate-400 focus:outline-none min-w-0"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {filteredConversations.length === 0 ? (
              <p className="px-2 py-6 text-center text-[11px] text-slate-400">
                {historySearch ? "Keine Treffer" : "Noch kein Verlauf"}
              </p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`group w-full text-left px-3 py-2.5 rounded-xl border transition-all
                    ${conv.id === activeId
                      ? "border-blue-200 bg-blue-50"
                      : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                    }`}
                >
                  <div className="flex items-start justify-between gap-1.5 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${getConvCategory(conv).cls}`}>
                      {getConvCategory(conv).label}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="truncate text-xs font-semibold text-slate-800 leading-snug">{conv.title}</p>
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                    <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                    <span>{relativeTime(conv.updatedAt)}</span>
                    <span className="opacity-50">· {conv.messages.filter((m) => m.role === "user").length} Nachr.</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Backdrop for mobile sidebar */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-20 bg-black/20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Chat Panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Simulation mode banner */}
          {simulationMode && (
            <div className="border-b border-violet-100 bg-violet-50/70 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-500">Interview-Simulator</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Die KI stellt dir gezielte Fragen und reagiert auf deine Antworten wie in einem Probeinterview.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {simulatorActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setSimulationMode(false)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Simulation beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assessment mode banner */}
          {assessmentMode && (
            <div className="border-b border-blue-100 bg-blue-50/70 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-500">Assessment Center</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Strukturierte Analyse deines Bewerberprofils — Stärken, Fähigkeiten und Potenziale.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assessmentActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setAssessmentMode(false)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Assessment beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-slate-50/40">
            {messages.length === 0 ? (
              /* ── Empty state / hub ── */
              <div className="flex flex-col h-full">
                <div className="w-full flex flex-col gap-4 py-2 px-1">

                  {/* Purple hero banner */}
                  <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-5 text-white shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-lg leading-tight">Hallo. Woran arbeitest du gerade?</h3>
                        <p className="mt-1 text-sm text-violet-200 max-w-md">
                          Ich helfe dir bei Lebenslauf, Anschreiben, Interview-Vorbereitung und gezielter Karriereberatung.
                        </p>
                        {resumeContextLabel && (
                          <span className="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                            Aktiver Lebenslauf: {resumeContextLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Two feature cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Interview Simulation */}
                    <button
                      onClick={startSimulation}
                      className="group text-left rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-4 hover:border-violet-400 hover:shadow-md transition-all overflow-hidden relative"
                    >
                      {/* Flat-vector interview illustration */}
                      <div className="mb-3 h-20 flex items-center justify-center">
                        <svg viewBox="0 0 120 72" fill="none" className="h-full w-auto" aria-hidden="true">
                          <rect x="18" y="46" width="84" height="5" rx="2.5" fill="#DDD6FE"/>
                          <rect x="24" y="51" width="5" height="14" rx="2.5" fill="#C4B5FD"/>
                          <rect x="91" y="51" width="5" height="14" rx="2.5" fill="#C4B5FD"/>
                          <circle cx="32" cy="24" r="10" fill="#8B5CF6"/>
                          <rect x="20" y="34" width="24" height="14" rx="5" fill="#7C3AED"/>
                          <circle cx="88" cy="24" r="10" fill="#A78BFA"/>
                          <rect x="76" y="34" width="24" height="14" rx="5" fill="#8B5CF6"/>
                          <rect x="43" y="8" width="34" height="18" rx="5" fill="white" stroke="#DDD6FE" strokeWidth="2"/>
                          <polygon points="53,26 60,34 67,26" fill="white" stroke="#DDD6FE" strokeWidth="2"/>
                          <circle cx="52" cy="17" r="2.5" fill="#8B5CF6"/>
                          <circle cx="60" cy="17" r="2.5" fill="#8B5CF6"/>
                          <circle cx="68" cy="17" r="2.5" fill="#8B5CF6"/>
                        </svg>
                      </div>
                      <p className="font-bold text-sm text-slate-900">Interview Simulation</p>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Übe realistische Fragen im Probeinterview und erhalte direktes Feedback.
                      </p>
                      <span className="mt-3 inline-block text-xs font-semibold text-violet-600 group-hover:text-violet-700">
                        Jetzt starten →
                      </span>
                    </button>

                    {/* Assessment Center */}
                    <button
                      onClick={startAssessment}
                      className="group text-left rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 hover:border-blue-400 hover:shadow-md transition-all overflow-hidden relative"
                    >
                      {/* Flat-vector collaborative group illustration */}
                      <div className="mb-3 h-20 flex items-center justify-center">
                        <svg viewBox="0 0 120 72" fill="none" className="h-full w-auto" aria-hidden="true">
                          <circle cx="60" cy="20" r="11" fill="#3B82F6"/>
                          <rect x="46" y="32" width="28" height="18" rx="6" fill="#2563EB"/>
                          <circle cx="28" cy="26" r="9" fill="#93C5FD"/>
                          <rect x="16" y="36" width="22" height="16" rx="5" fill="#60A5FA"/>
                          <circle cx="92" cy="26" r="9" fill="#93C5FD"/>
                          <rect x="82" y="36" width="22" height="16" rx="5" fill="#60A5FA"/>
                          <circle cx="60" cy="60" r="8" fill="#DBEAFE"/>
                          <path d="M56 60l3 3.5 5.5-7" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="font-bold text-sm text-slate-900">Assessment Center</p>
                      <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                        Analysiere deine Stärken, Fähigkeiten und Karrierepotenziale strukturiert.
                      </p>
                      <span className="mt-3 inline-block text-xs font-semibold text-blue-600 group-hover:text-blue-700">
                        Assessment starten →
                      </span>
                    </button>
                  </div>

                  {/* Schnell-Aktionen 3×2 grid */}
                  <div>
                    <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Schnell-Aktionen</p>
                    <div className="grid grid-cols-3 gap-2">
                      {SUGGESTIONS.map((s) => {
                        const locked = s.requiresResume && uploadedResumes.length === 0;
                        return (
                          <button
                            key={s.label}
                            onClick={() => {
                              if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; }
                              handleSend(s.prompt);
                            }}
                            className={`text-left flex flex-col gap-1 p-4 rounded-xl border transition-all
                              ${locked
                                ? "border-gray-100 bg-gray-50 cursor-not-allowed"
                                : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm"
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {locked
                                ? <Lock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                                : <s.icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              }
                              <span className={`text-xs font-semibold truncate ${locked ? "text-gray-300" : "text-gray-800"}`}>
                                {s.label}
                              </span>
                            </div>
                            {s.sub && (
                              <span className={`text-[11px] leading-tight pl-5 ${locked ? "text-gray-200" : "text-slate-500"}`}>
                                {s.sub}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            ) : (
              /* ── Message bubbles ── */
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-0.5">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[75%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                      <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                        ${msg.role === "user"
                          ? "bg-blue-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                          : "bg-slate-100 text-gray-800 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex items-end gap-2 justify-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        {[0, 150, 300].map((delay) => (
                          <div
                            key={delay}
                            className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Floating Input Bar ────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white/80 backdrop-blur-sm">
            {uploadedResumes.length > 0 && (
              <div className="sm:hidden mb-2">
                <select
                  value={selectedResumeId || ""}
                  onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none bg-slate-50"
                >
                  <option value="">Kein Lebenslauf</option>
                  {uploadedResumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-lg focus-within:border-[#2D5BFF] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Intelligente Eingabe… (Enter zum Senden)"
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-sm leading-relaxed max-h-32 text-gray-800 placeholder:text-slate-400"
                style={{ minHeight: "32px" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || chatMutation.isPending}
                className="flex-shrink-0 p-2 rounded-xl text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: "#2D5BFF" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
