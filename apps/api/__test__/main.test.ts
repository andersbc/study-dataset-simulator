import { assertEquals } from "@std/assert";
import { app } from "../main.ts";

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
    const res = await app.request("/", { headers });
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
    body: JSON.stringify(invalidDesign)
  });

  assertEquals(res.status, 400);
  const body = await res.json();
  assertEquals(body.valid, false);
  // @ts-ignore
  assertEquals(body.details[0].message.includes("Duplicate"), true);
});

Deno.test("POST /generate logs the request", async () => {
  const design = {
    studyType: "cross-sectional",
    variables: [
      { kind: "variable", name: "v1", dataType: "continuous", distribution: { type: "normal", mean: 0, stdDev: 1 } }
    ]
  };

  const res = await app.request("/generate", {
    method: "POST",
    body: JSON.stringify({ design, n: 10 })
  });

  assertEquals(res.status, 200);

  // Verify log existence
  const logContent = await Deno.readTextFile("logs/requests.jsonl");
  // Check if our variable "v1" is in the log
  assertEquals(logContent.includes('"v1"'), true);
  assertEquals(logContent.includes('"result":"success"'), true);
});

Deno.test("POST /generate logs full request on failure", async () => {
  const design = { variables: [] };
  // Trigger error with excessive N
  const hugeN = 1000000;

  const res = await app.request("/generate", {
    method: "POST",
    body: JSON.stringify({ design, n: hugeN })
  });

  assertEquals(res.status, 500); // Or 400? The code throws Error, catches, returns 500.

  const logContent = await Deno.readTextFile("logs/requests.jsonl");
  // Only check the last line or just inclusion
  const lines = logContent.trim().split('\n');
  const lastLine = lines[lines.length - 1];

  assertEquals(lastLine.includes('"result":"failure"'), true);
  assertEquals(lastLine.includes('"fullRequest"'), true);
  assertEquals(lastLine.includes(`${hugeN}`), true);
});

Deno.test("GET /logs returns recent logs", async () => {
  const res = await app.request("/logs");
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.success, true);
  assertEquals(Array.isArray(body.logs), true);
  // We know we just ran tests that generated logs
  assertEquals(body.logs.length > 0, true);
});

Deno.test("GET /logs/download returns file stream", async () => {
  const res = await app.request("/logs/download");
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Content-Disposition"), 'attachment; filename="requests.jsonl"');
  // Consume body to ensure it works
  await res.text();
});
