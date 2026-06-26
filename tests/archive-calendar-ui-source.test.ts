import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const calendarSource = readFileSync("src/components/archive-calendar.tsx", "utf8");
const calendarStyles = readFileSync("src/components/archive-calendar.module.css", "utf8");

function getFunctionSource(name: string): string {
  const start = calendarSource.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextFunction = calendarSource.indexOf("\nfunction ", start + 1);
  return calendarSource.slice(start, nextFunction === -1 ? undefined : nextFunction);
}

function getStyleBlock(selector: string): string {
  const start = calendarStyles.indexOf(`${selector} {`);
  expect(start).toBeGreaterThanOrEqual(0);

  const end = calendarStyles.indexOf("\n}", start);
  expect(end).toBeGreaterThanOrEqual(0);
  return calendarStyles.slice(start, end);
}

describe("archive calendar UI layout contract", () => {
  it("keeps the main toolbar split into left title controls and right actions", () => {
    const toolbar = getFunctionSource("CalendarToolbar");
    const toolbarStyles = getStyleBlock(".toolbar");
    const toolbarCenter = getStyleBlock(".toolbarCenter");
    const toolbarTitle = getStyleBlock(".toolbarTitle");
    const toolbarTitleMeta = getStyleBlock(".toolbarTitleMeta");
    const viewTabsStyles = getStyleBlock(".viewTabs");

    expect(toolbar).toContain("styles.toolbarLeft");
    expect(toolbar).toContain("styles.toolbarCenter");
    expect(toolbar).toContain("styles.toolbarRight");
    expect(toolbar).toContain("styles.toolbarRightControls");
    expect(toolbar).toContain("styles.toolbarTitleMeta");
    expect(toolbar).not.toContain("className={styles.visibleCount}");
    expect(toolbar).toContain('format(currentDate, "yyyy 年 M 月"');
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
    expect(eventPill).not.toContain("styles.monthEventTitle");
    expect(eventPill).toContain("compact ? styles.compactEvent : \"\"");
    expect(formatTimelineEventTime).toContain('view === "week"');
    expect(formatTimelineEventTime).toContain("formatMonthEventTime(event)");
    expect(formatTimelineEventTime).toContain("formatArchiveEventTime(event)");
    expect(formatMonthEventTime).toContain("minutes === 0");
    expect(formatMonthEventTime).toContain('format(event.start, "h a")');
    expect(formatMonthEventTime).toContain('format(event.start, "h:mm a")');
    expect(compactEventStyles).toContain("display: flex");
    expect(compactEventStyles).toContain("height: 1.25rem");
    expect(compactEventStyles).toContain("padding: 0 0.375rem 0 0.5rem");
    expect(monthEventTimeStyles).toContain("color: var(--event-ink)");
    expect(monthEventTimeStyles).toContain("font-weight: 400");
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
      miniDatePicker.indexOf('format(currentDate, "yyyy 年 M 月"'),
    );
    expect(miniDatePicker.indexOf('aria-label="下个月"')).toBeGreaterThan(
      miniDatePicker.indexOf('format(currentDate, "yyyy 年 M 月"'),
    );
    expect(sectionHeader).toContain("display: grid");
    expect(sectionHeader).toContain("grid-template-columns: 28px minmax(0, 1fr) 28px");
    expect(sectionHeaderTitle).toContain("text-align: center");
  });

  it("keeps mini calendar days read-only without selected or hover states", () => {
    const miniDatePicker = getFunctionSource("MiniDatePicker");

    expect(miniDatePicker).not.toContain("onDateSelect");
    expect(miniDatePicker).not.toContain("isSameDay(day, currentDate)");
    expect(miniDatePicker).not.toContain("styles.selectedMiniDay");
    expect(miniDatePicker).not.toContain("<button");
    expect(miniDatePicker).toContain("<span");
    expect(calendarStyles).not.toContain(".miniDay:hover");
    expect(calendarStyles).not.toContain(".selectedMiniDay");
  });

  it("combines people and topic filters behind a sidebar tab switcher", () => {
    const appSource = getFunctionSource("ArchiveCalendar");

    expect(appSource).toContain("<SidebarFilterTabs");
    expect(appSource).not.toContain("<PeopleFilter");
    expect(appSource).not.toContain("<TopicFilter");
  });

  it("lets the sidebar filter list fill remaining space above the footer", () => {
    const sidebarFilterSection = getStyleBlock(".sidebarFilterSection");
    const sidebarFilterPanel = getStyleBlock(".sidebarFilterPanel");
    const peopleList = getStyleBlock(".peopleList,\n.topicList");
    const sidebarFooter = getStyleBlock(".sidebarFooter");

    expect(sidebarFilterSection).toContain("flex: 1");
    expect(sidebarFilterSection).toContain("min-height: 0");
    expect(sidebarFilterSection).toContain("grid-template-rows: auto minmax(0, 1fr)");
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
    const timelineView = getStyleBlock(".timelineView");

    expect(appShell).toContain("height: 100dvh");
    expect(appShell).toContain("overflow: hidden");
    expect(calendarPane).toContain("height: 100%");
    expect(calendarPane).toContain("min-height: 0");
    expect(calendarSurface).toContain("height: 100%");
    expect(calendarSurface).toContain("min-height: 0");
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

  it("opens the corresponding day view when clicking a month date number", () => {
    const monthView = getFunctionSource("MonthView");
    const dayNumberStart = monthView.indexOf("styles.dayNumber");
    expect(dayNumberStart).toBeGreaterThanOrEqual(0);

    const dayNumberButton = monthView.slice(
      monthView.lastIndexOf("<button", dayNumberStart),
      monthView.indexOf("</button>", dayNumberStart),
    );

    expect(dayNumberButton).toContain("onOpenDay(day)");
    expect(dayNumberButton).not.toContain("onDateSelect(day)");
  });

  it("drives month scrolling through free wheel offsets and buffered week rows", () => {
    const monthView = getFunctionSource("MonthView");
    const verticalScroll = getFunctionSource("useVerticalScroll");
    const monthGrid = getStyleBlock(".monthGrid");
    const monthGridContent = getStyleBlock(".monthGridContent");

    expect(monthView).toContain("buildBufferedMonthRows");
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

    expect(appSource).toContain("const openDayView = useCallback");
    expect(appSource).toContain("setCurrentDate(date)");
    expect(appSource).toContain('setView("day")');
    expect(appSource).toContain("onOpenDay={openDayView}");
    expect(monthView).toContain("dayEvents.slice(0, 3)");
    expect(monthView).toContain("dayEvents.length > 3");
    expect(monthView).toContain("onOpenDay(day)");
    expect(monthEvents).toContain("display: grid");
    expect(moreEvents).toContain("cursor: pointer");
    expect(moreEvents).toContain("font-weight: 700");
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
    expect(compactEventStyles).toContain("padding: 0 0.375rem 0 0.5rem");
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
    expect(timelineView).not.toContain("styles.emptyDay");
    expect(calendarStyles).not.toContain(".emptyDay");
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
});
