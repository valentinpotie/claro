import React from "react";
import { AppLoader } from "@/components/AppLoader";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { USE_SUPABASE } from "@/lib/supabase";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import Signalement from "./pages/Signalement";
import Artisans from "./pages/Artisans";
import Properties from "./pages/Properties";
import Tenants from "./pages/Tenants";
import Owners from "./pages/Owners";
import Validation from "./pages/Validation";
import ConfirmationPassage from "./pages/ConfirmationPassage";
import Interventions from "./pages/Interventions";
import Facturation from "./pages/Facturation";
import Cloture from "./pages/Cloture";
import Assurance from "./pages/Assurance";
import Guide from "./pages/Guide";
import Settings from "./pages/Settings";
import AboutUs from "./pages/AboutUs";
import Onboarding from "./pages/Onboarding";
import LoaderPreview from "./pages/LoaderPreview";
import DebugLogs from "./pages/DebugLogs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** Redirects to /login if Supabase is on and user is not authenticated. */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Mock mode — no auth needed
  if (!USE_SUPABASE) return <>{children}</>;

  if (loading) return <AppLoader />;

  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { settings, loading } = useSettings();

  // While settings are still loading from DB, don't redirect to onboarding prematurely
  if (loading) return <AppLoader />;

  if (!settings.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Authenticated routes — wrapped in providers that need the user session */}
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <SettingsProvider>
                    <TicketProvider>
                      <Routes>
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/loader-preview" element={<LoaderPreview />} />
                        <Route path="/dashboard" element={<OnboardingGuard><AppLayout><Dashboard /></AppLayout></OnboardingGuard>} />
                        <Route path="/tickets" element={<OnboardingGuard><AppLayout><TicketsList /></AppLayout></OnboardingGuard>} />
                        <Route path="/tickets/:id" element={<OnboardingGuard><AppLayout><TicketDetail /></AppLayout></OnboardingGuard>} />
                        <Route path="/signalement" element={<OnboardingGuard><AppLayout><Signalement /></AppLayout></OnboardingGuard>} />
                        <Route path="/artisans" element={<OnboardingGuard><AppLayout><Artisans /></AppLayout></OnboardingGuard>} />
                        <Route path="/properties" element={<OnboardingGuard><AppLayout><Properties /></AppLayout></OnboardingGuard>} />
                        <Route path="/properties/:id" element={<OnboardingGuard><AppLayout><Properties /></AppLayout></OnboardingGuard>} />
                        <Route path="/tenants" element={<OnboardingGuard><AppLayout><Tenants /></AppLayout></OnboardingGuard>} />
                        <Route path="/tenants/:id" element={<OnboardingGuard><AppLayout><Tenants /></AppLayout></OnboardingGuard>} />
                        <Route path="/owners" element={<OnboardingGuard><AppLayout><Owners /></AppLayout></OnboardingGuard>} />
                        <Route path="/owners/:id" element={<OnboardingGuard><AppLayout><Owners /></AppLayout></OnboardingGuard>} />
                        <Route path="/validation" element={<OnboardingGuard><AppLayout><Validation /></AppLayout></OnboardingGuard>} />
                        <Route path="/confirmation" element={<OnboardingGuard><AppLayout><ConfirmationPassage /></AppLayout></OnboardingGuard>} />
                        <Route path="/interventions" element={<OnboardingGuard><AppLayout><Interventions /></AppLayout></OnboardingGuard>} />
                        <Route path="/facturation" element={<OnboardingGuard><AppLayout><Facturation /></AppLayout></OnboardingGuard>} />
                        <Route path="/cloture" element={<OnboardingGuard><AppLayout><Cloture /></AppLayout></OnboardingGuard>} />
                        <Route path="/assurance" element={<OnboardingGuard><AppLayout><Assurance /></AppLayout></OnboardingGuard>} />
                        <Route path="/guide" element={<OnboardingGuard><AppLayout><Guide /></AppLayout></OnboardingGuard>} />
                        <Route path="/settings" element={<OnboardingGuard><AppLayout><Settings /></AppLayout></OnboardingGuard>} />
                        <Route path="/about" element={<OnboardingGuard><AppLayout><AboutUs /></AppLayout></OnboardingGuard>} />
                        <Route path="/debug/logs" element={<AppLayout><DebugLogs /></AppLayout>} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </TicketProvider>
                  </SettingsProvider>
                </AuthGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
