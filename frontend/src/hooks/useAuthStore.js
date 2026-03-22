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

  login: (token) => {
    if (!token) return;
    localStorage.setItem("access_token", token);
    set({ token, isHydrated: true });
  },

  logout: () => {
    localStorage.removeItem("access_token");
    ls.remove("auth_user");
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
