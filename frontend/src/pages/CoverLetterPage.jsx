import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { FileText, Sparkles, Copy, Download, RefreshCw, Building2, Briefcase, ClipboardList } from "lucide-react";
import { resumeApi, resumeDataApi, motivationsschreibenApi } from "../services/api";

const TONES = [
  { value: "formell", label: "Formell", desc: "Klassisch und professionell" },
  { value: "modern", label: "Modern", desc: "Dynamisch und zeitgemäß" },
  { value: "kreativ", label: "Kreativ", desc: "Individuell und persönlich" },
];

export default function CoverLetterPage() {
  const [selectedResumeType, setSelectedResumeType] = useState("uploaded"); // "uploaded" | "created"
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("formell");
  const [applicantName, setApplicantName] = useState("");
  const [applicantAddress, setApplicantAddress] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [editedText, setEditedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Fetch uploaded resumes
  const { data: uploadedResumes = [] } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then((r) => r.data),
  });

  // Fetch created resumes
  const { data: createdResumes = [] } = useQuery({
    queryKey: ["resume-data"],
    queryFn: () => resumeDataApi.list().then((r) => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: (data) => motivationsschreibenApi.generate(data),
    onSuccess: (res) => {
      setGeneratedText(res.data.text);
      setEditedText(res.data.text);
      setIsEditing(false);
      toast.success("Motivationsschreiben erstellt!");
    },
    onError: () => toast.error("Fehler beim Erstellen des Motivationsschreibens"),
  });

  const handleGenerate = () => {
    if (!jobDescription && !selectedResumeId) {
      toast.error("Bitte gib eine Stellenbeschreibung ein oder wähle einen Lebenslauf aus");
      return;
    }

    const data = {
      company,
      role,
      job_description: jobDescription,
      tone,
      applicant_name: applicantName,
      applicant_address: applicantAddress,
    };

    if (selectedResumeType === "uploaded" && selectedResumeId) {
      data.resume_id = selectedResumeId;
    } else if (selectedResumeType === "created" && selectedResumeId) {
      data.resume_data_id = selectedResumeId;
    }

    generateMutation.mutate(data);
  };

  const handleCopy = () => {
    const text = isEditing ? editedText : generatedText;
    navigator.clipboard.writeText(text);
    toast.success("In die Zwischenablage kopiert!");
  };

  const handleDownload = () => {
    const text = isEditing ? editedText : generatedText;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Motivationsschreiben_${company || "Bewerbung"}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Datei heruntergeladen!");
  };

  const resumes = selectedResumeType === "uploaded" ? uploadedResumes : createdResumes;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-slide-up">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
          Motivationsschreiben
        </h1>
        <p className="text-gray-600 mt-1">
          Erstelle ein überzeugendes Motivationsschreiben für deine Bewerbung
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="space-y-5">
          {/* Resume Selection */}
          <div className="card bg-white border border-gray-200 shadow-sm p-5 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">Lebenslauf auswählen</h2>
            </div>

            {/* Resume type toggle */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setSelectedResumeType("uploaded"); setSelectedResumeId(null); }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedResumeType === "uploaded"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Hochgeladen
              </button>
              <button
                type="button"
                onClick={() => { setSelectedResumeType("created"); setSelectedResumeId(null); }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedResumeType === "created"
                    ? "bg-blue-100 text-blue-700 border border-blue-300"
                    : "bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                }`}
              >
                Erstellt
              </button>
            </div>

            <select
              value={selectedResumeId || ""}
              onChange={(e) => setSelectedResumeId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Lebenslauf auswählen (optional)</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name || r.full_name || `Lebenslauf ${r.id}`}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Dein Lebenslauf wird als Basis für das Motivationsschreiben verwendet
            </p>
          </div>

          {/* Job Details */}
          <div className="card bg-white border border-gray-200 shadow-sm p-5 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-green-600" />
              <h2 className="font-semibold text-gray-900">Stellendetails</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unternehmen</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="z.B. Wiener Stadtwerke, Red Bull, OMV"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stellenbezeichnung</label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="z.B. Praktikant/in Marketing, Verkäufer/in"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stellenbeschreibung
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Füge hier die Stellenbeschreibung ein..."
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Applicant Info (optional) */}
          <div className="card bg-white border border-gray-200 shadow-sm p-5 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-5 h-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900">Absender (optional)</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dein Name</label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="Max Mustermann"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deine Adresse</label>
                <input
                  type="text"
                  value={applicantAddress}
                  onChange={(e) => setApplicantAddress(e.target.value)}
                  placeholder="Musterstraße 1, 1010 Wien"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tone Selection */}
          <div className="card bg-white border border-gray-200 shadow-sm p-5 rounded-lg">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-gray-900">Stil</h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTone(t.value)}
                  className={`px-3 py-3 rounded-lg text-sm font-medium transition-all border ${
                    tone === t.value
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="text-xs mt-0.5 text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generateMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Wird generiert...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Motivationsschreiben generieren
              </>
            )}
          </button>
        </div>

        {/* Right: Generated Output */}
        <div className="space-y-4">
          <div className="card bg-white border border-gray-200 shadow-sm rounded-lg min-h-[600px] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-600" />
                <h2 className="font-semibold text-gray-900">Ergebnis</h2>
              </div>
              {generatedText && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    {isEditing ? "Vorschau" : "Bearbeiten"}
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Kopieren
                  </button>
                  <button
                    onClick={handleDownload}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generateMutation.isPending}
                    className="px-2.5 py-1.5 rounded text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Neu
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 p-5">
              {generateMutation.isPending ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-500">KI erstellt dein Motivationsschreiben...</p>
                </div>
              ) : generatedText ? (
                isEditing ? (
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full h-full min-h-[500px] px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono leading-relaxed"
                  />
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-serif">
                      {isEditing ? editedText : generatedText}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Noch kein Motivationsschreiben</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Fülle die Felder links aus und klicke auf &quot;Generieren&quot;
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
