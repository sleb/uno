import { getNextPlayerId } from "../card-validation";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createPassActionApplyRule = (): Rule => ({
  name: "pass-action-apply",
  phase: "apply",

  canHandle: (ctx: RuleContext): boolean => ctx.action.type === "pass",

  validate: (): void => {
    // No validation needed - this is an apply-phase rule
  },

  apply: (ctx: RuleContext): RuleResult => {
    if (ctx.action.type !== "pass") {
      return { effects: [], cardsDrawn: [] };
    }

    const { game, playerId, player, now } = ctx;
    const currentIndex = game.players.indexOf(playerId);
    const nextPlayerId = getNextPlayerId(
      game.players,
      currentIndex,
      game.state.direction,
      false,
    );

    return {
      effects: [
        {
          type: "update-game",
          updates: {
            "state.currentTurnPlayerId": nextPlayerId,
            lastActivityAt: now,
          },
        },
        {
          type: "update-player",
          playerId,
          updates: {
            hasCalledUno: false,
            mustCallUno: false,
            "gameStats.turnsPlayed": player.gameStats.turnsPlayed + 1,
            lastActionAt: now,
          },
        },
      ],
      cardsDrawn: [],
    };
  },
});
