import express from 'express';
import type { Request, Response } from './types.js';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// ===== API Routes =====

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
  });
});

// Sample API endpoint
app.get('/api/hello', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from the API!' });
});

// ===== Production: Serve Frontend =====
if (isProduction) {
  // Path to the built frontend files
  const frontendPath = path.join(__dirname, '../../web/dist');

  // Serve static files from the frontend build
  app.use(express.static(frontendPath));

  // For any other route, serve the frontend's index.html (SPA support)
  // Express 5 uses {*splat} syntax instead of *
  app.get('{*splat}', (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });

  console.log(`📦 Serving frontend from: ${frontendPath}`);
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
  } else {
    console.log(`🔧 Development mode - Frontend runs separately on http://localhost:3000`);
  }
});
