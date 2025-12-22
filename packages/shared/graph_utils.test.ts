import { assertEquals } from "jsr:@std/assert";
import { getAvailableSources, getAvailableTargets } from "./graph_utils.ts";
import type { StudyEffect } from "./mod.ts";

const createEffect = (source: string, target: string): StudyEffect => ({
  id: "eff_" + source + "_" + target,
  type: "correlation",
  source,
  target,
  coefficient: 0.5
});

Deno.test("getAvailableSources - Basic Filtering", () => {
  const nodes = ["A", "B", "C"];
  const effects: StudyEffect[] = [];

  // No effects: A can be source for B
  const sourcesForB = getAvailableSources("B", nodes, effects);
  assertEquals(sourcesForB.sort(), ["A", "C"]); // Can't be B itself
});

Deno.test("getAvailableSources - Direct Cycle Prevention", () => {
  const nodes = ["A", "B"];
  // Existing: A -> B
  const effects: StudyEffect[] = [createEffect("A", "B")];

  // Attempt to find sources for A
  // Candidate B: Proposing B -> A.
  // Check path A -> B? Yes. So B is invalid.
  const sourcesForA = getAvailableSources("A", nodes, effects);

  // B should be filtered out because A->B exists.
  assertEquals(sourcesForA, []);
});

Deno.test("getAvailableSources - Indirect Cycle Prevention", () => {
  const nodes = ["A", "B", "C"];
  // Existing: A -> B -> C
  const effects: StudyEffect[] = [
    createEffect("A", "B"),
    createEffect("B", "C")
  ];

  // We want to add a source for A.
  // Candidate C: Proposing C -> A.
  // Check path A -> C? Yes (A->B->C). So C is invalid.

  const sourcesForA = getAvailableSources("A", nodes, effects);
  assertEquals(sourcesForA.includes("C"), false);
  assertEquals(sourcesForA.includes("B"), false);

  // Valid source: none in this closed set
});

Deno.test("getAvailableSources - Complex Check", () => {
  const nodes = ["A", "B", "C", "D"];
  // A -> B
  // C -> D
  const effects: StudyEffect[] = [
    createEffect("A", "B"),
    createEffect("C", "D")
  ];

  // Sources for C?
  // Candidates: A, B, D.
  // D is invalid (C->D exists).
  // A is valid (C->A path? No).
  // B is valid (C->B path? No).

  const sourcesForC = getAvailableSources("C", nodes, effects);
  assertEquals(sourcesForC.sort(), ["A", "B"]);
});


Deno.test("getAvailableTargets - Basic Filtering", () => {
  const nodes = ["A", "B", "C"];
  const effects: StudyEffect[] = [];

  // No effects: Any can be target for A
  const targetsForA = getAvailableTargets("A", nodes, effects);
  assertEquals(targetsForA.sort(), ["B", "C"]); // Can't be A itself
});

Deno.test("getAvailableTargets - Direct Cycle Prevention", () => {
  const nodes = ["A", "B"];
  // Existing: A -> B
  const effects: StudyEffect[] = [createEffect("A", "B")];

  // Attempt to find targets for B
  // Candidate A: Proposing B -> A.
  // Check path A -> B? Yes (existing). So A is invalid target.
  const targetsForB = getAvailableTargets("B", nodes, effects);

  assertEquals(targetsForB, []);
});

Deno.test("getAvailableTargets - Indirect Cycle Prevention", () => {
  const nodes = ["A", "B", "C"];
  // Existing: A -> B -> C
  const effects: StudyEffect[] = [
    createEffect("A", "B"),
    createEffect("B", "C")
  ];

  // We want to add a target for C.
  // Candidate A: Proposing C -> A.
  // Check path A -> C? Yes (A->B->C). So A is invalid.

  const targetsForC = getAvailableTargets("C", nodes, effects);
  assertEquals(targetsForC.includes("A"), false);
  assertEquals(targetsForC.includes("B"), false);
});
