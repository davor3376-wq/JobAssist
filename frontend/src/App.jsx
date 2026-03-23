import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import useAuthStore from "./hooks/useAuthStore";
import Layout from "./components/layout/Layout";
import UpgradeModal from "./components/UpgradeModal";
import ErrorBoundary from "./components/ErrorBoundary";

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

function AppRoutes() {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <Routes>
        {/* Public — wrapped in own Suspense so Layout is never affected */}
        <Route path="/login" element={<Suspense fallback={null}><LoginPage /></Suspense>} />
        <Route path="/register" element={<Suspense fallback={null}><RegisterPage /></Suspense>} />
        <Route path="/pricing" element={<Suspense fallback={null}><PricingPage /></Suspense>} />

        {/* Protected — Layout has its own Suspense around Outlet */}
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
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <>
      <UpgradeModal />
      <AppRoutes />
    </>
  );
}
