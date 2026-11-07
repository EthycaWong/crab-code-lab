import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { compilerApi } from './lib/compiler-api';

// Local API bridge. Production uses netlify/functions/compiler.mjs.
function compilerPreview(): Plugin {
  return {
    name: 'crab-local-compiler',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res, next) => {
        if (!['/status', '/compile', '/submit'].includes((req.url || '').split('?')[0])) return next();
        try {
          const chunks: Buffer[] = [];
          let length = 0;
          for await (const chunk of req) {
            length += chunk.length;
            if (length > 100000) {
              res.writeHead(413, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Sketch request is too large.' }));
              return;
            }
            chunks.push(chunk);
          }
          const headers = new Headers();
          for (const [name, value] of Object.entries(req.headers)) {
            if (typeof value === 'string') headers.set(name, value);
          }
          const origin = `http://${req.headers.host || '127.0.0.1:5173'}`;
          const request = new Request(`${origin}/api${req.url}`, {
            method: req.method,
            headers,
            ...(req.method === 'POST' ? { body: Buffer.concat(chunks).toString() } : {}),
          });
          const response = await compilerApi(request, process.env, req.socket.remoteAddress);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(await response.text());
        } catch {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Local compiler service is unavailable.' }));
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), compilerPreview()] });
