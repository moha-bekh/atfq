import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/app.store';
import { useState, useEffect } from 'react';

export const ProtectedRoute = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    return () => unsub();
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg text-main font-mono uppercase tracking-widest animate-pulse">
        Authenticating...
      </div>
    );
  }

  if (!isAuthenticated) {
    // On redirige vers /login en gardant en mémoire l'URL actuelle dans "from"
    // Cela permettra de rediriger l'utilisateur après son login réussi.
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si authentifié, on affiche les routes enfants
  return <Outlet />;
};
