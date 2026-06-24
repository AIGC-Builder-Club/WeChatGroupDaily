import { addDays, startOfDay } from "date-fns";

import type { ArchiveCalendarEvent } from "./archive-calendar-events";

export type TimelineSegmentPosition = "start" | "middle" | "end" | "full";

export type PositionedTimelineEvent = {
  event: ArchiveCalendarEvent;
  startMinutes: number;
  durationMinutes: number;
  column: number;
  totalColumns: number;
  left: number;
  width: number;
  segmentPosition: TimelineSegmentPosition;
};

export type TimelineDayLayout = {
  timedEvents: PositionedTimelineEvent[];
};

type ColumnAssignment = {
  column: number;
  totalColumns: number;
};

const minutesPerDay = 24 * 60;

export function buildTimelineDayLayout(
  events: ArchiveCalendarEvent[],
  day: Date,
): TimelineDayLayout {
  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const dayEvents = events.filter((event) => eventOverlapsDay(event, dayStart, dayEnd));
  const timedEvents = dayEvents.sort(compareTimelineEvents);
  const assignments = assignColumns(timedEvents);

  return {
    timedEvents: timedEvents.map((event) => {
      const effectiveStart = event.start > dayStart ? event.start : dayStart;
      const effectiveEnd = event.end < dayEnd ? event.end : dayEnd;
      const startMinutes = minutesBetween(dayStart, effectiveStart);
      const durationMinutes = Math.max(1, minutesBetween(effectiveStart, effectiveEnd));
      const assignment = assignments.get(event.id) ?? { column: 0, totalColumns: 1 };
      const width = 100 / assignment.totalColumns;

      return {
        event,
        startMinutes,
        durationMinutes,
        column: assignment.column,
        totalColumns: assignment.totalColumns,
        left: assignment.column * width,
        width,
        segmentPosition: getSegmentPosition(event, dayStart, dayEnd),
      };
    }),
  };
}

export function minutesToPercent(minutes: number): number {
  return (minutes / minutesPerDay) * 100;
}

function eventOverlapsDay(event: ArchiveCalendarEvent, dayStart: Date, dayEnd: Date): boolean {
  return event.start < dayEnd && event.end > dayStart;
}

function getSegmentPosition(
  event: ArchiveCalendarEvent,
  dayStart: Date,
  dayEnd: Date,
): TimelineSegmentPosition {
  const startsOnDay = event.start >= dayStart && event.start < dayEnd;
  const endsOnDay = event.end <= dayEnd && event.end > dayStart;

  if (startsOnDay && endsOnDay) return "full";
  if (startsOnDay) return "start";
  if (endsOnDay) return "end";
  return "middle";
}

function assignColumns(events: ArchiveCalendarEvent[]): Map<string, ColumnAssignment> {
  const assignments = new Map<string, ColumnAssignment>();

  if (events.length === 0) {
    return assignments;
  }

  const sortedEvents = [...events].sort((first, second) => {
    const startComparison = first.start.getTime() - second.start.getTime();
    if (startComparison !== 0) return startComparison;
    return second.end.getTime() - second.start.getTime() - (first.end.getTime() - first.start.getTime());
  });
  const groups: ArchiveCalendarEvent[][] = [];
  const processed = new Set<string>();

  for (const event of sortedEvents) {
    if (processed.has(event.id)) {
      continue;
    }

    const group = [event];
    processed.add(event.id);

    let foundOverlap = true;
    while (foundOverlap) {
      foundOverlap = false;

      for (const candidate of sortedEvents) {
        if (processed.has(candidate.id)) {
          continue;
        }

        if (group.some((groupEvent) => eventsOverlap(groupEvent, candidate))) {
          group.push(candidate);
          processed.add(candidate.id);
          foundOverlap = true;
        }
      }
    }

    groups.push(group);
  }

  for (const group of groups) {
    const columns: ArchiveCalendarEvent[][] = [];

    for (const event of group.sort(compareTimelineEvents)) {
      const availableColumn = columns.findIndex((column) =>
        column.every((columnEvent) => !eventsOverlap(columnEvent, event)),
      );
      const columnIndex = availableColumn === -1 ? columns.length : availableColumn;

      columns[columnIndex] ??= [];
      columns[columnIndex].push(event);
      assignments.set(event.id, { column: columnIndex, totalColumns: 0 });
    }

    for (const event of group) {
      const assignment = assignments.get(event.id);
      if (assignment) {
        assignment.totalColumns = columns.length;
      }
    }
  }

  return assignments;
}

function eventsOverlap(first: ArchiveCalendarEvent, second: ArchiveCalendarEvent): boolean {
  return first.start < second.end && second.start < first.end;
}

function compareTimelineEvents(first: ArchiveCalendarEvent, second: ArchiveCalendarEvent): number {
  const startComparison = first.start.getTime() - second.start.getTime();
  if (startComparison !== 0) return startComparison;

  if (first.isAllDay !== second.isAllDay) {
    return first.isAllDay ? -1 : 1;
  }

  return first.title.localeCompare(second.title, "zh-CN");
}

function minutesBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}
