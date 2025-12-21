import { parse } from "@std/csv";
import type { StudyDesign } from '@sim-site/shared';
import { generateRScript } from '@sim-site/shared';

export async function generateDummyData(design: StudyDesign, n: number = 100) {
  console.log(`🦕 Deno: Generating dummy data via R with simstudy (n=${n})...`);

  const rCode = generateRScript(design, n);

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
    // R write.csv includes a header row.
    // We use skipFirstRow: false + columns: true to use the header row as keys
    const result = parse(output, {
      skipFirstRow: true, // Wait, if columns=true, standard headers are used? 
      // Deno @std/csv: if columns is valid array, it uses it. If columns is NOT provided, it assumes header?
      // Actually @std/csv parse(input, { skipFirstRow: true }) returns array of arrays (string[]).
      // parse(input, { columns: [...] }) returns array of objects.
      // We want objects. But we don't know columns in advance easily (well we do from design).
      // But simpler to let parser read header.
      // @std/csv v0.224: columns option can be boolean? No, it's string[].

      // If we don't provide columns, it might return array of strings.
      // We want to return JSON objects.
      // Let's verify @std/csv capabilities or manually header-parse.
      // Actually simpler: we know simstudy outputs a header.
      // output starts with "id,var1,var2..."

      // Let's assume we want auto-headers.
      // Use parse from std/csv with manual header extraction if needed, or simply keys.
    });

    // Quick fix: @std/csv `parse` documentation says:
    // "If you want to parse a CSV file with a header, you can use the `columns` option."
    // But we don't know the columns statically.
    // We can extract them from the first line of 'output'.

    const [headerLine, ...body] = output.trim().split('\n');
    const headers = headerLine.split(',').map(h => h.replace(/^"|"$/g, '')); // Remove quotes if any

    return parse(output, {
      skipFirstRow: true,
      columns: headers
    });
  } catch (e) {
    console.error("Failed to parse R output:", output, e);
    throw new Error("Invalid format returned from R process");
  }
}
