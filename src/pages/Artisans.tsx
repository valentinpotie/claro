import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { priorityLabels, priorityColors, categoryLabels } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Phone, Mail, Send, Wrench, Search } from "lucide-react";

export default function Artisans() {
  const { tickets, artisans, sendArtisanContact } = useTickets();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const ticketsArtisan = tickets.filter(t => t.status === "contact_artisan" || t.status === "reception_devis");
  const filteredArtisans = artisans.filter(a => !search || a.nom.toLowerCase().includes(search.toLowerCase()) || a.specialite.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-6 max-w-5xl">
      <div><h1 className="text-xl font-bold">Contact artisan</h1><p className="text-sm text-muted-foreground">Demande de diagnostic et réception des devis</p></div>
      <Tabs defaultValue="tickets">
        <TabsList><TabsTrigger value="tickets">Tickets ({ticketsArtisan.length})</TabsTrigger><TabsTrigger value="annuaire">Annuaire</TabsTrigger></TabsList>
        <TabsContent value="tickets" className="space-y-3 mt-4">
          {ticketsArtisan.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucun ticket en recherche d'artisan</CardContent></Card> :
          ticketsArtisan.map(t => (
            <Card key={t.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <CardContent className="p-4 flex items-start justify-between">
                <div><div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge><Badge variant="secondary" className="text-[10px]">{categoryLabels[t.categorie]}</Badge></div><p className="font-medium text-sm">{t.titre}</p><p className="text-xs text-muted-foreground mt-1">{t.quotes.length} devis reçu(s)</p></div>
                <Button variant="outline" size="sm" onClick={e => { e.stopPropagation(); navigate(`/tickets/${t.id}`); }}><Wrench className="h-3.5 w-3.5 mr-1" /> Gérer</Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        <TabsContent value="annuaire" className="space-y-4 mt-4">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9" /></div>
          <div className="grid gap-3 md:grid-cols-2">
            {filteredArtisans.map(a => (
              <Card key={a.id} className="border-0 shadow-sm"><CardContent className="p-4">
                <div className="flex items-start justify-between mb-2"><div><p className="font-medium text-sm">{a.nom}</p><p className="text-xs text-muted-foreground">{a.specialite} · {a.ville}</p></div><div className="flex items-center gap-1 text-xs"><Star className="h-3 w-3 text-warning fill-warning" />{a.note}</div></div>
                <div className="flex gap-3 text-xs text-muted-foreground mb-2"><span>{a.interventions} interventions</span><span>Délai: {a.delaiMoyen}</span></div>
                <div className="flex gap-2 text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1"><Phone className="h-3 w-3" />{a.telephone}</span><span className="flex items-center gap-1"><Mail className="h-3 w-3" />{a.email}</span></div>
                {ticketsArtisan.length > 0 && <div className="flex gap-1 flex-wrap mt-2">{ticketsArtisan.map(t => <Button key={t.id} size="sm" variant="outline" className="text-[10px] h-6" onClick={() => sendArtisanContact(t.id, a.id)}><Send className="h-2.5 w-2.5 mr-1" />{t.reference}</Button>)}</div>}
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
