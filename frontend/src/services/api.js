import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

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

// Handle 401 globally
api.interceptors.response.use(
  (res) => {
    if (import.meta.env.DEV) {
      console.log(`[API] Response ${res.status} from ${res.config.url}`);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || "";
      // Login/register failures are expected — don't redirect, let the form handle it
      const isLoginOrRegister = url.includes("/auth/login") || url.includes("/auth/register");

      if (!isLoginOrRegister) {
        // Any other 401 = token expired or invalid — redirect to login
        if (import.meta.env.DEV) {
          console.error(`[API] 401 on ${url} — session expired, redirecting to login`);
        }
        localStorage.removeItem("access_token");
        window.location.href = "/login";
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

// --- Settings ---
export const settingsApi = {
  getProfile: () => api.get("/settings/profile"),
  updateProfile: (data) => api.put("/settings/profile", data),
  getPreferences: () => api.get("/settings/preferences"),
  updatePreferences: (data) => api.put("/settings/preferences", data),
};


export default api;
