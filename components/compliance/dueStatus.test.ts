import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeDueStatus } from "./dueStatus";

const NOW = new Date("2026-06-15T00:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function daysAgo(days: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

describe("computeDueStatus", () => {
  it("is 'never' when there's no last visit", () => {
    expect(computeDueStatus(null, "monthly")).toBe("never");
  });

  it("is 'ok' well within the interval", () => {
    expect(computeDueStatus(daysAgo(5), "monthly")).toBe("ok"); // 5/30 days
  });

  it("is 'near' past the 80% threshold of the interval", () => {
    expect(computeDueStatus(daysAgo(25), "monthly")).toBe("near"); // 25/30 = 83%
  });

  it("is 'overdue' once the interval has fully elapsed", () => {
    expect(computeDueStatus(daysAgo(31), "monthly")).toBe("overdue");
  });

  it("scales the threshold by frequency — quarterly tolerates a longer gap", () => {
    expect(computeDueStatus(daysAgo(25), "quarterly")).toBe("ok"); // 25/91 days
  });
});
