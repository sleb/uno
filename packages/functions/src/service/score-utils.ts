import type { Card } from "@uno/shared";

/**
 * Calculate the point value of a single card according to official UNO scoring rules.
 *
 * Official UNO Scoring:
 * - Number cards (0-9): Face value
 * - Special cards (Skip, Reverse, Draw Two): 20 points each
 * - Wild cards (Wild, Wild Draw Four): 50 points each
 *
 * @param card - The card to calculate points for
 * @returns The point value of the card
 */
export const calculateCardScore = (card: Card): number => {
  switch (card.kind) {
    case "number":
      return card.value; // 0-9 points
    case "special":
      return 20; // Skip, Reverse, Draw Two
    case "wild":
      return 50; // Wild, Wild Draw Four
  }
};

/**
 * Calculate the total score for a player's hand.
 * The winner scores points based on all opponents' remaining cards.
 *
 * @param hand - Array of cards in player's hand
 * @returns Total point value of all cards in hand
 */
export const calculateHandScore = (hand: Card[]): number => {
  return hand.reduce((total, card) => total + calculateCardScore(card), 0);
};

/**
 * Check if a card is a special action card (not a number card).
 * Used for tracking specialCardsPlayed statistics.
 *
 * @param card - The card to check
 * @returns True if the card is special or wild
 */
export const isSpecialCard = (card: Card): boolean => {
  return card.kind === "special" || card.kind === "wild";
};
