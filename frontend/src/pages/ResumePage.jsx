import { useCallback, useEffect, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Upload, FileText, Sparkles, Brain,
  Clock, CheckCircle, X, Trophy, Target,
  TrendingUp,
  Edit3
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
    color: "#a855f7",
    keywords: ["python","java","javascript","typescript","sql","excel","software","system","data","api","react","node","html","css","php","c++","c#","aws","azure","docker","git"],
    missingKeywords: ["Kubernetes", "Terraform", "GraphQL", "Redis", "MongoDB"],
  },
  {
    key: "exp",
    label: "Erfahrung",
    color: "#38bdf8",
    keywords: ["jahre","years","erfahrung","experience","projekt","project","team","managed","led","developed","koordiniert","verantwortlich","geleitet","aufgebaut"],
    missingKeywords: ["5+ Jahre", "Team-Lead", "Agile", "Scrum", "Stakeholder"],
  },
  {
    key: "edu",
    label: "Ausbildung",
    color: "#34d399",
    keywords: ["bachelor","master","mba","phd","studium","universität","university","abschluss","degree","zertifikat","certificate","fh","hochschule","htl","berufsschule"],
    missingKeywords: ["Zertifizierung", "Weiterbildung", "Bootcamp", "Online-Kurs"],
  },
  {
    key: "soft",
    label: "Soft Skills",
    color: "#fbbf24",
    keywords: ["kommunikation","communication","teamwork","leadership","führung","präsentation","analytisch","problem","lösungsorientiert","selbstständig","kreativ","motiviert"],
    missingKeywords: ["Konfliktlösung", "Verhandlung", "Mentoring", "Remote-Arbeit"],
  },
  {
    key: "lang",
    label: "Sprachen",
    color: "#f472b6",
    keywords: ["deutsch","englisch","english","french","spanisch","italian","language","sprache","c1","c2","b2","b1","native","muttersprache","fließend","fluent"],
    missingKeywords: ["Business English", "C2-Niveau", "Mehrsprachig"],
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

// ─── Gamification: Score Goal System ────────────────────────────────────────

function useGamification(skills) {
  const [completedTasks, setCompletedTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("resume_optimization_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const avgScore = useMemo(() => {
    return Math.round(skills.reduce((a, b) => a + b.value, 0) / skills.length);
  }, [skills]);

  const tasks = useMemo(() => [
    { id: "keywords", label: "Keywords aus Stellenanzeige einfügen", points: 3, icon: Target },
    { id: "length", label: "Lebenslauf auf 1-2 Seiten kürzen", points: 2, icon: FileText },
    { id: "achievements", label: "Messbare Erfolge hinzufügen", points: 4, icon: TrendingUp },
    { id: "format", label: "ATS-freundliches Format wählen", points: 2, icon: CheckCircle },
    { id: "contact", label: "Kontaktdaten vervollständigen", points: 2, icon: CheckCircle },
  ], []);

  const completedPoints = useMemo(() => {
    return tasks
      .filter(t => completedTasks.includes(t.id))
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks, completedTasks]);

  const potentialPoints = useMemo(() => {
    return tasks
      .filter(t => !completedTasks.includes(t.id))
      .reduce((sum, t) => sum + t.points, 0);
  }, [tasks, completedTasks]);

  // Current score includes completed task points with weighting
  // Lower base scores get more benefit from tasks (fairness factor)
  const fairnessMultiplier = Math.max(1, (100 - avgScore) / 50); // 1x at score 50, up to 2x at score 0
  const weightedCompletedPoints = Math.round(completedPoints * fairnessMultiplier);
  const currentScore = Math.min(100, avgScore + weightedCompletedPoints);
  const projectedScore = Math.min(100, avgScore + weightedCompletedPoints + Math.round(potentialPoints * fairnessMultiplier));

  const toggleTask = useCallback((taskId) => {
    setCompletedTasks(prev => {
      const next = prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId];
      try {
        localStorage.setItem("resume_optimization_tasks", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  return { avgScore, currentScore, tasks, completedTasks, potentialPoints, projectedScore, toggleTask };
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────

function RadarChart({ skills, size = 220 }) {
  const N = skills.length;
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.34;
  const angles = skills.map((_, i) => -Math.PI / 2 + (i / N) * 2 * Math.PI);

  const polyPts = (level) =>
    angles.map(a => `${cx + level * maxR * Math.cos(a)},${cy + level * maxR * Math.sin(a)}`).join(" ");

  const dataPts = skills.map((s, i) => {
    const r = (s.value / 100) * maxR;
    return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])];
  });

  // Labels removed per design feedback

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      <defs>
        <radialGradient id="radarGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.08" />
        </radialGradient>
        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      {/* Grid rings - dark mode */}
      {[0.25, 0.5, 0.75, 1].map(level => (
        <polygon key={level} points={polyPts(level)} fill="none" stroke="#334155" strokeWidth={level === 1 ? 1.5 : 1} strokeOpacity={0.6} />
      ))}

      {/* Axis spokes - dark mode */}
      {angles.map((a, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)} stroke="#334155" strokeWidth="1" strokeOpacity={0.5} />
      ))}

      {/* Data fill */}
      <polygon
        points={dataPts.map(p => p.join(",")).join(" ")}
        fill="url(#radarGrad)"
        stroke="url(#radarStroke)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Data dots only — labels moved outside SVG */}
      {dataPts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="6" fill="none" stroke={skills[i].color} strokeWidth="2" opacity="0.4" />
          <circle cx={p[0]} cy={p[1]} r="4" fill="#0f172a" stroke={skills[i].color} strokeWidth="2" />
          <circle cx={p[0]} cy={p[1]} r="2" fill={skills[i].color} />
        </g>
      ))}

      {/* Labels positioned outside the pentagon at fixed radius */}
      {skills.map((s, i) => {
        const labelR = maxR + 14;
        const lx = cx + labelR * Math.cos(angles[i]);
        const ly = cy + labelR * Math.sin(angles[i]);
        // Determine text anchor based on position
        const isRight = Math.cos(angles[i]) > 0.1;
        const isLeft = Math.cos(angles[i]) < -0.1;
        const textAnchor = isRight ? "start" : isLeft ? "end" : "middle";
        const offsetX = isRight ? 8 : isLeft ? -8 : 0;
        return (
          <text
            key={`label-${i}`}
            x={lx + offsetX}
            y={ly}
            fill={s.color}
            fontSize="11"
            fontWeight="600"
            textAnchor={textAnchor}
            dominantBaseline="middle"
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
                {score != null ? `Match ${score}%` : "Analysiert"}
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

// ─── Checklist Component ─────────────────────────────────────────────────────

function Checklist({ gamification }) {
  const { tasks, completedTasks, toggleTask } = gamification || {};

  if (!tasks?.length) return null;

  return (
    <div className="rounded-xl bg-[#08090c] border border-[#171a21] p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-500/12 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <span className="text-[11px] font-bold text-slate-300">Optimierungs-Tipps</span>
      </div>

      <div className="space-y-2">
        {tasks?.map((task) => {
          const isCompleted = completedTasks?.includes(task.id);
          const TaskIcon = task.icon;
          return (
            <button
              key={task.id}
              onClick={() => toggleTask?.(task.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 text-left ${
                isCompleted
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-slate-800/30 border-slate-700/50 hover:border-amber-500/30 hover:bg-slate-800/50"
              }`}
            >
              <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                isCompleted ? "bg-emerald-500/20" : "bg-slate-700/50"
              }`}>
                {isCompleted ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <TaskIcon className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium truncate ${isCompleted ? "text-emerald-300 line-through" : "text-slate-300"}`}>
                  {task.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Feedback Box Component ──────────────────────────────────────────────────

function FeedbackBox({ gamification }) {
  const { tasks = [], completedTasks = [], projectedScore = 0, potentialPoints = 0 } = gamification || {};
  const total = tasks.length;
  const completed = completedTasks.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const messages = {
    complete: {
      icon: Trophy,
      color: "emerald",
      title: "Super!",
      text: "Alle Optimierungen erledigt",
    },
    high: {
      icon: TrendingUp,
      color: "blue",
      title: "Gut gemacht!",
      text: `${completed}/${total} Aufgaben erledigt`,
    },
    medium: {
      icon: Target,
      color: "amber",
      title: "Weiter so!",
      text: "Aufgabe one to five",
    },
    low: {
      icon: Sparkles,
      color: "slate",
      title: "Starte jetzt!",
      text: "Aufgabe one to five",
    },
  };

  const getStatus = () => {
    if (completed === total && total > 0) return "complete";
    if (progress >= 60) return "high";
    if (progress >= 30) return "medium";
    return "low";
  };

  const status = getStatus();
  const { icon: Icon, color, title, text } = messages[status];

  const colorClasses = {
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "text-emerald-400", title: "text-emerald-300" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/20", icon: "text-blue-400", title: "text-blue-300" },
    amber: { bg: "bg-amber-500/10", border: "border-amber-500/20", icon: "text-amber-400", title: "text-amber-300" },
    slate: { bg: "bg-slate-500/10", border: "border-slate-500/20", icon: "text-slate-400", title: "text-slate-300" },
  }[color];

  return (
    <div className={`flex-1 rounded-xl ${colorClasses.bg} border ${colorClasses.border} p-3`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${colorClasses.bg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${colorClasses.icon}`} />
        </div>
        <div>
          <p className={`text-[11px] font-bold ${colorClasses.title}`}>{title}</p>
          <p className="text-[10px] text-slate-400">{text}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Document Intelligence (center) ──────────────────────────────────────────

function DocumentIntelligence({ resume, skills, gamification, onImproveClick }) {
  const { currentScore } = gamification || {};

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

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Panel header with Gamified Score */}
      <div className="rounded-xl bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,#08090c_0%,#000000_100%)] p-5 text-white relative overflow-hidden flex-shrink-0 border border-[#171a21]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 60%)" }} />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/12 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-blue-300" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-blue-300">Dokumenten-Analyse</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5">
              <Trophy className="w-3 h-3 text-emerald-400" />
              <span className="text-[9px] font-semibold text-emerald-400">Ziel: 85%</span>
            </div>
          </div>

          <h2 className="text-sm font-bold text-white truncate">{resume.filename}</h2>

          {/* Gamified Score Display with Feedback Box */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {/* Progress ring using conic-gradient */}
                <div 
                  className="flex h-[72px] w-[72px] items-center justify-center rounded-full"
                  style={{ 
                    background: `conic-gradient(rgba(16,185,129,0.3) ${currentScore * 3.6}deg, transparent ${currentScore * 3.6}deg)`,
                  }}
                >
                  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[6px] border-emerald-500 bg-[#08090c] text-[18px] font-bold text-emerald-400">
                    {currentScore}%
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Aktueller Score</p>
              </div>
            </div>

            {/* Feedback Box based on checklist completion */}
            <FeedbackBox gamification={gamification} />
          </div>
        </div>
      </div>

      {/* Radar + skills */}
      <div className="flex-1 rounded-xl bg-[#08090c] border border-[#171a21] shadow-card p-5 flex flex-col gap-4 min-h-0 overflow-y-auto">
        {/* Radar chart */}
        <div className="flex items-center justify-center">
          <RadarChart skills={skills} size={220} />
        </div>

        {/* Skill bars with better contrast */}
        <div className="space-y-2.5">
          {[...skills].sort((a, b) => b.value - a.value).map((s) => (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] font-semibold text-slate-400">{s.label}</span>
                </div>
                <span className="text-[11px] font-bold tabular-nums" style={{ color: s.color }}>{s.value}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${s.value}%`, backgroundColor: s.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Focus CTA - Single prominent button */}
      <button
        onClick={onImproveClick}
        className="w-full rounded-xl overflow-hidden flex-shrink-0 group"
        style={{ background: "linear-gradient(135deg, #2563eb 0%, #3b82f6 55%, #60a5fa 100%)" }}
      >
        <div className="p-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-gradient-to-br from-blue-500/10 to-transparent" />
          <div className="relative z-10 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Edit3 className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-white leading-none">Jetzt Score verbessern</p>
                <p className="text-[10px] text-blue-100 mt-1">In den Bearbeitungsmodus wechseln</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/20 group-hover:bg-white/30 transition-colors rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px] font-bold text-white">Starten</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResumePage() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
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
  const gamification = useGamification(skills);

  const handleImproveClick = useCallback(() => {
    window.location.href = "/ai-assistant";
  }, []);

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
          </div>
        )}
      </div>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : (
        /* ── 2-column workspace ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[300px_1fr] gap-4 flex-1">

          {/* ── LEFT: Document List + Info ──────────────────────────────── */}
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

            {/* Info card - under Dokumente */}
            <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/15 p-4 mt-auto">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[11px] font-bold text-emerald-300">KI-Analyse Vorteile</p>
              </div>
              <ul className="space-y-2">
                {[
                  "Automatische Keyword-Erkennung",
                  "ATS-Kompatibilitäts-Check",
                  "Verbesserungsvorschläge in Echtzeit",
                ].map((benefit, i) => (
                  <li key={i} className="flex items-center gap-2 text-[10px] text-slate-400">
                    <div className="w-1 h-1 rounded-full bg-emerald-400 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Checklist - moved to left column */}
            {selectedResume && <Checklist gamification={gamification} />}
          </div>

          {/* ── CENTER: Document Intelligence ──────────────────────────────── */}
          <div className="min-h-[500px]">
            <DocumentIntelligence
              resume={selectedResume}
              skills={skills}
              gamification={gamification}
              onImproveClick={handleImproveClick}
            />
          </div>
        </div>
      )}
    </div>
  );
}
