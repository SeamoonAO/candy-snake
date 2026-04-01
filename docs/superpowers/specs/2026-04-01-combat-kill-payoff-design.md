# Candy Snake Combat Kill Payoff Design

## 1. Summary

This document defines the next gameplay upgrade after the first roguelite Adventure MVP.

The feature goal is:
- Make direct enemy kills feel rewarding and readable
- Convert kills into short aggressive momentum instead of passive safety
- Improve combat readability by making the player snake head much easier to identify

This design applies to `Adventure` only.

## 2. Player Goal

When the player kills an enemy snake directly, the game should clearly communicate:
- `I killed that snake`
- `I got paid for it`
- `I should keep pushing right now`

The intended feel is:
- Fast
- Celebratory
- Aggressive
- Easy to read even during late-run chaos

## 3. Scope

### 3.1 In Scope
- Direct-kill reward state for `Adventure`
- Clear score payout on direct kill
- Short post-kill aggressive buff
- Stronger kill particles and kill popup text
- HUD indicator for the temporary kill-reward window
- Stronger visual identity for the player snake head

### 3.2 Out Of Scope
- Global combat rework
- Kill rewards in `Endless`
- New enemy archetypes
- Permanent kill-based progression
- Full-screen shake or heavy screen flashes

## 4. Trigger Rules

Only `player direct kills` should count.

The first version should recognize:
- `Dash` kill
- `Swallow Gland` kill
- Any future mutation or skill path that already has explicit player-owned damage attribution

The following should not count:
- Enemy snakes crashing on their own
- Enemy snakes dying to other enemies
- Enemy snakes dying because they were indirectly routed into danger without direct player hit attribution

This keeps combat feedback clear and prevents noisy false rewards.

## 5. Reward Model

Enemy kills should trigger a short `Hunt` reward state.

### 5.1 Immediate Reward
- Add a fixed score bonus: `+30`
- Apply one `Dash` recovery reward

### 5.2 Dash Recovery Rule
- `Adventure` always starts with `Dash` equipped, so every qualifying kill may pay into the same active skill economy regardless of kill source
- If `Dash` can sensibly gain a charge, restore `1` charge
- Otherwise reduce current recovery time by a fixed chunk

This keeps the reward useful across more situations while avoiding waste.

### 5.3 Hunt State
- Duration: `1.5s`
- Effect: player gains a short aggressive speed boost
- Re-trigger behavior: refresh duration only, do not stack power

If one player action kills multiple enemies in the same resolution window:
- Score reward should apply per enemy kill
- Kill popup and burst may appear per kill for small multi-kills
- If the same resolution window kills more than `2` enemies, visual feedback should merge into a capped `MULTI KILL` treatment instead of spawning unbounded popups and particles
- `Hunt` should still resolve as one non-stacking state and only refresh its timer

The design intent is to create a clean chain:
`kill -> surge forward -> look for the next target`

## 6. State Model

The implementation should add a thin runtime layer instead of scattering logic across collision and UI code.

Suggested fields:
- `huntUntil: number | null`
- `lastKillAt: number | null`
- `lastKillScore: number | null`

Behavior rules:
- `Hunt` only exists in `Adventure`
- `Hunt` is cleared on death, restart, and mode switch
- `Hunt` timers should freeze during pause and upgrade draft
- Death clears `Hunt` before run summary is shown; run summary does not preserve or freeze live `Hunt` state
- Only one active `Hunt` window exists at a time

## 7. Combat Readability

The player snake head must be more recognizable than it is now.

### 7.1 Player Head Requirements
- Stronger contrast than the player body
- Stronger outline than enemy heads
- More obvious face or eye treatment than enemy heads
- State feedback should anchor primarily on the player head

### 7.2 Enemy Head Requirements
- Enemy heads should still remain readable as heads
- Enemy head styling should be flatter and less prominent than the player head
- Enemy identity should still rely on hue and personality label

### 7.3 State-Driven Head Feedback
- `Hunt` should add a visible glow or chase highlight to the player head
- Hurt or rescue states should continue to apply their own head-level feedback
- If `Hunt` and hurt/rescue overlap, hurt feedback wins on the inner head color/flash while `Hunt` remains only as a softer outer glow layer

The player should always be able to identify:
- Which snake is theirs
- Which direction they are facing
- Whether they are currently in a stronger state

## 8. Visual Feedback

Kill feedback should be clearly stronger than food pickup and stronger than the current hurt burst.

### 8.1 Kill Burst
- Trigger at the enemy death position
- Use more particles than a normal burst
- Use brighter hot colors such as warm orange, gold, and white-core accents
- Include a short expanding ring or impact bloom

### 8.2 Kill Popup
- Show a large floating popup such as `KILL +30`
- Popup should read as a combat event, not as a generic score tick

### 8.3 Hunt Visuals
- The player head should glow more strongly during `Hunt`
- A short chase-style trail or highlight can extend to the first one or two body segments
- HUD should display a short-lived `Hunt` indicator with remaining time

### 8.4 Restraint

The first version should avoid:
- Strong screen shake
- Full-screen white flashes
- Long particle persistence

The board still needs to remain playable during chain kills.

## 9. Scoring And Balance Intent

The feature should reward aggression without replacing the run's main combo economy.

Balance intent:
- `+30` score should feel meaningful but not dominate full-run scoring
- The speed boost should help secure a follow-up play, not become a permanent haste source
- `Dash` reward should make kills tactically exciting without enabling infinite uncontrolled loops

Success means the player notices:
- More excitement after a kill
- Better reason to chase
- Better board readability during combat

## 10. UX Requirements

The player should understand the event in one glance.

Required clarity:
- Kill source is visually attributed to the player
- Score reward is visible without reading the HUD only
- `Hunt` state is visible on both the board and the HUD
- The player snake head remains readable even in crowded late-run states

## 11. Testing Focus

The first implementation should verify:
- Only direct player kills trigger rewards
- Indirect or ambient enemy deaths do not trigger rewards
- Kill reward adds score correctly
- Multi-kill resolution grants score per kill without stacking `Hunt` power
- Large multi-kills cap or merge popup and particle feedback instead of spamming the board
- `Hunt` state starts and refreshes correctly
- `Hunt` does not stack beyond intended power
- `Dash` reward behavior works in both charge-restoring and cooldown-reduction paths
- Pause, draft, restart, death, and mode switch clear or freeze state correctly
- UI shows `Hunt` and player-head state changes clearly

## 12. Rollout Recommendation

The next implementation should stay narrow:
1. Add kill attribution and `Hunt` runtime state
2. Add score reward and dash recovery reward
3. Add kill burst and popup treatment
4. Upgrade player head styling and `Hunt` glow
5. Tune numbers only after a real browser playtest

## 13. Related Backlog Notes

This design pairs naturally with two adjacent backlog threads:
- Default startup mode should be revisited because `Adventure` now carries more system complexity
- Later kill-centric upgrades can build on the same attribution and `Hunt` hooks
