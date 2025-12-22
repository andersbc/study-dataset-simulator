
import { assertEquals, assertThrows } from "jsr:@std/assert";
import { generateRScript } from "@sim-site/shared";
import type { StudyDesign } from "@sim-site/shared";

Deno.test("R Generator - Broken Effect Link (Missing Source)", () => {
  const design: StudyDesign = {
    studyType: "cross-sectional",
    variables: [
      {
        kind: "variable",
        name: "var_1", // Target
        dataType: "continuous",
        distribution: { type: "normal", mean: 0, stdDev: 1 }
      }
    ],
    effects: [
      {
        id: "eff1",
        source: "missing_var", // This variable does not exist
        target: "var_1",
        type: "correlation",
        coefficient: 0.5
      }
    ]
  };

  // This should ideally NOT throw, but rather ignore the broken link or handle it safely.
  // Or if it throws in R, we want to see what R script is generated.
  const script = generateRScript(design);
  console.log(script);

  // Verify if the script contains reference to missing_var
  // It SHOULD NOT contain it because we filter it out.
  if (script.includes('source = "missing_var"')) {
    throw new Error("Script contains reference to missing variable 'missing_var'");
  }
});

Deno.test("R Generator - Stale Effect Reference (Renamed Variable)", () => {
  // This simulates the case where a variable was renamed but effect still points to old name
  const design: StudyDesign = {
    studyType: "cross-sectional",
    variables: [
      {
        kind: "variable",
        name: "new_name",
        dataType: "continuous",
        distribution: { type: "normal", mean: 0, stdDev: 1 }
      },
      {
        kind: "variable",
        name: "dependent_var",
        dataType: "continuous",
        distribution: { type: "normal", mean: 0, stdDev: 1 }
      }
    ],
    effects: [
      {
        id: "eff1",
        source: "old_name", // Stale reference
        target: "dependent_var",
        type: "correlation",
        coefficient: 0.5
      }
    ]
  };

  const script = generateRScript(design);

  if (script.includes('source = "old_name"')) {
    throw new Error("Script contains reference to stale variable 'old_name'");
  }
});
