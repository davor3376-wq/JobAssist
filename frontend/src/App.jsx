import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/layout/Layout";
import UpgradeModal from "./components/UpgradeModal";
import useAuthStore from "./hooks/useAuthStore";

const loadLoginPage = () => import("./pages/LoginPage");
const loadRegisterPage = () => import("./pages/RegisterPage");
const loadDashboardPage = () => import("./pages/DashboardPage");
const loadResumePage = () => import("./pages/ResumePage");
const loadJobsPage = () => import("./pages/JobsPage");
const loadSettingsPage = () => import("./pages/SettingsPage");
const loadAIAssistantPage = () => import("./pages/AIAssistantPage");
const loadJobAlertsPage = () => import("./pages/JobAlertsPage");
const loadPricingPage = () => import("./pages/PricingPage");
const loadBillingPage = () => import("./pages/BillingPage");
const loadTermsPage = () => import("./pages/TermsPage");
const loadPrivacyPage = () => import("./pages/PrivacyPage");
const loadImpressumPage = () => import("./pages/ImpressumPage");
const loadContactPage = () => import("./pages/ContactPage");
const loadForgotPasswordPage = () => import("./pages/ForgotPasswordPage");
const loadResetPasswordPage = () => import("./pages/ResetPasswordPage");
const loadVerifyEmailPage = () => import("./pages/VerifyEmailPage");

const LoginPage = lazy(loadLoginPage);
const RegisterPage = lazy(loadRegisterPage);
const DashboardPage = lazy(loadDashboardPage);
const ResumePage = lazy(loadResumePage);
const JobsPage = lazy(loadJobsPage);
const SettingsPage = lazy(loadSettingsPage);
const AIAssistantPage = lazy(loadAIAssistantPage);
const JobAlertsPage = lazy(loadJobAlertsPage);
const PricingPage = lazy(loadPricingPage);
const BillingPage = lazy(loadBillingPage);
const TermsPage = lazy(loadTermsPage);
const PrivacyPage = lazy(loadPrivacyPage);
const ImpressumPage = lazy(loadImpressumPage);
const ContactPage = lazy(loadContactPage);
const ForgotPasswordPage = lazy(loadForgotPasswordPage);
const ResetPasswordPage = lazy(loadResetPasswordPage);
const VerifyEmailPage = lazy(loadVerifyEmailPage);

const preloaders = [
  loadDashboardPage,
  loadJobsPage,
  loadResumePage,
  loadJobAlertsPage,
  loadSettingsPage,
  loadBillingPage,
  loadAIAssistantPage,
];

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={null}><RegisterPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={null}><TermsPage /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={null}><PrivacyPage /></Suspense>} />
        <Route path="/impressum" element={<Suspense fallback={null}><ImpressumPage /></Suspense>} />
        <Route path="/contact" element={<Suspense fallback={null}><ContactPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={null}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={null}><ResetPasswordPage /></Suspense>} />
        <Route path="/verify-email" element={<Suspense fallback={null}><VerifyEmailPage /></Suspense>} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="resume" element={<ResumePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="jobs/:jobId" element={<Navigate to="/jobs" replace />} />
          <Route path="ai-assistant" element={<AIAssistantPage />} />
          <Route path="job-alerts" element={<JobAlertsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="billing" element={<BillingPage />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => {
    const warm = () => preloaders.forEach((load) => load().catch(() => {}));

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const timer = window.setTimeout(warm, 300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <UpgradeModal />
      <AppRoutes />
    </>
  );
}
