import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState({
    hasInterview: false,
    jobTitle: '',
    hoursRemaining: 0
  });

  useEffect(() => {
    const mockInterview = {
      hasInterview: false,
      jobTitle: 'Software Engineer',
      hoursRemaining: 18
    };
    setInterviewData(mockInterview);
  }, []);

  // Line chart data points
  const chartData = [20, 45, 30, 60, 85, 55, 70];
  const maxChartVal = Math.max(...chartData);
  const minChartVal = Math.min(...chartData);
  
  // Generate SVG path for area chart
  const generateAreaPath = () => {
    const width = 100;
    const height = 60;
    const points = chartData.map((val, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((val - minChartVal) / (maxChartVal - minChartVal)) * (height - 10) - 5;
      return `${x},${y}`;
    });
    
    return `M0,${height} L${points.join(' L')} L${width},${height} Z`;
  };
  
  const generateLinePath = () => {
    const width = 100;
    const height = 60;
    const points = chartData.map((val, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((val - minChartVal) / (maxChartVal - minChartVal)) * (height - 10) - 5;
      return `${x},${y}`;
    });
    
    return `M${points.join(' L')}`;
  };

  return (
    <div className="min-h-full bg-[#050505] px-6 py-8 sm:px-8">
      {/* Header */}
      <div className="mb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold tracking-tight text-white">
              JobAssist
            </h1>
            <p className="mt-1 text-[13px] text-[#666666]">
              KI-gestützte Übersicht deiner Bewerbungsstärke
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-[13px] text-[#888888]">Auf Erfolgskurs</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Left Column - Score & Stats */}
        <div className="col-span-12 md:col-span-3 space-y-8">
          
          {/* Match Score - Elegant Thin Ring */}
          <div className="flex flex-col items-center">
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full blur-xl opacity-30 bg-gradient-to-tr from-emerald-500/40 to-transparent" />
              
              {/* SVG Ring */}
              <svg width="140" height="140" viewBox="0 0 140 140" className="relative">
                <defs>
                  <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                {/* Background track */}
                <circle 
                  cx="70" 
                  cy="70" 
                  r="62" 
                  fill="none" 
                  stroke="#1a1a1a" 
                  strokeWidth="3"
                />
                {/* Progress arc */}
                <circle 
                  cx="70" 
                  cy="70" 
                  r="62" 
                  fill="none" 
                  stroke="url(#ringGradient)" 
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${63 * 3.9} ${100 * 3.9}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 70 70)"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[40px] font-semibold tracking-tight text-white">63%</span>
                <span className="text-[11px] text-[#666666] uppercase tracking-wider">Match</span>
              </div>
            </div>
            
            <div className="mt-4 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span className="text-[12px] text-[#888888]">+2% seit gestern</span>
            </div>
          </div>

          {/* Stats Row - No Borders */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/[0.05]">
            <div>
              <div className="text-[32px] font-semibold text-white">5</div>
              <div className="text-[11px] text-[#666666] uppercase tracking-wider mt-1">Top-Matches</div>
            </div>
            <div>
              <div className="text-[32px] font-semibold text-[#60A5FA]">21</div>
              <div className="text-[11px] text-[#666666] uppercase tracking-wider mt-1">Analysiert</div>
            </div>
          </div>

          {/* Performance Index */}
          <div className="pt-6 border-t border-white/[0.05]">
            <div className="flex items-baseline gap-2">
              <span className="text-[48px] font-semibold text-white">87</span>
              <span className="text-[13px] text-emerald-500">↑ 12%</span>
            </div>
            <div className="text-[11px] text-[#666666] uppercase tracking-wider mt-1">Leistungsindex</div>
            <div className="mt-3 h-1 rounded-full bg-[#1a1a1a]">
              <div className="h-full w-[87%] rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            </div>
            <div className="mt-2 text-[11px] text-[#888888]">Top 15%</div>
          </div>

          {/* Milestone */}
          <div className="pt-6 border-t border-white/[0.05]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-[#666666] uppercase tracking-wider">Meilenstein</span>
              <span className="text-[11px] text-[#888888]">90 Pkt.</span>
            </div>
            <div className="text-[24px] font-semibold text-white">Experte</div>
            <div className="mt-3 h-1 rounded-full bg-[#1a1a1a]">
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-violet-500 to-violet-400" />
            </div>
            <div className="mt-2 text-[11px] text-[#888888]">Noch 3 Punkte</div>
          </div>
        </div>

        {/* Middle Column - Activity */}
        <div className="col-span-12 md:col-span-5 space-y-8">
          
          {/* Daily Goal */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-[#666666] uppercase tracking-wider">Tagesziel</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                  <span className="text-[11px] text-[#888888]">5 Tage</span>
                </div>
                <span className="text-[11px] text-emerald-500">+2 heute</span>
                <span className="text-[13px] text-white font-mono">2/3</span>
              </div>
            </div>
            
            <div className="h-2 rounded-full bg-[#1a1a1a] overflow-hidden">
              <div className="h-full w-[66%] rounded-full bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
            </div>
            <div className="mt-3 text-[11px] text-[#888888]">Noch 1 Analyse für deine Belohnung</div>
          </div>

          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/[0.05]">
            <div>
              <div className="text-[11px] text-[#666666] uppercase tracking-wider mb-1">Diese Woche</div>
              <div className="text-[28px] font-semibold text-white">21</div>
              <div className="text-[11px] text-[#888888]">Analysen</div>
            </div>
            <div>
              <div className="text-[11px] text-[#666666] uppercase tracking-wider mb-1">Heute</div>
              <div className="text-[28px] font-semibold text-white">2</div>
              <div className="text-[11px] text-[#888888]">Analysen</div>
            </div>
          </div>

          {/* Line Chart */}
          <div className="pt-6 border-t border-white/[0.05]">
            <div className="text-[11px] text-[#666666] uppercase tracking-wider mb-4">Wochenübersicht</div>
            
            <div className="relative h-[140px]">
              <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area fill */}
                <path d={generateAreaPath()} fill="url(#areaGradient)" />
                
                {/* Line */}
                <path 
                  d={generateLinePath()} 
                  fill="none" 
                  stroke="#60A5FA" 
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {chartData.map((val, i) => {
                  const x = (i / (chartData.length - 1)) * 100;
                  const y = 60 - ((val - minChartVal) / (maxChartVal - minChartVal)) * 50 - 5;
                  return (
                    <g key={i}>
                      <circle 
                        cx={x} 
                        cy={y} 
                        r="2" 
                        fill="#050505" 
                        stroke="#60A5FA" 
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </svg>
              
              {/* Day labels */}
              <div className="flex justify-between mt-2">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                  <span key={day} className="text-[10px] text-[#666666]">{day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Journey */}
        <div className="col-span-12 md:col-span-4">
          <div className="text-[11px] text-[#666666] uppercase tracking-wider mb-6">Deine Bewerbungsreise</div>
          
          <div className="space-y-0">
            {[
              { label: 'Beworben', value: '5', sub: '/ 21', desc: 'Erster Schritt getan', color: 'blue' },
              { label: 'Rücklauf', value: '24%', sub: '', desc: 'Aktiv verfolgt', color: 'indigo' },
              { label: 'Interviews', value: '1', sub: '', desc: 'Aktive Gespräche', color: 'violet' },
              { label: 'Offen', value: '16', sub: '', desc: 'Noch nicht beworben', color: 'slate' },
            ].map((item, index) => (
              <div 
                key={item.label}
                className={`py-5 ${index !== 3 ? 'border-b border-white/[0.05]' : ''}`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-[#666666] uppercase tracking-wider">{item.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-semibold text-white">{item.value}</span>
                    {item.sub && <span className="text-[13px] text-[#666666]">{item.sub}</span>}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-[#888888]">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* Profile Strength */}
          <div className="mt-8 pt-6 border-t border-white/[0.05]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-[#666666] uppercase tracking-wider">Profil-Stärke</span>
              <span className="text-[13px] text-blue-400">94%</span>
            </div>
            
            <div className="space-y-2">
              {[
                { label: 'Lebenslauf', status: 'complete' },
                { label: 'Fähigkeiten', status: 'complete' },
                { label: 'Präferenzen', status: 'partial' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <span className="text-[12px] text-[#888888]">{item.label}</span>
                  <span className={`text-[12px] ${item.status === 'complete' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {item.status === 'complete' ? '✓' : '2/3'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section - Goals */}
        <div className="col-span-12 pt-8 border-t border-white/[0.05]">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[11px] text-[#666666] uppercase tracking-wider">Wochenziele</span>
            <span className="text-[11px] text-[#888888]">2 von 3 erreicht</span>
          </div>
          
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: '5 Analysen', status: 'complete', sub: 'Abgeschlossen' },
              { label: 'Top-Bewerber', status: 'complete', sub: 'Aktiviert' },
              { label: '3 Bewerbungen', status: 'pending', sub: 'Noch 2 offen' },
            ].map((goal) => (
              <div key={goal.label} className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${goal.status === 'complete' ? 'bg-emerald-500' : 'bg-[#333333]'}`} />
                <div>
                  <div className={`text-[13px] ${goal.status === 'complete' ? 'text-white' : 'text-[#888888]'}`}>
                    {goal.label}
                  </div>
                  <div className={`text-[11px] ${goal.status === 'complete' ? 'text-emerald-500' : 'text-[#666666]'}`}>
                    {goal.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="col-span-12 pt-8 border-t border-white/[0.05]">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[11px] text-[#666666] uppercase tracking-wider">Nächste Schritte</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] text-[#888888]">KI-Empfehlung</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[
              { title: 'Matches entdecken', sub: '3 neue Stellen', badge: 'NEU', action: () => navigate('/jobs') },
              { title: 'Profilboost aktivieren', sub: '+12% Match-Chance', badge: null, action: () => navigate('/ai-assistant') },
              { title: interviewData.hasInterview ? `Interview in ${interviewData.hoursRemaining}h` : 'Interview vorbereiten', sub: interviewData.hasInterview ? 'Gespräch vorbereiten' : 'Jetzt bewerben', badge: null, action: () => navigate('/jobs') },
            ].map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                className="group flex items-center justify-between py-4 px-0 text-left hover:opacity-80 transition-opacity"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] text-white">{item.title}</span>
                    {item.badge && (
                      <span className="text-[9px] text-blue-400">{item.badge}</span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#666666] mt-0.5">{item.sub}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#333333] group-hover:text-[#666666] transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
