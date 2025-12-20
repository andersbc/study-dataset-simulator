
export async function generateDummyData() {
  console.log("🦕 Deno: Generating dummy data via R...");

  // Generate some simple JSON in R without needing external libraries if possible,
  // or just use sprintf to make "fake" json for now to ensure robustness without dep management yet.
  const rCode = `
    # Create valid JSON manually to avoid dependencies for the first iteration
    set.seed(123)
    n <- 5
    ids <- 1:n
    groups <- sample(c("A", "B"), n, replace=TRUE)
    values <- round(rnorm(n, 10, 2), 2)
    
    # Simple manual JSON construction
    json_str <- sprintf(
      '{"id": %d, "group": "%s", "value": %f}',
      ids, groups, values
    )
    
    cat(sprintf("[%s]", paste(json_str, collapse=",")))
  `;

  const command = new Deno.Command("Rscript", {
    args: ["-e", rCode],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const errorOutput = new TextDecoder().decode(stderr);

  if (code !== 0) {
    const msg = `R execution failed with code ${code}: ${errorOutput}`;
    console.error(msg);
    throw new Error(msg);
  }

  try {
    return JSON.parse(output);
  } catch (_e) {
    console.error("Failed to parse R output:", output);
    throw new Error("Invalid format returned from R process");
  }
}
