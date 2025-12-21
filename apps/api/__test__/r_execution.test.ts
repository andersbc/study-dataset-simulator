import { assertEquals } from "@std/assert";
import { generateRScript } from "@sim-site/shared";
import { DIST_NORMAL } from "@sim-site/shared";

Deno.test("R Script Execution: Simple Study", async () => {
  const design = {
    studyType: "cross-sectional",
    variables: [
      {
        kind: "variable",
        name: "A",
        dataType: "continuous",
        distribution: { type: DIST_NORMAL, mean: 10, stdDev: 1 }
      },
      {
        kind: "variable",
        name: "B",
        dataType: "categorical",
        categories: ["Yes", "No"],
        distribution: { type: "uniform" }
      }
    ]
  };

  const script = generateRScript(design as any, 100);

  // Write to temp file
  const tempFile = await Deno.makeTempFile({ suffix: ".R" });
  await Deno.writeTextFile(tempFile, script);

  // Run Rscript
  const command = new Deno.Command("Rscript", {
    args: [tempFile],
    stdout: "piped",
    stderr: "piped",
  });

  const { code, stdout, stderr } = await command.output();
  const output = new TextDecoder().decode(stdout);
  const error = new TextDecoder().decode(stderr);

  // Cleanup
  await Deno.remove(tempFile);

  if (code !== 0) {
    console.error("R Execution Failed:\n", error);
  }

  assertEquals(code, 0);

  // Verify CSV Output
  const lines = output.trim().split('\n');
  const header = lines[0];
  assertEquals(header, 'id,A,B');
  assertEquals(lines.length, 101); // Header + 100 rows
});
