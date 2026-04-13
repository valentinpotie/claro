import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { HardHat, LogIn, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const logLogin = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log("[LOGIN]", ...args);
  }
};

const warnLogin = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.warn("[LOGIN]", ...args);
  }
};

const errorLogin = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.error("[LOGIN]", ...args);
  }
};

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect already-authenticated users away from login
  useEffect(() => {
    if (!loading && user) {
      logLogin("User already authenticated, redirecting to /dashboard", {
        userId: user.id,
      });
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    logLogin("Submit started", { email: email.trim() });

    try {
      const result = await signIn(email.trim(), password);
      logLogin("signIn response received", { hasError: Boolean(result.error) });

      if (result.error) {
        warnLogin("signIn returned error", { message: result.error });
        setError(result.error);
        setSubmitting(false);
        return;
      }

      // Auth state change listener will update context. Navigate to app.
      logLogin("signIn success, navigating to /dashboard");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      errorLogin("Unexpected exception during login", err);
      setError("Erreur de connexion, veuillez réessayer.");
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
          <CardTitle className="text-lg font-display">Connexion</CardTitle>
          <p className="text-sm text-muted-foreground">
            Accédez à votre espace de gestion
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

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
                <LogIn className="h-4 w-4" />
              )}
              {submitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>

          {/* Demo hint */}
          <div className="mt-4 rounded-md bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Compte démo :</span> demo@claro.app / Demo2026!
            </p>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Pas encore de compte ?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Créer un compte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
