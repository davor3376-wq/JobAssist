import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [interviewData, setInterviewData] = useState({
    hasInterview: false,
    jobTitle: '',
    hoursRemaining: 0
  });

  // Simulated fetch for interview data - replace with actual API call
  useEffect(() => {
    // Mock data - in real app, fetch from API
    const mockInterview = {
      hasInterview: false,
      jobTitle: 'Software Engineer',
      hoursRemaining: 18
    };
    setInterviewData(mockInterview);
  }, []);

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
              <h1 className="text-[15px] font-semibold leading-none text-white sm:text-[17px]">
                JobAssist
              </h1>
              <p className="mt-0.5 text-sm text-slate-400">
                KI-gestützte Übersicht deiner Bewerbungsstärke
              </p>
            </div>

          <div className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300">
            Auf Erfolgskurs
          </div>
        </div>

        <section className="col-span-12 bg-[#090B0F] p-6 md:col-span-3">
          <div className="flex h-full flex-col items-center justify-center gap-4">
          <div className="mx-auto flex h-[156px] w-[156px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(9,11,15,0.96)_64%)] shadow-[0_0_60px_rgba(16,185,129,0.3),0_0_120px_rgba(16,185,129,0.15)] animate-pulse">
            <div
              className="flex h-[130px] w-[130px] items-center justify-center rounded-full border-[6px] border-emerald-500 bg-[#090B0F] text-[32px] font-bold text-emerald-400 relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.4),inset_0_0_20px_rgba(16,185,129,0.1)]"
            >
              <span className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 via-transparent to-emerald-400/20 animate-pulse"></span>
              <span className="relative z-10 text-[42px] font-extrabold tracking-tight drop-shadow-[0_0_10px_rgba(52,226,161,0.8)]">63%</span>
            </div>
          </div>

            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-blue-300">+2% seit gestern</span>
              </div>
              <p className="text-center text-xs text-slate-400">
                <span className="text-emerald-400 font-medium">Noch 7%</span> bis Sehr Gut
              </p>
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

            <div className="w-full rounded-xl border border-blue-400/20 bg-blue-500/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15">
                    <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                      <path d="M9 10C11.2091 10 13 8.20914 13 6C13 3.79086 11.2091 2 9 2C6.79086 2 5 3.79086 5 6C5 8.20914 6.79086 10 9 10Z" stroke="#60A5FA" strokeWidth="1.5"/>
                      <path d="M2 16C2 13.5 4 11 9 11C14 11 16 13.5 16 16" stroke="#60A5FA" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-blue-300">Profil-Stärke</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold">94%</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Lebenslauf</span>
                  <span className="text-emerald-400">✓</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Fähigkeiten</span>
                  <span className="text-emerald-400">✓</span>
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Präferenzen</span>
                  <span className="text-amber-400">2/3</span>
                </div>
              </div>
            </div>

            <div className="w-full mt-2 rounded-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-blue-500/5 p-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-emerald-300">Leistungsindex</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">TOP 15%</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-bold text-white">87</span>
                <span className="text-xs text-emerald-400 mb-1">↑ 12%</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Besser als 85% aller Bewerber</p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[#1C2333]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 shadow-[0_0_10px_rgba(52,226,161,0.5)]"
                  style={{ width: '87%' }}
                />
              </div>
            </div>

            <div className="w-full rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/15">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2L11.5 6.5L16.5 7.5L13 11L14 16L9 13.5L4 16L5 11L1.5 7.5L6.5 6.5L9 2Z" stroke="#A78BFA" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="text-xs font-semibold text-violet-300">Nächster Meilenstein</p>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">Experte</span>
                <span className="text-[10px] text-slate-400">90 Pkt.</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#1C2333]">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-500"
                  style={{ width: '72%' }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-400">Noch 3 Punkte erforderlich</p>
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
                <div className="flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-2.5 py-1">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[11px] font-bold text-orange-300">5 Tage</span>
                </div>
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  +2 heute
                </div>
              </div>
            </div>

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
                      title={`${bar.value} Bewerbungen`}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${bar.textColor ?? 'text-slate-500'}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
              Aktivitätstrend (7 Tage)
            </p>
            <div className="rounded-xl border border-[#233250] bg-[#0A0C12] p-4">
              <div className="h-24 flex items-end gap-1">
                {[65, 45, 80, 55, 90, 70, 85].map((value, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-blue-600/30 to-blue-400/60 hover:from-blue-500/50 hover:to-blue-300/80 transition-all duration-300"
                      style={{ height: `${value}%` }}
                      title={`${value} Aktivitäten`}
                    />
                    <span className="text-[10px] text-slate-500">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'][index]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] md:col-span-4">
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Deine Bewerbungsreise
              </p>
            </div>
            
            <div className="flex-1 flex flex-col">
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

        <section className="col-span-12 bg-[#090B0F] p-5 md:p-6">
          <div className="rounded-xl border border-[#233250] bg-[#0A0C12] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Wochenziele & Erfolge</h3>
                <p className="text-xs text-slate-400 mt-1">Deine aktiven Herausforderungen</p>
              </div>
              <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
                2 von 3 Zielen erreicht
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 10L8 14L16 6" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">5 Analysen</p>
                  <p className="text-xs text-emerald-400">Abgeschlossen</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2L12 8H18L13 12L15 18L10 14L5 18L7 12L2 8H8L10 2Z" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Top-Bewerber</p>
                  <p className="text-xs text-emerald-400">Aktiviert</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-600/20 bg-slate-600/5 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-600/20">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 6V14M6 10H14" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-300">3 Bewerbungen</p>
                  <p className="text-xs text-slate-500">Noch 2 offen</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] p-5 md:p-6 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Nächste Schritte
            </h2>
            <span className="rounded-full border border-blue-400/20 bg-blue-400/8 px-3 py-1 text-[11px] font-semibold text-blue-300">
              KI-Empfehlung
            </span>
          </div>

          <div className="mt-4 grid grid-cols-12 gap-3">
            <div onClick={() => navigate('/jobs')} className="col-span-12 flex items-center gap-4 rounded-xl border border-slate-700/50 bg-[#0A0C12]/80 p-4 md:col-span-4 cursor-pointer hover:bg-[#0A0C12] transition-colors group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 9C11.2091 9 13 7.20914 13 5C13 2.79086 11.2091 1 9 1C6.79086 1 5 2.79086 5 5C5 7.20914 6.79086 9 9 9Z" stroke="#94A3B8" strokeWidth="1.5"/>
                  <path d="M1 17V15C1 13.9391 1.42143 12.9217 2.17157 12.1716C2.92172 11.4214 3.93913 11 5 11H13C14.0609 11 15.0783 11.4214 15.8284 12.1716C16.5786 12.9217 17 13.9391 17 15V17" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white">Matches entdecken</p>
                  <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] font-bold text-white">NEU</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-400">3 neue Stellen mit 80% Übereinstimmung</p>
              </div>
              <svg className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div onClick={() => navigate('/ai-assistant')} className="col-span-12 flex items-center gap-4 rounded-xl border border-slate-700/50 bg-[#0A0C12]/80 p-4 md:col-span-4 cursor-pointer hover:bg-[#0A0C12] transition-colors group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 1V9M9 9L12 6M9 9L6 6M9 9V17M9 9L12 12M9 9L6 12" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">Profilboost jetzt aktivieren</p>
                <p className="mt-0.5 text-xs text-slate-400">+12% Match-Chance für heute sichern</p>
              </div>
              <svg className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <div onClick={() => navigate('/jobs')} className="col-span-12 flex items-center gap-4 rounded-xl border border-slate-700/50 bg-[#0A0C12]/80 p-4 md:col-span-4 cursor-pointer hover:bg-[#0A0C12] transition-colors group">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700/50">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="9" cy="9" r="7" stroke="#94A3B8" strokeWidth="1.5"/>
                  <path d="M9 5V9L12 11" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {interviewData.hasInterview 
                    ? `Interview in ${interviewData.hoursRemaining}h vorbereiten`
                    : 'Interview-Vorbereitung starten'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {interviewData.hasInterview 
                    ? `${interviewData.jobTitle} - Gespräch vorbereiten`
                    : 'Jetzt für passende Stellen bewerben'}
                </p>
              </div>
              <svg className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
