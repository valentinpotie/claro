import { useState } from "react";
import { TimeSlot } from "@/data/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const HOURS = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

function getNextDays(count: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      days.push(d.toISOString().slice(0, 10));
    }
    if (days.length >= count) break;
  }
  return days;
}

interface Props {
  title: string;
  selectedSlots: TimeSlot[];
  onSlotsChange: (slots: TimeSlot[]) => void;
  highlightSlots?: TimeSlot[];
}

export function AvailabilityCalendar({ title, selectedSlots, onSlotsChange, highlightSlots = [] }: Props) {
  const days = getNextDays(5);

  const isSelected = (date: string, heure: string) =>
    selectedSlots.some(s => s.date === date && s.heure === heure);

  const isHighlighted = (date: string, heure: string) =>
    highlightSlots.some(s => s.date === date && s.heure === heure);

  const toggle = (date: string, heure: string) => {
    if (isSelected(date, heure)) {
      onSlotsChange(selectedSlots.filter(s => !(s.date === date && s.heure === heure)));
    } else {
      onSlotsChange([...selectedSlots, { date, heure }]);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="p-1 text-left text-muted-foreground">Heure</th>
                {days.map(d => (
                  <th key={d} className="p-1 text-center text-muted-foreground">
                    {new Date(d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOURS.map(h => (
                <tr key={h}>
                  <td className="p-1 font-medium">{h}</td>
                  {days.map(d => {
                    const sel = isSelected(d, h);
                    const hl = isHighlighted(d, h);
                    return (
                      <td key={`${d}-${h}`} className="p-0.5">
                        <button
                          onClick={() => toggle(d, h)}
                          className={`w-full h-8 rounded text-xs transition-colors flex items-center justify-center
                            ${sel && hl ? "bg-success text-success-foreground font-medium" :
                              sel ? "bg-primary text-primary-foreground" :
                              hl ? "bg-warning/20 text-warning border border-warning/30" :
                              "bg-muted hover:bg-muted/70 text-muted-foreground"}`}
                        >
                          {sel && hl ? <Check className="h-3 w-3" /> : sel ? "✓" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          {selectedSlots.length} créneau(x) sélectionné(s)
          {highlightSlots.length > 0 && ` · ${highlightSlots.length} créneau(x) de l'autre partie`}
        </p>
      </CardContent>
    </Card>
  );
}
