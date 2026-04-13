import { useRef } from "react";
import Autocomplete from "react-google-autocomplete";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, Mail } from "lucide-react";
import { Artisan } from "@/data/types";

export const artisanSpecialtyLabels: Record<string, string> = {
  plumbing: "Plomberie",
  electrical: "Électricité",
  locksmith: "Serrurerie",
  heating: "Chauffage",
  roofing: "Toiture",
  humidity: "Humidité",
  pests: "Nuisibles",
  painting: "Peinture",
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
        <Label>Spécialité</Label>
        <select
          className="flex h-9 w-full rounded-[4px] border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-0 focus:border-foreground/70"
          value={value.specialite}
          onChange={e => onChange({ ...value, specialite: e.target.value })}
        >
          {Object.entries(artisanSpecialtyLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
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
            placeholder="Email"
            value={value.email}
            onChange={e => onChange({ ...value, email: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
