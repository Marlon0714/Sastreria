export interface SyncLatencySlo {
  p50Ms: number;
  p95Ms: number;
}

export interface SyncLatencySummary {
  count: number;
  p50Ms: number;
  p95Ms: number;
}

function percentile(
  sortedValues: readonly number[],
  percentileRank: number,
): number {
  if (!sortedValues.length) {
    return 0;
  }

  const safeRank = Math.max(0, Math.min(100, percentileRank));
  const index = Math.ceil((safeRank / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)] ?? 0;
}

export class SyncMetrics {
  private readonly samples: number[] = [];

  constructor(private readonly maxSamples: number = 5000) {}

  recordLatency(latencyMs: number): void {
    if (!Number.isFinite(latencyMs) || latencyMs < 0) {
      return;
    }

    this.samples.push(latencyMs);
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  summarize(): SyncLatencySummary {
    const sorted = [...this.samples].sort((left, right) => left - right);

    return {
      count: sorted.length,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
    };
  }
}

export function meetsLatencySlo(
  summary: SyncLatencySummary,
  slo: SyncLatencySlo,
): boolean {
  return summary.p50Ms <= slo.p50Ms && summary.p95Ms <= slo.p95Ms;
}
