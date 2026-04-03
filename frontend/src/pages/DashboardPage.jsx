import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [interviewData] = useState({
    hasInterview: false,
    jobTitle: '',
    hoursRemaining: 18
  });

  // Line chart data points
  const chartData = [20, 45, 30, 60, 85, 55, 70];
  const maxChartVal = Math.max(...chartData);
  const minChartVal = Math.min(...chartData);
  
  const generateLinePath = () => {
    const width = 100;
    const height = 40;
    const points = chartData.map((val, i) => {
      const x = (i / (chartData.length - 1)) * width;
      const y = height - ((val - minChartVal) / (maxChartVal - minChartVal)) * (height - 5);
      return `${x},${y}`;
    });
    return `M${points.join(' L')}`;
  };

  return (
    <div className="min-h-full bg-black px-8 py-10">
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-[32px] font-semibold tracking-tight text-white">JobAssist</h1>
        <p className="mt-2 text-[13px] tracking-wide text-[#444444]">Bewerbungsübersicht</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-16">
        
        {/* Left Column */}
        <div className="col-span-12 md:col-span-3 space-y-12">
          
          {/* Match Score */}
          <div className="space-y-4">
            <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase">Markt-Score</div>
            <div className="text-[56px] font-semibold leading-none text-white">63%</div>
            <div className="h-[1px] w-12 bg-emerald-500" />
            <div className="text-[12px] text-[#666666]">+2% seit gestern</div>
          </div>

          {/* Stats */}
          <div className="space-y-8 pt-8">
            <div>
              <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-2">Top-Matches</div>
              <div className="text-[36px] font-semibold text-white">5</div>
            </div>
            <div>
              <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-2">Analysiert</div>
              <div className="text-[36px] font-semibold text-white">21</div>
            </div>
          </div>

          {/* Performance */}
          <div className="pt-8">
            <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-3">Leistungsindex</div>
            <div className="flex items-baseline gap-3">
              <span className="text-[48px] font-semibold text-white">87</span>
              <span className="text-[13px] text-emerald-500">↑12%</span>
            </div>
            <div className="mt-3 h-[1px] w-full bg-[#1a1a1a]">
              <div className="h-full w-[87%] bg-emerald-500" />
            </div>
          </div>

          {/* Milestone */}
          <div className="pt-8">
            <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-3">Meilenstein</div>
            <div className="text-[28px] font-semibold text-white">Experte</div>
            <div className="mt-3 h-[1px] w-full bg-[#1a1a1a]">
              <div className="h-full w-[72%] bg-violet-500" />
            </div>
            <div className="mt-2 text-[12px] text-[#444444]">90 Punkte</div>
          </div>
        </div>

        {/* Middle Column */}
        <div className="col-span-12 md:col-span-5 space-y-12">
          
          {/* Daily Goal */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] tracking-[0.2em] text-[#444444] uppercase">Tagesziel</span>
              <div className="flex items-center gap-4">
                <span className="text-[12px] text-[#666666]">5 Tage</span>
                <span className="text-[12px] text-emerald-500">+2</span>
                <span className="text-[14px] text-white font-mono">2/3</span>
              </div>
            </div>
            <div className="h-[1px] w-full bg-[#1a1a1a]">
              <div className="h-full w-[66%] bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            </div>
          </div>

          {/* Activity */}
          <div className="grid grid-cols-2 gap-12 pt-8">
            <div>
              <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-2">Diese Woche</div>
              <div className="text-[32px] font-semibold text-white">21</div>
            </div>
            <div>
              <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-2">Heute</div>
              <div className="text-[32px] font-semibold text-white">2</div>
            </div>
          </div>

          {/* Line Chart - Ultra Minimal */}
          <div className="pt-8">
            <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-6">Aktivität</div>
            <div className="h-[60px]">
              <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                <path 
                  d={generateLinePath()} 
                  fill="none" 
                  stroke="#3B82F6" 
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ filter: 'drop-shadow(0 0 3px rgba(59,130,246,0.5))' }}
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 md:col-span-4 space-y-12">
          
          {/* Journey */}
          <div>
            <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-8">Bewerbungsreise</div>
            
            <div className="space-y-8">
              {[
                { label: 'Beworben', value: '5', sub: '/ 21' },
                { label: 'Rücklauf', value: '24%' },
                { label: 'Interviews', value: '1' },
                { label: 'Offen', value: '16' },
              ].map((item) => (
                <div key={item.label} className="flex items-baseline justify-between">
                  <span className="text-[11px] tracking-[0.2em] text-[#444444] uppercase">{item.label}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-semibold text-white">{item.value}</span>
                    {item.sub && <span className="text-[13px] text-[#444444]">{item.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile */}
          <div className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[11px] tracking-[0.2em] text-[#444444] uppercase">Profil</span>
              <span className="text-[14px] text-white">94%</span>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Lebenslauf', complete: true },
                { label: 'Fähigkeiten', complete: true },
                { label: 'Präferenzen', complete: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#666666]">{item.label}</span>
                  {item.complete ? (
                    <div className="h-[1px] w-3 bg-emerald-500" />
                  ) : (
                    <span className="text-[12px] text-[#444444]">2/3</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Goals */}
        <div className="col-span-12 pt-12">
          <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-8">Wochenziele</div>
          <div className="flex gap-16">
            {[
              { label: '5 Analysen', complete: true },
              { label: 'Top-Bewerber', complete: true },
              { label: '3 Bewerbungen', complete: false },
            ].map((goal) => (
              <div key={goal.label} className="flex items-center gap-3">
                <div className={`h-[1px] w-4 ${goal.complete ? 'bg-emerald-500' : 'bg-[#333333]'}`} />
                <span className={`text-[13px] ${goal.complete ? 'text-white' : 'text-[#444444]'}`}>{goal.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Next Steps */}
        <div className="col-span-12 pt-12">
          <div className="text-[11px] tracking-[0.2em] text-[#444444] uppercase mb-8">Nächste Schritte</div>
          <div className="flex gap-16">
            {[
              { title: 'Matches entdecken', sub: '3 neue', action: () => navigate('/jobs') },
              { title: 'Profilboost', sub: '+12%', action: () => navigate('/ai-assistant') },
              { title: 'Vorbereiten', sub: 'Interview', action: () => navigate('/jobs') },
            ].map((item) => (
              <button
                key={item.title}
                onClick={item.action}
                className="group flex items-center gap-2 text-left hover:opacity-60 transition-opacity"
              >
                <div>
                  <div className="text-[14px] text-white">{item.title}</div>
                  <div className="text-[11px] text-[#444444]">{item.sub}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#333333]" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
