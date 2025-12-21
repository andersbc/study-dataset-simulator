import { Hono } from 'hono';
import { getConnInfo } from 'hono/deno';
import { validateStudyDesign, MAX_GENERATION_N } from '@sim-site/shared';

export const app = new Hono();

// Log Configuration
const LOG_CONFIG = {
  MAX_ENTRIES: 1000,
  RETENTION_DAYS: 30,
  KEEP_ERRORS: true,
};

let currentLogEntries = 0;

// Log Rotation Logic
async function rotateLogs() {
  try {
    const logDir = new URL('./logs', import.meta.url).pathname;
    const currentLog = `${logDir}/requests.jsonl`;

    // 1. Rotate current log (unconditional if called, assuming threshold met)
    try {
      const info = await Deno.stat(currentLog);
      if (info.size > 0) {
        const d = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        // Format: requests-YYYYMMDDHHmmss.jsonl
        const timestamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

        await Deno.rename(currentLog, `${logDir}/requests-${timestamp}.jsonl`);
        console.log(`Rotated log file to requests-${timestamp}.jsonl`);
        currentLogEntries = 0; // Reset count
      }
    } catch {
      // Current log doesn't exist
    }

    // 2. Cleanup old archives (> 30 days)
    const retentionMs = LOG_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for await (const entry of Deno.readDir(logDir)) {
      if (entry.isFile && entry.name.startsWith('requests-') && entry.name.endsWith('.jsonl')) {
        const path = `${logDir}/${entry.name}`;
        const info = await Deno.stat(path);
        const ageMs = Date.now() - (info.mtime?.getTime() || 0);
        if (ageMs > retentionMs) {
          // Check if we should keep it due to errors
          if (LOG_CONFIG.KEEP_ERRORS) {
            try {
              const content = await Deno.readTextFile(path);
              // Simple string check for failure result
              if (content.includes('"result":"failure"')) {
                console.log(`Keeping old log file with errors: ${entry.name}`);
                continue; // Skip deletion
              }
            } catch (e) {
              console.error(`Failed to read log file for error check: ${entry.name}`, e);
            }
          }

          await Deno.remove(path);
          console.log(`Deleted old log file: ${entry.name}`);
        }
      }
    }
  } catch (err) {
    console.error('Log rotation failed:', err);
  }
}

// Initialize entry count
async function initLogCount() {
  try {
    const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;
    const text = await Deno.readTextFile(logPath);
    // Count non-empty lines
    currentLogEntries = text.split('\n').filter(line => line.trim()).length;
    console.log(`Initialized log count: ${currentLogEntries}`);
  } catch {
    currentLogEntries = 0;
  }
}

// Startup
initLogCount();

import { rateLimiter } from 'hono-rate-limiter';

// Request logging middleware
app.use('/generate', async (c, next) => {
  const start = Date.now();
  let ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown';
  if (ip === 'unknown') {
    // Localhost fallback
    try {
      const info = getConnInfo(c);
      ip = info.remote.address || '127.0.0.1';
    } catch {
      ip = '127.0.0.1';
    }
  }

  let fullBody: any = null;
  try {
    fullBody = await c.req.json();
  } catch {
    // ignore
  }

  // Ensure config is fresh for logging if needed

  await next();

  const duration = Date.now() - start;
  const isSuccess = c.res.status >= 200 && c.res.status < 300;

  // Extract info from validation response if available, or assume fail
  // We can't easily read response body here if it was already streamed/sent?
  // But our endpoints return JSON.

  // Logging logic
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip,
      variables: Array.isArray(fullBody?.design) ? (fullBody.design as any[]).map(v => v.name).slice(0, 8) : [],
      result: isSuccess ? 'success' : 'failure',
      // We assume handler attached rows info? Or we parse response? 
      // Cloning response is expensive. Simplified:
      rows: fullBody?.n_obs || 0,
      error: !isSuccess ? 'Check logs' : undefined,
      durationMs: duration,
      fullRequest: !isSuccess ? fullBody : undefined
    };

    // Write
    const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;
    await Deno.mkdir(new URL('./logs', import.meta.url).pathname, { recursive: true });
    await Deno.writeTextFile(logPath, JSON.stringify(logEntry) + '\n', { append: true });

    // Increment and Check Rotation
    currentLogEntries++;
    if (currentLogEntries >= LOG_CONFIG.MAX_ENTRIES) {
      // Async rotation to not block response? Or align?
      // Since it's file op, safe to run async but we risk race condition on next write.
      // JS is single threaded event loop, so `await` blocks *this* request but Deno handles others.
      // However, rename effectively removes the file. Next write creates new.
      // It's safer to await it or simple fire and forget?
      // If we fire and forget, next request might write to old file (if rename hasn't happened).
      // We will await it.
      await rotateLogs();
    }

  } catch (err) {
    console.error('Failed to write log', err);
  }
});

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
  c.res.headers.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Sim-Auth');
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }
  await next();
});

import { generateDummyData } from './r_service.ts';

app.get('/', (c) => {
  return c.text('Sim Site API');
});

import { configService } from './config_service.ts';

// Initialize Config (async load)
await configService.loadConfig();

// Authentication Middleware
app.use('/*', async (c, next) => {
  // Allow public endpoints
  const url = new URL(c.req.url);
  if (url.pathname === '/' || url.pathname === '/auth/validate' || url.pathname === '/auth/status' || c.req.method === 'OPTIONS') {
    await next();
    return;
  }

  const sitePw = configService.accessPassword;
  const logsPw = Deno.env.get('ADMIN_PASSWORD');
  // Dynamic Auth Status
  const authEnabled = configService.authEnabled;

  if (!sitePw || !logsPw) {
    console.warn("Missing ACCESS_PASSWORD or ADMIN_PASSWORD. Allowing access (unsafe mode).");
    await next();
    return;
  }

  let authHeader = c.req.header('X-Sim-Auth');
  // Allow token via query param for logs download (browser link support)
  if (!authHeader && url.pathname === '/logs/download') {
    authHeader = url.searchParams.get('token') || undefined;
  }

  // Check Logs and Admin Access (ALWAYS requires Admin PW)
  if (url.pathname.startsWith('/logs') || url.pathname.startsWith('/admin')) {
    if (authHeader === logsPw) {
      await next();
      return;
    }
    return c.json({ error: 'Unauthorized: Admin access required' }, 401);
  }

  // Check General Access
  // If Auth is disabled, we allow access to everything else
  if (!authEnabled) {
    await next();
    return;
  }

  // If Auth is enabled, we need Site or Logs PW
  if (authHeader === sitePw || authHeader === logsPw) {
    await next();
    return;
  }

  return c.json({ error: 'Unauthorized: Invalid password' }, 401);
});

app.get('/auth/status', (c) => {
  return c.json({ siteAuthEnabled: configService.authEnabled });
});

// Admin Configuration Endpoints
app.get('/admin/config', (c) => {
  // Middleware already ensures only Admin/Site PW gets here, but we want STRICT ADMIN ONLY?
  // The middleware allows Site PW for general usage.
  // We need to re-verify strictly for ADMIN_PASSWORD here or assume middleware handles "logs" path logic?
  // Since this is a new path '/admin', the generic middleware might allow Site PW.
  // We should enforce strict Admin check for /admin/* in middleware or here.

  // Let's add a strict guard here for safety, or better: update Middleware to protect /admin like /logs
  const authHeader = c.req.header('X-Sim-Auth');
  const logsPw = Deno.env.get('ADMIN_PASSWORD');
  if (authHeader !== logsPw) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 401);
  }

  return c.json({
    authEnabled: configService.authEnabled,
    // redact password for security? Or show it? 
    // Usually show it masked or just empty. User wants to "change" it.
    // For simplicity, let's return it so they can see current value (it's admin only).
    accessPassword: configService.accessPassword
  });
});

app.post('/admin/config', async (c) => {
  const authHeader = c.req.header('X-Sim-Auth');
  const logsPw = Deno.env.get('ADMIN_PASSWORD');
  if (authHeader !== logsPw) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 401);
  }

  try {
    const body = await c.req.json();
    if (typeof body.authEnabled === 'boolean') {
      configService.setAuthEnabled(body.authEnabled);
    }
    if (body.accessPassword && typeof body.accessPassword === 'string') {
      configService.setAccessPassword(body.accessPassword);
    }
    await configService.saveConfig();
    return c.json({ success: true });
  } catch (e) {
    return c.json({ success: false, error: 'Invalid body' }, 400);
  }
});


app.onError((err, c) => {
  console.error('GLOBAL ERROR:', err);
  return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

app.post('/auth/validate', async (c) => {
  console.log('[Auth] Validate request received');
  let password: string | undefined;
  try {
    const body = await c.req.json();
    console.log('[Auth] Body parsed:', body);
    password = body.password;
  } catch (e) {
    console.error('[Auth] JSON parse error:', e);
    return c.json({ valid: false, role: null, error: "Invalid JSON body" }, 400);
  }

  // Use dynamic config
  const sitePw = configService.accessPassword;
  const logsPw = Deno.env.get('ADMIN_PASSWORD');

  if (password && logsPw && password === logsPw) {
    return c.json({ valid: true, role: 'admin' });
  }
  if (password && sitePw && password === sitePw) {
    return c.json({ valid: true, role: 'guest' });
  }
  return c.json({ valid: false, role: null }, 401);
});

app.post('/validate', async (c) => {
  const body = await c.req.json();
  const result = validateStudyDesign(body);

  if (!result.valid) {
    const summary = result.errors.map(e => `${e.path}: ${e.message}`).join(', ');
    return c.json({ valid: false, errors: summary, details: result.errors }, 400);
  }

  return c.json({ valid: true, data: body });
});

app.post('/generate', async (c) => {
  const start = Date.now();
  const logEntry = {
    timestamp: new Date().toISOString(),
    ip: c.req.header('x-forwarded-for') || 'unknown',
    variables: [] as string[],
    result: 'pending',
    rows: 0,
    error: '',
    durationMs: 0,
    fullRequest: null as any
  };

  let requestBody: any = null;

  try {
    // The body might be the design object directly OR a wrapper { design: ..., n: ... }
    const body = await c.req.json();
    requestBody = body; // Capture for logging

    // Check for wrapper format
    let design = body;
    let n = 100;

    if ('design' in body && 'n' in body) {
      design = body.design;
      n = Number(body.n) || 100;
      if (n < 1) n = 1;

      if (n > MAX_GENERATION_N) {
        throw new Error(`Sample size exceeds limit of ${MAX_GENERATION_N}`);
      }
    }

    // Extract logging info (first 8 vars)
    if (design?.variables && Array.isArray(design.variables)) {
      logEntry.variables = design.variables.slice(0, 8).map((v: any) => v.name);
    }

    // Validate first (lightweight)
    const valResult = validateStudyDesign(design);
    if (!valResult.valid) {
      throw new Error("Invalid Design: " + valResult.errors[0]?.message);
    }

    const data = await generateDummyData(design, n);

    // Success Logic
    // @ts-ignore: Data is parsed array of objects
    const rowCount = Array.isArray(data) ? data.length : 0;

    logEntry.result = 'success';
    logEntry.rows = rowCount;

    return c.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Generation error:", err);

    logEntry.result = 'failure';
    logEntry.error = message;

    // Log full payload on failure for debugging
    // @ts-ignore: Dynamic property
    logEntry.fullRequest = requestBody;

    const status = message.startsWith("Invalid Design") || message.includes("Sample size") ? 400 : 500;
    return c.json({ success: false, error: message }, status);
  } finally {
    logEntry.durationMs = Date.now() - start;

    // Fire and forget logging
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      // Resolve path relative to this file
      const logDir = new URL('./logs', import.meta.url).pathname;
      const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;

      // Ensure dir exists (safe to run concurrently usually, or ignore error)
      try {
        await Deno.mkdir(logDir, { recursive: true });
      } catch {
        // ignore if exists
      }

      await Deno.writeTextFile(logPath, logLine, { append: true });
    } catch (ioErr) {
      console.error("Failed to write log:", ioErr);
    }
  }
});

if (import.meta.main) {
  Deno.serve({ port: 8000 }, app.fetch);
}

app.get('/logs/download', async (c) => {
  try {
    const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;
    const file = await Deno.open(logPath);

    c.header('Content-Type', 'application/json');
    c.header('Content-Disposition', 'attachment; filename="requests.jsonl"');

    return c.body(file.readable);
  } catch (e) {
    return c.text('Log file not found', 404);
  }
});

app.get('/logs', async (c) => {
  try {
    const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;
    const content = await Deno.readTextFile(logPath);
    const lines = content.trim().split('\n');
    // Return all lines reversed (newest first)
    const recent = lines.reverse().map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    return c.json({ success: true, logs: recent });
  } catch (e) {
    return c.json({ success: false, error: "No logs found or error reading" }, 404);
  }
});

app.delete('/logs', async (c) => {
  const authHeader = c.req.header('X-Sim-Auth');
  const logsPw = Deno.env.get('ADMIN_PASSWORD');

  if (authHeader !== logsPw) {
    return c.json({ error: 'Unauthorized: Admin access required' }, 401);
  }

  try {
    const logPath = new URL('./logs/requests.jsonl', import.meta.url).pathname;
    await Deno.writeTextFile(logPath, ''); // Truncate file
    currentLogEntries = 0; // Reset counter
    return c.json({ success: true });
  } catch (e) {
    return c.json({ success: false, error: "Failed to clear logs" }, 500);
  }
});

