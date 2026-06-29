import { describe, expect, it } from "vitest";

import { parseReportFile } from "../src/lib/archive";
import { getReportOverviewsForDay } from "../src/lib/archive-report-overviews";

const rangedWeekendFilename = "🦞奇奇怪怪养龙虾群2026-06-27 → 2026-06-29.html";
const june27Filename = "🦞奇奇怪怪养龙虾群2026-06-27.html";
const june29Filename = "🦞奇奇怪怪养龙虾群2026-06-29.html";

describe("archive report overview lookup", () => {
  it("uses the exact single-day report instead of duplicating ranged and single-day overviews", () => {
    const reports = [
      parseReportFile(rangedWeekendFilename),
      parseReportFile(june27Filename),
      parseReportFile(june29Filename),
    ];
    const overviewsByDay = getReportOverviewsForDay(reports);

    expect(overviewsByDay.get("2026-06-27")?.map((overview) => overview.slug)).toEqual([
      "2026-06-27",
    ]);
    expect(overviewsByDay.get("2026-06-29")?.map((overview) => overview.slug)).toEqual([
      "2026-06-29",
    ]);
    expect(overviewsByDay.get("2026-06-28")?.map((overview) => overview.slug)).toEqual([
      "2026-06-27-to-2026-06-29",
    ]);
  });
});
