import React from 'react';

export default function DashboardPage() {
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
          <div className="flex h-full flex-col items-center justify-center gap-5">
            <div className="mx-auto flex h-[156px] w-[156px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(9,11,15,0.96)_64%)]">
              <div
                className="flex h-[130px] w-[130px] items-center justify-center rounded-full border-[9px] border-[#34E2A1] bg-[#090B0F] text-[28px] font-semibold text-[#52F2BA] shadow-[0_0_25px_rgba(52,226,161,0.18)]"
                style={{
                  borderLeftColor: '#1A513E',
                  borderTopColor: '#15382D',
                }}
              >
                63%
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
              <div className="rounded-xl border border-emerald-400/10 bg-[#0A0C12] px-3 py-2.5 text-center">
                <div className="text-base font-semibold text-emerald-300">+8%</div>
                <p className="text-[10px] text-slate-500">vs. Vorwoche</p>
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
              <div className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                +2 heute
              </div>
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

            <div className="mt-3 flex flex-1 items-end gap-3">
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
        </section>

        <section className="col-span-12 bg-[#090B0F] md:col-span-4">
          <div className="grid h-full grid-cols-2 grid-rows-2">
            <div className="flex flex-col justify-center border-r border-b border-white/10 px-6 py-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Bewerben
              </p>
              <div className="mt-3 text-[38px] font-semibold leading-none text-white">5</div>
              <p className="mt-3 text-[17px] text-slate-400">von 21 Stellen</p>
            </div>

            <div className="flex flex-col justify-center border-b border-white/10 px-6 py-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Rücklauf
              </p>
              <div className="mt-3 text-[38px] font-semibold leading-none text-white">24%</div>
              <p className="mt-3 text-[17px] text-slate-400">bereits aktiv verfolgt</p>
            </div>

            <div className="flex flex-col justify-center border-r border-white/10 px-6 py-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Interviews
              </p>
              <div className="mt-3 text-[38px] font-semibold leading-none text-white">1</div>
              <p className="mt-3 text-[17px] text-slate-400">aktive Gespräche</p>
            </div>

            <div className="flex flex-col justify-center px-6 py-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                Offen
              </p>
              <div className="mt-3 text-[38px] font-semibold leading-none text-white">16</div>
              <p className="mt-3 text-[17px] text-slate-400">noch nicht beworben</p>
            </div>
          </div>
        </section>

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
            <div className="col-span-12 flex items-center gap-4 rounded-xl border border-blue-500/15 bg-blue-500/5 p-4 md:col-span-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 2v14M2 9h14" stroke="#60A5FA" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Top-Matches bewerben</p>
                <p className="mt-0.5 text-xs text-slate-400">3 Stellen mit &gt;80% Übereinstimmung</p>
              </div>
            </div>

            <div className="col-span-12 flex items-center gap-4 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-4 md:col-span-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M3 9.5L7 13.5L15 4.5" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Profil optimieren</p>
                <p className="mt-0.5 text-xs text-slate-400">+12% Match durch Skill-Update</p>
              </div>
            </div>

            <div className="col-span-12 flex items-center gap-4 rounded-xl border border-violet-400/15 bg-violet-400/5 p-4 md:col-span-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-400/15">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 3v5l3.5 2" stroke="#A78BFA" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="9" r="6.5" stroke="#A78BFA" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Interview vorbereiten</p>
                <p className="mt-0.5 text-xs text-slate-400">1 aktives Gespräch steht an</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
