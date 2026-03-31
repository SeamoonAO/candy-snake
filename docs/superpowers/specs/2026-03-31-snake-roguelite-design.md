# Candy Snake Roguelite Design

## 1. Summary

This document defines the first roguelite upgrade for Candy Snake.

The target experience is:
- Single run length: `8-12 minutes`
- Feel: `fast, exaggerated, high-synergy, allowed to be a bit overpowered`
- Build structure:
  - Main axis: `combo / chain-eating burst`
  - Secondary axis: `active skill upgrades`
  - Rare spike axis: `body mutation`

This design reuses the current game foundation:
- Snake movement and collision
- Combo system
- Adventure obstacle progression
- PvE enemy snakes
- Power-up timing and HUD patterns

The goal is not to turn the game into a map-heavy deckbuilder. The goal is to turn one run into a rapidly escalating build-fantasy.

## 2. Product Goal

The first roguelite version should make players feel:
- A build direction appears quickly
- The run becomes noticeably stronger within the first `2-3` upgrade choices
- Mid-run pressure forces the player to actually use the build
- Late-run chaos feels intentional rather than random

Success criteria:
- The player can identify a build direction in a short run
- Different upgrade combinations lead to meaningfully different play patterns
- The game remains readable even when the run becomes overpowered
- Existing core controls remain intact and responsive

## 3. Core Run Loop

The run loop is segmented instead of being purely endless.

Loop:
1. Start a run with one basic active skill
2. Survive a short segment and eat candies to build combo
3. End segment and choose `1 of 3` upgrades
4. Every `3` segments, enter an elite segment
5. Around minute `6-8`, enter collapse phase with faster escalation
6. Die, then review run summary and build highlights

Run structure:
- Segment duration: `20-30 seconds`
- Elite cadence: every `3 segments`
- Full run target: `12-16 segments`
- End condition: still death-based, not a fixed victory screen

This keeps implementation compatible with the current single-board architecture while adding roguelite pacing.

## 4. Gameplay Pillars

### 4.1 Chain-Eating Burst Is The Main Pillar

The run should primarily reward:
- Fast pathing between candies
- Maintaining combo windows
- Converting momentum into score, pressure relief, or burst value

This is the most natural extension of the current combo implementation.

### 4.2 Active Skills Add Controlled Spikes

Skills are not the main identity of the run, but they create strong moments.

They should:
- Rescue the player from danger
- Create burst value windows
- Reward aggressive routing

### 4.3 Body Mutation Creates Run Identity

Mutation upgrades are rare and dramatic.

They should:
- Change how the player routes or fights
- Be easy to understand
- Produce memorable “this run is broken” moments

## 5. Upgrade Pool Structure

The first version should use four upgrade layers.

### 5.1 Common Upgrades

Purpose:
- Start build identity quickly
- Strengthen combo and candy economy

Examples:
- Extend combo window
- Bonus rewards on repeated candy streaks
- Temporary speed after chain eating
- Chance to duplicate a nearby candy
- Chance to gain score without extra body growth

### 5.2 Skill Upgrades

Purpose:
- Strengthen the equipped active skill
- Increase burst windows and tactical options

Examples:
- Extra charge
- Cooldown reduction on kill
- Post-dash invulnerability
- Skill creates extra candy or score opportunity

### 5.3 Rare Mutations

Purpose:
- Create visible build divergence
- Modify body fantasy and routing rules

Examples:
- Can swallow shorter enemies
- Tail leaves damaging trail
- Temporary phasing through obstacles or enemy bodies
- Forward-line multi-eat behavior

### 5.4 Risk/Reward Upgrades

Purpose:
- Let strong runs go all-in
- Introduce deliberate volatility

Examples:
- Stronger enemies in exchange for extra upgrade picks
- Faster tick with higher score multipliers
- Fragile build with much higher combo ceiling
- More candy spawns with harsher growth pressure

## 6. Target First-Run Archetypes

The first version should intentionally support these clear build clusters.

### 6.1 Chain Snowball
- Focus: longer combo windows and repeated candy chaining
- Feel: stable and immediately rewarding

### 6.2 Burst Clear
- Focus: convert combo or skill charge into board relief
- Feel: setup then explosive payoff

### 6.3 Dash Hunter
- Focus: aggressive repositioning and enemy punishment
- Feel: risky, fast, high-execution

### 6.4 Glutton Build
- Focus: growth, swallowing, pressure through body presence
- Feel: large-scale domination fantasy

Secondary clusters can emerge later, but MVP should make these four readable.

## 7. Enemies, Maps, And Rewards

Roguelite upgrades only work if board pressure evolves alongside the build.

### 7.1 Enemy Roles

The first version should distinguish enemy pressure by role rather than by many bespoke mechanics.

Suggested roles:
- Basic pressure snake: simple movement pressure
- Hunter snake: pursues the player more directly
- Candy thief snake: competes for candy and interrupts combo planning
- Elite snake: larger body plus one stronger behavior

The current enemy personality system is the right base for this expansion.

### 7.2 Map Pressure

Board pressure should vary by segment:
- Normal segments: lighter pressure, room to build
- Escalation segments: narrower routes or more awkward obstacle patterns
- Elite segments: themed pressure that favors some builds and challenges others
- Collapse phase: temporary danger zones, denser enemy pressure, less space stability

The first version should reuse and expand current obstacle pattern logic instead of introducing room-to-room map traversal.

### 7.3 Reward Logic

Rewards should reinforce player behavior:
- Normal segment end: mostly common upgrades
- Elite segment end: better chance of skill upgrades or rare mutations
- High combo segment: extra minor reward or boosted rarity
- Risk-taking behavior: more likely to unlock high-variance rewards

## 8. MVP Scope

The MVP should stay narrow.

### 8.1 Must Have
- Segmented run loop
- `1-of-3` upgrade selection flow
- Upgrade system data model with rarity and pool filtering
- One base active skill: `Dash`
- `18-24` total upgrades
- `3-4` clear enemy pressure types or role variants
- `3` rare mutations
- Run summary on death

### 8.2 Upgrade Distribution
- Common upgrades: `10-12`
- Skill upgrades: `5-6`
- Rare mutations: `4-5`
- Risk/reward upgrades: `2-3`

### 8.3 Must Not Include In MVP
- Full meta progression tree
- Shop economy
- Multiple equipped active skills
- True boss encounter system
- Many map gimmick tiles
- Multiplayer

## 9. Proposed First Content Set

### 9.1 Base Active Skill
- `Dash`
  - Move forward several cells instantly
  - Creates offensive and defensive burst value
  - Integrates naturally with existing movement rules

### 9.2 Candidate Rare Mutations
- `Swallow Gland`: swallow shorter enemy heads
- `Shadow Tail`: tail path deals damage briefly
- `Phase Scales`: temporary phasing through threats

### 9.3 Pressure Themes
- Dense enemy board
- Narrow route obstacle board
- Candy-sparse routing board

These are enough to test whether different builds feel different under pressure.

## 10. State And System Design Direction

Implementation details are intentionally left lightweight here, but the architecture direction is clear:

- Upgrades should be data-driven
- Upgrade effects should not be hardcoded across unrelated files
- Run progression should have a single source of truth
- Segment timing, upgrade offering, and reward rarity should be deterministic from game state
- Build summary should be reconstructable from stored upgrade picks

Likely new state categories:
- Run segment state
- Chosen upgrades
- Upgrade offer state
- Skill cooldown/charges
- Collapse phase state

## 11. UX Requirements

The roguelite layer must remain readable inside the current arcade presentation.

Requirements:
- Segment transitions should be short and obvious
- Upgrade choice UI must not obscure the board state longer than necessary
- Rare mutation moments should have stronger visual emphasis than common upgrades
- End-of-run summary should clearly explain why the run was strong or weak

## 12. Testing Focus

The first implementation should verify:
- Segment progression timing
- Upgrade offer generation and filtering
- Dash behavior across walls, enemies, and obstacles
- Mutation interactions with current collision rules
- Reward rarity changes during elite segments
- Run summary accuracy

## 13. Tradeoffs And Intent

This design intentionally chooses:
- Short runs over long campaigns
- Build clarity over huge content quantity
- Strong synergy over strict balance
- Board escalation over overworld navigation

The reason is simple: the current game already has the right arcade foundation. The highest-leverage upgrade is to turn that foundation into a fast build engine, not to layer many unrelated systems on top.

## 14. Next Step

The next step after spec approval is an implementation plan covering:
- Data model changes
- Engine loop changes
- Upgrade offer flow
- Dash and mutation rules
- HUD and overlay changes
- Test updates
