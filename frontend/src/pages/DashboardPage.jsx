import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  Search,
  Sparkles,
  Mic,
  FileText,
  Star,
  Zap,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';

/**
 * Premium tile wrapper — ultra-dark gradient with 1px inner glow at top.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function Tile({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-5 sm:p-6 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.04)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Small label in ALL-CAPS with wide tracking.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function Label({ children, className = '' }) {
  return (
    <span
      className={`block text-[10px] font-medium tracking-[0.18em] uppercase text-[#505058] ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Premium icon with a subtle colored background glow.
 * @param {object} props
 * @param {React.ElementType} props.icon
 * @param {string} [props.glowColor]
 * @param {string} [props.iconColor]
 */
function GlowIcon({ icon: Icon, glowColor = 'rgba(52,211,153,0.2)', iconColor = '#fff' }) {
  return (
    <div className="grid place-items-center h-8 w-8 rounded-lg" style={{ background: glowColor }}>
      <Icon size={15} color={iconColor} strokeWidth={2} />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // Chart data
  const chartData = [20, 45, 30, 60, 85, 55, 70];
  const maxVal = Math.max(...chartData);
  const minVal = Math.min(...chartData);
  const chartW = 400;
  const chartH = 100;
  const pad = 4;

  const pts = chartData.map((v, i) => ({
    x: (i / (chartData.length - 1)) * chartW,
    y: chartH - pad - ((v - minVal) / (maxVal - minVal)) * (chartH - pad * 2),
  }));

  // Smooth cubic bezier path
  const buildCurve = () => {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const cpx1 = curr.x + (next.x - curr.x) * 0.4;
      const cpy1 = curr.y;
      const cpx2 = next.x - (next.x - curr.x) * 0.4;
      const cpy2 = next.y;
      d += ` C${cpx1},${cpy1} ${cpx2},${cpy2} ${next.x},${next.y}`;
    }
    return d;
  };

  const curvePath = buildCurve();
  const fillPath = `${curvePath} L${pts[pts.length - 1].x},${chartH} L${pts[0].x},${chartH} Z`;

  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="min-h-full bg-black px-4 sm:px-8 py-8 sm:py-10 font-sans">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-white leading-none">
          JobAssist
        </h1>
        <p className="mt-2 text-[11px] tracking-[0.18em] uppercase text-[#3a3a42]">
          Bewerbungsübersicht
        </p>
      </div>

      {/* === Row 1: Score · Performance · Milestone === */}
      <div className="grid grid-cols-12 gap-3 sm:gap-4">
        {/* Markt-Score */}
        <div className="col-span-12 sm:col-span-4">
          <Tile className="h-full">
            <Label>Markt-Score</Label>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-[52px] sm:text-[56px] font-semibold leading-none text-white tracking-tight">
                63<span className="text-[28px] text-[#3a3a42]">%</span>
              </span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-[2px] w-8 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-emerald-400/80">+2% seit gestern</span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <Label>Top-Matches</Label>
                <span className="mt-1 block text-[28px] font-semibold text-white leading-none">5</span>
              </div>
              <div>
                <Label>Analysiert</Label>
                <span className="mt-1 block text-[28px] font-semibold text-white leading-none">21</span>
              </div>
            </div>
          </Tile>
        </div>

        {/* Leistungsindex */}
        <div className="col-span-12 sm:col-span-4">
          <Tile className="h-full">
            <Label>Leistungsindex</Label>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[52px] sm:text-[56px] font-semibold leading-none text-white tracking-tight">
                87
              </span>
              <span className="text-[12px] font-medium text-emerald-400">↑ 12%</span>
            </div>
            <div className="mt-5 h-[3px] w-full rounded-full bg-[#111114] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '87%',
                  background: 'linear-gradient(90deg, #10B981, #34D399)',
                  boxShadow: '0 0 10px rgba(52,211,153,0.35)',
                }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[10px] text-[#3a3a42]">0</span>
              <span className="text-[10px] text-[#3a3a42]">100</span>
            </div>
          </Tile>
        </div>

        {/* Meilenstein */}
        <div className="col-span-12 sm:col-span-4">
          <Tile className="h-full">
            <Label>Meilenstein</Label>
            <div className="mt-4">
              <span className="text-[26px] font-semibold text-white leading-none">Experte</span>
            </div>
            <div className="mt-5 h-[3px] w-full rounded-full bg-[#111114] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: '72%',
                  background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                  boxShadow: '0 0 10px rgba(139,92,246,0.3)',
                }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-[10px] text-[#3a3a42]">72 / 90 Punkte</span>
              <span className="text-[10px] text-violet-400/70">80%</span>
            </div>

            {/* Tagesziel nested */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <div className="flex items-center justify-between">
                <Label>Tagesziel</Label>
                <span className="text-[13px] font-medium text-white tabular-nums">2 / 3</span>
              </div>
              <div className="mt-3 h-[3px] w-full rounded-full bg-[#111114] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '66%',
                    background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                    boxShadow: '0 0 10px rgba(59,130,246,0.4)',
                  }}
                />
              </div>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[10px] text-[#3a3a42]">5-Tage-Serie</span>
                <span className="text-[10px] text-emerald-400/80">+2</span>
              </div>
            </div>
          </Tile>
        </div>

        {/* === Row 2: Activity Chart (wide) · Journey === */}

        {/* Aktivität — smooth chart */}
        <div className="col-span-12 sm:col-span-8 mt-1">
          <Tile>
            <div className="flex items-center justify-between mb-5">
              <Label>Aktivität</Label>
              <div className="flex items-center gap-5">
                <div>
                  <Label>Diese Woche</Label>
                  <span className="mt-0.5 block text-[22px] font-semibold text-white leading-none">21</span>
                </div>
                <div>
                  <Label>Heute</Label>
                  <span className="mt-0.5 block text-[22px] font-semibold text-white leading-none">2</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="h-[110px] sm:h-[130px]">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="blueNebula" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
                    <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                  </linearGradient>
                  <filter id="glowLine">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Nebula fill */}
                <path d={fillPath} fill="url(#blueNebula)" />

                {/* Smooth line */}
                <path
                  d={curvePath}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  filter="url(#glowLine)"
                />

                {/* Dot markers */}
                {pts.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r="2.5"
                    fill="#3B82F6"
                    stroke="#080808"
                    strokeWidth="1"
                  />
                ))}
              </svg>
            </div>

            {/* Weekday labels */}
            <div className="flex justify-between mt-2 px-0.5">
              {weekDays.map((d) => (
                <span key={d} className="text-[9px] text-[#3a3a42]">{d}</span>
              ))}
            </div>
          </Tile>
        </div>

        {/* Bewerbungsreise */}
        <div className="col-span-12 sm:col-span-4 mt-1">
          <Tile className="h-full">
            <Label>Bewerbungsreise</Label>

            <div className="mt-5 space-y-5">
              {[
                { label: 'Beworben', value: '5', sub: '/ 21', color: '#3B82F6' },
                { label: 'Rücklauf', value: '24%', color: '#A78BFA' },
                { label: 'Interviews', value: '1', color: '#F59E0B' },
                { label: 'Offen', value: '16', color: '#6B7280' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: item.color, boxShadow: `0 0 6px ${item.color}40` }}
                    />
                    <span className="text-[11px] tracking-[0.14em] uppercase text-[#505058]">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-semibold text-white leading-none tracking-tight">
                      {item.value}
                    </span>
                    {item.sub && (
                      <span className="text-[12px] text-[#3a3a42]">{item.sub}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Profile completeness */}
            <div
              className="mt-6 pt-5"
              style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <Label>Profil</Label>
                <span className="text-[13px] font-medium text-white">94%</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Lebenslauf', complete: true, icon: FileText },
                  { label: 'Fähigkeiten', complete: true, icon: Star },
                  { label: 'Präferenzen', complete: false, icon: Zap },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <item.icon size={12} className="text-[#505058]" />
                      <span className="text-[11px] text-[#606068]">{item.label}</span>
                    </div>
                    {item.complete ? (
                      <GlowIcon
                        icon={CheckCircle2}
                        glowColor="rgba(52,211,153,0.12)"
                        iconColor="#34D399"
                      />
                    ) : (
                      <span className="text-[11px] font-medium text-[#505058]">2/3</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Tile>
        </div>

        {/* === Row 3: Weekly Goals === */}
        <div className="col-span-12 mt-1">
          <Tile>
            <Label className="mb-5">Wochenziele</Label>
            <div className="mt-4 grid grid-cols-12 gap-3 sm:gap-4">
              {[
                { label: '5 Analysen', complete: true, icon: Search },
                { label: 'Top-Bewerber', complete: true, icon: TrendingUp },
                { label: '3 Bewerbungen', complete: false, icon: Sparkles },
              ].map((goal) => (
                <div
                  key={goal.label}
                  className="col-span-12 sm:col-span-4 flex items-center gap-3 rounded-xl px-4 py-3"
                  style={{
                    background: goal.complete
                      ? 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.01) 100%)'
                      : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                  }}
                >
                  <GlowIcon
                    icon={goal.complete ? CheckCircle2 : goal.icon}
                    glowColor={
                      goal.complete ? 'rgba(52,211,153,0.14)' : 'rgba(255,255,255,0.04)'
                    }
                    iconColor={goal.complete ? '#34D399' : '#505058'}
                  />
                  <span
                    className={`text-[12px] font-medium ${goal.complete ? 'text-[#c8c8d0]' : 'text-[#505058]'}`}
                  >
                    {goal.label}
                  </span>
                </div>
              ))}
            </div>
          </Tile>
        </div>

        {/* === Row 4: Next Steps — Premium CTA Cards === */}
        <div className="col-span-12 mt-1">
          <Label className="mb-4">Nächste Schritte</Label>
          <div className="grid grid-cols-12 gap-3 sm:gap-4 mt-4">
            {[
              {
                title: 'Matches entdecken',
                sub: '3 neue Jobs gefunden',
                icon: Search,
                glow: 'rgba(59,130,246,0.14)',
                iconColor: '#60A5FA',
                action: () => navigate('/jobs'),
              },
              {
                title: 'Profilboost',
                sub: '+12% mit KI-Optimierung',
                icon: Sparkles,
                glow: 'rgba(168,85,247,0.14)',
                iconColor: '#C084FC',
                action: () => navigate('/ai-assistant'),
              },
              {
                title: 'Interview vorbereiten',
                sub: 'KI-Coaching starten',
                icon: Mic,
                glow: 'rgba(251,191,36,0.12)',
                iconColor: '#FBBF24',
                action: () => navigate('/jobs'),
              },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={item.action}
                className="col-span-12 sm:col-span-4 group rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(180deg, #080808 0%, #030303 100%)',
                  boxShadow:
                    'inset 0 1px 0 0 rgba(255,255,255,0.04), 0 4px 12px -2px rgba(0,0,0,0.5)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GlowIcon icon={item.icon} glowColor={item.glow} iconColor={item.iconColor} />
                    <div>
                      <div className="text-[13px] font-medium text-[#e0e0e8]">{item.title}</div>
                      <div className="text-[10px] text-[#505058] mt-0.5">{item.sub}</div>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className="text-[#2a2a32] transition-colors group-hover:text-[#505058]"
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
