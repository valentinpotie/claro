import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Upload, Zap } from "lucide-react";
import { categoryLabels } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

export default function Signalement() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Signalement enregistré !</h2>
            <p className="text-muted-foreground mb-1">Référence : SIN-2026-0143</p>
            <p className="text-sm text-muted-foreground mb-6">Le dossier a été créé et la qualification automatique est en cours.</p>
            <div className="bg-primary/5 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium">Qualification automatique</p>
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>✅ Catégorie détectée : Plomberie</li>
                <li>✅ Priorité suggérée : Haute (risque dégât des eaux)</li>
                <li>✅ 3 artisans disponibles identifiés</li>
                <li>✅ Notification propriétaire envoyée</li>
              </ul>
            </div>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate("/tickets/1")} className="bg-primary">Voir le dossier</Button>
              <Button variant="outline" onClick={() => { setSubmitted(false); setStep(1); }}>Nouveau signalement</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
        <p className="text-sm text-primary font-medium">
          📝 Objectif : Montrer la simplicité du signalement et la qualification automatique.
          <span className="text-muted-foreground font-normal"> → "Combien de temps passez-vous à créer un dossier aujourd'hui ? Est-ce que cette qualification automatique vous serait utile ?"</span>
        </p>
      </div>

      <div>
        <h1 className="text-2xl font-bold">Nouveau signalement</h1>
        <p className="text-sm text-muted-foreground">Étape {step}/3 · Formulaire simplifié pour signaler un sinistre ou une demande de travaux</p>
      </div>

      {/* Progress */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <CardTitle className="text-base mb-4">Informations du locataire</CardTitle>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom du locataire</Label>
                  <Input placeholder="ex: Marie Dupont" defaultValue="Marie Dupont" />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input placeholder="06 XX XX XX XX" defaultValue="06 12 34 56 78" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="email@exemple.fr" defaultValue="m.dupont@email.fr" />
              </div>
              <div>
                <Label>Adresse du bien</Label>
                <Select defaultValue="12-lilas">
                  <SelectTrigger><SelectValue placeholder="Sélectionner un bien" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12-lilas">12 rue des Lilas, 75011 Paris - Apt 3B</SelectItem>
                    <SelectItem value="8-foch">8 avenue Foch, 69006 Lyon - Apt 5A</SelectItem>
                    <SelectItem value="45-haussmann">45 boulevard Haussmann, 75008 Paris - Apt 2C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => setStep(2)} className="w-full bg-primary">Suivant</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <CardTitle className="text-base mb-4">Description du problème</CardTitle>
              <div>
                <Label>Catégorie</Label>
                <Select defaultValue="plomberie">
                  <SelectTrigger><SelectValue placeholder="Type de problème" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Titre court</Label>
                <Input placeholder="ex: Fuite sous évier" defaultValue="Fuite sous évier cuisine" />
              </div>
              <div>
                <Label>Description détaillée</Label>
                <Textarea 
                  placeholder="Décrivez le problème..." 
                  rows={4} 
                  defaultValue="Fuite d'eau persistante sous l'évier de la cuisine. L'eau s'accumule dans le meuble bas et commence à endommager le parquet."
                />
              </div>
              <div>
                <Label>Photos</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Glissez vos photos ici ou cliquez pour ajouter</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG · Max 10 Mo</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Retour</Button>
                <Button onClick={() => setStep(3)} className="flex-1 bg-primary">Suivant</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <CardTitle className="text-base mb-4">Vérification & envoi</CardTitle>
              <div className="bg-muted rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Locataire</span>
                  <span className="font-medium">Marie Dupont</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bien</span>
                  <span className="font-medium">12 rue des Lilas, 75011 Paris</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Catégorie</span>
                  <span className="font-medium">Plomberie</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Titre</span>
                  <span className="font-medium">Fuite sous évier cuisine</span>
                </div>
              </div>

              <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-accent" />
                  <p className="text-sm font-medium">Que va faire SinistreFlow automatiquement ?</p>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                  <li>• Qualifier le sinistre (catégorie, urgence, risque assurance)</li>
                  <li>• Rechercher les artisans disponibles dans le secteur</li>
                  <li>• Prévenir le propriétaire avec les infos clés</li>
                  <li>• Envoyer un accusé de réception au locataire</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Retour</Button>
                <Button onClick={() => setSubmitted(true)} className="flex-1 bg-primary">
                  <Zap className="h-4 w-4 mr-2" />
                  Créer et qualifier automatiquement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
