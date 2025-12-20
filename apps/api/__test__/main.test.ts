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
