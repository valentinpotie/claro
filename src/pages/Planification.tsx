import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { priorityLabels, priorityColors } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { Calendar, CheckCircle2, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Planification() {
  const { tickets, setDisponibilites, matchAndConfirm, getArtisan } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "planifie");
  const [activeTicket, setActiveTicket] = useState<string | null>(null);
  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-xl font-bold">Rendez-vous artisan</h1><p className="text-sm text-muted-foreground">Synchronisation automatique artisan / locataire</p></div>
      {filtered.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun ticket en attente</CardContent></Card> :
      filtered.map(t => {
        const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
        const isActive = activeTicket === t.id;
        return (
          <Card key={t.id} className="border-0 shadow-sm"><CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
                <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge></div>
                <p className="font-medium text-sm">{t.titre}</p>
                <div className="flex gap-4 text-xs text-muted-foreground mt-1"><span>{artisan?.nom}</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.bien.adresse}</span></div>
              </div>
              <Button size="sm" variant={isActive ? "secondary" : "outline"} onClick={() => setActiveTicket(isActive ? null : t.id)}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> {isActive ? "Masquer" : "Planifier"}
              </Button>
            </div>
            {isActive && <div className="space-y-4 mt-4 pt-4 border-t animate-fade-in">
              <Tabs defaultValue="artisan">
                <TabsList className="mb-3"><TabsTrigger value="artisan">Artisan</TabsTrigger><TabsTrigger value="locataire">Locataire</TabsTrigger></TabsList>
                <TabsContent value="artisan"><AvailabilityCalendar title={`Créneaux ${artisan?.nom || "artisan"}`} selectedSlots={t.disponibilitesArtisan} onSlotsChange={s => setDisponibilites(t.id, "artisan", s)} highlightSlots={t.disponibilitesLocataire} /></TabsContent>
                <TabsContent value="locataire"><AvailabilityCalendar title={`Créneaux ${t.locataire.nom}`} selectedSlots={t.disponibilitesLocataire} onSlotsChange={s => setDisponibilites(t.id, "locataire", s)} highlightSlots={t.disponibilitesArtisan} /></TabsContent>
              </Tabs>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-xs text-muted-foreground">Artisan: {t.disponibilitesArtisan.length} · Locataire: {t.disponibilitesLocataire.length}</span>
                <Button size="sm" onClick={() => matchAndConfirm(t.id)} disabled={t.disponibilitesArtisan.length === 0 || t.disponibilitesLocataire.length === 0}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Trouver créneau</Button>
              </div>
            </div>}
          </CardContent></Card>
        );
      })}
    </div>
  );
}
