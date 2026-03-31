import React from 'react';

export default function DashboardPage() {
  const bars = [
    { day: 'Mo', height: 'h-13', color: 'bg-white/[0.06]' },
    { day: 'Di', height: 'h-13', color: 'bg-white/[0.06]' },
    { day: 'Mi', height: 'h-13', color: 'bg-white/[0.06]' },
    { day: 'Do', height: 'h-13', color: 'bg-gradient-to-b from-[#4F8CFF] to-[#2F63E8]', active: true },
    { day: 'Fr', height: 'h-2.5', color: 'bg-gradient-to-r from-[#4F8CFF] to-[#2F63E8]' },
    { day: 'Sa', height: 'h-7', color: 'bg-gradient-to-b from-[#4F8CFF] to-[#2F63E8]' },
    { day: 'So', height: 'h-2.5', color: 'bg-gradient-to-r from-[#34E2A1] to-[#12B981]', active: true, textColor: 'text-[#34E2A1]' },
  ];

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

        <section className="col-span-12 bg-[#090B0F] p-7 md:col-span-3">
          <div className="flex h-full min-h-[450px] flex-col">
            <div className="rounded-[18px] border border-emerald-400/10 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),rgba(9,11,15,0.96)_64%)] p-4 shadow-[inset_0_0_30px_rgba(16,185,129,0.06)]">
              <div className="mx-auto flex h-[156px] w-[156px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.15),rgba(0,0,0,0.85)_68%)]">
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
            </div>

            <div className="mt-auto pt-8 text-sm text-slate-400">
              <span className="text-[#7FD6FF]">Aus 21</span> analysierten Stellen
            </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] p-5 md:col-span-5 md:p-6">
          <div className="flex h-full min-h-[450px] flex-col">
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

            <div className="mt-auto flex items-end gap-6 pt-10">
              {bars.map((bar) => (
                <div key={bar.day} className="flex flex-col items-center gap-2">
                  <div className="flex h-14 items-end">
                    <div
                      className={`w-9 rounded-[7px] ${bar.height} ${bar.color} ${
                        bar.active ? 'shadow-[0_8px_24px_rgba(79,140,255,0.22)]' : ''
                      }`}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${bar.textColor ?? 'text-slate-500'}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="col-span-12 bg-[#090B0F] md:col-span-4">
          <div className="grid h-full min-h-[450px] grid-cols-2 grid-rows-2">
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
      </div>
    </div>
  );
}
