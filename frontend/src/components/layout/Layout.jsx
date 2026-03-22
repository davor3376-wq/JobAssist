import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, FileText, Briefcase, LogOut, Sparkles, Settings, User, Mail, Bot, Bell } from "lucide-react";
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
];

export default function Layout() {
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
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col shadow-sm">
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
        <nav className="flex-1 px-3 space-y-1">
          <p className="px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Menü</p>
          {NAV_KEYS.map(({ to, tKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
                      : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
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
                  {me?.full_name || me?.email?.split("@")[0]}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{me?.email}</p>
              </div>
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
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8 page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
