import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    // On redirige vers /auth/login en gardant en mémoire l'URL actuelle dans "from"
    // Cela permettra de rediriger l'utilisateur après son login réussi.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si authentifié, on affiche les routes enfants
  return <Outlet />;
};
