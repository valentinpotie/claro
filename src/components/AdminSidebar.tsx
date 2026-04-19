import { Activity, ArrowLeft, Building2, LogOut, ShieldAlert, Terminal, Zap } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { USE_SUPABASE } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";

/** Sidebar dédiée au mode super admin — cross-agences, navigation interne par section.
 *  Volontairement distincte d'AppSidebar pour marquer qu'on n'est plus dans une agence.
 *  Les entrées hash (#relances, #logs) scroll vers des sections de la page admin. */

type NavItem = { title: string; to: string; icon: typeof Activity };

const monitoringItems: NavItem[] = [
  { title: "Vue d'ensemble", to: "/admin", icon: Activity },
  { title: "Agences", to: "/admin/agencies", icon: Building2 },
  { title: "Relances", to: "/admin/reminders", icon: Zap },
  { title: "Logs", to: "/admin/logs", icon: Terminal },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const isActive = (item: NavItem) => location.pathname === item.to;

  const handleLogout = async () => {
    await signOut();
    window.localStorage.removeItem("onboardingStep");
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate("/admin")}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[4px] bg-destructive/10 flex items-center justify-center">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h2 className="text-sm font-bold font-display text-sidebar-foreground">Admin</h2>
                  <p className="text-[10px] text-sidebar-muted">Cross-agences</p>
                </div>
              </div>
            ) : (
              <div className="h-8 w-8 rounded-[4px] bg-destructive/10 flex items-center justify-center">
                <ShieldAlert className="h-4 w-4 text-destructive" />
              </div>
            )}
          </div>
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {monitoringItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item)}>
                    <NavLink to={item.to} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Retour</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/dashboard" className="hover:bg-sidebar-accent/50 text-sidebar-muted">
                    <ArrowLeft className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Espace agence</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "Super admin"}</p>
              <p className="text-[10px] text-sidebar-muted truncate">Super admin</p>
            </div>
            {USE_SUPABASE && (
              <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          USE_SUPABASE && (
            <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors flex items-center justify-center w-full" title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </button>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
