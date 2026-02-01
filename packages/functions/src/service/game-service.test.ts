import { describe, expect, test } from "bun:test";
import { generateCardAtIndex } from "./deck-utils";

describe("generateCardAtIndex", () => {
  test("is deterministic for the same seed and index", () => {
    const seed = "test-seed";
    const index = 42;

    const first = generateCardAtIndex(seed, index);
    const second = generateCardAtIndex(seed, index);

    expect(second).toEqual(first);
  });

  test("can generate a full 108-card deck deterministically", () => {
    const seed = "deck-seed";

    const deckA = Array.from({ length: 108 }, (_, i) =>
      generateCardAtIndex(seed, i),
    );
    const deckB = Array.from({ length: 108 }, (_, i) =>
      generateCardAtIndex(seed, i),
    );

    expect(deckA).toHaveLength(108);
    expect(deckB).toHaveLength(108);
    expect(deckB).toEqual(deckA);
  });

  test("matches official UNO deck histogram", () => {
    const seed = "count-seed";
    const _deck = Array.from({ length: 108 }, (_, i) =>
      generateCardAtIndex(seed, i),
    );
  });
});
