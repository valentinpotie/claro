import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { mockTickets, statusLabels, statusColors, priorityColors, priorityLabels, categoryLabels, type TicketStatus, type TicketPriority } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function TicketsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const filtered = mockTickets.filter((t) => {
    const matchSearch = search === "" || t.titre.toLowerCase().includes(search.toLowerCase()) || t.reference.toLowerCase().includes(search.toLowerCase()) || t.locataire.nom.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchPriority = priorityFilter === "all" || t.priorite === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          📋 Objectif : Montrer le volume et la diversité des dossiers gérés.
          <span className="text-muted-foreground font-normal"> → "Combien de dossiers gérez-vous en parallèle ? Est-ce que cette vue vous fait gagner du temps vs votre outil actuel ?"</span>
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tickets sinistres & travaux</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} dossier(s) trouvé(s)</p>
        </div>
        <Button onClick={() => navigate("/signalement")} className="bg-primary">+ Nouveau ticket</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[160px]">
            <SlidersHorizontal className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Priorité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(priorityLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Référence</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Titre</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Locataire</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Catégorie</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Priorité</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="p-3 text-sm font-mono text-muted-foreground">{ticket.reference}</td>
                    <td className="p-3">
                      <p className="text-sm font-medium">{ticket.titre}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">{ticket.bien.adresse}</p>
                    </td>
                    <td className="p-3 text-sm">{ticket.locataire.nom}</td>
                    <td className="p-3 text-sm">{categoryLabels[ticket.categorie]}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={`status-badge ${priorityColors[ticket.priorite]} border-0`}>
                        {priorityLabels[ticket.priorite]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`status-badge ${statusColors[ticket.status]} border-0`}>
                        {statusLabels[ticket.status]}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{new Date(ticket.dateCreation).toLocaleDateString("fr-FR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
