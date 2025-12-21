import { assertStringIncludes } from "@std/assert";
import { generateRScript } from "@sim-site/shared";
import { VAR_CONTINUOUS, DIST_NORMAL } from "@sim-site/shared";

Deno.test("generateRScript structure check", () => {
  const design = {
    studyType: "cross-sectional",
    variables: [
      {
        kind: "variable",
        name: "VarA",
        dataType: VAR_CONTINUOUS,
        distribution: { type: DIST_NORMAL, mean: 10, stdDev: 1 }
      },
      {
        kind: "variable",
        name: "VarB",
        dataType: "nominal",
        categories: ["Male", "Female"],
        distribution: { type: "uniform" }
      }
    ]
  };

  const script = generateRScript(design as any);

  // Check for Configuration List
  assertStringIncludes(script, 'study_design <- list(');
  assertStringIncludes(script, 'name = "VarA"');
  assertStringIncludes(script, 'type = "normal"');
  assertStringIncludes(script, 'mean = 10');

  // Check for Categorical Config
  assertStringIncludes(script, 'name = "VarB"');
  assertStringIncludes(script, 'order = 2');
  assertStringIncludes(script, 'type = "categorical"');
  assertStringIncludes(script, 'labels = c("Male", "Female")');

  // Check for Generator Function Logic
  assertStringIncludes(script, 'generate_study <- function(n, design)');
  assertStringIncludes(script, 'dd <- generate_study(n_obs, study_design)');
  // Ensure we don't pass column_order anymore
  if (script.includes('generate_study(n_obs, study_design, column_order)')) {
    throw new Error("Script should not pass column_order to generate_study");
  }
});

Deno.test("generateRScript handles dependencies in config", () => {
  const design = {
    studyType: "mixed",
    variables: [
      { kind: "variable", name: "A", distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 } },
      { kind: "variable", name: "B", distribution: { type: DIST_NORMAL } }
    ],
    effects: [
      { type: "correlation", source: "A", target: "B", coefficient: 0.5 }
    ]
  };

  const script = generateRScript(design as any);

  // Check for Parents list in B
  assertStringIncludes(script, 'name = "B"');
  assertStringIncludes(script, 'parents = list(');
  assertStringIncludes(script, 'source = "A"');
  assertStringIncludes(script, 'coef = 0.5');
  assertStringIncludes(script, 'type = "correlation"');
});
