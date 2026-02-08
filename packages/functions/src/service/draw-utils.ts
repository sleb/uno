import type { Card, PlayerHandData } from "@uno/shared";
import { getDeckForSeed } from "./deck-utils";

export const generateDeckSeed = (): string => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

export const getTopCard = (discardPile: Card[]): Card => {
  const topCard = discardPile[discardPile.length - 1];

  if (!topCard) {
    throw new Error("Discard pile is empty");
  }

  return topCard;
};

const isSameCard = (left: Card, right: Card): boolean => {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.value !== right.value) {
    return false;
  }

  if ("color" in left || "color" in right) {
    return "color" in left && "color" in right && left.color === right.color;
  }

  return true;
};

const removeCardFromDeck = (deck: Card[], card: Card): void => {
  const index = deck.findIndex((candidate) => isSameCard(candidate, card));

  if (index < 0) {
    throw new Error("Card not found in deck");
  }

  deck.splice(index, 1);
};

const buildAvailableDeck = (seed: string, usedCards: Card[]): Card[] => {
  const deck = [...getDeckForSeed(seed)];

  for (const card of usedCards) {
    removeCardFromDeck(deck, card);
  }

  return deck;
};

const buildUsedCards = (
  discardPile: Card[],
  hands: Card[],
  keepAllDiscards: boolean,
): Card[] => {
  const usedCards = [...hands];

  if (discardPile.length > 0) {
    usedCards.push(
      ...(keepAllDiscards
        ? discardPile
        : [discardPile[discardPile.length - 1]]),
    );
  }

  return usedCards;
};

const collectHandCards = (
  playerHands: Record<string, PlayerHandData>,
): Card[] => {
  return Object.values(playerHands).flatMap((hand) => hand.hand);
};

export const drawCardsFromDeck = ({
  seed,
  discardPile,
  playerHands,
  count,
}: {
  seed: string;
  discardPile: Card[];
  playerHands: Record<string, PlayerHandData>;
  count: number;
}): {
  drawnCards: Card[];
  deckSeed: string;
  drawPileCount: number;
  discardPile: Card[];
} => {
  const handCards = collectHandCards(playerHands);
  let deckSeed = seed;
  let activeDiscardPile = discardPile;
  let usedCards = buildUsedCards(activeDiscardPile, handCards, true);
  let availableDeck = buildAvailableDeck(deckSeed, usedCards);

  if (availableDeck.length < count) {
    if (discardPile.length <= 1) {
      throw new Error("Not enough cards in deck to draw");
    }

    deckSeed = generateDeckSeed();
    activeDiscardPile = [getTopCard(discardPile)];
    usedCards = buildUsedCards(activeDiscardPile, handCards, false);
    availableDeck = buildAvailableDeck(deckSeed, usedCards);
  }

  if (availableDeck.length < count) {
    throw new Error("Not enough cards in deck to draw");
  }

  const drawnCards: Card[] = [];
  const remainingDeck = [...availableDeck];
  for (let i = 0; i < count; i++) {
    const nextCard = remainingDeck.shift();
    if (!nextCard) {
      throw new Error("Not enough cards in deck to draw");
    }
    drawnCards.push(nextCard);
  }

  return {
    drawnCards,
    deckSeed,
    drawPileCount: remainingDeck.length,
    discardPile: activeDiscardPile,
  };
};
