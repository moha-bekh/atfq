import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useAppStore } from '@/stores/app.store';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const initApp = useAppStore(state => state.initApp);

  useEffect(() => {
    initApp();
  }, [initApp]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
