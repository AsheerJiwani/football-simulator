# Football Simulator Implementation Plan

## Phase 1: Project Setup & GitHub/Vercel Configuration ✅

### 1.1 Initialize Next.js 15 Project
- [x] Create Next.js 15 app with TypeScript and Tailwind CSS
- [x] Configure TypeScript with strict mode
- [x] Set up ESLint and Prettier for code consistency
- [x] Install core dependencies: Zustand, Framer Motion

### 1.2 GitHub Repository Setup
- [x] Initialize git repository
- [x] Create `.gitignore` for Next.js
- [x] Set up branch protection rules (main branch)
- [x] Create initial commit structure

### 1.3 Vercel Deployment Pipeline
- [x] Connect GitHub repository to Vercel
- [x] Configure environment variables placeholder
- [x] Set up automatic deployments on push to main
- [x] Configure preview deployments for pull requests

### 1.4 Project Structure
```
/app
  /(marketing)
    /page.tsx         # Landing page
  /sim
    /page.tsx         # Main simulator
/src
  /engine
    /types.ts         # Core type definitions
    /Engine.ts        # Main game engine
  /sim
    /FieldCanvas.tsx  # SVG field visualization
    /ControlsPanel.tsx # UI controls
  /data
    /formations.json
    /concepts.json
    /coverages.json
  /lib
    /math.ts          # Vector calculations
  /store
    /gameStore.ts     # Zustand store
```

## Phase 2: Core Engine Development ✅

### 2.1 Type System & Data Models
- [x] Define Player interface (position, speed, route, coverage responsibility)
- [x] Define Ball interface (position, velocity, state)
- [x] Define GameConfig (field dimensions, tick rate, physics constants)
- [x] Define Route types (Slant, Flat, Go, Curl, etc.)
- [x] Define Coverage types (Cover 1, Cover 2, etc.)

### 2.2 Engine Implementation
- [x] Implement 60Hz game loop with requestAnimationFrame
- [x] Create snap() method to initiate play
- [x] Implement throwTo(receiverId) method
- [x] Build tick(deltaTime) update logic
- [x] Calculate player movements based on routes/coverage
- [x] Implement ball physics (constant speed trajectory)
- [x] Build collision detection (catch radius, tackle radius)
- [x] Calculate openness percentage algorithm

### 2.3 Initial Play Content
- [x] Implement Slant-Flat concept
- [x] Create Trips Right formation
- [x] Build Cover 1 defensive logic
- [x] Test catch/incompletion outcomes

### 2.4 Research Validation & NFL Realism ✅
- [x] Research and validate player speeds using NFL combine data
- [x] Update ball physics to realistic 25 yd/s velocity (~55mph)
- [x] Validate Cover 1 defensive positioning and leverage
- [x] Refine Slant-Flat route timing based on coaching analysis
- [x] Implement data-driven JSON configuration system

## Phase 3: UI & State Management

### 3.1 Zustand Store Setup ✅
- [x] Create gameStore with engine instance
- [x] Implement selectors for UI subscriptions
- [x] Add actions (snap, throw, reset, updateConfig)
- [x] Optimize for 60Hz updates with selective renders

### 3.2 Field Canvas Component ✅
- [x] SVG-based field rendering (120 yards × 53.33 yards)
- [x] Player dots with team colors (blue offense, red defense)
- [x] Ball trajectory visualization with state indicators
- [x] Real-time position updates from engine via Zustand
- [x] Yard lines and hash marks with proper NFL scaling
- [x] Route path visualization and coverage zone indicators
- [x] Star player and motion boost visual indicators

### 3.3 Controls Panel ✅
- [x] Formation selector dropdown (loads from JSON data)
- [x] Coverage selector dropdown (Cover 1, Cover 2, Cover 3)
- [x] Snap button (triggers engine.snap())
- [x] Dynamic throw buttons for eligible receivers
- [x] Sack timer slider (2-10 seconds, locked in Challenge Mode)
- [x] Reset play button and game mode toggle
- [x] Play outcome display with detailed results
- [x] Help section with usage instructions

### 3.4 Integration ✅
- [x] Connect UI to Zustand store with optimized selectors
- [x] Real-time game loop polling at 30fps during play
- [x] Handle all user interactions (snap, throw, reset, config)
- [x] Display detailed play outcomes (yards, openness %, catch probability)

## Deployment Checkpoints

### Checkpoint 1: Basic Deployment (End of Phase 1)
- [x] Next.js app runs locally
- [x] GitHub repo created and connected
- [x] Vercel deployment successful
- [x] Basic landing page visible

### Checkpoint 2: Engine MVP (End of Phase 2) ✅
- [x] Engine runs with 60Hz game loop and realistic physics
- [x] Slant-Flat vs Cover 1 executes successfully with proper timing
- [x] Physics calculations validated with NFL research data
- [x] Deployed to Vercel with working engine and JSON data

### Checkpoint 3: Playable Prototype (End of Phase 3) ✅
- [x] UI controls trigger all engine actions (snap, throw, reset)
- [x] Field shows real-time player movement with 30fps updates
- [x] Can complete full play cycle with detailed outcomes
- [x] Deployed and fully playable on Vercel at localhost:3004

## Success Metrics
- Page load time < 2 seconds
- Engine tick time < 1ms
- Smooth 60 FPS animation
- Mobile responsive design
- Zero runtime errors in production

## Next Steps (Phase 4+) **ONGOING**
- Add motion and audibles
- Implement Hash-based Snap logic and adjustements to positioning (offense and zone coverage) (utilize research agent to draft a .md file with nfl rules regarding "next-play setup on left or right or in between hash")
- Implement "Next Play" mechanics
- Implement drag-and-drop positioning (receivers can be placed in multiple default positions across and/or close-behind the LOS based on their initial position (utilize research agent for exact positions))
- Improve fluidity of movement mechanics (incredibly detailed movement mechanics including how far a defender should lag behind after a receiver cuts in man coverge, how fast defenders run in zones, how leverage affects defender's advantage based on receiver route in certain coverages, how close defenders trail receivers naturally, zone handoffs, safety tracking, etc.)
- Design production-grade UI with an interactive control panel and the field should take up majority of the webpage as the main focus. Field size should render as at least 50% of the screen, while maintaining integrity of all simulation code. Sidebar controls include Audibles, motions, Snap ball trigger, reset ball button, next play button.
Top Panel includes Play, Coverage, Sack Time, Star Player button to choose who benefits from star player upgrade, Show Routes toggle, and Show Defense toggle
All controls implemented into Sidebar and Top Panel with beautiful, spacious layout, and do not interfere with field on webpage.
- Implement zone bubbles & man assignment lines (line attached to defender with a bubble shape displaying their zone assignment in zone coverage, or a line attached to their man in man coverage, utilize research agent for each coverage)
THE ABOVE TASKS ARE HANDLED IN PHASE_4_TASKS.md
- Add more plays and coverages with zone bubbles
- Perfect defensive coverage concepts (man: cushion/press, zone: find ways to perfect realistic nfl-mechanics, match: find ways to perfect realistic nfl-mechanics, rotations)
- Build Challenge Mode
- Integrate authentication
- Easy mode vs hard mode (easy: no rotations in coverage; hard: rotations in coverage occur with nfl-realism)
- Add subscription tiers to unlock easy mode past one month and to unlock hard mode separately
- Implement analytics per-user

## Development Timeline Estimate
- Phase 1: 2-3 hours
- Phase 2: 4-6 hours
- Phase 3: 3-4 hours
- Total for MVP: 9-13 hours

## Progress Log
- ✅ **Phase 1 Complete!** Next.js 15 + TypeScript + Tailwind setup
- ✅ GitHub repository created and connected: https://github.com/AsheerJiwani/football-simulator
- ✅ Vercel deployment pipeline configured with auto-deploy on push
- ✅ Project structure established with proper folder organization
- ✅ **Phase 2 Complete!** NFL-realistic football engine with research validation
  - Complete type system (15+ interfaces) with Player, Ball, GameConfig
  - Vector math utilities for physics calculations
  - 60Hz game loop with catch/incompletion logic
  - Slant-Flat vs Cover 1 fully implemented
  - Player speeds updated to NFL combine data (QB: 7.0-8.5 yd/s, etc.)
  - Ball velocity set to realistic 25 yd/s (~55mph NFL average)
  - Cover 1 positioning validated with proper leverage
  - JSON data structure for extensible plays/formations/coverages
- ✅ **Phase 3 Complete!** Basic UI implementation with non-fluid gameplay
  - Zustand store with optimized selectors for 60Hz engine integration
  - SVG field canvas with NFL-accurate dimensions and visual indicators
  - Controls panel with dropdown selectors and dynamic interactions
  - Landing page with feature showcase and marketing content
  - TypeScript compilation passing with proper type safety
  - Development server running successfully on localhost:3004

---

*This plan focuses on getting a working prototype deployed quickly, then iterating with more features.*