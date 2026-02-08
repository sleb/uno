import { beforeEach, describe, expect, test } from "bun:test";
import {
  getPerfReport,
  measureAsync,
  measureSync,
  perfMetrics,
} from "./perf-metrics";

describe("perfMetrics", () => {
  beforeEach(() => {
    perfMetrics.reset();
  });

  test("should measure synchronous operations", () => {
    perfMetrics.start("operation");
    // Simulate some work
    for (let i = 0; i < 1000000; i++) {
      // busy loop
    }
    const duration = perfMetrics.end();

    expect(duration).toBeGreaterThanOrEqual(0);

    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("operation");
    expect(ops[0].duration).toBeGreaterThanOrEqual(0);
  });

  test("should measure async operations", async () => {
    await measureAsync("async-op", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("async-op");
    expect(ops[0].duration).toBeGreaterThanOrEqual(10);
  });

  test("should use timer helper for synchronous functions", () => {
    const result = measureSync("timer-op", () => 42);

    expect(result).toBe(42);

    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("timer-op");
  });

  test("should use timerAsync helper for async functions", async () => {
    const result = await measureAsync("timer-async-op", async () => "hello");

    expect(result).toBe("hello");

    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("timer-async-op");
  });

  test("should support nested operations", () => {
    perfMetrics.start("outer");
    for (let i = 0; i < 100000; i++) {
      // busy loop
    }

    perfMetrics.start("inner");
    for (let i = 0; i < 50000; i++) {
      // busy loop
    }
    perfMetrics.end(); // end inner

    perfMetrics.end(); // end outer

    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(2);
    expect(ops[0].label).toBe("inner");
    expect(ops[1].label).toBe("outer");
  });

  test("should generate performance report", () => {
    perfMetrics.start("phase1:operation");
    perfMetrics.end();

    perfMetrics.start("phase1:operation2");
    perfMetrics.end();

    perfMetrics.start("phase2:operation");
    perfMetrics.end();

    const report = getPerfReport();

    expect(report.phases).toHaveProperty("phase1");
    expect(report.phases).toHaveProperty("phase2");
    expect(report.operations).toHaveLength(3);
  });

  test("should handle empty operations gracefully", () => {
    const report = getPerfReport();

    expect(report.totalTime).toBe(0);
    expect(report.operations).toHaveLength(0);
  });

  test("should track operations without blocking", () => {
    const start = Date.now();

    for (let i = 0; i < 100; i++) {
      perfMetrics.start("op");
      perfMetrics.end();
    }

    const elapsed = Date.now() - start;

    // All operations should take < 100ms total
    // (just measuring overhead of tracking)
    expect(elapsed).toBeLessThan(100);
  });

  test("isEnabled should reflect environment", () => {
    expect(perfMetrics.isEnabled()).toBe(true); // enabled in test environment
  });

  test("should handle timer exceptions gracefully", () => {
    expect(() => {
      perfMetrics.timer("error-op", () => {
        throw new Error("test error");
      });
    }).toThrow("test error");

    // Operation should still be recorded
    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("error-op");
  });

  test("should handle async timer exceptions gracefully", async () => {
    await expect(
      measureAsync("error-async-op", async () => {
        throw new Error("test error");
      }),
    ).rejects.toThrow("test error");

    // Operation should still be recorded
    const ops = perfMetrics.getOperations();
    expect(ops).toHaveLength(1);
    expect(ops[0].label).toBe("error-async-op");
  });

  test("should calculate phase percentages correctly", () => {
    // Simulate different phases
    for (let i = 0; i < 3; i++) {
      perfMetrics.start("phase1:op");
      perfMetrics.end();
      perfMetrics.start("phase2:op");
      perfMetrics.end();
    }

    const report = getPerfReport();

    // Each phase should have reasonable percentages
    const _total =
      report.phases.phase1.duration + report.phases.phase2.duration;
    const percent1 = report.phases.phase1.percent;
    const percent2 = report.phases.phase2.percent;

    expect(percent1 + percent2).toBeLessThanOrEqual(100);
  });
});
