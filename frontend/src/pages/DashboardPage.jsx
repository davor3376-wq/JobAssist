import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { jobApi, resumeApi } from '../services/api';
import {
  Search,
  Sparkles,
  Mic,
  FileText,
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
  Award,
} from 'lucide-react';

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  indigo:     '#5B4FE8',
  indigoMid:  '#7B72F0',
  indigoSoft: 'rgba(91,79,232,0.12)',
  indigoGlow: 'rgba(91,79,232,0.30)',

  emerald:     '#2DD4BF',
  emeraldSoft: 'rgba(45,212,191,0.09)',
  emeraldGlow: 'rgba(45,212,191,0.22)',

  violet:     '#8B5CF6',
  violetSoft: 'rgba(139,92,246,0.10)',
  violetGlow: 'rgba(139,92,246,0.28)',

  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.09)',

  textPrimary: '#EEEEF5',
  textSub:     '#AAAAAA',
  // P2: Kontrast-Fix — war #555565 (2.8:1), jetzt #8888A0 (~4.6:1)
  textDim:     '#8888A0',
  textDeep:    '#2E2E3A',

  glass:       'rgba(255,255,255,0.027)',
  glassBorder: 'rgba(255,255,255,0.062)',
  glassEdge:   'rgba(255,255,255,0.10)',
  glassInner:  'rgba(255,255,255,0.04)',
};

const GLASS_SHADOW = `
  0 8px 32px rgba(0,0,0,0.55),
  0 2px 8px rgba(0,0,0,0.4),
  inset 0 1px 0 ${C.glassEdge},
  inset 0 -1px 0 rgba(0,0,0,0.25)
`;

// ─── Glassmorphism Tile ────────────────────────────────────────────────────────
function Tile({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: C.glass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${C.glassBorder}`,
        boxShadow: GLASS_SHADOW,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── Label — P0: text-[11px] statt 10px ───────────────────────────────────────
function Label({ children, className = '' }) {
  return (
    <span
      className={`block text-[11px] font-semibold tracking-[0.18em] uppercase ${className}`}
      style={{ color: C.textDim }}
    >
      {children}
    </span>
  );
}

// ─── Precision Icon ────────────────────────────────────────────────────────────
function GlowIcon({ icon: Icon, glowColor = C.indigoSoft, iconColor = C.textPrimary, size = 30, iconSize = 13 }) {
  return (
    <div
      className="grid place-items-center rounded-xl flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: glowColor,
        border: `1px solid ${glowColor.replace('0.12', '0.18').replace('0.09', '0.15')}`,
        boxShadow: `0 0 14px ${glowColor}`,
      }}
    >
      <Icon size={iconSize} color={iconColor} strokeWidth={1.7} />
    </div>
  );
}

// ─── Circular Gauge — Meilenstein ─────────────────────────────────────────────
function CircularGauge({ progress = 80, size = 76 }) {
  const r = (size - 14) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (progress / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <defs>
          <filter id="gaugeGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.violet} />
            <stop offset="100%" stopColor={C.indigoMid} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.textDeep} strokeWidth="2.5" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset="0"
          transform={`rotate(-90 ${cx} ${cy})`}
          filter="url(#gaugeGlow)"
        />
      </svg>
      <div className="relative z-10 flex flex-col items-center justify-center">
        <Award size={18} strokeWidth={1.5} style={{ color: C.violet, filter: `drop-shadow(0 0 6px ${C.violetGlow})` }} />
      </div>
    </div>
  );
}

// ─── Activity Chart ────────────────────────────────────────────────────────────
function ActivityChart({ data }) {
  const W = 300;
  const H = 100;
  const padT = 12;
  const padB = 6;
  const avail = H - padT - padB;
  const max = 3;
  const n = data.length;

  const pts = data.map((d, i) => ({
    x: parseFloat(((i / (n - 1)) * W).toFixed(2)),
    y: parseFloat((H - padB - (d.val / max) * avail).toFixed(2)),
  }));

  const linePath = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + p.x) / 2).toFixed(2);
    return `${acc} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <filter id="lineGlow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Area-Fill entfernt — repräsentierte keine echten Fortschrittsdaten */}
      <path d={linePath} fill="none" stroke={C.indigo} strokeWidth="1.4" filter="url(#lineGlow)" />
      {pts.map((p, i) =>
        data[i].val > 0 ? (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2.8"
            fill={C.indigoMid}
            style={{ filter: `drop-shadow(0 0 5px ${C.indigo})` }}
          />
        ) : null
      )}
    </svg>
  );
}

// ─── Funnel Stage — P0: label text-xs (war text-[10px]) ───────────────────────
function FunnelStage({ label, value, barWidth, color, glow, note, isLast }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2.5">
        <div
          className="flex-shrink-0 w-2 h-2 rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${glow}` }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            {/* P0: text-xs statt text-[10px] */}
            <span className="text-xs tracking-[0.08em] uppercase" style={{ color: C.textDim }}>
              {label}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold leading-none tabular-nums" style={{ color: C.textPrimary }}>
                {value}
              </span>
              {note && (
                // P0: text-[11px] statt text-[9px]
                <span className="text-[11px]" style={{ color: glow }}>
                  {note}
                </span>
              )}
            </div>
          </div>
          <div className="h-[3px] rounded-full overflow-hidden" style={{ background: C.textDeep }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${barWidth}%`,
                background: color,
                boxShadow: `0 0 8px ${glow}`,
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="ml-[3.5px] w-[1px] h-3 mt-0.5" style={{ background: C.textDeep }} />
      )}
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobApi.list().then(r => r.data),
  });
  const { data: resumes = [] } = useQuery({
    queryKey: ['resumes'],
    queryFn: () => resumeApi.list().then(r => r.data),
  });

  // Derived stats
  const analyzed      = jobs.filter(j => j.match_score != null).length;
  const total         = jobs.length;
  const appliedStatuses = ['applied', 'interviewing', 'offered', 'rejected'];
  const appliedCount  = jobs.filter(j => appliedStatuses.includes(j.status)).length;
  const interviewingCount = jobs.filter(j => ['interviewing', 'offered'].includes(j.status)).length;
  const topMatches    = jobs.filter(j => j.match_score != null && j.match_score >= 70).length;
  const hasResume     = resumes.length > 0;

  // Current-week activity from real job created_at
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);
  const dailyActivity = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day, i) => {
    const from = new Date(monday); from.setDate(monday.getDate() + i);
    const to   = new Date(from);  to.setDate(from.getDate() + 1);
    const count = jobs.filter(j => {
      if (!j.created_at) return false;
      const d = new Date(j.created_at);
      return d >= from && d < to;
    }).length;
    return { day, val: Math.min(count, 3), max: 3, label: count > 0 ? `${count} Job${count !== 1 ? 's' : ''}` : '—' };
  });
  const weekTotal  = dailyActivity.reduce((s, d) => s + d.val, 0);
  const todayIdx   = dow === 0 ? 6 : dow - 1;
  const todayCount = dailyActivity[todayIdx]?.val ?? 0;
  const dailyGoalFilled = Math.min(todayCount, 3);

  // Funnel — fully computed
  const applyRate     = total > 0 ? Math.round((appliedCount / total) * 100) : 0;
  const returnRate    = appliedCount > 0 ? Math.round((interviewingCount / appliedCount) * 100) : 0;
  const interviewPct  = total > 0 ? Math.round((interviewingCount / total) * 100) : 0;
  const funnelStages = [
    { label: 'Analysiert', value: String(analyzed || total), barWidth: 100, color: C.textDim, glow: 'rgba(136,136,160,0.5)' },
    { label: 'Beworben',   value: `${appliedCount}/${analyzed || total}`, barWidth: applyRate, color: C.indigo, glow: C.indigoGlow, note: applyRate > 0 ? `${applyRate}%` : undefined },
    { label: 'Rücklauf',   value: appliedCount > 0 ? `${returnRate}%` : '—', barWidth: returnRate, color: C.violet, glow: C.violetGlow },
    { label: 'Interview',  value: String(interviewingCount), barWidth: interviewPct, color: C.amber, glow: 'rgba(245,158,11,0.35)', note: interviewingCount > 0 ? 'Aktiv' : undefined },
  ];

  // Profile strength — Lebenslauf from real resumes
  const profileItems = [
    { label: 'Lebenslauf',  complete: hasResume,      icon: FileText, sub: null    },
    { label: 'Fähigkeiten', complete: analyzed > 0,   icon: Star,     sub: null    },
    { label: 'Präferenzen', complete: false,           icon: Zap,      sub: '2 / 3' },
  ];
  const profileStrength = Math.round((profileItems.filter(x => x.complete).length / profileItems.length) * 100);

  // Weekly goals — dynamic
  const weeklyGoals = [
    { label: `${analyzed} Analysen`,     complete: analyzed >= 5,      icon: Search     },
    { label: 'Top-Treffer',              complete: topMatches > 0,     icon: TrendingUp },
    { label: `${appliedCount} Bewerbungen`, complete: appliedCount >= 3, icon: Sparkles },
  ];

  return (
    <div
      className="h-screen px-4 py-4 font-sans overflow-hidden flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 18% 15%, #0d0d1a 0%, #090909 45%, #050505 100%)',
        fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-3.5 flex-shrink-0">
        <h1
          className="text-[22px] font-semibold tracking-tight leading-none"
          style={{ color: C.textPrimary, letterSpacing: '-0.02em' }}
        >
          JobAssist
        </h1>
        <p
          className="mt-1 text-[11px] font-medium tracking-[0.18em] uppercase"
          style={{ color: C.textDim }}
        >
          Bewerbungsübersicht
        </p>
      </div>

      {/* ── Main Grid ──────────────────────────────────────────── */}
      {/* P0: grid-cols-1 auf Mobile, md:grid-cols-12 auf Desktop   */}
      {/* overflow-y-auto auf Mobile erlaubt Scrollen im Grid       */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 flex-1 min-h-0 overflow-y-auto md:overflow-hidden">

        {/* ── LEFT COLUMN ──────────────────────────────────────── */}
        {/* P0: col-span-1 Mobile / md:col-span-9 Desktop           */}
        <div className="col-span-1 md:col-span-9 flex flex-col gap-2.5 min-h-0">

          {/* Row 1 — Hero Metrics */}
          {/* shrink-0: Row 1 schrumpft nie — nur Aktivität gibt Platz ab */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 shrink-0">

            {/* Markt-Score */}
            <Tile className="p-3.5">
              <Label>Markt-Score</Label>
              <div className="mt-2 flex items-end gap-1.5">
                <span
                  className="text-[30px] font-semibold leading-none tabular-nums"
                  style={{ color: C.textPrimary, letterSpacing: '-0.03em' }}
                >
                  63
                </span>
                <span className="text-[16px] mb-0.5" style={{ color: C.textDeep }}>%</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div
                  className="h-[2px] w-5 rounded-full"
                  style={{ background: C.emerald, boxShadow: `0 0 6px ${C.emeraldGlow}` }}
                />
                <span className="text-[11px] font-medium" style={{ color: C.emerald }}>+2%</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <div>
                  {/* P0: text-xs statt text-[10px] */}
                  <span className="text-xs" style={{ color: C.textDim }}>Top-Treffer</span>
                  <span
                    className="block text-[20px] font-semibold leading-none tabular-nums"
                    style={{ color: C.textPrimary, letterSpacing: '-0.02em' }}
                  >
                    {topMatches}
                  </span>
                </div>
                <div>
                  <span className="text-xs" style={{ color: C.textDim }}>Analysiert</span>
                  <span
                    className="block text-[20px] font-semibold leading-none tabular-nums"
                    style={{ color: C.textPrimary, letterSpacing: '-0.02em' }}
                  >
                    {analyzed || total}
                  </span>
                </div>
              </div>
            </Tile>

            {/* Leistungsindex */}
            <Tile className="p-3.5">
              <Label>Leistungsindex</Label>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-[30px] font-semibold leading-none tabular-nums"
                  style={{ color: C.textPrimary, letterSpacing: '-0.03em' }}
                >
                  87
                </span>
                <span className="text-[11px] font-semibold" style={{ color: C.emerald }}>↑12%</span>
              </div>
              <div className="mt-2.5 relative">
                <div
                  className="h-[3px] w-full rounded-full overflow-hidden"
                  style={{ background: C.textDeep }}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: '75%',
                      background: `${C.emerald}22`,
                      boxShadow: `0 0 10px ${C.emeraldGlow}`,
                    }}
                  />
                  <div
                    className="h-full rounded-full relative"
                    style={{
                      width: '87%',
                      background: `linear-gradient(90deg, ${C.emerald}CC, ${C.emerald})`,
                      boxShadow: `0 0 8px ${C.emeraldGlow}`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-[9px]" style={{ color: C.textDeep }}>0</span>
                <span className="text-[9px]" style={{ color: C.textDeep }}>100</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <div
                  className="w-1 h-1 rounded-full"
                  style={{ background: C.emerald, boxShadow: `0 0 5px ${C.emeraldGlow}` }}
                />
                {/* P0: text-xs statt text-[10px] */}
                <span className="text-xs font-medium" style={{ color: C.textSub }}>
                  Peer-Leistung: <span style={{ color: C.emerald }}>Top 5%</span>
                </span>
              </div>
            </Tile>

            {/* Meilenstein */}
            <Tile className="p-3.5">
              <Label>Meilenstein</Label>
              <div className="mt-2 flex items-center gap-3">
                <CircularGauge progress={80} size={72} />
                <div className="flex-1">
                  <div
                    className="text-[18px] font-semibold leading-tight"
                    style={{ color: C.textPrimary, letterSpacing: '-0.02em' }}
                  >
                    Experte
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: C.textDim }}>
                    72 / 90 Punkte
                  </div>
                  <div
                    className="mt-1.5 text-[11px] font-semibold tabular-nums"
                    style={{ color: C.violet }}
                  >
                    80%
                  </div>
                </div>
              </div>
            </Tile>
          </div>

          {/* Row 2 — Aktivität                                              */}
          {/* P0: min-h-[200px] auf Mobile (kein flex-1 ohne fixe Höhe)     */}
          <Tile className="min-h-[200px] md:flex-1 md:min-h-0 p-3.5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Label>Aktivität</Label>
                {/* P0: text-xs statt text-[10px] */}
                <div className="flex items-center gap-2 text-xs" style={{ color: C.textDim }}>
                  <span>
                    Woche:{' '}
                    <b className="font-semibold" style={{ color: C.textPrimary }}>{weekTotal}</b>
                  </span>
                  <span style={{ color: C.textDeep }}>·</span>
                  <span>
                    Heute:{' '}
                    <b className="font-semibold" style={{ color: C.textPrimary }}>{todayCount}</b>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs" style={{ color: C.textDim }}>Tagesziel</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.textPrimary }}>
                  {dailyGoalFilled}/3
                </span>
                <div
                  className="w-16 h-[3px] rounded-full overflow-hidden"
                  style={{ background: C.textDeep }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((dailyGoalFilled / 3) * 100)}%`,
                      background: `linear-gradient(90deg, ${C.indigo}, ${C.indigoMid})`,
                      boxShadow: `0 0 8px ${C.indigoGlow}`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <ActivityChart data={dailyActivity} />
            </div>
            <div className="flex justify-between mt-2 px-0.5">
              {dailyActivity.map((d) => (
                <div key={d.day} className="flex flex-col items-center gap-0.5">
                  {/* P0: text-[11px] statt text-[9px] */}
                  <span className="text-[11px] font-medium" style={{ color: C.textDim }}>
                    {d.day}
                  </span>
                  {d.val > 0 && (
                    <div
                      className="w-1 h-1 rounded-full"
                      style={{ background: C.indigo, opacity: 0.5 }}
                    />
                  )}
                </div>
              ))}
            </div>
          </Tile>

          {/* Row 3 — Wochenziele + Quick Actions */}
          {/* shrink-0: Row 3 schrumpft nie — bleibt immer sichtbar  */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 shrink-0">

            {/* Wochenziele */}
            <Tile className="p-3.5">
              <Label className="mb-2.5">Wochenziele</Label>
              <div className="flex flex-col gap-2">
                {weeklyGoals.map((goal) => (
                  <div
                    key={goal.label}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 min-h-[44px]"
                    style={{
                      background: goal.complete
                        ? `linear-gradient(135deg, ${C.emeraldSoft} 0%, transparent 100%)`
                        : C.glassInner,
                      border: `1px solid ${goal.complete ? 'rgba(45,212,191,0.12)' : C.glassBorder}`,
                    }}
                  >
                    <GlowIcon
                      icon={goal.complete ? CheckCircle2 : goal.icon}
                      glowColor={goal.complete ? C.emeraldSoft : C.indigoSoft}
                      iconColor={goal.complete ? C.emerald : C.textDim}
                      size={28}
                      iconSize={13}
                    />
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: goal.complete ? C.textSub : C.textDim }}
                    >
                      {goal.label}
                    </span>
                    {goal.complete && (
                      <div
                        className="ml-auto w-1.5 h-1.5 rounded-full"
                        style={{ background: C.emerald, boxShadow: `0 0 6px ${C.emeraldGlow}` }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Tile>

            {/* Quick Actions                                                   */}
            {/* P1: min-h-[72px] für Fitts's Law, active: statt onMouseEnter  */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  title: 'Treffer',
                  sub: '3 Jobs',
                  icon: Search,
                  glow: C.indigoSoft,
                  iconColor: C.indigoMid,
                  action: () => navigate('/jobs'),
                },
                {
                  title: 'Stärken',
                  sub: 'KI-Tipps',
                  icon: Sparkles,
                  glow: C.violetSoft,
                  iconColor: C.violet,
                  action: () => navigate('/ai-assistant'),
                },
                {
                  title: 'Interview',
                  sub: 'Training',
                  icon: Mic,
                  glow: C.amberSoft,
                  iconColor: C.amber,
                  action: () => navigate('/ai-assistant'),
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group rounded-2xl p-3 text-left transition-all duration-300 min-h-[72px] active:scale-95 active:opacity-80"
                  style={{
                    background: C.glass,
                    border: `1px solid ${C.glassBorder}`,
                    boxShadow: GLASS_SHADOW,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.glassInner;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = `${GLASS_SHADOW}, 0 0 20px ${item.glow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.glass;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = GLASS_SHADOW;
                  }}
                >
                  <div className="flex flex-col items-center gap-2">
                    <GlowIcon
                      icon={item.icon}
                      glowColor={item.glow}
                      iconColor={item.iconColor}
                      size={32}
                      iconSize={14}
                    />
                    <div className="text-center">
                      <div className="text-[11px] font-semibold" style={{ color: C.textPrimary }}>
                        {item.title}
                      </div>
                      {/* P0: text-[11px] statt text-[9px] */}
                      <div className="text-[11px] mt-0.5" style={{ color: C.textDim }}>
                        {item.sub}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────── */}
        {/* P0: col-span-1 Mobile / md:col-span-3 Desktop            */}
        <div className="col-span-1 md:col-span-3 flex flex-col gap-2.5 min-h-0">

          {/* Bewerbungsreise */}
          <Tile className="p-3.5">
            <Label className="mb-3">Bewerbungsreise</Label>
            <div className="flex flex-col">
              {funnelStages.map((stage, i) => (
                <FunnelStage
                  key={stage.label}
                  {...stage}
                  isLast={i === funnelStages.length - 1}
                />
              ))}
            </div>
            <div
              className="mt-3.5 rounded-xl px-3 py-2.5 flex items-center gap-2"
              style={{
                background: C.indigoSoft,
                border: `1px solid rgba(91,79,232,0.15)`,
              }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: C.indigo, boxShadow: `0 0 8px ${C.indigoGlow}` }}
              />
              {/* P0: text-xs statt text-[10px] */}
              <span className="text-xs" style={{ color: C.textSub }}>
                Conversion:{' '}
                <span className="font-semibold" style={{ color: C.indigoMid }}>
                  4.8% → Interview
                </span>
              </span>
            </div>
          </Tile>

          {/* Profil-Stärke */}
          <Tile className="flex-1 p-3.5">
            <div className="flex items-center justify-between mb-3">
              <Label>Profil-Stärke</Label>
              <span
                className="text-[22px] font-semibold tabular-nums leading-none"
                style={{ color: C.textPrimary, letterSpacing: '-0.03em' }}
              >
                {profileStrength}
                <span className="text-[13px] font-medium ml-0.5" style={{ color: C.textDim }}>%</span>
              </span>
            </div>
            <div
              className="h-[2px] w-full rounded-full mb-3.5 overflow-hidden"
              style={{ background: C.textDeep }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${profileStrength}%`,
                  background: `linear-gradient(90deg, ${C.indigo}, ${C.emerald})`,
                  boxShadow: `0 0 8px ${C.indigoGlow}`,
                }}
              />
            </div>
            <div className="space-y-2">
              {profileItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-xl px-2.5 min-h-[44px]"
                  style={{
                    background: item.complete ? C.emeraldSoft : C.glassInner,
                    border: `1px solid ${item.complete ? 'rgba(45,212,191,0.10)' : C.glassBorder}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {/* P1: size={16} statt size={12} für bessere Erkennbarkeit */}
                    <item.icon
                      size={16}
                      strokeWidth={1.7}
                      style={{ color: item.complete ? C.emerald : C.textDim }}
                    />
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: item.complete ? C.textSub : C.textDim }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.complete ? (
                    <CheckCircle2
                      size={15}
                      strokeWidth={2}
                      style={{ color: C.emerald, filter: `drop-shadow(0 0 4px ${C.emeraldGlow})` }}
                    />
                  ) : (
                    <span
                      className="text-[11px] font-semibold tabular-nums"
                      style={{ color: C.textDim }}
                    >
                      {item.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Tile>
        </div>

      </div>
    </div>
  );
}
