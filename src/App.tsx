import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { TicketProvider } from "@/contexts/TicketContext";
import { AppLayout } from "@/components/AppLayout";
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
          <AppLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tickets" element={<TicketsList />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/signalement" element={<Signalement />} />
              <Route path="/qualification" element={<Qualification />} />
              <Route path="/artisans" element={<Artisans />} />
              <Route path="/validation" element={<Validation />} />
              <Route path="/planification" element={<Planification />} />
              <Route path="/interventions" element={<Interventions />} />
              <Route path="/facturation" element={<Facturation />} />
              <Route path="/cloture" element={<Cloture />} />
              <Route path="/assurance" element={<Assurance />} />
              <Route path="/guide" element={<Guide />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </TicketProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
