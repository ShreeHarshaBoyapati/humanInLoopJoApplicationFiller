import { useEffect, useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { Button } from '@repo/ui/button';

// API URL: In production, frontend and backend are on same origin
// In development, backend runs on port 3001
const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiResponse {
  message: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
}

function App() {
  const [count, setCount] = useState(0);
  const [apiMessage, setApiMessage] = useState<string>('Loading...');
  const [backendStatus, setBackendStatus] = useState<string>('Checking...');

  // Fetch data from backend on component mount
  useEffect(() => {
    // Check backend health
    fetch(`${API_URL}/health`)
      .then((res) => res.json())
      .then((data: HealthResponse) => {
        setBackendStatus(`✅ Backend is ${data.status}`);
      })
      .catch(() => {
        setBackendStatus('❌ Backend is offline');
      });

    // Fetch hello message
    fetch(`${API_URL}/api/hello`)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        setApiMessage(data.message);
      })
      .catch(() => {
        setApiMessage('Failed to connect to API');
      });
  }, []);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React + Express</h1>

      {/* Backend Connection Status */}
      <div className="card">
        <p>
          <strong>Backend Status:</strong> {backendStatus}
        </p>
        <p>
          <strong>API Message:</strong> {apiMessage}
        </p>
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
        <Button appName="JFP">Click me</Button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="readTheDocs">Click on the Vite and React logos to learn more</p>
    </>
  );
}

export default App;
