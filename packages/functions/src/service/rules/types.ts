import type {
  Card,
  GameData,
  GamePlayerData,
  PlayerHandData,
} from "@uno/shared";
import type { Transaction } from "firebase-admin/firestore";

export type PlayCardAction = {
  type: "play";
  cardIndex: number;
  chosenColor?: string;
};

export type DrawCardAction = {
  type: "draw";
  count: number;
};

export type PassTurnAction = {
  type: "pass";
};

export type GameAction = PlayCardAction | DrawCardAction | PassTurnAction;

export type RuleContext = {
  gameId: string;
  playerId: string;
  action: GameAction;
  game: GameData;
  player: GamePlayerData;
  playerHand: PlayerHandData;
  playerHands: Record<string, PlayerHandData>;
  transaction: Transaction;
  now: string;
};

export type UpdateGameEffect = {
  type: "update-game";
  updates: Record<string, unknown>;
};

export type UpdatePlayerEffect = {
  type: "update-player";
  playerId: string;
  updates: Record<string, unknown>;
};

export type UpdateHandEffect = {
  type: "update-hand";
  playerId: string;
  hand: Card[];
};

export type SetWinnerEffect = {
  type: "set-winner";
  winnerId: string;
  preFetchedData: {
    game: GameData;
    playerHands: Record<string, PlayerHandData>;
    gamePlayers: Record<string, GamePlayerData>;
    userDataMap: Record<string, any>;
  };
};

export type EmitEventsEffect = {
  type: "emit-events";
  events: Array<{
    type: string;
    payload?: Record<string, unknown>;
  }>;
};

export type RuleEffect =
  | UpdateGameEffect
  | UpdatePlayerEffect
  | UpdateHandEffect
  | SetWinnerEffect
  | EmitEventsEffect;

export type RuleResult = {
  effects: RuleEffect[];
  cardsDrawn: Card[];
};

export type Rule = {
  name: string;
  phase: "pre-validate" | "validate" | "apply" | "finalize";
  /**
   * List of context fields this rule depends on
   * Used for documentation and future dependency validation
   * Example: ["game", "playerHand", "player"]
   */
  dependencies?: (keyof RuleContext)[];
  canHandle: (context: RuleContext) => boolean;
  validate?: (context: RuleContext) => void;
  apply: (context: RuleContext) => RuleResult;
  finalize?: (context: RuleContext) => Promise<RuleResult>;
};
