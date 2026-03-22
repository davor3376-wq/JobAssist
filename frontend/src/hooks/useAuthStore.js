import { create } from "zustand";

const ss = {
  get: (key) => { try { const v = sessionStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {} },
  remove: (key) => { try { sessionStorage.removeItem(key); } catch {} },
};

const useAuthStore = create((set) => ({
  token: sessionStorage.getItem("access_token") || null,
  user: ss.get("auth_user"),
  isHydrated: false,

  login: (token) => {
    if (!token) return;
    sessionStorage.setItem("access_token", token);
    set({ token, isHydrated: true });
  },

  logout: () => {
    sessionStorage.removeItem("access_token");
    ss.remove("auth_user");
    set({ token: null, user: null, isHydrated: true });
  },

  setUser: (user) => {
    ss.set("auth_user", user);
    set({ user });
  },

  hydrate: () => {
    const token = sessionStorage.getItem("access_token") || null;
    const user = ss.get("auth_user");
    set({ token, user, isHydrated: true });
  },
}));

export default useAuthStore;
