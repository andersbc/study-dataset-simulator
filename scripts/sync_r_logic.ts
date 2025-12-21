
const rPath = new URL("../packages/shared/r_logic.R", import.meta.url);
const tsPath = new URL("../packages/shared/r_logic.gen.ts", import.meta.url);

try {
  const rCode = await Deno.readTextFile(rPath);

  // Create Typescript content with the R code as a template string
  // We need to escape backticks if any exist in the R code
  const escapedRCode = rCode.replace(/`/g, '\\`');

  const tsContent = `// This file is auto-generated. Do not edit directly.
// Edit r_logic.R instead and run 'deno task sync:r'

export const R_GENERATOR_LOGIC = \`
${escapedRCode}
\`;
`;

  await Deno.writeTextFile(tsPath, tsContent);
  console.log("Successfully generated r_logic.gen.ts from r_logic.R");

} catch (error) {
  console.error("Error syncing R logic:", error);
  Deno.exit(1);
}
