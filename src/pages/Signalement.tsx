import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { categoryLabels, TicketCategory, TicketPriority } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Send } from "lucide-react";

export default function Signalement() {
  const { createTicket } = useTickets();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titre: "", description: "", categorie: "" as TicketCategory | "", priorite: "normale" as TicketPriority,
    urgence: false, locataireNom: "", locataireTel: "", locataireEmail: "",
    adresse: "", lot: "", proprietaire: "", telephoneProprio: "", emailProprio: "",
  });
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre || !form.categorie || !form.locataireNom) return;
    const ticket = createTicket(form as any);
    navigate(`/tickets/${ticket.id}`);
  };
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold font-display">Nouveau signalement</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Problème signalé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Titre *</Label><Input value={form.titre} onChange={e => set("titre", e.target.value)} placeholder="Ex: Fuite sous évier cuisine" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Décrivez le problème..." className="min-h-[100px]" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Catégorie *</Label>
                <Select value={form.categorie} onValueChange={v => set("categorie", v)}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{Object.entries(categoryLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={v => set("priorite", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="basse">Basse</SelectItem><SelectItem value="normale">Normale</SelectItem><SelectItem value="haute">Haute</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-[4px] bg-destructive/5">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /><Label className="text-sm flex-1">Urgence ?</Label>
              <Switch checked={form.urgence} onCheckedChange={v => set("urgence", v)} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Locataire</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.locataireNom} onChange={e => set("locataireNom", e.target.value)} /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.locataireTel} onChange={e => set("locataireTel", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.locataireEmail} onChange={e => set("locataireEmail", e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Bien concerné</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Adresse</Label><Input value={form.adresse} onChange={e => set("adresse", e.target.value)} /></div>
              <div className="space-y-2"><Label>Lot</Label><Input value={form.lot} onChange={e => set("lot", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Propriétaire</Label><Input value={form.proprietaire} onChange={e => set("proprietaire", e.target.value)} /></div>
              <div className="space-y-2"><Label>Tél.</Label><Input value={form.telephoneProprio} onChange={e => set("telephoneProprio", e.target.value)} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.emailProprio} onChange={e => set("emailProprio", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>
        <Button type="submit" size="lg" className="w-full"><Send className="h-4 w-4 mr-2" /> Créer le signalement</Button>
      </form>
    </div>
  );
}
