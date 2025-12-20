import { Hono } from 'hono';
import { StudyDesignSchema } from '@sim-site/shared';
import { type } from 'arktype';

const app = new Hono();

// Request logging middleware
app.use('/*', async (c, next) => {
  console.log(`[${new Date().toISOString()}] ${c.req.method} ${c.req.url}`);
  await next();
});

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
  } catch (err: any) {
    console.error("Generation error:", err);
    return c.json({ success: false, error: err.message }, 500);
  }
});

Deno.serve({ port: 8000 }, app.fetch);

