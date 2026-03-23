import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Briefcase, LogOut, Sparkles, Settings, User, Mail, Bot, Bell, CreditCard, Menu, X } from "lucide-react";
import useAuthStore from "../../hooks/useAuthStore";
import clsx from "clsx";
import { useI18n } from "../../context/I18nContext";
import { useQuery } from "@tanstack/react-query";
import { initApi, authApi } from "../../services/api";

const NAV_KEYS = [
  { to: "/dashboard",      tKey: "navigation.dashboard",    icon: LayoutDashboard },
  { to: "/resume",         tKey: "navigation.myResumes",    icon: FileText },
  { to: "/jobs",           tKey: "navigation.jobs",         icon: Briefcase },
  { to: "/cover-letter",   tKey: "navigation.coverLetter",  icon: Mail },
  { to: "/ai-assistant",   tKey: "navigation.aiAssistant",  icon: Bot },
  { to: "/job-alerts",     tKey: "navigation.jobAlerts",    icon: Bell },
  { to: "/settings",       tKey: "navigation.preferences",  icon: Settings },
  { to: "/billing",        tKey: "navigation.billing",      icon: CreditCard },
];

function SidebarContent({ me, profile, t, handleLogout, onNavClick }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">JobAssist</h1>
            <p className="text-[10px] font-medium text-brand-500 tracking-wider uppercase mt-0.5">KI-gestützt</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Menü</p>
        {NAV_KEYS.map(({ to, tKey, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavClick}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-brand-50 text-brand-700 shadow-sm shadow-brand-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "bg-brand-100 text-brand-600"
                    : "bg-gray-100 text-gray-400"
                )}>
                  <Icon className="w-4 h-4" />
                </div>
                {t(tKey)}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom — user card + logout */}
      <div className="px-3 pb-4">
        <div className="border-t border-gray-100 pt-4 space-y-1">
          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            {me ? (
              <>
                {profile?.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-2 ring-brand-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate leading-tight">
                    {me.full_name || me.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{me.email}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-1.5" />
                  <div className="h-2.5 w-32 bg-gray-100 rounded animate-pulse" />
                </div>
              </>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            {t("common.logout")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const storedUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { t } = useI18n();

  const cachedInit = (() => { try { const s = localStorage.getItem("init"); return s ? JSON.parse(s) : undefined; } catch { return undefined; } })();
  const { data: initData } = useQuery({
    queryKey: ["init"],
    queryFn: () => initApi.fetch().then((r) => {
      try { localStorage.setItem("init", JSON.stringify(r.data)); } catch {}
      setUser(r.data.me);
      return r.data;
    }),
    initialData: cachedInit,
    staleTime: 1000 * 60 * 5,
  });
  const me = initData?.me ?? storedUser;
  const profile = initData?.profile;

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[260px] bg-white border-r border-gray-100 flex-col shadow-sm flex-shrink-0">
        <SidebarContent me={me} profile={profile} t={t} handleLogout={handleLogout} onNavClick={undefined} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-white shadow-xl flex flex-col transition-transform duration-300 md:hidden",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
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

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-gray-900">JobAssist</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-5 md:px-8 md:py-8 page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
