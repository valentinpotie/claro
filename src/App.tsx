import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TicketProvider } from "@/contexts/TicketContext";
import { AppLayout } from "@/components/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import TicketsList from "./pages/TicketsList";
import TicketDetail from "./pages/TicketDetail";
import Signalement from "./pages/Signalement";
import Qualification from "./pages/Qualification";
import Artisans from "./pages/Artisans";
import Validation from "./pages/Validation";
import Planification from "./pages/Planification";
import Interventions from "./pages/Interventions";
import Facturation from "./pages/Facturation";
import Cloture from "./pages/Cloture";
import Assurance from "./pages/Assurance";
import Guide from "./pages/Guide";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TicketProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            {/* App routes wrapped in layout */}
            <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
            <Route path="/tickets" element={<AppLayout><TicketsList /></AppLayout>} />
            <Route path="/tickets/:id" element={<AppLayout><TicketDetail /></AppLayout>} />
            <Route path="/signalement" element={<AppLayout><Signalement /></AppLayout>} />
            <Route path="/qualification" element={<AppLayout><Qualification /></AppLayout>} />
            <Route path="/artisans" element={<AppLayout><Artisans /></AppLayout>} />
            <Route path="/validation" element={<AppLayout><Validation /></AppLayout>} />
            <Route path="/planification" element={<AppLayout><Planification /></AppLayout>} />
            <Route path="/interventions" element={<AppLayout><Interventions /></AppLayout>} />
            <Route path="/facturation" element={<AppLayout><Facturation /></AppLayout>} />
            <Route path="/cloture" element={<AppLayout><Cloture /></AppLayout>} />
            <Route path="/assurance" element={<AppLayout><Assurance /></AppLayout>} />
            <Route path="/guide" element={<AppLayout><Guide /></AppLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </TicketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
