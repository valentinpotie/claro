import { useNavigate } from "react-router-dom";
import { Ticket, statusLabels, statusColors, categoryLabels } from "@/data/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";

interface Props {
  tickets: Ticket[];
  emptyLabel?: string;
}

export function TicketMiniList({ tickets, emptyLabel = "Aucun ticket associé" }: Props) {
  const navigate = useNavigate();

  if (tickets.length === 0) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {tickets.map(t => (
        <div
          key={t.id}
          onClick={() => navigate(`/tickets/${t.id}`)}
          className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] text-muted-foreground shrink-0">{t.reference}</span>
            <Badge variant="outline" className={`border-0 text-[10px] shrink-0 ${statusColors[t.status]}`}>
              {statusLabels[t.status]}
            </Badge>
            <Badge variant="secondary" className="text-[10px] shrink-0">{categoryLabels[t.categorie]}</Badge>
            <span className="text-xs font-medium truncate">{t.titre}</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      ))}
    </div>
  );
}

interface CountBadgeProps {
  count: number;
}

export function TicketCountBadge({ count }: CountBadgeProps) {
  if (count === 0) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <Badge variant="secondary" className="text-[10px]">
      {count} ticket{count > 1 ? "s" : ""}
    </Badge>
  );
}
