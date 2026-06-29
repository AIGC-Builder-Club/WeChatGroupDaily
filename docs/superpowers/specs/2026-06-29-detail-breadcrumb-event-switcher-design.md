# Detail Breadcrumb Event Switcher Design

## Context

`ArchiveCalendar` already keeps the right detail panel in two related states:

- A day detail state driven by `selectedDayDate` and `selectedDayEvents`.
- A single event detail state driven by `selectedEvent`, with `returnDayDate` available when the user opened the event from a day list.

The current single event view has a back arrow for returning to the day list, but it does not clearly communicate the current hierarchy. Moving between stories on the same day also requires returning to the day list first.

## Goal

Add lightweight navigation inside the right detail panel:

- Show a breadcrumb-like path from the selected day list to the selected event detail.
- Let users quickly switch to the previous or next visible event from the same day.

## Non-Goals

- Do not add route-level navigation.
- Do not change the calendar's visible month, week, or day view when using the breadcrumb.
- Do not add month-level or archive-level breadcrumb items.
- Do not show previous/next controls on the day detail list.

## UI Behavior

In the day detail state, keep the existing date header. It remains the base state for the breadcrumb hierarchy.

In the single event detail state:

1. Replace the standalone back-arrow affordance with a compact breadcrumb in the header.
2. The breadcrumb uses the shape `M月d日 当天事件 / 事件标题`.
3. The date segment is clickable when a `returnDayDate` exists and calls the existing return-to-day-list behavior.
4. The event title segment is current context only and is not clickable.
5. Long event titles truncate inside the header instead of widening the panel.

At the bottom of the single event detail state:

1. Add a compact previous/next event row above the existing full-report button.
2. The controls are labeled `上一篇` and `下一篇`.
3. The switch range is the selected event's same-day events after the current filters are applied.
4. Buttons are disabled at the start or end of the same-day sequence.
5. Selecting previous or next keeps the user in single event detail state and preserves the same return day.

## Data Flow

Compute the same-day switch context in `ArchiveCalendar` from `filteredEvents` and the currently selected event:

- Filter events whose `start` date matches the selected event's start date.
- Sort them with the existing ascending event comparator.
- Find the selected event's index.
- Pass previous and next events into `DetailPanel`.

`DetailPanel` stays presentational. It receives optional previous/next events and calls the existing event selection callback when a switch button is clicked.

## Testing

Add focused source or component coverage that checks:

- The single event detail header contains a breadcrumb path instead of only a back icon plus date text.
- The previous/next controls are rendered only for single event detail.
- The switch context is same-day and respects the filtered event list.
- Boundary events disable the unavailable previous or next action.
