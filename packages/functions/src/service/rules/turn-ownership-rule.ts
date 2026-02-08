import { ErrorCode, GAME_STATUSES, ValidationError } from "@uno/shared";
import type { Rule, RuleContext, RuleResult } from "./types";

export const createTurnOwnershipRule = (): Rule => ({
  name: "turn-ownership-validation",
  canHandle: () => true,
  validate: (context: RuleContext) => {
    if (context.game.state.status !== GAME_STATUSES.IN_PROGRESS) {
      throw new ValidationError(
        ErrorCode.GAME_NOT_IN_PROGRESS,
        "Game is not in progress",
        { gameId: context.gameId, status: context.game.state.status },
      );
    }

    const currentIndex = context.game.players.indexOf(context.playerId);
    if (currentIndex < 0) {
      throw new ValidationError(
        ErrorCode.PLAYER_NOT_FOUND,
        `Player ${context.playerId} is not in game ${context.gameId}`,
        { gameId: context.gameId, playerId: context.playerId },
      );
    }

    if (context.game.state.currentTurnPlayerId !== context.playerId) {
      throw new ValidationError(ErrorCode.NOT_YOUR_TURN, "Not your turn", {
        gameId: context.gameId,
        playerId: context.playerId,
        currentTurnPlayerId: context.game.state.currentTurnPlayerId,
      });
    }
  },
  apply: (): RuleResult => ({ effects: [], cardsDrawn: [] }),
});
