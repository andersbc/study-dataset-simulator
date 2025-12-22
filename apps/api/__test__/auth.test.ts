
import { assertEquals, assertNotEquals } from "@std/assert";
import { app } from "../main.ts";

import { configService } from "../config_service.ts";

Deno.test("Auth Middleware Tests", async (t) => {
  // 1. Setup Env
  // We must set it via configService because it is initialized at module load time
  // and env vars set here are too late for the initial load, though accessible if read dynamically.
  // configService caches the initial env var value.
  const originalPw = configService.accessPassword;
  const originalAdmin = Deno.env.get("ADMIN_PASSWORD");

  configService.setAccessPassword("test-site-pw");
  Deno.env.set("ADMIN_PASSWORD", "test-logs-pw");
  configService.setAuthEnabled(true);

  // 2. Helper to fetch with header
  const fetchWithAuth = async (path: string, auth?: string, method: string = "GET", body?: BodyInit | null, contentType?: string) => {
    const headers = new Headers();
    if (auth) headers.set("X-Sim-Auth", auth);
    if (contentType) headers.set("Content-Type", contentType);

    // We mock the request by invoking app.request directly
    const req = new Request(`http://localhost${path}`, {
      method,
      headers,
      body
    });
    return await app.fetch(req);
  };

  // Public Endpoints
  await t.step("GET / (Public)", async () => {
    const res = await fetchWithAuth("/");
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "Sim Site API");
  });

  await t.step("OPTIONS / (CORS Preflight)", async () => {
    const res = await fetchWithAuth("/", undefined, "OPTIONS");
    assertEquals(res.status, 204);
    // Explicitly check for X-Sim-Auth in allowed headers
    const allowedHeaders = res.headers.get("Access-Control-Allow-Headers");
    assertEquals(allowedHeaders?.includes("X-Sim-Auth"), true, `X-Sim-Auth missing from allowed headers: ${allowedHeaders}`);
  });

  await t.step("POST /auth/validate (Public)", async () => {
    const res = await fetchWithAuth("/auth/validate", undefined, "POST", JSON.stringify({ password: "test-site-pw" }), "application/json");
    assertEquals(res.status, 200);
    const data = await res.json();
    assertEquals(data.valid, true);
  });

  // Restricted Access
  await t.step("POST /generate with ACCESS_PASSWORD -> Allowed", async () => {
    // Generate expects a body, even empty, to check fields.
    const res = await fetchWithAuth("/generate", "test-site-pw", "POST", JSON.stringify({ design: { variables: [] }, n: 10 }), "application/json");
    // It might be 500 or 400 if design invalid, but NOT 401
    assertNotEquals(res.status, 401, `Expected status != 401, got ${res.status}`);
  });

  await t.step("POST /generate with WRONG password -> 401", async () => {
    const res = await fetchWithAuth("/generate", "wrong-pw", "POST", JSON.stringify({}), "application/json");
    assertEquals(res.status, 401);
  });

  await t.step("POST /generate with NO password -> 401", async () => {
    const res = await fetchWithAuth("/generate", undefined, "POST", JSON.stringify({}), "application/json");
    assertEquals(res.status, 401);
  });

  // Strict Access (Logs Password Only)
  await t.step("GET /logs with ADMIN_PASSWORD -> Allowed", async () => {
    const res = await fetchWithAuth("/logs", "test-logs-pw");
    // 200 or 404 (if no logs) but NOT 401
    assertNotEquals(res.status, 401, `Expected status != 401, got ${res.status}`);
  });

  await t.step("GET /logs with ACCESS_PASSWORD -> 401 (Strict)", async () => {
    const res = await fetchWithAuth("/logs", "test-site-pw");
    assertEquals(res.status, 401);
    const data = await res.json();
    assertEquals(data.error, "Unauthorized: Admin access required");
  });

  // Regression Tests for 500 Errors
  await t.step("POST /auth/validate with Empty Body -> 400", async () => {
    const res = await fetchWithAuth("/auth/validate", undefined, "POST", "", "application/json");
    assertEquals(res.status, 400);
    const data = await res.json();
    assertEquals(data.error, "Invalid JSON body");
  });

  await t.step("POST /auth/validate with Malformed JSON -> 400", async () => {
    const res = await fetchWithAuth("/auth/validate", undefined, "POST", "{ password: foo }", "application/json");
    assertEquals(res.status, 400);
  });

  await t.step("POST /auth/validate with 'null' body -> 400", async () => {
    const res = await fetchWithAuth("/auth/validate", undefined, "POST", "null", "application/json");
    assertEquals(res.status, 400);
  });

  // Test for Logger Crash (Non-array design)
  await t.step("POST /generate with non-array design -> 400", async () => {
    const res = await fetchWithAuth("/generate", "test-site-pw", "POST", JSON.stringify({ design: "not-an-array" }), "application/json");
    console.log("Status:", res.status);
    assertEquals(res.status, 400);
  });

  // Cleanup
  if (originalPw) configService.setAccessPassword(originalPw);
  else configService.setAccessPassword(""); // or undefined if type allowed, but setter takes string.

  if (originalAdmin) Deno.env.set("ADMIN_PASSWORD", originalAdmin);
  else Deno.env.delete("ADMIN_PASSWORD");
});
