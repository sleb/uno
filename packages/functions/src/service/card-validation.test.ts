import { describe, expect, test } from "bun:test";
import { CardSchema } from "@uno/shared";
import {
  applyCardEffect,
  getNextPlayerId,
  isCardPlayable,
} from "./card-validation";

const numberCard = (
  color: "red" | "yellow" | "green" | "blue",
  value: number,
) => CardSchema.parse({ kind: "number", color, value });

const specialCard = (
  color: "red" | "yellow" | "green" | "blue",
  value: "skip" | "reverse" | "draw2",
) => CardSchema.parse({ kind: "special", color, value });

const wildCard = (value: "wild" | "wild_draw4") =>
  CardSchema.parse({ kind: "wild", value });

describe("isCardPlayable", () => {
  test("blocks all cards while a draw penalty is active (standard rules)", () => {
    const topCard = numberCard("red", 5);
    const card = numberCard("red", 7);
    expect(isCardPlayable(card, topCard, null, 2, [])).toBe(false);
  });

  test("blocks draw cards during draw penalty when stacking disabled (standard rules)", () => {
    const topCard = specialCard("red", "draw2");
    const card = specialCard("blue", "draw2");
    expect(isCardPlayable(card, topCard, null, 2, [])).toBe(false);
  });

  test("blocks Wild Draw Four during draw penalty when stacking disabled (standard rules)", () => {
    const topCard = wildCard("wild_draw4");
    const card = wildCard("wild_draw4");
    expect(isCardPlayable(card, topCard, "red", 4, [])).toBe(false);
  });

  test("allows draw cards to stack when stacking house rule enabled", () => {
    const topCard = specialCard("red", "draw2");
    const card = specialCard("blue", "draw2");
    expect(isCardPlayable(card, topCard, null, 2, ["stacking"])).toBe(true);
  });

  test("allows Wild Draw Four to stack when stacking house rule enabled", () => {
    const topCard = wildCard("wild_draw4");
    const card = wildCard("wild_draw4");
    expect(isCardPlayable(card, topCard, "red", 4, ["stacking"])).toBe(true);
  });

  test("always allows wild cards when no draw penalty", () => {
    const topCard = numberCard("red", 5);
    expect(isCardPlayable(wildCard("wild"), topCard, null, 0, [])).toBe(true);
  });

  test("matches by color", () => {
    const topCard = numberCard("red", 5);
    const card = numberCard("red", 9);
    expect(isCardPlayable(card, topCard, null, 0, [])).toBe(true);
  });

  test("matches by value", () => {
    const topCard = numberCard("red", 5);
    const card = numberCard("blue", 5);
    expect(isCardPlayable(card, topCard, null, 0, [])).toBe(true);
  });

  test("uses currentColor when top card is wild", () => {
    const topCard = wildCard("wild");
    const card = numberCard("green", 3);
    expect(isCardPlayable(card, topCard, "green", 0, [])).toBe(true);
  });

  test("rejects when top card is wild and no currentColor matches", () => {
    const topCard = wildCard("wild");
    const card = numberCard("green", 3);
    expect(isCardPlayable(card, topCard, null, 0, [])).toBe(false);
  });
});

describe("getNextPlayerId", () => {
  const players = ["a", "b", "c", "d"];

  test("advances clockwise", () => {
    expect(getNextPlayerId(players, 0, "clockwise", false)).toBe("b");
  });

  test("advances counter-clockwise", () => {
    expect(getNextPlayerId(players, 0, "counter-clockwise", false)).toBe("d");
  });

  test("skips the next player", () => {
    expect(getNextPlayerId(players, 1, "clockwise", true)).toBe("d");
  });
});

describe("applyCardEffect", () => {
  test("adds draw penalties", () => {
    expect(
      applyCardEffect(specialCard("red", "draw2"), "clockwise", 0),
    ).toEqual({
      direction: "clockwise",
      mustDraw: 2,
      skipNext: false,
    });
  });

  test("reverses direction", () => {
    expect(
      applyCardEffect(specialCard("red", "reverse"), "clockwise", 0),
    ).toEqual({
      direction: "counter-clockwise",
      mustDraw: 0,
      skipNext: false,
    });
  });

  test("marks skip cards", () => {
    expect(applyCardEffect(specialCard("red", "skip"), "clockwise", 0)).toEqual(
      {
        direction: "clockwise",
        mustDraw: 0,
        skipNext: true,
      },
    );
  });

  test("adds wild draw four penalties", () => {
    expect(applyCardEffect(wildCard("wild_draw4"), "clockwise", 1)).toEqual({
      direction: "clockwise",
      mustDraw: 5,
      skipNext: false,
    });
  });
});
