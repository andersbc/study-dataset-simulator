import type { StudyEffect } from './mod.ts';

/**
 * Returns a list of variable names that can serve as a valid source for the given target,
 * ensuring no cycles are created in the dependency graph.
 * 
 * @param targetName - The name of the variable we are selecting a source for
 * @param allNodeNames - All available variable/item names in the study
 * @param existingEffects - The current list of defined relationships
 * @returns Array of valid source variable names
 */
export function getAvailableSources(
  targetName: string,
  allNodeNames: string[],
  existingEffects: StudyEffect[]
): string[] {
  // If no target is selected, no constraints yet (though usually we pick target first)
  if (!targetName) return allNodeNames;

  // 1. Build Adjacency List representing the graph: Source -> [Targets]
  // We want to detect if adding "Candidate -> Target" creates a cycle.
  // A cycle is created if there is ALREADY a path from Target -> Candidate.
  // If such a path exists, adding Candidate -> Target completes the loop (Target -> ... -> Candidate -> Target).

  const adj = new Map<string, string[]>();

  for (const eff of existingEffects) {
    if (!adj.has(eff.source)) adj.set(eff.source, []);
    adj.get(eff.source)?.push(eff.target);
  }

  // 2. Helper to check if a path exists from Node A to Node B
  const pathExists = (start: string, end: string): boolean => {
    if (start === end) return true; // Should not happen in DAG check usually but good safety

    const queue = [start];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adj.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
    return false;
  };

  // 3. Filter Variables
  return allNodeNames
    .filter(candidateName => {
      // Rule 1: Self-reference is not allowed
      if (candidateName === targetName) return false;

      // Rule 2: Cycle Prevention
      // We are proposing an edge: Candidate -> Target
      // This is invalid if a path ALREADY exists: Target -> ... -> Candidate
      if (pathExists(targetName, candidateName)) return false;

      return true;
    });
}

/**
 * Returns a list of variable names that can serve as a valid target for the given source,
 * ensuring no cycles are created in the dependency graph.
 * 
 * @param sourceName - The name of the variable we are selecting a target for
 * @param allNodeNames - All available variable/item names in the study
 * @param existingEffects - The current list of defined relationships
 * @returns Array of valid target variable names
 */
export function getAvailableTargets(
  sourceName: string,
  allNodeNames: string[],
  existingEffects: StudyEffect[]
): string[] {
  // If no source is selected, everything is theoretically valid (but UI should lock usually)
  if (!sourceName) return allNodeNames;

  // 1. Build Adjacency List representing the existing graph for Cycle Detection
  const adj = new Map<string, string[]>();

  for (const eff of existingEffects) {
    if (!adj.has(eff.source)) adj.set(eff.source, []);
    adj.get(eff.source)?.push(eff.target);
  }

  // 2. Helper to check if a path exists from Node A to Node B
  const pathExists = (start: string, end: string): boolean => {
    if (start === end) return true;

    const queue = [start];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === end) return true;

      if (!visited.has(current)) {
        visited.add(current);
        const neighbors = adj.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }
    }
    return false;
  };

  // 3. Filter Variables
  return allNodeNames
    .filter(candidateName => {
      // Rule 1: Self-reference is not allowed
      if (candidateName === sourceName) return false;

      // Rule 2: Cycle Prevention
      // We are proposing an edge: Source -> Candidate
      // This is invalid if a path ALREADY exists: Candidate -> ... -> Source
      if (pathExists(candidateName, sourceName)) return false;

      return true;
    });
}

/**
 * Identifies nodes that have "conflicting" inputs from the same ancestor.
 * A conflict is defined as having at least one path with a positive total effect 
 * AND at least one path with a negative total effect from the same ancestor.
 * 
 * @param allNodeNames - List of all nodes
 * @param existingEffects - List of effects
 * @returns Array of node IDs that have conflicts
 */
export function getConflictingNodes(
  allNodeNames: string[],
  existingEffects: StudyEffect[]
): string[] {
  const conflictingNodes: string[] = [];

  // 1. Build Adjacency List with Edge Weights (Signs)
  const adj = new Map<string, { target: string, sign: number }[]>();

  for (const eff of existingEffects) {
    if (!adj.has(eff.source)) adj.set(eff.source, []);
    const sign = eff.coefficient >= 0 ? 1 : -1;
    adj.get(eff.source)?.push({ target: eff.target, sign });
  }

  // 2. For each node, find all paths from all ancestors
  for (const targetNode of allNodeNames) {
    const hasIncoming = existingEffects.some(e => e.target === targetNode);
    if (!hasIncoming) continue;

    for (const sourceNode of allNodeNames) {
      if (sourceNode === targetNode) continue;

      let hasPositivePath = false;
      let hasNegativePath = false;

      const stack: { current: string, currentSign: number }[] = [{ current: sourceNode, currentSign: 1 }];
      let pathCount = 0;

      while (stack.length > 0) {
        const { current, currentSign } = stack.pop()!;

        if (current === targetNode) {
          if (currentSign > 0) hasPositivePath = true;
          if (currentSign < 0) hasNegativePath = true;

          if (hasPositivePath && hasNegativePath) break;
          continue;
        }

        pathCount++;
        if (pathCount > 1000) break;

        const neighbors = adj.get(current) || [];
        for (const edge of neighbors) {
          stack.push({
            current: edge.target,
            currentSign: currentSign * edge.sign
          });
        }
      }

      if (hasPositivePath && hasNegativePath) {
        conflictingNodes.push(targetNode);
        break;
      }
    }
  }

  return conflictingNodes;
}
