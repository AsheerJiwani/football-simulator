# Phase 4 Implementation Tasks

## Overview
This document tracks the detailed implementation of Phase 4 features for the Football Simulator.
Each task includes requirements, implementation steps, and completion criteria.

## Task Status Legend
- 🔴 Not Started
- 🟡 In Progress
- 🟢 Complete
- ⏸️ Blocked
- 🔵 Testing

---

## 1. Hash-Based Snap Positioning 🟢

### Requirements
- Ball placement on left hash, middle, or right hash
- Affects offensive formation alignment
- Impacts defensive zone coverage positioning
- Persists between plays based on where previous play ended

### Implementation Steps
- [ ] Research NFL hash mark rules
  - Distance from sidelines (18.5 yards)
  - Impact on formations and alignments
  - Next play positioning rules
- [ ] Add hash position state to gameStore
  - `hashPosition: 'left' | 'middle' | 'right'`
  - `setHashPosition()` action
- [ ] Create HashControl UI component
  - Three-button selector
  - Visual indicator on field
- [ ] Update alignment.ts
  - Adjust offensive positions based on hash
  - Modify zone defender positioning
- [ ] Implement automatic hash positioning after plays
  - Based on where ball carrier was tackled
  - Reset to middle for touchbacks

### Success Criteria
- Hash position visually changes ball placement
- Formations adjust to field constraints
- Zone coverages respect field boundaries
- Next play starts from correct hash

---

## 2. Zone Coverage Bubbles 🟢

### Requirements
- Visual representation of each defender's zone responsibility
- Different styles for deep vs underneath zones
- Toggle visibility with "Show Defense" option
- Accurate to actual coverage rules

### Implementation Steps
- [x] Research zone responsibilities for each coverage
  - Cover 1: Man with single high safety
  - Cover 2: Two deep halves, 5 underneath
  - Cover 3: Three deep thirds, 4 underneath
  - Cover 4: Four deep quarters, 3 underneath
  - Tampa 2: Modified Cover 2 with Mike in deep hole
  - Cover 6: Quarter-quarter-half
  - Cover 0: All-out man coverage
- [x] Create ZoneBubble component
  - SVG ellipse/polygon shapes
  - Semi-transparent fills
  - Color coding (deep vs underneath)
- [x] Add zone data to coverage definitions
  - Zone coordinates and dimensions
  - Dynamic adjustments based on formation
- [x] Integrate with FieldCanvas
  - Render bubbles behind players
  - Animate on coverage changes
- [x] Connect to Show Defense toggle

### Success Criteria
- Each coverage shows accurate zone responsibilities
- Bubbles don't obstruct gameplay view
- Toggle works seamlessly
- Zones adjust to formation strength

---

## 3. Movement Fluidity Improvements 🟢

### Requirements
- Realistic defender tracking in man coverage
- Proper leverage and positioning
- Smooth zone defender movement
- Break reaction timing
- Pattern matching in match coverage

### Implementation Steps
- [x] Research NFL defensive mechanics
  - Man coverage techniques (press/off/trail)
  - Cushion distances by route depth
  - Break reaction times (0.3-0.5s)
  - Zone defender movement patterns
  - Pattern match rules
- [x] Implement man coverage improvements
  - Trail distance based on route type
  - Inside/outside leverage rules
  - Press vs off coverage behavior
- [x] Enhance zone coverage movement
  - Smooth transitions between zones
  - Proper depth drops
  - Rally angles to ball
- [x] Add pattern matching logic
  - Cover 4 match rules
  - Cover 6 weak side matching
  - Quarters adjustments
- [x] Improve movement interpolation
  - Bezier curves for cuts
  - Acceleration/deceleration
  - Hip flip animations

### Success Criteria
- ✅ Defenders move naturally
- ✅ Man coverage looks realistic with proper cushions
- ✅ Zone drops are properly timed
- ✅ Pattern matching works for Cover 4/6/Quarters
- ✅ Smooth movements with Bezier curves

---

## 4. Drag-and-Drop Player Positioning 🔴

### Requirements
- Pre-snap manual adjustment of offensive players
- Legal formation constraints
- Snap count positions (on/off LOS)
- Visual feedback for valid/invalid positions

### Implementation Steps
- [ ] Research NFL formation rules
  - 7 players on LOS requirement
  - Eligible receiver rules
  - Motion and shift regulations
- [ ] Install drag-and-drop library
  - Evaluate @dnd-kit vs react-dnd
  - Set up provider and context
- [ ] Create DraggablePlayer component
  - Touch and mouse support
  - Snap-to-grid behavior
  - Visual drag feedback
- [ ] Define position anchors
  - Legal LOS positions
  - Backfield slots
  - Split distances
- [ ] Add formation validation
  - Check 7 on/near LOS
  - Verify eligible receivers
  - Prevent illegal formations
- [ ] Update gameStore with custom positions
  - Store manual adjustments
  - Reset on new play

### Success Criteria
- Players can be dragged smoothly
- Positions snap to legal spots
- Invalid formations show warnings
- Positions persist until snap
- Reset works properly

---

## 5. UI/UX Redesign 🔴

### Requirements
- Field takes up 50%+ of screen
- Field is visually appealing with 3D aspects and based on real nfl field designs
- Endzones marked with sharp red line across it, 'pylons' for decoration, field goal posts behind defensive endzone
- Sidebar for play controls
- Top panel for game settings
- Mobile responsive design
- Beautiful, spacious layout
- Dark theme, colorful buttons, gamified UI

### Layout Structure
```
┌─────────────────────────────────────┐
│          Top Panel                  │
│  Play | Coverage | Settings         │
├────────┬────────────────────────────┤
│        │                            │
│ Side   │      Field Canvas          │
│ bar    │        (50%+)              │
│        │                            │
│Controls│                            │
│        │                            │
└────────┴────────────────────────────┘
```

### Implementation Steps
- [ ] Create new layout structure
  - Grid-based responsive design
  - Flexbox for panels
  - CSS Grid for main layout
- [ ] Design TopPanel component
  - Play selector dropdown
  - Coverage selector dropdown
  - Sack time slider
  - Star player selector
  - Show Routes toggle
  - Show Defense toggle
  - Hash selector (choose left or right hash)
- [ ] Redesign Sidebar component
  - Snap/Throw buttons (prominent)
  - Reset button
  - Next Play button
  - Audibles section
  - Motion controls
  - Down & Distance display
- [ ] Enhance FieldCanvas scaling
  - Dynamic sizing based on viewport
  - Maintain aspect ratio
  - Zoom controls
- [ ] Add visual polish
  - Gradients and shadows
  - Smooth transitions
  - Hover states
  - Loading states
- [ ] Mobile optimization
  - Touch-friendly controls
  - Collapsible panels
  - Landscape orientation support

### Success Criteria
- Field is prominent focus
- Controls are intuitive
- Mobile experience is smooth
- No UI elements overlap
- Consistent design language

---

## 6. Additional Improvements 🔴

### Performance Optimization
- [ ] Profile render performance
- [ ] Optimize SVG rendering
- [ ] Implement React.memo where needed
- [ ] Use CSS transforms for animations
- [ ] Lazy load heavy components

### Testing & QA
- [ ] Test all hash positions
- [ ] Verify zone bubbles accuracy
- [ ] Check drag-drop edge cases
- [ ] Mobile device testing
- [ ] Cross-browser compatibility

### Documentation
- [ ] Update README with new features
- [ ] Add inline code comments
- [ ] Create user guide for controls
- [ ] Document API changes

---

## Progress Summary

| Feature | Status | Completion |
|---------|--------|------------|
| Hash Positioning | 🟢 | 100% |
| Zone Bubbles | 🟢 | 100% |
| Movement Fluidity | 🟢 | 100% |
| Drag-and-Drop | 🔴 | 0% |
| UI Redesign | 🔴 | 0% |
| Testing & Polish | 🟡 | 40% |

**Overall Phase 4 Progress: 57%**

---

## Notes & Blockers
- Development server running on localhost:3004
- Using Next.js 15 with Turbopack
- Current features working: Motion, Audibles, Pass Protection, Next Play
- Need research agent for NFL-specific mechanics

---

*Last Updated: 2025-09-14*