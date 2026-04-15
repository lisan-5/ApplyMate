import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
const Auth = lazy(() => import("./pages/Auth"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Scholarships = lazy(() => import("./pages/Scholarships"));
const ScholarshipForm = lazy(() => import("./pages/ScholarshipForm"));
const ScholarshipDetail = lazy(() => import("./pages/ScholarshipDetail"));
const SharedWithMe = lazy(() => import("./pages/SharedWithMe"));
const SharedView = lazy(() => import("./pages/SharedView"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const Community = lazy(() => import("./pages/Community"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<AppLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/shared/:token" element={<SharedView />} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/scholarships" element={<ProtectedRoute><Scholarships /></ProtectedRoute>} />
                <Route path="/scholarships/new" element={<ProtectedRoute><ScholarshipForm /></ProtectedRoute>} />
                <Route path="/scholarships/:id" element={<ProtectedRoute><ScholarshipDetail /></ProtectedRoute>} />
                <Route path="/shared" element={<ProtectedRoute><SharedWithMe /></ProtectedRoute>} />
                <Route path="/admin/users" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

