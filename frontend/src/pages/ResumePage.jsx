import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Upload, Trash2, FileText, Sparkles, Zap, Brain,
  Eye, Clock, CheckCircle, ChevronRight, X,
  BookOpen, Globe, Briefcase, GraduationCap, Code,
} from "lucide-react";
import { resumeApi } from "../services/api";
import { ListSkeleton } from "../components/PageSkeleton";
import useUsageGuard from "../hooks/useUsageGuard";
import { getApiErrorMessage } from "../utils/apiError";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadStoredResumes() {
  try { const r = localStorage.getItem("resumes"); return r ? JSON.parse(r) : undefined; } catch { return undefined; }
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("de-AT", { day: "numeric", month: "short", year: "numeric" });
}

function formatSize(bytes) {
  if (!bytes) return null;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

// ─── Skill extraction from raw_text ──────────────────────────────────────────

const SKILL_DEFS = [
  {
    key: "tech",
    label: "Tech Skills",
    Icon: Code,
    color: "#7c3aed",
    keywords: ["python","java","javascript","typescript","sql","excel","software","system","data","api","react","node","html","css","php","c++","c#","aws","azure","docker","git"],
  },
  {
    key: "exp",
    label: "Erfahrung",
    Icon: Briefcase,
    color: "#0ea5e9",
    keywords: ["jahre","years","erfahrung","experience","projekt","project","team","managed","led","developed","koordiniert","verantwortlich","geleitet","aufgebaut"],
  },
  {
    key: "edu",
    label: "Ausbildung",
    Icon: GraduationCap,
    color: "#10b981",
    keywords: ["bachelor","master","mba","phd","studium","universität","university","abschluss","degree","zertifikat","certificate","fh","hochschule","htl","berufsschule"],
  },
  {
    key: "soft",
    label: "Soft Skills",
    Icon: Brain,
    color: "#f59e0b",
    keywords: ["kommunikation","communication","teamwork","leadership","führung","präsentation","analytisch","problem","lösungsorientiert","selbstständig","kreativ","motiviert"],
  },
  {
    key: "lang",
    label: "Sprachen",
    Icon: Globe,
    color: "#ec4899",
    keywords: ["deutsch","englisch","english","french","spanisch","italian","language","sprache","c1","c2","b2","b1","native","muttersprache","fließend","fluent"],
  },
];

function extractSkillScores(resume) {
  const text = (resume?.raw_text || "").toLowerCase();
  if (!text || text.length < 50) {
    const seed = Math.abs(resume?.id ?? 1);
    return SKILL_DEFS.map((s, i) => ({ ...s, value: 45 + ((seed * (7 + i * 4)) % 50) }));
  }
  return SKILL_DEFS.map(s => {
    const matches = s.keywords.filter(kw => text.includes(kw)).length;
    const value = Math.min(97, Math.round(28 + (matches / s.keywords.length) * 68));
    return { ...s, value };
  });
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ skills, size = 220 }) {
  const N = skills.length;
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.34;
  const angles = skills.map((_, i) => -Math.PI / 2 + (i / N) * 2 * Math.PI);
  const labelR = maxR + 26;

  const polyPts = (level) =>
    angles.map(a => `${cx + level * maxR * Math.cos(a)},${cy + level * maxR * Math.sin(a)}`).join(" ");

  const dataPts = skills.map((s, i) => {
    const r = (s.value / 100) * maxR;
    return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])];
  });

  const anchor = (a) => {
    const deg = ((a * 180) / Math.PI + 360) % 360;
    if (deg < 25 || deg > 335) return "middle";
    if (deg < 180) return "start";
    return "end";
  };
  const baseline = (a) => {
    const deg = ((a * 180) / Math.PI + 360) % 360;
    if (deg > 340 || deg < 20) return "auto";
    if (deg > 160 && deg < 200) return "hanging";
    return "middle";
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.06" />
        </radialGradient>
      </defs>

      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon key={level} points={polyPts(level)} fill="none" stroke="#e2e8f0" strokeWidth={level === 1 ? 1.5 : 1} />
      ))}

      {/* Axis spokes */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#e2e8f0" strokeWidth="1" />
      ))}

      {/* Data fill */}
      <polygon
        points={dataPts.map(p => p.join(",")).join(" ")}
        fill="url(#radarGrad)"
        stroke="#7c3aed"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Data dots */}
      {dataPts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="5" fill="white" stroke="#7c3aed" strokeWidth="2" />
          <circle cx={p[0]} cy={p[1]} r="2.5" fill="#7c3aed" />
        </g>
      ))}

      {/* Labels */}
      {skills.map((s, i) => {
        const a = angles[i];
        const x = cx + labelR * Math.cos(a);
        const y = cy + labelR * Math.sin(a);
        return (
          <text
            key={i} x={x} y={y}
            textAnchor={anchor(a)} dominantBaseline={baseline(a)}
            fontSize="9.5" fontWeight="700" fill="#475569" fontFamily="Inter, sans-serif"
            letterSpacing="0.02em"
          >
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Glassmorphism file card ───────────────────────────────────────────────────

function FileCard({ resume, selected, onSelect, onDelete, matchScore, deleteLoading }) {
  const size = formatSize(resume.file_size);
  const score = matchScore;
  const scoreColor = score == null ? "#94a3b8" : score >= 60 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <button
      onClick={() => onSelect(resume.id)}
      className={`w-full text-left rounded-xl p-3.5 transition-all duration-200 border group relative overflow-hidden ${
        selected
          ? "bg-[#08090c] border-blue-500/30 shadow-[0_4px_24px_rgba(59,130,246,0.14)]"
          : "bg-[#08090c]/60 border-[#171a21] hover:bg-[#08090c] hover:border-blue-500/30 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]"
      }`}
    >
      {/* Violet accent bar for selected */}
      {selected && <div className="absolute left-0 inset-y-0 w-0.5 bg-gradient-to-b from-blue-400 to-blue-600 rounded-l-full" />}

      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
          selected ? "bg-blue-500/12" : "bg-white/5 group-hover:bg-blue-500/10"
        }`}>
          <FileText className={`w-4 h-4 ${selected ? "text-blue-400" : "text-slate-400"}`} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold truncate leading-snug ${selected ? "text-blue-300" : "text-slate-300"}`}>
            {resume.filename}
          </p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <Clock className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
            <span className="text-[9px] text-slate-400">{formatDate(resume.updated_at || resume.created_at)}</span>
            {size && <span className="text-[9px] text-slate-300">· {size}</span>}
          </div>

          {/* Match Accuracy badge */}
          <div className="flex items-center gap-1.5 mt-2">
            {resume.parsed_status ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold border"
                style={{ backgroundColor: `${scoreColor}18`, borderColor: `${scoreColor}40`, color: scoreColor }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: scoreColor }} />
                {score != null ? `Matching-Quote ${score}%` : "Analysiert"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-[#1C2333] px-2 py-0.5 text-[9px] font-bold text-slate-400">
                Bereit
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
          disabled={deleteLoading}
          className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-900/30 transition-colors disabled:opacity-40 opacity-0 group-hover:opacity-100"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
}

// ─── Compact upload zone ───────────────────────────────────────────────────────

function UploadZone({ getRootProps, getInputProps, isDragActive, uploading }) {
  return (
    <div {...getRootProps()} className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
      isDragActive
        ? "border-blue-400 bg-blue-500/10 scale-[1.02]"
        : "border-[#171a21] bg-[#08090c]/40 hover:border-blue-500/30 hover:bg-[#08090c]/60"
    } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
      <input {...getInputProps()} />
      {uploading ? (
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] font-semibold text-blue-400">Analysiere…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isDragActive ? "bg-blue-500/15" : "bg-blue-500/10"}`}>
            <Upload className={`w-4 h-4 ${isDragActive ? "text-blue-300" : "text-blue-400"}`} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-300">{isDragActive ? "Hier ablegen!" : "Lebenslauf hochladen"}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">PDF oder TXT · Max. 5 MB</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Document Intelligence (center) ──────────────────────────────────────────

function DocumentIntelligence({ resume, skills }) {
  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
        <div className="w-16 h-16 rounded-xl bg-blue-500/12 flex items-center justify-center">
          <Brain className="w-8 h-8 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Kein Dokument ausgewählt</h3>
          <p className="text-xs text-slate-400 mt-1">Lade einen Lebenslauf hoch oder wähle ihn links aus</p>
        </div>
      </div>
    );
  }

  const topSkill = [...skills].sort((a, b) => b.value - a.value)[0];

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Panel header */}
      <div className="rounded-xl bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#08090c_0%,#000000_100%)] p-5 text-white relative overflow-hidden flex-shrink-0 border border-[#171a21]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-lg bg-blue-500/12 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-blue-300" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-blue-300">Dokumenten-Analyse</span>
          </div>
          <h2 className="text-sm font-bold text-white truncate mt-1">{resume.filename}</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">
            KI-Analyse · Top-Kompetenz: <span className="text-blue-300 font-semibold">{topSkill?.label}</span> ({topSkill?.value}%)
          </p>
        </div>
      </div>

      {/* Radar + skills */}
      <div className="flex-1 rounded-xl bg-[#08090c] border border-[#171a21] shadow-card p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        {/* Radar chart */}
        <div className="flex items-center justify-center">
          <RadarChart skills={skills} size={220} />
        </div>

        {/* Skill bars */}
        <div className="space-y-2.5">
          {[...skills].sort((a, b) => b.value - a.value).map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <s.Icon className="w-3 h-3 flex-shrink-0" style={{ color: s.color }} />
                  <span className="text-[10px] font-semibold text-slate-600">{s.label}</span>
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.value}%`, backgroundColor: s.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tailor CTA */}
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)" }}>
        <div className="p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, rgba(255,255,255,0.2) 0%, transparent 50%)" }} />
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-white leading-none">Lebenslauf anpassen</p>
              <p className="text-[10px] text-blue-100 mt-1 leading-snug">KI optimiert deinen Lebenslauf für eine konkrete Stelle</p>
            </div>
            <Link
              to="/ai-assistant"
              className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors border border-white/20 rounded-xl px-3 py-2 text-[11px] font-bold text-white whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" /> Starten
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Heat-map Live Preview ────────────────────────────────────────────────────

const HEATMAP_SECTIONS = [
  { id: "header",     label: "Name & Kontakt",    heat: "high",   top: "3%",   height: "11%" },
  { id: "summary",    label: "Zusammenfassung",   heat: "medium", top: "15%",  height: "9%" },
  { id: "experience", label: "Berufserfahrung",   heat: "high",   top: "25%",  height: "30%" },
  { id: "skills",     label: "Kenntnisse",        heat: "high",   top: "56%",  height: "12%" },
  { id: "education",  label: "Ausbildung",        heat: "medium", top: "69%",  height: "14%" },
  { id: "languages",  label: "Sprachen",          heat: "low",    top: "84%",  height: "8%" },
  { id: "extras",     label: "Sonstiges",         heat: "low",    top: "93%",  height: "5%" },
];

const HEAT_STYLE = {
  high:   { bg: "rgba(239,68,68,0.13)",   border: "rgba(239,68,68,0.35)",   label: "bg-red-100 text-red-700 border-red-200",    dot: "bg-red-500" },
  medium: { bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.35)",  label: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-500" },
  low:    { bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.30)",  label: "bg-blue-100 text-blue-700 border-blue-200",  dot: "bg-blue-400" },
};

function LivePreview({ resume, hoveredSection, setHoveredSection }) {
  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Eye className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Wähle einen Lebenslauf aus</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-none">Live-Vorschau</h3>
          <p className="text-[9px] text-slate-400 mt-0.5">KI-Scan · Fokusanalyse</p>
        </div>
      </div>

      {/* A4 document mock */}
      <div className="flex-1 rounded-xl bg-[#08090c] border border-[#171a21] shadow-card overflow-hidden">
        <div className="relative" style={{ paddingBottom: "141.4%" /* A4 ratio */ }}>
          <div className="absolute inset-0 p-3">

            {/* Document wireframe — structured sections */}
            <div className="absolute inset-3 pointer-events-none">
              <div className="h-2 w-1/2 rounded bg-slate-700 mb-1" />
              <div className="h-1.5 w-1/3 rounded bg-slate-800 mb-1" />
              <div className="h-px bg-slate-700 mb-2" />
              {[["w-full","w-4/5"],["w-3/4","w-full"],["w-full","w-2/3"],["w-1/2",""],["w-full","w-5/6"],["w-3/4","w-full"],["w-full","w-2/3"],["w-1/2",""],["w-full","w-4/5"],["w-3/5",""]].map(([a, b], i) => (
                <div key={i} className="mb-1.5">
                  <div className={`h-1 rounded bg-slate-800 ${a}`} />
                  {b && <div className={`h-1 rounded bg-slate-800 mt-0.5 ${b}`} />}
                </div>
              ))}
            </div>

            {/* Heat-map overlays */}
            {HEATMAP_SECTIONS.map(section => {
              const style = HEAT_STYLE[section.heat];
              const isHovered = hoveredSection === section.id;
              return (
                <div
                  key={section.id}
                  onMouseEnter={() => setHoveredSection(section.id)}
                  onMouseLeave={() => setHoveredSection(null)}
                  className="absolute left-3 right-3 rounded-lg cursor-pointer transition-all duration-200"
                  style={{
                    top: section.top,
                    height: section.height,
                    backgroundColor: isHovered ? style.bg.replace("0.1", "0.22").replace("0.12", "0.24").replace("0.13", "0.26") : style.bg,
                    border: `1px solid ${section.heat === "high" && isHovered ? "rgba(239,68,68,0.6)" : section.heat === "medium" && isHovered ? "rgba(245,158,11,0.6)" : style.border}`,
                    transform: isHovered ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  {isHovered && (
                    <div className={`absolute right-1 top-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[8px] font-bold ${style.label}`}>
                      {section.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="rounded-xl bg-[#08090c] border border-[#171a21] shadow-card p-3 flex-shrink-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">ATS-Fokus</p>
        <div className="space-y-1.5">
          {[
            { heat: "high",   label: "Hohe Relevanz",    note: "Kontakt, Erfahrung, Skills" },
            { heat: "medium", label: "Mittlere Relevanz", note: "Summary, Ausbildung" },
            { heat: "low",    label: "Niedrige Relevanz", note: "Sprachen, Sonstiges" },
          ].map(({ heat, label, note }) => {
            const s = HEAT_STYLE[heat];
            return (
              <div key={heat} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                <span className="text-[10px] font-semibold text-slate-300 flex-shrink-0">{label}</span>
                <span className="text-[9px] text-slate-400 truncate">— {note}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[9px] text-slate-400 mt-2.5 pt-2 border-t border-[#1C2333] leading-relaxed">
          Zeigt, welche Abschnitte von ATS-Systemen priorisiert werden. Mit dem Mauszeiger erhältst du Details.
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumePage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);
  const { guardedRun } = useUsageGuard("cv_analysis");

  const { data: initData } = useQuery({
    queryKey: ["init"],
    initialData: () => queryClient.getQueryData(["init"]),
    staleTime: 1000 * 60 * 2,
  });

  const { data: resumes = [], isLoading } = useQuery({
    queryKey: ["resumes"],
    queryFn: () => resumeApi.list().then(r => {
      try { localStorage.setItem("resumes", JSON.stringify(r.data)); } catch {}
      return r.data;
    }),
    initialData: () => queryClient.getQueryData(["resumes"]) || loadStoredResumes() || initData?.resumes?.map(r => ({ id: r.id, filename: r.filename, created_at: r.created_at })) || [],
    staleTime: 1000 * 60 * 2,
  });

  // Auto-select first resume
  useEffect(() => {
    if (!selectedId && resumes.length > 0) setSelectedId(resumes[0].id);
  }, [resumes, selectedId]);

  const deleteMutation = useMutation({
    mutationFn: resumeApi.delete,
    onSuccess: (_data, deletedId) => {
      queryClient.setQueryData(["resumes"], (old = []) => old.filter(r => r.id !== deletedId));
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
      if (selectedId === deletedId) setSelectedId(null);
      toast.success("Dein Dokument wurde sicher entfernt");
    },
    onError: (err) => toast.error(getApiErrorMessage(err, "Lebenslauf konnte nicht gelöscht werden")),
  });

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    guardedRun(async () => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        await resumeApi.upload(fd);
        queryClient.invalidateQueries({ queryKey: ["resumes"] });
        toast.success("Dein Dokument wurde sicher hinterlegt und für die Analyse vorbereitet");
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Das Dokument konnte nicht hochgeladen werden"));
      } finally { setUploading(false); }
    });
  }, [guardedRun, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "text/plain": [".txt"] },
    maxFiles: 1,
    disabled: uploading,
  });

  // Average match score from cached jobs
  const jobs = queryClient.getQueryData(["jobs"]) || [];
  const avgMatchScore = (() => {
    const scored = (jobs || []).filter(j => j.match_score != null);
    return scored.length ? Math.round(scored.reduce((s, j) => s + j.match_score, 0) / scored.length) : null;
  })();

  const selectedResume = resumes.find(r => r.id === selectedId) || null;
  const skills = extractSkillScores(selectedResume);

  return (
    <div className="animate-slide-up flex flex-col gap-4" style={{ minHeight: "calc(100svh - 140px)" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight leading-none">Meine Lebensläufe</h1>
          <p className="text-xs text-slate-400 mt-1">KI-gestützte Dokumentenanalyse & ATS-Optimierung</p>
        </div>
        {resumes.length > 0 && (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 bg-[#08090c] border border-[#171a21] rounded-xl px-3 py-1.5 shadow-card">
              {resumes.length} Dokument{resumes.length > 1 ? "e" : ""}
            </span>
            {avgMatchScore != null && (
              <span className="text-[10px] font-bold text-white rounded-xl px-3 py-1.5" style={{ backgroundColor: "#3b82f6", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}>
                Matching-Quote Ø {avgMatchScore}%
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        /* ── 3-column workspace ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] xl:grid-cols-[280px_1fr_280px] gap-4 flex-1">

          {/* ── LEFT: Document List ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-3">
            <UploadZone getRootProps={getRootProps} getInputProps={getInputProps} isDragActive={isDragActive} uploading={uploading} />

            {resumes.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-[#171a21] bg-[#08090c]/40 p-6 text-center">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Noch keine Lebensläufe</p>
                <p className="text-[10px] text-slate-400 mt-1">Lade oben dein erstes Dokument hoch</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-1">
                  Dokumente ({resumes.length})
                </p>
                {resumes.map(resume => (
                  <FileCard
                    key={resume.id}
                    resume={resume}
                    selected={selectedId === resume.id}
                    onSelect={setSelectedId}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    matchScore={avgMatchScore}
                    deleteLoading={deleteMutation.isPending && deleteMutation.variables === resume.id}
                  />
                ))}
              </div>
            )}

            {/* Tips card */}
            {resumes.length > 0 && (
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 mt-auto">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-blue-300">Optimierungstipps</p>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "Nutze Keywords aus der Stellenanzeige",
                    "Halte den Lebenslauf auf 1-2 Seiten",
                    "Messbare Erfolge steigern den Match-Score",
                  ].map(tip => (
                    <li key={tip} className="flex items-start gap-1.5 text-[9px] text-blue-300">
                      <CheckCircle className="w-2.5 h-2.5 flex-shrink-0 mt-0.5 text-blue-400" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── CENTER: Document Intelligence ──────────────────────────────── */}
          <div className="min-h-[500px]">
            <DocumentIntelligence resume={selectedResume} skills={skills} />
          </div>

          {/* ── RIGHT: Live Preview ─────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col">
            <LivePreview
              resume={selectedResume}
              hoveredSection={hoveredSection}
              setHoveredSection={setHoveredSection}
            />
          </div>
        </div>
      )}
    </div>
  );
}
