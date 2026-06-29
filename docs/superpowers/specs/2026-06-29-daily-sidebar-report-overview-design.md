# Daily Sidebar Report Overview Design

## Context

The archive parser already extracts report-level data from each original HTML report:

- `ReportMeta.title` and `ReportMeta.leadText` come from the lead block at the beginning of the HTML.
- `ReportMeta.highlights` comes from the `Cast · 今日高光` section at the end of the HTML.
- `toArchiveCalendarEvents()` currently converts only `ReportMeta.stories` into calendar events.

The right sidebar day detail view currently renders `dayEvents`, so it only shows story-level events.

## Goal

When a user opens a specific day in the right sidebar, show the report-level overview for that day above the story list:

- A "今日总结" block using the report title and lead text.
- A "今日高光" block using the parsed highlight people.
- Existing story event cards remain unchanged below the overview.

## Non-Goals

- Do not turn report summaries or highlights into calendar events.
- Do not change month, week, or day timeline event counts.
- Do not alter the original full-report pages.

## Data Flow

Add a lookup from day date to matching `ReportMeta` records inside `ArchiveCalendar`.

For a selected `dayDate`, pass the matched report overview data into `DetailPanel`. Single-day reports map directly to their date. Multi-day reports may include the selected date if it falls inside the report's start/end date range.

## UI Behavior

In the right sidebar day detail state:

1. Keep the existing date header.
2. Show "当天事件" and the story count as today.
3. If report overview data exists, render it before the story cards.
4. Show the report title and lead text in a compact summary panel.
5. Show highlights as compact person rows with avatar, name, tag, and description.
6. Keep the existing "打开完整日报" button at the bottom.

If there is no report overview, the sidebar falls back to the current story-only behavior.

## Testing

Add focused coverage for:

- Parsing still exposes title, lead text, and highlights.
- The day detail source contains a report overview path instead of adding fake events.
- The day sidebar renders summary and highlights before story event cards.
