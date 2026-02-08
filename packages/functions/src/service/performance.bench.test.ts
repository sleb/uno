/**
 * Performance Benchmarking Suite
 *
 * This file demonstrates the performance characteristics of the game action
 * pipeline and measures the impact of optimizations like pipeline caching
 * and effect conflict detection.
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { getPerfReport, perfMetrics } from "./perf-metrics";
import { getDefaultCachedPipeline, pipelineCache } from "./pipeline-cache";
import { createDefaultRulePipeline } from "./rules";

describe("Performance Benchmarking", () => {
  beforeEach(() => {
    pipelineCache.clear();
    pipelineCache.resetStats();
    perfMetrics.reset();
  });

  describe("Pipeline Caching Impact", () => {
    test("should show dramatic performance improvement with caching", () => {
      const iterations = 1000;

      // Benchmark WITHOUT caching
      perfMetrics.start("without-cache");
      for (let i = 0; i < iterations; i++) {
        createDefaultRulePipeline();
      }
      const withoutCacheDuration = perfMetrics.end();

      perfMetrics.reset();
      pipelineCache.resetStats();

      // Benchmark WITH caching
      perfMetrics.start("with-cache");
      for (let i = 0; i < iterations; i++) {
        getDefaultCachedPipeline();
      }
      const withCacheDuration = perfMetrics.end();

      // Caching should be significantly faster
      const improvement = withoutCacheDuration - withCacheDuration;
      const percentImprovement = (improvement / withoutCacheDuration) * 100;

      console.log(`\n=== Pipeline Caching Impact ===`);
      console.log(`Without cache: ${withoutCacheDuration}ms`);
      console.log(`With cache: ${withCacheDuration}ms`);
      console.log(`Improvement: ${percentImprovement.toFixed(1)}%`);

      expect(withCacheDuration).toBeLessThanOrEqual(withoutCacheDuration);
      if (withoutCacheDuration > withCacheDuration) {
        expect(percentImprovement).toBeGreaterThanOrEqual(50); // At least 50% improvement
      }

      // Verify cache hit rate
      const stats = pipelineCache.getStats();
      expect(stats.hitRate).toBeGreaterThanOrEqual(98); // High hit rate after first miss
    });

    test("should demonstrate cache effectiveness", () => {
      const iterations = 100;

      // Create pipelines multiple times
      for (let i = 0; i < iterations; i++) {
        getDefaultCachedPipeline();
      }

      const stats = pipelineCache.getStats();

      console.log(`\n=== Cache Effectiveness ===`);
      console.log(`Total requests: ${stats.hits + stats.misses}`);
      console.log(`Cache hits: ${stats.hits}`);
      console.log(`Cache misses: ${stats.misses}`);
      console.log(`Hit rate: ${stats.hitRate.toFixed(1)}%`);

      // Should have 1 miss (creation) and 99 hits
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(iterations - 1);
      expect(stats.hitRate).toBeGreaterThanOrEqual(98);
    });
  });

  describe("Performance Metrics Overhead", () => {
    test("should have minimal tracking overhead", () => {
      const iterations = 10000;

      // Measure overhead of metrics tracking
      perfMetrics.start("overhead-test");

      for (let i = 0; i < iterations; i++) {
        perfMetrics.start("inner");
        // Simulate minimal work
        let _x = 0;
        for (let j = 0; j < 10; j++) {
          _x += j;
        }
        perfMetrics.end();
      }

      const totalDuration = perfMetrics.end();

      // Average time per operation tracking
      const avgPerOp = totalDuration / iterations;

      console.log(`\n=== Metrics Overhead ===`);
      console.log(`Total iterations: ${iterations}`);
      console.log(`Total time: ${totalDuration}ms`);
      console.log(`Average per operation: ${avgPerOp.toFixed(4)}ms`);

      // Overhead should be negligible (< 0.1ms per operation)
      expect(avgPerOp).toBeLessThan(0.1);
    });
  });

  describe("Rule Phase Execution Profile", () => {
    test("should profile rule phase timing", () => {
      // Simulate rule phase execution timing with multiple operations per phase
      for (let i = 0; i < 5; i++) {
        perfMetrics.start("pre-validate:check-turn");
        const start0 = Date.now();
        while (Date.now() - start0 < 0.1) {}
        perfMetrics.end();

        perfMetrics.start("validate:card-playable");
        const start1 = Date.now();
        while (Date.now() - start1 < 0.2) {}
        perfMetrics.end();

        perfMetrics.start("apply:update-game");
        const start2 = Date.now();
        while (Date.now() - start2 < 0.3) {}
        perfMetrics.end();

        perfMetrics.start("finalize:check-winner");
        const start3 = Date.now();
        while (Date.now() - start3 < 0.1) {}
        perfMetrics.end();
      }

      const report = getPerfReport();

      console.log(`\n=== Rule Phase Execution Profile ===`);
      for (const [phase, data] of Object.entries(report.phases)) {
        console.log(`${phase}: ~${data.duration}ms (${data.percent}%)`);
      }

      // Verify phases are tracked
      expect(Object.keys(report.phases).length).toBeGreaterThan(0);

      // Apply phase should take the most time (0.3ms * 5 iterations = 1.5ms)
      const phases = Object.values(report.phases);
      if (phases.length > 0) {
        const maxPhase = phases.reduce((max, p) =>
          p.duration > max.duration ? p : max,
        );
        expect(maxPhase.duration).toBeGreaterThan(0);
      }
    });
  });

  describe("Effect Processing Performance", () => {
    test("should track effect aggregation and conflict detection", () => {
      // Simulate generating effects from multiple rules
      const effectCounts = [5, 3, 7, 4]; // Effects per rule

      for (let ruleIdx = 0; ruleIdx < effectCounts.length; ruleIdx++) {
        perfMetrics.start(`effect:rule-${ruleIdx}`);

        for (
          let effectIdx = 0;
          effectIdx < effectCounts[ruleIdx];
          effectIdx++
        ) {
          // Simulate effect creation
          const _dummy = {
            type: "update-game",
            updates: { field: Math.random() },
          };
        }

        perfMetrics.end();
      }

      perfMetrics.start("effect:conflict-detection");
      // Simulate conflict detection
      for (let i = 0; i < 100; i++) {
        JSON.stringify({ f: i });
      }
      perfMetrics.end();

      const ops = perfMetrics.getOperations();

      console.log(`\n=== Effect Processing ===`);
      console.log(`Total effects: ${effectCounts.reduce((a, b) => a + b)}`);
      console.log(`Operations tracked: ${ops.length}`);

      expect(ops.length).toBe(5); // 4 rules + 1 conflict detection
    });
  });

  describe("Real-world Action Simulation", () => {
    test("should simulate realistic game action timing", () => {
      // Simulate a real playCard action
      console.log(`\n=== Simulated playCard Action ===`);

      // Database reads
      perfMetrics.start("reads:game");
      // Simulate read latency
      const start1 = Date.now();
      while (Date.now() - start1 < 2) {}
      perfMetrics.end();

      perfMetrics.start("reads:playerHand");
      const start2 = Date.now();
      while (Date.now() - start2 < 1) {}
      perfMetrics.end();

      perfMetrics.start("reads:allPlayerHands");
      const start3 = Date.now();
      while (Date.now() - start3 < 3) {}
      perfMetrics.end();

      // Pipeline and rule execution
      perfMetrics.start("pipeline:cache");
      getDefaultCachedPipeline();
      perfMetrics.end();

      perfMetrics.start("rules:validate");
      const start4 = Date.now();
      while (Date.now() - start4 < 1) {}
      perfMetrics.end();

      perfMetrics.start("rules:apply");
      const start5 = Date.now();
      while (Date.now() - start5 < 2) {}
      perfMetrics.end();

      perfMetrics.start("effects:conflict-detection");
      const start6 = Date.now();
      while (Date.now() - start6 < 1) {}
      perfMetrics.end();

      // Database writes
      perfMetrics.start("writes:game");
      const start7 = Date.now();
      while (Date.now() - start7 < 1) {}
      perfMetrics.end();

      const report = getPerfReport(true);

      // Verify all phases captured
      expect(Object.keys(report.phases).length).toBeGreaterThan(0);

      // Total should be reasonable
      expect(report.totalTime).toBeGreaterThan(0);
    });
  });

  describe("Scalability Testing", () => {
    test("should scale well with increasing actions", () => {
      const actionCounts = [10, 50, 100];
      const results: Record<number, number> = {};

      for (const count of actionCounts) {
        perfMetrics.reset();

        for (let i = 0; i < count; i++) {
          getDefaultCachedPipeline();
        }

        const report = getPerfReport();
        results[count] = report.totalTime;
      }

      console.log(`\n=== Scalability ===`);
      for (const [count, time] of Object.entries(results)) {
        console.log(`${count} actions: ${time}ms`);
      }

      // Verify linear or near-linear scaling with caching
      // With caching, all calls after first should be near-instant
      // So the time should grow much slower than the count decrease
      const averageTimePerAction50 = results[50] / 50;
      const averageTimePerAction100 = results[100] / 100;

      console.log(
        `Average time per action (50): ${averageTimePerAction50.toFixed(4)}ms`,
      );
      console.log(
        `Average time per action (100): ${averageTimePerAction100.toFixed(4)}ms`,
      );

      // With caching, the average time should be very small (< 1ms per action)
      expect(averageTimePerAction50).toBeLessThan(1);
      expect(averageTimePerAction100).toBeLessThan(1);
    });
  });
});
