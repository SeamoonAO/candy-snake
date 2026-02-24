# Prototype Index

Generated with Pencil MCP and saved locally.

## Prototype File
- `candy-snake-prototypes.pen` (local file in this folder)
- `candy-snake-prototypes-v2.pen` (local refined set)

## Screens
- Screen - Start
- Screen - Playing
- Screen - Paused
- Screen - Game Over
- Spec - Interaction Flow
- Spec - HUD Detail
- Spec - Settings Panel
- Spec - Visual System
- Spec - Motion & FX
- Screen - Edge Cases

## Notes
- This prototype is a reverse-engineered wireframe from the current implemented UI.
- Core layout included:
- Left HUD panel
- Right game board area
- Overlay states and status labels

## Next Refinement Backlog

### 1) Interaction Flow Spec
- Define complete transitions for:
- `Start -> Playing -> Paused -> Playing -> Game Over -> Restart`.
- Clarify trigger/guard conditions for each transition.
- Clarify behavior when changing settings during pause.

Acceptance:
- Every transition has a source state, trigger, and target state.
- No ambiguous state jumps remain.

### 2) HUD Detail Spec
- Define priority and layout behavior for:
- Score, Best, Rounds, Tick, active effect timers.
- Define responsive behavior when panel space is limited.

Acceptance:
- HUD elements have fixed ordering and overflow rules.
- A narrow-width variant is documented.

### 3) Settings Panel Spec
- Define exact behavior for bean count and PvE snake sliders:
- Value range, step, default.
- Live-apply vs next-round apply.
- Player-facing helper text.

Acceptance:
- Sliders have unambiguous runtime behavior.
- Edge values (min/max) are explicitly shown in prototype notes.

### 4) Board Visual System
- Define distinct tokens for:
- Player snake, enemy snakes, beans, power-ups, overlays.
- Add accessibility constraints (contrast and visual distinction).

Acceptance:
- Component categories are distinguishable by both color and shape/label.
- Contrast checks are documented for key text and overlays.

### 5) FX/Motion Rules
- Define burst FX for bean/power-up pickup:
- Duration, max concurrent effects, layering priority.
- Define pause and game-over animation behavior.

Acceptance:
- Motion spec includes timing and concurrency limits.
- No conflict between gameplay readability and FX intensity.

### 6) Edge-State Prototypes
- Add dedicated frames for:
- Near-full board / no free cells.
- Enemy respawn fallback.
- Shield-trigger moment.
- Multiple simultaneous collisions.

Acceptance:
- Each edge state has a visible UI response and fallback behavior note.
- No undefined player feedback in extreme scenarios.
