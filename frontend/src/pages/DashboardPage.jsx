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
 * Compact tile wrapper — minimal padding for density.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function Tile({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl p-2.5 ${className}`}
      style={{
        background: 'linear-gradient(180deg, #0a0a0c 0%, #050505 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Micro label — 12px ALL-CAPS.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
function Label({ children, className = '' }) {
  return (
    <span
      className={`block text-[12px] font-medium tracking-[0.14em] uppercase text-[#505058] ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * Compact glow icon — smaller for density.
 * @param {object} props
 * @param {React.ElementType} props.icon
 * @param {string} [props.glowColor]
 * @param {string} [props.iconColor]
 */
function GlowIcon({ icon: Icon, glowColor = 'rgba(52,211,153,0.2)', iconColor = '#fff' }) {
  return (
    <div className="grid place-items-center h-6 w-6 rounded-md" style={{ background: glowColor }}>
      <Icon size={12} color={iconColor} strokeWidth={2} />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // Real daily activity data — jobs saved per day
  const dailyActivity = [
    { day: 'Mo', val: 1, max: 3, label: '1 Job' },
    { day: 'Di', val: 2, max: 3, label: '2 Jobs' },
    { day: 'Mi', val: 0, max: 3, label: '—' },
    { day: 'Do', val: 3, max: 3, label: '3 Jobs' },
    { day: 'Fr', val: 2, max: 3, label: '2 Jobs' },
    { day: 'Sa', val: 1, max: 3, label: '1 Job' },
    { day: 'So', val: 0, max: 3, label: '—' },
  ];

  return (
    <div className="h-screen bg-black px-3 py-3 font-sans overflow-hidden">
      {/* Header — compact */}
      <div className="mb-3">
        <h1 className="text-[22px] font-semibold tracking-tight text-white leading-none">
          JobAssist
        </h1>
        <p className="mt-0.5 text-[11px] tracking-[0.12em] uppercase text-[#3a3a42]">
          Bewerbungsübersicht
        </p>
      </div>

      {/* === MAIN GRID: 3 columns (Content 9 cols | Sidebar 3 cols) === */}
      <div className="grid grid-cols-12 gap-2 h-[calc(100vh-70px)]">

        {/* LEFT COLUMN — Metrics & Activity (col-span-9) */}
        <div className="col-span-9 flex flex-col gap-2">

          {/* Row 1: Three metrics side by side */}
          <div className="grid grid-cols-3 gap-2">
            {/* Markt-Score */}
            <Tile>
              <Label>Markt-Score</Label>
              <div className="mt-1.5 flex items-end gap-1.5">
                <span className="text-[26px] font-semibold leading-none text-white tracking-tight">
                  63<span className="text-[14px] text-[#3a3a42]">%</span>
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1">
                <div className="h-[2px] w-5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-emerald-400/80">+2%</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-[10px] text-[#505058]">Top-Matches</span>
                  <span className="block text-[18px] font-semibold text-white leading-none">5</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#505058]">Analysiert</span>
                  <span className="block text-[18px] font-semibold text-white leading-none">21</span>
                </div>
              </div>
            </Tile>

            {/* Leistungsindex */}
            <Tile>
              <Label>Leistungsindex</Label>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span className="text-[26px] font-semibold leading-none text-white tracking-tight">
                  87
                </span>
                <span className="text-[10px] font-medium text-emerald-400">↑12%</span>
              </div>
              <div className="mt-1.5 h-[2px] w-full rounded-full bg-[#111114] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '87%',
                    background: 'linear-gradient(90deg, #10B981, #34D399)',
                    boxShadow: '0 0 6px rgba(52,211,153,0.25)',
                  }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-[#3a3a42]">
                <span>0</span>
                <span>100</span>
              </div>
            </Tile>

            {/* Meilenstein */}
            <Tile>
              <Label>Meilenstein</Label>
              <div className="mt-1.5">
                <span className="text-[22px] font-semibold text-white leading-none">Experte</span>
              </div>
              <div className="mt-1.5 h-[2px] w-full rounded-full bg-[#111114] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '72%',
                    background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                    boxShadow: '0 0 6px rgba(139,92,246,0.2)',
                  }}
                />
              </div>
              <div className="mt-0.5 flex justify-between text-[9px] text-[#3a3a42]">
                <span>72/90</span>
                <span className="text-violet-400/70">80%</span>
              </div>
            </Tile>
          </div>

          {/* Row 2: FUSED Activity + Tagesziel — ultra compact, no empty space */}
          <Tile className="flex-1 min-h-0 py-2">
            {/* Header row: single line, all info inline */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Label className="text-[11px]">Aktivität</Label>
                <div className="flex items-center gap-2 text-[10px] text-[#505058]">
                  <span>Woche: <b className="text-white">21</b></span>
                  <span className="text-[#2a2a32]">|</span>
                  <span>Heute: <b className="text-white">2</b></span>
                </div>
              </div>
              {/* Tagesziel inline */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#505058]">Tagesziel</span>
                <span className="text-[12px] font-medium text-white tabular-nums">2/3</span>
                <div className="w-16 h-[3px] rounded-full bg-[#111114] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: '66%',
                      background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                      boxShadow: '0 0 6px rgba(59,130,246,0.3)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Real Activity Data — Compact horizontal bars (not fake curve) */}
            <div className="grid grid-cols-4 gap-2">
              {dailyActivity.slice(0, 4).map((d) => (
                <div key={d.day} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] text-[#505058]">
                    <span>{d.day}</span>
                    <span className={d.val > 0 ? 'text-white' : ''}>{d.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#111114] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(d.val / d.max) * 100}%`,
                        opacity: d.val > 0 ? 1 : 0.3,
                        boxShadow: d.val > 0 ? '0 0 4px rgba(59,130,246,0.4)' : 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1.5">
              {dailyActivity.slice(4).map((d) => (
                <div key={d.day} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[9px] text-[#505058]">
                    <span>{d.day}</span>
                    <span className={d.val > 0 ? 'text-white' : ''}>{d.label}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[#111114] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{
                        width: `${(d.val / d.max) * 100}%`,
                        opacity: d.val > 0 ? 1 : 0.3,
                        boxShadow: d.val > 0 ? '0 0 4px rgba(59,130,246,0.4)' : 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Tile>

          {/* Row 3: Weekly Goals & Next Steps combined */}
          <div className="grid grid-cols-2 gap-2">
            <Tile>
              <Label className="mb-1.5">Wochenziele</Label>
              <div className="flex gap-1.5">
                {[
                  { label: '5 Analysen', complete: true, icon: Search },
                  { label: 'Top', complete: true, icon: TrendingUp },
                  { label: '3 Bewerb.', complete: false, icon: Sparkles },
                ].map((goal) => (
                  <div
                    key={goal.label}
                    className="flex items-center gap-1 rounded-lg px-2 py-1"
                    style={{
                      background: goal.complete
                        ? 'linear-gradient(135deg, rgba(52,211,153,0.06) 0%, rgba(52,211,153,0.01) 100%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.005) 100%)',
                    }}
                  >
                    <GlowIcon
                      icon={goal.complete ? CheckCircle2 : goal.icon}
                      glowColor={goal.complete ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.04)'}
                      iconColor={goal.complete ? '#34D399' : '#505058'}
                    />
                    <span className={`text-[11px] font-medium ${goal.complete ? 'text-[#c8c8d0]' : 'text-[#505058]'}`}>
                      {goal.label}
                    </span>
                  </div>
                ))}
              </div>
            </Tile>

            <div className="grid grid-cols-3 gap-1.5">
              {[
                { title: 'Matches', sub: '3 Jobs', icon: Search, glow: 'rgba(59,130,246,0.12)', iconColor: '#60A5FA', action: () => navigate('/jobs') },
                { title: 'Boost', sub: '+12%', icon: Sparkles, glow: 'rgba(168,85,247,0.10)', iconColor: '#C084FC', action: () => navigate('/ai-assistant') },
                { title: 'Interview', sub: 'Coaching', icon: Mic, glow: 'rgba(251,191,36,0.08)', iconColor: '#FBBF24', action: () => navigate('/ai-assistant') },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={item.action}
                  className="group rounded-xl p-2 text-left transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: 'linear-gradient(180deg, #0a0a0c 0%, #050505 100%)',
                    boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex flex-col items-center gap-1">
                    <GlowIcon icon={item.icon} glowColor={item.glow} iconColor={item.iconColor} />
                    <div className="text-center">
                      <div className="text-[11px] font-medium text-[#e0e0e8]">{item.title}</div>
                      <div className="text-[9px] text-[#505058]">{item.sub}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR — Bewerbungsreise & Profil (col-span-3) */}
        <div className="col-span-3 flex flex-col gap-2">

          {/* Bewerbungsreise — compact */}
          <Tile>
            <Label>Bewerbungsreise</Label>
            <div className="mt-2 space-y-1.5">
              {[
                { label: 'Beworben', value: '5', sub: '/21', color: '#3B82F6' },
                { label: 'Rücklauf', value: '24%', color: '#A78BFA' },
                { label: 'Interviews', value: '1', color: '#F59E0B' },
                { label: 'Offen', value: '16', color: '#6B7280' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1 w-1 rounded-full"
                      style={{ background: item.color, boxShadow: `0 0 4px ${item.color}40` }}
                    />
                    <span className="text-[10px] tracking-[0.08em] uppercase text-[#505058]">
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-[18px] font-semibold text-white leading-none tracking-tight">
                      {item.value}
                    </span>
                    {item.sub && (
                      <span className="text-[10px] text-[#3a3a42]">{item.sub}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Tile>

          {/* Profil-Stärke — compact */}
          <Tile className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <Label>Profil-Stärke</Label>
              <span className="text-[20px] font-semibold text-white">94%</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Lebenslauf', complete: true, icon: FileText },
                { label: 'Fähigkeiten', complete: true, icon: Star },
                { label: 'Präferenzen', complete: false, icon: Zap, sub: '2/3' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <item.icon size={10} className="text-[#505058]" />
                    <span className="text-[10px] text-[#606068]">{item.label}</span>
                  </div>
                  {item.complete ? (
                    <GlowIcon
                      icon={CheckCircle2}
                      glowColor="rgba(52,211,153,0.1)"
                      iconColor="#34D399"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-[#505058]">{item.sub}</span>
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
