import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import Profile from './pages/Auth/Profile';
import ResetPassword from './pages/Auth/ResetPassword';

import OnboardingTour from './components/OnboardingTour';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useLpo();
  
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/signin" />;
  
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSidebarPinned } = useLpo();
  
  return (
    <div className={`app-container ${!isSidebarPinned ? 'sidebar-unpinned' : ''}`}>
      <OnboardingTour />
      <Sidebar />
      <main className="main-content">
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
