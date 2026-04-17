import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { Artisan, Ticket, categoryLabels } from "@/data/types";

interface Props {
  open: boolean;
  artisan: Artisan;
  ticket: Ticket;
  onConfirm: (subject: string, content: string) => void;
  onClose: () => void;
}

export function buildArtisanContactMessage(
  artisan: Artisan,
  ticket: Ticket,
): { subject: string; content: string } {
  const category = categoryLabels[ticket.categorie] ?? ticket.categorie;
  return {
    subject: `Demande de déplacement — ${category} au ${ticket.bien.adresse}`,
    content: `Bonjour ${artisan.nom},\n\nNous avons un problème de ${category} au ${ticket.bien.adresse}.\n\nCoordonnées du locataire :\n- Nom : ${ticket.locataire.nom}\n- Téléphone : ${ticket.locataire.telephone}\n- Email : ${ticket.locataire.email}\n\nCoordonnées du propriétaire :\n- Nom : ${ticket.bien.proprietaire}\n- Téléphone : ${ticket.bien.telephoneProprio}\n- Email : ${ticket.bien.emailProprio}\n\nPouvez-vous vous déplacer pour faire un diagnostic sur place ?\n\nMerci.`,
  };
}

export function ArtisanContactModal({ open, artisan, ticket, onConfirm, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open) {
      const defaults = buildArtisanContactMessage(artisan, ticket);
      setSubject(defaults.subject);
      setContent(defaults.content);
    }
  }, [open, artisan.id, ticket.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" /> Contacter {artisan.nom}
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-0.5">
            Vous allez envoyer un email à <span className="font-medium text-foreground">{artisan.nom}</span> à l'adresse <span className="font-medium text-foreground">{artisan.email}</span>. Vérifiez et modifiez le message si besoin avant d'envoyer.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Objet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Message</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={() => onConfirm(subject.trim(), content.trim())}
            disabled={!content.trim()}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" /> Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
