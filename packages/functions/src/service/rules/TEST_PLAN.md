# Rules Pipeline Test Plan

## Scope
Covers rule pipeline execution order, per-phase behavior, and transition expectations before moving rule logic out of `game-service.ts`.

## Mapping to existing tests
- House rules integration: [packages/functions/src/service/house-rules.test.ts](packages/functions/src/service/house-rules.test.ts)
- Game actions integration: [packages/functions/src/service/game-actions.test.ts](packages/functions/src/service/game-actions.test.ts)
- Draw/play workflow integration: [packages/functions/src/service/draw-play-workflow.test.ts](packages/functions/src/service/draw-play-workflow.test.ts)

## New unit tests (to add as rules are extracted)
1. Pipeline phase gating
   - `pre-validate` runs `validate` only.
   - `validate` runs `validate` only.
   - `apply` runs `apply` only.
   - `finalize` runs `apply` only (explicit alias of apply for now).
   - If `finalize` diverges later, add distinct finalize-phase behavior tests.

2. Rule ordering
   - Rules execute in defined order within each phase.
   - No rule executes if `canHandle` is `false`.

3. Effects aggregation
   - Effects are collected in order.
   - `cardsDrawn` accumulates across multiple rules.

4. Error and edge paths
   - Rule `validate` throws and pipeline stops.
   - Rule `apply` throws and pipeline stops.
   - If `finalize` diverges later, add finalize-phase error coverage.
   - `canHandle` returns false and rule is skipped.
   - `canHandle` throws (surface error to caller).

## Future rule-specific tests (to create with each rule)
- Card legality rule: validates playable card constraints.
- Draw-to-match rule: draws until playable or deck exhausted.
- Penalty draw rule: draws `mustDraw` and advances turn.
- Skip/reverse effects rule: applies correct next player.
- Wild color rule: requires and sets chosen color.

## State machine expectations (integration)
- Turn completion rules match phase transitions (draw penalty advances turn; optional draw allows play or pass).
- Draw-to-match keeps turn with the same player until play or pass.
- Pass disallowed when `mustDraw > 0`.

## Integration test expectations
- All existing integration tests remain green after each extraction step.
- No API/response changes to callable functions.
