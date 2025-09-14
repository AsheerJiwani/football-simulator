📌 Project Overview

We are building a gamified football simulator hosted as a Next.js 15 app on Vercel.
Target audience: Quarterbacks and young football players who want to practice attacking different defensive coverages.

Key design rules:

DO NOT MAKE ANYTHING UP - utilize agents and Playwright MCP with Chromium browser to research specific game mechanics when necessary

Mechanics must feel NFL-realistic (routes, coverages, player speeds, motions, audibles, openness at catch, tackle radius).

Movements should be fluid, defender tracking based on man/match/zone concepts highly realistic

Field should be 120 yards long (100 yards + 10 yards for each endzone) & vertical instead of horizontal

Directive: Whenever implementing, modifying, or expanding any NFL mechanic (coverages, alignments, motions, player speeds, ball physics, openness/tackle logic, zone bubbles, or new concepts), Claude must first call the Research Subagent to gather factual, cited evidence before coding. For each coverage, the agent should return JSON Structured data describing each positions' role in the coverage system as well as the adjustments made when offensive personnel and formations changes occur.

Only differences from real NFL:

After the "break" point in a route where the receiver makes their last move, they should continue running the same direction until reaching the sideline.

No offensive or defensive line.

Always 7 defenders in coverage (some may blitz or spy).

No penalties or flags.

🏈 Core User Controls

Route Concepts: Choose from pre-loaded NFL plays (e.g., Smash, Mesh, Flood).

Personnel & Formations: Adjust RB/TE/WR counts; each concept has a default formation.

Defensive Coverage: User selects coverage (Cover 0–6, Quarters, Tampa 2, etc.); defense auto-aligns based on formation/personnel.

Throw: After the snap, QB may throw to any non-pass-pro eligible.

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

🖥️ Tech Stack

Frontend: Next.js 15, TypeScript, TailwindCSS, Framer Motion.

State Management: Zustand (lightweight, selector-driven, fast for 60 Hz updates).

Game Engine: Pure TypeScript module (/src/engine), headless and testable.

Drag-and-Drop: dnd-kit or React DnD for positioning players.

Deployment: Vercel.

Auth & Subscription: Clerk/NextAuth + Stripe Checkout.

Analytics: PostHog (events, feature flags, experiments, replays).

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

Commit and push to Github when appropriate to ensure no compilation errors or eslint warnings that prevent compilation or cause "Failed to compile".

Engine stays pure TypeScript: no React imports. Keep deterministic & testable.

UI subscribes to engine via Zustand: use selectors to avoid unnecessary re-renders.

Use JSON configs in /src/data for formations, concepts, and coverages.

Keep performance in mind: engine tick must stay <1ms for ~12–14 players.

Start small, expand: get one play + one coverage working before layering complexity.

No shortcuts on realism: coverage rotations, motion bumps, player speed bands must match NFL mechanics.