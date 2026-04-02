import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const bars = [
    { day: 'Mo', value: 4, color: 'bg-white/[0.06]' },
    { day: 'Di', value: 2, color: 'bg-white/[0.06]' },
    { day: 'Mi', value: 5, color: 'bg-white/[0.06]' },
    { day: 'Do', value: 6, color: 'bg-gradient-to-b from-[#4F8CFF] to-[#2F63E8]', active: true },
    { day: 'Fr', value: 1, color: 'bg-gradient-to-b from-[#4F8CFF] to-[#2F63E8]' },
    { day: 'Sa', value: 3, color: 'bg-gradient-to-b from-[#4F8CFF] to-[#2F63E8]' },
    { day: 'So', value: 2, color: 'bg-gradient-to-b from-[#34E2A1] to-[#12B981]', active: true, textColor: 'text-[#34E2A1]' },
  ];
  const maxVal = Math.max(...bars.map((b) => b.value));

  return (
    <div className="min-h-full bg-black px-3 py-4 sm:px-4">
      <div className="grid grid-cols-12 gap-[1px] overflow-hidden rounded-[18px] border border-white/10 bg-white/10">
        <div className="col-span-12 flex items-center justify-between bg-[#090B0F] px-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3B82F6] shadow-[0_0_30px_rgba(59,130,246,0.28)]">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M5 12V8" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 14V6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M15 11V9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>

            <div>
              <h1 className="text-[15px] font-semibold leading-none text-white sm:text-[17px]">
                Markt-Kompatibilität
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                KI-gestützte Übersicht deiner Bewerbungsstärke
              </p>
            </div>
          </div>

          <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Auf Erfolgskurs
          </div>
        </div>

        <section className="col-span-12 bg-[#090B0F] p-6 md:col-span-3">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            {/* Progress circle showing 63% - uses conic-gradient for accurate visual */}
          <div className="mx-auto flex h-[156px] w-[156px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(9,11,15,0.96)_64%)]">
            <div
              className="flex h-[130px] w-[130px] items-center justify-center rounded-full border-[6px] border-emerald-500 bg-[#090B0F] text-[32px] font-bold text-emerald-400 relative overflow-hidden"
            >
              <span className="relative z-10 text-[36px] font-bold">63%</span>
            </div>
          </div>

            {/* Momentum indicators */}
            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">+2% seit gestern</span>
              </div>
              <p className="text-center text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">Noch 7%</span> bis "Sehr Gut"
              </p>
              {/* Progress to next milestone */}
              <div className="mx-auto h-1.5 w-24 overflow-hidden rounded-full bg-[#1C2333]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#34E2A1] to-[#10B981]"
                  style={{ width: '90%' }}
                />
              </div>
            </div>

            <p className="text-center text-sm text-slate-400">
              <span className="text-[#7FD6FF]">Aus 21</span> analysierten Stellen
            </p>

            <div className="grid w-full grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-400/10 bg-[#0A0C12] px-3 py-2.5 text-center">
                <div className="text-base font-semibold text-white">5</div>
                <p className="text-[10px] text-slate-500">Top-Matches</p>
              </div>
              <div className="rounded-xl border border-blue-400/10 bg-[#0A0C12] px-3 py-2.5 text-center">
                <div className="text-base font-semibold text-blue-300">21</div>
                <p className="text-[10px] text-slate-500">Analysiert</p>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] p-5 md:col-span-5 md:p-6">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Aktivitätsverlauf
              </h2>
              <div className="flex items-center gap-2">
                {/* Daily Streak indicator */}
                <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[11px] font-bold text-orange-300">5 Tage</span>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  +2 heute
                </div>
              </div>
            </div>

            {/* Daily goal progress */}
            <div className="mt-3 rounded-xl border border-[#233250] bg-[#0A0C12] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold text-slate-300">Tagesziel: 3 Analysen</p>
                <span className="text-[11px] font-bold text-blue-400">2/3</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#1C2333]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA]"
                  style={{ width: '66%' }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">Noch 1 Analyse für deine Belohnung</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#233250] bg-[#0A0C12] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Diese Woche
                </p>
                <div className="mt-2 text-[21px] font-semibold leading-none text-white">21</div>
                <p className="mt-1 text-sm text-slate-500">Analysen</p>
              </div>

              <div className="rounded-xl border border-[#233250] bg-[#0A0C12] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Heute
                </p>
                <div className="mt-2 text-[21px] font-semibold leading-none text-white">2</div>
                <p className="mt-1 text-sm text-slate-500">Analysen</p>
              </div>
            </div>

            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Wochenübersicht
            </p>

            <div className="mt-3 rounded-xl border border-[#233250] bg-[#0A0C12] p-4">
              <div className="flex flex-1 items-end gap-3">
              {bars.map((bar) => (
                <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className={`text-xs font-medium ${bar.textColor ?? 'text-slate-500'}`}>
                    {bar.value}
                  </span>
                  <div className="flex w-full items-end justify-center" style={{ height: '140px' }}>
                    <div
                      className={`w-full max-w-10 rounded-lg ${bar.color} ${
                        bar.active ? 'shadow-[0_8px_24px_rgba(79,140,255,0.22)]' : ''
                      }`}
                      style={{ height: `${Math.max((bar.value / maxVal) * 100, 8)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${bar.textColor ?? 'text-slate-500'}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] md:col-span-4">
          {/* Visual Funnel - Application Journey */}
          <div className="flex h-full flex-col">
            {/* Funnel header */}
            <div className="border-b border-white/10 px-6 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Deine Bewerbungsreise
              </p>
            </div>
            
            {/* Funnel steps */}
            <div className="flex-1 flex flex-col">
              {/* Step 1: Applied */}
              <div className="group relative flex flex-1 flex-col justify-center border-b border-white/10 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-400">
                      Beworben
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[32px] font-semibold leading-none text-white">5</span>
                      <span className="text-sm text-slate-500">/ 21 Stellen</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Erster Schritt getan</p>
              </div>

              {/* Step 2: Response Rate */}
              <div className="group relative flex flex-1 flex-col justify-center border-b border-white/10 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-400">
                      Rücklauf
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[32px] font-semibold leading-none text-white">24%</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Aktiv verfolgt</p>
              </div>

              {/* Step 3: Interviews */}
              <div className="group relative flex flex-1 flex-col justify-center border-b border-white/10 px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-violet-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-violet-400">
                      Interviews
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[32px] font-semibold leading-none text-white">1</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-400">Aktive Gespräche</p>
              </div>

              {/* Step 4: Remaining */}
              <div className="group relative flex flex-1 flex-col justify-center px-6 py-5 hover:bg-white/[0.02] transition-colors">
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-slate-500 to-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Offen
                    </p>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-[32px] font-semibold leading-none text-slate-300">16</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-500">Noch nicht beworben</p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom widget - stretches across */}
        <section className="col-span-12 bg-[#090B0F] p-5 md:p-6">
          <div className="rounded-xl border border-slate-700/50 bg-[#0A0C12] p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Bewerbungs-Übersicht</h3>
                <p className="text-xs text-slate-400 mt-1">Alle deine Aktivitäten auf einen Blick</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">5</div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Beworben</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">24%</div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Rücklauf</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-violet-400">1</div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Interviews</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">3</div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Neue Matches</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Nächste Schritte section */}
        <section className="col-span-12 bg-[#090B0F] p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Nächste Schritte
            </h2>
            <span className="rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1 text-[11px] font-semibold text-blue-300">
              KI-Empfehlung
            </span>
          </div>

          <div className="mt-4 grid grid-cols-12 gap-3">
            {/* Primary CTA - Enhanced visibility with glow and filled background */}
            <div onClick={() => navigate('/jobs')} className="col-span-12 flex items-center gap-4 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-500/20 to-blue-600/10 p-4 shadow-[0_0_30px_rgba(59,130,246,0.15)] md:col-span-4 cursor-pointer hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] transition-shadow">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-md shadow-blue-500/30">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 2v14M2 9h14" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">3 neue Matches heute</p>
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEU</span>
                </div>
                <p className="mt-0.5 text-xs text-blue-200/80">Top-Matches &gt;80% Übereinstimmung – Jetzt bewerben!</p>
              </div>
            </div>

            <div onClick={() => navigate('/ai-assistant')} className="col-span-12 flex items-center gap-4 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4 md:col-span-4 cursor-pointer hover:bg-emerald-400/10 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 9.5L7 13.5L15 4.5" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Profilboost aktivieren</p>
                <p className="mt-0.5 text-xs text-slate-400">+12% Match-Chance heute noch</p>
              </div>
            </div>

            <div onClick={() => navigate('/applications?status=interview')} className="col-span-12 flex items-center gap-4 rounded-xl border border-violet-400/15 bg-violet-400/5 p-4 md:col-span-4 cursor-pointer hover:bg-violet-400/10 transition-colors">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/15">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 2L2 7V16H6V11H12V16H16V7L9 2Z" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Interview morgen vorbereiten</p>
                <p className="mt-0.5 text-xs text-slate-400">1 Gespräch in 24 Stunden</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
