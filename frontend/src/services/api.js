import axios from "axios";
import queryClient from "../queryClient";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Endpoints that consume usage — invalidate billing data after success
const USAGE_ENDPOINTS = [
  "/resume/analyze", "/cover-letter/generate", "/motivationsschreiben/generate",
  "/interview/generate", "/ai-assistant/chat", "/ai-assistant/optimize",
  "/ai-assistant/analyze-job", "/jobs/match", "/research/",
  "/jobs/search/recommended", "/jobs/search/custom",
];

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
    // Invalidate billing/init data after any usage-consuming call (POST or GET)
    const url = res.config?.url || "";
    if (USAGE_ENDPOINTS.some((ep) => url.includes(ep))) {
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
  searchCustom: (keywords, location = "", jobType = "", page = 1) =>
    api.get(`/jobs/search/custom?keywords=${keywords}&location=${location}&job_type=${jobType}&page=${page}`),
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

// --- Settings ---
export const settingsApi = {
  getProfile: () => api.get("/settings/profile"),
  updateProfile: (data, config) => api.put("/settings/profile", data, config),
  getPreferences: () => api.get("/settings/preferences"),
  updatePreferences: (data, config) => api.put("/settings/preferences", data, config),
};


export default api;
