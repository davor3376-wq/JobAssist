import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Bot, Send, Sparkles, FileText, Briefcase, GraduationCap,
  Euro, Lightbulb, Trash2, Lock, Plus, MessageSquare, Clock,
  ClipboardList, Search, ChevronLeft, ChevronDown, Shield, X,
  Wand2, Target, Zap, ArrowRight,
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
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center mt-0.5">{olStart + j}</span>
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
      elements.push(<h3 key={i} className="text-sm font-extrabold text-slate-100 mt-3 mb-0.5 tracking-tight">{renderInline(line.slice(4))}</h3>);
    } else if (/^##\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h2 key={i} className="text-base font-extrabold text-slate-100 mt-4 mb-1 tracking-tight">{renderInline(line.slice(3))}</h2>);
    } else if (/^#\s/.test(line)) {
      flushList(`fl${i}`);
      elements.push(<h1 key={i} className="text-lg font-extrabold text-slate-100 mt-4 mb-1 tracking-tight">{renderInline(line.slice(2))}</h1>);
    } else if (/^---+$/.test(line.trim())) {
      flushList(`fl${i}`);
      elements.push(<hr key={i} className="my-3 border-[#273244]" />);
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
      elements.push(<p key={i} className="text-sm leading-relaxed font-medium text-slate-200">{renderInline(line)}</p>);
    }
  });
  flushList("end");
  return <div className="space-y-0.5">{elements}</div>;
}

// ─── Resume Dropdown ─────────────────────────────────────────────────────────

function ResumeDropdown({ resumes, selectedId, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = resumes.find((r) => r.id === selectedId);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#1C2333] bg-[#131C2C] text-xs text-slate-300 hover:border-blue-500/30 transition-colors max-w-[160px]"
      >
        <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
        <span className="truncate flex-1 min-w-0">{selected ? selected.filename : "Kein Lebenslauf"}</span>
        <ChevronDown className={`w-3 h-3 text-slate-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-60 rounded-xl border border-[#1C2333] bg-[#0D1117] shadow-xl shadow-black/50 z-50 overflow-hidden py-1">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full px-3 py-2.5 text-left text-xs transition-colors ${!selectedId ? "text-blue-300 bg-blue-500/10" : "text-slate-400 hover:bg-white/5"}`}
          >
            Kein Lebenslauf
          </button>
          {resumes.map((r) => (
            <button
              key={r.id}
              onClick={() => { onSelect(r.id); setOpen(false); }}
              className={`w-full px-3 py-2.5 text-left text-xs truncate transition-colors ${selectedId === r.id ? "text-blue-300 bg-blue-500/10" : "text-slate-300 hover:bg-white/5"}`}
            >
              {r.filename || `Lebenslauf ${r.id}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const STARTER_MISSIONS = [
  { icon: MessageSquare, label: "Interview-Simulation starten", color: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
  { icon: ClipboardList, label: "Karriere-Analyse starten", color: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
  { icon: FileText, label: "Lebenslauf analysieren", color: "text-blue-300 bg-blue-500/10 border-blue-500/20" },
  { icon: Briefcase, label: "Bewerbungsstrategie öffnen", color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
];

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
  const { guardedRun, atLimit: chatAtLimit } = useUsageGuard("ai_chat");
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

  // Auto-scroll effect for streaming messages - scroll on every content change
  useEffect(() => {
    if (streamingMsg) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [streamingMsg?.shown, streamingMsg?.shown?.length]);
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
              { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.", isError: true },
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
      setSimulationMode(false);
      setAssessmentMode(false);
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

  // ── Shared: conversation list renderer ──────────────────────────────────────
  const renderConvList = () => {
    if (filteredConversations.length === 0 && conversations.length > 0)
      return <p className="px-2 py-4 text-center text-xs text-slate-400">Keine Treffer</p>;
    const now = Date.now();
    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;
    const weekAgo = today - 604800000;
    const groups = {
      today:     { label: "Heute",        convs: [] },
      yesterday: { label: "Gestern",      convs: [] },
      thisWeek:  { label: "Diese Woche",  convs: [] },
      older:     { label: "Älter",        convs: [] },
    };
    filteredConversations.forEach((conv) => {
      const d = new Date(conv.updatedAt).setHours(0, 0, 0, 0);
      if (d === today) groups.today.convs.push(conv);
      else if (d === yesterday) groups.yesterday.convs.push(conv);
      else if (conv.updatedAt > weekAgo) groups.thisWeek.convs.push(conv);
      else groups.older.convs.push(conv);
    });
    return Object.entries(groups).map(([key, group]) => {
      if (!group.convs.length) return null;
      return (
        <div key={key} className="mb-2">
          <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">{group.label}</p>
          {group.convs.map((conv) => {
            const cat = getConvCategory(conv);
            return (
              <button
                key={conv.id}
                title={conv.title}
                onClick={() => handleSelectConversation(conv)}
                className={`group w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 mb-0.5
                  ${conv.id === activeId
                    ? "bg-blue-500/15 border border-blue-500/30"
                    : "border border-transparent hover:bg-white/[0.03] hover:border-[#1C2333]"
                  }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  <span className={`mt-0.5 text-xs font-bold px-2 py-0.5 rounded-full ${cat.cls}`}>{cat.label}</span>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-0.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="truncate text-xs font-medium text-slate-200 leading-snug mb-1">{conv.title}</p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{relativeTime(conv.updatedAt)}</span>
                  <span className="opacity-40">·</span>
                  <span>{conv.messages.filter((m) => m.role === "user").length} Nachr.</span>
                </div>
              </button>
            );
          })}
        </div>
      );
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
    {/* Full-height chat container — escapes Layout padding via negative margins */}
    <div className="h-[calc(100svh-156px)] lg:h-[calc(100svh-64px)] flex flex-col animate-slide-up -mx-4 md:-mx-8 -mt-5 md:-mt-8">

      {/* ── Global header ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 md:px-5 py-2.5 border-b border-[#171a21] bg-[#05060a]">
        <div className="flex items-center gap-2">
          <button onClick={() => setSidebarOpen((v) => !v)} className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:bg-white/5 transition-colors flex-shrink-0">
            <MessageSquare className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block">KI-Assistent</span>
          </div>
          <span className="hidden lg:block text-xs text-slate-500 truncate max-w-xs">
            {activeId ? (conversations.find(c => c.id === activeId)?.title || "Gespräch") : "Neues Gespräch"}
          </span>
        </div>
        <button onClick={handleNewChat} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Neu</span>
        </button>
      </div>

      {/* ── Body: 3-column terminal ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_1fr_300px]">

        {/* ── Left sidebar: Starter Missionen + History ───────────────────── */}
        <aside className="hidden lg:flex flex-col border-r border-[#171a21] bg-[#05060a] overflow-hidden">

          {/* Starter Missionen */}
          <div className="flex-shrink-0 px-2 pt-3 pb-2 border-b border-[#171a21]">
            <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Missionen</p>
            {!chatAtLimit && (
              <button onClick={startSimulation} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/15 text-left transition-colors mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-indigo-300">Interview-Simulation</span>
              </button>
            )}
            <button onClick={() => setAssessmentDisclaimerOpen(true)} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-left transition-colors mb-1">
              <ClipboardList className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-300">Karriere-Analyse</span>
            </button>
            <button
              onClick={() => { if (uploadedResumes.length === 0) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; } handleSend(SUGGESTIONS[0].prompt); }}
              disabled={chatAtLimit}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-violet-500/20 bg-violet-500/10 hover:bg-violet-500/15 text-left transition-colors disabled:opacity-40 mb-1"
            >
              <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${uploadedResumes.length === 0 ? "text-slate-600" : "text-violet-400"}`} />
              <span className={`text-xs font-semibold flex-1 ${uploadedResumes.length === 0 ? "text-slate-500" : "text-violet-300"}`}>Lebenslauf analysieren</span>
              {uploadedResumes.length === 0 && <Lock className="w-3 h-3 text-slate-600 flex-shrink-0" />}
            </button>
            <button
              onClick={() => handleSend(SUGGESTIONS[1].prompt)}
              disabled={chatAtLimit}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15 text-left transition-colors disabled:opacity-40"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-amber-300">Bewerbungsstrategie</span>
            </button>
          </div>

          {/* History */}
          <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1C2333] [&::-webkit-scrollbar-thumb]:rounded-full">
            {conversations.length > 0 && (
              <>
                <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">Verlauf</p>
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
              </>
            )}
            {renderConvList()}
          </div>
        </aside>

        {/* ── Center Chat ──────────────────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-black min-h-0">

          {/* Simulation mode compact indicator */}
          {simulationMode && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-[#171a21] bg-indigo-500/10">
              <span className="text-xs font-bold text-indigo-300">Interview-Simulator aktiv</span>
              <div className="flex flex-wrap gap-1 ml-auto">
                {simulatorActions.map((action) => (
                  <button key={action.label} onClick={() => handleSend(action.prompt)}
                    className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors">
                    {action.label}
                  </button>
                ))}
                <button onClick={() => setSimulationMode(false)}
                  className="rounded-full border border-[#273244] px-2 py-0.5 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Assessment mode compact indicator */}
          {assessmentMode && (
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-1.5 border-b border-[#171a21] bg-emerald-500/10">
              <span className="text-xs font-bold text-emerald-300">Stärkenanalyse aktiv</span>
              <div className="flex flex-wrap gap-1 ml-auto">
                {assessmentActions.map((action) => (
                  <button key={action.label} onClick={() => handleSend(action.prompt)}
                    className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                    {action.label}
                  </button>
                ))}
                <button onClick={() => setAssessmentMode(false)}
                  className="rounded-full border border-[#273244] px-2 py-0.5 text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* ── Messages area ─────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 min-h-0 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1C2333] [&::-webkit-scrollbar-thumb]:rounded-full">
            {messages.length === 0 ? (

              /* ── Empty-state ─────────────────────────────────────────── */
              <div className="flex flex-col gap-4 py-1">
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
                      {contextJob && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => handleSend(`Bereite mich auf das Interview für "${contextJob.role}" bei ${contextJob.company} vor.`)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-400 transition-colors shadow-sm shadow-blue-500/20"
                          >
                            <Zap className="h-3 w-3" />
                            Interview: {contextJob.role}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            ) : (

              /* ── Message bubbles ─────────────────────────────────────── */
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex items-end gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-0.5"
                        style={{ boxShadow: "0 0 14px rgba(91,79,232,0.45)" }}>
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[82%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-3 overflow-hidden rounded-xl backdrop-blur-sm
                        ${msg.role === "user"
                          ? "bg-indigo-600/90 text-white rounded-br-sm text-sm leading-relaxed font-medium"
                          : msg.isError
                            ? "bg-red-500/10 border border-red-500/30 text-red-200 rounded-bl-sm text-sm leading-relaxed"
                            : "bg-[#0d1117]/90 border border-[#1e2a3a] text-slate-200 rounded-bl-sm text-sm leading-relaxed"
                        }`}
                        style={msg.role === "user"
                          ? { boxShadow: "0 2px 20px rgba(99,102,241,0.40)" }
                          : !msg.isError
                            ? { boxShadow: "0 2px 16px rgba(91,79,232,0.15), inset 0 1px 0 rgba(255,255,255,0.04)" }
                            : {}
                        }
                      >
                        {msg.role === "user" ? msg.content : <MarkdownMessage text={msg.content} />}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Typing dots */}
                {isStreaming && !streamingMsg && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center"
                      style={{ boxShadow: "0 0 14px rgba(91,79,232,0.45)" }}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-[#0d1117] rounded-xl rounded-bl-sm px-4 py-3 border border-[#1e2a3a]"
                      style={{ boxShadow: "0 2px 16px rgba(91,79,232,0.15)" }}>
                      <div className="flex items-center gap-1">
                        {[0, 150, 300].map((delay) => (
                          <div key={delay} className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Streaming message */}
                {streamingMsg && (
                  <div className="flex items-end gap-2.5 justify-start">
                    <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-0.5"
                      style={{ boxShadow: "0 0 14px rgba(91,79,232,0.45)" }}>
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="max-w-[82%] items-start">
                      <div className="bg-[#0d1117]/90 border border-[#1e2a3a] text-slate-200 rounded-xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed overflow-hidden backdrop-blur-sm"
                        style={{ boxShadow: "0 2px 16px rgba(91,79,232,0.15), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                        <MarkdownMessage text={streamingMsg.shown} />
                        <span className="inline-block w-0.5 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* ── Mobile persistent quick-actions strip ───────────────────── */}
          <div className="lg:hidden flex-shrink-0 border-t border-[#171a21] bg-[#05060a]">
            <div className="flex gap-2 overflow-x-auto px-3 py-2 [&::-webkit-scrollbar]:hidden">
              {!chatAtLimit && (
                <button onClick={startSimulation} className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 whitespace-nowrap">
                  <MessageSquare className="w-3.5 h-3.5" /> Interview-Sim.
                </button>
              )}
              <button onClick={() => setAssessmentDisclaimerOpen(true)} className="flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 whitespace-nowrap">
                <ClipboardList className="w-3.5 h-3.5" /> Stärkenanalyse
              </button>
              {SUGGESTIONS.map((s) => {
                const locked = s.requiresResume && uploadedResumes.length === 0;
                return (
                  <button key={s.label} onClick={() => { if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; } handleSend(s.prompt); }}
                    disabled={chatAtLimit}
                    className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl border border-[#1C2333] bg-[#0d1117] px-3 py-1.5 text-xs font-medium whitespace-nowrap disabled:opacity-40 ${locked ? "text-slate-500 opacity-50" : "text-slate-300"}`}>
                    {locked ? <Lock className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5 text-slate-400" />}
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── EU AI Act micro-disclaimer ──────────────────────────────── */}
          {!disclaimerDismissed && (
            <div className="flex-shrink-0 mx-4 mb-2 flex items-center gap-2 rounded-xl border border-[#1C2333] bg-[#131C2C] px-3 py-1.5">
              <Shield className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <p className="flex-1 text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">KI-Transparenz</strong> Dieses System arbeitet KI-gestützt. Hinweis gemäß Art. 50 EU AI Act.
              </p>
              <button onClick={() => setDisclaimerDismissed(true)} className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* ── Sticky Input Bar ────────────────────────────────────────── */}
          <div className="flex-shrink-0 px-3 pb-3 pt-2 bg-black/95 backdrop-blur-sm border-t border-[#171a21]">
            {wandOpen && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {WAND_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => { setInput(s); setWandOpen(false); inputRef.current?.focus(); }}
                    className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/15 transition-colors text-left leading-snug">
                    {s.length > 60 ? s.slice(0, 60) + "…" : s}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-[#1C2333] bg-[#131C2C] px-3 py-2 transition-all focus-within:border-blue-500/40 focus-within:ring-2 focus-within:ring-blue-500/10"
              style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)" }}>
              <button onClick={() => setWandOpen((v) => !v)} title="Vorschläge"
                className={`flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-xl transition-all mb-0.5 ${wandOpen ? "bg-blue-500/15 text-blue-300" : "text-slate-400 hover:bg-white/5 hover:text-blue-300"}`}>
                <Wand2 className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Schreib direkt oder wähle eine Aktion…"
                rows={1}
                className="flex-1 resize-none bg-transparent border-0 focus:outline-none text-[16px] sm:text-sm leading-relaxed max-h-32 text-slate-200 placeholder:text-slate-500 py-1.5"
                style={{ minHeight: "36px" }}
              />
              <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming || !!streamingMsg} title="Senden"
                className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition-all hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
                style={{ boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}>
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar: Resume + Schnell-Aktionen ─────────────────────── */}
        <aside className="hidden lg:flex flex-col border-l border-[#171a21] bg-[#05060a] overflow-hidden">

          {/* Resume select */}
          <div className="flex-shrink-0 px-3 pt-3 pb-3 border-b border-[#171a21]">
            <p className="pb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Lebenslauf</p>
            <select
              value={selectedResumeId || ""}
              onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#1C2333] bg-[#131C2C] text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
            >
              <option value="">Kein Lebenslauf</option>
              {uploadedResumes.map((r) => (
                <option key={r.id} value={r.id}>{r.filename || `Lebenslauf ${r.id}`}</option>
              ))}
            </select>
            {selectedResumeId && (
              <p className="mt-1.5 text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                Aktiv im Kontext
              </p>
            )}
          </div>

          {/* Schnell-Aktionen — kompakte Liste */}
          <div className="flex-shrink-0 px-2 py-2 border-b border-[#171a21]">
            <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Schnell-Aktionen</p>
            <div className="space-y-0.5">
              {SUGGESTIONS.map((s) => {
                const locked = s.requiresResume && uploadedResumes.length === 0;
                const colorCls = s.iconCls || "text-blue-400 bg-blue-500/10";
                const [iconColor] = colorCls.split(" ");
                return (
                  <button
                    key={s.label}
                    onClick={() => { if (locked) { toast("Lade zuerst einen Lebenslauf hoch.", { icon: "📄" }); return; } handleSend(s.prompt); }}
                    disabled={chatAtLimit}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-left transition-colors disabled:opacity-40 group cursor-pointer"
                  >
                    {locked
                      ? <Lock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      : <s.icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
                    }
                    <span className="text-xs text-slate-300 group-hover:text-slate-100 transition-colors leading-tight flex-1">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gesprächsverlauf — für PC-Nutzer */}
          <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1C2333] [&::-webkit-scrollbar-thumb]:rounded-full">
            <p className="px-2 pb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">Verlauf</p>
            {conversations.length === 0 ? (
              <p className="px-2 py-3 text-xs text-slate-500 text-center">Noch keine Gespräche</p>
            ) : (
              <div className="space-y-0.5">
                {conversations.slice(0, 15).map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-xs truncate ${
                      conv.id === activeId
                        ? "bg-indigo-500/15 text-indigo-200 border border-indigo-500/25"
                        : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    {conv.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>

    {/* ── Mobile history slide-in ─────────────────────────────────────────── */}
    {sidebarOpen && (
      <div className="lg:hidden fixed inset-0 z-40 flex">
        <aside className="w-72 flex flex-col bg-[#05060a] border-r border-[#171a21] overflow-hidden">
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#171a21]">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-xs font-bold text-slate-200">Verlauf</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-white/5">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1C2333] [&::-webkit-scrollbar-thumb]:rounded-full">
            {conversations.length > 0 && (
              <div className="flex items-center gap-2 bg-[#131C2C] border border-[#1C2333] rounded-xl px-3 py-2 mx-1 mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Gespräche suchen…"
                  className="flex-1 bg-transparent text-xs text-slate-300 placeholder:text-slate-500 focus:outline-none min-w-0" />
              </div>
            )}
            {renderConvList()}
          </div>
        </aside>
        <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
      </div>
    )}

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
                <p className="text-xs text-slate-400">Hinweis gemäß Art. 50 EU AI Act vor der Analyse</p>
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
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-100">
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
              Stärkenanalyse starten
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
