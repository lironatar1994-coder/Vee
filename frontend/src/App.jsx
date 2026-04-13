import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './context/UserContext';
import PropTypes from 'prop-types';
import Layout from './components/Layout';
import Login from './components/Login';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import DynamicTitle from './components/DynamicTitle';

// Lazy-loaded Admin imports
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const WhatsappAdmin = lazy(() => import('./pages/admin/WhatsappAdmin'));
const AdminOnboarding = lazy(() => import('./pages/admin/AdminOnboarding'));

// Lazy-loaded App pages
const Home = lazy(() => import('./pages/Home'));
const Project = lazy(() => import('./pages/Project'));
const GlobalCalendar = lazy(() => import('./pages/GlobalCalendar'));
const Inbox = lazy(() => import('./pages/Inbox'));
const Today = lazy(() => import('./pages/Today'));
const History = lazy(() => import('./pages/History'));

import OnboardingWizard from './components/OnboardingWizard';

function App() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    const pingServer = async () => {
      try {
        await fetch(`/api/users/${user.id}/ping`, { method: 'POST' });
      } catch (e) {
        console.error('Ping failed', e);
      }
    };

    pingServer(); // Initial ping on mount/login
    const interval = setInterval(pingServer, 3 * 60 * 1000); // Ping every 3 minutes

    // Pre-register service worker for push notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then(() => console.log('Service Worker pre-registered'))
        .catch(err => console.error('SW pre-registration failed', err));
    }

    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
      {/* Background Orbs for overall theme aesthetic */}
      <div className="bg-orb bg-orb-1"></div>
      <div className="bg-orb bg-orb-2"></div>

      <DynamicTitle />
      {user && (user.is_onboarded === 0 || user.is_onboarded === false) && <OnboardingWizard />}
      
      <Routes>
        {/* Admin Routes - independent of normal user Auth */}
        <Route path="/admin/login" element={<Suspense fallback={<></>}><AdminLogin /></Suspense>} />
        <Route path="/admin" element={<Suspense fallback={<></>}><AdminLayout /></Suspense>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="whatsapp" element={<WhatsappAdmin />} />
          <Route path="onboarding" element={<AdminOnboarding />} />
        </Route>

        {/* Normal App Routes */}
        <Route path="/" element={user ? <Layout /> : <Login />}>
          <Route index element={<Navigate to="/today" replace />} />
          <Route path="projects" element={<Home />} />
          <Route path="project/:projectId" element={<Project />} />
          <Route path="calendar" element={<GlobalCalendar />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="today" element={<Today />} />
          <Route path="history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
