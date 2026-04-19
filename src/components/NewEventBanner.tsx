import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle2, FileText, MessageSquare, ArrowRight } from "lucide-react";
import type { LatestEvent } from "@/hooks/useTicketReadState";

interface Props {
  events: LatestEvent[];
  /** Cliquer sur un événement message → focus l'onglet correspondant dans le bloc
   *  Discussion (scroll + sélection). Les autres types (status/document) ne déclenchent
   *  rien de spécial pour l'instant. */
  onJumpToThread: (threadKey: string) => void;
  onDismiss: () => void;
}

/** Bannière affichée en haut de TicketDetail dès qu'un événement est postérieur à
 *  la dernière ouverture du ticket par l'utilisateur. Affiche jusqu'à 3 items, un
 *  bouton "J'ai vu" appelle markRead() et masque la bannière. */
export function NewEventBanner({ events, onJumpToThread, onDismiss }: Props) {
  if (events.length === 0) return null;

  const iconFor = (type: LatestEvent["type"]) =>
    type === "message" ? MessageSquare : type === "document" ? FileText : Bell;

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-primary bg-primary/5">
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">
              {events.length} nouvel{events.length > 1 ? "s" : ""} événement{events.length > 1 ? "s" : ""} depuis votre dernière visite
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 gap-1.5 text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> J'ai vu
          </Button>
        </div>
        <div className="space-y-1">
          {events.slice(0, 3).map((ev, i) => {
            const Icon = iconFor(ev.type);
            const isClickable = ev.type === "message" && ev.threadKey;
            const content = (
              <>
                <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{ev.label}</span>
                <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                  {new Date(ev.at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {isClickable && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </>
            );
            return isClickable ? (
              <button
                key={i}
                onClick={() => onJumpToThread(ev.threadKey!)}
                className="flex items-center gap-2 text-xs w-full text-left px-2 py-1.5 rounded hover:bg-primary/10 transition-colors"
              >
                {content}
              </button>
            ) : (
              <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5">
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
