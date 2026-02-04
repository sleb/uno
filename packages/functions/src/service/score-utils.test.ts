import { describe, expect, test } from "bun:test";
import type { Card } from "@uno/shared";
import {
  calculateCardScore,
  calculateHandScore,
  isSpecialCard,
} from "./score-utils";

describe("calculateCardScore", () => {
  test("number cards score their face value", () => {
    const cards: Card[] = [
      { kind: "number", color: "red", value: 0 },
      { kind: "number", color: "blue", value: 1 },
      { kind: "number", color: "green", value: 5 },
      { kind: "number", color: "yellow", value: 9 },
    ];

    expect(calculateCardScore(cards[0])).toBe(0);
    expect(calculateCardScore(cards[1])).toBe(1);
    expect(calculateCardScore(cards[2])).toBe(5);
    expect(calculateCardScore(cards[3])).toBe(9);
  });

  test("special cards score 20 points", () => {
    const cards: Card[] = [
      { kind: "special", color: "red", value: "skip" },
      { kind: "special", color: "blue", value: "reverse" },
      { kind: "special", color: "green", value: "draw2" },
    ];

    expect(calculateCardScore(cards[0])).toBe(20);
    expect(calculateCardScore(cards[1])).toBe(20);
    expect(calculateCardScore(cards[2])).toBe(20);
  });

  test("wild cards score 50 points", () => {
    const cards: Card[] = [
      { kind: "wild", value: "wild" },
      { kind: "wild", value: "wild_draw4" },
    ];

    expect(calculateCardScore(cards[0])).toBe(50);
    expect(calculateCardScore(cards[1])).toBe(50);
  });
});

describe("calculateHandScore", () => {
  test("empty hand scores 0 points", () => {
    expect(calculateHandScore([])).toBe(0);
  });

  test("calculates total for mixed hand", () => {
    const hand: Card[] = [
      { kind: "number", color: "red", value: 5 }, // 5
      { kind: "number", color: "blue", value: 3 }, // 3
      { kind: "special", color: "green", value: "skip" }, // 20
      { kind: "wild", value: "wild" }, // 50
    ];

    expect(calculateHandScore(hand)).toBe(78);
  });

  test("calculates total for all number cards", () => {
    const hand: Card[] = [
      { kind: "number", color: "red", value: 2 },
      { kind: "number", color: "blue", value: 4 },
      { kind: "number", color: "green", value: 6 },
    ];

    expect(calculateHandScore(hand)).toBe(12);
  });

  test("calculates total for all special cards", () => {
    const hand: Card[] = [
      { kind: "special", color: "red", value: "skip" },
      { kind: "special", color: "blue", value: "reverse" },
      { kind: "special", color: "green", value: "draw2" },
    ];

    expect(calculateHandScore(hand)).toBe(60);
  });

  test("calculates total for all wild cards", () => {
    const hand: Card[] = [
      { kind: "wild", value: "wild" },
      { kind: "wild", value: "wild_draw4" },
      { kind: "wild", value: "wild" },
    ];

    expect(calculateHandScore(hand)).toBe(150);
  });

  test("single card hand", () => {
    const hand: Card[] = [{ kind: "number", color: "red", value: 7 }];

    expect(calculateHandScore(hand)).toBe(7);
  });
});

describe("isSpecialCard", () => {
  test("number cards are not special", () => {
    const cards: Card[] = [
      { kind: "number", color: "red", value: 0 },
      { kind: "number", color: "blue", value: 5 },
      { kind: "number", color: "green", value: 9 },
    ];

    for (const card of cards) {
      expect(isSpecialCard(card)).toBe(false);
    }
  });

  test("special action cards are special", () => {
    const cards: Card[] = [
      { kind: "special", color: "red", value: "skip" },
      { kind: "special", color: "blue", value: "reverse" },
      { kind: "special", color: "green", value: "draw2" },
    ];

    for (const card of cards) {
      expect(isSpecialCard(card)).toBe(true);
    }
  });

  test("wild cards are special", () => {
    const cards: Card[] = [
      { kind: "wild", value: "wild" },
      { kind: "wild", value: "wild_draw4" },
    ];

    for (const card of cards) {
      expect(isSpecialCard(card)).toBe(true);
    }
  });
});
