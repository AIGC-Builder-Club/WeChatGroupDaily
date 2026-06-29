import { addDays, format } from "date-fns";

import type { ReportHighlight, ReportMeta } from "./archive";
import { getRawHtmlHref } from "./archive-calendar-events";

export type DayReportOverview = {
  slug: string;
  title: string;
  leadText: string;
  highlights: ReportHighlight[];
  rawHtmlHref: string;
};

export function getReportOverviewsForDay(reports: ReportMeta[]): Map<string, DayReportOverview[]> {
  const exactReportsByDay = new Map<string, ReportMeta[]>();
  const rangedReportsByDay = new Map<string, ReportMeta[]>();

  reports.forEach((report) => {
    const target = report.startDate === report.endDate ? exactReportsByDay : rangedReportsByDay;

    eachReportDay(report.startDate, report.endDate).forEach((day) => {
      const current = target.get(day) ?? [];
      target.set(day, [...current, report]);
    });
  });

  const allDays = new Set([...exactReportsByDay.keys(), ...rangedReportsByDay.keys()]);
  const overviewsByDay = new Map<string, DayReportOverview[]>();

  allDays.forEach((day) => {
    const reportsForDay = exactReportsByDay.get(day) ?? rangedReportsByDay.get(day) ?? [];
    overviewsByDay.set(day, reportsForDay.map(toDayReportOverview));
  });

  return overviewsByDay;
}

function toDayReportOverview(report: ReportMeta): DayReportOverview {
  return {
    slug: report.slug,
    title: report.title,
    leadText: report.leadText,
    highlights: report.highlights,
    rawHtmlHref: getRawHtmlHref(report.filename),
  };
}

function eachReportDay(startDate: string, endDate: string): string[] {
  const start = dateOnlyToLocalDate(startDate);
  const end = dateOnlyToLocalDate(endDate);
  const days: string[] = [];

  for (let day = start; day <= end; day = addDays(day, 1)) {
    days.push(format(day, "yyyy-MM-dd"));
  }

  return days;
}

function dateOnlyToLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, (month ?? 1) - 1, day ?? 1);
}
