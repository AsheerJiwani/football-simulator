# Edge Cases and Known Issues Tracking

## 📊 Current Status
- **Total Tests**: 414
- **Passing**: 370 (89.4%)
- **Failing**: 44 (10.6%)
- **Critical Issues**: 8 (3 partially addressed)
- **Non-Blocking Issues**: 12
- **Last Updated**: Phase 4.7 Day 3 Progress

## 🔴 Critical Edge Cases (Must Fix Before Phase 5)

### 1. Cover 0 Man Coverage Assignment Issues
**Status**: ⚠️ PARTIALLY FIXED
**Severity**: HIGH
**Tests Affected**: `coveragePersonnelIntegration.test.ts`
**Description**: Cover 0 (pure man coverage) is leaving receivers uncovered (RB1, TE1)
**Root Cause**: Defenders being assigned to blitz instead of covering all eligibles
**Impact**: Game breaking - receivers can run free
**Fix Applied**: Rewrote Cover 0 logic to prioritize covering all eligible receivers before assigning blitzers
**Progress**: Requires rigorously extensive debugging. Cover 0 CBs now correctly positioned at press coverage depth (1 yard)

### 2. Motion Response Timing Windows
**Status**: ❌ FAILING
**Severity**: HIGH
**Tests Affected**: `defensiveCoverageRealism.test.ts`
**Description**: Motion not triggering coverage-specific responses within expected timing windows
**Root Cause**: Motion response delays or incorrect trigger conditions
**Impact**: Unrealistic defensive behavior
**Fix Required**: Rigorously extensive debugging. Calibrate motion response timing to NFL standards

### 3. Zone Landmark Timing Issues
**Status**: ❌ FAILING
**Severity**: MEDIUM
**Tests Affected**: `zoneLandmarkTiming.test.ts`
**Description**: Zone defenders not reaching landmarks at expected times
**Root Cause**: Movement speed calculations or path planning issues
**Impact**: Zones left open longer than intended
**Fix Required**: Rigorously extensive debugging. Adjust zone drop speeds and paths

### 4. LOS Adjustment Failures
**Status**: ⚠️ PARTIALLY FIXED
**Severity**: HIGH
**Tests Affected**: `losAdjustment.test.ts`
**Description**: Defenders not properly adjusting positions when LOS changes
**Root Cause**: Position recalculation not triggering or incorrect depth calculations
**Impact**: Defenders positioned incorrectly relative to LOS
**Fix Applied**: Added LOS change detection to force defender recreation, fixed Cover 0 press coverage depth, fixed Cover 3 CB positioning
**Progress**: Requires rigorously extensive debugging. 3/5 tests passing. Remaining issues with CB3 depth in Cover 3 (12 instead of 6-8) and some coverage changes

### 5. Next Play Reset Issues
**Status**: ❌ FAILING
**Severity**: MEDIUM
**Tests Affected**: `nextPlayReset.test.ts`
**Description**: Game state not properly resetting between plays
**Root Cause**: Residual state from previous play affecting next play
**Impact**: Inconsistent play behavior
**Fix Required**: Rigorously extensive debugging. Comprehensive state reset logic

### 6. User Autonomy Edge Cases
**Status**: ❌ FAILING
**Severity**: HIGH
**Tests Affected**: `userAutonomyEdgeCases.test.ts`, `userAutonomyIntegration.test.ts`
**Description**: Rapid user actions causing state inconsistencies
**Root Cause**: Race conditions in state updates
**Impact**: UI desyncs from engine state
**Fix Required**: Rigorously extensive debugging. State update synchronization

### 7. Air Raid Concept Issues
**Status**: ❌ FAILING
**Severity**: LOW
**Tests Affected**: `airRaidConcepts.test.ts`
**Description**: Air raid formations not rendering correctly
**Root Cause**: Formation data or route timing issues
**Impact**: Specific plays don't work as intended
**Fix Required**: Rigorously extensive debugging. Validate air raid concept data

### 8. Quick Game Timing
**Status**: ❌ FAILING
**Severity**: MEDIUM
**Tests Affected**: `quickGameConcepts.test.ts`
**Description**: Quick game routes not developing at correct speeds
**Root Cause**: Route timing calculations
**Impact**: Timing-based plays don't work properly
**Fix Required**: Rigorously extensive debugging. Adjust route timing for quick game concepts

## 🟡 Non-Blocking Edge Cases (Can Address in v1.1)

From Phase 4 testing (documented previously):

1. **Motion Boost Preservation** - Motion boost not maintained during formation changes
2. **Linebacker Drop Depth** - Calibration needed (12 vs 10 yards)
3. **LOS Positioning Edge Cases** - Minor positioning issues at extreme field positions
4. **Coverage Rotation Detection** - Tests not properly detecting rotations
5. **Trips Formation Distribution** - Defender distribution not optimal
6. **Zone Integrity During Motion** - Gaps appearing during motion adjustments
7. **Simultaneous State Changes** - Multiple rapid changes causing issues
8. **Play Reset During Active Play** - Reset behavior inconsistent mid-play
9. **Empty Formation LB Positioning** - LBs not widening as expected
10. **Blitzer Count Validation** - Cover 0 having more blitzers than expected
11. **Personnel Warning Display** - Warnings not always showing in UI
12. **Debug Overlay Performance** - Slight FPS drop with overlay enabled

## 📈 Test Failure Patterns

### Pattern 1: State Synchronization
- Multiple tests fail due to state not syncing between engine and UI
- Affects: User autonomy, next play reset
- Common error: "Expected X, Received Y"

### Pattern 2: Timing Dependencies
- Tests expecting specific timing fail due to calculation differences
- Affects: Zone landmarks, quick game, motion responses
- Common error: "Timeout exceeded" or "Not reached in time"

### Pattern 3: Coverage Assignment Logic
- Man coverage leaving receivers uncovered
- Zone responsibilities overlapping or missing
- Affects: Cover 0, Cover 1 slot coverage
- Common error: "Uncovered receivers" or "Duplicate assignments"

### Pattern 4: Position Calculations
- Positions not updating correctly after state changes
- Affects: LOS adjustments, formation changes
- Common error: "Position mismatch"

## 🛠️ Recommended Fix Priority

### Priority 1 (Block Phase 5)
1. Fix Cover 0 man coverage assignments
2. Fix LOS adjustment logic
3. Fix user autonomy state sync

### Priority 2 (Should fix soon)
1. Motion response timing
2. Zone landmark timing
3. Next play reset logic

### Priority 3 (Can defer)
1. Air raid concepts
2. Quick game timing
3. UI performance optimizations

## 📋 Validation Criteria for Phase 4.7 Completion

Before marking Phase 4.7 complete, we must:

- [ ] All critical edge cases resolved (8 items)
- [ ] Test pass rate > 95% (currently 89.6%)
- [ ] No game-breaking bugs in core mechanics
- [ ] Coverage assignments always total 7 defenders
- [ ] No uncovered receivers in man coverage
- [ ] State sync verified between engine and UI
- [ ] LOS adjustments working correctly
- [ ] Motion responses triggering properly
- [ ] Build passing without errors
- [ ] Performance metrics acceptable (60fps maintained)

## 🔍 Testing Commands

```bash
# Run all tests
npm test

# Run specific failing test suites
npm test coveragePersonnelIntegration
npm test userAutonomyIntegration
npm test losAdjustment
npm test cover1SlotFix

# Run with coverage
npm run test:coverage

# Run with verbose output
npm test -- --verbose
```

## 📝 Notes

- Many issues stem from the complex interaction between formation analysis, personnel matching, and coverage adjustments
- State management between engine and UI needs careful synchronization
- Timing-based tests are fragile and may need more flexible expectations
- Some "failures" may be due to test expectations not matching actual NFL behavior

## 🚀 Next Steps

1. Address Priority 1 issues immediately
2. Create focused fix branches for each critical issue
3. Add regression tests for each fix
4. Consider adding integration tests for complex scenarios
5. Document any behavior changes in CLAUDE.md