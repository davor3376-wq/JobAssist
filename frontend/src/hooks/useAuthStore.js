import { create } from "zustand";

const ls = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { localStorage.removeItem(key); } catch {} },
};

const useAuthStore = create((set) => ({
  token: localStorage.getItem("access_token") || null,
  user: ls.get("auth_user"),
  isHydrated: false,

  login: (accessToken, refreshToken) => {
    if (!accessToken) return;
    // Clear ALL previous user's cached data before storing new credentials
    for (const k of ["auth_user", "init", "settings_profile", "billing", "dashboard_jobs", "jobs", "resumes", "job_alerts", "ai_chat_history", "profile", "preferences", "job-search-research"]) {
      localStorage.removeItem(k);
    }
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    set({ token: accessToken, user: null, isHydrated: true });
  },

  setAccessToken: (accessToken) => {
    localStorage.setItem("access_token", accessToken);
    set({ token: accessToken });
  },

  logout: () => {
    for (const k of ["access_token", "refresh_token", "auth_user", "init", "settings_profile", "billing", "dashboard_jobs", "jobs", "resumes", "job_alerts", "ai_chat_history", "profile", "preferences", "job-search-research"]) {
      localStorage.removeItem(k);
    }
    set({ token: null, user: null, isHydrated: true });
  },

  setUser: (user) => {
    ls.set("auth_user", user);
    set({ user });
  },

  hydrate: () => {
    const token = localStorage.getItem("access_token") || null;
    const user = ls.get("auth_user");
    set({ token, user, isHydrated: true });
  },
}));

export default useAuthStore;
