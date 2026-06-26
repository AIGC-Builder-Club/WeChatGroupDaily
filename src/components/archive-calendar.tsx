"use client";

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Sparkles,
  Tag,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ReportAvatar, ReportMeta } from "@/lib/archive";
import {
  formatArchiveEventTime,
  toArchiveCalendarEvents,
  type ArchiveCalendarEvent,
  type CalendarViewType,
} from "@/lib/archive-calendar-events";
import {
  buildTimelineDayLayout,
  minutesToPercent,
} from "@/lib/archive-timeline";
import { cn } from "@/lib/utils";

import styles from "./archive-calendar.module.css";

type ArchiveCalendarProps = {
  reports: ReportMeta[];
  initialPerson?: string;
  initialTopic?: string;
};

type PersonSummary = {
  name: string;
  count: number;
  avatar: ReportAvatar;
};

type TopicSummary = {
  name: string;
  count: number;
};

type SidebarFilterTab = "people" | "topic";

const weekdayLabels = ["一", "二", "三", "四", "五", "六", "日"];
const viewOptions: Array<{
  value: CalendarViewType;
  label: string;
}> = [
  { value: "day", label: "日" },
  { value: "week", label: "周" },
  { value: "month", label: "月" },
];
const monthVisibleRowCount = 6;
const monthBaseBufferRows = 2;
const timelineBufferDays: Record<"day" | "week", number> = {
  day: 3,
  week: 7,
};
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ArchiveCalendar({
  reports,
  initialPerson = "",
  initialTopic = "",
}: ArchiveCalendarProps) {
  const events = useMemo(() => toArchiveCalendarEvents(reports), [reports]);
  const [view, setView] = useState<CalendarViewType>("month");
  const [currentDate, setCurrentDate] = useState(() => getLatestEventDate(events));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState(initialPerson);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [activeFilterTab, setActiveFilterTab] = useState<SidebarFilterTab>(() =>
    initialTopic ? "topic" : "people",
  );
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  const people = useMemo(() => buildPeopleSummaries(events), [events]);
  const topics = useMemo(() => buildTopicSummaries(events), [events]);
  const normalizedQuery = normalizeQuery(query);
  const filteredEvents = useMemo(
    () =>
      events
        .filter((event) => matchesFilters(event, selectedPerson, selectedTopic, normalizedQuery))
        .sort(compareEventsAscending),
    [events, normalizedQuery, selectedPerson, selectedTopic],
  );
  const selectedEvent = useMemo(
    () => filteredEvents.find((event) => event.id === selectedEventId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedEventId],
  );
  const visibleEvents = useMemo(
    () => getVisibleEvents(filteredEvents, currentDate, view),
    [currentDate, filteredEvents, view],
  );
  const totalMessages = useMemo(
    () => reports.reduce((sum, report) => sum + (report.stats.messages ?? 0), 0),
    [reports],
  );
  const totalStories = events.length;

  const navigate = useCallback(
    (direction: -1 | 1) => {
      setCurrentDate((date) => {
        if (view === "month") return addMonths(date, direction);
        if (view === "week") return addWeeks(date, direction);
        return addDays(date, direction);
      });
    },
    [view],
  );

  const navigateMonth = useCallback((direction: -1 | 1) => {
    setCurrentDate((date) => addMonths(date, direction));
  }, []);

  const openDayView = useCallback((date: Date) => {
    setCurrentDate(date);
    setView("day");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (isTyping) {
        if (event.key === "Escape") {
          setQuery("");
          searchRef.current?.blur();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigate(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        navigate(1);
      }
      if (event.key.toLowerCase() === "m") setView("month");
      if (event.key.toLowerCase() === "w") setView("week");
      if (event.key.toLowerCase() === "d") setView("day");
      if (event.key.toLowerCase() === "t") setCurrentDate(startOfDay(new Date()));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  const selectEvent = useCallback((event: ArchiveCalendarEvent) => {
    setSelectedEventId(event.id);
    setRightOpen(true);
  }, []);

  const clearFilters = () => {
    setQuery("");
    setSelectedPerson("");
    setSelectedTopic("");
  };

  return (
    <main className={styles.appShell}>
      <div
        className={styles.leftSidebarFrame}
        data-state={leftOpen ? "expanded" : "collapsed"}
      >
        <div className={styles.leftSidebarGap} />
        <aside className={styles.leftSidebar} aria-hidden={!leftOpen}>
          <SidebarHeader reports={reports.length} stories={totalStories} messages={totalMessages} />
          <SidebarSearch query={query} searchRef={searchRef} onQueryChange={setQuery} />
          <MiniDatePicker
            currentDate={currentDate}
            events={filteredEvents}
            onNavigateMonth={navigateMonth}
          />
          <SidebarFilterTabs
            activeTab={activeFilterTab}
            people={people}
            selectedPerson={selectedPerson}
            topics={topics}
            selectedTopic={selectedTopic}
            onTabChange={setActiveFilterTab}
            onSelectPerson={setSelectedPerson}
            onSelectTopic={setSelectedTopic}
          />
          <div className={styles.sidebarFooter}>
            <ThemeToggle />
          </div>
        </aside>
      </div>

      <section className={styles.calendarPane} aria-label="群日报日历">
        <CalendarToolbar
          view={view}
          currentDate={currentDate}
          query={query}
          leftOpen={leftOpen}
          rightOpen={rightOpen}
          visibleCount={visibleEvents.length}
          totalCount={filteredEvents.length}
          selectedPerson={selectedPerson}
          selectedTopic={selectedTopic}
          onToday={() => setCurrentDate(startOfDay(new Date()))}
          onNavigateMonth={navigateMonth}
          onViewChange={setView}
          onClearFilters={clearFilters}
          onToggleLeft={() => setLeftOpen((open) => !open)}
          onToggleRight={() => setRightOpen((open) => !open)}
        />

        <div className={styles.calendarSurface}>
          {view === "month" ? (
            <MonthView
              currentDate={currentDate}
              events={filteredEvents}
              selectedEventId={selectedEvent?.id}
              onOpenDay={openDayView}
              onSelectEvent={selectEvent}
              onDateSelect={setCurrentDate}
            />
          ) : (
            <TimelineView
              currentDate={currentDate}
              events={filteredEvents}
              selectedEventId={selectedEvent?.id}
              view={view}
              onSelectEvent={selectEvent}
              onDateSelect={setCurrentDate}
            />
          )}
        </div>
      </section>

      <aside className={[styles.rightSidebar, rightOpen ? "" : styles.sidebarClosed].join(" ")}>
        <DetailPanel event={selectedEvent} onClose={() => setRightOpen(false)} />
      </aside>
    </main>
  );
}

function SidebarHeader({
  reports,
  stories,
  messages,
}: {
  reports: number;
  stories: number;
  messages: number;
}) {
  return (
    <div className={styles.sidebarHeader}>
      <div>
        <p className={styles.eyebrow}>WeChat Daily</p>
        <h1>奇奇怪怪养龙虾群日报</h1>
      </div>
      <dl className={styles.compactStats}>
        <div>
          <dt>日报</dt>
          <dd>{reports}</dd>
        </div>
        <div>
          <dt>消息</dt>
          <dd>{messages.toLocaleString("zh-CN")}</dd>
        </div>
        <div>
          <dt>故事</dt>
          <dd>{stories}</dd>
        </div>
      </dl>
    </div>
  );
}

function CalendarToolbar({
  view,
  currentDate,
  query,
  leftOpen,
  rightOpen,
  visibleCount,
  totalCount,
  selectedPerson,
  selectedTopic,
  onToday,
  onNavigateMonth,
  onViewChange,
  onClearFilters,
  onToggleLeft,
  onToggleRight,
}: {
  view: CalendarViewType;
  currentDate: Date;
  query: string;
  leftOpen: boolean;
  rightOpen: boolean;
  visibleCount: number;
  totalCount: number;
  selectedPerson: string;
  selectedTopic: string;
  onToday: () => void;
  onNavigateMonth: (direction: -1 | 1) => void;
  onViewChange: (view: CalendarViewType) => void;
  onClearFilters: () => void;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}) {
  const hasFilters = query || selectedPerson || selectedTopic;

  return (
    <header className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label={leftOpen ? "收起左侧栏" : "展开左侧栏"}
              className={styles.toolbarIconButton}
              onClick={onToggleLeft}
              size="icon"
              type="button"
              variant="ghost"
            >
              {leftOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{leftOpen ? "收起左侧栏" : "展开左侧栏"}</TooltipContent>
        </Tooltip>
        <div className={styles.toolbarTitle}>
          <strong>{format(currentDate, "yyyy 年 M 月", { locale: zhCN })}</strong>
          <span className={styles.toolbarTitleMeta}>
            显示 {visibleCount} / {totalCount}
          </span>
        </div>
      </div>

      <div className={styles.toolbarCenter}>
        <ArchiveViewTabs view={view} onViewChange={onViewChange} />
      </div>

      <div className={styles.toolbarRight}>
        <div className={styles.toolbarRightControls}>
          <div className={styles.toolbarDateControls}>
            <Button
              aria-label="上个月"
              className={cn(styles.toolbarDateButton, styles.toolbarNavButton)}
              onClick={() => onNavigateMonth(-1)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ChevronLeft />
            </Button>
            <Button
              className={cn(styles.toolbarDateButton, styles.toolbarTodayButton)}
              onClick={onToday}
              size="sm"
              type="button"
              variant="secondary"
            >
              今天
            </Button>
            <Button
              aria-label="下个月"
              className={cn(styles.toolbarDateButton, styles.toolbarNavButton)}
              onClick={() => onNavigateMonth(1)}
              size="icon"
              type="button"
              variant="secondary"
            >
              <ChevronRight />
            </Button>
          </div>
          {hasFilters ? (
            <Button className={styles.toolbarTextButton} onClick={onClearFilters} size="sm" type="button" variant="secondary">
              清除筛选
            </Button>
          ) : null}
          {!rightOpen ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  aria-label="展开详情栏"
                  className={styles.toolbarIconButton}
                  onClick={onToggleRight}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <PanelRightOpen />
                </Button>
              </TooltipTrigger>
              <TooltipContent>展开详情栏</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ArchiveViewTabs({
  view,
  onViewChange,
}: {
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
}) {
  const selectAdjacentView = (direction: -1 | 1) => {
    const currentIndex = viewOptions.findIndex((option) => option.value === view);
    const nextIndex = (currentIndex + direction + viewOptions.length) % viewOptions.length;
    onViewChange(viewOptions[nextIndex].value);
  };

  return (
    <div
      aria-label="切换日历视图"
      className={styles.viewTabs}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          selectAdjacentView(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          selectAdjacentView(1);
        }
      }}
      role="tablist"
    >
      {viewOptions.map((option) => (
        <button
          aria-selected={view === option.value}
          className={cn(
            styles.viewTab,
            view === option.value ? styles.activeViewTab : "",
          )}
          key={option.value}
          onClick={() => onViewChange(option.value)}
          role="tab"
          tabIndex={view === option.value ? 0 : -1}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MiniDatePicker({
  currentDate,
  events,
  onNavigateMonth,
}: {
  currentDate: Date;
  events: ArchiveCalendarEvent[];
  onNavigateMonth: (direction: -1 | 1) => void;
}) {
  const days = useMemo(() => buildMonthDays(currentDate), [currentDate]);
  const eventDateKeys = useMemo(() => new Set(events.map((event) => dateKey(event.start))), [events]);

  return (
    <section className={styles.sidebarSection} aria-label="月份概览">
      <div className={styles.sectionHeader}>
        <Button
          aria-label="上个月"
          className={styles.miniNavButton}
          onClick={() => onNavigateMonth(-1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronLeft />
        </Button>
        <span className={styles.sectionHeaderTitle}>
          {format(currentDate, "yyyy 年 M 月", { locale: zhCN })}
        </span>
        <Button
          aria-label="下个月"
          className={styles.miniNavButton}
          onClick={() => onNavigateMonth(1)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronRight />
        </Button>
      </div>
      <div className={styles.miniWeekdays}>
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={styles.miniGrid}>
        {days.map((day) => {
          const key = dateKey(day);
          return (
            <span
              className={[
                styles.miniDay,
                isSameMonth(day, currentDate) ? "" : styles.mutedMiniDay,
                isToday(day) ? styles.todayMiniDay : "",
                eventDateKeys.has(key) ? styles.hasMiniEvent : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={key}
            >
              {format(day, "d")}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function SidebarSearch({
  query,
  searchRef,
  onQueryChange,
}: {
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (value: string) => void;
}) {
  return (
    <section className={[styles.sidebarSection, styles.sidebarSearchSection].join(" ")} aria-label="搜索">
      <label className={styles.sidebarSearch}>
        <Search aria-hidden="true" />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="搜索人物、主题、故事..."
          type="search"
        />
        {query ? (
          <button aria-label="清空搜索" onClick={() => onQueryChange("")} type="button">
            <X />
          </button>
        ) : null}
      </label>
    </section>
  );
}

function SidebarFilterTabs({
  activeTab,
  people,
  selectedPerson,
  topics,
  selectedTopic,
  onTabChange,
  onSelectPerson,
  onSelectTopic,
}: {
  activeTab: SidebarFilterTab;
  people: PersonSummary[];
  selectedPerson: string;
  topics: TopicSummary[];
  selectedTopic: string;
  onTabChange: (tab: SidebarFilterTab) => void;
  onSelectPerson: (person: string) => void;
  onSelectTopic: (topic: string) => void;
}) {
  return (
    <section className={[styles.sidebarSection, styles.sidebarFilterSection].join(" ")} aria-label="筛选">
      <div className={styles.sidebarFilterTabs} role="tablist" aria-label="筛选类型">
        <button
          aria-selected={activeTab === "people"}
          className={[
            activeTab === "people" ? styles.activeSidebarFilterTab : "",
            selectedPerson ? styles.sidebarFilterTabHasValue : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onTabChange("people")}
          role="tab"
          type="button"
        >
          <UsersRound />
          <span>群人物</span>
        </button>
        <button
          aria-selected={activeTab === "topic"}
          className={[
            activeTab === "topic" ? styles.activeSidebarFilterTab : "",
            selectedTopic ? styles.sidebarFilterTabHasValue : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onTabChange("topic")}
          role="tab"
          type="button"
        >
          <Tag />
          <span>主题</span>
        </button>
      </div>

      <div className={styles.sidebarFilterPanel} role="tabpanel">
        {activeTab === "people" ? (
          <div className={styles.peopleList}>
            {people.map((person) => (
              <button
                className={person.name === selectedPerson ? styles.activeFilterItem : ""}
                key={person.name}
                onClick={() => onSelectPerson(person.name === selectedPerson ? "" : person.name)}
                type="button"
              >
                <AvatarBadge avatar={person.avatar} />
                <span>{person.name}</span>
                <strong>{person.count}</strong>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.topicList}>
            {topics.slice(0, 16).map((topic) => (
              <button
                className={topic.name === selectedTopic ? styles.activeTopic : ""}
                key={topic.name}
                onClick={() => onSelectTopic(topic.name === selectedTopic ? "" : topic.name)}
                type="button"
              >
                <span>{topic.name}</span>
                <strong>{topic.count}</strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MonthView({
  currentDate,
  events,
  selectedEventId,
  onOpenDay,
  onSelectEvent,
  onDateSelect,
}: {
  currentDate: Date;
  events: ArchiveCalendarEvent[];
  selectedEventId: string | undefined;
  onOpenDay: (date: Date) => void;
  onSelectEvent: (event: ArchiveCalendarEvent) => void;
  onDateSelect: (date: Date) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [measuredRowHeight, setMeasuredRowHeight] = useState(0);
  const visibleRows = useMemo(() => buildConsecutiveMonthRows(currentDate), [currentDate]);
  const handleScrollNavigate = useCallback(
    (rowsDelta: number) => {
      onDateSelect(addWeeks(currentDate, rowsDelta));
    },
    [currentDate, onDateSelect],
  );
  const { scrollOffset } = useVerticalScroll({
    containerRef: scrollContainerRef,
    rowHeight: measuredRowHeight,
    onNavigate: handleScrollNavigate,
  });
  const dynamicBuffer = monthBaseBufferRows + (measuredRowHeight > 0 ? Math.ceil(Math.abs(scrollOffset) / measuredRowHeight) : 0);
  const bufferedRows = useMemo(
    () => buildBufferedMonthRows(visibleRows, dynamicBuffer),
    [dynamicBuffer, visibleRows],
  );
  const days = useMemo(() => bufferedRows.flat(), [bufferedRows]);
  const monthGridHeightPercent = (bufferedRows.length / monthVisibleRowCount) * 100;
  const bufferedRowOffsetPercent = (dynamicBuffer / bufferedRows.length) * 100;
  const scrollOffsetOperator = scrollOffset >= 0 ? "+" : "-";
  const scrollStyle: CSSProperties = {
    height: `${monthGridHeightPercent}%`,
    gridTemplateRows: `repeat(${bufferedRows.length}, minmax(0, 1fr))`,
    transform: `translateY(calc(-${bufferedRowOffsetPercent}% ${scrollOffsetOperator} ${Math.abs(scrollOffset)}px))`,
  };

  useIsomorphicLayoutEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const measure = () => {
      const nextRowHeight = container.clientHeight / monthVisibleRowCount;
      if (nextRowHeight > 0) {
        setMeasuredRowHeight(nextRowHeight);
      }
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.monthView}>
      <div className={styles.weekdayRow} aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className={styles.monthGrid} ref={scrollContainerRef}>
        <div className={styles.monthGridContent} style={scrollStyle}>
          {days.map((day) => {
            const dayEvents = events.filter((event) => isSameDay(event.start, day)).sort(compareEventsAscending);
            const visibleDayEvents = dayEvents.slice(0, 3);
            const hiddenDayEventCount = dayEvents.length - visibleDayEvents.length;
            return (
              <article
                className={[
                  styles.monthCell,
                  isSameMonth(day, currentDate) ? "" : styles.outsideMonth,
                  isToday(day) ? styles.todayCell : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={dateKey(day)}
              >
                <button
                  className={[
                    styles.dayNumber,
                    isToday(day) ? styles.todayDayNumber : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={`打开 ${format(day, "M月d日")} 日视图`}
                  onClick={() => onOpenDay(day)}
                  type="button"
                >
                  {format(day, "d")}
                </button>
                <div className={styles.monthEvents}>
                  {visibleDayEvents.map((event) => (
                    <EventPill
                      event={event}
                      isSelected={event.id === selectedEventId}
                      key={event.id}
                      onSelect={onSelectEvent}
                      compact
                    />
                  ))}
                  {dayEvents.length > 3 ? (
                    <button
                      aria-label={`${format(day, "M月d日")} 还有 ${hiddenDayEventCount} 条事件，打开日视图`}
                      className={styles.moreEvents}
                      onClick={() => onOpenDay(day)}
                      type="button"
                    >
                      展开剩余 {hiddenDayEventCount} 条
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineView({
  currentDate,
  events,
  selectedEventId,
  view,
  onSelectEvent,
  onDateSelect,
}: {
  currentDate: Date;
  events: ArchiveCalendarEvent[];
  selectedEventId: string | undefined;
  view: "week" | "day";
  onSelectEvent: (event: ArchiveCalendarEvent) => void;
  onDateSelect: (date: Date) => void;
}) {
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const timelineAxisHeaderRef = useRef<HTMLDivElement>(null);
  const [dayColumnWidth, setDayColumnWidth] = useState(0);
  const visibleDays = useMemo(() => buildVisibleTimelineDays(currentDate, view), [currentDate, view]);
  const scrollUnitWidth = dayColumnWidth * visibleDays.length;
  const daysPerScrollUnit = visibleDays.length;
  const handleScrollNavigate = useCallback(
    (daysDelta: number) => {
      onDateSelect(addDays(currentDate, daysDelta));
    },
    [currentDate, onDateSelect],
  );
  const { scrollOffset } = useHorizontalScroll({
    containerRef: timelineScrollRef,
    scrollUnitWidth,
    daysPerScrollUnit,
    onNavigate: handleScrollNavigate,
  });
  const dynamicBuffer = timelineBufferDays[view] + (dayColumnWidth > 0 ? Math.ceil(Math.abs(scrollOffset) / dayColumnWidth) : 0);
  const days = useMemo(
    () => buildBufferedTimelineDays(visibleDays, dynamicBuffer),
    [dynamicBuffer, visibleDays],
  );
  const layouts = useMemo(
    () => new Map(days.map((day) => [dateKey(day), buildTimelineDayLayout(events, day)])),
    [days, events],
  );
  const timelineGridTemplateColumns = `repeat(${days.length}, minmax(0, 1fr))`;
  const timelineContentScale = days.length / visibleDays.length;
  const scrollStyle: CSSProperties = {
    width: `${timelineContentScale * 100}%`,
    transform: `translateX(${-(dynamicBuffer * dayColumnWidth) + scrollOffset}px)`,
  };

  useEffect(() => {
    const container = timelineScrollRef.current;
    if (!container) return;

    const measure = () => {
      const axisWidth = timelineAxisHeaderRef.current?.offsetWidth ?? 0;
      setDayColumnWidth((container.clientWidth - axisWidth) / visibleDays.length);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (timelineAxisHeaderRef.current) observer.observe(timelineAxisHeaderRef.current);

    return () => observer.disconnect();
  }, [visibleDays.length]);

  return (
    <div className={styles.timelineView} data-view={view} ref={timelineScrollRef}>
      <div className={styles.timelineAxisHeader} ref={timelineAxisHeaderRef}>
        <span>时间</span>
      </div>
      <div
        className={styles.timelineDayHeaders}
        style={{ ...scrollStyle, gridTemplateColumns: timelineGridTemplateColumns }}
      >
        {days.map((day) => {
          const key = dateKey(day);
          const layout = layouts.get(key);

          return (
            <section className={styles.timelineDayHeaderGroup} key={key}>
              <button className={styles.agendaDayHeader} onClick={() => onDateSelect(day)} type="button">
                <span>{format(day, "EEE", { locale: zhCN })}</span>
                <strong className={isToday(day) ? styles.todayBubble : ""}>{format(day, "d")}</strong>
              </button>
            </section>
          );
        })}
      </div>
      <div className={styles.timelineAxis} aria-hidden="true">
        {timelineHours.map((hour) => (
          <div key={hour}>
            {hour === 0 ? null : <span>{formatTimelineHour(hour)}</span>}
          </div>
        ))}
      </div>
      <div
        className={styles.timelineColumns}
        style={{ ...scrollStyle, gridTemplateColumns: timelineGridTemplateColumns }}
      >
        {days.map((day) => {
          const key = dateKey(day);
          const layout = layouts.get(key);

          return (
            <section className={styles.timelineColumn} key={key} aria-label={format(day, "yyyy-MM-dd")}>
              {timelineHours.map((hour) => (
                <div className={styles.timelineHourLine} key={hour} />
              ))}
              {layout?.timedEvents.map((item) => (
                <TimelineEventCard
                  event={item.event}
                  isSelected={item.event.id === selectedEventId}
                  key={`${key}-${item.event.id}-${item.segmentPosition}`}
                  onSelect={onSelectEvent}
                  style={{
                    top: `${minutesToPercent(item.startMinutes)}%`,
                    height: `${minutesToPercent(item.durationMinutes)}%`,
                    left: `calc(${item.left}% + 4px)`,
                    width: `calc(${item.width}% - 8px)`,
                    zIndex: item.column + 1,
                  }}
                  view={view}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const timelineHours = Array.from({ length: 24 }, (_, hour) => hour);

function TimelineEventCard({
  event,
  isSelected,
  onSelect,
  style,
  view,
}: {
  event: ArchiveCalendarEvent;
  isSelected: boolean;
  onSelect: (event: ArchiveCalendarEvent) => void;
  style?: CSSProperties;
  view: "week" | "day";
}) {
  return (
    <button
      className={[
        styles.timelineEventCard,
        isSelected ? styles.selectedTimelineEvent : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-color={event.color}
      onClick={() => onSelect(event)}
      style={style}
      type="button"
    >
      <span className={styles.timelineEventMeta}>
        <span>{formatTimelineEventTime(event, view)}</span>
        {event.meta.topic ? <span className={styles.timelineTopic}>{event.meta.topic}</span> : null}
      </span>
      <strong>{event.title}</strong>
    </button>
  );
}

function formatTimelineHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTimelineEventTime(event: ArchiveCalendarEvent, view: "week" | "day" = "day"): string {
  if (view === "week") {
    return formatMonthEventTime(event);
  }

  return formatArchiveEventTime(event);
}

function formatMonthEventTime(event: ArchiveCalendarEvent): string {
  if (event.isAllDay) {
    return event.meta.story.time ?? "全天";
  }

  const minutes = event.start.getMinutes();
  if (minutes === 0) {
    return format(event.start, "h a");
  }

  return format(event.start, "h:mm a");
}

function EventPill({
  event,
  compact = false,
  isSelected,
  onSelect,
}: {
  event: ArchiveCalendarEvent;
  compact?: boolean;
  isSelected: boolean;
  onSelect: (event: ArchiveCalendarEvent) => void;
  }) {
  if (compact) {
    return (
      <button
        className={[
          styles.eventPill,
          styles.compactEvent,
          isSelected ? styles.selectedEvent : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-color={event.color}
        onClick={() => onSelect(event)}
        type="button"
      >
        <span className={styles.monthEventTime}>{formatMonthEventTime(event)}</span>
        {event.meta.topic ? <span className={styles.timelineTopic}>{event.meta.topic}</span> : null}
      </button>
    );
  }

  return (
    <button
      className={[
        styles.eventPill,
        compact ? styles.compactEvent : "",
        isSelected ? styles.selectedEvent : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-color={event.color}
      onClick={() => onSelect(event)}
      type="button"
    >
      <span className={styles.timelineEventMeta}>
        <span>{formatTimelineEventTime(event)}</span>
        {event.meta.topic ? <span className={styles.timelineTopic}>{event.meta.topic}</span> : null}
      </span>
      <strong>{event.title}</strong>
    </button>
  );
}

function DetailPanel({
  event,
  onClose,
}: {
  event: ArchiveCalendarEvent | null;
  onClose: () => void;
}) {
  if (!event) {
    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>
          <p className={styles.eyebrow}>Details</p>
          <Button aria-label="收起详情栏" onClick={onClose} size="icon" type="button" variant="ghost">
            <PanelRightClose />
          </Button>
        </div>
        <div className={styles.emptyDetail}>
          <Sparkles />
          <h2>暂无故事</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <div>
          <span>{formatEventDate(event)}</span>
        </div>
        <Button aria-label="收起详情栏" onClick={onClose} size="icon" type="button" variant="ghost">
          <PanelRightClose />
        </Button>
      </div>
      <div className={styles.detailScroll}>
        <h2>{event.title}</h2>
        <div className={styles.detailMeta}>
          <span>
            <Clock3 />
            {event.isAllDay ? "全天故事" : `${format(event.start, "HH:mm")} - ${format(event.end, "HH:mm")}`}
          </span>
          {event.meta.topic ? (
            <Link href={`/topics/${encodeURIComponent(event.meta.topic)}`}>
              <Tag />
              {event.meta.topic}
            </Link>
          ) : null}
        </div>
        <p className={styles.detailSummary}>{event.description}</p>
        <div className={styles.detailPeople}>
          {event.meta.participants.map((participant) => (
            <Link href={`/people/${encodeURIComponent(participant.name)}`} key={participant.name}>
              <AvatarBadge avatar={participant} />
              <span>{participant.name}</span>
            </Link>
          ))}
        </div>
        {event.meta.quotes.length > 0 ? (
          <div className={styles.quoteList}>
            {event.meta.quotes.map((quote) => (
              <blockquote key={`${quote.text}-${quote.attr ?? ""}`}>
                <p>{quote.text}</p>
                {quote.attr ? <cite>{quote.attr}</cite> : null}
              </blockquote>
            ))}
          </div>
        ) : null}
        {event.meta.output ? (
          <div className={styles.outputBox}>
            <span>Output</span>
            <strong>{event.meta.output}</strong>
          </div>
        ) : null}
      </div>
      <Button asChild className={styles.rawLink}>
        <a href={event.meta.rawHtmlHref}>
          打开完整日报
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
}

function AvatarBadge({ avatar }: { avatar: ReportAvatar }) {
  return (
    <Avatar>
      {avatar.avatarSrc ? <AvatarImage alt={avatar.avatarAlt ?? avatar.name} src={avatar.avatarSrc} /> : null}
      <AvatarFallback>{avatar.avatarInitials}</AvatarFallback>
    </Avatar>
  );
}

function buildMonthDays(currentDate: Date): Date[] {
  const first = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: first, end: last });

  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }

  return days;
}

function buildPeopleSummaries(events: ArchiveCalendarEvent[]): PersonSummary[] {
  const summaries = new Map<string, PersonSummary>();

  events.forEach((event) => {
    event.meta.participants.forEach((avatar) => {
      const current = summaries.get(avatar.name);
      summaries.set(avatar.name, {
        name: avatar.name,
        avatar: current?.avatar ?? avatar,
        count: (current?.count ?? 0) + 1,
      });
    });
  });

  return Array.from(summaries.values()).sort((first, second) => {
    const countComparison = second.count - first.count;
    return countComparison || first.name.localeCompare(second.name, "zh-CN");
  });
}

function buildTopicSummaries(events: ArchiveCalendarEvent[]): TopicSummary[] {
  const summaries = new Map<string, number>();

  events.forEach((event) => {
    if (!event.meta.topic) return;
    summaries.set(event.meta.topic, (summaries.get(event.meta.topic) ?? 0) + 1);
  });

  return Array.from(summaries.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name, "zh-CN"));
}

function matchesFilters(
  event: ArchiveCalendarEvent,
  selectedPerson: string,
  selectedTopic: string,
  normalizedQuery: string,
): boolean {
  if (
    selectedPerson &&
    !event.meta.participants.some((participant) => participant.name === selectedPerson)
  ) {
    return false;
  }

  if (selectedTopic && event.meta.topic !== selectedTopic) {
    return false;
  }

  if (!normalizedQuery) {
    return true;
  }

  return normalizeQuery(
    [
      event.title,
      event.description,
      event.meta.topic,
      event.meta.output,
      event.meta.participants.map((participant) => participant.name).join(" "),
      event.meta.quotes.map((quote) => `${quote.text} ${quote.attr ?? ""}`).join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  ).includes(normalizedQuery);
}

function getVisibleEvents(
  events: ArchiveCalendarEvent[],
  currentDate: Date,
  view: CalendarViewType,
): ArchiveCalendarEvent[] {
  if (view === "day") {
    return events.filter((event) => isSameDay(event.start, currentDate));
  }

  const start = view === "month" ? startOfMonth(currentDate) : startOfWeek(currentDate, { weekStartsOn: 1 });
  const end = view === "month" ? endOfMonth(currentDate) : endOfWeek(currentDate, { weekStartsOn: 1 });

  return events.filter((event) => event.start >= start && event.start <= end);
}

function getLatestEventDate(events: ArchiveCalendarEvent[]): Date {
  const latestTime = events.reduce(
    (latest, event) => Math.max(latest, event.start.getTime()),
    0,
  );

  return latestTime ? startOfDay(new Date(latestTime)) : startOfDay(new Date());
}

function compareEventsAscending(first: ArchiveCalendarEvent, second: ArchiveCalendarEvent): number {
  if (first.isAllDay !== second.isAllDay) {
    return first.isAllDay ? -1 : 1;
  }

  return first.start.getTime() - second.start.getTime();
}

function formatEventDate(event: ArchiveCalendarEvent): string {
  return format(event.start, "yyyy 年 M 月 d 日 EEEE", { locale: zhCN });
}

function normalizeContinuousScrollOffset(
  offset: number,
  unitSize: number,
): { unitDelta: number; scrollOffset: number } {
  if (unitSize <= 0) {
    return { unitDelta: 0, scrollOffset: offset };
  }

  const unitDelta = Math.trunc(offset / unitSize);

  return {
    unitDelta,
    scrollOffset: offset - unitDelta * unitSize,
  };
}

function useVerticalScroll({
  containerRef,
  rowHeight,
  onNavigate,
  disabled,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  rowHeight: number;
  onNavigate: (rowsDelta: number) => void;
  disabled?: boolean;
}) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const accumulatedDelta = useRef(0);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const applyScrollOffset = useCallback(
    (offset: number) => {
      const { unitDelta, scrollOffset: nextScrollOffset } =
        normalizeContinuousScrollOffset(offset, rowHeight);

      if (unitDelta !== 0) {
        onNavigateRef.current(-unitDelta);
      }

      accumulatedDelta.current = nextScrollOffset;
      setScrollOffset(nextScrollOffset);
    },
    [rowHeight],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (disabled) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      event.preventDefault();

      accumulatedDelta.current += -event.deltaY;
      applyScrollOffset(accumulatedDelta.current);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, disabled, applyScrollOffset]);

  return {
    scrollOffset,
  };
}

function useHorizontalScroll({
  containerRef,
  scrollUnitWidth,
  daysPerScrollUnit,
  onNavigate,
  disabled,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  scrollUnitWidth: number;
  daysPerScrollUnit: number;
  onNavigate: (daysDelta: number) => void;
  disabled?: boolean;
}) {
  const [scrollOffset, setScrollOffset] = useState(0);
  const accumulatedDelta = useRef(0);
  const onNavigateRef = useRef(onNavigate);

  useEffect(() => {
    onNavigateRef.current = onNavigate;
  }, [onNavigate]);

  const applyScrollOffset = useCallback(
    (offset: number) => {
      const { unitDelta, scrollOffset: nextScrollOffset } =
        normalizeContinuousScrollOffset(offset, scrollUnitWidth);

      if (unitDelta !== 0) {
        onNavigateRef.current(-unitDelta * daysPerScrollUnit);
      }

      accumulatedDelta.current = nextScrollOffset;
      setScrollOffset(nextScrollOffset);
    },
    [daysPerScrollUnit, scrollUnitWidth],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (disabled) return;
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;

      event.preventDefault();

      accumulatedDelta.current += -event.deltaX;
      applyScrollOffset(accumulatedDelta.current);
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef, disabled, applyScrollOffset]);

  return {
    scrollOffset,
  };
}

function buildConsecutiveMonthRows(startDate: Date): Date[][] {
  const firstWeekStart = startOfWeek(startDate, { weekStartsOn: 1 });
  return Array.from({ length: monthVisibleRowCount }, (_, index) =>
    buildMonthWeekRow(addWeeks(firstWeekStart, index)),
  );
}

function buildBufferedMonthRows(weekRows: Date[][], bufferRows: number): Date[][] {
  if (weekRows.length === 0) return weekRows;

  const rows: Date[][] = [];
  const firstWeekStart = weekRows[0]?.[0] ?? startOfWeek(new Date(), { weekStartsOn: 1 });

  for (let index = bufferRows; index > 0; index--) {
    rows.push(buildMonthWeekRow(addWeeks(firstWeekStart, -index)));
  }

  rows.push(...weekRows);

  const lastWeekStart = weekRows[weekRows.length - 1]?.[0] ?? firstWeekStart;

  for (let index = 1; index <= bufferRows; index++) {
    rows.push(buildMonthWeekRow(addWeeks(lastWeekStart, index)));
  }

  return rows;
}

function buildMonthWeekRow(referenceDate: Date): Date[] {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

function buildVisibleTimelineDays(currentDate: Date, view: "week" | "day"): Date[] {
  if (view === "day") {
    return [startOfDay(currentDate)];
  }

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

function buildBufferedTimelineDays(days: Date[], bufferDays: number): Date[] {
  if (days.length === 0) return days;

  const rows: Date[] = [];
  const firstDay = days[0] ?? startOfDay(new Date());

  for (let index = bufferDays; index > 0; index--) {
    rows.push(addDays(firstDay, -index));
  }

  rows.push(...days);

  const lastDay = days[days.length - 1] ?? firstDay;
  for (let index = 1; index <= bufferDays; index++) {
    rows.push(addDays(lastDay, index));
  }

  return rows;
}

function dateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function normalizeQuery(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
