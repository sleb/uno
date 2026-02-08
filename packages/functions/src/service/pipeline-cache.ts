/**
 * Pipeline Cache Module
 *
 * Caches immutable rule pipelines to avoid recreating them on every action.
 * Rule pipelines are expensive to instantiate (multiple rule objects created),
 * so caching provides significant performance improvement.
 */

import type { RulePipeline } from "./rules";
import { createDefaultRulePipeline } from "./rules";

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
}

class PipelineCache {
  private cache: Map<string, RulePipeline> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.UNO_PIPELINE_CACHE !== "false"; // enabled by default
  }

  /**
   * Get or create a cached pipeline for the given key
   */
  getOrCreate(key: string, factory: () => RulePipeline): RulePipeline {
    if (!this.enabled) {
      return factory();
    }

    const cached = this.cache.get(key);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    const pipeline = factory();
    this.cache.set(key, pipeline);
    return pipeline;
  }

  /**
   * Get the default cached pipeline
   */
  getDefaultPipeline(): RulePipeline {
    return this.getOrCreate("default", () => createDefaultRulePipeline());
  }

  /**
   * Clear all cached pipelines
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Print cache statistics
   */
  printStats(): void {
    const stats = this.getStats();
    console.log("\n=== Pipeline Cache Stats ===");
    console.log(`Hits: ${stats.hits}`);
    console.log(`Misses: ${stats.misses}`);
    console.log(`Hit Rate: ${stats.hitRate.toFixed(1)}%`);
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const pipelineCache = new PipelineCache();

/**
 * Get the default cached pipeline
 */
export function getDefaultCachedPipeline(): RulePipeline {
  return pipelineCache.getDefaultPipeline();
}
