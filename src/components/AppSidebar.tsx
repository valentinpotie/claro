import {
  LayoutDashboard, ClipboardList, AlertTriangle, Wrench, UserCheck,
  Calendar, HardHat, Receipt, Shield, BookOpen, PlusCircle, Archive,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
  { title: "Tickets", url: "/tickets", icon: ClipboardList },
  { title: "Nouveau signalement", url: "/signalement", icon: PlusCircle },
];

const workflowItems = [
  { title: "Qualification", url: "/qualification", icon: AlertTriangle },
  { title: "Artisans", url: "/artisans", icon: Wrench },
  { title: "Validation proprio.", url: "/validation", icon: UserCheck },
  { title: "Planification", url: "/planification", icon: Calendar },
  { title: "Interventions", url: "/interventions", icon: HardHat },
  { title: "Facturation", url: "/facturation", icon: Receipt },
  { title: "Clôture", url: "/cloture", icon: Archive },
];

const guideItems = [
  { title: "Guide de démo", url: "/guide", icon: BookOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

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
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <HardHat className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">SinistreFlow</h2>
              <p className="text-[10px] text-sidebar-muted">Gestion locative</p>
            </div>
          </div>
        ) : (
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary flex items-center justify-center mx-auto">
            <HardHat className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(mainItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Workflow</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(workflowItems)}</SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Outils</SidebarGroupLabel>
          <SidebarGroupContent>{renderItems(guideItems)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="text-[10px] text-sidebar-muted">
            Agence Immobilière Durand<br />Gestionnaire: Sophie Martin
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
