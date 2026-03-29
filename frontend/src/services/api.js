import axios from "axios";
import queryClient from "../queryClient";

const defaultBaseURL = (() => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "jobassist.tech" || host === "www.jobassist.tech") {
      return "https://jobassist-production.up.railway.app/api";
    }
  }
  return "/api";
})();

const api = axios.create({
  baseURL: defaultBaseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

const USAGE_FEATURES = [
  { match: "/resume/analyze", feature: "cv_analysis" },
  { match: "/cover-letter/generate", feature: "cover_letter" },
  { match: "/motivationsschreiben/generate", feature: "cover_letter" },
  { match: "/interview/generate", feature: "ai_chat" },
  { match: "/ai-assistant/chat", feature: "ai_chat" },
  { match: "/ai-assistant/optimize", feature: "ai_chat" },
  { match: "/ai-assistant/analyze-job", feature: "ai_chat" },
  { match: "/jobs/match", feature: "cv_analysis" },
  { match: "/research/", feature: "ai_chat" },
  { match: "/jobs/search/recommended", feature: "job_search" },
  { match: "/jobs/search/custom", feature: "job_search" },
];

function updateUsageList(usage = [], feature, delta = 1) {
  return usage.map((item) => {
    if (item.feature !== feature) return item;
    const nextUsed = (item.used || 0) + delta;
    return {
      ...item,
      used: nextUsed,
      remaining: item.limit === -1 ? -1 : Math.max(0, (item.limit || 0) - nextUsed),
    };
  });
}

function syncLocalStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function bumpUsageCaches(feature) {
  if (!feature) return;

  queryClient.setQueryData(["billing-overview"], (old) => {
    if (!old?.usage) return old;
    const next = { ...old, usage: updateUsageList(old.usage, feature, 1) };
    syncLocalStorage("billing", next);
    return next;
  });

  queryClient.setQueryData(["init"], (old) => {
    if (!old?.usage) return old;
    const next = { ...old, usage: updateUsageList(old.usage, feature, 1) };
    syncLocalStorage("init", next);
    return next;
  });
}

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url} - Auth header attached`);
    }
  } else {
    if (import.meta.env.DEV) {
      console.warn(`[API] ${config.method.toUpperCase()} ${config.url} - No token found in localStorage!`);
    }
  }
  return config;
});

// Silent token refresh state
let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for new token

function processQueue(error, token = null) {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve(token)));
  refreshQueue = [];
}

// Handle 401 globally — attempt silent refresh before giving up
api.interceptors.response.use(
  (res) => {
    if (import.meta.env.DEV) {
      console.log(`[API] Response ${res.status} from ${res.config.url}`);
    }
    // Keep monthly usage counters in sync immediately, then refetch in background.
    const url = res.config?.url || "";
    const usageFeature = USAGE_FEATURES.find((entry) => url.includes(entry.match))?.feature;
    if (usageFeature) {
      bumpUsageCaches(usageFeature);
      queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["init"] });
    }
    return res;
  },
  async (err) => {
    // Usage limit hit — trigger upgrade modal
    if (err.response?.status === 403 && err.response?.data?.detail?.error === "usage_limit") {
      // Refresh usage counts so guard is accurate on next attempt
      queryClient.invalidateQueries({ queryKey: ["billing-overview"] });
      queryClient.invalidateQueries({ queryKey: ["init"] });
      const event = new CustomEvent("usage-limit", { detail: err.response.data.detail });
      window.dispatchEvent(event);
      return Promise.reject(err);
    }

    // Rate limit hit (slowapi / job alert cooldown)
    if (err.response?.status === 429) {
      const detail = err.response?.data?.detail || err.response?.data?.error;
      const message = typeof detail === "string" ? detail : "Zu viele Anfragen. Bitte warte kurz.";
      const event = new CustomEvent("rate-limited", { detail: { message } });
      window.dispatchEvent(event);
      return Promise.reject(err);
    }

    const url = err.config?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh");

    if (err.response?.status === 401 && !isAuthEndpoint && !err.config._retried) {
      const refreshToken = localStorage.getItem("refresh_token");

      if (!refreshToken) {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((token) => {
          err.config.headers.Authorization = `Bearer ${token}`;
          err.config._retried = true;
          return api(err.config);
        });
      }

      isRefreshing = true;
      err.config._retried = true;

      try {
        const res = await api.post("/auth/refresh", { refresh_token: refreshToken });
        const { access_token, refresh_token: new_refresh } = res.data;

        localStorage.setItem("access_token", access_token);
        if (new_refresh) localStorage.setItem("refresh_token", new_refresh);

        // Update store without importing it (avoids circular deps)
        // The request interceptor will pick up the new token from localStorage
        processQueue(null, access_token);
        err.config.headers.Authorization = `Bearer ${access_token}`;
        return api(err.config);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// --- Auth ---
export const authApi = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  logout: () => {
    const refresh_token = localStorage.getItem("refresh_token");
    if (refresh_token) return api.post("/auth/logout", { refresh_token });
    return Promise.resolve();
  },
  verifyEmail: (token) => api.post("/auth/verify-email", { token }),
  resendVerification: () => api.post("/auth/resend-verification"),
  resendVerificationPublic: (email) => api.post("/auth/resend-verification-public", { email }),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, new_password) => api.post("/auth/reset-password", { token, new_password }),
  deleteAccount: (password) => api.post("/auth/delete-account", { password }),
};

// --- Resumes ---
export const resumeApi = {
  upload: (formData) =>
    api.post("/resume/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  list: () => api.get("/resume/"),
  get: (id) => api.get(`/resume/${id}`),
  delete: (id) => api.delete(`/resume/${id}`),
};

// --- Jobs ---
// NOTE: Only root routes ("/jobs/") use trailing slashes.
// All other routes must NOT have trailing slashes — a trailing slash causes a
// 307 redirect which strips the Authorization header, resulting in 401.
export const jobApi = {
  create: (data) => api.post("/jobs/", data),
  list: () => api.get("/jobs/"),
  get: (id) => api.get(`/jobs/${id}`),
  delete: (id) => api.delete(`/jobs/${id}`),
  match: (jobId, resumeId) => api.post("/jobs/match", { job_id: jobId, resume_id: resumeId }),
  generateMatch: (jobId, resumeId) => api.post("/jobs/match", { job_id: jobId, resume_id: resumeId }),
  generateCoverLetter: (jobId, resumeId, tone = "professional") =>
    api.post("/cover-letter/generate", { job_id: jobId, resume_id: resumeId, tone }),
  generateInterviewPrep: (jobId, resumeId, numQuestions = 10) =>
    api.post("/interview/generate", { job_id: jobId, resume_id: resumeId, num_questions: numQuestions }),
  updateStatus: (jobId, status) => api.patch(`/jobs/${jobId}/status`, { status }),
  updateNotes: (jobId, notes) => api.patch(`/jobs/${jobId}/notes`, { notes }),
  updateDeadline: (jobId, deadline) => api.patch(`/jobs/${jobId}/deadline`, { deadline }),
  updateUrl: (jobId, url) => api.patch(`/jobs/${jobId}/url`, { url }),
  saveResearch: (jobId, researchData) => api.patch(`/jobs/${jobId}/research`, { research_data: JSON.stringify(researchData) }),
  getPipelineStats: () => api.get("/jobs/pipeline/stats"),
  searchRecommended: (page = 1) => api.get(`/jobs/search/recommended?page=${page}`),
  searchCustom: (keywords, location = "", jobType = "", page = 1) => {
    const params = new URLSearchParams({ keywords, location, job_type: jobType, page });
    return api.get(`/jobs/search/custom?${params.toString()}`);
  },
};

// --- Cover Letter ---
export const coverLetterApi = {
  generate: (jobId, resumeId, tone = "professional") =>
    api.post("/cover-letter/generate", { job_id: jobId, resume_id: resumeId, tone }),
};

// --- Motivationsschreiben ---
export const motivationsschreibenApi = {
  generate: (data) => api.post("/motivationsschreiben/generate", data),
};

// --- Interview Prep ---
export const interviewApi = {
  generate: (jobId, resumeId, numQuestions = 10) =>
    api.post("/interview/generate", {
      job_id: jobId,
      resume_id: resumeId,
      num_questions: numQuestions,
    }),
};

// --- AI Assistant ---
export const aiAssistantApi = {
  chat: (data) => api.post("/ai-assistant/chat", data),
  optimize: (data) => api.post("/ai-assistant/optimize", data),
  analyzeJob: (data) => api.post("/ai-assistant/analyze-job", data),
};

// --- Job Alerts ---
export const jobAlertsApi = {
  list: () => api.get("/job-alerts/"),
  create: (data) => api.post("/job-alerts/", data),
  update: (id, data) => api.patch(`/job-alerts/${id}`, data),
  delete: (id) => api.delete(`/job-alerts/${id}`),
  runNow: (id) => api.post(`/job-alerts/${id}/run`),
  unsubscribe: (token) => api.post("/job-alerts/unsubscribe", { token }),
};

// --- Research ---
export const researchApi = {
  research: (companyName, jobDescription = "") =>
    api.post("/research/", { company_name: companyName, job_description: jobDescription }),
};

// --- Init (bootstrap all data in one request) ---
export const initApi = {
  fetch: () => api.get("/init"),
};

// --- Billing ---
export const billingApi = {
  overview: () => api.get("/billing/overview"),
  plans: () => api.get("/billing/plans"),
  createCheckout: (plan) => api.post("/billing/create-checkout-session", { plan }),
  createPortal: () => api.post("/billing/create-portal-session"),
};

// --- Contact ---
export const contactApi = {
  send: (data) => api.post("/contact/send", data),
};

// --- Settings ---
export const settingsApi = {
  getProfile: () => api.get("/settings/profile"),
  updateProfile: (data, config) => api.put("/settings/profile", data, config),
  getPreferences: () => api.get("/settings/preferences"),
  updatePreferences: (data, config) => api.put("/settings/preferences", data, config),
};


export default api;
