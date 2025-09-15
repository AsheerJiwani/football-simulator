import type { Player, Vector2D } from './types';
import { Vector } from '@/lib/math';

// Formation strength determination
export type FormationStrength = 'left' | 'right' | 'balanced';

export interface FormationAnalysis {
  strength: FormationStrength;
  receiversLeft: Player[];
  receiversRight: Player[];
  hasTE: boolean;
  teSide?: 'left' | 'right';
  isTrips: boolean;
  tripsSide?: 'left' | 'right';
  personnel: PersonnelPackage;
}

export interface PersonnelPackage {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FB: number;
}

export interface DefensivePersonnel {
  CB: number;
  S: number;
  LB: number;
  NB: number; // Nickel backs
}

// Coverage leverage options
export type Leverage = 'inside' | 'outside' | 'head-up';

// NFL Cover 1 alignment constants (based on research)
export const COVER_1_CONSTANTS = {
  CB_DEPTH_SOFT: 7,        // 7-8 yards off LOS for soft coverage (NFL standard per Bleacher Report)
  CB_DEPTH_PRESS: 1.5,     // 1-2 yards off LOS for press coverage (Glazier Clinics)
  FS_DEPTH: 12,            // 12-15 yards centerfield (Match Quarters standard)
  SS_DEPTH_VS_TE: 5,       // 5-7 yards when covering TE (inside leverage)
  LB_DEPTH: 4.5,           // 4-5 yards off LOS (coaching clinic standards)
  BOUNDARY_SWITCH: 6,      // Inside leverage if receiver within 6 yards of sideline
  ROUTE_BREAK_DEPTH: 13,   // Anticipate route breaks at this depth
  TRIPS_LEVERAGE_ADJUST: 2, // Additional inside shade vs trips formation
} as const;

// NFL Cover 2 alignment constants (based on NFL press/jam technique research)
export const COVER_2_CONSTANTS = {
  CB_DEPTH_PRESS: 1,        // 1-2 yards at LOS for proper press/jam (NFL standard)
  CB_DEPTH_BAIL: 5,         // 5-7 yards for bail technique (situational)
  SAFETY_DEPTH: 15,         // 15-18 yards deep halves at top of numbers
  SAFETY_WIDTH: 13,         // Distance from center to safety position (numbers)
  HOOK_DEPTH: 10,           // 10-12 yards for hook defenders
  FLAT_DEPTH: 8,            // 8-10 yards for flat zone coverage
  JAM_RELEASE_DEPTH: 5,     // Depth at which CB releases jam and sinks to flat
  INSIDE_LEVERAGE: 0.5,     // Yards inside shade for jamming slants/hitches
} as const;

// NFL Cover 3 alignment constants
export const COVER_3_CONSTANTS = {
  CB_DEPTH_SOFT: 7,         // 7-8 yards soft coverage
  FS_DEPTH: 12,             // 12-14 yards deep middle third
  SS_CURL_FLAT_DEPTH: 10,   // 10-12 yards for curl/flat coverage
  HOOK_DEPTH: 8,            // 8-10 yards hash to hash
  DEEP_THIRD_WIDTH: 17.77,  // Field width divided by 3
  PATTERN_MATCH_TRIGGER: 12, // Depth at which pattern matching triggers
  VERTICAL_ROUTE_THRESHOLD: 12, // Route depth to classify as vertical
  HORIZONTAL_ROUTE_THRESHOLD: 8, // Route depth to classify as horizontal
} as const;

// Pattern matching types for Cover 3
export type PatternMatchType = 'zone' | 'man-match' | 'collision';
export type RouteClassification = 'vertical' | 'horizontal' | 'breaking' | 'crossing';

// Zone coordination types and constants
export interface ZoneCoordinationRules {
  deeperThanDeepest: boolean;
  overlapResponsibility: boolean;
  landmarkBased: boolean;
  expandContract: boolean;
}

export interface ZoneOverlap {
  defenderId: string;
  adjacentDefenderId: string;
  overlapDistance: number;
  handoffPoint: Vector2D;
}

export interface ZoneLandmark {
  name: string;
  position: Vector2D;
  zoneType: 'deep' | 'intermediate' | 'underneath';
}

// NFL Zone Coordination Constants (based on research)
export const ZONE_COORDINATION_CONSTANTS = {
  DEEPER_THAN_DEEPEST_CUSHION: 2,     // 2 yards deeper than deepest receiver
  ZONE_OVERLAP_WIDTH: 1.5,            // 1.5 yards overlap between adjacent zones
  LANDMARK_HASH_POSITION: 18.67,      // Hash marks at 18.67 yards from center
  LANDMARK_NUMBERS_POSITION: 13,      // Numbers at 13 yards from center
  ZONE_EXPANSION_RATIO: 0.15,         // 15% expansion when receivers spread
  ZONE_CONTRACTION_RATIO: 0.20,       // 20% contraction for bunch formations
  COMMUNICATION_RANGE: 8,              // 8 yards for effective zone communication
  BOUNDARY_WALL_DISTANCE: 9,          // 9 yards minimum from sideline for deep zones
  RED_ZONE_COMPRESSION: 0.75,         // 25% zone compression in red zone
} as const;

/**
 * Count personnel by position type
 */
function countPersonnel(players: Player[]): PersonnelPackage {
  const personnel: PersonnelPackage = { QB: 0, RB: 0, WR: 0, TE: 0, FB: 0 };

  players.forEach(player => {
    if (player.playerType in personnel) {
      personnel[player.playerType as keyof PersonnelPackage]++;
    }
  });

  return personnel;
}

/**
 * Analyze offensive formation to determine strength and receiver distribution
 */
export function analyzeFormation(offensivePlayers: Player[]): FormationAnalysis {
  const receivers = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
  const te = receivers.find(p => p.playerType === 'TE');
  const personnel = countPersonnel(offensivePlayers);

  // Separate receivers by side of field (using middle of field as divider)
  const midfield = 26.665; // Middle of 53.33 yard field
  const receiversLeft = receivers.filter(p => p.position.x < midfield);
  const receiversRight = receivers.filter(p => p.position.x >= midfield);

  let strength: FormationStrength = 'balanced';
  let teSide: 'left' | 'right' | undefined;
  let isTrips = false;
  let tripsSide: 'left' | 'right' | undefined;

  // Determine TE side
  if (te) {
    teSide = te.position.x < midfield ? 'left' : 'right';
    strength = teSide; // TE side is strength
  }

  // Check for trips (3+ receivers on one side)
  if (receiversLeft.length >= 3) {
    isTrips = true;
    tripsSide = 'left';
    strength = 'left';
  } else if (receiversRight.length >= 3) {
    isTrips = true;
    tripsSide = 'right';
    strength = 'right';
  }

  // If no TE and no trips, use wider side
  if (!te && !isTrips) {
    if (receiversLeft.length > receiversRight.length) {
      strength = 'left';
    } else if (receiversRight.length > receiversLeft.length) {
      strength = 'right';
    }
  }

  return {
    strength,
    receiversLeft,
    receiversRight,
    hasTE: !!te,
    teSide,
    isTrips,
    tripsSide,
    personnel,
  };
}

/**
 * Get receivers by their alignment number (#1, #2, #3) for each side
 */
export function getReceiversByAlignment(receivers: Player[]): { number1?: Player, number2?: Player, number3?: Player } {
  if (receivers.length === 0) return {};

  // Sort by distance from LOS (closest to LOS is #1)
  const sorted = receivers.sort((a, b) => b.position.y - a.position.y);

  return {
    number1: sorted[0],
    number2: sorted[1],
    number3: sorted[2],
  };
}

/**
 * Calculate proper leverage for a defender based on receiver position and coverage rules
 */
export function calculateLeverage(receiver: Player, fieldBoundary: 'left' | 'right'): Leverage {
  const boundaryDistance = fieldBoundary === 'left'
    ? receiver.position.x
    : 53.33 - receiver.position.x;

  // Inside leverage if receiver is within 6 yards of boundary
  if (boundaryDistance < COVER_1_CONSTANTS.BOUNDARY_SWITCH) {
    return 'inside';
  }

  // Default outside leverage for Cover 1
  return 'outside';
}

/**
 * Calculate Cover 1 Free Safety position (NFL-accurate with formation adjustments)
 */
export function getCover1FreeSafety(formation: FormationAnalysis, los: number): Vector2D {
  const centerX = 26.665; // Center of field
  const depth = COVER_1_CONSTANTS.FS_DEPTH;

  // Shade toward strength based on formation type
  let xAdjustment = 0;

  if (formation.isTrips) {
    // Shade 3-4 yards toward trips side (stronger shade for 3x1)
    xAdjustment = formation.tripsSide === 'left' ? -3.5 : 3.5;
  } else if (formation.hasTE) {
    // Shade 2 yards toward TE side
    xAdjustment = formation.teSide === 'left' ? -2 : 2;
  } else if (formation.strength !== 'balanced') {
    // Slight shade toward general strength
    xAdjustment = formation.strength === 'left' ? -1.5 : 1.5;
  }

  return {
    x: centerX + xAdjustment,
    y: los + depth, // Always 12 yards on defensive side
  };
}

/**
 * Calculate Cover 1 Cornerback position (NFL-accurate with formation responsiveness)
 */
export function getCover1Cornerback(
  receiver: Player,
  leverage: Leverage,
  los: number,
  formation: FormationAnalysis,
  coverage: 'soft' | 'press' = 'soft'
): Vector2D {
  // Determine depth based on formation and coverage type
  let depth: number = coverage === 'press' ? COVER_1_CONSTANTS.CB_DEPTH_PRESS : COVER_1_CONSTANTS.CB_DEPTH_SOFT;

  // Adjust depth for trips formations (softer coverage to help with 3x1)
  if (formation.isTrips && coverage === 'soft') {
    depth = 8; // Extra yard for trips
  }

  // Calculate leverage positioning
  let xOffset = 0;
  if (leverage === 'outside') {
    xOffset = 2; // 2 yards outside shade
  } else if (leverage === 'inside') {
    xOffset = -2; // 2 yards inside shade
    // Extra inside shade vs trips #1 receiver
    if (formation.isTrips) {
      xOffset -= COVER_1_CONSTANTS.TRIPS_LEVERAGE_ADJUST;
    }
  }

  // Boundary adjustments - don't align outside the field
  const finalX = Math.max(1, Math.min(52.33, receiver.position.x + xOffset));

  return {
    x: finalX,
    y: los + depth,
  };
}

/**
 * Calculate Cover 1 Strong Safety position
 */
export function getCover1StrongSafety(targetReceiver: Player, los: number): Vector2D {
  const depth = COVER_1_CONSTANTS.SS_DEPTH_VS_TE;

  // 2 yards outside the target receiver
  return {
    x: targetReceiver.position.x + 2,
    y: los + depth, // Position on defensive side of LOS
  };
}

/**
 * Calculate Cover 2 Safety positions (deep halves)
 */
export function getCover2Safeties(formation: FormationAnalysis, los: number): { left: Vector2D; right: Vector2D } {
  const centerX = 26.665;
  const baseWidth = COVER_2_CONSTANTS.SAFETY_WIDTH;
  const depth = COVER_2_CONSTANTS.SAFETY_DEPTH;

  // Adjust width based on formation
  let widthAdjustment = 0;
  if (formation.isTrips) {
    // Widen safeties vs trips to cover seams
    widthAdjustment = 2;
  }

  return {
    left: {
      x: centerX - baseWidth - widthAdjustment,
      y: los + depth
    },
    right: {
      x: centerX + baseWidth + widthAdjustment,
      y: los + depth
    }
  };
}

/**
 * Calculate Cover 2 Cornerback position (NFL press/jam technique)
 */
export function getCover2Cornerback(
  receiver: Player,
  los: number,
  formation: FormationAnalysis,
  technique: 'press' | 'bail' = 'press'
): Vector2D {
  const depth = technique === 'press' ? COVER_2_CONSTANTS.CB_DEPTH_PRESS : COVER_2_CONSTANTS.CB_DEPTH_BAIL;

  // NFL Cover 2: CBs must press/jam #1 receivers with inside leverage
  let xOffset = 0;
  if (technique === 'press') {
    // Inside leverage to jam slants and hitches
    xOffset = -COVER_2_CONSTANTS.INSIDE_LEVERAGE;

    // Adjust leverage based on receiver alignment and formation
    if (formation.isTrips) {
      // Stronger inside leverage vs trips to prevent quick slants
      xOffset -= 0.5;
    }

    // Boundary adjustments - don't align outside the field
    const boundaryDistance = Math.min(receiver.position.x, 53.33 - receiver.position.x);
    if (boundaryDistance < 6) {
      // Force inside leverage near boundary
      xOffset = -Math.abs(xOffset);
    }
  }

  // Ensure CB stays in bounds
  const finalX = Math.max(1, Math.min(52.33, receiver.position.x + xOffset));

  return {
    x: finalX,
    y: los + depth
  };
}

/**
 * Calculate Cover 2 Hook/Curl defender position
 */
export function getCover2HookDefender(side: 'left' | 'right' | 'middle', formation: FormationAnalysis, los: number): Vector2D {
  const centerX = 26.665;
  const depth = COVER_2_CONSTANTS.HOOK_DEPTH;

  let xPosition: number;
  if (side === 'middle') {
    xPosition = centerX;
  } else if (side === 'left') {
    // Position between hash and numbers
    xPosition = centerX - 10;
    if (formation.isTrips && formation.tripsSide === 'left') {
      // Widen to cover seam vs trips
      xPosition -= 3;
    }
  } else { // right
    xPosition = centerX + 10;
    if (formation.isTrips && formation.tripsSide === 'right') {
      // Widen to cover seam vs trips
      xPosition += 3;
    }
  }

  return {
    x: xPosition,
    y: los + depth
  };
}

/**
 * Calculate Cover 3 Cornerback position (deep third)
 */
export function getCover3Cornerback(
  receiver: Player,
  side: 'left' | 'right',
  formation: FormationAnalysis,
  los: number
): Vector2D {
  const depth = COVER_3_CONSTANTS.CB_DEPTH_SOFT;
  const thirdWidth = COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

  // Position at edge of deep third zone
  let xPosition: number;
  if (side === 'left') {
    xPosition = thirdWidth / 2; // Left deep third
  } else {
    xPosition = 53.33 - (thirdWidth / 2); // Right deep third
  }

  // Adjust slightly toward receiver to maintain coverage
  const receiverOffset = (receiver.position.x - xPosition) * 0.3;
  xPosition += receiverOffset;

  return {
    x: Math.max(2, Math.min(51.33, xPosition)), // Stay in bounds
    y: los + depth
  };
}

/**
 * Calculate Cover 3 Free Safety position (deep middle third)
 */
export function getCover3FreeSafety(formation: FormationAnalysis, los: number): Vector2D {
  const centerX = 26.665;
  const depth = COVER_3_CONSTANTS.FS_DEPTH;

  // Shade toward trips formation
  let xAdjustment = 0;
  if (formation.isTrips) {
    xAdjustment = formation.tripsSide === 'left' ? -3 : 3;
  }

  return {
    x: centerX + xAdjustment,
    y: los + depth
  };
}

/**
 * Calculate Cover 3 Strong Safety position (curl/flat or rotation)
 */
export function getCover3StrongSafety(
  formation: FormationAnalysis,
  los: number,
  rotation: 'sky' | 'buzz' | 'normal' = 'normal'
): Vector2D {
  const centerX = 26.665;
  const depth = COVER_3_CONSTANTS.SS_CURL_FLAT_DEPTH;

  let xPosition: number;
  let finalDepth = depth;

  if (rotation === 'sky') {
    // SS rotates down to curl/flat on strength side
    xPosition = formation.strength === 'left' ? centerX - 8 : centerX + 8;
  } else if (rotation === 'buzz') {
    // SS rotates down inside
    xPosition = centerX - 2;
  } else {
    // Normal curl/flat coverage on strength side
    xPosition = formation.strength === 'left' ? centerX - 6 : centerX + 6;
  }

  return {
    x: xPosition,
    y: los + finalDepth
  };
}

/**
 * Calculate Cover 3 Hook defender position
 */
export function getCover3HookDefender(formation: FormationAnalysis, los: number): Vector2D {
  const centerX = 26.665;
  const depth = COVER_3_CONSTANTS.HOOK_DEPTH;

  return {
    x: centerX,
    y: los + depth
  };
}

/**
 * Classify route based on receiver position and route depth (for pattern matching)
 */
export function classifyRoute(receiver: Player, los: number): RouteClassification {
  const routeDepth = receiver.position.y - los;

  // For pre-snap alignment, classify based on receiver's current position relative to LOS
  // In a real implementation, this would use route information
  if (routeDepth >= COVER_3_CONSTANTS.VERTICAL_ROUTE_THRESHOLD) {
    return 'vertical';
  } else if (routeDepth <= COVER_3_CONSTANTS.HORIZONTAL_ROUTE_THRESHOLD) {
    return 'horizontal';
  } else {
    return 'breaking';
  }
}

/**
 * Determine if Cover 3 pattern matching should trigger
 */
export function shouldTriggerPatternMatch(
  receiver: Player,
  los: number,
  defenderZone: 'deep-third' | 'underneath'
): PatternMatchType {
  const routeClassification = classifyRoute(receiver, los);
  const routeDepth = receiver.position.y - los;

  // Deep third defenders use pattern matching
  if (defenderZone === 'deep-third') {
    if (routeClassification === 'vertical' && routeDepth >= COVER_3_CONSTANTS.PATTERN_MATCH_TRIGGER) {
      return 'man-match'; // Switch to man coverage on vertical routes
    }
    return 'zone'; // Stay in zone for horizontal routes
  }

  // Underneath defenders typically stay in zone unless collision is needed
  if (defenderZone === 'underneath') {
    if (routeClassification === 'crossing') {
      return 'collision'; // Collision technique on crossing routes
    }
    return 'zone';
  }

  return 'zone';
}

/**
 * Apply Cover 3 RIP/LIZ pattern matching rules
 */
export function applyCover3PatternMatch(
  defender: Player,
  receivers: Player[],
  formation: FormationAnalysis,
  los: number
): { coverage: PatternMatchType; target?: string; adjustment: Vector2D } {
  const defenderThird = determineDefenderThird(defender, formation);
  let coverage: PatternMatchType = 'zone';
  let target: string | undefined;
  let adjustment: Vector2D = { x: defender.position.x, y: defender.position.y };

  // Find receivers in this defender's zone/responsibility
  const threateningReceivers = receivers.filter(receiver => {
    return isReceiverInDefenderZone(receiver, defender, defenderThird, los);
  });

  if (threateningReceivers.length > 0) {
    // Check for vertical routes that trigger pattern matching
    const verticalReceiver = threateningReceivers.find(receiver => {
      const matchType = shouldTriggerPatternMatch(receiver, los, defenderThird === 'middle' ? 'deep-third' : 'deep-third');
      return matchType === 'man-match';
    });

    if (verticalReceiver) {
      coverage = 'man-match';
      target = verticalReceiver.id;
      // Adjust position to match receiver man-to-man
      adjustment = {
        x: verticalReceiver.position.x,
        y: verticalReceiver.position.y + (defenderThird === 'middle' ? 2 : 3) // Stay slightly behind
      };
    }
  }

  return { coverage, target, adjustment };
}

/**
 * Determine which third of the field a defender is responsible for
 */
function determineDefenderThird(defender: Player, formation: FormationAnalysis): 'left' | 'right' | 'middle' {
  const centerX = 26.665;
  const leftThird = COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;
  const rightThird = 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

  if (defender.position.x < leftThird) return 'left';
  if (defender.position.x > rightThird) return 'right';
  return 'middle';
}

/**
 * Check if receiver is in defender's zone of responsibility
 */
function isReceiverInDefenderZone(
  receiver: Player,
  defender: Player,
  defenderThird: 'left' | 'right' | 'middle',
  los: number
): boolean {
  const receiverDepth = receiver.position.y - los;
  const defenderDepth = defender.position.y - los;

  // Only consider receivers at similar or greater depth for deep defenders
  if (defenderDepth >= 10 && receiverDepth < defenderDepth - 3) {
    return false;
  }

  // Check horizontal zone responsibility
  const leftBoundary = defenderThird === 'left' ? 0 :
                      defenderThird === 'middle' ? COVER_3_CONSTANTS.DEEP_THIRD_WIDTH :
                      53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

  const rightBoundary = defenderThird === 'left' ? COVER_3_CONSTANTS.DEEP_THIRD_WIDTH :
                       defenderThird === 'middle' ? 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH :
                       53.33;

  return receiver.position.x >= leftBoundary && receiver.position.x <= rightBoundary;
}

/**
 * Calculate Cover 1 Linebacker position
 */
export function getCover1Linebacker(targetReceiver: Player, los: number, role: 'coverage' | 'hole' = 'coverage'): Vector2D {
  const depth = COVER_1_CONSTANTS.LB_DEPTH;

  if (role === 'hole') {
    // Hole/rat defender covers middle zone to help with crossing routes
    // Position: Center field, 10 yards deep for hole zone coverage
    const holePosition = {
      x: 26.665, // Center field between hash marks
      y: los + 10, // 10 yards on defensive side for hole coverage
    };
    return holePosition;
  }

  // Coverage linebacker aligns over target at x position, 5 yards on defensive side
  return {
    x: targetReceiver.position.x,
    y: los + depth,  // 5 yards on defensive side of LOS
  };
}

/**
 * Adjust defender position based on motion
 */
export function adjustForMotion(
  defender: Player,
  motionReceiver: Player,
  motionDirection: 'left' | 'right'
): Vector2D {
  // If this defender is assigned to the motion receiver, follow
  if (defender.coverageResponsibility?.target === motionReceiver.id) {
    // Maintain same relative positioning
    const currentOffset = Vector.subtract(defender.position, motionReceiver.position);
    return Vector.add(motionReceiver.position, currentOffset);
  }

  // Adjacent defenders bump slightly toward motion
  const bumpDistance = 1; // 1 yard bump
  const bumpDirection = motionDirection === 'right' ? bumpDistance : -bumpDistance;

  return {
    x: defender.position.x + bumpDirection,
    y: defender.position.y,
  };
}

/**
 * Determine optimal defensive personnel based on offensive personnel (NFL-accurate)
 */
export function getOptimalDefensivePersonnel(offensivePersonnel: PersonnelPackage): DefensivePersonnel {
  const wrCount = offensivePersonnel.WR;
  const teCount = offensivePersonnel.TE;
  const rbCount = offensivePersonnel.RB + offensivePersonnel.FB;

  // Start with base personnel (4-3 or 3-4 equivalent)
  let personnel: DefensivePersonnel = {
    CB: 2,
    S: 1, // Free Safety by default
    LB: 4,
    NB: 0,
  };

  // Personnel package adjustments based on NFL standards
  if (wrCount >= 4) {
    // 10 personnel (4+ WRs): Dime package (need 6 DBs total)
    // CB: 3, S: 2, NB: 1 = 6 DBs total
    personnel = {
      CB: 3,  // Increased from 2 to 3 for proper Dime
      S: 2,   // FS + SS or two deep safeties
      LB: 1,  // Only 1 LB in Dime
      NB: 1,  // One nickel/dime back
    };
  } else if (wrCount >= 3) {
    // 11 personnel (3+ WRs): Nickel package (need 5 DBs total)
    // CB: 2, S: 2, NB: 1 = 5 DBs total
    personnel = {
      CB: 2,
      S: 2,   // Both FS and SS for proper Nickel
      LB: 2,  // Reduced from 3 to 2
      NB: 1,  // Nickel back
    };
  }

  // TE-heavy formations (12, 21, 22 personnel)
  if (teCount >= 2 || (teCount >= 1 && rbCount >= 2)) {
    personnel.S = 2; // Add Strong Safety
    // Ensure we have exactly 7 defenders
    if (personnel.CB + personnel.S + personnel.LB + personnel.NB > 7) {
      personnel.LB = Math.max(2, 7 - personnel.CB - personnel.S - personnel.NB);
    }
  }

  // Ensure minimum DBs for proper coverage
  // Always need at least 2 CBs and 2 Safeties for most coverages
  if (personnel.S < 2) {
    personnel.S = 2; // Always have both FS and SS
  }

  // Ensure exactly 7 defenders
  const total = personnel.CB + personnel.S + personnel.LB + personnel.NB;
  if (total !== 7) {
    // Adjust LBs to maintain 7 total
    personnel.LB = 7 - personnel.CB - personnel.S - personnel.NB;
    personnel.LB = Math.max(1, personnel.LB); // Minimum 1 LB
  }

  return personnel;
}

/**
 * Generate defensive player assignments based on offensive personnel (NFL-accurate)
 */
export function generateDefensiveAssignments(
  formation: FormationAnalysis,
  requiredPersonnel: DefensivePersonnel
): Array<{ defenderId: string; playerType: string; target?: string; role: string }> {
  const assignments: Array<{ defenderId: string; playerType: string; target?: string; role: string }> = [];
  const receivers = [...formation.receiversLeft, ...formation.receiversRight];

  // Sort receivers by priority: #1 outside receivers first, then slots, then TEs/RBs
  const sortedReceivers = receivers.sort((a, b) => {
    // WRs get priority over TEs/RBs
    if (a.playerType === 'WR' && b.playerType !== 'WR') return -1;
    if (b.playerType === 'WR' && a.playerType !== 'WR') return 1;

    // Among same type, sort by field width (outside receivers first)
    const aDistFromCenter = Math.abs(a.position.x - 26.665);
    const bDistFromCenter = Math.abs(b.position.x - 26.665);
    return bDistFromCenter - aDistFromCenter;
  });

  // Create assignments to exactly match required personnel
  let assignedReceivers = new Set<string>();

  // 1. Add required cornerbacks
  for (let i = 0; i < requiredPersonnel.CB; i++) {
    const targetReceiver = sortedReceivers.find(r => !assignedReceivers.has(r.id) && r.playerType === 'WR');
    if (targetReceiver) {
      assignedReceivers.add(targetReceiver.id);
    }

    assignments.push({
      defenderId: `CB${i + 1}`,
      playerType: 'CB',
      target: targetReceiver?.id,
      role: 'man-coverage'
    });
  }

  // 2. Add required nickel backs
  for (let i = 0; i < requiredPersonnel.NB; i++) {
    const targetReceiver = sortedReceivers.find(r => !assignedReceivers.has(r.id));
    if (targetReceiver) {
      assignedReceivers.add(targetReceiver.id);
    }

    assignments.push({
      defenderId: `NB${i + 1}`,
      playerType: 'NB',
      target: targetReceiver?.id,
      role: 'man-coverage'
    });
  }

  // 3. Add required safeties
  for (let i = 0; i < requiredPersonnel.S; i++) {
    const isFreeSafety = i === 0;
    const targetReceiver = !isFreeSafety ?
      sortedReceivers.find(r => !assignedReceivers.has(r.id)) : undefined;

    if (targetReceiver) {
      assignedReceivers.add(targetReceiver.id);
    }

    assignments.push({
      defenderId: `S${i + 1}`,  // Use consistent S1, S2 naming
      playerType: 'S',
      target: targetReceiver?.id,
      role: isFreeSafety ? 'free-safety' : 'strong-safety'
    });
  }

  // 4. Add required linebackers
  for (let i = 0; i < requiredPersonnel.LB; i++) {
    const targetReceiver = sortedReceivers.find(r => !assignedReceivers.has(r.id));
    if (targetReceiver) {
      assignedReceivers.add(targetReceiver.id);
    }

    // Last LB is typically a spy
    const role = (i === requiredPersonnel.LB - 1 && requiredPersonnel.LB > 1) ? 'spy' : 'man-coverage';

    assignments.push({
      defenderId: `LB${i + 1}`,
      playerType: 'LB',
      target: role === 'spy' ? undefined : targetReceiver?.id,
      role
    });
  }

  // Verify we have exactly 7 defenders
  const totalDefenders = requiredPersonnel.CB + requiredPersonnel.S + requiredPersonnel.LB + requiredPersonnel.NB;
  if (totalDefenders !== 7) {
    console.warn(`Personnel count mismatch: ${totalDefenders} defenders instead of 7`);
  }

  return assignments;
}

/**
 * Generate complete Cover 1 defensive alignment (NFL-accurate with formation responsiveness)
 */
export function generateCover1Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Get receivers by side for assignment logic
  const leftReceivers = getReceiversByAlignment(formation.receiversLeft);
  const rightReceivers = getReceiversByAlignment(formation.receiversRight);

  // Determine coverage type based on formation (press vs soft)
  const coverageType = formation.isTrips ? 'soft' : 'soft'; // Default to soft, can add press logic later

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;
    if (!responsibility) return;

    switch (defender.playerType) {
      case 'S':
        if (defender.id === 'S1' || defender.id === 'FS') {
          // Free Safety - always deep middle
          positions[defender.id] = getCover1FreeSafety(formation, los);
        } else {
          // Strong Safety - cover #2 receiver on strength side or robber
          const strongSideReceivers = formation.strength === 'left' ? leftReceivers : rightReceivers;
          if (strongSideReceivers.number2) {
            positions[defender.id] = getCover1StrongSafety(strongSideReceivers.number2, los);
          } else {
            // No #2 receiver, play robber in middle
            positions[defender.id] = {
              x: 26.665,
              y: los + COVER_1_CONSTANTS.SS_DEPTH_VS_TE
            };
          }
        }
        break;

      case 'CB':
        const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
        if (assignedReceiver) {
          const boundaryDirection = assignedReceiver.position.x < 26.665 ? 'left' : 'right';
          const leverage = calculateLeverage(assignedReceiver, boundaryDirection);
          positions[defender.id] = getCover1Cornerback(assignedReceiver, leverage, los, formation, coverageType);
        }
        break;

      case 'LB':
        if (responsibility.type === 'zone' && responsibility.zone?.name === 'hole') {
          // Hole/rat defender - covers middle zone for crossing routes
          positions[defender.id] = getCover1Linebacker(offensivePlayers[0], los, 'hole');
        } else if (responsibility.target) {
          const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
          if (assignedReceiver) {
            positions[defender.id] = getCover1Linebacker(assignedReceiver, los, 'coverage');
          }
        } else {
          // Default hook coverage if no specific assignment
          positions[defender.id] = {
            x: 26.665,
            y: los + COVER_1_CONSTANTS.LB_DEPTH
          };
        }
        break;

      case 'NB': // Nickel back
        const assignedNickelReceiver = offensivePlayers.find(p => p.id === responsibility.target);
        if (assignedNickelReceiver) {
          // Nickel backs typically get inside leverage vs slot receivers
          const leverage = 'inside' as Leverage;
          positions[defender.id] = getCover1Cornerback(assignedNickelReceiver, leverage, los, formation, coverageType);
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 4 (Quarters) defensive alignment
 */
export function generateCover4Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Cover 4 - Four deep, three under
  const deepZoneWidth = 53.33 / 4; // Four deep quarters

  defensivePlayers.forEach((defender, idx) => {
    switch (defender.playerType) {
      case 'CB':
        // CBs take outside quarters
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los + 7 }; // Left outside quarter, 7 yards on defensive side
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los + 7 }; // Right outside quarter
        }
        break;

      case 'S':
        // Safeties take inside quarters
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 18, y: los + 12 }; // Left inside quarter, 12 yards on defensive side
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 35, y: los + 12 }; // Right inside quarter
        }
        break;

      case 'LB':
        // Three linebackers in underneath coverage
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 20, y: los + 4 }; // Left flat, 4 yards on defensive side
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los + 5 }; // Middle hook, 5 yards on defensive side
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 33, y: los + 4 }; // Right flat
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 2 defensive alignment (NFL-accurate with formation responsiveness)
 */
export function generateCover2Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Get safety positions based on formation
  const safetyPositions = getCover2Safeties(formation, los);

  // Get receivers by side for CB alignment
  const leftReceivers = getReceiversByAlignment(formation.receiversLeft);
  const rightReceivers = getReceiversByAlignment(formation.receiversRight);

  // Assign positions by defensive role
  let safetyCount = 0;
  let cbCount = 0;
  let lbCount = 0;

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;

    switch (defender.playerType) {
      case 'CB':
        // Find the #1 receiver this CB is covering
        const assignedReceiver = offensivePlayers.find(p => p.id === responsibility?.target);
        if (assignedReceiver) {
          // NFL Cover 2 uses press technique (press/jam then sink to flat)
          // Only use bail in specific situations (goal line, obvious pass down)
          const technique = 'press'; // Default to press for authentic Cover 2
          positions[defender.id] = getCover2Cornerback(assignedReceiver, los, formation, technique);
        } else {
          // Default positioning if no specific assignment
          if (cbCount === 0) {
            positions[defender.id] = getCover2Cornerback(
              leftReceivers.number1 || { position: { x: 8, y: los } } as Player,
              los,
              formation,
              'press'
            );
          } else {
            positions[defender.id] = getCover2Cornerback(
              rightReceivers.number1 || { position: { x: 45, y: los } } as Player,
              los,
              formation,
              'press'
            );
          }
        }
        cbCount++;
        break;

      case 'S':
        // Assign safeties to deep halves
        if (safetyCount === 0) {
          positions[defender.id] = safetyPositions.left;
        } else {
          positions[defender.id] = safetyPositions.right;
        }
        safetyCount++;
        break;

      case 'LB':
      case 'NB':
        // Linebackers and nickel backs play underneath zones
        if (lbCount === 0) {
          // First LB plays left hook/curl
          positions[defender.id] = getCover2HookDefender('left', formation, los);
        } else if (lbCount === 1) {
          // Second LB plays middle hook
          positions[defender.id] = getCover2HookDefender('middle', formation, los);
        } else if (lbCount === 2) {
          // Third LB plays right hook/curl
          positions[defender.id] = getCover2HookDefender('right', formation, los);
        } else {
          // Additional defenders play flat zones
          const flatDepth = COVER_2_CONSTANTS.FLAT_DEPTH;
          if (lbCount === 3) {
            positions[defender.id] = { x: 15, y: los + flatDepth }; // Left flat
          } else {
            positions[defender.id] = { x: 38, y: los + flatDepth }; // Right flat
          }
        }
        lbCount++;
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 3 defensive alignment (NFL-accurate with pattern matching)
 */
export function generateCover3Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  rotation: 'sky' | 'buzz' | 'normal' = 'normal'
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};
  const receivers = offensivePlayers.filter(p => p.isEligible);

  // Get receivers by side for CB alignment
  const leftReceivers = getReceiversByAlignment(formation.receiversLeft);
  const rightReceivers = getReceiversByAlignment(formation.receiversRight);

  // Assign positions by defensive role
  let cbCount = 0;
  let safetyCount = 0;
  let lbCount = 0;

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;

    switch (defender.playerType) {
      case 'CB':
        // CBs play deep outside thirds with pattern matching
        const side = cbCount === 0 ? 'left' : 'right';
        const targetReceiver = cbCount === 0 ? leftReceivers.number1 : rightReceivers.number1;

        if (targetReceiver) {
          // Get base position for pre-snap alignment
          const basePosition = getCover3Cornerback(targetReceiver, side, formation, los);

          // For pre-snap alignment, always use zone coverage
          // Pattern matching will be applied during post-snap movement
          positions[defender.id] = basePosition;
        } else {
          // Default positioning if no receiver
          const xPos = side === 'left' ? 8 : 45;
          positions[defender.id] = { x: xPos, y: los + COVER_3_CONSTANTS.CB_DEPTH_SOFT };
        }
        cbCount++;
        break;

      case 'S':
        if (safetyCount === 0 || defender.id === 'FS' || defender.id === 'S1') {
          // Free Safety - deep middle third
          // For pre-snap alignment, always use zone coverage
          // Pattern matching will be applied during post-snap movement
          positions[defender.id] = getCover3FreeSafety(formation, los);
        } else {
          // Strong Safety - curl/flat or rotation (typically stays in zone)
          positions[defender.id] = getCover3StrongSafety(formation, los, rotation);
        }
        safetyCount++;
        break;

      case 'LB':
      case 'NB':
        // Underneath defenders - typically stay in zone but can use collision technique
        if (lbCount === 0) {
          // First LB plays hook
          positions[defender.id] = getCover3HookDefender(formation, los);
        } else if (lbCount === 1) {
          // Second LB plays curl/flat weak side
          const weakSide = formation.strength === 'left' ? 'right' : 'left';
          const xPos = weakSide === 'left' ? 18 : 35;
          positions[defender.id] = {
            x: xPos,
            y: los + COVER_3_CONSTANTS.SS_CURL_FLAT_DEPTH
          };
        } else if (lbCount === 2) {
          // Third LB plays flat
          const xPos = formation.strength === 'left' ? 35 : 18;
          positions[defender.id] = {
            x: xPos,
            y: los + COVER_3_CONSTANTS.SS_CURL_FLAT_DEPTH
          };
        } else {
          // Additional defenders - robber or additional flat coverage
          positions[defender.id] = {
            x: 26.665 + (lbCount - 3) * 5, // Spread additional defenders
            y: los + 6
          };
        }
        lbCount++;
        break;
    }
  });

  return positions;
}

/**
 * Generate Tampa 2 defensive alignment
 */
export function generateTampa2Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  // Tampa 2 requires specific roles, handle missing LBs gracefully
  const linebackers = defensivePlayers.filter(d => d.playerType === 'LB');
  const hasEnoughLBs = linebackers.length >= 3;

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // CBs play deep outside thirds
        if (defender.id === 'CB1') {
          positions[defender.id] = { x: 8, y: los + 5 }; // Press-bail technique, 5 yards behind LOS
        } else if (defender.id === 'CB2') {
          positions[defender.id] = { x: 45, y: los + 5 };
        } else if (defender.id === 'CB3') {
          // Extra CB in dime package plays underneath
          positions[defender.id] = { x: 35, y: los + 4 };
        }
        break;

      case 'S':
        // Safeties play underneath robber roles
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 13, y: los + 12 }; // Left intermediate, 12 yards behind LOS
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 40, y: los + 12 }; // Right intermediate
        }
        break;

      case 'LB':
        // Mike LB drops to deep middle third, others play underneath
        if (hasEnoughLBs) {
          if (defender.id === 'LB2') {
            // Mike linebacker - will drop to deep middle
            positions[defender.id] = { x: 26.665, y: los + 5 };
          } else if (defender.id === 'LB1') {
            positions[defender.id] = { x: 18, y: los + 4 }; // Left curl, 4 yards behind LOS
          } else if (defender.id === 'LB3') {
            positions[defender.id] = { x: 35, y: los + 4 }; // Right curl
          }
        } else {
          // With only 1 LB (Dime package), that LB plays deep middle
          positions[defender.id] = { x: 26.665, y: los + 8 }; // Deep middle role
        }
        break;

      case 'NB':
        // Nickel/Dime backs play underneath zones
        if (defender.id === 'NB1') {
          positions[defender.id] = { x: 18, y: los + 4 }; // Left curl replacement
        } else if (defender.id === 'NB2') {
          positions[defender.id] = { x: 35, y: los + 4 }; // Right curl replacement
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 6 (Split-field) defensive alignment
 */
export function generateCover6Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};

  // Field side gets Cover 4, boundary side gets Cover 2
  const isFieldLeft = formation.strength === 'left';

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        if (defender.id === 'CB1') {
          // Boundary CB - plays Cover 2
          positions[defender.id] = { x: 8, y: los + 5 }; // 5 yards behind LOS
        } else if (defender.id === 'CB2') {
          // Field CB - plays quarters
          positions[defender.id] = { x: 45, y: los + 7 }; // 7 yards behind LOS
        }
        break;

      case 'S':
        if (defender.id === 'S1') {
          // Boundary safety - deep half
          positions[defender.id] = { x: 13, y: los + 12 }; // 12 yards behind LOS
        } else if (defender.id === 'S2') {
          // Field safety - deep quarter
          positions[defender.id] = { x: 35, y: los + 12 };
        }
        break;

      case 'LB':
        // Linebackers play underneath zones
        if (defender.id === 'LB1') {
          positions[defender.id] = { x: 18, y: los + 4 }; // 4 yards behind LOS
        } else if (defender.id === 'LB2') {
          positions[defender.id] = { x: 26.665, y: los + 5 }; // 5 yards behind LOS
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 35, y: los + 4 };
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 0 (All-out blitz) defensive alignment
 */
export function generateCover0Alignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};
  const receivers = [...formation.receiversLeft, ...formation.receiversRight];

  // Sort receivers by priority for man coverage
  const sortedReceivers = receivers.sort((a, b) => {
    const aDistFromCenter = Math.abs(a.position.x - 26.665);
    const bDistFromCenter = Math.abs(b.position.x - 26.665);
    return bDistFromCenter - aDistFromCenter; // Outside receivers first
  });

  let cbIdx = 0;
  const lbIdx = 0;

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;

    switch (defender.playerType) {
      case 'CB':
        // CBs press man coverage on outside receivers
        if (cbIdx < sortedReceivers.length) {
          const receiver = sortedReceivers[cbIdx++];
          positions[defender.id] = {
            x: receiver.position.x,
            y: los + 1 // Press coverage, 1 yard on defensive side of LOS
          };
        }
        break;

      case 'S':
        // Safeties blitz from depth
        if (defender.id === 'S1') {
          positions[defender.id] = { x: 20, y: los + 2 }; // A gap blitz, 2 yards on defensive side
        } else if (defender.id === 'S2') {
          positions[defender.id] = { x: 33, y: los + 2 }; // B gap blitz
        }
        break;

      case 'LB':
        if (responsibility?.type === 'blitz') {
          // Blitzing linebacker
          positions[defender.id] = { x: 26.665, y: los + 3 }; // A gap, 3 yards on defensive side
        } else {
          // Coverage linebacker on RB
          const rb = offensivePlayers.find(p => p.playerType === 'RB');
          if (rb) {
            positions[defender.id] = {
              x: rb.position.x,
              y: los + 5  // 5 yards on defensive side of LOS
            };
          } else {
            positions[defender.id] = { x: 23, y: los + 2 };
          }
        }
        break;
    }
  });

  return positions;
}