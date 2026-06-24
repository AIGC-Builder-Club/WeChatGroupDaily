import { describe, expect, it } from "vitest";

import {
  formatArchiveEventTime,
  getRawHtmlHref,
  toArchiveCalendarEvents,
  type ArchiveEventTimeSource,
} from "../src/lib/archive-calendar-events";
import { parseReportFile } from "../src/lib/archive";

const latestFilename = "🦞奇奇怪怪养龙虾群2026-06-24.html";
const rangedFilename = "🦞奇奇怪怪养龙虾群2026-05-07 → 2026-05-13.html";

describe("archive calendar event adapter", () => {
  it("maps timed stories with source metadata and raw HTML hrefs", () => {
    const [event] = toArchiveCalendarEvents([parseReportFile(latestFilename)]);

    expect(event).toEqual(
      expect.objectContaining({
        id: "story-2026-06-24-01",
        title: expect.stringContaining("Falcon"),
        isAllDay: false,
        calendarId: "wechat-daily",
        description: expect.stringContaining("美团突然把 GPT-5.5"),
      }),
    );
    expect(event?.start.getFullYear()).toBe(2026);
    expect(event?.start.getMonth()).toBe(5);
    expect(event?.start.getDate()).toBe(23);
    expect(event?.start.getHours()).toBe(14);
    expect(event?.start.getMinutes()).toBe(9);
    expect(event?.end.getHours()).toBe(14);
    expect(event?.end.getMinutes()).toBe(54);
    expect(event?.meta).toEqual(
      expect.objectContaining({
        story: expect.objectContaining({ anchorId: "story-2026-06-24-01" }),
        participants: expect.arrayContaining([
          expect.objectContaining({ name: "Falcon" }),
        ]),
        quotes: expect.arrayContaining([
          expect.objectContaining({ attr: "Falcon" }),
        ]),
        output: "AI 浏览器口碑榜：Tabbit > 美团 > Atlas（已陨落）",
        topic: "浏览器评鉴官",
        rawHtmlHref: getRawHtmlHref(latestFilename),
        sourceReportSlug: "2026-06-24",
        sourceFilename: latestFilename,
      }),
    );
  });

  it("formats event times as compact ranges like the calendar reference", () => {
    expect(
      formatArchiveEventTime(
        makeEventTimeSource(new Date(2026, 5, 23, 14, 9), new Date(2026, 5, 23, 14, 54)),
      ),
    ).toBe("14:09–14:54");
    expect(
      formatArchiveEventTime(
        makeEventTimeSource(new Date(2026, 5, 23, 9), new Date(2026, 5, 23, 10)),
      ),
    ).toBe("9–10");
    expect(
      formatArchiveEventTime(
        makeEventTimeSource(new Date(2026, 4, 7), new Date(2026, 4, 8), true, "05-07 上午"),
      ),
    ).toBe("05-07 上午");
  });

  it("maps date-only stories as all-day events", () => {
    const [event] = toArchiveCalendarEvents([parseReportFile(rangedFilename)]);

    expect(event).toEqual(
      expect.objectContaining({
        id: "story-2026-05-07-to-2026-05-13-01",
        isAllDay: true,
      }),
    );
    expect(event?.start.getFullYear()).toBe(2026);
    expect(event?.start.getMonth()).toBe(4);
    expect(event?.start.getDate()).toBe(7);
    expect(event?.start.getHours()).toBe(0);
    expect(event?.end.getDate()).toBe(8);
    expect(event?.meta.rawHtmlHref).toBe(getRawHtmlHref(rangedFilename));
  });

  it("encodes raw HTML archive links under the public archive route", () => {
    expect(getRawHtmlHref(latestFilename)).toBe(
      `/archive/html/${encodeURIComponent(latestFilename)}`,
    );
  });
});

function makeEventTimeSource(
  start: Date,
  end: Date,
  isAllDay = false,
  time?: string,
): ArchiveEventTimeSource {
  return {
    start,
    end,
    isAllDay,
    meta: {
      story: {
        time,
      },
    },
  };
}
