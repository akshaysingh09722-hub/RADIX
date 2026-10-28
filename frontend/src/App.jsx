import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PublicOnlyRoute from './components/auth/PublicOnlyRoute';
import AppShell from './components/layout/AppShell';

// Lazy-loaded Platform Pages
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ResumeAnalyzerPage = lazy(() => import('./pages/ResumeAnalyzerPage'));
const JobExplorerPage = lazy(() => import('./pages/JobExplorerPage'));
const JDAnalyticsPage = lazy(() => import('./pages/JDAnalyticsPage'));
const TalentCheckPage = lazy(() => import('./pages/TalentCheckPage'));
const SkillMatchingPage = lazy(() => import('./pages/SkillMatchingPage'));
const SavedReportsPage = lazy(() => import('./pages/SavedReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Lazy-loaded Authentication Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: '2px solid var(--accent-cyan)',
            borderTopColor: 'transparent',
          }}
          className="spin-animation"
        />
        <span style={{ fontSize: '13px' }}>Loading RADIX Career Intelligence...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Public Authentication Routes */}
              <Route
                path="login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="forgot-password"
                element={
                  <PublicOnlyRoute>
                    <ForgotPasswordPage />
                  </PublicOnlyRoute>
                }
              />
              <Route path="reset-password" element={<ResetPasswordPage />} />

              {/* Protected Platform Shell & Modules */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="resume-analyzer" element={<ResumeAnalyzerPage />} />
                <Route path="job-explorer" element={<JobExplorerPage />} />
                <Route path="jd-analytics" element={<JDAnalyticsPage />} />
                <Route path="talent-check" element={<TalentCheckPage />} />
                <Route path="talent-insights" element={<TalentCheckPage />} />
                <Route path="skill-matching" element={<SkillMatchingPage />} />
                <Route path="saved-reports" element={<SavedReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
