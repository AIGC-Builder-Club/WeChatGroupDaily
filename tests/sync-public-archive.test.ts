import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = path.join(process.cwd(), "scripts", "sync-public-archive.mjs");

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("public archive sync script", () => {
  it("copies both source HTML and PNG files into public/archive", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "archive-sync-"));
    tempRoots.push(root);
    const sourceRoot = path.join(root, "🦞奇奇怪怪养龙虾");
    const htmlDir = path.join(sourceRoot, "html");
    const pngDir = path.join(sourceRoot, "png");
    mkdirSync(htmlDir, { recursive: true });
    mkdirSync(pngDir, { recursive: true });
    mkdirSync(path.join(root, "public", "archive", "html"), { recursive: true });
    mkdirSync(path.join(root, "public", "archive", "png"), { recursive: true });
    writeFileSync(path.join(htmlDir, "日报.html"), "<html>raw</html>");
    writeFileSync(path.join(pngDir, "日报.png"), "png");
    writeFileSync(path.join(root, "public", "archive", "html", "old.html"), "old");
    writeFileSync(path.join(root, "public", "archive", "png", "old.png"), "old");

    execFileSync(process.execPath, [scriptPath], { cwd: root, stdio: "pipe" });

    expect(readFileSync(path.join(root, "public", "archive", "html", "日报.html"), "utf8")).toBe(
      "<html>raw</html>",
    );
    expect(readFileSync(path.join(root, "public", "archive", "png", "日报.png"), "utf8")).toBe(
      "png",
    );
    expect(existsSync(path.join(root, "public", "archive", "html", "old.html"))).toBe(false);
    expect(existsSync(path.join(root, "public", "archive", "png", "old.png"))).toBe(false);
  });
});
