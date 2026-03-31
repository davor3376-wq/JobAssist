import React from 'react';

export default function DashboardPage() {
  return (
    <div className="px-6 py-8 md:px-8">
      <div className="grid grid-cols-12 gap-0 items-stretch overflow-hidden rounded-xl border border-white/10 bg-[#0B0E14]">
        <section className="col-span-12 border-b border-white/10 p-8 md:col-span-3 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Market Compatibility
              </p>
              <h2 className="mt-3 text-4xl font-semibold text-white">63%</h2>
            </div>

            <div className="flex justify-center">
              <div className="flex h-52 w-52 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                <div
                  className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-emerald-400 bg-[#0B0E14]"
                  style={{
                    borderTopColor: 'rgba(255,255,255,0.12)',
                    borderRightColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <span className="text-4xl font-semibold text-white">63</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Demand Match</span>
                <span className="text-lg font-medium text-white">81</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Category Fit</span>
                <span className="text-lg font-medium text-white">59</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Audience Intent</span>
                <span className="text-lg font-medium text-white">72</span>
              </div>
            </div>
          </div>
        </section>

        <section className="col-span-12 border-b border-white/10 p-8 md:col-span-5 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col gap-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                  Aktivitätsverlauf
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Performance Trend</h2>
              </div>
              <div className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                6 Monate
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <svg
                viewBox="0 0 420 240"
                className="h-[260px] w-full"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Aktivitätsverlauf"
              >
                <line x1="24" y1="40" x2="396" y2="40" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                <line x1="24" y1="90" x2="396" y2="90" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                <line x1="24" y1="140" x2="396" y2="140" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />
                <line x1="24" y1="190" x2="396" y2="190" stroke="rgba(255,255,255,0.08)" strokeDasharray="4 8" />

                <path
                  d="M 24 178 L 96 150 L 168 162 L 240 118 L 312 132 L 384 84"
                  stroke="#34D399"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                <circle cx="24" cy="178" r="6" fill="#34D399" />
                <circle cx="96" cy="150" r="6" fill="#34D399" />
                <circle cx="168" cy="162" r="6" fill="#34D399" />
                <circle cx="240" cy="118" r="6" fill="#34D399" />
                <circle cx="312" cy="132" r="6" fill="#34D399" />
                <circle cx="384" cy="84" r="6" fill="#34D399" />

                <text x="24" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Jan
                </text>
                <text x="96" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Feb
                </text>
                <text x="168" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Mar
                </text>
                <text x="240" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Apr
                </text>
                <text x="312" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Mai
                </text>
                <text x="384" y="220" textAnchor="middle" className="fill-slate-400 text-[11px]">
                  Jun
                </text>
              </svg>
            </div>
          </div>
        </section>

        <section className="col-span-12 md:col-span-4">
          <div className="stats-grid-inner grid h-full grid-cols-2 grid-rows-2">
            <div className="group flex flex-col justify-between gap-6 border-r border-b border-white/10 p-8 transition-colors group-hover:bg-white/5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Active Deals</p>
              <span className="text-5xl font-semibold text-white">5</span>
            </div>

            <div className="group flex flex-col justify-between gap-6 border-b border-white/10 p-8 transition-colors group-hover:bg-white/5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Conversion Lift
              </p>
              <span className="text-5xl font-semibold text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.2)]">
                24%
              </span>
            </div>

            <div className="group flex flex-col justify-between gap-6 border-r border-white/10 p-8 transition-colors group-hover:bg-white/5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Open Campaigns
              </p>
              <span className="text-5xl font-semibold text-white">1</span>
            </div>

            <div className="group flex flex-col justify-between gap-6 p-8 transition-colors group-hover:bg-white/5">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Qualified Leads
              </p>
              <span className="text-5xl font-semibold text-white">16</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
