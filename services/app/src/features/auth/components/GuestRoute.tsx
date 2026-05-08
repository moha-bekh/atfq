import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

import { useAppStore } from '@/stores/app.store';

export const GuestRoute = () => {
  const isAuthenticated = useAppStore((state) => state.isAuthenticated);
  const accessToken = useAppStore((state) => state.accessToken);
  const refreshToken = useAppStore((state) => state.refreshToken);
  const location = useLocation();
  const [isHydrated, setIsHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    return () => unsub();
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg font-mono text-main uppercase tracking-widest animate-pulse">
        Loading...
      </div>
    );
  }

  if (isAuthenticated && accessToken && refreshToken) {
    const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/wiki';

    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
