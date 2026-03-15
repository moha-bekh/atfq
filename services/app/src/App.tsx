import { useEffect, useState } from 'react'

import './App.css'

const GATEWAY_URL = 'http://localhost:8085/api';

interface HealthStatus {
  service: string;
  status: string;
  loading: boolean;
  error?: string;
}

function App() {
  const [results, setResults] = useState<HealthStatus[]>([
    { service: 'auth', status: '', loading: true },
    { service: 'user', status: '', loading: true },
    { service: 'wiki', status: '', loading: true },
  ]);

  useEffect(() => {
    results.forEach((s, index) => {
      fetch(`${GATEWAY_URL}/${s.service}/health`)
        .then(res => res.text())
        .then(data => {
          updateStatus(index, data, false);
        })
        .catch(err => {
          updateStatus(index, 'Unreachable', false, err.message);
        });
    });
  }, []);

  const updateStatus = (index: number, status: string, loading: boolean, error?: string) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], status, loading, error };
      return newResults;
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ATFQ System Health</h1>
      <div style={{ display: 'grid', gap: '10px' }}>
        {results.map((res) => (
          <div key={res.service} style={{
            padding: '15px',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: res.error ? '#ffebee' : '#e8f5e9'
          }}>
            <strong>{res.service.toUpperCase()}</strong>: {res.loading ? 'Checking...' : res.status}
            {res.error && <p style={{ color: 'red', fontSize: '12px' }}>{res.error}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
