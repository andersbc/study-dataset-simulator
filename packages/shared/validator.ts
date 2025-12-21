import { type } from 'arktype';
import { StudyDesignSchema, type StudyDesign } from './mod.ts';

export type ValidationError = {
  path: string;
  message: string;
}

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
}

export function validateStudyDesign(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  // 1. Basic Schema Validation
  const result = StudyDesignSchema(input);
  if (result instanceof type.errors) {
    return {
      valid: false,
      errors: [{ path: 'schema', message: result.summary }]
    };
  }

  const design = input as StudyDesign;
  const variableNames = new Set<string>();
  const nameToKind = new Map<string, string>();

  // 2. Variable Checks
  if (design.variables) {
    design.variables.forEach((v, index) => {
      // Check Name Uniqueness
      if (variableNames.has(v.name)) {
        errors.push({ path: `variables[${index}]`, message: `Duplicate variable name: ${v.name}` });
      }
      variableNames.add(v.name);
      nameToKind.set(v.name, v.kind);

      // Check Instrument Items uniqueness
      if (v.kind === 'instrument' && v.items) {
        v.items.forEach((item, iIndex) => {
          if (variableNames.has(item.name)) {
            errors.push({ path: `variables[${index}].items[${iIndex}]`, message: `Duplicate item name: ${item.name}` });
          }
          variableNames.add(item.name);
          nameToKind.set(item.name, 'item');
        });
      }
    });
  }

  // 3. Effect Checks
  if (design.effects) {
    // Build adjacency list for cycle detection
    const adj = new Map<string, string[]>();

    design.effects.forEach((eff, index) => {
      // Check Dangling References
      if (!variableNames.has(eff.source)) {
        errors.push({ path: `effects[${index}]`, message: `Source variable not found: ${eff.source}` });
      }
      if (!variableNames.has(eff.target)) {
        errors.push({ path: `effects[${index}]`, message: `Target variable not found: ${eff.target}` });
      }

      // Check Self Loop
      if (eff.source === eff.target) {
        errors.push({ path: `effects[${index}]`, message: `Self-reference not allowed: ${eff.source}` });
      }

      // Add to graph (if valid)
      if (variableNames.has(eff.source) && variableNames.has(eff.target)) {
        const neighbors = adj.get(eff.source) || [];
        neighbors.push(eff.target);
        adj.set(eff.source, neighbors);
      }
    });

    // 4. Cycle Detection (DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    let cycleFound = false;

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const neighbors = adj.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    // Check all nodes
    for (const node of variableNames) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          cycleFound = true;
          break;
        }
      }
    }

    if (cycleFound) {
      errors.push({ path: 'effects', message: 'Cycle detected in variable relationships' });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
