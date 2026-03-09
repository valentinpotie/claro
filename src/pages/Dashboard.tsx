import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, Clock, CheckCircle2, TrendingUp, 
  ArrowRight, Calendar, Euro, Star
} from "lucide-react";
import { mockTickets, dashboardStats, statusLabels, statusColors, priorityColors, priorityLabels } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const recentTickets = mockTickets.slice(0, 5);

  const stats = [
    { label: "Tickets ouverts", value: dashboardStats.ticketsOuverts, icon: Clock, color: "text-primary" },
    { label: "Urgents", value: dashboardStats.ticketsUrgents, icon: AlertTriangle, color: "text-destructive" },
    { label: "Interventions en cours", value: dashboardStats.interventionsEnCours, icon: TrendingUp, color: "text-accent" },
    { label: "Délai moyen résolution", value: dashboardStats.delaiMoyenResolution, icon: Calendar, color: "text-muted-foreground" },
  ];

  const stats2 = [
    { label: "Tickets ce mois", value: dashboardStats.ticketsCeMois },
    { label: "Résolus", value: dashboardStats.ticketsResolus },
    { label: "Devis en cours (€)", value: `${dashboardStats.montantDevisMois.toLocaleString("fr-FR")} €` },
    { label: "Satisfaction locataires", value: `${dashboardStats.satisfactionLocataires}/5`, icon: Star },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Discovery validation banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          📊 Objectif de cet écran : Montrer la vue d'ensemble en un coup d'œil. 
          <span className="text-muted-foreground font-normal"> → En entretien : "Est-ce que ces indicateurs correspondent à ce que vous suivez au quotidien ? Qu'est-ce qui manque ?"</span>
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de vos sinistres et travaux</p>
        </div>
        <Button onClick={() => navigate("/signalement")} className="bg-primary hover:bg-primary/90">
          + Nouveau signalement
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats2.map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg p-3 border border-border/50">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-lg font-semibold mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tickets */}
        <Card className="lg:col-span-2 border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tickets récents</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/tickets")} className="text-primary">
                Voir tout <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{ticket.reference}</span>
                      <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>
                        {priorityLabels[ticket.priorite]}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-0.5 truncate">{ticket.titre}</p>
                    <p className="text-xs text-muted-foreground">{ticket.bien.adresse}</p>
                  </div>
                  <Badge variant="outline" className={`status-badge ${statusColors[ticket.status]} border-0 shrink-0 ml-3`}>
                    {statusLabels[ticket.status]}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-sm h-auto py-3" onClick={() => navigate("/signalement")}>
              <AlertTriangle className="mr-2 h-4 w-4 text-warning" />
              <div className="text-left">
                <p className="font-medium">2 signalements à qualifier</p>
                <p className="text-xs text-muted-foreground">En attente de catégorisation</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm h-auto py-3" onClick={() => navigate("/validation")}>
              <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
              <div className="text-left">
                <p className="font-medium">1 devis en attente de validation</p>
                <p className="text-xs text-muted-foreground">Propriétaire à relancer</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm h-auto py-3" onClick={() => navigate("/interventions")}>
              <Calendar className="mr-2 h-4 w-4 text-accent" />
              <div className="text-left">
                <p className="font-medium">1 intervention aujourd'hui</p>
                <p className="text-xs text-muted-foreground">Plomberie Express Lyon</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start text-sm h-auto py-3" onClick={() => navigate("/facturation")}>
              <Euro className="mr-2 h-4 w-4 text-success" />
              <div className="text-left">
                <p className="font-medium">1 facture à traiter</p>
                <p className="text-xs text-muted-foreground">Montant total : 120 €</p>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
