import { useState, useEffect, Suspense } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  LogOut,
  Sparkles,
  Settings,
  User,
  Mail,
  Wand2,
  Bell,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import clsx from "clsx";

import useAuthStore from "../../hooks/useAuthStore";
import { useI18n } from "../../context/I18nContext";
import { initApi, authApi } from "../../services/api";
import { getApiErrorMessage } from "../../utils/apiError";

const NAV_KEYS = [
  { to: "/dashboard", tKey: "navigation.dashboard", icon: LayoutDashboard },
  { to: "/resume", tKey: "navigation.myResumes", icon: FileText },
  { to: "/jobs", tKey: "navigation.jobs", icon: Briefcase },
  { to: "/ai-assistant", tKey: "navigation.aiAssistant", icon: Wand2 },
  { to: "/job-alerts", tKey: "navigation.jobAlerts", icon: Bell },
  { to: "/settings", tKey: "navigation.preferences", icon: Settings },
  { to: "/billing", tKey: "navigation.billing", icon: CreditCard },
];

function SidebarContent({ me, profile, t, handleLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">JobAssist</h1>
            <p className="text-[10px] font-medium text-violet-400 tracking-wider uppercase mt-0.5">KI-gestützt</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-3">Menü</p>
        {NAV_KEYS.map(({ to, tKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                isActive
                  ? "bg-blue-500/15 text-blue-300"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200",
                    isActive ? "bg-blue-500/25 text-blue-400" : "bg-white/5 text-slate-500"
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                {t(tKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-4">
        <div className="border-t border-white/10 pt-4 space-y-1">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            {me ? (
              <>
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate leading-tight">
                    {me.full_name || me.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{me.email}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-24 bg-white/10 rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-32 bg-white/5 rounded animate-pulse" />
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function VerificationBanner({ me }) {
  const [sending, setSending] = useState(false);

  if (!me || me.is_verified !== false) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success("Die Bestätigungs-E-Mail wurde sicher versendet");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Die Bestätigungs-E-Mail konnte nicht sicher versendet werden"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-4 md:px-5">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-amber-900">E-Mail noch nicht bestätigt</h2>
          <p className="mt-1 text-sm text-amber-800">
            Du kannst die App bereits nutzen. KI- und Premium-Funktionen werden aber erst nach der E-Mail-Bestätigung freigeschaltet.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="mt-3 text-sm font-semibold text-amber-300 transition-colors hover:text-amber-100 disabled:opacity-50"
          >
            {sending ? "E-Mail wird gesendet..." : "Bestätigungs-E-Mail erneut senden"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [animClass] = useState(() => (sessionStorage.getItem("app-loaded") ? "page-ready" : "page-enter"));

  useEffect(() => {
    sessionStorage.setItem("app-loaded", "1");
  }, []);

  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: initData } = useQuery({
    queryKey: ["init"],
    queryFn: () => initApi.fetch().then((r) => {
      try { localStorage.setItem("init", JSON.stringify(r.data)); } catch {}
      setUser(r.data.me);
      return r.data;
    }),
    initialData: () => {
      try {
        const saved = localStorage.getItem("init");
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  const me = initData?.me ?? storedUser;
  const profile = initData?.profile;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    queryClient.clear();
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-black">
      <aside className="hidden md:flex sticky top-0 self-start h-screen w-[260px] bg-black border-r border-[#171a21] flex-col flex-shrink-0">
        <SidebarContent me={me} profile={profile} t={t} handleLogout={handleLogout} onNavClick={undefined} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 w-[280px] bg-black shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        <SidebarContent
          me={me}
          profile={profile}
          t={t}
          handleLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex-1 flex flex-col min-w-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_28%),linear-gradient(180deg,_#000000_0%,_#020304_52%,_#000000_100%)]">
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-black border-b border-[#171a21] flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:bg-white/10 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-white">JobAssist</span>
          </div>
        </header>

        <main className="flex-1">
          {/* P3: pb-16 md:pb-0 — Platz für die mobile Bottom-Nav */}
          <div className={`max-w-7xl mx-auto px-4 py-5 pb-20 text-slate-100 md:px-8 md:py-8 md:pb-8 ${animClass}`}>
            <VerificationBanner me={me} />
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
          <footer className="max-w-7xl mx-auto px-4 pb-6 md:px-8">
            <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-500 border-t border-[#171a21] pt-4">
              <Link to="/terms" className="hover:text-slate-300 transition-colors">AGB</Link>
              <Link to="/privacy" className="hover:text-slate-300 transition-colors">Datenschutz</Link>
              <Link to="/impressum" className="hover:text-slate-300 transition-colors">Impressum</Link>
              <Link to="/contact" className="hover:text-slate-300 transition-colors">Kontakt</Link>
            </div>
          </footer>
        </main>
      </div>

      {/* ── P3: Mobile Bottom Navigation ─────────────────────────────────── */}
      {/* Ersetzt Hamburger für die 4 Hauptrouten — 1 Tap statt 2 Klicks    */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#171a21]"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      >
        <div className="flex">
          {[
            { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
            { to: '/resume',       icon: FileText,         label: 'Lebenslauf' },
            { to: '/jobs',         icon: Briefcase,        label: 'Jobs'       },
            { to: '/ai-assistant', icon: Wand2,            label: 'KI'         },
          ].map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 min-h-[56px] transition-colors ${
                  isActive ? 'text-blue-400' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-blue-500/20' : ''}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
