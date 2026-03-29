import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PenLine, Sparkles, Copy, Check, Download, Loader2, ChevronDown, FileText, User, Building2, AlignLeft } from "lucide-react";
import toast from "react-hot-toast";
import { motivationsschreibenApi, resumeApi } from "../services/api";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

const TONE_OPTIONS = [
  { value: "formell", label: "Formell", desc: "Klassisch und professionell" },
  { value: "modern", label: "Modern", desc: "Zeitgemäß und direkt" },
  { value: "kreativ", label: "Kreativ", desc: "Persönlich und einprägsam" },
];

function loadStoredResumes() {
  try {
    const raw = localStorage.getItem("resumes");
    return raw ? JSON.parse(raw) : undefined;
  } catch { return undefined; }
}

export default function MotivationsschreibenPage() {
  const { guardedRun } = useUsageGuard("cover_letter");

  const [form, setForm] = useState({
    resume_id: "",
    company: "",
    role: "",
    job_description: "",
    tone: "formell",
    applicant_name: "",
    applicant_address: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: resumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => {
      try { localStorage.setItem("resumes", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => loadStoredResumes(),
    staleTime: 1000 * 60 * 2,
  });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleGenerate = () => {
    if (!form.resume_id && !form.job_description.trim()) {
      toast.error("Bitte wähle einen Lebenslauf oder gib eine Stellenbeschreibung ein.");
      return;
    }
    guardedRun(async () => {
      setLoading(true);
      try {
        const res = await motivationsschreibenApi.generate({
          resume_id: form.resume_id ? Number(form.resume_id) : null,
          company: form.company,
          role: form.role,
          job_description: form.job_description,
          tone: form.tone,
          applicant_name: form.applicant_name,
          applicant_address: form.applicant_address,
        });
        setResult(res.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Fehler beim Generieren"));
      } finally {
        setLoading(false);
      }
    });
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text).then(() => {
      setCopied(true);
      toast.success("Kopiert!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!result?.text) return;
    const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Motivationsschreiben_${result.company || "JobAssist"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md shadow-violet-200">
            <PenLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Motivationsschreiben</h1>
            <p className="text-sm text-gray-500">KI-generiertes Motivationsschreiben auf Deutsch</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="space-y-5">
          {/* Resume selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-violet-500" /> Lebenslauf (optional)
            </label>
            <select
              value={form.resume_id}
              onChange={set("resume_id")}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            >
              <option value="">Keinen Lebenslauf verwenden</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.filename || `Lebenslauf ${r.id}`}</option>
              ))}
            </select>
          </div>

          {/* Position info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-violet-500" /> Stelle & Unternehmen
            </label>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Unternehmen</label>
              <input
                type="text"
                value={form.company}
                onChange={set("company")}
                placeholder="z.B. Siemens AG"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Position / Berufsbezeichnung</label>
              <input
                type="text"
                value={form.role}
                onChange={set("role")}
                placeholder="z.B. Software Engineer"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Stellenbeschreibung</label>
              <textarea
                value={form.job_description}
                onChange={set("job_description")}
                rows={4}
                placeholder="Füge hier die Stellenbeschreibung ein…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
              />
            </div>
          </div>

          {/* Tone */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <AlignLeft className="w-3.5 h-3.5 text-violet-500" /> Schreibstil
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TONE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, tone: t.value }))}
                  className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all ${
                    form.tone === t.value
                      ? "border-violet-500 bg-violet-50 shadow-sm"
                      : "border-gray-100 bg-gray-50 hover:border-violet-200"
                  }`}
                >
                  <span className={`text-sm font-bold ${form.tone === t.value ? "text-violet-700" : "text-gray-700"}`}>{t.label}</span>
                  <span className="text-[10px] text-gray-400 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced (applicant info) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-violet-500" /> Persönliche Angaben (optional)
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                <div className="pt-4">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Vor- und Nachname</label>
                  <input
                    type="text"
                    value={form.applicant_name}
                    onChange={set("applicant_name")}
                    placeholder="z.B. Max Mustermann"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={form.applicant_address}
                    onChange={set("applicant_address")}
                    placeholder="z.B. Hauptstraße 1, 1010 Wien"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Wird generiert…" : "Motivationsschreiben generieren"}
          </button>
        </div>

        {/* Right: Output */}
        <div className="flex flex-col">
          {result ? (
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <p className="text-sm font-bold text-gray-900">Generiertes Schreiben</p>
                  {result.company && result.role && (
                    <p className="text-xs text-gray-400 mt-0.5">{result.role} · {result.company}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Kopiert" : "Kopieren"}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    TXT
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-sans">{result.text}</pre>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-10 text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                <PenLine className="w-8 h-8 text-violet-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Noch kein Schreiben generiert</p>
              <p className="text-xs text-gray-400 max-w-xs">
                Fülle das Formular links aus und klicke auf „Generieren". Das Motivationsschreiben erscheint hier.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
