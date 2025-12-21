import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateRScript } from "@sim-site/shared";
import { VAR_CONTINUOUS, DIST_NORMAL } from "@sim-site/shared";

Deno.test("generateRScript generates distinct formulas for different variables", () => {
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
        dataType: VAR_CONTINUOUS,
        distribution: { type: DIST_NORMAL, mean: 20, stdDev: 5 }
      }
    ]
  };

  const script = generateRScript(design as any);

  // Debug output
  console.log(script);

  // Check for VarA definition
  assertStringIncludes(script, 'varname = "VarA"');
  assertStringIncludes(script, 'formula = "10"');

  // Check for VarB definition
  assertStringIncludes(script, 'varname = "VarB"');
  assertStringIncludes(script, 'formula = "20"');
  assertStringIncludes(script, 'variance = 25');
});

Deno.test("generateRScript applies Smart Intercept for dependencies", () => {
  const design = {
    studyType: "cross-sectional",
    variables: [
      {
        kind: "variable",
        name: "VarA",
        dataType: VAR_CONTINUOUS,
        distribution: { type: DIST_NORMAL, mean: 100, stdDev: 10 }
      },
      {
        kind: "variable",
        name: "VarB",
        dataType: VAR_CONTINUOUS,
        distribution: { type: DIST_NORMAL, mean: 0, stdDev: 1 }
      }
    ],
    effects: [
      { type: "correlation", source: "VarA", target: "VarB", coefficient: 0.5 }
    ]
  };

  const script = generateRScript(design as any);

  // VarA should have mean 100
  assertStringIncludes(script, 'varname = "VarA", formula = "100"');

  // VarB should have mean 0. 
  // Beta = 0.5 * (1 / 10) = 0.05
  // ParentShift = 0.05 * 100 = 5.
  // Intercept = 0 - 5 = -5.
  // Formula = "-5 + 0.05 * VarA"
  // Variance Adjustment: 
  // TotalVar = 1. Beta = 0.05. Var(A) = 100.
  // Explained = 0.05^2 * 100 = 0.25.
  // Residual = 0.75.
  assertStringIncludes(script, 'varname = "VarB", formula = "-5 + 0.05 * VarA"');
  assertStringIncludes(script, 'variance = 0.75');
});

Deno.test("generateRScript handles complex chains and multiple parents correctly", () => {
  const design = {
    studyType: "mixed",
    variables: [
      { kind: "variable", name: "A", dataType: VAR_CONTINUOUS, distribution: { type: DIST_NORMAL, mean: 10, stdDev: 1 } },
      { kind: "variable", name: "B", dataType: VAR_CONTINUOUS, distribution: { type: DIST_NORMAL, mean: 20, stdDev: 1 } },
      { kind: "variable", name: "C", dataType: VAR_CONTINUOUS, distribution: { type: DIST_NORMAL, mean: 30, stdDev: 1 } }
    ],
    effects: [
      { type: "correlation", source: "A", target: "B", coefficient: 0.5 },
      { type: "correlation", source: "A", target: "C", coefficient: 0.2 },
      { type: "correlation", source: "B", target: "C", coefficient: 0.3 }
    ]
  };

  const script = generateRScript(design as any);

  // A: Mean 10
  // formula = "10"
  assertStringIncludes(script, 'varname = "A", formula = "10"');

  // B: Target Mean 20. Source A (Mean 10). Corr 0.5. SDs=1.
  // Beta = 0.5 * (1/1) = 0.5
  // Shift = 0.5 * 10 = 5.
  // Intercept = 20 - 5 = 15.
  // Formula = "15 + 0.5 * A"
  // Variance: 1 - 0.5^2*1 = 0.75
  assertStringIncludes(script, 'varname = "B", formula = "15 + 0.5 * A", variance = 0.75');

  // C: Target Mean 30. 
  // Source A (Mean 10). Corr 0.2. Beta = 0.2. Shift = 2.
  // Source B (Mean 20). Corr 0.3. Beta = 0.3. Shift = 6.
  // Total Shift = 8.
  // Intercept = 30 - 8 = 22.
  // Formula = "22 + 0.2 * A + 0.3 * B"
  // Explained Variance (Assuming independence of parents A and B is imperfect but used approximation):
  // 0.2^2*1 + 0.3^2*1 = 0.04 + 0.09 = 0.13.
  // Residual = 1 - 0.13 = 0.87.
  assertStringIncludes(script, 'varname = "C"');
  assertStringIncludes(script, '22'); // Intercept
  assertStringIncludes(script, '0.2 * A');
  assertStringIncludes(script, '0.3 * B');
  assertStringIncludes(script, 'variance = 0.87');
});
