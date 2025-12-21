
import { parse } from "@std/csv";

export async function generateDummyData() {
  console.log("🦕 Deno: Generating dummy data via R with simstudy...");

  const rCode = `
    # Ensure local library path is included (in case sudo install failed)
    .libPaths(c("~/R/library", .libPaths()))
    
    if (!require("simstudy", quietly = TRUE)) {
      message("Current .libPaths(): ", paste(.libPaths(), collapse=", "))
      stop("Package 'simstudy' not found. It might still be installing in the background.")
    }
    
    set.seed(1234)
    
    # 1. Define data definition
    dir <- tempdir() # Set temp dir
    
    # simstudy automatically adds an 'id' column, so we start with age
    def <- defData(varname = "age", formula = 30, variance = 5, dist = "normal")
    def <- defData(def, varname = "group", formula = "0.5;0.5", dist = "categorical")
    def <- defData(def, varname = "score", formula = "10 + 2*group + 0.1*age", variance = 3, dist = "normal")
    
    # 2. Generate data
    dd <- genData(10, def)
    
    # 3. Output as CSV (no quotes to simplify parsing if valid numbers/strings)
    write.csv(dd, stdout(), row.names=FALSE, quote=FALSE)
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
    const msg = `R execution failed: ${errorOutput}`;
    console.error(msg);
    // Return mock data temporarily if R is broken (e.g. still installing) to not crash UI demo
    // But user asked to use the package. Throwing is better so they see if it works.
    throw new Error(msg);
  }

  try {
    // Parse CSV output.
    // R write.csv includes a header row. "id,age,group,score"
    // We use explicit columns to map them safely, skipping the header.
    const result = parse(output, {
      skipFirstRow: true,
      columns: ["id", "age", "group", "score"]
    });
    return result;
  } catch (e) {
    console.error("Failed to parse R output:", output, e);
    throw new Error("Invalid format returned from R process");
  }
}
