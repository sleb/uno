# Rules Pipeline

Phases (ordered):

1. **pre-validate** — authentication, turn ownership, basic invariants.
2. **validate** — card legality, house rule constraints.
3. **apply** — mutate state through effects (discard, draw, skip, reverse, etc.).
4. **finalize** — win checks, stats updates, turn completion.

Rules are executed in sequence within each phase.
