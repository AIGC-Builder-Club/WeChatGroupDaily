import { buildArchiveDiagnostics } from "../src/lib/archive.ts";

const diagnostics = buildArchiveDiagnostics();

console.log(`HTML reports: ${diagnostics.totalHtml}`);
console.log(`PNG files: ${diagnostics.totalPng}`);
console.log(`Static routes: ${diagnostics.reportSlugs.length}`);

if (diagnostics.missingScreenshotSlugs.length > 0) {
  console.warn(
    `Missing PNG screenshots: ${diagnostics.missingScreenshotSlugs.join(", ")}`,
  );
}

if (diagnostics.extraScreenshotFiles.length > 0) {
  console.warn(`Extra PNG files: ${diagnostics.extraScreenshotFiles.join(", ")}`);
}

if (diagnostics.errors.length > 0) {
  console.error("Archive validation failed:");
  for (const error of diagnostics.errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
}
