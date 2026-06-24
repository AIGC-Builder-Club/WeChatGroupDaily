import { format } from "date-fns";

import type { ReportMeta, ReportQuote, ReportStory, ReportAvatar } from "./archive";

export type CalendarEventColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export type CalendarViewType = "month" | "week" | "day";

export type ArchiveCalendarEventMeta = {
  story: ReportStory;
  participants: ReportAvatar[];
  quotes: ReportQuote[];
  output?: string;
  topic?: string;
  rawHtmlHref: string;
  sourceReportSlug: string;
  sourceFilename: string;
};

export type ArchiveCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  color: CalendarEventColor;
  calendarId: "wechat-daily";
  description: string;
  meta: ArchiveCalendarEventMeta;
};

const timedEventMinutes = 45;
const colors: CalendarEventColor[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "gray",
];

export function toArchiveCalendarEvents(reports: ReportMeta[]): ArchiveCalendarEvent[] {
  return reports.flatMap((report) =>
    report.stories.map((story) => toArchiveCalendarEvent(report, story)),
  );
}

export function toArchiveCalendarEvent(
  report: ReportMeta,
  story: ReportStory,
): ArchiveCalendarEvent {
  const start = story.absoluteDateTime
    ? new Date(story.absoluteDateTime)
    : dateOnlyToLocalDate(story.date);
  const end = story.absoluteDateTime
    ? addMinutes(start, timedEventMinutes)
    : addDays(start, 1);

  return {
    id: story.anchorId,
    title: story.title,
    start,
    end,
    isAllDay: !story.absoluteDateTime,
    color: colorForStory(story),
    calendarId: "wechat-daily",
    description: story.summary,
    meta: {
      story,
      participants: story.participants,
      quotes: story.quotes,
      output: story.output,
      topic: story.topic,
      rawHtmlHref: getRawHtmlHref(report.filename),
      sourceReportSlug: report.slug,
      sourceFilename: report.filename,
    },
  };
}

export function getRawHtmlHref(filename: string): string {
  return `/archive/html/${encodeURIComponent(filename)}`;
}

export type ArchiveEventTimeSource = {
  start: Date;
  end: Date;
  isAllDay: boolean;
  meta: {
    story: {
      time?: string;
    };
  };
};

export function formatArchiveEventTime(event: ArchiveEventTimeSource): string {
  if (event.isAllDay) {
    return event.meta.story.time ?? "全天";
  }

  return `${formatShortTime(event.start)}–${formatShortTime(event.end)}`;
}

function colorForStory(story: ReportStory): CalendarEventColor {
  const source = story.topic || story.title || story.anchorId;
  let hash = 0;

  for (const character of source) {
    hash = (hash * 31 + character.codePointAt(0)!) % colors.length;
  }

  return colors[hash] ?? "gray";
}

function formatShortTime(date: Date): string {
  const minutes = date.getMinutes();
  if (minutes === 0) {
    return format(date, "H");
  }

  return format(date, "H:mm");
}

function dateOnlyToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
