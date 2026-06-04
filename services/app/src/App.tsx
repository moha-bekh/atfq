import { AppProvider } from '@/providers/AppProvider';
import { AppRouter } from '@/routes';
import { DemoNotice } from '@/components/DemoNotice';

export default function App() {
  return (
    <AppProvider>
      <AppRouter />
      <DemoNotice />
    </AppProvider>
  );
}
