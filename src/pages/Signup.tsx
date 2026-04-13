import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { HardHat, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const logSignup = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log("[SIGNUP]", ...args);
  }
};

const warnSignup = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn("[SIGNUP]", ...args);
  }
};

const errorSignup = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.error("[SIGNUP]", ...args);
  }
};

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    logSignup("Submit started", { email: email.trim() });

    if (password.length < 6) {
      warnSignup("Password validation failed", { length: password.length });
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || email.trim(),
            // agency_id will be null — linked during onboarding when the agency is created
          },
        },
      });
      logSignup("signUp response received", { hasError: Boolean(signUpError) });

      if (signUpError) {
        warnSignup("signUp returned error", {
          message: signUpError.message,
          code: signUpError.code,
        });

        // SMTP not configured: the user was likely created but the confirmation email failed.
        // Try signing in immediately — if email confirmation is disabled in Supabase, this works.
        if (signUpError.message.includes("Error sending confirmation email")) {
          logSignup("SMTP failure, attempting direct sign-in as fallback");
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (!signInError) {
            logSignup("Fallback sign-in succeeded, navigating to /onboarding");
            navigate("/onboarding", { replace: true });
            return;
          }
          warnSignup("Fallback sign-in also failed", signInError.message);
          setError(
            "Compte créé mais la confirmation email a échoué. " +
            "Va dans le dashboard Supabase → Authentication → Providers → Email et désactive « Confirm email » pour le mode dev, puis connecte-toi depuis la page Login."
          );
        } else {
          setError(signUpError.message);
        }
        setSubmitting(false);
        return;
      }

      // Auto sign-in after signup (Supabase does this by default when email confirmation is disabled)
      logSignup("signUp success, navigating to /onboarding");
      navigate("/onboarding", { replace: true });
    } catch (err) {
      errorSignup("Unexpected exception during signup", err);
      setError("Erreur lors de la création du compte. Réessaie dans quelques instants.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-10">
        <div className="h-10 w-10 rounded-[4px] bg-secondary flex items-center justify-center">
          <HardHat className="h-5 w-5 text-secondary-foreground" />
        </div>
        <span className="text-xl font-bold font-display">Claro</span>
      </div>

      <Card className="w-full max-w-sm border-0">
        <CardHeader className="pb-2 text-center">
          <CardTitle className="text-lg font-display">Créer un compte</CardTitle>
          <p className="text-sm text-muted-foreground">
            Commencez à gérer vos interventions
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              placeholder="Nom complet"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
              autoComplete="name"
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Mot de passe (min. 6 caractères)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gap-2"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {submitting ? "Création..." : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Se connecter
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
