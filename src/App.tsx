import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LpoProvider, useLpo } from './context/LpoContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import SignIn from './pages/Auth/SignIn';
import Dashboard from './pages/Dashboard/Dashboard';
import NewJobForm from './pages/Jobs/NewJobForm';

import ServiceArea from './pages/ServiceArea/ServiceArea';
import ShareLink from './pages/ShareLink/ShareLink';
import RequestPage from './pages/Jobs/RequestPage';
import CustomerHub from './pages/Customers/CustomerHub';
import Schedules from './pages/Jobs/Schedules';
import Reports from './pages/Admin/Reports';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useLpo();
  
  if (loading) return <div className="loader">Loading...</div>;
  if (!user) return <Navigate to="/signin" />;
  
  return <>{children}</>;
};

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-container">
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
          
          <Route path="/reports" element={
            <PrivateRoute>
              <AppLayout>
                <Reports />
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
