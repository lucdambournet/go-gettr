import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import People from '@/pages/People';
import Chores from '@/pages/Chores';
import WeeklyView from '@/pages/WeeklyView';
import Settings from '@/pages/Settings';
import CheckIn from '@/pages/CheckIn';
import Daily from '@/pages/Daily';
import Bank from '@/pages/Bank';
import Notifications from '@/pages/Notifications';
import DevPanel from '@/pages/DevPanel';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Daily" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Daily" element={<Daily />} />
        <Route path="/People" element={<People />} />
        <Route path="/Chores" element={<Chores />} />
        <Route path="/WeeklyView" element={<WeeklyView />} />
        <Route path="/Settings" element={<Settings />} />
        <Route path="/CheckIn" element={<CheckIn />} />
        <Route path="/Bank" element={<Bank />} />
        <Route path="/Notifications" element={<Notifications />} />
        <Route path="/DevPanel" element={<DevPanel />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App