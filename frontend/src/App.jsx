import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./hooks/useAuthStore";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ResumePage from "./pages/ResumePage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import SettingsPage from "./pages/SettingsPage";
import CoverLetterPage from "./pages/CoverLetterPage";
import AIAssistantPage from "./pages/AIAssistantPage";
import JobAlertsPage from "./pages/JobAlertsPage";
import PricingPage from "./pages/PricingPage";
import BillingPage from "./pages/BillingPage";
import UpgradeModal from "./components/UpgradeModal";

function PrivateRoute({ children }) {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <UpgradeModal />
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
    </>
  );
}
