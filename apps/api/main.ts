import { Hono } from 'hono';
import { StudyDesignSchema } from '@sim-site/shared';
import { type } from 'arktype';

export const app = new Hono();

import { rateLimiter } from 'hono-rate-limiter';

// Request logging middleware
app.use('/*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
});

import type { Context } from 'hono';

// Rate limiter
app.use('/*', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (c: any) => c.req.header('x-forwarded-for') || 'unknown', // Method to generate custom identifiers for clients.
}) as any);

// Add CORS middleware
app.use('/*', async (c, next) => {
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  await next();
});

import { generateDummyData } from './r_service.ts';

app.get('/', (c) => {
  return c.text('Sim Site API');
});

app.post('/validate', async (c) => {
  const body = await c.req.json();
  const result = StudyDesignSchema(body);

  if (result instanceof type.errors) {
    return c.json({ valid: false, errors: result.summary }, 400);
  }

  return c.json({ valid: true, data: result });
});

app.post('/generate', async (c) => {
  try {
    const data = await generateDummyData();
    return c.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Generation error:", err);
    return c.json({ success: false, error: message }, 500);
  }
});

if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch);
}

