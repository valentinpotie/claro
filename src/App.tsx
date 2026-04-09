import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { TicketProvider } from "@/contexts/TicketContext";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import Signalement from "./pages/Signalement";
import Artisans from "./pages/Artisans";
import Validation from "./pages/Validation";
import ConfirmationPassage from "./pages/ConfirmationPassage";
import Interventions from "./pages/Interventions";
import Facturation from "./pages/Facturation";
import Cloture from "./pages/Cloture";
import Assurance from "./pages/Assurance";
import Guide from "./pages/Guide";
import Settings from "./pages/Settings";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
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
      <HashRouter>
        <SettingsProvider>
          <TicketProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/onboarding" element={<Onboarding />} />
              {/* App routes wrapped in layout + onboarding guard */}
              <Route path="/dashboard" element={<OnboardingGuard><AppLayout><Dashboard /></AppLayout></OnboardingGuard>} />
              <Route path="/tickets" element={<OnboardingGuard><AppLayout><TicketsList /></AppLayout></OnboardingGuard>} />
              <Route path="/tickets/:id" element={<OnboardingGuard><AppLayout><TicketDetail /></AppLayout></OnboardingGuard>} />
              <Route path="/signalement" element={<OnboardingGuard><AppLayout><Signalement /></AppLayout></OnboardingGuard>} />
              <Route path="/artisans" element={<OnboardingGuard><AppLayout><Artisans /></AppLayout></OnboardingGuard>} />
              <Route path="/validation" element={<OnboardingGuard><AppLayout><Validation /></AppLayout></OnboardingGuard>} />
              <Route path="/confirmation" element={<OnboardingGuard><AppLayout><ConfirmationPassage /></AppLayout></OnboardingGuard>} />
              <Route path="/interventions" element={<OnboardingGuard><AppLayout><Interventions /></AppLayout></OnboardingGuard>} />
              <Route path="/facturation" element={<OnboardingGuard><AppLayout><Facturation /></AppLayout></OnboardingGuard>} />
              <Route path="/cloture" element={<OnboardingGuard><AppLayout><Cloture /></AppLayout></OnboardingGuard>} />
              <Route path="/assurance" element={<OnboardingGuard><AppLayout><Assurance /></AppLayout></OnboardingGuard>} />
              <Route path="/guide" element={<OnboardingGuard><AppLayout><Guide /></AppLayout></OnboardingGuard>} />
              <Route path="/settings" element={<OnboardingGuard><AppLayout><Settings /></AppLayout></OnboardingGuard>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TicketProvider>
        </SettingsProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
