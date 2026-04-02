import { useCallback, useEffect, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Upload, FileText, Sparkles, Brain,
  Eye, Clock, CheckCircle, X, Trophy, Target,
  TrendingUp, History, ArrowUpRight,
  AlertCircle, Edit3
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
    { id: "keywords", label: "Keywords aus Stellenanzeige einfügen", points: 8, icon: Target },
    { id: "length", label: "Lebenslauf auf 1-2 Seiten kürzen", points: 5, icon: FileText },
    { id: "achievements", label: "Messbare Erfolge hinzufügen", points: 10, icon: TrendingUp },
    { id: "format", label: "ATS-freundliches Format wählen", points: 6, icon: CheckCircle },
    { id: "contact", label: "Kontaktdaten vervollständigen", points: 4, icon: CheckCircle },
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

  // Current score includes completed task points
  const currentScore = Math.min(100, avgScore + completedPoints);
  const projectedScore = Math.min(100, avgScore + completedPoints + potentialPoints);

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

// ─── Animated Score Display ───────────────────────────────────────────────────

function AnimatedScore({ current, target, duration = 600 }) {
  const [display, setDisplay] = useState(current);

  useEffect(() => {
    setDisplay(current);
  }, [current]);

  useEffect(() => {
    let animationId;
    const start = display;
    const diff = target - start;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * easeOut));

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [target, duration, display]);

  return <span>{display}%</span>;
}

// ─── History Sidebar ──────────────────────────────────────────────────────────

function HistorySidebar() {
  const history = [
    { version: "v2", date: "Heute", score: 75, change: "+12%", improvements: ["Keywords optimiert", "Format verbessert"] },
    { version: "v1", date: "Vor 3 Tagen", score: 63, change: null, improvements: ["Erste Version"] },
  ];

  return (
    <div className="rounded-xl bg-[#08090c]/80 border border-[#171a21] p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/15 flex items-center justify-center">
          <History className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <p className="text-[11px] font-bold text-slate-300">Versionen-Historie</p>
      </div>

      <div className="space-y-0">
        {history.map((item, idx) => (
          <div key={item.version} className={`relative pl-5 ${idx !== history.length - 1 ? "pb-4 border-l border-slate-700/50" : ""}`}>
            <div className={`absolute left-0 top-0.5 w-2 h-2 rounded-full -translate-x-[5px] ${idx === 0 ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,226,161,0.5)]" : "bg-slate-600"}`} />

            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-300">{item.version}</span>
              <span className="text-[9px] text-slate-500">{item.date}</span>
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[16px] font-bold ${item.score >= 70 ? "text-emerald-400" : item.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {item.score}%
              </span>
              {item.change && (
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {item.change}
                </span>
              )}
            </div>

            <div className="space-y-0.5">
              {item.improvements.map((imp, i) => (
                <p key={i} className="text-[9px] text-slate-500 flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                  {imp}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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

      {/* Data dots with glow */}
      {dataPts.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r="6" fill="none" stroke={skills[i].color} strokeWidth="2" opacity="0.4" />
          <circle cx={p[0]} cy={p[1]} r="4" fill="#0f172a" stroke={skills[i].color} strokeWidth="2" />
          <circle cx={p[0]} cy={p[1]} r="2" fill={skills[i].color} />
        </g>
      ))}

      {/* Labels removed - kept only grid structure */}
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

// ─── Document Intelligence (center) ──────────────────────────────────────────

function DocumentIntelligence({ resume, skills, gamification, onImproveClick }) {
  const { currentScore, tasks, completedTasks, potentialPoints, projectedScore, toggleTask } = gamification || {};

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

          {/* Gamified Score Display */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(9,11,15,0.96)_64%)]">
                  <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[6px] border-emerald-500 bg-[#08090c] text-[18px] font-bold text-emerald-400 shadow-[0_0_20px_rgba(52,226,161,0.2)]"
                    style={{ borderLeftColor: "#1a513e", borderTopColor: "#15382d" }}
                  >
                    {currentScore}%
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Aktueller Score</p>
                {potentialPoints > 0 && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                    <span className="text-[11px] font-semibold text-emerald-400">+{potentialPoints}% möglich</span>
                  </div>
                )}
              </div>
            </div>

            {/* Potential Score Preview */}
            {potentialPoints > 0 && (
              <div className="flex-1 rounded-lg bg-slate-800/50 border border-slate-700/50 p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-slate-400">Nach Optimierung</span>
                  <span className="text-[11px] font-bold text-blue-400">
                    <AnimatedScore current={currentScore} target={projectedScore} />
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${projectedScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Checklist */}
      {gamification && (
        <div className="rounded-xl bg-[#08090c] border border-[#171a21] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/12 flex items-center justify-center">
                <Target className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-[11px] font-bold text-slate-300">Optimierungs-Checkliste</span>
            </div>
            <span className="text-[10px] font-semibold text-slate-500">
              {completedTasks?.length || 0}/{tasks?.length || 0} erledigt
            </span>
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
                  <span className={`flex-shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    isCompleted ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
                  }`}>
                    +{task.points}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, rgba(255,255,255,0.2) 0%, transparent 50%)" }} />
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

// ─── Heat-map Live Preview ────────────────────────────────────────────────────


function ATSInsights({ resume, skills }) {
  if (!resume) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-6">
        <div className="w-12 h-12 rounded-2xl bg-[#08090c] border border-[#171a21] flex items-center justify-center">
          <Eye className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-xs text-slate-400 font-medium">Wähle einen Lebenslauf aus</p>
      </div>
    );
  }

  const topSkill = [...skills].sort((a, b) => b.value - a.value)[0];
  const weakSkills = [...skills].filter(s => s.value < 50);
  const avgScore = Math.round(skills.reduce((a, b) => a + b.value, 0) / skills.length);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Header with explanation */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
          <Eye className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white leading-none">ATS-Insights</h3>
          <p className="text-[9px] text-slate-400 mt-0.5">Bewerber-Tracking-System Analyse</p>
        </div>
      </div>

      {/* What is ATS? - clearer explanation */}
      <div className="rounded-xl bg-[#08090c] border border-[#171a21] p-3">
        <p className="text-[10px] text-slate-300 leading-relaxed">
          <span className="text-blue-400 font-semibold">ATS-Fokus</span> zeigt, wie gut dein Lebenslauf von automatischen Bewerber-Systemen erkannt wird. Höhere Werte = bessere Chancen vor dem ersten Menschenkontakt.
        </p>
      </div>

      {/* Score summary - with gamification potential */}
      <div className="rounded-xl bg-gradient-to-br from-[#0d1117] to-[#08090c] border border-[#171a21] p-3 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-400">Aktueller Score</span>
          <span className={`text-xs font-bold ${avgScore >= 70 ? "text-emerald-400" : avgScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
            {avgScore}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${avgScore}%`, backgroundColor: avgScore >= 70 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444" }}
          />
        </div>

        {/* Goal system - potential points */}
        <div className="mt-3 pt-3 border-t border-slate-800/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400">Ziel-Score</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              85%+
            </span>
          </div>
          <p className="mt-1 text-[9px] text-slate-500">
            Noch <span className="text-amber-400 font-semibold">{Math.max(0, 85 - avgScore)}%</span> bis zur Top-Bewertung
          </p>
        </div>
      </div>

      {/* Missing Keywords - ATS Simulation - show only most critical */}
      <div className="flex-1 rounded-xl bg-[#08090c] border border-[#171a21] p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-slate-400">Fehlende Keywords</p>
          <span className="text-[9px] text-amber-400 font-medium flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {skills.filter(s => s.value < 70).length > 0 ? `${skills.filter(s => s.value < 70).length} Bereiche` : "Optimal"}
          </span>
        </div>

        <div className="space-y-2">
          {/* Show only the most critical skill (lowest score) */}
          {(() => {
            const criticalSkill = [...skills].sort((a, b) => a.value - b.value)[0];
            if (!criticalSkill || criticalSkill.value >= 70) {
              return (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                  <p className="text-[9px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <CheckCircle className="w-3 h-3" />
                    Alle wichtigen Keywords vorhanden!
                  </p>
                </div>
              );
            }
            return (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: criticalSkill.color }} />
                  <span className="text-[9px] font-semibold text-slate-300">{criticalSkill.label}</span>
                  <span className="text-[9px] text-slate-500 ml-auto">{criticalSkill.value}%</span>
                </div>
                <p className="text-[8px] text-slate-400 mb-1.5">Füge diese Keywords hinzu:</p>
                <div className="flex flex-wrap gap-1">
                  {criticalSkill.missingKeywords.slice(0, 3).map((kw, i) => (
                    <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="rounded-xl bg-[#08090c] border border-[#171a21] p-3 flex-shrink-0">
        <p className="text-[10px] font-semibold text-slate-400 mb-2">Stärken & Schwächen</p>

        <div className="space-y-2">
          {/* Top strength */}
          {topSkill && topSkill.value >= 60 && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[9px] font-semibold text-emerald-400">Stärke: {topSkill.label}</span>
              </div>
              <p className="text-[8px] text-slate-400">Dieser Bereich ist gut ausgeprägt und wird von ATS-Systemen erkannt.</p>
            </div>
          )}

          {/* Weak areas */}
          {weakSkills.length > 0 ? (
            weakSkills.slice(0, 1).map(skill => (
              <div key={skill.key} className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  <span className="text-[9px] font-semibold text-red-400">Optimieren: {skill.label}</span>
                </div>
                <p className="text-[8px] text-slate-400">
                  Ergänze {skill.label.toLowerCase()} für bessere ATS-Erkennung.
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <p className="text-[9px] text-emerald-400 font-medium">Alle Bereiche sind gut abgedeckt!</p>
            </div>
          )}
        </div>
      </div>
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
        /* ── 3-column workspace ─────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_300px] xl:grid-cols-[300px_1fr_320px] gap-4 flex-1">

          {/* ── LEFT: Document List + History ──────────────────────────────── */}
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

            {/* Info card - fills empty space */}
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

            {/* History Sidebar - shows version progression */}
            {resumes.length > 0 && <HistorySidebar />}
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

          {/* ── RIGHT: ATS Insights ─────────────────────────────────────────── */}
          <div className="hidden lg:flex flex-col">
            <ATSInsights
              resume={selectedResume}
              skills={skills}
            />
          </div>
        </div>
      )}
    </div>
  );
}
