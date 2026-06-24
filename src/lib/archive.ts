import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import * as cheerio from "cheerio";

export {
  buildArchiveCalendarMonth,
  filterArchiveIndexes,
  getLatestArchiveMonth,
} from "./archive-calendar";
export type { ArchiveCalendarDay, ArchiveCalendarMonth } from "./archive-calendar";

export type ReportStats = {
  messages?: number;
  people?: number;
  characters?: number;
  stories?: number;
  newcomers?: number;
};

export type ReportAvatar = {
  name: string;
  avatarSrc?: string;
  avatarAlt?: string;
  avatarInitials: string;
};

export type ReportQuote = {
  text: string;
  attr?: string;
};

export type ReportStory = {
  no: string;
  anchorId: string;
  sourceReportSlug: string;
  date: string;
  absoluteDateTime?: string;
  time?: string;
  title: string;
  topic?: string;
  cast: string[];
  participants: ReportAvatar[];
  summary: string;
  quotes: ReportQuote[];
  output?: string;
};

export type ReportHighlight = {
  name: string;
  tag?: string;
  desc?: string;
  avatarSrc?: string;
  avatarAlt?: string;
  avatarInitials: string;
};

export type ReportMasthead = {
  name: string;
  sub?: string;
  issue?: string;
  date?: string;
};

export type ReportColophon = {
  quote?: string;
  attr?: string;
  meta?: string;
};

export type ReportMeta = {
  slug: string;
  filename: string;
  masthead: ReportMasthead;
  colophon: ReportColophon;
  dateLabel: string;
  startDate: string;
  endDate: string;
  title: string;
  leadText: string;
  stats: ReportStats;
  stories: ReportStory[];
  highlights: ReportHighlight[];
  searchText: string;
  hasScreenshot: boolean;
};

export type ReportDetail = ReportMeta & {
  html: string;
  screenshotFilename?: string;
};

export type ArchiveDiagnostics = {
  totalHtml: number;
  totalPng: number;
  reportSlugs: string[];
  missingScreenshotSlugs: string[];
  extraScreenshotFiles: string[];
  errors: string[];
};

export type ArchiveSearchEntry = {
  story: ReportStory;
  text: string;
};

export type ArchiveIndexes = {
  calendarDays: Record<string, ReportStory[]>;
  peopleIndex: Record<string, ReportStory[]>;
  topicIndex: Record<string, ReportStory[]>;
  searchEntries: ArchiveSearchEntry[];
};

type DateRange = {
  startDate: string;
  endDate: string;
};

type CheerioElement = Parameters<cheerio.CheerioAPI>[0];

type CheerioSelection = {
  attr(name: string): string | undefined;
  each(callback: (index: number, element: CheerioElement) => void): void;
  eq(index: number): CheerioSelection;
  find(selector: string): CheerioSelection;
  first(): CheerioSelection;
  is(selector: string): boolean;
  text(): string;
};

const archiveRoot = path.join(process.cwd(), "🦞奇奇怪怪养龙虾");
const htmlDir = path.join(archiveRoot, "html");
const pngDir = path.join(archiveRoot, "png");
const datePattern = /(\d{4}-\d{2}-\d{2})(?:\s*→\s*(\d{4}-\d{2}-\d{2}))?/;

export const ARCHIVE_PATHS = {
  root: archiveRoot,
  html: htmlDir,
  png: pngDir,
};

export function parseDateRangeFromFilename(filename: string): DateRange {
  const match = filename.match(datePattern);

  if (!match?.[1]) {
    throw new Error(`Cannot parse report date from filename: ${filename}`);
  }

  return {
    startDate: match[1],
    endDate: match[2] ?? match[1],
  };
}

export function slugFromDateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? startDate : `${startDate}-to-${endDate}`;
}

export function loadAllReports(): ReportMeta[] {
  const screenshotFiles = readArchiveFiles(pngDir, ".png");

  return readArchiveFiles(htmlDir, ".html")
    .map((filename) => parseReportFile(filename, screenshotFiles))
    .sort(compareReportsNewestFirst);
}

export function parseReportFile(
  filename: string,
  screenshotFiles = readArchiveFiles(pngDir, ".png"),
): ReportMeta {
  const html = readFileSync(path.join(htmlDir, filename), "utf8");

  return parseReportHtml(html, filename, screenshotFiles);
}

export function getReportBySlug(slug: string): ReportDetail | undefined {
  const screenshotFiles = readArchiveFiles(pngDir, ".png");
  const filename = readArchiveFiles(htmlDir, ".html").find((candidate) => {
    const { startDate, endDate } = parseDateRangeFromFilename(candidate);
    return slugFromDateRange(startDate, endDate) === slug;
  });

  if (!filename) {
    return undefined;
  }

  const html = readFileSync(path.join(htmlDir, filename), "utf8");
  const report = parseReportHtml(html, filename, screenshotFiles);

  return {
    ...report,
    html,
    screenshotFilename: report.hasScreenshot ? screenshotFilenameForHtml(filename) : undefined,
  };
}

export function parseReportHtml(
  html: string,
  filename: string,
  screenshotFiles = readArchiveFiles(pngDir, ".png"),
): ReportMeta {
  const $ = cheerio.load(html);
  const { startDate, endDate } = parseDateRangeFromFilename(filename);
  const slug = slugFromDateRange(startDate, endDate);
  const dateLabel = startDate === endDate ? startDate : `${startDate} → ${endDate}`;
  const stories: ReportStory[] = [];
  const highlights: ReportHighlight[] = [];

  $(".story").each((index, element) => {
    const story = $(element);
    const cast = splitNames(textOf(story.find(".cast-names").first()));
    const storyNo = textOf(story.find(".story-no").first()) || String(index + 1).padStart(2, "0");
    const time = optionalText(story.find(".story-time").first());
    const storyDate = parseStoryDate(time, startDate);
    const quotes = parseQuotes($, story);
    const parsed: ReportStory = {
      no: storyNo,
      anchorId: `story-${slug}-${storyNo}`,
      sourceReportSlug: slug,
      ...storyDate,
      time,
      title: textOf(story.find(".story-theme").first()),
      topic: optionalText(story.find(".story-badge").first()),
      cast,
      participants: parseParticipants(story, cast),
      summary: textOf(story.find(".story-text").first()),
      quotes,
      output: optionalText(story.find(".story-output b").first()),
    };

    stories.push(parsed);
  });

  $(".hl").each((_, element) => {
    const highlight = $(element);
    const name = textOf(highlight.find(".hl-name").first());
    const avatar = parseAvatar(highlight.find(".hl-avatar").first(), name);
    const parsed: ReportHighlight = {
      name,
      tag: optionalText(highlight.find(".hl-tag").first()),
      desc: optionalText(highlight.find(".hl-desc").first()),
      avatarSrc: avatar.avatarSrc,
      avatarAlt: avatar.avatarAlt,
      avatarInitials: avatar.avatarInitials,
    };

    if (parsed.name) {
      highlights.push(parsed);
    }
  });

  const title = textOf($(".lead-title").first());
  const leadText = textOf($(".lead-deck").first());
  const masthead = parseMasthead($);
  const colophon = parseColophon($);
  const stats = parseStats($);
  const searchText = normalizeText(
    [
      masthead.name,
      masthead.sub,
      masthead.issue,
      masthead.date,
      title,
      leadText,
      $("body").text(),
      stories.flatMap((story) => [
        story.no,
        story.time,
        story.title,
        story.topic,
        story.cast.join(" "),
        story.summary,
        story.quotes.map((quote) => `${quote.text} ${quote.attr ?? ""}`).join(" "),
        story.output,
      ]),
      highlights.flatMap((highlight) => [highlight.name, highlight.tag, highlight.desc]),
      colophon.quote,
      colophon.attr,
      colophon.meta,
    ]
      .flat()
      .filter(Boolean)
      .join(" "),
  );

  return {
    slug,
    filename,
    masthead,
    colophon,
    dateLabel,
    startDate,
    endDate,
    title,
    leadText,
    stats,
    stories,
    highlights,
    searchText,
    hasScreenshot: screenshotFiles.includes(screenshotFilenameForHtml(filename)),
  };
}

export function buildArchiveDiagnostics(): ArchiveDiagnostics {
  const htmlFiles = readArchiveFiles(htmlDir, ".html");
  const pngFiles = readArchiveFiles(pngDir, ".png");
  const htmlBasenames = new Set(htmlFiles.map((filename) => filename.replace(/\.html$/i, "")));
  const missingScreenshotSlugs: string[] = [];
  const errors: string[] = [];
  const reports = htmlFiles.map((filename) => {
    const report = parseReportFile(filename, pngFiles);

    if (!report.hasScreenshot) {
      missingScreenshotSlugs.push(report.slug);
    }

    errors.push(...validateReport(report));
    return report;
  });

  return {
    totalHtml: htmlFiles.length,
    totalPng: pngFiles.length,
    reportSlugs: reports.sort(compareReportsNewestFirst).map((report) => report.slug),
    missingScreenshotSlugs: missingScreenshotSlugs.sort(),
    extraScreenshotFiles: pngFiles.filter(
      (filename) => !htmlBasenames.has(filename.replace(/\.png$/i, "")),
    ),
    errors,
  };
}

export function buildArchiveIndexes(reports: ReportMeta[]): ArchiveIndexes {
  const calendarDays: Record<string, ReportStory[]> = {};
  const peopleIndex: Record<string, ReportStory[]> = {};
  const topicIndex: Record<string, ReportStory[]> = {};
  const searchEntries: ArchiveSearchEntry[] = [];

  reports.forEach((report) => {
    report.stories.forEach((story) => {
      pushIndexed(calendarDays, story.date, story);

      uniqueInOrder(story.participants.map((participant) => participant.name)).forEach((name) => {
        pushIndexed(peopleIndex, name, story);
      });

      if (story.topic) {
        pushIndexed(topicIndex, story.topic, story);
      }

      searchEntries.push({
        story,
        text: searchTextForStory(report, story),
      });
    });
  });

  return {
    calendarDays,
    peopleIndex,
    topicIndex,
    searchEntries,
  };
}

export function searchStories(indexes: ArchiveIndexes, query: string): ReportStory[] {
  const normalizedQuery = normalizeForSearch(query);

  if (!normalizedQuery) {
    return [];
  }

  return indexes.searchEntries
    .filter((entry) => entry.text.includes(normalizedQuery))
    .map((entry) => entry.story);
}

export function getPeople(reports: ReportMeta[]): string[] {
  return uniqueSorted(
    reports.flatMap((report) => [
      ...report.highlights.map((highlight) => highlight.name),
      ...report.stories.flatMap((story) => story.participants.map((participant) => participant.name)),
    ]),
  );
}

export function getTopics(reports: ReportMeta[]): string[] {
  return uniqueSorted(
    reports.flatMap((report) => [
      ...report.highlights.map((highlight) => highlight.tag),
      ...report.stories.map((story) => story.topic),
    ]),
  );
}

function parseStats($: cheerio.CheerioAPI): ReportStats {
  const stats: ReportStats = {};

  $(".colophon-num").each((_, element) => {
    const label = textOf($(element).find(".l").first()).toLowerCase();
    const value = parseStatNumber(textOf($(element).find(".n").first()));

    if (value === undefined) {
      return;
    }

    if (label.startsWith("messages")) stats.messages = value;
    if (label.startsWith("people")) stats.people = value;
    if (label.startsWith("characters")) stats.characters = value;
    if (label.startsWith("stories")) stats.stories = value;
    if (label.startsWith("newcomer")) stats.newcomers = value;
  });

  return stats;
}

function parseStatNumber(value: string): number | undefined {
  const match = value.match(/\+?([\d,]+)/);
  if (!match?.[1]) {
    return undefined;
  }

  return Number.parseInt(match[1].replaceAll(",", ""), 10);
}

function parseMasthead($: cheerio.CheerioAPI): ReportMasthead {
  return {
    name: textOf($(".masthead-name").first()),
    sub: optionalText($(".masthead-sub").first()),
    issue: optionalText($(".masthead-right .issue").first()),
    date: optionalText($(".masthead-right .date").first()),
  };
}

function parseColophon($: cheerio.CheerioAPI): ReportColophon {
  const quoteElement = $(".colophon-quote").first();
  const rawAttr = optionalText(quoteElement.find(".attr").first());

  return {
    quote: optionalText({
      text: () => quoteElement.text().replace(rawAttr ?? "", ""),
    }),
    attr: parseQuoteAttr(rawAttr),
    meta: optionalText($(".colophon-meta").first()),
  };
}

function parseStoryDate(
  time: string | undefined,
  fallbackDate: string,
): Pick<ReportStory, "date" | "absoluteDateTime"> {
  if (!time) {
    return { date: fallbackDate };
  }

  const reportYear = fallbackDate.slice(0, 4);
  const dateTimeMatch = time.match(/^(\d{2})-(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);

  if (dateTimeMatch?.[1] && dateTimeMatch[2]) {
    const date = `${reportYear}-${dateTimeMatch[1]}-${dateTimeMatch[2]}`;
    const hour = dateTimeMatch[3];
    const minute = dateTimeMatch[4];

    return {
      date,
      absoluteDateTime:
        hour && minute ? `${date}T${hour.padStart(2, "0")}:${minute}:00` : undefined,
    };
  }

  const timeOnlyMatch = time.match(/^(\d{1,2}):(\d{2})$/);

  if (timeOnlyMatch?.[1] && timeOnlyMatch[2]) {
    return {
      date: fallbackDate,
      absoluteDateTime: `${fallbackDate}T${timeOnlyMatch[1].padStart(2, "0")}:${
        timeOnlyMatch[2]
      }:00`,
    };
  }

  return { date: fallbackDate };
}

function parseQuotes($: cheerio.CheerioAPI, story: CheerioSelection): ReportQuote[] {
  const quotes: ReportQuote[] = [];

  story.find(".story-quote").each((_, element) => {
    const quote = $(element);
    const text = textOf(quote.find(".quote-text").first());

    if (!text) {
      return;
    }

    quotes.push({
      text,
      attr: parseQuoteAttr(optionalText(quote.find(".quote-attr").first())),
    });
  });

  return quotes;
}

function parseQuoteAttr(value: string | undefined): string | undefined {
  return value?.replace(/^[-—]\s*/, "").trim() || undefined;
}

function parseParticipants(
  story: CheerioSelection,
  cast: string[],
): ReportAvatar[] {
  return cast.map((name, index) => {
    const avatarElement = story.find(".cast-avatars .avatar").eq(index);
    return parseAvatar(avatarElement, name);
  });
}

function parseAvatar(selection: CheerioSelection, fallbackName: string): ReportAvatar {
  const avatarSrc = selection.attr("src") || undefined;
  const avatarAlt = selection.attr("alt") || undefined;
  const sourceInitials = selection.is(".avatar-text") ? textOf(selection) : undefined;

  return {
    name: fallbackName,
    avatarSrc,
    avatarAlt,
    avatarInitials: initialsFrom(sourceInitials || avatarAlt || fallbackName),
  };
}

function initialsFrom(value: string): string {
  const firstCharacter = Array.from(value.trim())[0];

  if (!firstCharacter) {
    return "?";
  }

  return /[a-z]/i.test(firstCharacter) ? firstCharacter.toUpperCase() : firstCharacter;
}

function searchTextForStory(report: ReportMeta, story: ReportStory): string {
  return normalizeForSearch(
    [
      report.slug,
      report.dateLabel,
      report.title,
      report.leadText,
      story.no,
      story.date,
      story.time,
      story.title,
      story.topic,
      story.cast.join(" "),
      story.summary,
      story.output,
      story.quotes.map((quote) => `${quote.text} ${quote.attr ?? ""}`).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function normalizeForSearch(value: string): string {
  return normalizeText(value).toLowerCase();
}

function pushIndexed<T>(index: Record<string, T[]>, key: string | undefined, value: T): void {
  const normalizedKey = key?.trim();

  if (!normalizedKey) {
    return;
  }

  index[normalizedKey] ??= [];
  index[normalizedKey].push(value);
}

function uniqueInOrder(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function validateReport(report: ReportMeta): string[] {
  const errors: string[] = [];

  if (!report.slug) errors.push(`${report.filename}: missing slug`);
  if (!report.title) errors.push(`${report.filename}: missing .lead-title`);
  if (!report.leadText) errors.push(`${report.filename}: missing .lead-deck`);
  if (report.stories.length === 0) errors.push(`${report.filename}: missing .story entries`);

  report.stories.forEach((story, index) => {
    const prefix = `${report.filename}: story ${index + 1}`;
    if (!story.no) errors.push(`${prefix} missing .story-no`);
    if (!story.title) errors.push(`${prefix} missing .story-theme`);
  });

  return errors;
}

function readArchiveFiles(directory: string, extension: ".html" | ".png"): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).filter((filename) => filename.endsWith(extension)).sort();
}

function screenshotFilenameForHtml(filename: string): string {
  return filename.replace(/\.html$/i, ".png");
}

function compareReportsNewestFirst(a: ReportMeta, b: ReportMeta): number {
  const endComparison = b.endDate.localeCompare(a.endDate);
  if (endComparison !== 0) return endComparison;

  return b.startDate.localeCompare(a.startDate);
}

function splitNames(value: string): string[] {
  return value
    .split(/\s+\/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function textOf(selection: { text: () => string }): string {
  return normalizeText(selection.text());
}

function optionalText(selection: { text: () => string }): string | undefined {
  return textOf(selection) || undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueSorted(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort(
    (a, b) => a.localeCompare(b, "zh-CN"),
  );
}
