# NFL Coverage Assignment Matrix

## Overview
This document defines the assignment rules for all defensive coverages in the football simulator. Each coverage assigns exactly 7 defenders with specific responsibilities matching NFL defensive schemes.

## Core Assignment Principles

### Defender Positions
- **CB** (Cornerback): Primary coverage of WRs, fastest defenders
- **S** (Safety): Deep coverage and run support, versatile defenders
- **LB** (Linebacker): Underneath coverage and blitz, cover RBs/TEs
- **NB** (Nickel Back): Additional DB for passing situations, covers slot WRs

### Assignment Priority Order
1. **Man Coverage**: Direct player-to-player assignment
2. **Zone Coverage**: Area responsibility with pattern matching
3. **Blitz**: Rush the quarterback
4. **Hole/Robber**: Middle field coverage between zones

---

## Coverage Assignment Rules

### Cover 0 (Pure Man, No Deep Safety)
**Total Defenders**: 7
**Assignment Distribution**:
- 5 Man Coverage (CBs + NBs)
- 2 Blitzers (LBs/S)

**Assignment Rules**:
```
CBs → WRs (outside to inside priority)
NBs → Slot WRs or remaining WRs
LBs → RBs/TEs (or blitz if no RB/TE)
Safeties → Blitz or cover remaining eligibles
```

**Personnel Requirements**:
- Minimum 3 CBs for 3+ WR sets
- Can use any defensive personnel

---

### Cover 1 (Man-Free)
**Total Defenders**: 7
**Assignment Distribution**:
- 5 Man Coverage
- 1 Deep Free Safety
- 1 Hole/Robber Player

**Assignment Rules**:
```
FS → Deep middle zone (12-15 yards)
SS → Hole/Robber (8-10 yards middle)
CBs → WRs (outside to inside)
NBs → Slot WRs
LBs → RBs/TEs
```

**Personnel Requirements**:
- Requires at least 1 safety
- Best with Nickel (3 CB, 1 NB, 2 S, 1 LB) vs 11 personnel

---

### Cover 2 (Two-Deep, Five-Under)
**Total Defenders**: 7
**Assignment Distribution**:
- 2 Deep Halves (Safeties)
- 5 Underneath Zones

**Assignment Rules**:
```
Safeties → Deep halves (16-18 yards)
CBs → Flat zones (8 yards, jam at LOS first)
LBs → Hook/Curl zones (10-12 yards)
NB → Middle hole (if present)
```

**Zone Responsibilities**:
- Deep Halves: Split field vertically
- Flats: Outside underneath, 8-10 yards
- Hooks: Inside underneath, hash to hash
- Middle Hole: Between hooks, 10-12 yards

**Personnel Requirements**:
- Requires 2 safeties
- Works with any front

---

### Cover 3 (Three-Deep, Four-Under)
**Total Defenders**: 7
**Assignment Distribution**:
- 3 Deep Thirds
- 4 Underneath Zones

**Assignment Rules**:
```
FS → Deep middle third (12-14 yards)
CBs → Deep outside thirds (7 yard cushion, bail to deep)
SS → Strong side curl/flat
LBs → Hook zones and weak curl/flat
NB → Weak hook (if present)
```

**Zone Responsibilities**:
- Deep Thirds: Split field into 3 vertical zones
- Curl/Flat: 10-12 yards, numbers to sideline
- Hooks: 8-10 yards, hash to hash

**Personnel Requirements**:
- Standard with 1 high safety
- Adaptable to all personnel groups

---

### Cover 4 (Quarters)
**Total Defenders**: 7
**Assignment Distribution**:
- 4 Deep Quarters
- 3 Underneath Zones

**Assignment Rules**:
```
CBs → Deep quarters (outside)
Safeties → Deep quarters (inside)
LBs → Underneath zones (hooks/middle)
NB → Underneath middle (if present)
```

**Pattern Matching Rules**:
- #1 Vertical: CB carries
- #2 Vertical: Safety carries
- #1 Under: Safety robs
- #2 Under: LB expands

**Personnel Requirements**:
- Requires 2 safeties
- Best against 2x2 formations

---

### Cover 6 (Quarter-Quarter-Half)
**Total Defenders**: 7
**Assignment Distribution**:
- 2 Deep Quarters (strong side)
- 1 Deep Half (weak side)
- 4 Underneath Zones

**Assignment Rules**:
```
Strong CB → Deep quarter
Strong S → Deep quarter
Weak S → Deep half
Weak CB → Flat/Cloud
LBs → Underneath zones
```

**Rotation Trigger**:
- Strong side gets quarters coverage
- Weak side gets Cover 2 principles

**Personnel Requirements**:
- Requires 2 safeties
- Effective vs trips formations

---

### Tampa 2 (Robber Coverage)
**Total Defenders**: 7
**Assignment Distribution**:
- 2 Deep Halves
- 1 Deep Hole (Middle)
- 4 Underneath Zones

**Assignment Rules**:
```
Safeties → Deep halves (outside of numbers)
MLB → Deep middle hole (18-22 yards)
CBs → Flat zones (jam first)
OLBs → Hook/Curl zones
```

**Special Requirements**:
- **REQUIRES 3+ LBs** (MLB must drop deep)
- Not available in Dime package
- MLB must have range to cover deep middle

**Personnel Requirements**:
- Minimum 3 LBs (critical for scheme)
- Best with Base (4-3) personnel

---

### Quarters (Match Coverage)
**Total Defenders**: 7
**Assignment Distribution**:
- 4 Deep Match Players
- 3 Underneath Zones

**Assignment Rules**:
```
Read #2 Receiver:
- If #2 vertical → Safety takes #2
- If #2 under → Safety helps on #1
- If #2 out → CB takes #1 vertical
```

**MEG (Man Everywhere he Goes) Rules**:
- Triggered at 12+ yards downfield
- Zone converts to man coverage
- Defenders lock onto receivers in their zone

**Personnel Requirements**:
- Flexible personnel
- Best with athletic safeties

---

## Coverage-Personnel Compatibility Matrix

| Coverage | Dime (1LB) | Nickel (2LB) | Base (3LB) | Compatible |
|----------|------------|--------------|------------|------------|
| Cover 0  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Cover 1  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Cover 2  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Cover 3  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Cover 4  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Cover 6  | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |
| Tampa 2  | ❌ No      | ⚠️ Warning   | ✅ Yes     | 3+ LBs     |
| Quarters | ✅ Yes     | ✅ Yes       | ✅ Yes     | All        |

---

## Assignment Validation Rules

### Rule 1: Total Defenders
```typescript
function validateDefenderCount(assignments: Assignment[]): boolean {
  return assignments.length === 7;
}
```

### Rule 2: No Duplicate Assignments
```typescript
function validateNoDuplicates(assignments: Assignment[]): boolean {
  const targets = assignments
    .filter(a => a.type === 'man')
    .map(a => a.target);
  return targets.length === new Set(targets).size;
}
```

### Rule 3: All Eligible Receivers Covered
```typescript
function validateCoverage(assignments: Assignment[], eligibles: Player[]): boolean {
  // In man coverage, all eligibles must be covered
  // In zone coverage, all areas must have defenders
  const manTargets = assignments
    .filter(a => a.type === 'man')
    .map(a => a.target);

  const uncovered = eligibles.filter(e =>
    !manTargets.includes(e.id) &&
    !isInZoneCoverage(e, assignments)
  );

  return uncovered.length === 0;
}
```

### Rule 4: Personnel Match Warning
```typescript
function checkPersonnelCompatibility(
  coverage: CoverageType,
  personnel: DefensivePersonnel
): Warning[] {
  const warnings = [];

  if (coverage === 'tampa-2' && personnel.LB < 3) {
    warnings.push({
      severity: 'error',
      message: 'Tampa 2 requires at least 3 LBs (MLB drops to deep middle)'
    });
  }

  if (coverage === 'cover-2' && personnel.S < 2) {
    warnings.push({
      severity: 'error',
      message: 'Cover 2 requires 2 safeties for deep halves'
    });
  }

  return warnings;
}
```

---

## Motion Adjustment Matrix

| Coverage | Motion Response | Adjustment |
|----------|----------------|------------|
| Cover 0  | Lock           | Man defender follows motion |
| Cover 1  | Lock/Bump      | Man defender follows, others bump |
| Cover 2  | Minimal        | Maintain zones, slight adjustment |
| Cover 3  | Rotation       | Roll to motion side if needed |
| Cover 4  | Check          | Check leverage, possible roll |
| Cover 6  | Spin           | Rotate coverage to motion |
| Tampa 2  | Minimal        | Zones stay, MLB reads motion |
| Quarters | Pattern-Adjust | Adjust pattern match rules |

---

## Formation Adjustments

### Trips Formations
- Cover 1: Funnel coverage to trips side
- Cover 2: Roll safety to trips
- Cover 3: Rotate to trips
- Cover 4: Check to Cover 2 on trips side
- Cover 6: Quarters to trips, half away

### Empty Formations (No RB)
- Cover 1: Convert robber to man
- Cover 2: Widen LBs to slots
- Tampa 2: MLB still drops deep
- All: Adjust to 5 eligible receivers

### Heavy Formations (2+ TE)
- Base personnel preferred
- Tighten zones
- Inside leverage on TEs
- Compress coverage

---

## Blitz Integration

### Coverage Adjustments for Blitz
- **Zero Blitz**: All man, no deep help
- **Fire Zone**: 3 deep, 3 under, 1 blitz
- **Tampa 2 Blitz**: Maintain 2 deep + hole
- **Cover 1 Blitz**: Keep free safety deep

### Blitz Assignment Priority
1. OLB from weak side
2. SS from strong side
3. Nickel from slot
4. ILB on run downs

---

## Implementation Notes

### Engine Integration Points
1. **Personnel Selection**: `getOptimalDefensivePersonnel()`
2. **Assignment Generation**: `generateDefensiveAssignments()`
3. **Coverage Alignment**: `generateCover[X]Alignment()`
4. **Motion Response**: `handleMotionAdjustments()`
5. **Validation**: `validateCoverageIntegrity()`

### Testing Requirements
- Each coverage with each personnel package
- Motion adjustments for all coverages
- Formation-specific adjustments
- Blitz integration scenarios
- Zone handoff and pattern matching

---

## Common Issues and Solutions

### Issue: Unassigned Receivers
**Solution**: Implement fallback assignment logic
```typescript
if (unassignedReceivers.length > 0) {
  // Assign nearest defender in zone
  // Or convert to man coverage
}
```

### Issue: Personnel Mismatch
**Solution**: Provide clear warnings and auto-adjust
```typescript
if (!isCompatible(coverage, personnel)) {
  suggestAlternativeCoverage();
  // Or auto-switch personnel
}
```

### Issue: Motion Breaking Coverage
**Solution**: Implement proper motion rules
```typescript
handleMotion(motion, coverage) {
  switch(coverage.motionResponse) {
    case 'lock': followMotion();
    case 'rotate': rotateCoverage();
    // etc.
  }
}
```