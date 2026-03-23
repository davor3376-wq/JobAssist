import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./hooks/useAuthStore";
import Layout from "./components/layout/Layout";
import UpgradeModal from "./components/UpgradeModal";

const LoginPage      = lazy(() => import("./pages/LoginPage"));
const RegisterPage   = lazy(() => import("./pages/RegisterPage"));
const DashboardPage  = lazy(() => import("./pages/DashboardPage"));
const ResumePage     = lazy(() => import("./pages/ResumePage"));
const JobsPage       = lazy(() => import("./pages/JobsPage"));
const JobDetailPage  = lazy(() => import("./pages/JobDetailPage"));
const SettingsPage   = lazy(() => import("./pages/SettingsPage"));
const CoverLetterPage = lazy(() => import("./pages/CoverLetterPage"));
const AIAssistantPage = lazy(() => import("./pages/AIAssistantPage"));
const JobAlertsPage  = lazy(() => import("./pages/JobAlertsPage"));
const PricingPage    = lazy(() => import("./pages/PricingPage"));
const BillingPage    = lazy(() => import("./pages/BillingPage"));

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <UpgradeModal />
      <Suspense fallback={null}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          {/* Protected */}
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
            <Route path="jobs/:jobId" element={<JobDetailPage />} />
            <Route path="cover-letter" element={<CoverLetterPage />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="job-alerts" element={<JobAlertsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="billing" element={<BillingPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
