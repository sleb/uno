import type { Card } from "@uno/shared";
import { getNextPlayerId, isCardPlayable } from "../card-validation";
import { drawCardsFromDeck, getTopCard } from "../draw-utils";
import type { Rule, RuleContext, RuleResult } from "./types";

const MAX_DRAW_TO_MATCH_ATTEMPTS = 50;

export const createDrawActionApplyRule = (): Rule => ({
  name: "draw-action-apply",
  phase: "apply",

  canHandle: (ctx: RuleContext): boolean => ctx.action.type === "draw",

  validate: (): void => {
    // No validation needed - this is an apply-phase rule
  },

  apply: (ctx: RuleContext): RuleResult => {
    if (ctx.action.type !== "draw") {
      return { effects: [], cardsDrawn: [] };
    }

    const { game, playerId, playerHand, playerHands, player, now } = ctx;
    const isPenaltyDraw = game.state.mustDraw > 0;
    const isDrawToMatchEnabled =
      !isPenaltyDraw && game.config.houseRules.includes("drawToMatch");

    let drawnCards: Card[] = [];
    let deckSeed = game.state.deckSeed;
    let drawPileCount = game.state.drawPileCount;
    let discardPile = game.state.discardPile;
    let currentPlayerHands = playerHands;

    if (isPenaltyDraw) {
      const result = drawCardsFromDeck({
        seed: deckSeed,
        discardPile,
        playerHands: currentPlayerHands,
        count: game.state.mustDraw,
      });
      drawnCards = result.drawnCards;
      deckSeed = result.deckSeed;
      drawPileCount = result.drawPileCount;
      discardPile = result.discardPile;
    } else if (isDrawToMatchEnabled) {
      const topCard = getTopCard(game.state.discardPile);
      let drawAttempts = 0;

      while (drawAttempts < MAX_DRAW_TO_MATCH_ATTEMPTS) {
        let cardsToDrawThisTime: Card[];
        try {
          const result = drawCardsFromDeck({
            seed: deckSeed,
            discardPile,
            playerHands: currentPlayerHands,
            count: 1,
          });
          cardsToDrawThisTime = result.drawnCards;
          deckSeed = result.deckSeed;
          drawPileCount = result.drawPileCount;
          discardPile = result.discardPile;

          const currentHand = currentPlayerHands[playerId];
          if (!currentHand) {
            throw new Error("Player hand not found");
          }
          currentPlayerHands = {
            ...currentPlayerHands,
            [playerId]: {
              hand: [...currentHand.hand, ...cardsToDrawThisTime],
            },
          };
        } catch {
          break;
        }

        drawnCards.push(...cardsToDrawThisTime);
        drawAttempts += 1;

        const lastDrawn = cardsToDrawThisTime[0];
        if (!lastDrawn) {
          break;
        }

        if (
          isCardPlayable(
            lastDrawn,
            topCard,
            game.state.currentColor,
            0,
            game.config.houseRules,
          )
        ) {
          break;
        }
      }
    } else {
      const result = drawCardsFromDeck({
        seed: deckSeed,
        discardPile,
        playerHands: currentPlayerHands,
        count: ctx.action.count,
      });
      drawnCards = result.drawnCards;
      deckSeed = result.deckSeed;
      drawPileCount = result.drawPileCount;
      discardPile = result.discardPile;
    }

    const newHand = [...playerHand.hand, ...drawnCards];
    const currentIndex = game.players.indexOf(playerId);
    const nextPlayerId = isPenaltyDraw
      ? getNextPlayerId(game.players, currentIndex, game.state.direction, false)
      : playerId;

    return {
      effects: [
        {
          type: "update-game",
          updates: {
            "state.deckSeed": deckSeed,
            "state.drawPileCount": drawPileCount,
            "state.discardPile": discardPile,
            "state.currentTurnPlayerId": nextPlayerId,
            "state.mustDraw": 0,
            lastActivityAt: now,
          },
        },
        {
          type: "update-hand",
          playerId,
          hand: newHand,
        },
        {
          type: "update-player",
          playerId,
          updates: {
            cardCount: newHand.length,
            status: "active",
            hasCalledUno: false,
            mustCallUno: false,
            "gameStats.cardsDrawn":
              player.gameStats.cardsDrawn + drawnCards.length,
            "gameStats.turnsPlayed":
              player.gameStats.turnsPlayed + (isPenaltyDraw ? 1 : 0),
            lastActionAt: now,
          },
        },
      ],
      cardsDrawn: drawnCards,
    };
  },
});
