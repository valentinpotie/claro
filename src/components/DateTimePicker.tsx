import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value?: string; // ISO datetime or "YYYY-MM-DD"
  onChange: (value: string | undefined) => void;
  placeholder?: string;
}

function parse(value?: string): { date: Date | undefined; time: string } {
  if (!value) return { date: undefined, time: "" };
  try {
    // Normalise "YYYY-MM-DD HH:mm" (space-separated) to ISO 8601 "YYYY-MM-DDTHH:mm"
    const normalized = value.replace(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})/, "$1T$2");
    const d = parseISO(normalized);
    if (isNaN(d.getTime())) return { date: undefined, time: "" };
    const hasTime = normalized.includes("T");
    return {
      date: d,
      time: hasTime ? format(d, "HH:mm") : "",
    };
  } catch {
    return { date: undefined, time: "" };
  }
}

function buildValue(date: Date | undefined, time: string): string | undefined {
  if (!date) return undefined;
  const dateStr = format(date, "yyyy-MM-dd");
  if (!/^\d{2}:\d{2}$/.test(time)) return dateStr;
  // Build a full Date at the chosen local time, then include the timezone offset
  // so Supabase (timestamptz) stores the correct UTC value.
  const [h, m] = time.split(":").map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  const off = -d.getTimezoneOffset(); // offset in minutes (positive = east of UTC)
  const sign = off >= 0 ? "+" : "-";
  const absOff = Math.abs(off);
  const offH = String(Math.floor(absOff / 60)).padStart(2, "0");
  const offM = String(absOff % 60).padStart(2, "0");
  return `${dateStr}T${time}:00${sign}${offH}:${offM}`;
}

export function DateTimePicker({ value, onChange, placeholder = "Choisir une date…" }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() => parse(value).date);
  const [time, setTime] = useState<string>(() => parse(value).time);

  // Re-initialise internal state each time the popover opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
      const parsed = parse(value);
      setSelectedDate(parsed.date);
      setTime(parsed.time);
    } else {
      // Persist on close
      onChange(buildValue(selectedDate, time));
    }
    setOpen(o);
  };

  const handleDaySelect = (day: Date | undefined) => {
    setSelectedDate(day);
    // Save immediately when a day is picked (keeps time as-is)
    onChange(buildValue(day, time));
  };

  const handleConfirm = () => {
    onChange(buildValue(selectedDate, time));
    setOpen(false);
  };

  const displayLabel = () => {
    const { date, time: t } = parse(value);
    if (!date) return null;
    const datePart = format(date, "d MMMM yyyy", { locale: fr });
    return t ? `${datePart} à ${t}` : datePart;
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-8 justify-start gap-2 text-xs font-normal min-w-[200px]",
            !value && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          {displayLabel() ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDaySelect}
          locale={fr}
          initialFocus
        />
        <div className="border-t px-3 py-2 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Heure :</span>
          <Input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="h-7 text-xs w-28"
          />
          {time && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setTime("")}
            >
              Effacer
            </Button>
          )}
        </div>
        <div className="border-t px-3 py-2 flex justify-end">
          <Button size="sm" className="h-7 text-xs" onClick={handleConfirm}>
            Confirmer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
