import { describe, expect, it } from "vitest";

import { getDominantVisibleMonthDate } from "../src/lib/archive-calendar-month";

describe("archive calendar month viewport", () => {
  it("chooses the month with the most visible day cells instead of the top row month", () => {
    const rows = [
      makeWeekRow(2026, 0, 26),
      makeWeekRow(2026, 1, 2),
      makeWeekRow(2026, 1, 9),
      makeWeekRow(2026, 1, 16),
      makeWeekRow(2026, 1, 23),
      makeWeekRow(2026, 2, 2),
    ];

    const dominantMonth = getDominantVisibleMonthDate({
      rowHeight: 100,
      scrollOffset: 0,
      visibleRows: rows,
    });

    expect(dominantMonth).toEqual(new Date(2026, 1, 1));
  });

  it("includes the partially revealed next row when deciding the dominant month", () => {
    const rows = [
      makeWeekRow(2026, 4, 11),
      makeWeekRow(2026, 4, 18),
      makeWeekRow(2026, 4, 25),
      makeWeekRow(2026, 5, 1),
      makeWeekRow(2026, 5, 8),
      makeWeekRow(2026, 5, 15),
      makeWeekRow(2026, 5, 22),
    ];

    const dominantMonth = getDominantVisibleMonthDate({
      rowHeight: 100,
      scrollOffset: -60,
      visibleRows: rows,
    });

    expect(dominantMonth).toEqual(new Date(2026, 5, 1));
  });
});

function makeWeekRow(year: number, month: number, day: number): Date[] {
  return Array.from({ length: 7 }, (_, index) => new Date(year, month, day + index));
}
