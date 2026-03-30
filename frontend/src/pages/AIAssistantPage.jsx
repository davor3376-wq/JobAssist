import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bot, Send, Sparkles, FileText, Briefcase, GraduationCap,
  Euro, Lightbulb, Trash2, Lock, Plus, MessageSquare, Clock,
  ClipboardList, Upload, Search, ChevronLeft, Shield, X,
  Wand2, Target, Zap, ArrowRight, ChevronDown,
} from "lucide-react";
import { resumeApi } from "../services/api";
import { useStreamingChat } from "../hooks/useStreamingChat";
import useUsageGuard from "../hooks/useUsageGuard";

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

function loadStoredJobs() {
  try {
    const raw = localStorage.getItem("jobs");
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Schnell-Aktionen ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { icon: FileText,      iconCls: "text-blue-400 bg-blue-500/12",  label: "Lebenslauf verbessern",  sub: "Stärken und Entwicklungspotenzial erkennen",  prompt: "Analysiere meinen Lebenslauf und nenne mir Optimierungsschritte. generate_document (Erstellt dein Dokument).", requiresResume: true },
  { icon: Briefcase,     iconCls: "text-blue-400 bg-blue-500/12",  label: "Bewerbungsstrategie",    sub: "Gezielt und wirksam bewerben",       prompt: "Gib mir die wichtigsten Schritte für eine starke Bewerbung in Österreich." },
  { icon: GraduationCap, iconCls: "text-blue-400 bg-blue-500/12",  label: "Praktikum finden",       sub: "Als Student gezielt starten",         prompt: "Wie finde ich ein gutes Praktikum in Österreich als Student?" },
  { icon: Euro,          iconCls: "text-emerald-400 bg-emerald-500/12",label: "Gehaltsauskunft",        sub: "Marktübliche Gehälter kennen",     prompt: "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?" },
  { icon: Lightbulb,     iconCls: "text-amber-400 bg-amber-500/12",    label: "Gesprächsvorbereitung",   sub: "Souverän auftreten",           prompt: "Wie bereite ich mich am besten auf ein Vorstellungsgespräch in Österreich vor?" },
  { icon: Sparkles,      iconCls: "text-blue-400 bg-blue-500/12",  label: "Anschreiben",   sub: "Überzeugend formulieren",          prompt: "Hilf mir bei einem überzeugenden Anschreiben. generate_document (Erstellt dein Dokument)." },
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
  if (first.includes("Interview-Simulator")) return { label: "Simulation", cls: "bg-blue-500/10 text-blue-300" };
  if (first.includes("Karriere-Analyse") || first.includes("Assessment")) return { label: "Analyse", cls: "bg-blue-500/10 text-blue-300" };
  return { label: "Chat", cls: "bg-[#111827] text-slate-300" };
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1 py-0.5 rounded bg-blue-500/12 text-xs font-mono text-blue-300 border border-blue-500/20">{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownMessage({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let listItems = [];
  let listType = null;
  let olStart = 1;

  const flushList = (key) => {
    if (!listItems.length) return;
    if (listType === "ul") {
      elements.push(
        <ul key={key} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="my-2 space-y-1.5 pl-1">
          {listItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center mt-0.5">{olStart + j}</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    }
    listItems = [];
    listType = null;
  };

  lines.forEach((line, i) => {
    if (/^###\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h3 key={i} className="text-sm font-extrabold text-slate-900 mt-3 mb-0.5 tracking-tight">{renderInline(line.slice(4))}</h3>);
    } else if (/^##\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h2 key={i} className="text-base font-extrabold text-slate-900 mt-4 mb-1 tracking-tight">{renderInline(line.slice(3))}</h2>);
    } else if (/^#\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h1 key={i} className="text-lg font-extrabold text-slate-900 mt-4 mb-1 tracking-tight">{renderInline(line.slice(2))}</h1>);
    } else if (/^---+$/.test(line.trim())) {
      flushList(`fl${i}`);
      elements.push(<hr key={i} className="my-3 border-slate-200" />);
    } else if (/^[-*]\s/.test(line)) {
      if (listType !== "ul") { flushList(`fl${i}`); listType = "ul"; }
      listItems.push(line.slice(2));
    } else if (/^\d+\.\s/.test(line)) {
      if (listType !== "ol") {
        flushList(`fl${i}`);
        listType = "ol";
        olStart = parseInt(line.match(/^(\d+)/)[1], 10);
      }
      listItems.push(line.replace(/^\d+\.\s/, ""));
    } else if (line.trim() === "") {
      flushList(`fl${i}`);
      elements.push(<div key={i} className="h-2" />);
    } else {
      flushList(`fl${i}`);
      elements.push(<p key={i} className="text-sm leading-relaxed font-medium text-slate-800">{renderInline(line)}</p>);
    }
  });
  flushList("end");
  return <div className="space-y-0.5">{elements}</div>;
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
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);
  const [wandOpen, setWandOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const { guardedRun } = useUsageGuard("ai_chat");
  const [streamingMsg, setStreamingMsg] = useState(null); // { full, shown }
  const [assessmentDisclaimerOpen, setAssessmentDisclaimerOpen] = useState(false);
  const streamingTextRef = useRef("");
  const { send: streamChat, isStreaming } = useStreamingChat();

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

  // Typewriter streaming effect — 2 chars/tick at 22ms gives a calm, readable pace
  // When full is absent (real SSE streaming), display is handled directly via onChunk.
  useEffect(() => {
    if (!streamingMsg) return;
    if (!streamingMsg.full) return;
    if (streamingMsg.shown.length >= streamingMsg.full.length) {
      setMessages((prev) => [...prev, { role: "assistant", content: streamingMsg.full }]);
      setStreamingMsg(null);
      return;
    }
    const timer = setTimeout(() => {
      setStreamingMsg((prev) => {
        if (!prev) return null;
        return { ...prev, shown: prev.full.slice(0, prev.shown.length + 2) };
      });
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    }, 22);
    return () => clearTimeout(timer);
  }, [streamingMsg]);

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

  const handleSend = useCallback((text) => {
    const message = (text ?? input).trim();
    if (!message) return;
    guardedRun(() => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setInput("");
      streamingTextRef.current = "";
      streamChat(
        {
          message,
          history: messages.slice(-10),
          ...(selectedResumeId ? { resume_id: selectedResumeId } : {}),
        },
        {
          onChunk: (chunk) => {
            streamingTextRef.current += chunk;
            setStreamingMsg({ shown: streamingTextRef.current });
          },
          onDone: () => {
            const finalText = streamingTextRef.current;
            streamingTextRef.current = "";
            setMessages((prev) => [...prev, { role: "assistant", content: finalText }]);
            setStreamingMsg(null);
          },
          onError: () => {
            streamingTextRef.current = "";
            setStreamingMsg(null);
            toast.error("Fehler bei der KI-Antwort");
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut." },
            ]);
          },
        }
      );
    });
  }, [input, messages, selectedResumeId, guardedRun, streamChat]);

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
    // Restore simulation/assessment mode based on this conversation's origin
    const firstUser = conv.messages.find((m) => m.role === "user")?.content || "";
    setSimulationMode(firstUser.includes("Interview-Simulator"));
    setAssessmentMode(firstUser.includes("Karriere-Analyse"));
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
    setAssessmentDisclaimerOpen(false);
    handleSend(
      "Starte bitte eine strukturierte, interaktive Karriere-Analyse für mich als 1-on-1-Dialog. " +
      "Stelle jeweils EINE Frage und warte auf meine Antwort, bevor du die nächste stellst.\n\n" +
      "Verbindliche Regeln für deine Fragen:\n" +
      "- KEINE Klischee-Fragen wie 'Was sind deine größten Schwächen?' — diese liefern keine verwertbaren Daten\n" +
      "- Frage stattdessen wachstumsorientiert: z. B. 'Welche fachlichen oder persönlichen Fähigkeiten möchtest du in deiner nächsten Rolle weiterentwickeln?'\n" +
      "- Fokussiere auf belegbare Erfahrungen: 'In welchen Arbeitssituationen leistest du nachweislich dein Bestes?'\n" +
      "- Erkunde berufliche Umfelder: 'In welchen Teamstrukturen oder Arbeitsweisen fühlst du dich am produktivsten?'\n" +
      "- Keine Persönlichkeits- oder Charaktereinschätzungen — nur textbasierte Evidenz aus meinen Antworten\n\n" +
      "Am Ende: Erstelle eine Analyse strategischer Entwicklungschancen mit konkreten, umsetzbaren Empfehlungen.\n\n" +
      "Beginne jetzt mit der ersten Frage."
    );
  }, [handleSend]);

  const simulatorActions = [
    { label: "Nächste Frage",  prompt: "Stelle mir bitte die nächste Interviewfrage für diese Simulation." },
    { label: "Feedback geben", prompt: "Gib mir bitte direktes Feedback auf meine letzte Antwort und sage mir, was ich verbessern soll." },
    { label: "Tipp anzeigen",  prompt: "Gib mir bitte einen kurzen Tipp, wie ich die aktuelle Interviewfrage stärker beantworten kann." },
  ];

  const assessmentActions = [
    { label: "Weiter",           prompt: "Fahre mit der nächsten Analyse-Frage fort." },
    { label: "Auswertung jetzt", prompt: "Gib mir jetzt schon eine Zwischenauswertung meines Bewerberprofils basierend auf dem bisherigen Gespräch." },
    { label: "Abschließen",      prompt: "Schließe das Assessment ab und gib mir eine vollständige Profilauswertung mit konkreten Empfehlungen." },
  ];

  const resumeContextLabel = uploadedResumes.find((r) => r.id === selectedResumeId)?.filename;
  const filteredConversations = historySearch.trim()
    ? conversations.filter((c) => c.title.toLowerCase().includes(historySearch.toLowerCase()))
    : conversations;

  // Context data for right panel + launchpad
  const savedJobs = loadStoredJobs();
  const contextJob = savedJobs.find(j => j.status === "interviewing") || savedJobs.find(j => j.status === "applied") || savedJobs[0] || null;
  const contextResume = uploadedResumes[0] || null;

  const WAND_SUGGESTIONS = [
    contextJob ? `Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.` : "Bereite mich auf mein nächstes Vorstellungsgespräch vor.",
    contextResume ? "Analysiere meinen Lebenslauf und nenne mir die 3 stärksten Punkte." : "Was sollte ein überzeugender Lebenslauf enthalten?",
    contextJob ? `Schreib ein Anschreiben für die Stelle "${contextJob.role}" bei ${contextJob.company}.` : "Wie schreibe ich ein überzeugendes Anschreiben?",
    "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?",
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    <div className="mx-auto h-[calc(100svh-120px)] max-w-[1520px] flex flex-col animate-slide-up px-1 xl:px-0">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              KI-Bewerbungsassistent
            </h1>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Bereit</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={selectedResumeId || ""}
            onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
            className="hidden sm:block px-3 py-1.5 border border-[#1C2333] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 bg-[#1C2333] text-slate-300"
          >
            <option value="">Kein Lebenslauf</option>
            {uploadedResumes.map((r) => (
              <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
            ))}
          </select>
          <Link
            to="/resume"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1C2333] bg-[#131C2C] text-slate-300 text-xs font-semibold hover:bg-white/5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Lebenslauf hochladen
          </Link>
          <button
            onClick={handleNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Neues Gespräch</span>
          </button>
        </div>
      </div>

      {/* ── Main layout: sidebar + chat + context panel ─────────────────── */}
      <div className="flex-1 flex gap-4 min-h-0 relative">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className={`
          absolute inset-y-0 left-0 z-30 w-full sm:w-72 flex flex-col bg-[#0D1117] shadow-xl overflow-hidden transition-transform duration-200 rounded-none
          md:relative md:w-[232px] xl:w-[248px] md:flex-shrink-0 md:translate-x-0 md:shadow-none md:border-0 md:border-r md:border-[#1C2333] md:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}>
          {/* Sidebar header */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[#1C2333]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-violet-500" />
                  <span className="text-xs font-bold text-slate-200 tracking-wide">
                    {conversations.length === 0 ? "Starter Missionen" : "Aktive Missionen"}
                  </span>
                </div>
              </div>
              <button
                onClick={handleNewChat}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Plus className="w-3 h-3" /> Neu
              </button>
            </div>
          </div>

          {/* Starter missions (shown when no history) */}
          {conversations.length === 0 && (
            <div className="flex-shrink-0 px-3 py-3 space-y-1.5 border-b border-slate-100">
              {[
                { icon: MessageSquare, label: "Interview-Simulation starten", color: "text-violet-600 bg-violet-50 border-violet-100", onClick: startSimulation },
                { icon: ClipboardList, label: "Karriere-Analyse starten", color: "text-purple-600 bg-purple-50 border-purple-100", onClick: () => setAssessmentDisclaimerOpen(true) },
                { icon: FileText, label: "Lebenslauf analysieren", color: "text-indigo-600 bg-indigo-50 border-indigo-100", onClick: () => handleSend("Kannst du meinen Lebenslauf analysieren und Verbesserungsvorschläge machen?") },
                { icon: Briefcase, label: "Bewerbungsstrategie öffnen", color: "text-emerald-600 bg-emerald-50 border-emerald-100", onClick: () => handleSend("Was sind die wichtigsten Tipps für eine erfolgreiche Bewerbung in Österreich?") },
              ].map((m) => (
                <button
                  key={m.label}
                  onClick={() => { m.onClick(); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${m.color}`}
                >
                  <m.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-xs font-semibold leading-snug">{m.label}</span>
                  <ArrowRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />
                </button>
              ))}
            </div>
          )}

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            {conversations.length > 0 && (
              <div className="flex items-center gap-2 bg-[#131C2C] border border-[#1C2333] rounded-xl px-3 py-2 mx-1 mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Gespräche suchen…"
                  className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none min-w-0"
                />
              </div>
            )}
            {filteredConversations.length === 0 && conversations.length > 0 ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Keine Treffer</p>
            ) : (
              filteredConversations.map((conv) => {
                const cat = getConvCategory(conv);
                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group w-full text-left px-3 py-3 rounded-xl transition-all
                      ${conv.id === activeId
                        ? "bg-indigo-900/30 border border-indigo-800"
                        : "border border-transparent hover:bg-white/5 hover:border-[#1C2333]"
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
                    <p className="truncate text-xs font-semibold text-slate-200 leading-snug">{conv.title}</p>
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
        <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-[#171a21] bg-black shadow-sm overflow-hidden">

          {/* Simulation mode banner */}
          {simulationMode && (
            <div className="flex-shrink-0 border-b border-[#171a21] bg-[#111827] px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Interview-Simulator</p>
                  <p className="mt-0.5 text-sm text-slate-300">KI stellt dir Fragen wie in einem echten Probeinterview.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {simulatorActions.map((action) => (
                    <button key={action.label} onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-colors shadow-sm">
                      {action.label}
                    </button>
                  ))}
                  <button onClick={() => setSimulationMode(false)}
                    className="rounded-full border border-[#273244] bg-[#111827] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#172033] transition-colors">
                    Beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Assessment mode banner */}
          {assessmentMode && (
            <div className="flex-shrink-0 border-b border-[#171a21] bg-[#111827] px-4 py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Stärkenanalyse</p>
                  <p className="mt-0.5 text-sm text-slate-300">Strukturierte Analyse deiner Stärken, Fähigkeiten und Potenziale.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {assessmentActions.map((action) => (
                    <button key={action.label} onClick={() => handleSend(action.prompt)}
                      className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-colors shadow-sm">
                      {action.label}
                    </button>
                  ))}
                  <button onClick={() => setAssessmentMode(false)}
                    className="rounded-full border border-[#273244] bg-[#111827] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#172033] transition-colors">
                    Beenden
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5 min-h-0">
            {messages.length === 0 ? (

              /* ── Empty-state launchpad ──────────────────────────────────── */
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-1">

                {/* Hero — action-oriented */}
                <div className="relative overflow-hidden rounded-xl border border-[#171a21] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,#111827_0%,#000000_100%)] px-4 py-4">
                  <div className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-indigo-400/10 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-blue-400/10 blur-2xl" />
                  <div className="relative flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-500/20">
                      <Sparkles className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-white">Dein nächster Schritt</h3>
                      <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                        Wähle eine Mission oder schreib direkt — ich kenne deinen Bewerbungsstand.
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {contextJob && (
                          <button
                            onClick={() => handleSend(`Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-400 transition-colors shadow-sm shadow-blue-500/20"
                          >
                            <Zap className="h-3 w-3" />
                            Interview: {contextJob.role}
                          </button>
                        )}
                        {contextJob && (
                          <button
                            onClick={() => handleSend(`Schreib ein Anschreiben für die Stelle "${contextJob.role}" bei ${contextJob.company}.`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111827] border border-blue-500/20 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-[#172033] transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Anschreiben: {contextJob.company}
                          </button>
                        )}
                        {resumeContextLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 border border-blue-500/20">
                            <FileText className="h-3 w-3" />
                            {resumeContextLabel}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feature mission cards — horizontal layout */}
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">

                  {/* Interview Simulation */}
                  <button
                    onClick={startSimulation}
                    className="group relative overflow-hidden rounded-xl border border-[#171a21] bg-[#08090c] p-3 text-left shadow-md shadow-black/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20"
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-400/10 blur-2xl transition-all group-hover:bg-indigo-400/20" />
                    {/* Undraw-style interview illustration */}
                    <div className="absolute bottom-0 right-0 w-28 h-20 opacity-[0.28] pointer-events-none">
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
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-500/20">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Interview-Simulation</h4>
                      <p className="mt-1 text-xs leading-[1.5] text-slate-400">
                        Übe realistische Fragen im Probeinterview und erhalte direktes Feedback.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/12 px-3 py-2 text-xs font-semibold text-blue-100 transition-colors group-hover:bg-blue-500/18 min-h-[44px] md:min-h-0">
                        <Sparkles className="h-3.5 w-3.5" />
                        Interview-Simulation starten (Trainiert deine Antwortsicherheit)
                      </div>
                    </div>
                  </button>

                  {/* Stärkenanalyse */}
                  <button
                    onClick={() => setAssessmentDisclaimerOpen(true)}
                    className="group relative overflow-hidden rounded-xl border border-[#171a21] bg-[#08090c] p-3 text-left shadow-md shadow-black/30 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/20"
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-400/10 blur-2xl transition-all group-hover:bg-blue-400/20" />
                    {/* Undraw-style assessment illustration */}
                    <div className="absolute bottom-0 right-0 w-28 h-20 opacity-[0.28] pointer-events-none">
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
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-md shadow-blue-500/20">
                        <ClipboardList className="h-5 w-5 text-white" />
                      </div>
                      <h4 className="text-sm font-bold text-white">Stärkenanalyse</h4>
                      <p className="mt-1 text-xs leading-[1.5] text-slate-400">
                        Analysiere deine Stärken, Fähigkeiten und Karrierepotenziale strukturiert.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/12 px-3 py-2 text-xs font-semibold text-blue-100 transition-colors group-hover:bg-blue-500/18 min-h-[44px] md:min-h-0">
                        <ClipboardList className="h-3.5 w-3.5" />
                        Stärkenanalyse starten (Erstellt dein Kompetenzprofil)
                      </div>
                    </div>
                  </button>
                </div>

                {/* Schnell-Aktionen grid */}
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Schnell-Aktionen</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-3">
                    {SUGGESTIONS.map((s) => {
                      const locked = s.requiresResume && uploadedResumes.length === 0;
                      return (
                        <button
                          key={s.label}
                          onClick={() => {
                            if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; }
                            handleSend(s.prompt);
                          }}
                          className={`group flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all duration-200
                            ${locked
                              ? "cursor-not-allowed border-[#1C2333] bg-white/3 opacity-50"
                              : "border-[#1C2333] bg-[#131C2C] shadow-sm hover:-translate-y-1 hover:border-[#2D3748] hover:shadow-md"
                            }`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${locked ? "bg-slate-100" : s.iconCls}`}>
                            {locked
                              ? <Lock className="h-3.5 w-3.5 text-slate-300" />
                              : <s.icon className="h-4 w-4" />
                            }
                          </span>
                          <span className={`text-xs font-semibold leading-snug line-clamp-2 ${locked ? "text-slate-500" : "text-slate-200"}`}>
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
                    <div className={`max-w-[80%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-3
                        ${msg.role === "user"
                          ? "bg-blue-500 text-white rounded-xl rounded-br-sm shadow-sm text-sm leading-relaxed font-medium"
                          : "bg-[#111827] border border-[#273244] shadow-sm text-slate-200 rounded-xl rounded-bl-sm"
                        }`}
                      >
                        {msg.role === "user"
                          ? msg.content
                          : <MarkdownMessage text={msg.content} />
                        }
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing dots — only while API is loading, before streaming starts */}
                {isStreaming && !streamingMsg && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-[#111827] rounded-xl rounded-bl-sm px-4 py-3 border border-[#273244]">
                      <div className="flex items-center gap-1">
                        {[0, 150, 300].map((delay) => (
                          <div key={delay} className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Streaming message — typewriter reveal */}
                {streamingMsg && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm mb-0.5">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[80%] flex flex-col gap-1 items-start">
                      <div className="bg-[#111827] border border-[#273244] shadow-sm text-slate-200 rounded-xl rounded-bl-sm px-4 py-3">
                        <MarkdownMessage text={streamingMsg.shown} />
                        <span className="inline-block w-0.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── EU AI Act micro-disclaimer ────────────────────────────────── */}
          {!disclaimerDismissed && (
            <div className="flex-shrink-0 mx-4 mb-2 flex items-center gap-2 rounded-xl border border-[#1C2333] bg-[#131C2C] px-3 py-1.5">
              <Shield className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <p className="flex-1 text-[11px] text-slate-400 leading-relaxed">
                <strong className="text-slate-300">KI-Transparenz</strong> Dieses System arbeitet KI-gestützt und kann im Einzelfall ungenaue Einschätzungen liefern. Hinweis gemäß Art. 50 EU AI Act.
              </p>
              <button onClick={() => setDisclaimerDismissed(true)} className="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Input Bar ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-4 pb-4 pt-2 bg-black/90 backdrop-blur-sm border-t border-[#171a21]">
            {uploadedResumes.length > 0 && (
              <div className="sm:hidden mb-2">
                <select
                  value={selectedResumeId || ""}
                  onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-1.5 border border-[#1C2333] rounded-xl text-xs focus:outline-none bg-[#131C2C] text-slate-300"
                >
                  <option value="">Kein Lebenslauf</option>
                  {uploadedResumes.map((r) => (
                    <option key={r.id} value={r.id}>{r.filename || r.name || `Lebenslauf ${r.id}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Wand suggestion pills */}
            {wandOpen && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {WAND_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setWandOpen(false); inputRef.current?.focus(); }}
                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-colors text-left leading-snug"
                  >
                    {s.length > 60 ? s.slice(0, 60) + "…" : s}
                  </button>
                ))}
              </div>
            )}

            <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-[#1C2333] bg-[#131C2C] px-3 py-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] transition-all focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10">
              <Link
                to="/resume"
                title="anhang_hinzufügen (Einen Lebenslauf oder ein Dokument ergänzen)"
                className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all mb-0.5 hover:bg-white/5 hover:text-blue-300"
              >
                <Plus className="h-4 w-4" />
              </Link>
              {/* Wand button */}
              <button
                onClick={() => setWandOpen((v) => !v)}
                title="impulse_anzeigen (Passende Eingabevorschläge einblenden)"
                className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all mb-0.5 ${wandOpen ? "bg-blue-500/15 text-blue-300" : "text-slate-400 hover:bg-white/5 hover:text-blue-300"}`}
              >
                <Wand2 className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Deine Anfrage an JobAssist formulieren…"
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-[16px] sm:text-sm leading-relaxed max-h-32 text-slate-200 placeholder:text-slate-500 py-1.5"
                style={{ minHeight: "36px" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming || !!streamingMsg}
                title="anfrage_senden (Deine Nachricht sicher an die Analyse übergeben)"
                className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/20 transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right Context Panel (desktop only) ────────────────────────── */}
        <aside className="hidden xl:flex w-[272px] flex-shrink-0 flex-col gap-3">

          {/* Kontext-Fenster header */}
          <div className="rounded-2xl border border-[#1C2333] bg-[#131C2C] shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1C2333]">
              <div className="w-6 h-6 rounded-lg bg-blue-500/12 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <span className="text-xs font-bold text-slate-200">Kontext-Fenster</span>
            </div>

            {contextJob ? (
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Aktive Stelle</p>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5">
                    <p className="text-sm font-bold text-white leading-snug">{contextJob.role || "Ohne Titel"}</p>
                    <p className="text-xs text-slate-300 mt-1">{contextJob.company || "Unbekannt"}</p>
                    {contextJob.status && (
                      <span className={`mt-3 inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        contextJob.status === "interviewing" ? "bg-blue-500/15 text-blue-300" :
                        contextJob.status === "applied" ? "bg-emerald-500/15 text-emerald-300" :
                        "bg-white/5 text-slate-300"
                      }`}>
                        {contextJob.status === "interviewing" ? "Gespräch" : contextJob.status === "applied" ? "Beworben" : "Gespeichert"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Schnellaktionen</p>
                  {[
                    { label: "Interview vorbereiten", prompt: `Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.` },
                    { label: "Anschreiben erstellen", prompt: `Schreib ein Anschreiben für "${contextJob.role}" bei ${contextJob.company}.` },
                    { label: "Stellenanforderungen", prompt: `Welche Qualifikationen sind typisch für die Stelle "${contextJob.role}"?` },
                  ].map((a) => (
                    <button
                      key={a.label}
                      onClick={() => handleSend(a.prompt)}
                      className="w-full flex items-center gap-2.5 rounded-xl border border-[#1C2333] bg-[#0D1117] px-3 py-2.5 text-left text-xs font-semibold text-slate-200 hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-200 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-blue-400" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 text-center">
                <Briefcase className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Keine aktive Stelle gefunden.</p>
                <p className="text-[11px] text-slate-300 mt-1">Speichere eine Stelle unter „Bewerbungen" um sie hier zu sehen.</p>
              </div>
            )}
          </div>

          {/* Resume context */}
          {contextResume && (
            <div className="rounded-2xl border border-[#1C2333] bg-[#131C2C] shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Lebenslauf</p>
              <div className="flex items-center justify-center gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-3">
                <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-100 truncate">{contextResume.filename || "Lebenslauf"}</p>
                  <p className="text-[11px] text-slate-400">Aktiv für Analysen</p>
                </div>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
    {/* ── EU AI Act Transparency Disclaimer Modal ───────────────────────── */}
    {assessmentDisclaimerOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => { if (e.target === e.currentTarget) setAssessmentDisclaimerOpen(false); }}
      >
        <div className="w-full max-w-md rounded-2xl border border-[#1C2333] bg-[#0D1117] shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[#1C2333] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/15">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">KI-Transparenzhinweis</h2>
                <p className="text-[11px] text-slate-400">Hinweis gemäß Art. 50 EU AI Act vor der Analyse</p>
              </div>
            </div>
            <button
              onClick={() => setAssessmentDisclaimerOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-semibold text-slate-100">
              Diese Analyse nutzt ein KI-System, um deine Eingaben strukturiert auszuwerten und berufliche Empfehlungen abzuleiten.
            </p>
            <ul className="space-y-2">
              {[
                "Deine Angaben werden ausschließlich für diese Karriere-Auswertung und zugehörige Empfehlungen verarbeitet.",
                "Es erfolgt keine automatisierte Endentscheidung über deine Eignung oder eine konkrete Einstellung.",
                "Die Auswertung dient als fachliche Orientierung und ersetzt keine verbindliche Karriere- oder Rechtsberatung.",
                "Bewertet werden ausschließlich textbasierte Angaben; verdeckte Persönlichkeitsprofile werden nicht abgeleitet.",
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-[11px] text-blue-100">
              <strong>Du interagierst mit einem KI-System.</strong> Prüfe wichtige Empfehlungen sorgfältig und ziehe bei verbindlichen Entscheidungen qualifizierte Beratung hinzu.
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-[#1C2333] px-5 py-4">
            <button
              onClick={() => setAssessmentDisclaimerOpen(false)}
              className="rounded-xl border border-[#273244] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={startAssessment}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm shadow-blue-500/20"
            >
              Stärkenanalyse starten (Erstellt dein Kompetenzprofil)
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
