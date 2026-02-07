export type TurnPhase =
  | "awaiting-play"
  | "awaiting-draw"
  | "resolving-effect"
  | "turn-complete";

export type TurnTransition = {
  from: TurnPhase;
  to: TurnPhase;
  action:
    | "play"
    | "draw-optional"
    | "draw-penalty"
    | "draw-to-match"
    | "pass"
    | "resolve";
};
