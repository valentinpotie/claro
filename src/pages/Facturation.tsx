import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTickets } from "@/contexts/TicketContext";
import { useSettings } from "@/contexts/SettingsContext";
import { priorityLabels, priorityColors, responsabiliteLabels } from "@/data/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Euro, FileText, CheckCircle2, ArrowRight, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Facturation() {
  const { tickets, validateFacture, getArtisan } = useTickets();
  const { settings, updateSettings } = useSettings();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [emailInputId, setEmailInputId] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState("");
  const filtered = tickets.filter(t => t.status === "facturation");
  return (
    <div className="space-y-6 max-w-4xl">
      <div><h1 className="text-xl font-bold">Facturation</h1><p className="text-sm text-muted-foreground">Contrôle et validation des factures</p></div>
      {filtered.length === 0 ? <Card className="border-0 shadow-sm"><CardContent className="py-12 text-center text-muted-foreground">Aucune facture en attente</CardContent></Card> :
      filtered.map(t => {
        const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
        const payeur = t.responsabilite === "locataire" ? t.locataire.nom : t.bien.proprietaire;
        return (
          <Card key={t.id} className="border-0 shadow-sm"><CardContent className="p-4 flex items-start justify-between">
            <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${t.id}`)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-xs text-muted-foreground">{t.reference}</span><Badge variant="outline" className={`status-badge border-0 ${priorityColors[t.priorite]}`}>{priorityLabels[t.priorite]}</Badge></div>
              <p className="font-medium text-sm">{t.titre}</p>
              {t.facture && <div className="mt-2 p-3 bg-muted rounded-lg space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground"><FileText className="h-3 w-3 inline mr-1" />{t.facture.refFacture}</span><span className="font-semibold"><Euro className="h-3 w-3 inline" /> {t.facture.montant} €</span></div>
                <p>{t.facture.prestation}</p>
                <p className="text-muted-foreground">Artisan : {artisan?.nom}</p>
                <p className="font-medium">Payeur : <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">{payeur}</Badge></p>
              </div>}
            </div>
            <div className="flex flex-col gap-2 shrink-0 ml-4">
              {!sentIds.has(t.id) ? (
                <Button variant="outline" size="sm" onClick={() => {
                  if (settings.accountant_email) {
                    setSentIds(s => new Set(s).add(t.id));
                    toast({ title: "Facture envoyée", description: `Envoyée à ${settings.accountant_email}` });
                  } else {
                    setEmailInputId(t.id);
                    setEmailDraft("");
                  }
                }}>
                  <Mail className="h-3.5 w-3.5 mr-1" /> Envoyer au comptable
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-success font-medium px-2 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Envoyée
                </div>
              )}
              <Button onClick={() => validateFacture(t.id)} size="sm"><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Valider <ArrowRight className="h-3 w-3 ml-1" /></Button>
              {emailInputId === t.id && !settings.accountant_email && (
                <div className="flex gap-1.5">
                  <Input type="email" placeholder="Email comptable" value={emailDraft} onChange={e => setEmailDraft(e.target.value)} className="h-8 text-xs flex-1" />
                  <Button size="sm" className="h-8" disabled={!emailDraft.includes("@")} onClick={() => {
                    updateSettings({ accountant_email: emailDraft });
                    setEmailInputId(null);
                    setSentIds(s => new Set(s).add(t.id));
                    toast({ title: "Facture envoyée", description: `Envoyée à ${emailDraft}` });
                  }}><Send className="h-3 w-3" /></Button>
                </div>
              )}
            </div>
          </CardContent></Card>
        );
      })}
    </div>
  );
}
