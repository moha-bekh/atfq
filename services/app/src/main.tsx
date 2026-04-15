import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@/styles/index.css'

async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and running.
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

enableMocking()
  .then(() => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  })
  .catch((err) => {
    console.error('Failed to enable mocking:', err);
    // Even if mocking fails, we still want to render the app
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    )
  });
