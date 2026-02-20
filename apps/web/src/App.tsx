import { useEffect, useState } from 'react';
import styles from './App.module.css';
import Button from '@repo/ui/button.tsx';

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

// Define all button theme variants available in the Button component
const colorThemes = [
  'primary',
  'secondary',
  'tertiary',
  'negativeSecondary',
  'hyperLinkTertiary',
] as const;

const sizes = ['small', 'medium', 'large'] as const;

function App() {
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
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Button Design System Gallery</h1>
        <div className={styles.card}>
          <p>
            <strong>Backend Status:</strong> {backendStatus} | <strong>API Message:</strong>{' '}
            {apiMessage}
          </p>
        </div>
      </header>

      {sizes.map((size) => (
        <section key={size} className={styles.section}>
          <h2 className={styles.sectionTitle}>{size} Size Variants</h2>
          <div className={styles.grid}>
            {colorThemes.map((theme) => (
              <div key={`${size}-${theme}`} className={styles.variantContainer}>
                <span className={styles.variantLabel}>{theme}</span>
                <Button label="Button" size={size} colorTheme={theme} />
              </div>
            ))}

            {/* Disabled State Example */}
            <div className={`${styles.variantContainer} ${styles.variantContainerDisabled}`}>
              <span className={styles.variantLabel}>disabled</span>
              <Button label="Disabled" size={size} colorTheme="primary" disabled />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default App;
