import { Hono } from 'hono';
import { StudyDesignSchema } from '@sim-site/shared';
import { type } from 'arktype';

const app = new Hono();

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

Deno.serve(app.fetch);
