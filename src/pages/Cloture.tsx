import { useNavigate } from "react-router-dom";
import { useTickets } from "@/contexts/TicketContext";
import { responsabiliteLabels, categoryLabels } from "@/data/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Archive, CheckCircle2, Euro, Calendar, Wrench, User, Home } from "lucide-react";

export default function Cloture() {
  const { tickets, closeTicket, getArtisan } = useTickets();
  const navigate = useNavigate();
  const filtered = tickets.filter(t => t.status === "cloture");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold font-display">Clôture</h1>
        <p className="text-sm text-muted-foreground">Dossiers terminés et archivés</p>
      </div>
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]"><CardContent className="py-12 text-center text-muted-foreground">Aucun dossier à clôturer</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(t => {
            const artisan = t.artisanId ? getArtisan(t.artisanId) : null;
            const quote = t.quotes.find(q => q.selected);
            return (
              <Card key={t.id} className="border-0 shadow-[0_20px_60px_-10px_hsl(180_5%_11%/0.06)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        {t.reference} — {t.titre}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">Créé le {new Date(t.dateCreation).toLocaleDateString("fr-FR")}</p>
                    </div>
                    {!t.factureValidee ? (
                      <Button size="sm" onClick={() => closeTicket(t.id)}>
                        <Archive className="h-3.5 w-3.5 mr-1" /> Archiver
                      </Button>
                    ) : (
                      <Badge className="bg-success/15 text-success border-0">Archivé</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><User className="h-3 w-3" />Locataire</p>
                      <p className="font-medium">{t.locataire.nom}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Home className="h-3 w-3" />Bien</p>
                      <p className="font-medium">{t.bien.adresse}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Wrench className="h-3 w-3" />Artisan</p>
                      <p className="font-medium">{artisan?.nom || "—"}</p>
                    </div>
                    <div className="p-2 bg-muted rounded">
                      <p className="text-muted-foreground mb-0.5 flex items-center gap-1"><Euro className="h-3 w-3" />Facturé</p>
                      <p className="font-medium">{t.facture?.montant || 0} €</p>
                    </div>
                  </div>
                  {t.rdv && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Intervention le {t.rdv.date} à {t.rdv.heure}
                    </p>
                  )}
                  {t.responsabilite && (
                    <p className="text-xs mt-1">Responsabilité : <Badge variant="outline" className="text-[10px] border-0 bg-primary/10 text-primary">{responsabiliteLabels[t.responsabilite]}</Badge></p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
