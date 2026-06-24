import type { ArchiveIndexes, ReportStory } from "./archive";

export type ArchiveCalendarDay = {
  date: string;
  dayLabel: string;
  weekdayLabel: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  storyCount: number;
  stories: ReportStory[];
};

export type ArchiveCalendarMonth = {
  month: string;
  monthLabel: string;
  days: ArchiveCalendarDay[];
  weeks: ArchiveCalendarDay[][];
};

export function filterArchiveIndexes(
  indexes: ArchiveIndexes,
  predicate: (story: ReportStory) => boolean,
): ArchiveIndexes {
  const calendarDays: ArchiveIndexes["calendarDays"] = {};
  const peopleIndex: ArchiveIndexes["peopleIndex"] = {};
  const topicIndex: ArchiveIndexes["topicIndex"] = {};
  const searchEntries = indexes.searchEntries.filter((entry) => predicate(entry.story));
  const stories = searchEntries.map((entry) => entry.story);

  stories.forEach((story) => {
    pushIndexed(calendarDays, story.date, story);
    story.participants.forEach((participant) => {
      pushIndexed(peopleIndex, participant.name, story);
    });
    if (story.topic) {
      pushIndexed(topicIndex, story.topic, story);
    }
  });

  return {
    calendarDays,
    peopleIndex,
    topicIndex,
    searchEntries,
  };
}

export function getLatestArchiveMonth(indexes: ArchiveIndexes): string {
  const latestDate = Object.keys(indexes.calendarDays).sort().at(-1);

  if (!latestDate) {
    return new Date().toISOString().slice(0, 7);
  }

  return latestDate.slice(0, 7);
}

export function buildArchiveCalendarMonth(
  indexes: ArchiveIndexes,
  month: string,
): ArchiveCalendarMonth {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const firstDay = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const leadingDays = (firstDay.getUTCDay() + 6) % 7;
  const cellCount = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const today = new Date();
  const todayKey = toIsoDate(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())),
  );
  const days: ArchiveCalendarDay[] = [];

  for (let index = 0; index < cellCount; index += 1) {
    const offset = index - leadingDays + 1;
    const date = new Date(Date.UTC(year, monthIndex, offset));
    const dateKey = toIsoDate(date);
    const stories = indexes.calendarDays[dateKey] ?? [];

    days.push({
      date: dateKey,
      dayLabel: String(date.getUTCDate()),
      weekdayLabel: WEEKDAY_LABELS[(date.getUTCDay() + 6) % 7],
      isCurrentMonth: date.getUTCMonth() === monthIndex,
      isToday: dateKey === todayKey,
      storyCount: stories.length,
      stories,
    });
  }

  return {
    month,
    monthLabel: formatMonthLabel(month),
    days,
    weeks: chunk(days, 7),
  };
}

function formatMonthLabel(month: string): string {
  const [year, monthText] = month.split("-");

  return `${year} 年 ${Number(monthText)} 月`;
}

function chunk<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }

  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pushIndexed<T>(index: Record<string, T[]>, key: string, value: T): void {
  index[key] ??= [];
  index[key].push(value);
}
