import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("vercel routing", () => {
  it("enables clean urls for archive html files on Vercel", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as {
      cleanUrls?: boolean;
    };

    expect(config.cleanUrls).toBe(true);
  });
});
