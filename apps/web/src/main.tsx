import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { theme, ThemeProvider, CssBaseline } from '@repo/ui/theme.tsx';
import './index.css';
import '@repo/ui/constants/css-constants.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
