import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Building2, PlusCircle, ClipboardList, Users, LogOut } from 'lucide-react';
import { LpoProvider, useLpo } from './context/LpoContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import SignIn from './pages/Auth/SignIn';
import Dashboard from './pages/Dashboard/Dashboard';
import NewJobForm from './pages/Jobs/NewJobForm';

import ServiceArea from './pages/ServiceArea/ServiceArea';
import ShareLink from './pages/ShareLink/ShareLink';
import RequestPage from './pages/Jobs/RequestPage';
import CustomerHub from './pages/Customers/CustomerHub';
import Schedules from './pages/Jobs/Schedules';
import AwaitingTCPage from './pages/Jobs/AwaitingTCPage';
import Reports from './pages/Admin/Reports';
import SupportCenter from './pages/Help/SupportCenter';
import Invoices from './pages/Invoices/Invoices';

import Profile from './pages/Auth/Profile';
import ResetPassword from './pages/Auth/ResetPassword';
import UserManagement from './pages/Admin/UserManagement';
import AdminCommunications from './pages/Admin/AdminCommunications';

import OnboardingTour from './components/OnboardingTour';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useLpo();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" />;
  
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, isRealAdmin, loading } = useLpo();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" />;
  if (!isAdmin && !isRealAdmin) return <Navigate to="/dashboard" />;
  
  return <>{children}</>;
};

const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedSession, lpo, exitImpersonation } = useLpo();
  const navigate = useNavigate();

  if (!isImpersonating || !impersonatedSession) return null;

  const displayLpoName = lpo?.name || impersonatedSession.lpoName || `LPO #${impersonatedSession.lpo_id}`;

  return (
    <div className="impersonation-global-banner">
      <div className="imp-banner-left">
        <span className="imp-banner-pill">
          <Building2 size={13} />
          LOGGED IN AS LPO
        </span>
        <span className="imp-banner-text">
          <strong>{displayLpoName}</strong>
          <span className="imp-banner-email">({impersonatedSession.email})</span>
        </span>
      </div>
      <div className="imp-banner-actions">
        <button
          type="button"
          className="imp-btn imp-btn-action"
          onClick={() => navigate('/new-job')}
        >
          <PlusCircle size={14} />
          <span>Create Job</span>
        </button>
        <button
          type="button"
          className="imp-btn imp-btn-action"
          onClick={() => navigate('/dashboard')}
        >
          <ClipboardList size={14} />
          <span>Manage Jobs</span>
        </button>
        <button
          type="button"
          className="imp-btn imp-btn-switch"
          onClick={() => navigate('/admin/users')}
        >
          <Users size={14} />
          <span>Switch LPO</span>
        </button>
        <button
          type="button"
          className="imp-btn imp-btn-exit"
          onClick={() => {
            exitImpersonation();
            navigate('/admin/users');
          }}
        >
          <LogOut size={14} />
          <span>Exit LPO View</span>
        </button>
      </div>
      <style>{`
        .impersonation-global-banner {
          position: sticky;
          top: 0;
          z-index: 950;
          background: linear-gradient(90deg, #1a3d33 0%, #245245 100%);
          color: #ffffff;
          padding: 10px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 2px solid var(--gold, #a8763a);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
          flex-wrap: wrap;
        }
        .imp-banner-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .imp-banner-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: var(--gold, #a8763a);
          color: #ffffff;
          font-size: 0.68rem;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          letter-spacing: 0.06em;
        }
        .imp-banner-text {
          font-size: 0.88rem;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .imp-banner-email {
          opacity: 0.75;
          font-size: 0.8rem;
        }
        .imp-banner-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .imp-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 800;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .imp-btn-action {
          background: rgba(255, 255, 255, 0.14);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.2);
        }
        .imp-btn-action:hover {
          background: rgba(255, 255, 255, 0.24);
        }
        .imp-btn-switch {
          background: transparent;
          color: rgba(255, 255, 255, 0.85);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .imp-btn-switch:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }
        .imp-btn-exit {
          background: #ef4444;
          color: #ffffff;
        }
        .imp-btn-exit:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarPinned } = useLpo();
  
  return (
    <div className={`app-container ${!isSidebarPinned ? 'sidebar-unpinned' : ''}`}>
      <OnboardingTour />
      <Sidebar />
      <main className="main-content">
        <ImpersonationBanner />
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LpoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignIn />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/new-job" element={
            <PrivateRoute>
              <AppLayout>
                <NewJobForm />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/service-area" element={
            <PrivateRoute>
              <AppLayout>
                <ServiceArea />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/share" element={
            <PrivateRoute>
              <AppLayout>
                <ShareLink />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/customers" element={
            <PrivateRoute>
              <AppLayout>
                <CustomerHub />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/request/:id" element={
            <RequestPage />
          } />

          <Route path="/schedules" element={
            <PrivateRoute>
              <AppLayout>
                <Schedules />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/awaiting-tc" element={
            <PrivateRoute>
              <AppLayout>
                <AwaitingTCPage />
              </AppLayout>
            </PrivateRoute>
          } />
          
          <Route path="/reports" element={
            <PrivateRoute>
              <AppLayout>
                <Reports />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/help" element={
            <PrivateRoute>
              <AppLayout>
                <SupportCenter />
              </AppLayout>
            </PrivateRoute>
          } />
          


          <Route path="/profile" element={
            <PrivateRoute>
              <AppLayout>
                <Profile />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/users" element={
            <AdminRoute>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </AdminRoute>
          } />

          <Route path="/admin/communications" element={
            <AdminRoute>
              <AppLayout>
                <AdminCommunications />
              </AppLayout>
            </AdminRoute>
          } />

          <Route path="/invoices" element={
            <PrivateRoute>
              <AppLayout>
                <Invoices />
              </AppLayout>
            </PrivateRoute>
          } />

          <Route path="/" element={<Navigate to="/dashboard" />} />
          
          {/* Placeholder routes */}
          <Route path="*" element={
            <PrivateRoute>
              <AppLayout>
                <div className="card text-center">
                  <h2>Section Coming Soon</h2>
                  <p>This module is currently under development.</p>
                </div>
              </AppLayout>
            </PrivateRoute>
          } />
        </Routes>
      </BrowserRouter>
    </LpoProvider>
  );
};

export default App;
