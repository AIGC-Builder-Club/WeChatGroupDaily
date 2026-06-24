import { describe, expect, it } from "vitest";

import type { ArchiveCalendarEvent } from "../src/lib/archive-calendar-events";
import { buildTimelineDayLayout } from "../src/lib/archive-timeline";

describe("archive timeline layout", () => {
  it("positions all-day stories across the full day timeline", () => {
    const day = new Date(2026, 5, 23);
    const timed = makeEvent("timed", new Date(2026, 5, 23, 14, 9), new Date(2026, 5, 23, 14, 54));
    const allDay = makeEvent("all-day", new Date(2026, 5, 23), new Date(2026, 5, 24), true);

    const layout = buildTimelineDayLayout([timed, allDay], day);

    expect(layout.timedEvents.map((item) => item.event.id)).toEqual(["all-day", "timed"]);
    expect(layout.timedEvents[0]).toEqual(
      expect.objectContaining({
        event: expect.objectContaining({ id: "all-day" }),
        startMinutes: 0,
        durationMinutes: 1440,
        column: 0,
        totalColumns: 2,
        left: 0,
        width: 50,
        segmentPosition: "full",
      }),
    );
    expect(layout.timedEvents[1]).toEqual(
      expect.objectContaining({
        event: expect.objectContaining({ id: "timed" }),
        startMinutes: 849,
        durationMinutes: 45,
        column: 1,
        totalColumns: 2,
        left: 50,
        width: 50,
        segmentPosition: "full",
      }),
    );
  });

  it("assigns overlapping timed stories to separate columns", () => {
    const day = new Date(2026, 5, 23);
    const first = makeEvent("first", new Date(2026, 5, 23, 9), new Date(2026, 5, 23, 10));
    const second = makeEvent("second", new Date(2026, 5, 23, 9, 30), new Date(2026, 5, 23, 10, 15));
    const later = makeEvent("later", new Date(2026, 5, 23, 11), new Date(2026, 5, 23, 11, 45));

    const layout = buildTimelineDayLayout([second, later, first], day);

    expect(layout.timedEvents.map((item) => item.event.id)).toEqual(["first", "second", "later"]);
    expect(layout.timedEvents[0]).toEqual(
      expect.objectContaining({ column: 0, totalColumns: 2, left: 0, width: 50 }),
    );
    expect(layout.timedEvents[1]).toEqual(
      expect.objectContaining({ column: 1, totalColumns: 2, left: 50, width: 50 }),
    );
    expect(layout.timedEvents[2]).toEqual(
      expect.objectContaining({ column: 0, totalColumns: 1, left: 0, width: 100 }),
    );
  });

  it("clips cross-day timed stories to the visible day", () => {
    const day = new Date(2026, 5, 23);
    const overnight = makeEvent(
      "overnight",
      new Date(2026, 5, 23, 23, 30),
      new Date(2026, 5, 24, 0, 15),
    );

    const layout = buildTimelineDayLayout([overnight], day);

    expect(layout.timedEvents[0]).toEqual(
      expect.objectContaining({
        startMinutes: 1410,
        durationMinutes: 30,
        segmentPosition: "start",
      }),
    );
  });
});

function makeEvent(
  id: string,
  start: Date,
  end: Date,
  isAllDay = false,
): ArchiveCalendarEvent {
  return {
    id,
    title: id,
    start,
    end,
    isAllDay,
    color: "blue",
    calendarId: "wechat-daily",
    description: `${id} description`,
    meta: {
      story: {
        no: "01",
        anchorId: id,
        sourceReportSlug: "2026-06-23",
        date: "2026-06-23",
        time: isAllDay ? "05-12 晚" : "14:09",
        title: id,
        topic: "测试",
        cast: ["Falcon"],
        participants: [
          {
            name: "Falcon",
            avatarInitials: "F",
          },
        ],
        summary: `${id} summary`,
        quotes: [],
      },
      participants: [
        {
          name: "Falcon",
          avatarInitials: "F",
        },
      ],
      quotes: [],
      topic: "测试",
      rawHtmlHref: "/archive/html/test.html",
      sourceReportSlug: "2026-06-23",
      sourceFilename: "test.html",
    },
  };
}
