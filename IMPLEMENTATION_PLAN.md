# Football Simulator Implementation Plan

## Phase 1: Project Setup & GitHub/Vercel Configuration ⏳

### 1.1 Initialize Next.js 15 Project
- [ ] Create Next.js 15 app with TypeScript and Tailwind CSS
- [ ] Configure TypeScript with strict mode
- [ ] Set up ESLint and Prettier for code consistency
- [ ] Install core dependencies: Zustand, Framer Motion

### 1.2 GitHub Repository Setup
- [ ] Initialize git repository
- [ ] Create `.gitignore` for Next.js
- [ ] Set up branch protection rules (main branch)
- [ ] Create initial commit structure

### 1.3 Vercel Deployment Pipeline
- [ ] Connect GitHub repository to Vercel
- [ ] Configure environment variables placeholder
- [ ] Set up automatic deployments on push to main
- [ ] Configure preview deployments for pull requests

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

## Phase 2: Core Engine Development

### 2.1 Type System & Data Models
- [ ] Define Player interface (position, speed, route, coverage responsibility)
- [ ] Define Ball interface (position, velocity, state)
- [ ] Define GameConfig (field dimensions, tick rate, physics constants)
- [ ] Define Route types (Slant, Flat, Go, Curl, etc.)
- [ ] Define Coverage types (Cover 1, Cover 2, etc.)

### 2.2 Engine Implementation
- [ ] Implement 60Hz game loop with requestAnimationFrame
- [ ] Create snap() method to initiate play
- [ ] Implement throwTo(receiverId) method
- [ ] Build tick(deltaTime) update logic
- [ ] Calculate player movements based on routes/coverage
- [ ] Implement ball physics (constant speed trajectory)
- [ ] Build collision detection (catch radius, tackle radius)
- [ ] Calculate openness percentage algorithm

### 2.3 Initial Play Content
- [ ] Implement Slant-Flat concept
- [ ] Create Trips Right formation
- [ ] Build Cover 1 defensive logic
- [ ] Test catch/incompletion outcomes

## Phase 3: UI & State Management

### 3.1 Zustand Store Setup
- [ ] Create gameStore with engine instance
- [ ] Implement selectors for UI subscriptions
- [ ] Add actions (snap, throw, reset, updateConfig)
- [ ] Optimize for 60Hz updates with selective renders

### 3.2 Field Canvas Component
- [ ] SVG-based field rendering (100 yards × 53.33 yards)
- [ ] Player dots with team colors
- [ ] Ball trajectory visualization
- [ ] Real-time position updates from engine
- [ ] Yard lines and hash marks

### 3.3 Controls Panel
- [ ] Formation selector dropdown
- [ ] Coverage selector dropdown
- [ ] Snap button (triggers engine.snap())
- [ ] Throw buttons for each receiver
- [ ] Sack timer slider (2-10 seconds)
- [ ] Reset play button

### 3.4 Integration
- [ ] Connect UI to Zustand store
- [ ] Implement game loop in React with useEffect
- [ ] Handle user interactions
- [ ] Display play outcome (catch/incomplete/INT)

## Deployment Checkpoints

### Checkpoint 1: Basic Deployment (End of Phase 1)
- [ ] Next.js app runs locally
- [ ] GitHub repo created and connected
- [ ] Vercel deployment successful
- [ ] Basic landing page visible

### Checkpoint 2: Engine MVP (End of Phase 2)
- [ ] Engine runs in browser console
- [ ] One play executes successfully
- [ ] Physics calculations work correctly
- [ ] Deployed to Vercel with working engine

### Checkpoint 3: Playable Prototype (End of Phase 3)
- [ ] UI controls trigger engine actions
- [ ] Field shows real-time player movement
- [ ] Can complete a full play cycle
- [ ] Deployed and playable on Vercel

## Success Metrics
- Page load time < 2 seconds
- Engine tick time < 1ms
- Smooth 60 FPS animation
- Mobile responsive design
- Zero runtime errors in production

## Next Steps (Phase 4+)
- Add more plays and coverages
- Implement drag-and-drop positioning
- Add motion and audibles
- Build Challenge Mode
- Integrate authentication
- Add subscription tiers
- Implement analytics

## Development Timeline Estimate
- Phase 1: 2-3 hours
- Phase 2: 4-6 hours
- Phase 3: 3-4 hours
- Total for MVP: 9-13 hours

## Progress Log
- ✅ Created implementation plan markdown file

---

*This plan focuses on getting a working prototype deployed quickly, then iterating with more features.*