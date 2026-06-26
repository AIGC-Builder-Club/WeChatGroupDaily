import { describe, expect, it } from "vitest";

import {
  buildArchiveCalendarMonth,
  buildArchiveIndexes,
  buildArchiveDiagnostics,
  filterArchiveIndexes,
  getLatestArchiveMonth,
  loadAllReports,
  parseDateRangeFromFilename,
  parseReportFile,
  searchStories,
  slugFromDateRange,
} from "../src/lib/archive";
import {
  decodeRouteName,
  encodeRouteName,
  getPeopleStaticParams,
  getReportStaticParams,
  getTopicStaticParams,
} from "../src/lib/report-static-params";

const latestFilename = "🦞奇奇怪怪养龙虾群2026-06-24.html";
const rangedFilename = "🦞奇奇怪怪养龙虾群2026-05-07 → 2026-05-13.html";
const singleDayFilename = "🦞奇奇怪怪养龙虾群2026-05-25.html";
const fallbackAvatarFilename = "🦞奇奇怪怪养龙虾群2026-06-21 → 2026-06-23.html";
const totalReportCount = 29;
const latestReportSlug = "2026-06-26";

describe("archive filename parsing", () => {
  it("parses single-day and ranged report filenames", () => {
    expect(parseDateRangeFromFilename(latestFilename)).toEqual({
      startDate: "2026-06-24",
      endDate: "2026-06-24",
    });

    expect(parseDateRangeFromFilename(rangedFilename)).toEqual({
      startDate: "2026-05-07",
      endDate: "2026-05-13",
    });
  });

  it("generates URL-safe date slugs without source filename text", () => {
    expect(slugFromDateRange("2026-06-24", "2026-06-24")).toBe("2026-06-24");
    expect(slugFromDateRange("2026-05-07", "2026-05-13")).toBe(
      "2026-05-07-to-2026-05-13",
    );
  });
});

describe("report metadata parsing", () => {
  it("extracts required metadata from the latest report", () => {
    const report = parseReportFile(latestFilename);

    expect(report.slug).toBe("2026-06-24");
    expect(report.filename).toBe(latestFilename);
    expect(report.masthead).toEqual({
      name: "群日报",
      sub: "A DAILY OF A COMMUNITY",
      issue: "Vol. 2026.06.24",
      date: "🦞奇奇怪怪养龙虾群-自迭代无限生",
    });
    expect(report.dateLabel).toBe("2026-06-24");
    expect(report.title).toContain("Token");
    expect(report.leadText.length).toBeGreaterThan(100);
    expect(report.stories.length).toBeGreaterThanOrEqual(3);
    expect(report.highlights.length).toBeGreaterThanOrEqual(4);
    expect(report.hasScreenshot).toBe(true);
    expect(report.searchText).toContain("Falcon");
    expect(report.searchText).toContain("Token");
    expect(report.colophon).toEqual(
      expect.objectContaining({
        quote: "以后直接把本群当收藏夹，看到好东西就丢进来，反正会被 wiki 收录帮我整理。",
        attr: "Yanbo.",
        meta: "🦞奇奇怪怪养龙虾群-自迭代无限生 · 2026-06-24 · 14:09 → 14:31",
      }),
    );
    expect(report.stories[0]).toEqual(
      expect.objectContaining({
        no: "01",
        title: expect.stringContaining("Falcon"),
        topic: "浏览器评鉴官",
        cast: expect.arrayContaining(["Falcon", "刘准", "Yanbo."]),
      }),
    );
  });

  it("extracts story anchors, absolute dates, quotes, text, output, and participant avatars", () => {
    const report = parseReportFile(latestFilename);
    const story = report.stories[0];

    expect(story).toEqual(
      expect.objectContaining({
        anchorId: "story-2026-06-24-01",
        sourceReportSlug: "2026-06-24",
        date: "2026-06-23",
        absoluteDateTime: "2026-06-23T14:09:00",
        summary: expect.stringContaining("美团突然把 GPT-5.5 和 Claude 全免费了"),
        output: "AI 浏览器口碑榜：Tabbit > 美团 > Atlas（已陨落）",
      }),
    );
    expect(story.participants.map((participant) => participant.name)).toEqual(story.cast);
    expect(story.participants[0]).toEqual(
      expect.objectContaining({
        name: "Falcon",
        avatarAlt: "Falcon",
        avatarInitials: "F",
      }),
    );
    expect(story.participants[0]?.avatarSrc).toMatch(/^data:image\/jpeg;base64,/);
    expect(story.quotes).toEqual([
      {
        text: "Atlas它能爬取，给出的结论也相当可用。但现在国内很多网站都把他禁止了，他也很守规矩，还真就不看了",
        attr: "Falcon",
      },
      {
        text: "Dia 当时没有 agent。Tabbit 是因为御三家模型随便用",
        attr: "刘准",
      },
      {
        text: "焊死 input 千算万算 不如 input 划算",
        attr: "Falcon",
      },
    ]);
  });

  it("buckets ranged report stories by the day embedded in each story time", () => {
    const rangedReport = parseReportFile(rangedFilename);
    const singleDayReport = parseReportFile(singleDayFilename);

    expect(rangedReport.stories[0]).toEqual(
      expect.objectContaining({
        time: "05-07 上午",
        date: "2026-05-07",
        absoluteDateTime: undefined,
      }),
    );
    expect(rangedReport.stories[7]).toEqual(
      expect.objectContaining({
        time: "05-12 晚 → 05-13",
        date: "2026-05-12",
        absoluteDateTime: undefined,
      }),
    );
    expect(singleDayReport.stories[0]).toEqual(
      expect.objectContaining({
        time: "14:20",
        date: "2026-05-25",
        absoluteDateTime: "2026-05-25T14:20:00",
      }),
    );
  });

  it("extracts highlight avatars and falls back to source initials for text-only avatars", () => {
    const latestReport = parseReportFile(latestFilename);
    const fallbackReport = parseReportFile(fallbackAvatarFilename);

    expect(latestReport.highlights[0]).toEqual(
      expect.objectContaining({
        name: "ALSKai💥",
        avatarAlt: "ALSKai💥",
        avatarInitials: "A",
      }),
    );
    expect(latestReport.highlights[0]?.avatarSrc).toMatch(/^data:image\/jpeg;base64,/);

    const textOnlyHighlight = fallbackReport.highlights.find((highlight) =>
      highlight.name.startsWith("悖"),
    );

    expect(textOnlyHighlight).toEqual(
      expect.objectContaining({
        name: "悖（我是悖，悖论的悖）",
        avatarInitials: "悖",
        avatarSrc: undefined,
      }),
    );
  });

  it("builds calendar, people, topic, and story search indexes from parsed reports", () => {
    const reports = [parseReportFile(latestFilename), parseReportFile(rangedFilename)];
    const indexes = buildArchiveIndexes(reports);

    expect(indexes.calendarDays["2026-06-23"].map((story) => story.anchorId)).toEqual([
      "story-2026-06-24-01",
      "story-2026-06-24-02",
      "story-2026-06-24-03",
      "story-2026-06-24-04",
    ]);
    expect(indexes.calendarDays["2026-06-24"].map((story) => story.anchorId)).toEqual([
      "story-2026-06-24-05",
      "story-2026-06-24-06",
    ]);
    expect(indexes.calendarDays["2026-05-07"].map((story) => story.anchorId)).toEqual([
      "story-2026-05-07-to-2026-05-13-01",
      "story-2026-05-07-to-2026-05-13-02",
    ]);
    expect(indexes.peopleIndex["Falcon"].map((story) => story.anchorId)).toContain(
      "story-2026-06-24-01",
    );
    expect(indexes.topicIndex["浏览器评鉴官"][0]?.anchorId).toBe("story-2026-06-24-01");

    expect(searchStories(indexes, "焊死 input").map((story) => story.anchorId)).toEqual([
      "story-2026-06-24-01",
    ]);
    expect(searchStories(indexes, "codex-plusplus")[0]?.anchorId).toBe(
      "story-2026-05-07-to-2026-05-13-01",
    );
  });

  it("builds a calendar month model for the latest story month", () => {
    const reports = [parseReportFile(latestFilename), parseReportFile(rangedFilename)];
    const indexes = buildArchiveIndexes(reports);
    const month = getLatestArchiveMonth(indexes);
    const calendar = buildArchiveCalendarMonth(indexes, month);

    expect(month).toBe("2026-06");
    expect(calendar.monthLabel).toBe("2026 年 6 月");
    expect(calendar.weeks).toHaveLength(5);

    const june23 = calendar.days.find((day) => day.date === "2026-06-23");

    expect(june23).toEqual(
      expect.objectContaining({
        isCurrentMonth: true,
        storyCount: 4,
      }),
    );
    expect(june23?.stories.map((story) => story.anchorId)).toEqual([
      "story-2026-06-24-01",
      "story-2026-06-24-02",
      "story-2026-06-24-03",
      "story-2026-06-24-04",
    ]);
  });

  it("filters archive indexes down to a scoped person or topic view", () => {
    const reports = [parseReportFile(latestFilename), parseReportFile(rangedFilename)];
    const indexes = buildArchiveIndexes(reports);
    const falconIndexes = filterArchiveIndexes(indexes, (story) =>
      story.participants.some((participant) => participant.name === "Falcon"),
    );
    const topicIndexes = filterArchiveIndexes(indexes, (story) => story.topic === "浏览器评鉴官");

    expect(Object.keys(falconIndexes.calendarDays).sort()).toEqual([
      "2026-05-12",
      "2026-06-23",
      "2026-06-24",
    ]);
    expect(falconIndexes.peopleIndex["Falcon"].length).toBeGreaterThan(0);
    expect(falconIndexes.topicIndex["浏览器评鉴官"][0]?.anchorId).toBe("story-2026-06-24-01");
    expect(topicIndexes.searchEntries.every((entry) => entry.text.includes("浏览器评鉴官"))).toBe(true);
  });

  it("scans every HTML report and exposes matching static params", () => {
    const reports = loadAllReports();
    const params = getReportStaticParams();

    expect(reports).toHaveLength(totalReportCount);
    expect(reports[0]?.slug).toBe(latestReportSlug);
    expect(reports.map((report) => report.slug)).toEqual(
      [...new Set(reports.map((report) => report.slug))],
    );
    expect(params).toEqual(reports.map((report) => ({ slug: report.slug })));
  });

  it("exposes URL-encoded people and topic static params", () => {
    expect(encodeRouteName("ALSKai💥")).toBe("ALSKai%F0%9F%92%A5");
    expect(decodeRouteName("ALSKai%F0%9F%92%A5")).toBe("ALSKai💥");
    expect(getPeopleStaticParams()).toContainEqual({ name: "ALSKai%F0%9F%92%A5" });
    expect(getTopicStaticParams()).toContainEqual({
      name: encodeRouteName("浏览器评鉴官"),
    });
  });

  it("reports known PNG mismatches as warnings instead of hard failures", () => {
    const diagnostics = buildArchiveDiagnostics();

    expect(diagnostics.totalHtml).toBe(totalReportCount);
    expect(diagnostics.missingScreenshotSlugs).toEqual(["2026-05-23"]);
    expect(diagnostics.extraScreenshotFiles).toEqual([
      "🦞奇奇怪怪养龙虾群2026-05-27 → 2026-05-28_副本.png",
    ]);
    expect(diagnostics.errors).toEqual([]);
  });
});
