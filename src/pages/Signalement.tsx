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
import { Send, UploadCloud } from "lucide-react";

export default function Signalement() {
  const { createTicket } = useTickets();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    titre: "", description: "", categorie: "" as TicketCategory | "", priorite: "normale" as TicketPriority,
    urgence: false, locataireNom: "", locataireTel: "", locataireEmail: "",
    adresse: "", lot: "", proprietaire: "", telephoneProprio: "", emailProprio: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre || !form.categorie || !form.locataireNom) return;
    const ticket = createTicket(form as any);
    navigate(`/tickets/${ticket.id}`);
  };
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold font-display">Nouveau signalement</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0">
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

            <div className="space-y-2">
              <Label>Photos / fichiers</Label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[4px] border border-input bg-background px-4 py-6 text-center transition-colors hover:bg-muted/40">
                <UploadCloud className="h-5 w-5 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Glisser-déposer ou cliquer pour ajouter</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG, PDF, DOCX</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setAttachments((prev) => [...prev, ...files]);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {attachments.length > 0 && (
                <p className="text-xs text-muted-foreground">{attachments.length} fichier(s) prêt(s) à être transmis avec le ticket.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Locataire</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.locataireNom} onChange={e => set("locataireNom", e.target.value)} /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input value={form.locataireTel} onChange={e => set("locataireTel", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.locataireEmail} onChange={e => set("locataireEmail", e.target.value)} /></div>
          </CardContent>
        </Card>
        <Card className="border-0">
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
