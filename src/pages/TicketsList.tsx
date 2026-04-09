import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, priorityColors, priorityLabels, categoryLabels, TicketStatus, TicketPriority } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowRight } from "lucide-react";

export default function TicketsList() {
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const filtered = tickets.filter(t =>
    (statusFilter === "all" || t.status === statusFilter) &&
    (priorityFilter === "all" || t.priorite === priorityFilter) &&
    (!search || t.titre.toLowerCase().includes(search.toLowerCase()) || t.reference.toLowerCase().includes(search.toLowerCase()) || t.locataire.nom.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-bold font-display">Tous les tickets ({tickets.length})</h1>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Priorité" /></SelectTrigger><SelectContent><SelectItem value="all">Toutes</SelectItem>{Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="space-y-2">
        {filtered.map(t => (
          <Card key={t.id} className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)] hover:shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)] transition-shadow cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">{t.reference}</span>
                  <Badge variant="outline" className={`status-badge border-0 ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge>
                  <Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{categoryLabels[t.categorie]}</Badge>
                  {t.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
                </div>
                <p className="font-medium text-sm">{t.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.locataire.nom} · {t.bien.adresse}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun ticket trouvé</p>}
      </div>
    </div>
  );
}
