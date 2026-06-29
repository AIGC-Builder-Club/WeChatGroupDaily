import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const calendarSource = readFileSync("src/components/archive-calendar.tsx", "utf8");
const calendarStyles = readFileSync("src/components/archive-calendar.module.css", "utf8");
const globalStyles = readFileSync("src/app/globals.css", "utf8");
const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
const themeToggleSource = readFileSync("src/components/theme-toggle.tsx", "utf8");

function getFunctionSource(name: string): string {
  const start = calendarSource.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextFunction = calendarSource.indexOf("\nfunction ", start + 1);
  return calendarSource.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

function getStyleBlock(selector: string, occurrence = 0): string {
  let start = -1;
  let fromIndex = 0;

  for (let index = 0; index <= occurrence; index += 1) {
    start = calendarStyles.indexOf(`${selector} {`, fromIndex);
    expect(start).toBeGreaterThanOrEqual(0);
    fromIndex = start + 1;
  }

  const end = calendarStyles.indexOf("\n}", start);
  expect(end).toBeGreaterThanOrEqual(0);
  return calendarStyles.slice(start, end);
}

function getCssVar(styles: string, name: string): string {
  const match = styles.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  expect(match?.[1]).toBeDefined();
  return match?.[1] ?? "#000000";
}

function hexLuminance(hex: string): number {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  expect(channels).toHaveLength(3);

  return (
    0.2126 * (channels?.[0] ?? 0) +
    0.7152 * (channels?.[1] ?? 0) +
    0.0722 * (channels?.[2] ?? 0)
  );
}

describe("archive calendar UI layout contract", () => {
  it("adapts the newspaper palette into a cleaner light calendar theme", () => {
    const rootStyles = globalStyles.slice(
      globalStyles.indexOf(":root {"),
      globalStyles.indexOf("\n.dark {"),
    );
    const weekdayBackground = getCssVar(rootStyles, "--background");
    const weekendBackground = getCssVar(rootStyles, "--calendar-weekend");

    expect(rootStyles).toContain("--background: #ede5d0");
    expect(rootStyles).toContain("--foreground: #1a1815");
    expect(rootStyles).toContain("--primary: #b8443c");
    expect(rootStyles).toContain("--secondary: #e4d8bb");
    expect(rootStyles).toContain("--muted: #eee5cf");
    expect(rootStyles).toContain("--muted-foreground: #5f594d");
    expect(rootStyles).toContain("--border: #b7a57e");
    expect(rootStyles).toContain("--input: #bbaa82");
    expect(rootStyles).toContain("--sidebar: #ede5d0");
    expect(rootStyles).toContain("--context-panel: #f5eedf");
    expect(rootStyles).toContain("--calendar-month: #ede5d0");
    expect(rootStyles).toContain("--calendar-weekend: #ede5d0");
    expect(rootStyles).toContain("--calendar-outside-month: #e8ddc4");
    expect(weekendBackground).toBe(weekdayBackground);
    expect(rootStyles).toContain("--calendar-grid-border: #c9bfa2");
    expect(rootStyles).not.toContain("--calendar-grid-border: color-mix(in srgb, var(--border)");
    expect(rootStyles).not.toContain("rgba(61, 102, 116, 0.12)");
    expect(rootStyles).not.toContain("rgba(110, 88, 123, 0.12)");
    expect(rootStyles).not.toContain("rgba(26, 24, 21, 0.06)");
    expect(rootStyles).toContain("--event-red-bg: #fff0ea");
    expect(rootStyles).toContain("--event-orange-bg: #fff3e4");
    expect(rootStyles).toContain("--event-yellow-bg: #fff7d4");
    expect(rootStyles).toContain("--event-green-bg: #eff8e9");
    expect(rootStyles).toContain("--event-blue-bg: #edf8fb");
    expect(rootStyles).toContain("--event-purple-bg: #f6f0fb");
    expect(rootStyles).toContain("--event-gray-bg: #f3f0e9");
    expect(rootStyles).toContain("--event-blue-time: #1d647a");
    expect(rootStyles).toContain("--event-purple-time: #684b83");
    expect(rootStyles).toContain("--event-gray-time: #4f4a42");
  });

  it("defaults to dark mode and toggles only between light and dark", () => {
    const darkStyles = globalStyles.slice(globalStyles.indexOf(".dark {"));

    expect(darkStyles).toContain("--border: #333333");
    expect(darkStyles).toContain("--calendar-month: #191919");
    expect(darkStyles).toContain("--calendar-outside-month: #171717");
    expect(darkStyles).toContain("--calendar-weekend: #191919");
    expect(darkStyles).toContain("--calendar-grid-border: color-mix(in srgb, var(--border) 42%, transparent)");
    expect(darkStyles).not.toContain("--calendar-grid-border: #c9bfa2");

    expect(layoutSource).toContain('defaultTheme="dark"');
    expect(layoutSource).not.toContain('defaultTheme="system"');
    expect(layoutSource).not.toContain("enableSystem");

    expect(themeToggleSource).toContain("setTheme(theme === \"dark\" ? \"light\" : \"dark\")");
    expect(themeToggleSource).not.toContain("Laptop");
    expect(themeToggleSource).not.toContain("system");
    expect(themeToggleSource).not.toContain('setTheme("system")');
  });

  it("keeps the main toolbar split into left title controls and right actions", () => {
    const toolbar = getFunctionSource("CalendarToolbar");
    const toolbarStyles = getStyleBlock(".toolbar");
    const toolbarCenter = getStyleBlock(".toolbarCenter");
    const toolbarTitle = getStyleBlock(".toolbarTitle");
    const toolbarTitleMeta = getStyleBlock(".toolbarTitleMeta");
    const viewTabsStyles = getStyleBlock(".viewTabs");
    const activeViewTabStyles = getStyleBlock(".activeViewTab");

    expect(toolbar).toContain("styles.toolbarLeft");
    expect(toolbar).toContain("styles.toolbarCenter");
    expect(toolbar).toContain("styles.toolbarRight");
    expect(toolbar).toContain("styles.toolbarRightControls");
    expect(toolbar).toContain("styles.toolbarTitleMeta");
    expect(toolbar).not.toContain("className={styles.visibleCount}");
    expect(toolbar).toContain('format(displayDate, "yyyy 年 M 月"');
    expect(toolbar).toContain("<ArchiveViewTabs");
    expect(toolbar).not.toContain("<select");

    const viewTabs = getFunctionSource("ArchiveViewTabs");
    expect(viewTabs).toContain('role="tablist"');
    expect(viewTabs).toContain('role="tab"');
    expect(viewTabs).toContain("aria-selected");
    expect(viewTabs).toContain('aria-label="切换日历视图"');
    expect(viewTabs).not.toContain("<DropdownMenu>");
    expect(viewTabs).not.toContain("<select");
    expect(toolbarStyles).toContain("grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)");
    expect(toolbarCenter).toContain("justify-self: center");
    expect(toolbarTitle).toContain("display: flex");
    expect(toolbarTitle).toContain("flex-direction: column");
    expect(toolbarTitleMeta).toContain("font-size: 0.76rem");
    expect(toolbarTitleMeta).toContain("color: var(--muted-foreground)");
    expect(viewTabsStyles).toContain("grid-template-columns: repeat(3, minmax(0, 1fr))");
    expect(viewTabsStyles).toContain("background: var(--secondary)");
    expect(activeViewTabStyles).toContain("background: color-mix(in srgb, var(--background) 82%, var(--card))");
    expect(activeViewTabStyles).toContain("color: var(--foreground)");
  });

  it("renders clear filters with the same secondary button style as Today", () => {
    const toolbar = getFunctionSource("CalendarToolbar");
    const clearButtonStart = toolbar.indexOf("onClick={onClearFilters}");
    expect(clearButtonStart).toBeGreaterThanOrEqual(0);

    const clearButton = toolbar.slice(toolbar.lastIndexOf("<Button", clearButtonStart), toolbar.indexOf("清除筛选", clearButtonStart));
    expect(clearButton).toContain("className={styles.toolbarTextButton}");
    expect(clearButton).toContain('variant="secondary"');
  });

  it("renders the today navigator as a compact rounded button group", () => {
    const toolbar = getFunctionSource("CalendarToolbar");
    const toolbarDateControls = getStyleBlock(".toolbarDateControls");
    const toolbarDateButton = getStyleBlock(".toolbarDateButton");
    const toolbarNavButton = getStyleBlock(".toolbarNavButton");
    const toolbarTodayButton = getStyleBlock(".toolbarTodayButton");

    expect(toolbar).toContain("styles.toolbarDateControls");
    expect(toolbar).toContain("styles.toolbarTodayButton");
    expect(toolbar).toContain("styles.toolbarNavButton");
    expect(toolbar.indexOf('aria-label="上个月"')).toBeLessThan(toolbar.indexOf("今天"));
    expect(toolbar.indexOf("今天")).toBeLessThan(toolbar.indexOf('aria-label="下个月"'));
    expect(toolbar).toContain('variant="secondary"');

    expect(toolbarDateControls).toContain("display: flex");
    expect(toolbarDateControls).toContain("gap: 4px");
    expect(toolbarDateButton).toContain("border-radius: 6px");
    expect(toolbarDateButton).toContain("background: var(--secondary)");
    expect(toolbarNavButton).toContain("width: 2rem");
    expect(toolbarNavButton).toContain("height: 2rem");
    expect(toolbarTodayButton).toContain("min-width: 3.5rem");
    expect(toolbarTodayButton).toContain("height: 2rem");
    expect(toolbarTodayButton).toContain("font-size: 0.82rem");
  });

  it("uses compact event times and one-line month cards", () => {
    const timelineEventCard = getFunctionSource("TimelineEventCard");
    const timelineView = getFunctionSource("TimelineView");
    const eventPill = getFunctionSource("EventPill");
    const formatTimelineEventTime = getFunctionSource("formatTimelineEventTime");
    const formatMonthEventTime = getFunctionSource("formatMonthEventTime");
    const compactEventStyles = getStyleBlock(".compactEvent");
    const monthEventTimeStyles = getStyleBlock(".monthEventTime");

    expect(timelineView).toContain("view={view}");
    expect(timelineEventCard).toContain("view: \"week\" | \"day\"");
    expect(timelineEventCard).toContain("formatTimelineEventTime(event, view)");
    expect(timelineEventCard).toContain("event.title");
    expect(timelineEventCard).not.toContain("timelineStoryNo");
    expect(eventPill).toContain("formatTimelineEventTime(event)");
    expect(eventPill).toContain("event.title");
    expect(eventPill).not.toContain("timelineStoryNo");
    expect(eventPill).toContain("formatMonthEventTime(event)");
    expect(eventPill).toContain("styles.monthEventTime");
    expect(eventPill).toContain("styles.monthEventTopic");
    expect(eventPill).toContain("compact ? styles.compactEvent : \"\"");
    expect(formatTimelineEventTime).toContain('view === "week"');
    expect(formatTimelineEventTime).toContain("formatMonthEventTime(event)");
    expect(formatTimelineEventTime).toContain("formatArchiveEventTime(event)");
    expect(formatMonthEventTime).toContain("minutes === 0");
    expect(formatMonthEventTime).toContain('format(event.start, "h a")');
    expect(formatMonthEventTime).toContain('format(event.start, "h:mm a")');
    expect(compactEventStyles).toContain("display: flex");
    expect(compactEventStyles).toContain("height: 1.25rem");
    expect(compactEventStyles).toContain("border: 0");
    expect(compactEventStyles).toContain("border-left: 3px solid var(--event-border)");
    expect(compactEventStyles).toContain("background: transparent");
    expect(compactEventStyles).toContain("padding: 0 0.25rem 0 0.3125rem");
    expect(monthEventTimeStyles).toContain("color: var(--event-time-ink)");
    expect(monthEventTimeStyles).toContain("font-size: 0.6875rem");
    expect(monthEventTimeStyles).toContain("font-weight: 400");

    const monthEventTopicStyles = getStyleBlock(".monthEventTopic");
    expect(monthEventTopicStyles).toContain("color: var(--event-title-ink)");
    expect(monthEventTopicStyles).toContain("font-size: 0.6875rem");
    expect(monthEventTopicStyles).toContain("font-weight: 700");
  });

  it("renders week and day timeline cards as compact month-style cards with a two-line title", () => {
    const timelineEventCard = getFunctionSource("TimelineEventCard");
    const timelineEventCardStyles = getStyleBlock(".timelineEventCard");
    const timelineEventMetaStyles = getStyleBlock(".timelineEventMeta");
    const timelineEventTitleStyles = getStyleBlock(".timelineEventTitle");

    expect(timelineEventCard).toContain("styles.timelineEventMeta");
    expect(timelineEventCard).toContain("styles.timelineTopic");
    expect(timelineEventCard).toContain("styles.timelineEventTitle");
    expect(timelineEventCard).not.toContain("<p>");

    expect(timelineEventCardStyles).toContain("gap: 2px");
    expect(timelineEventCardStyles).toContain("height: var(--timeline-event-card-height)");
    expect(timelineEventCardStyles).toContain("min-height: 0");
    expect(timelineEventCardStyles).toContain("padding: 0.375rem 0.375rem 0.375rem 0.3125rem");
    expect(timelineEventCardStyles).toContain("border: 0");
    expect(timelineEventCardStyles).toContain("border-left: 3px solid var(--event-border)");
    expect(timelineEventCardStyles).toContain("background: transparent");
    expect(timelineEventCardStyles).toContain("border-radius: 2px");
    expect(timelineEventCardStyles).not.toContain("box-shadow");

    expect(timelineEventMetaStyles).toContain("font-size: 0.6875rem");
    expect(timelineEventMetaStyles).toContain("font-weight: 400");

    expect(timelineEventTitleStyles).toContain("-webkit-line-clamp: 2");
    expect(timelineEventTitleStyles).toContain("-webkit-box-orient: vertical");
    expect(timelineEventTitleStyles).toContain("display: -webkit-box");
    expect(timelineEventTitleStyles).toContain("overflow: hidden");
    expect(timelineEventTitleStyles).toContain("line-height: 1.2");
  });

  it("fills selected month cards with their event color and white text", () => {
    const selectedEventStyles = getStyleBlock(".selectedEvent");
    const selectedEventHoverStyles = getStyleBlock(".selectedEvent.compactEvent:hover");
    const selectedEventTimeStyles = getStyleBlock(".selectedEvent .monthEventTime");
    const selectedEventTopicStyles = getStyleBlock(".selectedEvent .monthEventTopic");

    expect(selectedEventStyles).toContain("background: var(--event-ink)");
    expect(selectedEventStyles).toContain("color: #fff");
    expect(selectedEventStyles).toContain("border-left-color: transparent");
    expect(selectedEventStyles).not.toContain("box-shadow");
    expect(selectedEventHoverStyles).toContain("background: var(--event-ink)");
    expect(selectedEventTimeStyles).toContain("color: #fff");
    expect(selectedEventTopicStyles).toContain("color: #fff");
  });

  it("adds month switching controls to the sidebar mini calendar header", () => {
    const miniDatePicker = getFunctionSource("MiniDatePicker");
    const sectionHeader = getStyleBlock(".sectionHeader");
    const sectionHeaderTitle = getStyleBlock(".sectionHeaderTitle");

    expect(miniDatePicker).toContain("onNavigateMonth");
    expect(miniDatePicker).toContain('aria-label="上个月"');
    expect(miniDatePicker).toContain('aria-label="下个月"');
    expect(miniDatePicker).not.toContain("<CalendarDays");
    expect(miniDatePicker.indexOf('aria-label="上个月"')).toBeLessThan(
      miniDatePicker.indexOf('format(monthDisplayDate, "yyyy 年 M 月"'),
    );
    expect(miniDatePicker.indexOf('aria-label="下个月"')).toBeGreaterThan(
      miniDatePicker.indexOf('format(monthDisplayDate, "yyyy 年 M 月"'),
    );
    expect(sectionHeader).toContain("display: grid");
    expect(sectionHeader).toContain("grid-template-columns: 28px minmax(0, 1fr) 28px");
    expect(sectionHeaderTitle).toContain("text-align: center");
  });

  it("opens the right day event list when clicking a mini calendar date", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const miniDatePicker = getFunctionSource("MiniDatePicker");
    const miniDayStart = miniDatePicker.indexOf("styles.miniDay");
    expect(miniDayStart).toBeGreaterThanOrEqual(0);

    const miniDayButton = miniDatePicker.slice(
      miniDatePicker.lastIndexOf("<button", miniDayStart),
      miniDatePicker.indexOf("</button>", miniDayStart),
    );
    const miniDayStyles = getStyleBlock(".miniDay");
    const miniDayHoverStyles = getStyleBlock(".miniDay:hover");

    expect(appSource).toContain("onSelectDate={selectDayEvents}");
    expect(miniDatePicker).toContain("onSelectDate");
    expect(miniDatePicker).not.toContain("styles.selectedMiniDay");
    expect(miniDayButton).toContain("onSelectDate(day)");
    expect(miniDayButton).toContain('aria-label={`在详情栏查看 ${format(day, "M月d日")} 当天事件`}');
    expect(miniDayButton).not.toContain("aria-pressed=");
    expect(miniDayButton).toContain("<button");
    expect(miniDayButton).not.toContain("<span");
    expect(miniDayStyles).toContain("cursor: pointer");
    expect(miniDayHoverStyles).toContain("background: var(--accent)");
    expect(calendarStyles).not.toContain(".selectedMiniDay");
  });

  it("passes report-level overviews into the right day detail without adding fake events", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const detailPanel = getFunctionSource("DetailPanel");

    expect(appSource).toContain("reportOverviewsByDay");
    expect(appSource).toContain("selectedDayReportOverviews");
    expect(appSource).toContain("getReportOverviewsForDay(reports)");
    expect(appSource).toContain("reportOverviews={selectedDayReportOverviews}");
    expect(appSource).toContain("toArchiveCalendarEvents(reports)");
    expect(appSource).not.toContain("report.stories.concat");
    expect(appSource).not.toContain('title: "今日总结"');
    expect(detailPanel).toContain("reportOverviews");
    expect(detailPanel).toContain("ArchiveDayReportOverview");
  });

  it("renders day report summary and highlights before story cards", () => {
    const detailPanel = getFunctionSource("DetailPanel");
    const reportOverview = getFunctionSource("ArchiveDayReportOverview");
    const summaryStyles = getStyleBlock(".reportOverview");
    const highlightsStyles = getStyleBlock(".reportHighlights");
    const highlightRowStyles = getStyleBlock(".reportHighlightRow");

    expect(detailPanel.indexOf("ArchiveDayReportOverview")).toBeLessThan(
      detailPanel.indexOf("styles.detailDayEvents"),
    );
    expect(reportOverview).toContain("今日总结");
    expect(reportOverview).toContain("今日高光");
    expect(reportOverview).toContain("overview.title");
    expect(reportOverview).toContain("overview.leadText");
    expect(reportOverview).toContain("overview.highlights.map");
    expect(reportOverview).toContain("AvatarBadge");
    expect(reportOverview).toContain("highlight.tag");
    expect(reportOverview).toContain("highlight.desc");
    expect(summaryStyles).toContain("display: grid");
    expect(getStyleBlock(".reportSummary,\n.reportHighlights")).toContain("border: 1px solid var(--border)");
    expect(highlightsStyles).toContain("display: grid");
    expect(highlightRowStyles).toContain("grid-template-columns: auto minmax(0, 1fr)");
  });

  it("combines people and topic filters behind a sidebar tab switcher", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const avatarBadge = getFunctionSource("AvatarBadge");
    const activeFilterTabStyles = getStyleBlock(".activeSidebarFilterTab");
    const activeFilterItemStyles = getStyleBlock(".peopleList button.activeFilterItem,\n.topicList button.activeTopic");
    const detailPeopleStyles = getStyleBlock(".detailPeople a");

    expect(appSource).toContain("<SidebarFilterTabs");
    expect(appSource).not.toContain("<PeopleFilter");
    expect(appSource).not.toContain("<TopicFilter");
    expect(avatarBadge).toContain('<Avatar className="rounded-md">');
    expect(activeFilterTabStyles).toContain("background: color-mix(in srgb, var(--background) 82%, var(--card))");
    expect(activeFilterTabStyles).toContain("color: var(--foreground)");
    expect(activeFilterItemStyles).toContain("background: var(--accent)");
    expect(activeFilterItemStyles).toContain("color: inherit");
    expect(detailPeopleStyles).toContain("border-radius: 6px");
  });

  it("lets the sidebar filter list fill remaining space above the footer", () => {
    const sidebarFilterSection = getStyleBlock(".sidebarFilterSection");
    const sidebarFilterPanel = getStyleBlock(".sidebarFilterPanel");
    const peopleList = getStyleBlock(".peopleList,\n.topicList");
    const sidebarFooter = getStyleBlock(".sidebarFooter");

    expect(sidebarFilterSection).toContain("flex: 1");
    expect(sidebarFilterSection).toContain("min-height: 0");
    expect(sidebarFilterSection).toContain("grid-template-rows: auto minmax(0, 1fr)");
    expect(sidebarFilterSection).toContain("border-bottom: 0");
    expect(sidebarFilterPanel).toContain("min-height: 0");
    expect(peopleList).toContain("height: 100%");
    expect(peopleList).not.toContain("max-height: 34vh");
    expect(sidebarFooter).not.toContain("margin-top: auto");
  });

  it("hides the native search clear control beside the custom clear button", () => {
    const sidebarSearch = getFunctionSource("SidebarSearch");

    expect(sidebarSearch).toContain('type="search"');
    expect(sidebarSearch).toContain('aria-label="清空搜索"');
    expect(calendarStyles).toContain(".sidebarSearch input::-webkit-search-cancel-button");
    expect(calendarStyles).toContain("-webkit-appearance: none");
    expect(calendarStyles).toContain("appearance: none");
  });

  it("keeps the desktop calendar shell viewport-bound with calendar-internal scrolling", () => {
    const appShell = getStyleBlock(".appShell");
    const calendarPane = getStyleBlock(".calendarPane");
    const calendarSurface = getStyleBlock(".calendarSurface");
    const weekdayRow = getStyleBlock(".weekdayRow", 1);
    const monthCell = getStyleBlock(".monthCell");
    const monthLastColumnCell = getStyleBlock(".monthCell:nth-child(7n)");
    const outsideMonth = getStyleBlock(".outsideMonth");
    const timelineView = getStyleBlock(".timelineView");

    expect(appShell).toContain("height: 100dvh");
    expect(appShell).toContain("overflow: hidden");
    expect(calendarPane).toContain("height: 100%");
    expect(calendarPane).toContain("min-height: 0");
    expect(calendarSurface).toContain("height: 100%");
    expect(calendarSurface).toContain("min-height: 0");
    expect(weekdayRow).toContain("border-bottom: 1px solid var(--calendar-grid-border)");
    expect(monthCell).toContain("border-right: 1px solid var(--calendar-grid-border)");
    expect(monthCell).toContain("border-bottom: 1px solid var(--calendar-grid-border)");
    expect(monthCell).toContain("background: var(--calendar-month)");
    expect(outsideMonth).toContain("background: var(--calendar-outside-month)");
    expect(monthLastColumnCell).toContain("border-right: 0");
    expect(calendarStyles).not.toContain(".monthCell:nth-child(7n),");
    expect(timelineView).toContain("height: 100%");
    expect(timelineView).toContain("overflow: auto");
  });

  it("aligns the right detail header height with the main calendar toolbar", () => {
    const toolbar = getStyleBlock(".toolbar");
    const detailHeader = getStyleBlock(".detailHeader");

    expect(toolbar).toContain("min-height: 56px");
    expect(toolbar).toContain("padding: 8px 12px");
    expect(detailHeader).toContain("min-height: 56px");
    expect(detailHeader).toContain("padding: 8px 12px");
  });

  it("keeps the unselected right detail empty state visually quiet", () => {
    const detailPanel = getFunctionSource("DetailPanel");
    const emptyBranchStart = detailPanel.indexOf("if (!event)");
    const emptyBranch = detailPanel.slice(
      emptyBranchStart,
      detailPanel.indexOf("\n\n  return (", emptyBranchStart),
    );
    const emptyDetailHeading = getStyleBlock(".emptyDetail h2");

    expect(emptyBranch).not.toContain("Details");
    expect(emptyBranch).toContain('aria-label="收起详情栏"');
    expect(emptyBranch).toContain("<h2>暂无故事</h2>");
    expect(emptyDetailHeading).toContain("color: var(--muted-foreground)");
    expect(emptyDetailHeading).not.toContain("color: var(--foreground)");
  });

  it("opens raw HTML reports with a document navigation instead of app routing", () => {
    const detailPanel = getFunctionSource("DetailPanel");
    const rawLinkStart = detailPanel.indexOf("event.meta.rawHtmlHref");
    expect(rawLinkStart).toBeGreaterThanOrEqual(0);

    const rawLinkMarkup = detailPanel.slice(
      detailPanel.lastIndexOf("<Button", rawLinkStart),
      detailPanel.indexOf("</Button>", rawLinkStart),
    );

    expect(rawLinkMarkup).toContain("<a href={event.meta.rawHtmlHref}");
    expect(rawLinkMarkup).not.toContain("<Link href={event.meta.rawHtmlHref}");
  });

  it("collapses the left sidebar with a gap element instead of squeezing contents", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const leftSidebar = getStyleBlock(".leftSidebar");
    const leftSidebarGap = getStyleBlock(".leftSidebarGap");

    expect(appSource).toContain("styles.leftSidebarFrame");
    expect(appSource).toContain("styles.leftSidebarGap");
    expect(leftSidebar).toContain("position: fixed");
    expect(leftSidebar).not.toContain("background: var(--context-panel)");
    expect(leftSidebar).toContain("transform: translateX(0)");
    expect(leftSidebarGap).toContain("transition: width 180ms ease");
  });

  it("highlights today by filling the date number, not outlining the whole cell", () => {
    const monthView = getFunctionSource("MonthView");
    const todayCell = getStyleBlock(".todayCell");
    const todayDayNumber = getStyleBlock(".todayDayNumber");
    const todayMiniDay = getStyleBlock(".todayMiniDay");

    expect(monthView).toContain("styles.todayDayNumber");
    expect(todayCell).not.toContain("inset 0 0 0 2px");
    expect(todayDayNumber).toContain("background: var(--primary)");
    expect(todayMiniDay).toContain("background: var(--primary)");
  });

  it("shows the full day event list in the right sidebar when clicking a month date number without moving the month view", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const monthView = getFunctionSource("MonthView");
    const dayNumberStart = monthView.indexOf("styles.dayNumber");
    expect(dayNumberStart).toBeGreaterThanOrEqual(0);

    const dayNumberButton = monthView.slice(
      monthView.lastIndexOf("<button", dayNumberStart),
      monthView.indexOf("</button>", dayNumberStart),
    );

    const selectDayEventsStart = appSource.indexOf("const selectDayEvents = useCallback");
    expect(selectDayEventsStart).toBeGreaterThanOrEqual(0);

    const selectDayEvents = appSource.slice(
      selectDayEventsStart,
      appSource.indexOf("const goToToday", selectDayEventsStart),
    );

    expect(selectDayEvents).toContain("const selectedDate = startOfDay(date)");
    expect(selectDayEvents).toContain("setSelectedDayDate(selectedDate)");
    expect(selectDayEvents).toContain("setSelectedEventId(null)");
    expect(selectDayEvents).toContain("setRightOpen(true)");
    expect(selectDayEvents).not.toContain("setCurrentDate(selectedDate)");
    expect(selectDayEvents).not.toContain('setView("day")');
    expect(appSource).toContain("onOpenDayEvents={selectDayEvents}");
    expect(dayNumberButton).toContain("onOpenDayEvents(day)");
    expect(dayNumberButton).not.toContain("onOpenDay(day)");
  });

  it("drives month scrolling through free wheel offsets and buffered week rows", () => {
    const monthView = getFunctionSource("MonthView");
    const verticalScroll = getFunctionSource("useVerticalScroll");
    const monthGrid = getStyleBlock(".monthGrid");
    const monthGridContent = getStyleBlock(".monthGridContent");

    expect(monthView).toContain("buildBufferedMonthRows");
    expect(monthView).toContain("getDominantVisibleMonthDate");
    expect(monthView).toContain("onDisplayDateChange(dominantVisibleMonthDate)");
    expect(monthView).toContain("isSameMonth(day, displayDate)");
    expect(monthView).toContain("scrollContainerRef");
    expect(monthView).toContain("useVerticalScroll");
    expect(monthView).toContain("scrollStyle");
    expect(monthView).not.toContain("snapAnimationMs");
    expect(verticalScroll).toContain("normalizeContinuousScrollOffset");
    expect(verticalScroll).toContain("onNavigateRef.current(-unitDelta)");
    expect(verticalScroll).toContain("Math.abs(event.deltaY) <= Math.abs(event.deltaX)");
    expect(verticalScroll).toContain("event.preventDefault()");
    expect(verticalScroll).not.toContain("Math.round");
    expect(verticalScroll).not.toContain("scrollEndTimer");
    expect(monthGrid).toContain("overflow: hidden");
    expect(monthGridContent).toContain("grid-template-columns: repeat(7, minmax(0, 1fr))");
  });

  it("sizes buffered month rows from the container before measurement", () => {
    const monthView = getFunctionSource("MonthView");

    expect(calendarSource).not.toContain("monthInitialRowHeight");
    expect(monthView).toContain("const [measuredRowHeight, setMeasuredRowHeight] = useState(0)");
    expect(monthView).toContain("const monthGridHeightPercent = (bufferedRows.length / monthVisibleRowCount) * 100");
    expect(monthView).toContain("const bufferedRowOffsetPercent = (dynamicBuffer / bufferedRows.length) * 100");
    expect(monthView).toContain("height: `${monthGridHeightPercent}%`");
    expect(monthView).toContain("gridTemplateRows: `repeat(${bufferedRows.length}, minmax(0, 1fr))`");
    expect(monthView).toContain("translateY(calc(-${bufferedRowOffsetPercent}% ${scrollOffsetOperator} ${Math.abs(scrollOffset)}px))");
    expect(monthView).not.toContain("gridTemplateRows: `repeat(${bufferedRows.length}, ${monthRowHeight}px)`");
    expect(monthView).not.toContain("rowHeight || 94");
  });

  it("shows only three month events before the expandable overflow affordance", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const monthView = getFunctionSource("MonthView");
    const monthEvents = getStyleBlock(".monthEvents");
    const moreEvents = getStyleBlock(".moreEvents");

    expect(appSource).toContain("const selectDayEvents = useCallback");
    expect(appSource).toContain("setSelectedDayDate(selectedDate)");
    expect(appSource).toContain("onOpenDayEvents={selectDayEvents}");
    expect(monthView).toContain("dayEvents.slice(0, 3)");
    expect(monthView).toContain("dayEvents.length > 3");
    expect(monthView).toContain("剩余 {hiddenDayEventCount} 条");
    expect(monthView).not.toContain("展开剩余 {hiddenDayEventCount} 条");
    expect(monthView).toContain("onOpenDayEvents(day)");
    expect(monthEvents).toContain("display: grid");
    expect(moreEvents).toContain("cursor: pointer");
    expect(moreEvents).toContain("font-size: 0.6875rem");
    expect(moreEvents).toContain("font-weight: 400");
    expect(moreEvents).toContain("border: 0");
    expect(moreEvents).toContain("background: transparent");
    expect(moreEvents).not.toContain("border: 1px dashed");
    expect(getStyleBlock(".moreEvents:hover")).not.toContain("background:");
  });

  it("renders day-list details with the full report action pinned below the scroll area", () => {
    const detailPanel = getFunctionSource("DetailPanel");
    const dayDateBranch = detailPanel.slice(
      detailPanel.indexOf("if (dayDate)"),
      detailPanel.indexOf("if (!event)"),
    );
    const detailPanelStyles = getStyleBlock(".detailPanel");
    const detailDayEvents = getStyleBlock(".detailDayEvents");
    const detailDayEvent = getStyleBlock(".detailDayEvent", 1);
    const detailDayEventHover = getStyleBlock(".detailDayEvent:hover");
    const detailDayEventDescription = getStyleBlock(".detailDayEvent p");
    const quoteBlock = getStyleBlock(".quoteList blockquote");
    const rawLink = getStyleBlock(".rawLink");

    expect(detailPanel).toContain("dayEvents");
    expect(detailPanel).toContain(
      "const fullReportHref = reportOverviews[0]?.rawHtmlHref ?? dayEvents[0]?.meta.rawHtmlHref",
    );
    expect(dayDateBranch).toContain('format(dayDate, "yyyy 年 M 月 d 日 EEEE"');
    expect(dayDateBranch).not.toContain('format(dayDate, "yyyy年M月d日 EEEE"');
    expect(dayDateBranch).toContain("styles.detailHeaderTitle");
    expect(dayDateBranch).toContain("styles.detailHeaderBackSlot");
    expect(detailPanel).toContain("styles.detailDayEvents");
    expect(detailPanel).toContain("dayEvents.map((dayEvent)");
    expect(detailPanel).toContain("onSelectEvent(dayEvent)");
    expect(detailPanel).toContain("打开完整日报");
    expect(detailPanel.indexOf("className={styles.detailScroll}")).toBeLessThan(
      detailPanel.indexOf("className={styles.rawLink}"),
    );
    expect(detailPanelStyles).toContain("grid-template-rows: auto minmax(0, 1fr) auto");
    expect(detailDayEvents).toContain("display: grid");
    expect(detailDayEvent).toContain("border: 0");
    expect(detailDayEvent).toContain("border-left: 3px solid var(--event-border)");
    expect(detailDayEvent).toContain("border-radius: 2px");
    expect(detailDayEvent).toContain("background: color-mix(in srgb, var(--event-bg) 68%, transparent)");
    expect(detailDayEventHover).toContain("background: var(--accent)");
    expect(detailDayEventDescription).toContain("color: color-mix(in srgb, var(--foreground) 70%, transparent)");
    expect(quoteBlock).toContain("background: var(--card)");
    expect(rawLink).toContain("color: #fff");
    expect(rawLink).toContain("background: var(--primary)");
  });

  it("shows a back button in event details that returns to the event day list", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const detailPanel = getFunctionSource("DetailPanel");
    const detailHeaderBack = getStyleBlock(".detailHeaderBack");
    const detailHeaderTitle = getStyleBlock(".detailHeaderTitle");

    const selectEventStart = appSource.indexOf("const selectEvent = useCallback");
    expect(selectEventStart).toBeGreaterThanOrEqual(0);

    const selectEvent = appSource.slice(
      selectEventStart,
      appSource.indexOf("const clearSelectedEvent", selectEventStart),
    );

    expect(appSource).toContain("const [detailReturnDayDate, setDetailReturnDayDate] = useState<Date | null>(null)");
    expect(appSource).toContain(
      "const resolvedDetailReturnDayDate = detailReturnDayDate ?? (selectedEvent ? startOfDay(selectedEvent.start) : null)",
    );
    expect(appSource).toContain("const returnToDayEvents = useCallback");
    expect(appSource).toContain("setSelectedDayDate(resolvedDetailReturnDayDate)");
    expect(appSource).toContain("onReturnToDayEvents={returnToDayEvents}");
    expect(appSource).toContain("returnDayDate={resolvedDetailReturnDayDate}");
    expect(selectEvent).toContain("setDetailReturnDayDate(startOfDay(event.start))");

    expect(detailPanel).toContain("returnDayDate");
    expect(detailPanel).toContain("onReturnToDayEvents");
    expect(detailPanel).toContain("styles.detailHeaderBack");
    expect(detailPanel).toContain('aria-label="返回当天事件"');
    expect(detailPanel).toContain("<ChevronLeft />");
    expect(detailPanel).toContain("styles.detailHeaderBackSlot");
    expect(detailPanel).toContain("styles.detailHeaderTitle");
    expect(detailPanel).toContain("returnDayDate ? styles.detailHeaderBackSlotActive :");

    expect(detailHeaderBack).toContain("display: inline-flex");
    expect(detailHeaderBack).toContain("align-items: center");
    expect(detailHeaderTitle).toContain("display: grid");
    expect(detailHeaderTitle).toContain("align-items: center");
    expect(detailHeaderTitle).toContain("grid-template-columns: 1.75rem minmax(0, 1fr)");
  });

  it("renders month events with the same card vocabulary as week and day events", () => {
    const eventPill = getFunctionSource("EventPill");
    const eventPillStyles = getStyleBlock(".eventPill");
    const compactEventStyles = getStyleBlock(".compactEvent");

    expect(eventPill).toContain("styles.timelineEventMeta");
    expect(eventPill).not.toContain("styles.timelineStoryNo");
    expect(eventPill).toContain("styles.timelineTopic");
    expect(eventPill).toContain("formatTimelineEventTime(event)");
    expect(eventPillStyles).toContain("border-left: 4px solid var(--event-ink)");
    expect(eventPillStyles).toContain("linear-gradient");
    expect(compactEventStyles).toContain("display: flex");
    expect(compactEventStyles).toContain("height: 1.25rem");
    expect(compactEventStyles).toContain("padding: 0 0.25rem 0 0.3125rem");
  });

  it("matches the reference week and day views by handling free horizontal wheel navigation", () => {
    const timelineView = getFunctionSource("TimelineView");
    const horizontalScroll = getFunctionSource("useHorizontalScroll");

    expect(timelineView).toContain("timelineScrollRef");
    expect(timelineView).toContain("dayColumnWidth");
    expect(timelineView).toContain("scrollUnitWidth");
    expect(timelineView).toContain("daysPerScrollUnit");
    expect(timelineView).toContain("useHorizontalScroll");
    expect(timelineView).toContain("scrollStyle");
    expect(timelineView).not.toContain("snapAnimationMs");
    expect(horizontalScroll).toContain("normalizeContinuousScrollOffset");
    expect(horizontalScroll).toContain("onNavigateRef.current(-unitDelta * daysPerScrollUnit)");
    expect(horizontalScroll).toContain("Math.abs(event.deltaX) <= Math.abs(event.deltaY)");
    expect(horizontalScroll).toContain("event.preventDefault()");
    expect(horizontalScroll).not.toContain("Math.round");
    expect(horizontalScroll).not.toContain("scrollEndTimer");
  });

  it("renders all-day timeline stories in the hourly grid instead of a separate lane", () => {
    const timelineView = getFunctionSource("TimelineView");

    expect(timelineView).not.toContain("layout?.allDayEvents");
    expect(timelineView).not.toContain("styles.timelineAllDayList");
    expect(timelineView).not.toContain('variant="all-day"');
    expect(calendarStyles).not.toContain(".timelineAllDayList");
    expect(calendarStyles).not.toContain(".timelineAllDayCard");
  });

  it("does not draw hourly grid lines through the time axis labels", () => {
    const timelineAxisCell = getStyleBlock(".timelineAxis div");

    expect(timelineAxisCell).toContain("position: relative");
    expect(timelineAxisCell).not.toContain("border-bottom");
  });

  it("leaves empty timeline columns blank instead of showing placeholder text", () => {
    const timelineView = getFunctionSource("TimelineView");

    expect(timelineView).not.toContain("No stories");
    expect(timelineView).toContain('view === "day" && dayEvents.length === 0');
    expect(timelineView).toContain("styles.emptyDay");
    expect(timelineView).toContain("今天没有数据");
    expect(calendarStyles).toContain(".emptyDay");
  });

  it("keeps the visible calendar position unchanged when selecting an event", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const selectEventStart = appSource.indexOf("const selectEvent = useCallback");
    expect(selectEventStart).toBeGreaterThanOrEqual(0);

    const selectEvent = appSource.slice(
      selectEventStart,
      appSource.indexOf("const clearFilters", selectEventStart),
    );

    expect(selectEvent).toContain("setSelectedEventId(event.id)");
    expect(selectEvent).toContain("setRightOpen(true)");
    expect(selectEvent).not.toContain("setCurrentDate");
  });

  it("clears the selected event when clicking blank calendar space", () => {
    const appSource = getFunctionSource("ArchiveCalendar");
    const clearSelectionStart = appSource.indexOf("const clearSelectedEvent = useCallback");
    expect(clearSelectionStart).toBeGreaterThanOrEqual(0);

    const clearSelection = appSource.slice(
      clearSelectionStart,
      appSource.indexOf("const handleQueryChange", clearSelectionStart),
    );

    expect(clearSelection).toContain("target?.closest");
    expect(clearSelection).toContain("button, a, input, textarea, select");
    expect(clearSelection).toContain("setSelectedEventId(null)");
    expect(appSource).toContain("onClick={clearSelectedEvent}");
  });

  it("defaults the detail panel selection to the first event in the current view", () => {
    const appSource = getFunctionSource("ArchiveCalendar");

    expect(appSource).toContain("const defaultSelectedEventId = useMemo(");
    expect(appSource).toContain("const resolvedSelectedEventId = getResolvedSelectedEventId({");
    expect(appSource).toContain("defaultSelectedEventId,");
    expect(appSource).toContain("events: filteredEvents,");
    expect(appSource).toContain("selectedEventId,");
    expect(appSource).toContain("filteredEvents.find((event) => event.id === resolvedSelectedEventId)");
    expect(appSource).toContain("resolveDefaultSelectedEventId({");
    expect(appSource).not.toContain("filteredEvents[0] ?? null");
  });

  it("does not recompute the selected detail card while month scrolling changes the visible range", () => {
    const appSource = getFunctionSource("ArchiveCalendar");

    expect(appSource).toContain("const defaultSelectedEventId = useMemo(");
    expect(appSource).toContain("const [monthDisplayDate, setMonthDisplayDate] = useState");
    expect(appSource).toContain("view === \"month\" ? monthDisplayDate : currentDate");
    expect(appSource).toContain("const navigateMonth = useCallback((direction: -1 | 1) => {");
    expect(appSource).toContain("const navigationDate = view === \"month\" ? monthDisplayDate : currentDate;");
    expect(appSource).toContain("const nextDate = addMonths(navigationDate, direction);");
    expect(appSource).toContain("setCurrentDate(nextDate);");
    expect(appSource).toContain("setMonthDisplayDate(startOfMonth(nextDate));");
    expect(appSource).toContain("if (view !== \"month\") {");
    expect(appSource).toContain("selectDefaultEvent({ nextCurrentDate: nextDate });");
    expect(appSource).toContain("const resolvedSelectedEventId = getResolvedSelectedEventId({");
  });
});
