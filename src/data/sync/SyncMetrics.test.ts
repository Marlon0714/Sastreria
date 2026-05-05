import { describe, expect, it } from "@jest/globals";

import { SyncMetrics, meetsLatencySlo } from "./SyncMetrics";

describe("SyncMetrics", () => {
  it("calculates p50 and p95 and validates SLO", () => {
    const metrics = new SyncMetrics();
    const latencies = [
      1200, 1800, 2200, 3000, 4200, 5000, 7100, 8200, 15000, 19000,
    ];

    for (const latency of latencies) {
      metrics.recordLatency(latency);
    }

    const summary = metrics.summarize();

    expect(summary.count).toBe(10);
    expect(summary.p50Ms).toBe(4200);
    expect(summary.p95Ms).toBe(19000);
    expect(
      meetsLatencySlo(summary, {
        p50Ms: 5000,
        p95Ms: 20000,
      }),
    ).toBe(true);
  });

  it("fails SLO when p95 is above target", () => {
    const metrics = new SyncMetrics();
    const latencies = [
      1200, 1800, 2200, 3000, 4200, 5000, 7100, 8200, 15000, 25000,
    ];

    for (const latency of latencies) {
      metrics.recordLatency(latency);
    }

    const summary = metrics.summarize();

    expect(
      meetsLatencySlo(summary, {
        p50Ms: 5000,
        p95Ms: 20000,
      }),
    ).toBe(false);
  });

  it("returns zeroed percentiles when there are no samples", () => {
    // Arrange
    const metrics = new SyncMetrics();

    // Act
    const summary = metrics.summarize();

    // Assert
    expect(summary).toEqual({ count: 0, p50Ms: 0, p95Ms: 0 });
  });

  it("ignores invalid latency samples", () => {
    // Arrange
    const metrics = new SyncMetrics();

    // Act
    metrics.recordLatency(Number.NaN);
    metrics.recordLatency(Number.POSITIVE_INFINITY);
    metrics.recordLatency(-10);
    metrics.recordLatency(1000);
    const summary = metrics.summarize();

    // Assert
    expect(summary.count).toBe(1);
    expect(summary.p50Ms).toBe(1000);
    expect(summary.p95Ms).toBe(1000);
  });

  it("keeps only the most recent samples when maxSamples is exceeded", () => {
    // Arrange
    const metrics = new SyncMetrics(3);

    // Act
    metrics.recordLatency(100);
    metrics.recordLatency(200);
    metrics.recordLatency(300);
    metrics.recordLatency(400);
    const summary = metrics.summarize();

    // Assert
    expect(summary.count).toBe(3);
    expect(summary.p50Ms).toBe(300);
    expect(summary.p95Ms).toBe(400);
  });
});
