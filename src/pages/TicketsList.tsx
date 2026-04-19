import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { statusLabels, categoryLabels, responsabiliteLabels, workflowSteps, syndicWorkflowSteps, TicketStatus, Ticket } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Calendar, ArrowRight, AlertTriangle, Clock, Plus, CheckCircle2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatLastAction } from "@/lib/lastAction";
import { NewTicketModal } from "@/components/NewTicketModal";
import { useTicketsUnread } from "@/hooks/useTicketsUnread";

/** Ordre canonique des statuts. Les tickets actifs sont triés du plus jeune (signalé)
 *  au plus avancé (facturation), puis les clôturés en fin de liste. */
const STATUS_ORDER: TicketStatus[] = [
  ...workflowSteps.map(s => s.key),
  ...syndicWorkflowSteps.map(s => s.key),
];
const statusRank = (status: TicketStatus): number => {
  if (status === "cloture" || status === "resolution_syndic") return 9999;
  const idx = STATUS_ORDER.indexOf(status);
  return idx === -1 ? 100 : idx;
};

const compareByProgress = (a: Ticket, b: Ticket): number => {
  const diff = statusRank(a.status) - statusRank(b.status);
  if (diff !== 0) return diff;
  // À statut égal, le plus récemment modifié d'abord.
  return new Date(b.dateMaj).getTime() - new Date(a.dateMaj).getTime();
};

export default function TicketsList() {
  const { tickets } = useTickets();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("filter") ?? "all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const filtered = useMemo(() => tickets
    .filter(t => {
      const matchesStatus =
        statusFilter === "all" ? true :
        statusFilter === "active" ? t.status !== "cloture" :
        statusFilter === "cloture" ? t.status === "cloture" :
        statusFilter === "urgent" ? t.urgence && t.status !== "cloture" :
        true;
      return matchesStatus &&
        (!dateFilter || t.dateCreation >= dateFilter) &&
        (!search || t.titre.toLowerCase().includes(search.toLowerCase()) || t.reference.toLowerCase().includes(search.toLowerCase()) || t.locataire.nom.toLowerCase().includes(search.toLowerCase()));
    })
    .sort(compareByProgress),
  [tickets, statusFilter, dateFilter, search]);
  const unreadMap = useTicketsUnread(filtered);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Tous les tickets ({tickets.length})</h1>
        <Button onClick={() => setNewTicketOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Nouveau ticket
        </Button>
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">En cours</SelectItem><SelectItem value="urgent"><span className="flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-destructive" />Urgents</span></SelectItem><SelectItem value="cloture">Clôturés</SelectItem><SelectItem value="all">Tous</SelectItem></SelectContent></Select>
        <div className="relative">
          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="pl-9 w-44" placeholder="Date de création" />
        </div>
      </div>
      <div className="space-y-2">
        {filtered.map(t => {
          const isClosed = t.status === "cloture" || t.status === "resolution_syndic";
          return (
          <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* État — tout en haut, orange si en cours, vert si clôturé */}
                <div className="flex items-center gap-2 flex-wrap">
                  {unreadMap[t.id] && (
                    <Badge className="bg-destructive/15 text-destructive border-0 gap-1 text-[11px]">
                      <Bell className="h-3 w-3" /> Nouveau
                    </Badge>
                  )}
                  {isClosed ? (
                    <Badge className="bg-success/15 text-success border-0 gap-1 text-[11px]">
                      <CheckCircle2 className="h-3 w-3" />
                      Clôturé · {new Date(t.dateMaj).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </Badge>
                  ) : (
                    <Badge className="bg-warning/15 text-warning border-0 text-[11px]">
                      En cours · {statusLabels[t.status]}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground font-mono">{t.reference}</span>
                </div>

                {/* Titre + infos parties prenantes */}
                <p className="font-medium text-sm">{t.titre}</p>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                  {t.locataire.nom && <span><span className="opacity-60">Locataire :</span> {t.locataire.nom}</span>}
                  {t.bien.adresse && <span><span className="opacity-60">Bien :</span> {t.bien.adresse}{t.bien.lot ? ` · ${t.bien.lot}` : ""}</span>}
                  {t.bien.proprietaire && <span><span className="opacity-60">Propriétaire :</span> {t.bien.proprietaire}</span>}
                </p>
                <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 items-center">
                  <span><span className="opacity-60">Signalé le :</span> {new Date(t.dateCreation).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  {(() => {
                    const label = formatLastAction(t.lastActionAt);
                    if (!label) return null;
                    return (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Dernière action : {label}</span>
                    );
                  })()}
                </p>

                {/* Metadata en bas — catégorie violet, responsabilité gris, urgence rouge */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{categoryLabels[t.categorie]}</Badge>
                  {t.responsabilite && <Badge variant="secondary" className="text-[10px]">{responsabiliteLabels[t.responsabilite]}</Badge>}
                  {t.urgence && <Badge className="bg-destructive/15 text-destructive border-0 text-[10px]">Urgent</Badge>}
                </div>
              </div>
              <Button size="sm" className="shrink-0 gap-1.5">Accéder au ticket <ArrowRight className="h-3.5 w-3.5" /></Button>
            </CardContent>
          </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucun ticket trouvé</p>}
      </div>
      <NewTicketModal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} />
    </div>
  );
}
