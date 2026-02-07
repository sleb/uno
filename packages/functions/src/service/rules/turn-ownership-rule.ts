import { GAME_STATUSES } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createTurnOwnershipRule = (): Rule => ({
  name: "turn-ownership-validation",
  canHandle: (context: RuleContext) => context.action.type === "play",
  validate: (context: RuleContext) => {
    if (context.action.type !== "play") {
      return;
    }

    if (context.game.state.status !== GAME_STATUSES.IN_PROGRESS) {
      throw new Error("Game is not in progress");
    }

    const currentIndex = context.game.players.indexOf(context.playerId);
    if (currentIndex < 0) {
      throw new Error(
        `Player ${context.playerId} is not in game ${context.gameId}`,
      );
    }

    if (context.game.state.currentTurnPlayerId !== context.playerId) {
      throw new Error("Not your turn");
    }
  },
  apply: (): RuleResult => ({ effects: [] }),
});
