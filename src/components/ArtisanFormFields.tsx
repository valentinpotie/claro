import { useRef, useState } from "react";
import Autocomplete from "react-google-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Phone, Mail, ChevronDown } from "lucide-react";
import { Artisan } from "@/data/types";
import { cn } from "@/lib/utils";

export const artisanSpecialtyLabels: Record<string, string> = {
  plumbing: "Plomberie",
  electrical: "Électricité",
  locksmith: "Serrurerie",
  heating: "Chauffage",
  roofing: "Toiture",
  humidity: "Humidité",
  pests: "Nuisibles",
  painting: "Peinture",
  tiling: "Carrelage",
  masonry: "Maçonnerie",
  drywall: "Plaquisterie",
  ironwork: "Ferronnerie",
  swimming_pool: "Pisciniste",
  cleaning: "Nettoyage",
  general: "Général",
  other: "Autre",
};

export const defaultArtisanSpecialty = "other";

function getCityFromAddress(components?: google.maps.GeocoderAddressComponent[]) {
  if (!components) return "";
  return (
    components.find(c => c.types.includes("locality"))?.long_name ??
    components.find(c => c.types.includes("postal_town"))?.long_name ??
    components.find(c => c.types.includes("administrative_area_level_2"))?.long_name ??
    ""
  );
}

interface ArtisanFormFieldsProps {
  value: Omit<Artisan, "id">;
  onChange: (updated: Omit<Artisan, "id">) => void;
}

function SpecialtyMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);

  const toggle = (key: string) => {
    onChange(selected.includes(key) ? selected.filter(s => s !== key) : [...selected, key]);
  };

  const label = selected.length === 0
    ? "Choisir des spécialités…"
    : selected.length === 1
      ? artisanSpecialtyLabels[selected[0]] ?? selected[0]
      : `${selected.length} spécialités`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className={cn("w-full justify-between h-9 font-normal text-sm", selected.length === 0 && "text-muted-foreground")}
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {Object.entries(artisanSpecialtyLabels).map(([key, libelle]) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded px-2 py-1.5 cursor-pointer hover:bg-muted/60"
              onClick={() => toggle(key)}
            >
              <Checkbox
                checked={selected.includes(key)}
                onCheckedChange={() => toggle(key)}
                onClick={e => e.stopPropagation()}
                className="shrink-0"
              />
              <span className="text-sm">{libelle}</span>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <div className="border-t mt-2 pt-2 flex flex-wrap gap-1">
            {selected.map(s => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {artisanSpecialtyLabels[s] ?? s}
              </Badge>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ArtisanFormFields({ value, onChange }: ArtisanFormFieldsProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="col-span-2 space-y-1.5">
        <Label>Nom / raison sociale</Label>
        <Autocomplete
          ref={nameInputRef}
          apiKey={import.meta.env.VITE_GOOGLE_PLACES_API_KEY}
          onPlaceSelected={(place: google.maps.places.PlaceResult) => {
            if (!place) return;
            const nom = (place.name ?? "").split(",")[0].trim();
            const telephone = place.formatted_phone_number ?? "";
            const ville = getCityFromAddress(place.address_components);
            const address = place.formatted_address ?? "";
            onChange({
              ...value,
              nom: nom || value.nom,
              telephone: telephone || value.telephone,
              ville: ville || value.ville,
              address: address || value.address,
            });
            if (nom) {
              setTimeout(() => {
                if (nameInputRef.current) nameInputRef.current.value = nom;
              }, 0);
            }
          }}
          options={{
            types: ["establishment"],
            componentRestrictions: { country: "fr" },
            fields: ["name", "formatted_phone_number", "formatted_address", "address_components"],
          }}
          value={value.nom}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ ...value, nom: e.target.value })
          }
          placeholder="Rechercher ou saisir une entreprise..."
          className="flex h-9 w-full rounded-[4px] border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Spécialité(s)</Label>
        <SpecialtyMultiSelect
          selected={value.specialites ?? []}
          onChange={specialites => onChange({ ...value, specialites })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Ville</Label>
        <Input
          placeholder="Ville"
          value={value.ville}
          onChange={e => onChange({ ...value, ville: e.target.value })}
        />
      </div>

      <div className="col-span-2 space-y-1.5">
        <Label>Adresse</Label>
        <Input
          placeholder="Adresse"
          value={value.address ?? ""}
          onChange={e => onChange({ ...value, address: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Téléphone</Label>
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="tel"
            placeholder="Téléphone"
            value={value.telephone}
            onChange={e => onChange({ ...value, telephone: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Email</Label>
        <div className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="email"
            placeholder="Email"
            value={value.email}
            onChange={e => onChange({ ...value, email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
