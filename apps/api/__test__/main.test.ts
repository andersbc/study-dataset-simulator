import { assertEquals } from "@std/assert";
import { dirname, fromFileUrl, join, resolve } from "@std/path";
import { app } from "../main.ts";
import { configService } from "../config_service.ts";

const getHeaders = (admin = false) => {
  const h = new Headers();
  const pw = admin ? Deno.env.get("ADMIN_PASSWORD") : (configService.accessPassword || Deno.env.get("ACCESS_PASSWORD"));
  if (pw) h.set("X-Sim-Auth", pw);
  return h;
};

Deno.test("GET / returns 200", async () => {
  const res = await app.request("/");
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "Sim Site API");
});

Deno.test("Rate Limiter blocks excessive requests", async () => {
  // We need to use a unique IP to avoid clashing with other tests or dev usage if persisted
  const mockIP = "10.0.0.99";
  const headers = new Headers({ "x-forwarded-for": mockIP });

  // Limit is 100. Let's send 100 requests.
  for (let i = 0; i < 100; i++) {
    const iterHeaders = new Headers({ "x-forwarded-for": mockIP }); // New headers object each time to avoid interference if mutated
    const pw = configService.accessPassword || Deno.env.get("ACCESS_PASSWORD");
    if (pw) iterHeaders.set("X-Sim-Auth", pw);

    const res = await app.request("/", { headers: iterHeaders });
    assertEquals(res.status, 200, `Request ${i + 1} failed`);
    // Small delay to prevent overwhelming test runner, optional
    await res.body?.cancel();
  }

  // The 101st request should be blocked
  const blockedRes = await app.request("/", { headers });
  assertEquals(blockedRes.status, 429);
  assertEquals(await blockedRes.text(), "Too many requests, please try again later.");
});

Deno.test("POST /validate accepts valid design", async () => {
  const validDesign = {
    studyType: "cross-sectional",
    variables: [
      { kind: "variable", name: "v1", dataType: "continuous", distribution: { type: "normal", mean: 0, stdDev: 1 } }
    ]
  };

  const res = await app.request("/validate", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(validDesign)
  });

  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.valid, true);
});

Deno.test("POST /validate rejects duplicate variables", async () => {
  const invalidDesign = {
    studyType: "cross-sectional",
    variables: [
      { kind: "variable", name: "v1", dataType: "continuous", distribution: { type: "normal", mean: 0, stdDev: 1 } },
      { kind: "variable", name: "v1", dataType: "continuous", distribution: { type: "normal", mean: 0, stdDev: 1 } }
    ]
  };

  const res = await app.request("/validate", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(invalidDesign)
  });

  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.valid, false);
  // @ts-ignore
  assertEquals(body.details[0].message.includes("Duplicate"), true);
});

Deno.test("POST /generate logs the request", async () => {
  const uniqueName = "v1_unique_log_test";
  const design = {
    studyType: "cross-sectional",
    variables: [
      { kind: "variable", name: uniqueName, dataType: "continuous", distribution: { type: "normal", mean: 0, stdDev: 1 } }
    ]
  };

  const res = await app.request("/generate", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ design, n: 10 })
  });

  assertEquals(res.status, 200);

  // Verify log existence (Allow some delay/race tolerance or check whole file)
  const defaultLogDir = resolve(dirname(fromFileUrl(import.meta.url)), "../logs");
  const logDir = Deno.env.get("LOG_DIR") || defaultLogDir;
  const logContent = await Deno.readTextFile(`${logDir}/requests.jsonl`);
  assertEquals(logContent.includes(`"${uniqueName}"`), true, `Log missing variable ${uniqueName}`);
  // We can't strictly check for "success" relative to this specific request without parsing line-by-line matches, 
  // but presence of variable name strongly implies the log entry was written.
});

Deno.test("POST /generate logs full request on failure", async () => {
  const design = { variables: [] };
  // Trigger error with excessive N unique to this test
  const uniqueN = 999888;

  const res = await app.request("/generate", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ design, n: uniqueN })
  });

  assertEquals(res.status, 400);

  const defaultLogDir = resolve(dirname(fromFileUrl(import.meta.url)), "../logs");
  const logDir = Deno.env.get("LOG_DIR") || defaultLogDir;
  const logContent = await Deno.readTextFile(`${logDir}/requests.jsonl`);

  // Check whole content for this N
  assertEquals(logContent.includes(`${uniqueN}`), true, `Log missing N=${uniqueN}`);
  // Check that A failure entry with this N exists
  // We expect "result":"failure" and "fullRequest" in the same block/line.
  // Ideally parse lines.
  const lines = logContent.trim().split('\n');
  const match = lines.find(l => l.includes(`${uniqueN}`));
  assertEquals(!!match, true, "No log line found with unique N");
  if (match) {
    assertEquals(match.includes('"result":"failure"'), true, "Log line was not a failure");
    assertEquals(match.includes('"fullRequest"'), true, "Log line did not include fullRequest");
  }
});

Deno.test("GET /logs returns recent logs", async () => {
  const res = await app.request("/logs", { headers: getHeaders(true) });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(Array.isArray(body.logs), true);
  // We know we just ran tests that generated logs
  assertEquals(body.logs.length > 0, true);
});

Deno.test("GET /logs/download returns file stream", async () => {
  const res = await app.request("/logs/download", { headers: getHeaders(true) });
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Disposition"), 'attachment; filename="requests.jsonl"');
  // Consume body to ensure it works
  await res.text();
});
