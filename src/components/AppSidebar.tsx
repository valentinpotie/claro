import {
  LayoutDashboard, ClipboardList,
  HardHat, PlusCircle, Settings, LogOut, Wrench, Database, Home, Users, UserCheck, ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { USE_SUPABASE } from "@/lib/supabase";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarTrigger, useSidebar,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tickets", url: "/tickets", icon: ClipboardList },
  { title: "Nouveau signalement", url: "/signalement", icon: PlusCircle },
];



export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { settings } = useSettings();
  const isActive = (path: string) => location.pathname === path;

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
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => navigate("/")}>
            {!collapsed ? (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[4px] bg-sidebar-primary flex items-center justify-center">
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
          <SidebarTrigger className="shrink-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarMenu>
            <Collapsible defaultOpen={crmActive} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip="CRM">
                    <Database className="mr-2 h-4 w-4 shrink-0" />
                    {!collapsed && <span>Portefeuille</span>}
                    {!collapsed && <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />}
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
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        {!collapsed && (
          <div className="text-[10px] text-sidebar-muted pt-3">
            {settings.agency_name}<br />{profile?.full_name ?? "Gestionnaire"}
          </div>
        )}
        <NavLink to="/settings" className="text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors flex items-center gap-2">
          <Settings className="h-3.5 w-3.5" />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>
        {USE_SUPABASE && (
          <button
            onClick={handleLogout}
            className="text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors flex items-center gap-2"
          >
            <LogOut className="h-3.5 w-3.5" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
