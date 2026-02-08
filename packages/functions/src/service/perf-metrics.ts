/**
 * Performance Metrics Module
 *
 * Tracks execution times of game actions and rule phases.
 * Useful for identifying bottlenecks and optimizing performance.
 */

interface TimingEntry {
  label: string;
  duration: number; // milliseconds
  startTime: number;
}

interface PerfReport {
  totalTime: number;
  phases: Record<string, { duration: number; percent: number }>;
  operations: TimingEntry[];
}

class PerfMetrics {
  private enabled: boolean;
  private stack: TimingEntry[] = [];
  private operations: TimingEntry[] = [];
  private startTime: number | null = null;

  constructor() {
    this.enabled =
      process.env.UNO_PERF_METRICS === "true" ||
      process.env.NODE_ENV === "test";
  }

  /**
   * Start timing a named operation
   */
  start(label: string): void {
    if (!this.enabled) return;

    if (this.stack.length === 0 && this.startTime === null) {
      this.startTime = Date.now();
    }

    this.stack.push({
      label,
      duration: 0,
      startTime: Date.now(),
    });
  }

  /**
   * End timing for the current operation
   */
  end(): number {
    if (!this.enabled || this.stack.length === 0) return 0;

    const entry = this.stack.pop();
    if (!entry) return 0; // Should never happen due to length check, but satisfies type safety

    const duration = Date.now() - entry.startTime;
    entry.duration = duration;

    this.operations.push(entry);

    return duration;
  }

  /**
   * Create a timer function that auto-ends on return
   */
  timer<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      return fn();
    } finally {
      this.end();
    }
  }

  /**
   * Async timer function
   */
  async timerAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      return await fn();
    } finally {
      this.end();
    }
  }

  /**
   * Get all recorded timings
   */
  getOperations(): TimingEntry[] {
    return [...this.operations];
  }

  /**
   * Generate a performance report
   */
  getReport(): PerfReport {
    const totalTime = this.startTime !== null ? Date.now() - this.startTime : 0;

    // Group by phase (extract first part of label before colon)
    const phases: Record<string, number[]> = {};
    for (const op of this.operations) {
      const phase = op.label.split(":")[0];
      if (!phases[phase]) {
        phases[phase] = [];
      }
      phases[phase].push(op.duration);
    }

    // Calculate phase totals and percentages
    const phaseSummary: Record<string, { duration: number; percent: number }> =
      {};
    for (const [phase, durations] of Object.entries(phases)) {
      const duration = durations.reduce((a, b) => a + b, 0);
      phaseSummary[phase] = {
        duration,
        percent: totalTime > 0 ? Math.round((duration / totalTime) * 100) : 0,
      };
    }

    return {
      totalTime,
      phases: phaseSummary,
      operations: this.operations,
    };
  }

  /**
   * Print a human-readable performance report
   */
  printReport(): void {
    if (!this.enabled || this.operations.length === 0) return;

    const report = this.getReport();

    console.log("\n=== Performance Report ===");
    console.log(`Total time: ${report.totalTime}ms\n`);

    console.log("Phase breakdown:");
    for (const [phase, data] of Object.entries(report.phases)) {
      console.log(`  ${phase}: ${data.duration}ms (${data.percent}%)`);
    }

    console.log("\nDetailed operations:");
    for (const op of report.operations) {
      console.log(`  ${op.label}: ${op.duration}ms`);
    }
  }

  /**
   * Clear all metrics
   */
  reset(): void {
    this.stack = [];
    this.operations = [];
    this.startTime = null;
  }

  /**
   * Check if metrics are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const perfMetrics = new PerfMetrics();

/**
 * Helper function to measure a synchronous function
 */
export function measureSync<T>(label: string, fn: () => T): T {
  return perfMetrics.timer(label, fn);
}

/**
 * Helper function to measure an async function
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  return perfMetrics.timerAsync(label, fn);
}

/**
 * Get a performance report and optionally print it
 */
export function getPerfReport(print: boolean = false): PerfReport {
  const report = perfMetrics.getReport();
  if (print) {
    perfMetrics.printReport();
  }
  return report;
}
