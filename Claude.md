📌 Project Overview

We are building a gamified football game simulator hosted as a Next.js 15 app on Vercel.
Target audience: Quarterbacks and young football players who want to practice attacking different defensive coverages.

Key design rules:

DO NOT MAKE ANYTHING UP - utilize agents and Playwright MCP with Chromium browser to research specific game mechanics when necessary

Mechanics must feel NFL-realistic (routes, coverages, player speeds, motions, audibles, openness at catch, tackle radius).

Movements should be fluid, defender tracking based on man/match/zone concepts highly realistic

Field should be 120 yards long (100 yards + 10 yards for each endzone) & vertical instead of horizontal

The default LOS is on the offensive side (closer to bottom of field, away from defensive endzone in UI) at 30 yard line, changes based on last play, indicated by a blue line

First down marker 10 yards ahead of the LOS indicated by yellow line

No running, this is a throwing-only simulation meant for Quarterbacks to learn defensive coverage weaknesses thruogh repetition

No 'spy', replace 'spy' with 'hole' to cover middle of field instead. Simulation does not allow scrambles, so no need for a spy.

**Game Mechanics for USER AUTONOMY: IMPORTANT**

Coverage Selection:

The defensive coverage concept only changes when the user selects a new coverage.

Defensive coverages render appropriately when the user chooses it in the top bar

Offensive receiver routes, personnel, and alignment render appropriately when the receiver chooses a new play in the top bar

The chosen coverage re-renders automatically whenever the offense updates its formation, personnel, or motions, so alignments and assignments adjust correctly.

Offensive Adjustments:

When the user selects a new play concept, the offense updates to its default routes, personnel, and formation.

Any pre-selected defensive coverage re-renders dynamically based on the new formation/personnel.

When the user changes motions, personnel, formation, or drag-and-drop positions, the offense updates accordingly, and the defense adjusts alignments and responsibilities within the already-selected coverage.

Motions should be rendered based on realistic player speeds in the UI pre-snap and defender coverage should adjust based on nfl-mechanics

Autonomy & Integration:

The user should have full autonomy to adjust offensive plays, motions, personnel, formations, and positions.

The defense should always render dynamically in response to offensive changes, but only within the framework of the currently chosen coverage.

Coverage logic, route mechanics, motions, and alignments should always reflect real NFL rules and coaching mechanics.

Consistency:

Snap logic, throws, openness, and outcomes should never break when adjustments are made pre-snap.

### 1. **setPlayConcept() Chain**
```
User selects new play → setupPlayers() → realignDefense() → UI re-render
```

### 2. **setPersonnel() Chain**
```
User changes personnel → setupPlayers() → getOptimalDefensivePersonnel() → setupDefense() → UI re-render
```

### 3. **sendInMotion() Chain**
```
User sends motion → handleMotionAdjustments() → realignDefense() → UI re-render
```

### 4. **updatePlayerPosition() Chain**
```
User drags player → analyzeFormation() → realignDefense() → UI re-render
```

### 5. **setCoverage() Chain**
```
User selects coverage → setupDefense() → generateCoverageAlignment() → UI re-render

All changes (offense and defense) must be seamless and feel integrated into one coherent simulation.
ALL pre-snap and post-snap receiver postion alignments, defender position alignments, and offensive/defensive movement mechanics should be based on real nfl game mechanics and positions and relative to the LOS in terms of the y axis, keeping in mind that LOS is at y = 0 and y = -5 is on the OFFENSIVE side of the ball, below the LOS where no defenders should be pre-snap.

## 🎯 Dynamic Defensive Adjustment System

The simulator features a sophisticated defensive AI that automatically responds to all offensive changes, providing NFL-realistic defensive behavior without requiring user control. This system ensures complete offensive autonomy while maintaining competitive, intelligent defensive play.

**Core Architecture:**
- **User Autonomy**: User has full control over offense (plays, personnel, formations, motions, audibles, drag-and-drop positioning)
- **Automatic Defense**: Every offensive action triggers immediate defensive realignment within the selected coverage framework
- **NFL Realism**: 13 coverage-specific methods implement real coaching principles (Cover 0-6, Tampa 2, Quarters)

**Dynamic Response Pipeline:**
1. **Formation Analysis** (`analyzeFormationComprehensive()`): Detects trips, bunch, stack, and spread formations in real-time
2. **Personnel Matching**: Automatically adjusts defensive personnel (Dime vs 10 personnel, Nickel vs 11, Base vs 12/21)
3. **Coverage Adjustments** (`applyCoverageSpecificRealignment()`): Each coverage type has unique alignment rules and depth/leverage positioning
4. **Motion Response** (`handleMotionAdjustments()`): Implements NFL techniques - Rock & Roll (safety exchange), Lock (man follows), Buzz (rotation), Spin (zone rotation)
5. **Strength Determination**: Analyzes offensive formation to set defensive strength for proper alignment

**Consistency Guarantees:**
- UI Always renders exactly 7 defenders with proper assignments
- Defensive positions update smoothly without breaking game state
- Handles rapid sequential changes (tested with 10+ changes in <100ms)
- All adjustments preserve 60fps performance through optimized calculations

This system creates a living, breathing defense that reacts intelligently to user decisions, providing the challenge and realism of facing NFL-caliber defensive schemes while giving users complete freedom to experiment with offensive strategies.

Gameplay with drives (4 downs, first down line 10 yards ahead of default start position [30 yard line], if 4 downs are reached and user does not complete a first down, they should have to reset at the 30 yard line.) with ongoing plays starting from where the last one ended based on the hashmarks and last play result

**Safety Logic**: If the line of scrimmage (LOS) is ever at or behind the offensive 1-yard line (y ≤ 1), a safety is triggered. The game warns the user about the safety and automatically resets the drive to the offensive 30-yard line with a fresh set of downs (1st and 10). This prevents the quarterback from starting a snap in their own endzone, which would be unrealistic. The minimum playable LOS is at the 2-yard line.

Directive: Whenever implementing, modifying, or expanding any NFL mechanic (coverages, alignments, motions, player speeds, ball physics, openness/tackle logic, zone bubbles, or new concepts), Claude must first call the Research Subagent to gather factual, cited evidence before coding. For each coverage, the agent should return JSON Structured data describing each positions' role in the coverage system as well as the adjustments made when offensive personnel and formations changes occur. If Claude utilizes the research subagent, ensure that it is utilized after "plan mode" is finished and when actually working in the code.

If Claude utilizes the research subagent, ensure that it is utilized after "plan mode" is finished and when actually working in the code.

Only differences from real NFL:

After the final 'break' in their route, receivers should continue running in the same direction until they reach the back of the endzone (y = 120 yards) or either sideline.

No offensive or defensive line.

Always 7 defenders in coverage (some may blitz or spy).

No penalties or flags.

🏈 Core User Controls

Route Concepts: Choose from pre-loaded NFL plays (e.g., Smash, Mesh, Flood).

Personnel & Formations: Adjust RB/TE/WR counts; each concept has a default formation.

Defensive Coverage: User selects coverage (Cover 0–6, Quarters, Tampa 2, etc.); defense auto-aligns based on formation/personnel.
**Coverage-Personnel Compatibility**: Certain coverages are disabled/warned when incompatible with current defensive personnel (e.g., Tampa 2 requires 3+ LBs, unavailable in Dime package).

Throw: After the snap, QB may throw to any non-pass-pro eligible at any time before he gets sacked

Next Play: User can advance to the next play, beginning from the same y position on the field if the last play was an incomplete pass, or from where the QB was in y value when he was sacked, or where the receiver was when they were tackled if they caught the ball, or from the default starting position (30 yard line) if they scored a touchdown.

Reset: User can reset the play after the ball is snapped and without clicking "Next Play" to reset from the same down

Audibles: Change a single receiver’s route pre-snap.

Motion: Send one player across LOS; motion provides a small “speed boost” at snap.

Sack Time: Slider (2–10s) determines how long QB has before being “sacked.” DOES NOT ACCOUNT FOR BLITZERS (.3-2s less for one blitzer (random, based on Sack Time), .7-4s less for two blitzers (random, based on Sack Time))

Drag-and-Drop Positioning: Place players on default legal anchors along LOS.

Pass Protection: RB/FB/TE may block if aligned properly. In blocking, they should pick up same-side blitzers by running towards them and stopping in front of them, holding them off permanently. if they pick up a blitzer, the blitzer should have no effect on Sack Time. Otherwise, they should simply run towards the LOS and stop.

Shotgun vs Dropback: QB starts in shotgun (~6 yds deep) or dropback (1 yd → auto drop ~5 yds).

Star Player: One chosen player gets +10% speed and openness bonus.

Show Defense: Toggle to reveal coverage responsibilities (disabled in Challenge Mode).

Free Play vs Challenge Mode:

Free Play = no restrictions.

Challenge = 2.7s sack time, max 2 audibles, no Show Defense.

Hash Toggle: Start on left or right hash.

⚙️ Core Game Mechanics

Snap flow: QB starts in Shotgun or Dropback, then has 2–10s to throw.

Ball physics: Constant ball speed (~16 yds/s). Time to arrival = distance ÷ speed.

Catch resolution:

Compute openness % based on separation at catch.

If defender inside tackle radius → incompletion or interception chance.

Otherwise → catch.

Run After Catch (RAC): Receiver runs straight until tackled (within tackle radius) or reaches end zone.

Coverage AI: Man/zone/match logic with real NFL rules (rotations, strength calls, motion adjustments).

Player speed bands (approximate NFL averages):

WR/CB/S/NB/RB: 9.0–9.5 yd/s top speed.

TE/LB: 7.5–8.0 yd/s.

QB: 6.5–7.0 yd/s.

Motion boost: +8–10% for 0.3–0.4s at snap.

Star boost: +10% speed + openness bonus.

Tackle radius: ~1.5–2.0 yds.

🖥️ Tech Stack & Architecture

Frontend: Next.js 15, TypeScript, TailwindCSS, Framer Motion.

State Management: Zustand (lightweight, selector-driven, fast for 60 Hz updates).

Game Engine: Pure TypeScript module (/src/engine), headless and testable.

Drag-and-Drop: dnd-kit or React DnD for positioning players.

Deployment: Vercel.

Auth & Subscription: Clerk/NextAuth + Stripe Checkout.

Analytics: PostHog (events, feature flags, experiments, replays).

## 🏗️ Current Engine Architecture (Phase 2 Complete)

### Core Systems
```typescript
// Formation Analysis Pipeline
FormationAnalyzer → analyzes offensive formation (trips, bunch, spread)
    ↓
PersonnelMatcher → determines optimal defensive personnel (Dime, Nickel, Base)
    ↓
CoverageAdjustments → applies coverage-specific alignments
    ↓
PostSnapRules → handles dynamic in-play adjustments (pattern matching, zone handoffs)
    ↓
Engine Integration → coordinates all systems via realignDefense() and tick()
```

### Key Modules
- **`formationAnalyzer.ts`**: Detects formation strength, receiver sets, gaps
- **`personnelMatcher.ts`**: Coverage-personnel compatibility, situation-based adjustments
- **`coverageAdjustments.ts`**: Coverage-specific alignments, motion responses
- **`postSnapRules.ts`**: Pattern match triggers, route distribution analysis, pursuit angles
- **`Engine.ts`**: Main game loop integrating all systems

### Defensive Intelligence Features
- **Formation Recognition**: Automatic detection of trips, bunch, stack, spread formations
- **Personnel Auto-Adjustment**: 10→Dime, 11→Nickel, 12→Base, 21→Goal Line
- **Motion Response Matrix**: Each coverage has specific motion responses (lock, buzz, spin)
- **Pattern Matching**: Zone defenders convert to man based on route triggers
- **Zone Coordination**: Handoff points, overlap management, pursuit angles

### Integration Points
```typescript
// In Engine.ts
realignDefense() {
  formationAnalysis = formationAnalyzer.analyzeFormation(offensivePlayers);
  adjustments = coverageAdjustments.applyCoverageSpecificAdjustments(...);
  // Apply adjustments to defenders
}

tick() {
  postSnapRules.applyPostSnapRules(defenders, offense, coverage, phase);
  // Dynamic in-play adjustments
}
```

🛠️ Development Order
Phase 1 — Setup

Scaffold Next.js app, Tailwind, Zustand.

Create /src/engine with types (Player, Route, Coverage, etc.).

Phase 2 — Engine MVP

Implement fixed tick loop (60 Hz).

Single play concept (Slant-Flat).

Single coverage (Cover 1).

Throw logic with openness % and outcome.

Render dots on SVG canvas.

Phase 3 — UI & Controls

Control Center: personnel, formation, coverage, sack slider, star toggle, etc.

Field Canvas: drag-and-drop anchors, Snap & Throw buttons.

Phase 4 — Expand Content, Improve UI

Implement Hash-based Snap logic and adjustements to positioning (offense and zone coverage) (utilize research agent to draft a .md file with nfl rules regarding "next-play setup on left or right hash")

Add more concepts (Smash, Mesh, Flood, Four Verts).

Add more coverages (Cover 2, Cover 3, Cover 4, Tampa 2, Cover 6).

Implement motions, audibles, pass pro.

Phase 5 — Game Modes

Free Play mode (default).

Challenge mode: constraints enforced in engine + UI lockouts.

Phase 6 — Subscriptions

Add auth and Stripe paywall.

Free = Free Play; Paid = Challenge, advanced plays, Star Player.

Phase 7 — Analytics & Drills

Capture PostHog events (throw, outcome, openness).

Add feature flags to gate rollouts.

Add “Drill” presets (e.g., beat Cover 3 with Flood).

📂 Repo Structure
/app
  /(marketing)   # Landing, Pricing, FAQ
  /sim           # Simulator pages (protected)
  /api/stripe    # Stripe webhooks
/src
  /engine        # Pure TS football engine
  /sim           # React components (UI, canvas, controls)
  /data          # JSON playbooks, formations, coverage rules
  /lib           # utilities (vector math, random, helpers)
/public

🚦 First Coding Task

Create /src/engine/Engine.ts with:

Player, Ball, Config types.

snap(), throwTo(), tick(dt) methods.

One play (Slant-Flat), one formation (Trips Right), one coverage (Cover 1).

Outcome: catch vs incompletion based on separation.

Create /src/sim/FieldCanvas.tsx (SVG, dots for players, can be improved as final steps).

Create /src/sim/ControlsPanel.tsx with:

Formation dropdown.

Coverage dropdown.

Snap + Throw buttons.

This will prove the full loop works before expanding.


✅ Coding Guardrails for Claude

Commit and push to Github after each To-do list is complete is complete to ensure no compilation errors, Jest errors, or eslint warnings that prevent compilation or cause "Failed to compile". Handle errors appropriately

Engine stays pure TypeScript: no React imports. Keep deterministic & testable.

UI subscribes to engine via Zustand: use selectors to avoid unnecessary re-renders.

Use JSON configs in /src/data for formations, concepts, and coverages.

Keep performance in mind: engine tick must stay <1ms for ~12–14 players.

Start small, expand: get one play + one coverage working before layering complexity.

No shortcuts on realism: coverage rotations, motion bumps, player speed bands must match NFL mechanics.

## 🔥 PROJECT DATA STRUCTURES FOR RESEARCH AGENT

**ATTENTION RESEARCH SUBAGENT: Use these TypeScript interfaces when returning implementation-ready rules. Your research output should align with these exact data structures. You may add a data structure, but be explicit in commenting when you do.**

### Core Player Structure
```typescript
interface Player {
  id: string;
  position: Vector2D; // {x, y} coordinates on field
  team: 'offense' | 'defense';
  playerType: 'QB' | 'RB' | 'WR' | 'TE' | 'FB' | 'CB' | 'S' | 'LB' | 'NB';
  route?: Route; // Offensive route assignment
  coverageResponsibility?: CoverageResponsibility; // Defensive assignment
  isEligible: boolean;
  maxSpeed: number; // yards per second
  isStar: boolean; // +10% speed boost
  hasMotion: boolean; // pre-snap motion
  isBlocking: boolean; // pass protection
  coverageAssignment?: string; // zone name or man assignment
}
```

### Coverage Responsibility Structure
```typescript
interface CoverageResponsibility {
  defenderId: string;
  type: 'man' | 'zone' | 'spy' | 'blitz';
  target?: string; // player ID for man coverage
  zone?: {
    name?: string; // e.g., 'deep-middle', 'flat', 'hook', 'curl'
    center: Vector2D;
    width: number;
    height: number;
    depth: number; // yards from LOS
  };
}
```

### Coverage Definition Structure
```typescript
interface Coverage {
  name: string; // e.g., 'Cover 3', 'Tampa 2'
  type: 'cover-0' | 'cover-1' | 'cover-2' | 'cover-3' | 'cover-4' | 'cover-6' | 'quarters' | 'tampa-2';
  safetyCount: number;
  responsibilities: CoverageResponsibility[];
  positions?: Record<string, Vector2D>; // Initial alignment positions
}
```

### Formation Structure
```typescript
interface Formation {
  name: string; // e.g., 'Trips Right', 'I-Form'
  positions: Record<string, Vector2D>; // player ID to position
  personnel: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FB: number;
  };
}
```

### Route Structure
```typescript
interface Route {
  type: 'slant' | 'flat' | 'go' | 'curl' | 'out' | 'in' | 'post' | 'comeback' | 'fade' | 'hitch' | 'wheel' | 'corner' | 'dig';
  waypoints: Vector2D[]; // relative to starting position
  timing: number[]; // seconds to reach each waypoint
  depth: number; // yards downfield
}
```

### Motion Structure
```typescript
interface Motion {
  type: 'fly' | 'orbit' | 'jet' | 'return' | 'shift';
  playerId: string;
  startPosition: Vector2D;
  endPosition: Vector2D;
  path: Vector2D[];
  duration: number; // seconds
}
```

### Field Coordinate System
- **Y-axis**: 0 (offensive endzone) to 120 (defensive endzone)
- **X-axis**: 0 (left sideline) to 53.33 (right sideline)
- **LOS**: Line of scrimmage at y=0 (relative positioning)
- **Hash marks**: 3.08 yards from center (x=23.58 left hash, x=29.75 right hash)

### Speed Bands (yards/second)
```typescript
const SPEED_BANDS = {
  QB: { min: 6.5, max: 7.0 },
  RB: { min: 9.0, max: 9.5 },
  WR: { min: 9.0, max: 9.5 },
  TE: { min: 7.5, max: 8.0 },
  FB: { min: 7.5, max: 8.0 },
  CB: { min: 9.0, max: 9.5 },
  S: { min: 9.0, max: 9.5 },
  LB: { min: 7.5, max: 8.0 },
  NB: { min: 9.0, max: 9.5 }
};
```

### Research Output Format Requirements
When returning coverage research, structure your output to include:

1. **Coverage Rules** matching the `Coverage` interface above
2. **Position-specific responsibilities** using `CoverageResponsibility` structure
3. **Zone definitions** with exact `center`, `width`, `height`, `depth` values
4. **Alignment positions** as `Vector2D` coordinates relative to LOS
5. **Motion adjustments** describing how responsibilities change
6. **Formation-based adjustments** for trips, bunch, spread alignments

Example research output structure:
```json
{
  "coverage": {
    "name": "Cover 3",
    "type": "cover-3",
    "safetyCount": 1,
    "responsibilities": [
      {
        "defenderId": "FS",
        "type": "zone",
        "zone": {
          "name": "deep-middle",
          "center": {"x": 26.67, "y": 25},
          "width": 18,
          "height": 20,
          "depth": 25
        }
      }
    ]
  },
  "adjustments": {
    "trips": "Rotate strong safety to trips side",
    "motion": "Lock defender on motion man in Cover 1"
  }
}
```
- FORMATION_NAMING_CONVENTION.md for personnel & formation matching rules
- PRODUCTION_ROADMAP.md for plan ahead, current progress, and next steps
- COMPLETED_PHASES.md for completed phases and detailed logging of reputability, problems solved, and infrastructure updates