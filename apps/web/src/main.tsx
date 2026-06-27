import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { theme, ThemeProvider, CssBaseline } from '@repo/ui/theme.tsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/en-gb';
import { routeTree } from './routeTree.gen';
import { queryClient } from './utils/query-client.ts';
import { RealtimeSyncProvider } from './realtime/realtime-provider';
import './index.css';
import '@repo/ui/constants/css-constants.css';

dayjs.locale('en-gb');
dayjs.extend(customParseFormat);

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RealtimeSyncProvider>
          <RouterProvider router={router} />
        </RealtimeSyncProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
