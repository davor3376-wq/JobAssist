import { create } from "zustand";

// Get initial token from localStorage
const getInitialToken = () => {
  try {
    return localStorage.getItem("access_token") || null;
  } catch (e) {
    console.error("Failed to read token from localStorage:", e);
    return null;
  }
};

const useAuthStore = create((set) => ({
  token: getInitialToken(),
  user: null,
  isHydrated: false,

  login: (token) => {
    if (!token) {
      console.error("Login called with empty token");
      return;
    }
    try {
      localStorage.setItem("access_token", token);
      set({ token, isHydrated: true });
    } catch (e) {
      console.error("Failed to save token to localStorage:", e);
    }
  },

  logout: () => {
    try {
      localStorage.removeItem("access_token");
    } catch (e) {
      console.error("Failed to remove token from localStorage:", e);
    }
    set({ token: null, user: null, isHydrated: true });
  },

  setUser: (user) => set({ user }),

  hydrate: () => {
    const token = getInitialToken();
    set({ token, isHydrated: true });
  },
}));

export default useAuthStore;
