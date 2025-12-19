
export async function runRTest() {
  console.log("🦕 Deno: Attempting to spawn R process...");

  const rCode = `
    result <- list(
      status = "success",
      message = "Hello from R!",
      calculation = mean(c(10, 20, 60))
    )
    cat(jsonlite::toJSON(result, auto_unbox = TRUE))
  `;

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

  if (code === 0) {
    console.log("✅ R execution successful!");
    console.log("Output from R:", output);
  } else {
    console.error("❌ R execution failed.");
    console.error("Error code:", code);
    console.error("Stderr:", errorOutput);
  }
}

// Run if main
if (import.meta.main) {
  await runRTest();
}
