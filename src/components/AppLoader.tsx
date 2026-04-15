import { useEffect, useRef, useState } from "react";
import { HardHat } from "lucide-react";

const MESSAGES = [
  "Connexion à votre espace...",
  "Récupération des données...",
  "Préparation du tableau de bord...",
  "Presque prêt...",
];

/** Full-screen loading screen with cycling messages and fade transitions.
 *  Drop-in replacement for the static "Chargement..." divs. */
export function AppLoader() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cycle = () => {
      // Fade out
      setVisible(false);
      timerRef.current = setTimeout(() => {
        setIndex(prev => (prev + 1) % MESSAGES.length);
        // Fade in
        setVisible(true);
        timerRef.current = setTimeout(cycle, 2200);
      }, 350);
    };

    timerRef.current = setTimeout(cycle, 2200);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background">
      {/* Logo */}
      <div className="h-10 w-10 rounded-[4px] bg-secondary flex items-center justify-center">
        <HardHat className="h-5 w-5 text-secondary-foreground" />
      </div>

      {/* Cycling message */}
      <p
        className="text-sm text-muted-foreground transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {MESSAGES[index]}
      </p>

      {/* Thin animated bar */}
      <div className="w-32 h-px bg-border overflow-hidden rounded-full">
        <div className="h-full bg-primary/60 animate-loader-bar rounded-full" />
      </div>
    </div>
  );
}
