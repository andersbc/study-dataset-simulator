import { assertEquals } from "@std/assert";

Deno.test("R connection works", async () => {
  console.log("🦕 Deno: Attempting to spawn R process...");

  // Note: We might need to handle 'jsonlite' missing. 
  // For a raw test without dependencies, let's stick to base R first.
  const rCodeBase = `
    val <- mean(c(10, 20, 60))
    cat(sprintf("R says mean is: %f", val))
  `;

  const command = new Deno.Command("Rscript", {
    args: ["-e", rCodeBase],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  if (code !== 0) {
    console.error("❌ R execution failed.");
    console.error("Error code:", code);
    console.error("Stderr:", errorOutput);
  } else {
    console.log("✅ R execution successful!");
    console.log("Output from R:", output);
  }

  assertEquals(code, 0, "R process should exit with code 0");
  assertEquals(output.trim(), "R says mean is: 30.000000");
});
