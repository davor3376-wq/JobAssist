import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Bot, Send, Sparkles, FileText, Briefcase, GraduationCap, Euro, Lightbulb, Trash2, Lock } from "lucide-react";
import { resumeApi, aiAssistantApi } from "../services/api";
import useUsageGuard from "../hooks/useUsageGuard";

const SUGGESTIONS = [
  { icon: FileText, label: "Lebenslauf verbessern", prompt: "Kannst du meinen Lebenslauf analysieren und Verbesserungsvorschläge machen?", requiresResume: true },
  { icon: Briefcase, label: "Bewerbungstipps", prompt: "Was sind die wichtigsten Tipps für eine erfolgreiche Bewerbung in Österreich?" },
  { icon: GraduationCap, label: "Praktikum finden", prompt: "Wie finde ich ein gutes Praktikum in Österreich als Student?" },
  { icon: Euro, label: "Gehaltsauskunft", prompt: "Was kann ich als Berufseinsteiger in Österreich an Gehalt erwarten?" },
  { icon: Lightbulb, label: "Vorstellungsgespräch", prompt: "Wie bereite ich mich am besten auf ein Vorstellungsgespräch in Österreich vor?" },
  { icon: Sparkles, label: "Motivationsschreiben", prompt: "Kannst du mir Tipps für ein überzeugendes Motivationsschreiben geben?" },
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { guardedRun, atLimit } = useUsageGuard("ai_chat");

  const { data: uploadedResumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (data) => aiAssistantApi.chat(data),
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
    },
    onError: () => {
      toast.error("Fehler bei der KI-Antwort");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Entschuldigung, es gab einen Fehler. Bitte versuche es erneut." },
      ]);
    },
  });

  const handleSend = (text) => {
    const message = text || input.trim();
    if (!message) return;

    guardedRun(() => {
      const userMsg = { role: "user", content: message };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");

      const data = {
        message,
        history: messages.slice(-10),
      };

      if (selectedResumeId) {
        data.resume_id = selectedResumeId;
      }

      chatMutation.mutate(data);
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col animate-slide-up h-[calc(100svh-160px)] md:h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              KI-Bewerbungsassistent
            </h1>
            <p className="text-gray-600 mt-0.5 text-sm sm:text-base hidden sm:block">
              Dein intelligenter Helfer für Bewerbungen in Österreich
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-2 sm:px-3 sm:py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1.5 flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Chat leeren</span>
            </button>
          )}
        </div>

        {/* Resume context selector */}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500">Kontext:</span>
          <select
            value={selectedResumeId || ""}
            onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
            className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Ohne Lebenslauf</option>
            {uploadedResumes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.filename || r.name || `Lebenslauf ${r.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 mb-3 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 sm:mb-4">
              <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-1 text-sm sm:text-base">Hallo! Wie kann ich dir helfen?</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-4 sm:mb-6 text-center max-w-md">
              Ich bin dein KI-Bewerbungsassistent für Österreich. Stelle mir Fragen zu Bewerbungen, Lebensläufen, Motivationsschreiben oder Vorstellungsgesprächen.
            </p>

            {/* Suggestion chips */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => {
                const locked = s.requiresResume && uploadedResumes.length === 0;
                return (
                  <button
                    key={s.label}
                    onClick={() => {
                      if (locked) {
                        toast("Lade zuerst einen Lebenslauf hoch um diese Funktion zu nutzen.", { icon: "📄" });
                        return;
                      }
                      handleSend(s.prompt);
                    }}
                    className={`flex items-center gap-2 px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-lg border transition-all text-left min-w-0 ${
                      locked
                        ? "border-gray-100 bg-gray-50 cursor-not-allowed"
                        : "border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  >
                    {locked
                      ? <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-300 flex-shrink-0" />
                      : <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                    }
                    <span className={`text-xs sm:text-sm font-medium truncate ${locked ? "text-gray-300" : "text-gray-700"}`}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-blue-600">KI-Assistent</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-xs text-gray-500">Denkt nach...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 bg-white border border-gray-200 rounded-lg p-2.5 sm:p-3 flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Stelle eine Frage..."
          rows={1}
          className="flex-1 resize-none border-0 focus:outline-none text-sm leading-relaxed max-h-32"
          style={{ minHeight: "36px" }}
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || chatMutation.isPending}
          className="p-2 sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Senden</span>
        </button>
      </div>
    </div>
  );
}
