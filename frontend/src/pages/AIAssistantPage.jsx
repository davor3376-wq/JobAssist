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
  { icon: FileText,      iconCls: "text-indigo-600 bg-indigo-50",  label: "Lebenslauf verbessern",  sub: "Stärken und Schwächen erkennen",  prompt: "Kannst du meinen Lebenslauf analysieren und Verbesserungsvorschläge machen?", requiresResume: true },
  { icon: Briefcase,     iconCls: "text-indigo-600 bg-indigo-50",  label: "Bewerbungstipps",        sub: "Erfolgreich bewerben in AT",       prompt: "Was sind die wichtigsten Tipps für eine erfolgreiche Bewerbung in Österreich?" },
  { icon: GraduationCap, iconCls: "text-indigo-600 bg-indigo-50",  label: "Praktikum finden",       sub: "Als Student durchstarten",         prompt: "Wie finde ich ein gutes Praktikum in Österreich als Student?" },
  { icon: Euro,          iconCls: "text-emerald-600 bg-emerald-50",label: "Gehaltsauskunft",        sub: "Marktübliche Gehälter kennen",     prompt: "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?" },
  { icon: Lightbulb,     iconCls: "text-amber-600 bg-amber-50",    label: "Vorstellungsgespräch",   sub: "Selbstsicher auftreten",           prompt: "Wie bereite ich mich am besten auf ein Vorstellungsgespräch in Österreich vor?" },
  { icon: Sparkles,      iconCls: "text-violet-600 bg-violet-50",  label: "Motivationsschreiben",   sub: "Überzeugend formulieren",          prompt: "Kannst du mir Tipps für ein überzeugendes Motivationsschreiben geben?" },
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
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
            KI-Bewerbungsassistent
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={selectedResumeId || ""}
            onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
            className="hidden sm:block px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-white text-slate-700"
          >
            <option value="">Kein Lebenslauf</option>
            {uploadedResumes.map((r) => (
              <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
            ))}
          </select>
          <Link
            to="/resume"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Lebenslauf hochladen
          </Link>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Neues Gespräch</span>
          </button>
        </div>
      </div>

      {/* ── Main layout: sidebar + chat ───────────────────────────────────── */}
      <div className="flex-1 flex gap-4 min-h-0 relative">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`
          absolute inset-y-0 left-0 z-30 w-64 flex flex-col bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden transition-transform duration-200
          md:relative md:w-[260px] md:flex-shrink-0 md:translate-x-0 md:shadow-none md:rounded-none md:border-0 md:border-r md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-[110%] md:translate-x-0"}
        `}>
          {/* Sidebar header */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-800 tracking-wide">Chat-Historie</span>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Neu
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Suche…"
                className="flex-1 bg-transparent text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none min-w-0"
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <p className="px-2 py-8 text-center text-xs text-slate-400">
                {historySearch ? "Keine Treffer" : "Noch kein Verlauf"}
              </p>
            ) : (
              filteredConversations.map((conv) => {
                const cat = getConvCategory(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group w-full text-left px-3 py-3 rounded-xl transition-all
                      ${conv.id === activeId
                        ? "bg-indigo-50 border border-indigo-100"
                        : "border border-transparent hover:bg-slate-50 hover:border-slate-100"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.cls}`}>
                        {cat.label}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded-lg text-slate-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="truncate text-xs font-semibold text-slate-800 leading-snug">{conv.title}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-slate-400">
                      <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{relativeTime(conv.updatedAt)}</span>
                      <span className="opacity-40">·</span>
                      <span className="opacity-60">{conv.messages.filter((m) => m.role === "user").length} Nachr.</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-black/20" onClick={() => setSidebarOpen(false)} />
        )}

        {/* ── Chat Panel ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

          {/* Simulation mode banner */}
          {simulationMode && (
            <div className="flex-shrink-0 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-violet-500">Interview-Simulator</p>
                  <p className="mt-0.5 text-sm text-slate-600">KI stellt dir Fragen wie in einem echten Probeinterview.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {simulatorActions.map((action) => (
                    <button key={action.label} onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 transition-colors shadow-sm">
                      {action.label}
                    </button>
                  ))}
                  <button onClick={() => setSimulationMode(false)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                    Beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assessment mode banner */}
          {assessmentMode && (
            <div className="flex-shrink-0 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Assessment Center</p>
                  <p className="mt-0.5 text-sm text-slate-600">Strukturierte Analyse deiner Stärken, Fähigkeiten und Potenziale.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assessmentActions.map((action) => (
                    <button key={action.label} onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors shadow-sm">
                      {action.label}
                    </button>
                  ))}
                  <button onClick={() => setAssessmentMode(false)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors">
                    Beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0">
            {messages.length === 0 ? (

              /* ── Empty-state hub ────────────────────────────────────────── */
              <div className="flex flex-col gap-4 md:gap-6 py-1">

                {/* Hero banner – soft indigo/violet gradient */}
                <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-5">
                  {/* Glow orbs */}
                  <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-indigo-400/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl" />
                  <div className="relative flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-slate-900">Hallo. Woran arbeitest du gerade?</h3>
                      <p className="mt-1 text-sm text-slate-500 max-w-lg leading-[1.5]">
                        Ich helfe dir bei Lebenslauf, Anschreiben, Interview-Vorbereitung und gezielter Karriereberatung.
                      </p>
                      {resumeContextLabel && (
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                          <FileText className="h-3 w-3" />
                          {resumeContextLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Feature cards — no illustrations, typography + glow accent */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {/* Interview Simulation */}
                  <button
                    onClick={startSimulation}
                    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-400/10 blur-2xl transition-all group-hover:bg-indigo-400/20" />
                    {/* Undraw-style interview illustration */}
                    <div className="absolute bottom-0 right-0 w-28 h-20 opacity-20 pointer-events-none">
                      <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="15" y="60" width="110" height="6" rx="3" fill="#4f46e5"/>
                        <rect x="40" y="20" width="60" height="40" rx="4" fill="#4f46e5"/>
                        <rect x="43" y="23" width="54" height="34" rx="2" fill="#6366f1"/>
                        <circle cx="70" cy="40" r="9" fill="#a5b4fc"/>
                        <rect x="61" y="50" width="18" height="2.5" rx="1.25" fill="#a5b4fc"/>
                        <circle cx="105" cy="68" r="12" fill="#e0e7ff"/>
                        <rect x="99" y="54" width="12" height="18" rx="6" fill="#818cf8"/>
                        <circle cx="105" cy="48" r="8" fill="#fde68a"/>
                        <rect x="18" y="12" width="42" height="22" rx="6" fill="white" stroke="#c7d2fe" strokeWidth="1.5"/>
                        <rect x="24" y="19" width="10" height="1.5" rx="0.75" fill="#c7d2fe"/>
                        <rect x="24" y="23" width="30" height="1.5" rx="0.75" fill="#c7d2fe"/>
                        <rect x="24" y="27" width="22" height="1.5" rx="0.75" fill="#c7d2fe"/>
                        <polygon points="44,34 50,38 38,38" fill="white"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Interview Simulation</h4>
                      <p className="mt-1.5 text-xs leading-[1.5] text-slate-500">
                        Übe realistische Fragen im Probeinterview und erhalte direktes Feedback.
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-indigo-700">
                        <Sparkles className="h-3.5 w-3.5" />
                        Jetzt starten
                      </div>
                    </div>
                  </button>

                  {/* Assessment Center */}
                  <button
                    onClick={startAssessment}
                    className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-violet-400/10 blur-2xl transition-all group-hover:bg-violet-400/20" />
                    {/* Undraw-style assessment illustration */}
                    <div className="absolute bottom-0 right-0 w-28 h-20 opacity-20 pointer-events-none">
                      <svg viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="35" y="10" width="70" height="82" rx="6" fill="white" stroke="#ddd6fe" strokeWidth="1.5"/>
                        <rect x="52" y="6" width="36" height="10" rx="5" fill="#7c3aed"/>
                        <circle cx="52" cy="33" r="6" fill="#ddd6fe"/>
                        <polyline points="48.5,33 51,35.5 55.5,29.5" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="62" y="30" width="34" height="2.5" rx="1.25" fill="#ddd6fe"/>
                        <circle cx="52" cy="50" r="6" fill="#ddd6fe"/>
                        <polyline points="48.5,50 51,52.5 55.5,46.5" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="62" y="47" width="28" height="2.5" rx="1.25" fill="#ddd6fe"/>
                        <circle cx="52" cy="67" r="6" fill="#ede9fe"/>
                        <rect x="62" y="64" width="22" height="2.5" rx="1.25" fill="#ede9fe"/>
                        <circle cx="115" cy="78" r="14" fill="#e0e7ff"/>
                        <circle cx="115" cy="66" r="10" fill="#fde68a"/>
                        <circle cx="111" cy="65" r="1.5" fill="#1e293b"/>
                        <circle cx="119" cy="65" r="1.5" fill="#1e293b"/>
                      </svg>
                    </div>
                    <div className="relative">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-200">
                        <ClipboardList className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="text-base font-bold text-slate-900">Assessment Center</h4>
                      <p className="mt-1.5 text-xs leading-[1.5] text-slate-500">
                        Analysiere deine Stärken, Fähigkeiten und Karrierepotenziale strukturiert.
                      </p>
                      <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-violet-700">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Assessment starten
                      </div>
                    </div>
                  </button>
                </div>

                {/* Schnell-Aktionen grid */}
                <div>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Schnell-Aktionen</p>
                  <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-3">
                    {SUGGESTIONS.map((s) => {
                      const locked = s.requiresResume && uploadedResumes.length === 0;
                      return (
                        <button
                          key={s.label}
                          onClick={() => {
                            if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; }
                            handleSend(s.prompt);
                          }}
                          className={`group flex flex-col gap-2 rounded-2xl border p-4 text-left transition-all duration-200
                            ${locked
                              ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50"
                              : "border-slate-100 bg-white shadow-sm hover:-translate-y-1 hover:border-slate-200 hover:shadow-md"
                            }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${locked ? "bg-slate-100" : s.iconCls}`}>
                            {locked
                              ? <Lock className="h-3.5 w-3.5 text-slate-300" />
                              : <s.icon className="h-4 w-4" />
                            }
                          </span>
                          <span className={`text-xs font-semibold leading-snug ${locked ? "text-slate-300" : "text-slate-800"}`}>
                            {s.label}
                          </span>
                          {s.sub && (
                            <span className={`text-[11px] leading-[1.5] ${locked ? "text-slate-200" : "text-slate-400"}`}>
                              {s.sub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            ) : (

              /* ── Message bubbles ──────────────────────────────────────── */
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm mb-0.5">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                        ${msg.role === "user"
                          ? "bg-indigo-600 text-white rounded-2xl rounded-br-sm shadow-sm"
                          : "bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}

                {chatMutation.isPending && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        {[0, 150, 300].map((delay) => (
                          <div key={delay} className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Input Bar ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-white/90 backdrop-blur-sm border-t border-slate-100">
            {uploadedResumes.length > 0 && (
              <div className="sm:hidden mb-2">
                <select
                  value={selectedResumeId || ""}
                  onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none bg-slate-50"
                >
                  <option value="">Kein Lebenslauf</option>
                  {uploadedResumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <button
                className="flex-shrink-0 flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                onClick={() => {}}
                title="Anhang"
              >
                <Plus className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Intelligente Eingabe… (Enter zum Senden)"
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-sm leading-relaxed max-h-32 text-slate-800 placeholder:text-slate-400 py-1"
                style={{ minHeight: "32px" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || chatMutation.isPending}
                className="flex-shrink-0 flex h-11 w-11 md:h-8 md:w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
