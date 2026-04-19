import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ShieldAlert } from "lucide-react";

/** Layout super admin : sidebar dédiée (cross-agences), header minimaliste.
 *  Volontairement séparé d'AppLayout pour éviter toute confusion entre contexte
 *  agence et vue admin. */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center bg-card border-b border-border px-6 gap-4 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-[11px] font-medium">
              <ShieldAlert className="h-3 w-3" />
              Mode super admin
            </span>
            <p className="text-xs text-muted-foreground hidden md:block">
              Vue cross-agences — les actions effectuées ici peuvent impacter plusieurs agences.
            </p>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
