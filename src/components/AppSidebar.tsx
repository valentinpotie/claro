import {
  LayoutDashboard, ClipboardList,
  HardHat, Settings, LogOut, Wrench, Database, Home, Users, UserCheck, ChevronRight, Mail, Copy, Check, FileText,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { USE_SUPABASE } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tickets", url: "/tickets", icon: ClipboardList },
];



export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const isActive = (path: string) => location.pathname === path;
  const [copiedInbound, setCopiedInbound] = useState(false);

  const copyInboundEmail = async () => {
    if (!settings.email_inbound) return;
    try {
      await navigator.clipboard.writeText(settings.email_inbound);
      setCopiedInbound(true);
      toast.success("Adresse copiée");
      setTimeout(() => setCopiedInbound(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleLogout = async () => {
    await signOut();
    // Keep persisted app settings (including onboarding completion).
    // Only clear transient onboarding wizard step.
    window.localStorage.removeItem("onboardingStep");
    navigate("/login", { replace: true });
  };

  const crmItems = [
    { title: "Biens", url: "/properties", icon: Home },
    { title: "Locataires", url: "/tenants", icon: Users },
    { title: "Baux", url: "/leases", icon: FileText },
    { title: "Propriétaires", url: "/owners", icon: UserCheck },
    { title: "Artisans", url: "/artisans", icon: Wrench },
  ];

  const crmActive = crmItems.some(i => location.pathname === i.url);

  const renderItems = (items: typeof mainItems) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
              <item.icon className="mr-2 h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={collapsed ? "p-2" : "p-4"}>
        <div
          className={`cursor-pointer ${collapsed ? "flex justify-center" : ""}`}
          onClick={() => navigate("/")}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-[4px] bg-sidebar-primary flex items-center justify-center shrink-0">
                <HardHat className="h-4 w-4 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-display text-sidebar-foreground">Claro</h2>
                <p className="text-[10px] text-sidebar-muted">Gestion locative</p>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 rounded-[4px] bg-sidebar-primary flex items-center justify-center">
              <HardHat className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          {collapsed ? (
            // Mode replié : chaque entrée CRM devient une icône directe — évite le
            // collapsible qui ne peut pas s'ouvrir proprement dans une sidebar 48px.
            <SidebarGroupContent>
              <SidebarMenu>
                {crmItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
                      <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="h-4 w-4 shrink-0" />
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          ) : (
            <SidebarMenu>
              <Collapsible defaultOpen={crmActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip="Portefeuille">
                      <Database className="mr-2 h-4 w-4 shrink-0" />
                      <span>Portefeuille</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {crmItems.map((item) => (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton asChild isActive={isActive(item.url)}>
                            <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                              <item.icon className="mr-2 h-3.5 w-3.5 shrink-0" />
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className={collapsed ? "p-2 space-y-2" : "p-4 space-y-3"}>
        {!collapsed && settings.email_inbound && (
          <div className="rounded-[4px] bg-sidebar-accent/30 px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-sidebar-muted">
              <Mail className="h-3 w-3" /> Adresse d'ingestion
            </div>
            <p className="text-xs text-sidebar-foreground break-all leading-tight">{settings.email_inbound}</p>
            <button
              onClick={copyInboundEmail}
              className="flex items-center gap-1 text-xs text-secondary hover:text-secondary/80 transition-colors"
            >
              {copiedInbound ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copiedInbound ? "Copié" : "Copier"}</span>
            </button>
          </div>
        )}
        {!collapsed ? (
          <div className="flex items-center gap-2.5 pt-1">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <span className="text-[11px] font-semibold font-display text-secondary-foreground">
                {(profile?.full_name ?? "G")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("") || "G"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "Gestionnaire"}</p>
              <p className="text-[10px] text-sidebar-muted truncate" title={settings.agency_name}>{settings.agency_name}</p>
            </div>
            <NavLink
              to="/settings"
              className="text-sidebar-muted hover:text-sidebar-foreground transition-colors"
              activeClassName="text-sidebar-foreground"
              title="Paramètres"
            >
              <Settings className="h-4 w-4" />
            </NavLink>
            {USE_SUPABASE && (
              <button
                onClick={handleLogout}
                className="text-sidebar-muted hover:text-sidebar-foreground transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-1">
            <NavLink to="/settings" className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title="Paramètres">
              <Settings className="h-4 w-4" />
            </NavLink>
            {USE_SUPABASE && (
              <button onClick={handleLogout} className="text-sidebar-muted hover:text-sidebar-foreground transition-colors" title="Déconnexion">
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
