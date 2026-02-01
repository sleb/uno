import { type Card, CardSchema } from "@uno/shared";

export const DECK_SIZE = 108;

const COLORS: Array<"red" | "yellow" | "green" | "blue"> = [
  "red",
  "yellow",
  "green",
  "blue",
];

const NUMBER_VALUES: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const SPECIAL_VALUES: Array<"skip" | "reverse" | "draw2"> = [
  "skip",
  "reverse",
  "draw2",
];

const buildOrderedDeck = (): Card[] => {
  const deck: Card[] = [];

  for (const color of COLORS) {
    deck.push(CardSchema.parse({ kind: "number", color, value: 0 }));
    for (const value of NUMBER_VALUES.slice(1)) {
      deck.push(CardSchema.parse({ kind: "number", color, value }));
      deck.push(CardSchema.parse({ kind: "number", color, value }));
    }

    for (const value of SPECIAL_VALUES) {
      deck.push(CardSchema.parse({ kind: "special", color, value }));
      deck.push(CardSchema.parse({ kind: "special", color, value }));
    }
  }

  for (let i = 0; i < 4; i++) {
    deck.push(CardSchema.parse({ kind: "wild", value: "wild" }));
    deck.push(CardSchema.parse({ kind: "wild", value: "wild_draw4" }));
  }

  return deck;
};

const hashSeed = (seed: string): number => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
};

const mulberry32 = (seed: number): (() => number) => {
  let t = seed;
  return () => {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const deckCache = new Map<string, Card[]>();

const getDeckForSeed = (seed: string): Card[] => {
  const cached = deckCache.get(seed);
  if (cached) {
    return cached;
  }

  const deck = buildOrderedDeck();
  const random = mulberry32(hashSeed(seed));

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }

  deckCache.set(seed, deck);
  return deck;
};

/**
 * Generates a card at a specific index using the deck seed.
 * Uses a deterministic algorithm to ensure consistent card generation.
 */
export const generateCardAtIndex = (seed: string, index: number): Card => {
  const deck = getDeckForSeed(seed);
  const card = deck[index];
  if (!card) {
    throw new Error(
      `Index ${index} is out of bounds for deck size ${deck.length}`,
    );
  }
  return card;
};
