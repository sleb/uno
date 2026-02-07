export type TurnPhase =
  | "awaiting-play"
  | "awaiting-draw"
  | "resolving-effect"
  | "turn-complete";

export type TurnTransition = {
  from: TurnPhase;
  to: TurnPhase;
  action: "play" | "draw" | "pass" | "resolve";
};
