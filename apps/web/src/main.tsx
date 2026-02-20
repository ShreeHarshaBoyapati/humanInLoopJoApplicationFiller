import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import '@repo/ui/constants/css-constants.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
