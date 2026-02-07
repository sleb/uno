import type { TurnPhase, TurnTransition } from "./types";

export const TURN_PHASES: TurnPhase[] = [
  "awaiting-play",
  "awaiting-draw",
  "resolving-effect",
  "turn-complete",
];

export const TURN_TRANSITIONS: TurnTransition[] = [
  { from: "awaiting-play", to: "resolving-effect", action: "play" },
  { from: "awaiting-draw", to: "resolving-effect", action: "play" },
  { from: "awaiting-play", to: "awaiting-draw", action: "draw-optional" },
  { from: "awaiting-play", to: "awaiting-draw", action: "draw-to-match" },
  { from: "awaiting-play", to: "turn-complete", action: "draw-penalty" },
  { from: "awaiting-play", to: "turn-complete", action: "pass" },
  { from: "awaiting-draw", to: "turn-complete", action: "pass" },
  { from: "resolving-effect", to: "turn-complete", action: "resolve" },
];
