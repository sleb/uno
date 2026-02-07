import type { Card, Color, HouseRule } from "@uno/shared";

export type Direction = "clockwise" | "counter-clockwise";

export const isDrawCard = (card: Card): boolean =>
  (card.kind === "special" && card.value === "draw2") ||
  (card.kind === "wild" && card.value === "wild_draw4");

export const isCardPlayable = (
  card: Card,
  topCard: Card,
  currentColor: Color | null,
  mustDraw: number,
  houseRules: HouseRule[],
): boolean => {
  if (mustDraw > 0) {
    // If stacking is enabled, allow draw cards to be played
    if (houseRules.includes("stacking") && isDrawCard(card)) {
      return true;
    }
    // Otherwise, no card can be played when mustDraw > 0
    return false;
  }

  if (card.kind === "wild") {
    return true;
  }

  const activeColor =
    currentColor ?? (topCard.kind === "wild" ? null : topCard.color);

  if (activeColor && card.color === activeColor) {
    return true;
  }

  return card.value === topCard.value;
};

export const getNextPlayerId = (
  players: string[],
  currentIndex: number,
  direction: Direction,
  skipNext: boolean,
): string => {
  const step = direction === "clockwise" ? 1 : -1;
  const offset = skipNext ? 2 : 1;
  const nextIndex =
    (currentIndex + step * offset + players.length) % players.length;

  return players[nextIndex];
};

export const applyCardEffect = (
  card: Card,
  direction: Direction,
  mustDraw: number,
): { direction: Direction; mustDraw: number; skipNext: boolean } => {
  let nextDirection = direction;
  let nextMustDraw = mustDraw;
  let skipNext = false;

  if (card.kind === "special") {
    if (card.value === "skip") {
      skipNext = true;
    } else if (card.value === "reverse") {
      nextDirection =
        direction === "clockwise" ? "counter-clockwise" : "clockwise";
    } else if (card.value === "draw2") {
      nextMustDraw += 2;
    }
  }

  if (card.kind === "wild" && card.value === "wild_draw4") {
    nextMustDraw += 4;
  }

  return { direction: nextDirection, mustDraw: nextMustDraw, skipNext };
};
