import { describe, expect, it } from "vitest";

import type { ArchiveCalendarEvent } from "../src/lib/archive-calendar-events";
import {
  getDefaultSelectedEventId,
  getResolvedSelectedEventId,
  getDefaultViewDate,
} from "../src/lib/archive-calendar-view";

describe("archive calendar view defaults", () => {
  const now = new Date(2026, 5, 26, 15, 30);

  it("anchors day view to today when leaving month view", () => {
    const nextDate = getDefaultViewDate("month", "day", now);

    expect(nextDate?.getFullYear()).toBe(2026);
    expect(nextDate?.getMonth()).toBe(5);
    expect(nextDate?.getDate()).toBe(26);
    expect(nextDate?.getHours()).toBe(0);
    expect(nextDate?.getMinutes()).toBe(0);
  });

  it("anchors week view to the current week when leaving month view", () => {
    const nextDate = getDefaultViewDate("month", "week", now);

    expect(nextDate?.getFullYear()).toBe(2026);
    expect(nextDate?.getMonth()).toBe(5);
    expect(nextDate?.getDate()).toBe(26);
    expect(nextDate?.getHours()).toBe(0);
    expect(nextDate?.getMinutes()).toBe(0);
  });

  it("does not override dates for non-month transitions", () => {
    expect(getDefaultViewDate("week", "day", now)).toBeNull();
    expect(getDefaultViewDate("day", "week", now)).toBeNull();
    expect(getDefaultViewDate("month", "month", now)).toBeNull();
  });

  it("defaults week view details to the first event from today", () => {
    const events = [
      makeEvent("monday-first", new Date(2026, 5, 22, 9, 0)),
      makeEvent("today-first", new Date(2026, 5, 26, 9, 56)),
      makeEvent("today-second", new Date(2026, 5, 26, 16, 44)),
    ];

    expect(
      getDefaultSelectedEventId({
        currentDate: new Date(2026, 5, 22),
        events,
        now,
        view: "week",
      }),
    ).toBe("today-first");
  });

  it("defaults day view details to the first event from today", () => {
    const events = [
      makeEvent("today-first", new Date(2026, 5, 26, 9, 56)),
      makeEvent("today-second", new Date(2026, 5, 26, 16, 44)),
    ];

    expect(
      getDefaultSelectedEventId({
        currentDate: new Date(2026, 5, 26),
        events,
        now,
        view: "day",
      }),
    ).toBe("today-first");
  });

  it("defaults month view details to the first event from today", () => {
    const events = [
      makeEvent("month-first", new Date(2026, 5, 1, 9, 0)),
      makeEvent("today-first", new Date(2026, 5, 26, 9, 56)),
      makeEvent("today-second", new Date(2026, 5, 26, 16, 44)),
    ];

    expect(
      getDefaultSelectedEventId({
        currentDate: new Date(2026, 5, 1),
        events,
        now,
        view: "month",
      }),
    ).toBe("today-first");
  });

  it("falls back to the first visible event outside the current week", () => {
    const events = [
      makeEvent("older-week-first", new Date(2026, 5, 8, 9, 0)),
      makeEvent("older-week-second", new Date(2026, 5, 10, 14, 0)),
    ];

    expect(
      getDefaultSelectedEventId({
        currentDate: new Date(2026, 5, 8),
        events,
        now,
        view: "week",
      }),
    ).toBe("older-week-first");
  });

  it("keeps the current selected event while it remains in the filtered result", () => {
    const events = [
      makeEvent("today-first", new Date(2026, 5, 26, 9, 56)),
      makeEvent("today-second", new Date(2026, 5, 26, 16, 44)),
    ];

    expect(
      getResolvedSelectedEventId({
        defaultSelectedEventId: "today-first",
        events,
        selectedEventId: "today-second",
      }),
    ).toBe("today-second");
  });

  it("falls back to the default selected event when the prior selection is no longer visible", () => {
    const events = [makeEvent("today-first", new Date(2026, 5, 26, 9, 56))];

    expect(
      getResolvedSelectedEventId({
        defaultSelectedEventId: "today-first",
        events,
        selectedEventId: "missing",
      }),
    ).toBe("today-first");
  });

  it("keeps an explicitly cleared selection empty instead of falling back to the default event", () => {
    const events = [makeEvent("today-first", new Date(2026, 5, 26, 9, 56))];

    expect(
      getResolvedSelectedEventId({
        defaultSelectedEventId: "today-first",
        events,
        selectedEventId: null,
      }),
    ).toBeNull();
  });
});

function makeEvent(id: string, start: Date): ArchiveCalendarEvent {
  return {
    id,
    title: id,
    start,
    end: new Date(start.getTime() + 45 * 60 * 1000),
    isAllDay: false,
    color: "blue",
    calendarId: "wechat-daily",
    description: id,
    meta: {
      story: {
        no: "01",
        anchorId: id,
        sourceReportSlug: "2026-06-26",
        date: "2026-06-26",
        time: "09:56",
        title: id,
        cast: [],
        participants: [],
        summary: id,
        quotes: [],
      },
      participants: [],
      quotes: [],
      rawHtmlHref: "/archive/html/test.html",
      sourceReportSlug: "2026-06-26",
      sourceFilename: "test.html",
    },
  };
}
