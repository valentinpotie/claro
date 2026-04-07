import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTickets } from "@/contexts/TicketContext";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

export function GuidedTour({ onHighlight }: { onHighlight?: (active: boolean) => void }) {
  const { settings, updateSettings } = useSettings();
  const { tickets } = useTickets();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    onHighlight?.(visible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-show on first access
  useEffect(() => {
    if (!settings.tour_completed && tickets.length > 0) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [settings.tour_completed, tickets.length]);

  const close = () => {
    setVisible(false);
    updateSettings({ tour_completed: true });
  };

  if (!visible) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setVisible(true)}>
        <Sparkles className="h-3.5 w-3.5" /> Tutoriel
      </Button>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/25 animate-in fade-in" onClick={close} />
      <div className="fixed bottom-6 right-6 z-[60] w-[340px] rounded-xl border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 fade-in">
        <div className="px-4 py-3 border-b bg-primary/5 flex items-center justify-between">
          <span className="text-xs font-semibold">Visite guidée</span>
          <button onClick={close} className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm font-semibold">Vos signalements arrivent automatiquement</p>
          <p className="text-xs text-muted-foreground leading-relaxed">Chaque email de locataire est détecté et analysé par l’IA. Catégorie, priorité et responsabilité sont pré-remplis. Validez ou corrigez en un clic.</p>
        </div>
        <div className="px-4 py-3 border-t bg-muted/30 flex justify-end">
          <Button size="sm" onClick={close} className="h-7 text-xs">Compris</Button>
        </div>
      </div>
    </>
  );
}
