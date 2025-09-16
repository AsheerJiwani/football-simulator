# Formation Naming Convention

## Overview
Formations in the football simulator follow a consistent naming pattern that indicates both the base formation and the personnel package being used.

## Naming Pattern
`{base-formation}-{personnel}`

## Personnel Packages
- **10 Personnel**: 1 RB, 0 TE, 4 WR (or 0 RB, 0 TE, 5 WR for empty)
- **11 Personnel**: 1 RB, 1 TE, 3 WR
- **12 Personnel**: 1 RB, 2 TE, 2 WR
- **21 Personnel**: 1 RB, 1 TE, 2 WR, 1 FB
- **22 Personnel**: 1 RB, 2 TE, 1 WR, 1 FB

## Current Formations

### Base Formations
- **trips-right**: Default 11 personnel (3 WR, 1 TE, 1 RB)
- **trips-right-10**: 10 personnel variant (4 WR, 0 TE, 1 RB)
- **singleback**: Default mixed personnel (3 WR, 2 TE, 1 RB)
- **singleback-11**: 11 personnel variant (3 WR, 1 TE, 1 RB)
- **singleback-12**: 12 personnel variant (2 WR, 2 TE, 1 RB)
- **spread-2x2**: Default 10 personnel (4 WR, 0 TE, 1 RB)
- **spread-2x2-11**: 11 personnel variant (3 WR, 1 TE, 1 RB)
- **empty**: Empty backfield 10 personnel (5 WR, 1 TE, 0 RB)
- **i-form-21**: I-Formation 21 personnel (2 WR, 1 TE, 1 RB, 1 FB)
- **strong-22**: Strong Formation 22 personnel (1 WR, 2 TE, 1 RB, 1 FB)

## Formation-Concept Mapping Rules

1. **Personnel Must Match**: When a concept references a formation, the formation's personnel must have enough positions for all routes defined in the concept.

2. **Default vs Variant**:
   - If a formation name has no personnel suffix, it's the default personnel for that base formation
   - Personnel-specific variants are explicitly named (e.g., `trips-right-10`)

3. **Concept Updates**: When updating concepts to use different personnel:
   - Concepts with 4 WRs and no TE should use formations ending in `-10` or default `spread-2x2`
   - Concepts with 3 WRs and 1 TE should use formations ending in `-11` or default `trips-right`
   - Concepts with 2 WRs and 2 TEs should use formations ending in `-12`

## Examples

### Correct Mappings
- Concept "Mesh" with routes for WR1-4 → uses `trips-right-10` (4 WRs available)
- Concept "Slant-Flat" with routes for WR1-3, TE1 → uses `trips-right` (3 WRs, 1 TE)
- Concept "Smash" with routes for WR1-3, TE1-2 → uses `singleback` (3 WRs, 2 TEs)

### Common Errors to Avoid
- ❌ Using `trips-right` (3 WRs) for a concept with WR4 routes
- ❌ Using `spread-2x2` (no TE) for a concept with TE1 routes
- ❌ Having more player positions in formation than personnel counts indicate

## Validation Checklist
- [ ] Formation personnel counts match the actual positions defined
- [ ] Concept routes only reference players that exist in the formation
- [ ] Personnel package numbers accurately reflect RB+TE count (e.g., 12 = 1 RB + 2 TE)
- [ ] Formation names follow the `{base}-{personnel}` pattern for variants