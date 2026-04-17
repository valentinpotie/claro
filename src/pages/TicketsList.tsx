import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, statusColors, categoryLabels, responsabiliteLabels } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, ArrowRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TicketsList() {
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") ?? "active");
  const [dateFilter, setDateFilter] = useState<string>("");
  const filtered = tickets.filter(t => {
    const matchesStatus =
      statusFilter === "all" ? true :
      statusFilter === "active" ? t.status !== "cloture" :
      statusFilter === "cloture" ? t.status === "cloture" :
      statusFilter === "urgent" ? t.urgence && t.status !== "cloture" :
      true;
    return matchesStatus &&
      (!dateFilter || t.dateCreation >= dateFilter) &&
      (!search || t.titre.toLowerCase().includes(search.toLowerCase()) || t.reference.toLowerCase().includes(search.toLowerCase()) || t.locataire.nom.toLowerCase().includes(search.toLowerCase()));
  });
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Tous les tickets ({tickets.length})</h1>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">En cours</SelectItem><SelectItem value="urgent"><span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Urgents</span></SelectItem><SelectItem value="cloture">Clôturés</SelectItem><SelectItem value="all">Tous</SelectItem></SelectContent></Select>
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
                <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  {t.locataire.nom && <span><span className="opacity-60">Locataire :</span> {t.locataire.nom}</span>}
                  {t.bien.adresse && <span><span className="opacity-60">Bien :</span> {t.bien.adresse}{t.bien.lot ? ` · ${t.bien.lot}` : ""}</span>}
                  {t.bien.proprietaire && <span><span className="opacity-60">Propriétaire :</span> {t.bien.proprietaire}</span>}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="opacity-60">Signalé le :</span> {new Date(t.dateCreation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
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
