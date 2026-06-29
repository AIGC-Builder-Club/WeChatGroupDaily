import { startOfMonth } from "date-fns";

type DominantVisibleMonthInput = {
  visibleRows: Date[][];
  rowHeight: number;
  scrollOffset: number;
  leadingBufferRows?: number;
  visibleRowCount?: number;
};

export function getDominantVisibleMonthDate({
  visibleRows,
  rowHeight,
  scrollOffset,
  leadingBufferRows = 0,
  visibleRowCount = visibleRows.length,
}: DominantVisibleMonthInput): Date {
  const fallback = startOfMonth(visibleRows[0]?.[0] ?? new Date());
  if (visibleRows.length === 0) return fallback;

  const effectiveRowHeight = rowHeight > 0 ? rowHeight : 1;
  const viewportHeight = visibleRowCount * effectiveRowHeight;
  const monthWeights = new Map<string, { date: Date; weight: number }>();

  visibleRows.forEach((row, rowIndex) => {
    const rowTop = (rowIndex - leadingBufferRows) * effectiveRowHeight + scrollOffset;
    const rowBottom = rowTop + effectiveRowHeight;
    const visibleHeight = Math.min(rowBottom, viewportHeight) - Math.max(rowTop, 0);

    if (visibleHeight <= 0) return;

    const rowWeight = visibleHeight / effectiveRowHeight;
    row.forEach((day) => {
      const monthDate = startOfMonth(day);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      const current = monthWeights.get(key);

      monthWeights.set(key, {
        date: monthDate,
        weight: (current?.weight ?? 0) + rowWeight,
      });
    });
  });

  return (
    Array.from(monthWeights.values()).sort(
      (first, second) => second.weight - first.weight || first.date.getTime() - second.date.getTime(),
    )[0]?.date ?? fallback
  );
}
