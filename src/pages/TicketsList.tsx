import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, categoryLabels, TicketStatus, responsabiliteLabels } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TicketsList() {
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const filtered = tickets.filter(t =>
    (statusFilter === "all" || t.status === statusFilter) &&
    (!dateFilter || t.dateCreation >= dateFilter) &&
    (!search || t.titre.toLowerCase().includes(search.toLowerCase()) || t.reference.toLowerCase().includes(search.toLowerCase()) || t.locataire.nom.toLowerCase().includes(search.toLowerCase()))
  );
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tous les tickets ({tickets.length})</h1>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-48"><SelectValue placeholder="Statut" /></SelectTrigger><SelectContent><SelectItem value="all">Tous les statuts</SelectItem>{Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="pl-9 w-44" placeholder="Date de création" />
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(t => (
          <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs text-muted-foreground font-mono">{t.reference}</span>
                  <Badge variant="outline" className={`status-badge border-0 ${statusColors[t.status]}`}>{statusLabels[t.status]}</Badge>
                  <Badge variant="outline" className="border-0 bg-primary/10 text-primary text-[10px]">Catégorie : {categoryLabels[t.categorie]}</Badge>
                  {t.responsabilite && <Badge variant="secondary" className="text-[10px]">Responsabilité : {responsabiliteLabels[t.responsabilite]}</Badge>}
                  {t.urgence && <Badge className="bg-destructive text-destructive-foreground text-[10px]">URGENT</Badge>}
                </div>
                <p className="font-medium text-sm">{t.titre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.locataire.nom} · {t.bien.adresse} · {new Date(t.dateCreation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <Button size="sm" className="shrink-0 gap-1.5">Accéder au ticket <ArrowRight className="h-3.5 w-3.5" /></Button>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun ticket trouvé</p>}
      </div>
    </div>
  );
}
