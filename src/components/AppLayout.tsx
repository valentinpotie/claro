import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AIJournalPanel } from "@/components/AIJournalPanel";
import { Search, HelpCircle, Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const { profile } = useAuth();

  // Initiales depuis le nom complet — même pattern que AppSidebar footer.
  const initials = (profile?.full_name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("") || "?";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center bg-card px-4 gap-3 shrink-0">
            <SidebarTrigger className="shrink-0" />
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher un ticket, locataire, bien..." className="pl-9 h-9" />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="h-4 w-4" />
              </Button>
              <button
                type="button"
                aria-label="Profil"
                className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
              >
                <span className="text-[11px] font-semibold font-display text-secondary-foreground">{initials}</span>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
        <AIJournalPanel />
      </div>

      {/* Help modal */}
      {helpOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40"
            onClick={() => setHelpOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="text-sm font-semibold">Besoin d'aide ?</p>
              <button
                onClick={() => setHelpOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Une question, un bug ou une suggestion ? L'équipe Claro vous répond directement.
              </p>
              <a
                href="mailto:v_potie@hetic.eu"
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4 text-primary shrink-0" />
                v_potie@hetic.eu
              </a>
              <p className="text-xs text-muted-foreground">
                Vous pouvez aussi décrire le problème ou la page concernée dans votre message, ça nous aide à vous répondre plus vite.
              </p>
            </div>
          </div>
        </>
      )}
    </SidebarProvider>
  );
}
