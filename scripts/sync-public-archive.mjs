import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "🦞奇奇怪怪养龙虾");
const targetRoot = path.join(root, "public", "archive");

const htmlCopied = syncArchiveType("html");
const pngCopied = syncArchiveType("png");

console.log(
  `Synced ${htmlCopied} HTML files and ${pngCopied} PNG files to public/archive`,
);

function syncArchiveType(extension) {
  const sourceDir = path.join(sourceRoot, extension);
  const targetDir = path.join(targetRoot, extension);
  rmSync(targetDir, { recursive: true, force: true });
  mkdirSync(targetDir, { recursive: true });

  let copied = 0;
  for (const filename of readdirSync(sourceDir)) {
    if (!filename.endsWith(`.${extension}`)) continue;

    copyFileSync(path.join(sourceDir, filename), path.join(targetDir, filename));
    copied += 1;
  }

  return copied;
}
