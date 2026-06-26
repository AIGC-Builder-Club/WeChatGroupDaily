import {
  endOfWeek,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfDay,
  startOfWeek,
} from "date-fns";

import type { ArchiveCalendarEvent, CalendarViewType } from "./archive-calendar-events";

type DefaultSelectedEventIdArgs = {
  currentDate: Date;
  events: ArchiveCalendarEvent[];
  now?: Date;
  view: CalendarViewType;
};

type ResolvedSelectedEventIdArgs = {
  defaultSelectedEventId: string | null;
  events: ArchiveCalendarEvent[];
  selectedEventId: string | null;
};

export function getDefaultViewDate(
  fromView: CalendarViewType,
  toView: CalendarViewType,
  now: Date = new Date(),
): Date | null {
  if (fromView === toView) {
    return null;
  }

  if (fromView !== "month") {
    return null;
  }

  if (toView === "day" || toView === "week") {
    return startOfDay(now);
  }

  return null;
}

export function getDefaultSelectedEventId({
  currentDate,
  events,
  now = new Date(),
  view,
}: DefaultSelectedEventIdArgs): string | null {
  if (events.length === 0) {
    return null;
  }

  const todayEvent = events.find((event) => isSameDay(event.start, now));
  if (todayEvent && isTodayVisible(currentDate, now, view)) {
    return todayEvent.id;
  }

  return events[0]?.id ?? null;
}

export function getResolvedSelectedEventId({
  defaultSelectedEventId,
  events,
  selectedEventId,
}: ResolvedSelectedEventIdArgs): string | null {
  if (selectedEventId === null) {
    return null;
  }

  if (selectedEventId && events.some((event) => event.id === selectedEventId)) {
    return selectedEventId;
  }

  return defaultSelectedEventId;
}

function isTodayVisible(currentDate: Date, now: Date, view: CalendarViewType): boolean {
  const today = startOfDay(now);

  if (view === "month") {
    return isSameMonth(currentDate, today);
  }

  if (view === "day") {
    return isSameDay(currentDate, today);
  }

  return isWithinInterval(today, {
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  });
}
