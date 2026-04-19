import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Restreint l'accès à une route aux seuls utilisateurs avec profiles.is_super_admin=true.
 *  Redirige les autres vers /dashboard. Le fallback RLS reste la dernière ligne de défense :
 *  même si quelqu'un contourne le guard UI, la DB renverra des données vides. */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile?.is_super_admin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
