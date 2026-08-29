/**
 * Minute-interval arithmetic used to turn weekly opening rules and one-off
 * exceptions into the set of minutes a clinic (or a practitioner) is actually
 * open on a given day. All intervals are half-open: [start, end).
 */
export interface Interval {
  start: number;
  end: number;
}

export function normalize(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((i) => i.end > i.start)
    .sort((a, b) => a.start - b.start);

  const out: Interval[] = [];
  for (const current of sorted) {
    const last = out[out.length - 1];
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      out.push({ ...current });
    }
  }
  return out;
}

export function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) {
    for (const y of b) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) out.push({ start, end });
    }
  }
  return normalize(out);
}

export function subtract(base: Interval[], cuts: Interval[]): Interval[] {
  let current = normalize(base);
  for (const cut of normalize(cuts)) {
    const next: Interval[] = [];
    for (const piece of current) {
      if (cut.end <= piece.start || cut.start >= piece.end) {
        next.push(piece);
        continue;
      }
      if (cut.start > piece.start) next.push({ start: piece.start, end: cut.start });
      if (cut.end < piece.end) next.push({ start: cut.end, end: piece.end });
    }
    current = next;
  }
  return normalize(current);
}

export function contains(intervals: Interval[], start: number, end: number): boolean {
  return intervals.some((i) => i.start <= start && i.end >= end);
}

export function totalMinutes(intervals: Interval[]): number {
  return intervals.reduce((sum, i) => sum + (i.end - i.start), 0);
}

/** True when [aStart, aEnd) and [bStart, bEnd) share any instant. */
export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}
