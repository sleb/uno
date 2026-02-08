import { beforeEach, describe, expect, test } from "bun:test";
import { getDefaultCachedPipeline, pipelineCache } from "./pipeline-cache";

describe("pipelineCache", () => {
  beforeEach(() => {
    pipelineCache.clear();
    pipelineCache.resetStats();
  });

  test("should create pipeline on first call", () => {
    const pipeline = getDefaultCachedPipeline();

    expect(pipeline).toBeDefined();
    expect(pipeline).toHaveProperty("apply");
    expect(pipeline).toHaveProperty("validate");
  });

  test("should return same instance on subsequent calls", () => {
    const pipeline1 = getDefaultCachedPipeline();
    const pipeline2 = getDefaultCachedPipeline();

    expect(pipeline1).toBe(pipeline2); // Same object reference
  });

  test("should track cache hits", () => {
    getDefaultCachedPipeline();
    getDefaultCachedPipeline();
    getDefaultCachedPipeline();

    const stats = pipelineCache.getStats();

    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(66.66666666666666);
  });

  test("should calculate hit rate correctly", () => {
    // 1 miss
    getDefaultCachedPipeline();

    // 3 hits
    getDefaultCachedPipeline();
    getDefaultCachedPipeline();
    getDefaultCachedPipeline();

    const stats = pipelineCache.getStats();

    // 3 hits out of 4 total = 75%
    expect(stats.hits).toBe(3);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(75, 1);
  });

  test("should clear cache", () => {
    getDefaultCachedPipeline();
    expect(pipelineCache.getStats().misses).toBe(1);

    pipelineCache.clear();
    pipelineCache.resetStats();

    getDefaultCachedPipeline();
    expect(pipelineCache.getStats().misses).toBe(1); // Should be 1 miss again
  });

  test("should support custom factories", () => {
    let factoryCalls = 0;
    const factory = () => {
      factoryCalls++;
      return { apply: [], validate: [], "pre-validate": [], finalize: [] };
    };

    const pipe1 = pipelineCache.getOrCreate("custom", factory);
    const pipe2 = pipelineCache.getOrCreate("custom", factory);

    expect(factoryCalls).toBe(1); // Factory should only be called once
    expect(pipe1).toBe(pipe2);
  });

  test("should support different cache keys", () => {
    const dummy = () => ({
      apply: [],
      validate: [],
      "pre-validate": [],
      finalize: [],
    });

    const pipe1 = pipelineCache.getOrCreate("key1", dummy);
    const pipe2 = pipelineCache.getOrCreate("key2", dummy);

    expect(pipe1).not.toBe(pipe2); // Different keys = different instances
  });

  test("should return hit rate 0 when no calls", () => {
    pipelineCache.resetStats();

    const stats = pipelineCache.getStats();

    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  test("should have cache enabled by default", () => {
    expect(pipelineCache.isEnabled()).toBe(true);
  });

  test("should track independent cache keys separately", () => {
    const dummy = () => ({
      apply: [],
      validate: [],
      "pre-validate": [],
      finalize: [],
    });

    pipelineCache.getOrCreate("key1", dummy);
    pipelineCache.getOrCreate("key1", dummy);
    pipelineCache.getOrCreate("key2", dummy);

    const stats = pipelineCache.getStats();

    expect(stats.misses).toBe(2); // 2 cache misses (one for each unique key)
    expect(stats.hits).toBe(1); // 1 cache hit (second key1 call)
  });
});
