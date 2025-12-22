import { type } from 'arktype';

// Range: -1e9 to 1e9
export const SafeNumber = type("-1000000000 <= number <= 1000000000");
// Range: >0 to 1e9
export const PositiveNumber = type("0 < number <= 1000000000");
// Range: 2 to 5000
export const CategoryCount = type("2 <= number <= 5000");

// Format: No whitespace, cannot start with number, max 70 chars
export const VariableName = type("/^[^0-9\\s]\\S*$/").and("string <= 70");

// Categories: Array of strings, at least 2
export const CategoryList = type("string[] >= 2");

// Constants
export const VAR_CONTINUOUS = 'continuous';
export const VAR_NOMINAL = 'nominal';
export const VAR_ORDINAL = 'ordinal';

export const DIST_NORMAL = 'normal';
export const DIST_UNIFORM = 'uniform';

// ArkType helper removed

const NormalDistribution = type({
  type: `'${DIST_NORMAL}'`,
  mean: "number",
  stdDev: PositiveNumber
});

const UniformDistribution = type({
  type: `'${DIST_UNIFORM}'`,
  min: "number",
  max: "number"
});

const CategoricalUniform = type({
  type: `'${DIST_UNIFORM}'`
});

export const ValidDistributions = {
  [VAR_CONTINUOUS]: [DIST_NORMAL, DIST_UNIFORM],
  [VAR_ORDINAL]: [DIST_NORMAL, DIST_UNIFORM],
  [VAR_NOMINAL]: [DIST_UNIFORM]
} as const;

export type VariableType = keyof typeof ValidDistributions;
export type ValidDistributionFor<T extends VariableType> = typeof ValidDistributions[T][number];

export const DefaultDistributions: {
  [K in VariableType]: ValidDistributionFor<K>
} = {
  [VAR_CONTINUOUS]: DIST_NORMAL,
  [VAR_ORDINAL]: DIST_NORMAL,
  [VAR_NOMINAL]: DIST_UNIFORM
};

export const VariableSchema = type({
  kind: "'variable'",
  name: VariableName,
  dataType: `'${VAR_CONTINUOUS}'`,
  distribution: NormalDistribution.or(UniformDistribution)
}).or({
  kind: "'variable'",
  name: VariableName,
  dataType: `'${VAR_ORDINAL}'`,
  categories: CategoryList,
  distribution: NormalDistribution.or(CategoricalUniform)
}).or({
  kind: "'variable'",
  name: VariableName,
  dataType: `'${VAR_NOMINAL}'`,
  categories: CategoryList,
  distribution: CategoricalUniform
});

export const InstrumentItem = type({
  id: "string", // Unique ID for keying
  name: "string" // e.g. "Q1"
})

export type InstrumentItem = typeof InstrumentItem.infer

export const ScaleItem = type({
  itemId: "string",
  reverse: "boolean"
})

export type ScaleItem = typeof ScaleItem.infer

export const ScaleSchema = type({
  id: "string",
  name: "string",
  items: ScaleItem.array()
})

export type Scale = typeof ScaleSchema.infer

export const InstrumentSchema = type({
  kind: "'instrument'",
  name: "string", // Instrument name e.g. "Anxiety Scale"
  dataType: `\'${VAR_ORDINAL}\'`, // Instruments are typically ordinal/nominal
  categories: CategoryList,
  distribution: NormalDistribution.or(CategoricalUniform),
  items: InstrumentItem.array(),
  "scales?": ScaleSchema.array()
}).or({
  kind: "'instrument'",
  name: "string",
  dataType: `\'${VAR_NOMINAL}\'`,
  categories: CategoryList,
  distribution: CategoricalUniform,
  items: InstrumentItem.array(),
  "scales?": ScaleSchema.array()
})

export type Instrument = typeof InstrumentSchema.infer

// Variable or Instrument
export const StudyNodeSchema = VariableSchema.or(InstrumentSchema)
export type StudyNode = typeof StudyNodeSchema.infer

// Effects
export const EFFECT_CORRELATION = 'correlation';

export const EffectSchema = type({
  id: "string", // Unique ID
  source: "string", // Variable name
  target: "string", // Variable name
  type: `'${EFFECT_CORRELATION}'`,
  coefficient: type("-1 <= number <= 1")
});

export type Effect = typeof EffectSchema.infer;

export const StudyDesignSchema = type({
  studyType: "'cross-sectional' | 'cohort' | 'case-control'",
  "variables?": StudyNodeSchema.array(),
  "effects?": EffectSchema.array()
});

export type StudyDesign = typeof StudyDesignSchema.infer;
export type Variable = typeof VariableSchema.infer;

export type StudyEffect = Effect; // Alias for consistency
export * from './r_generator.ts';
export * from './validator.ts';
export * from './graph_utils.ts';

export const MAX_GENERATION_N = 10000;
export const PREVIEW_LIMIT = 10;
