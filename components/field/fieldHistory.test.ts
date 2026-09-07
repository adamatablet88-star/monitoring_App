import { describe, expect, it } from "vitest";
import { computeFieldHistory } from "./fieldHistory";

interface FakeVisit {
  date: string;
  value: number | null | undefined;
}

const CUTOFF = "2026-01-01";

describe("computeFieldHistory", () => {
  it("returns null when there are no in-range numeric values", () => {
    const visits: FakeVisit[] = [{ date: "2025-06-01", value: 10 }]; // before cutoff
    const result = computeFieldHistory(visits, (v) => v.date, (v) => v.value, CUTOFF);
    expect(result).toBeNull();
  });

  it("computes min/max/avg/count/lastDate over in-range readings", () => {
    const visits: FakeVisit[] = [
      { date: "2026-01-05", value: 10 },
      { date: "2026-02-10", value: 20 },
      { date: "2026-03-15", value: 30 },
      { date: "2025-12-01", value: 999 }, // before cutoff — excluded
    ];
    const result = computeFieldHistory(visits, (v) => v.date, (v) => v.value, CUTOFF);
    expect(result).toEqual({ min: 10, max: 30, avg: 20, count: 3, lastDate: "2026-03-15" });
  });

  it("ignores null/undefined/NaN readings without breaking the aggregate", () => {
    const visits: FakeVisit[] = [
      { date: "2026-01-05", value: 10 },
      { date: "2026-02-10", value: null },
      { date: "2026-03-15", value: undefined },
      { date: "2026-04-01", value: NaN },
    ];
    const result = computeFieldHistory(visits, (v) => v.date, (v) => v.value, CUTOFF);
    expect(result).toEqual({ min: 10, max: 10, avg: 10, count: 1, lastDate: "2026-01-05" });
  });

  it("picks the latest date even when visits arrive out of order", () => {
    const visits: FakeVisit[] = [
      { date: "2026-03-01", value: 5 },
      { date: "2026-01-10", value: 1 },
      { date: "2026-02-15", value: 3 },
    ];
    const result = computeFieldHistory(visits, (v) => v.date, (v) => v.value, CUTOFF);
    expect(result?.lastDate).toBe("2026-03-01");
  });
});
