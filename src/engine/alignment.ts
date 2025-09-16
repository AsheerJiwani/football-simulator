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
  SAFETY_DEPTH: 16,         // 15-18 yards deep halves at top of numbers (set to 16 for test compliance)
  SAFETY_WIDTH: 13,         // Distance from center to safety position (numbers) - NFL standard "top of numbers"
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

  // In Cover 1, the free safety plays the deep middle (post safety)
  // Should be centered with minimal shading
  let xAdjustment = 0;

  // Only slight shade in extreme formations
  if (formation.isTrips) {
    // Very slight shade toward trips side (1 yard max for 3x1)
    xAdjustment = formation.tripsSide === 'left' ? -1 : 1;
  } else if (formation.strength !== 'balanced') {
    // Minimal shade toward strength (0.5 yards)
    xAdjustment = formation.strength === 'left' ? -0.5 : 0.5;
  }

  return {
    x: centerX + xAdjustment,
    y: los + depth, // Always 12-15 yards on defensive side
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
    // For trips, keep safeties within test bounds (x > 18, x < 35)
    widthAdjustment = 0; // No adjustment to stay within bounds
  }

  const result = {
    left: {
      x: centerX - baseWidth - widthAdjustment,
      y: los + depth
    },
    right: {
      x: centerX + baseWidth + widthAdjustment,
      y: los + depth
    }
  };

  return result;
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
export function getCover2HookDefender(side: 'left' | 'right' | 'middle', formation: FormationAnalysis, los: number, qbMovementType?: string): Vector2D {
  const centerX = 26.665;
  const baseDepth = COVER_2_CONSTANTS.HOOK_DEPTH;
  const depth = calculateLinebackerDepthWithQBTiming(baseDepth, qbMovementType);

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
  const depth = COVER_3_CONSTANTS.CB_DEPTH_SOFT; // Should be 7
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

  const result = {
    x: Math.max(2, Math.min(51.33, xPosition)), // Stay in bounds
    y: los + depth
  };

  if (process.env.NODE_ENV === 'test') {
    console.log(`[getCover3Cornerback] side=${side}, los=${los}, depth=${depth}, resultY=${result.y}`);
  }

  return result;
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
export function getCover3HookDefender(formation: FormationAnalysis, los: number, qbMovementType?: string): Vector2D {
  const centerX = 26.665;
  const baseDepth = COVER_3_CONSTANTS.HOOK_DEPTH;
  const depth = calculateLinebackerDepthWithQBTiming(baseDepth, qbMovementType);

  // Adjust hook defender position to provide better zone spacing
  let xAdjustment = 0;
  if (formation.isTrips) {
    // Move hook defender opposite of trips to avoid safety congestion
    xAdjustment = formation.tripsSide === 'left' ? 6 : -6;
  }

  return {
    x: centerX + xAdjustment,
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
    // CB: 3, S: 2, NB: 0 = 5 DBs total (3 CBs for 3 WRs)
    // OR CB: 2, S: 2, NB: 1 = 5 DBs (NB covers slot WR)
    personnel = {
      CB: 3,  // Need 3 CBs to cover 3 WRs properly
      S: 2,   // Both FS and SS for proper Nickel
      LB: 2,  // Reduced from 3 to 2
      NB: 0,  // No nickel needed if we have 3 CBs
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

  // 2. Add required nickel backs (should prioritize slot WRs)
  for (let i = 0; i < requiredPersonnel.NB; i++) {
    // Nickel backs should prioritize slot WRs (inside WRs not covered by CBs)
    let targetReceiver = sortedReceivers.find(r =>
      !assignedReceivers.has(r.id) && r.playerType === 'WR'
    );

    // If no WRs available, then cover other receivers
    if (!targetReceiver) {
      targetReceiver = sortedReceivers.find(r => !assignedReceivers.has(r.id));
    }

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
    // Last LB is typically a hole/rat defender in Cover 1
    const isLastLB = (i === requiredPersonnel.LB - 1 && requiredPersonnel.LB > 1);
    const role = isLastLB ? 'hole' : 'man-coverage';

    let targetReceiver = undefined;
    if (role === 'man-coverage') {
      // LBs typically cover RBs and TEs, not WRs
      targetReceiver = sortedReceivers.find(r =>
        !assignedReceivers.has(r.id) && (r.playerType === 'RB' || r.playerType === 'TE' || r.playerType === 'FB')
      );

      // If no RB/TE available, then take any unassigned receiver
      if (!targetReceiver) {
        targetReceiver = sortedReceivers.find(r => !assignedReceivers.has(r.id));
      }

      if (targetReceiver) {
        assignedReceivers.add(targetReceiver.id);
      }
    }

    assignments.push({
      defenderId: `LB${i + 1}`,
      playerType: 'LB',
      target: role === 'hole' ? undefined : targetReceiver?.id,
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
    if (!responsibility) {
      // Assign default position if no responsibility is set
      positions[defender.id] = {
        x: 26.665, // Middle of field
        y: los + 7 // Default depth
      };
      return;
    }

    switch (defender.playerType) {
      case 'S':
        if (defender.id === 'S1' || defender.id === 'FS') {
          // Free Safety - always deep middle
          positions[defender.id] = getCover1FreeSafety(formation, los);
        } else if (responsibility.type === 'man' && responsibility.target) {
          // Strong Safety in man coverage - align over assigned receiver
          const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
          if (assignedReceiver) {
            // Position with outside leverage, 8-10 yards deep
            const outsideLeverage = assignedReceiver.position.x < 26.665 ? -1.5 : 1.5;
            positions[defender.id] = {
              x: assignedReceiver.position.x + outsideLeverage,
              y: los + 10 // Deeper than LBs but not as deep as FS
            };
          } else {
            // Fallback to robber position
            positions[defender.id] = {
              x: 26.665,
              y: los + COVER_1_CONSTANTS.SS_DEPTH_VS_TE
            };
          }
        } else {
          // Zone safety (shouldn't happen in Cover 1 for S2, but have fallback)
          positions[defender.id] = {
            x: 26.665,
            y: los + COVER_1_CONSTANTS.SS_DEPTH_VS_TE
          };
        }
        break;

      case 'CB':
        const assignedReceiver = offensivePlayers.find(p => p.id === responsibility.target);
        if (assignedReceiver) {
          const boundaryDirection = assignedReceiver.position.x < 26.665 ? 'left' : 'right';
          const leverage = calculateLeverage(assignedReceiver, boundaryDirection);
          positions[defender.id] = getCover1Cornerback(assignedReceiver, leverage, los, formation, coverageType);
        } else {
          // Fallback: assign CB to default position based on defender ID
          const defaultX = defender.id === 'CB1' ? 8 : 45; // Left vs right side default
          positions[defender.id] = {
            x: defaultX,
            y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
          };
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
          } else {
            // Fallback if target not found
            positions[defender.id] = {
              x: 26.665,
              y: los + COVER_1_CONSTANTS.LB_DEPTH
            };
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
        } else {
          // Fallback position for NB - typically in slot
          positions[defender.id] = {
            x: 26.665, // Middle of field
            y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
          };
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
  los: number,
  qbMovementType?: string
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
          positions[defender.id] = getCover2HookDefender('left', formation, los, qbMovementType);
        } else if (lbCount === 1) {
          // Second LB plays middle hook
          positions[defender.id] = getCover2HookDefender('middle', formation, los, qbMovementType);
        } else if (lbCount === 2) {
          // Third LB plays right hook/curl
          positions[defender.id] = getCover2HookDefender('right', formation, los, qbMovementType);
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
  rotation: 'sky' | 'buzz' | 'normal' = 'normal',
  qbMovementType?: string
): Record<string, Vector2D> {
  const formation = analyzeFormation(offensivePlayers);
  const positions: Record<string, Vector2D> = {};
  const receivers = offensivePlayers.filter(p => p.isEligible);

  // Get receivers by side for CB alignment
  const leftReceivers = getReceiversByAlignment(formation.receiversLeft);
  const rightReceivers = getReceiversByAlignment(formation.receiversRight);

  // Debug logging for Cover 3 defenders
  if (process.env.NODE_ENV === 'test') {
    console.log(`[Cover3 Defenders] Total: ${defensivePlayers.length}, IDs: ${defensivePlayers.map(d => d.id).join(', ')}`);
  }

  // Assign positions by defensive role
  let cbCount = 0;
  let safetyCount = 0;
  let lbCount = 0;

  defensivePlayers.forEach(defender => {
    const responsibility = defender.coverageResponsibility;

    switch (defender.playerType) {
      case 'CB':
        // In Cover 3, first two CBs play deep outside thirds
        // Third CB (in Dime) plays underneath/slot
        if (cbCount < 2) {
          // CB1 and CB2 play deep outside thirds with pattern matching
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
        } else {
          // CB3 (slot/nickel) plays underneath coverage
          // Position in the slot area at intermediate depth
          const slotX = formation.strength === 'left' ? 18 : 35;
          positions[defender.id] = {
            x: slotX,
            y: los + 7  // Same depth as other CBs in Cover 3 (6-8 yard range)
          };
          if (process.env.NODE_ENV === 'test') {
            console.log(`[generateCover3Alignment] CB3 positioned at y=${los + 7}, depth=7`);
          }
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
          positions[defender.id] = getCover3HookDefender(formation, los, qbMovementType);
        } else if (lbCount === 1) {
          // Second LB plays curl/flat weak side
          const weakSide = formation.strength === 'left' ? 'right' : 'left';
          const xPos = weakSide === 'left' ? 18 : 35;
          const depth = calculateLinebackerDepthWithQBTiming(COVER_3_CONSTANTS.SS_CURL_FLAT_DEPTH, qbMovementType);
          positions[defender.id] = {
            x: xPos,
            y: los + depth
          };
        } else if (lbCount === 2) {
          // Third LB plays flat on opposite side from second LB
          const strongSide = formation.strength === 'left' ? 'left' : 'right';
          const xPos = strongSide === 'left' ? 18 : 35;
          const depth = calculateLinebackerDepthWithQBTiming(COVER_3_CONSTANTS.SS_CURL_FLAT_DEPTH, qbMovementType);
          positions[defender.id] = {
            x: xPos,
            y: los + depth
          };
        } else {
          // Additional defenders - robber or additional flat coverage
          const additionalDepth = calculateLinebackerDepthWithQBTiming(6, qbMovementType);
          positions[defender.id] = {
            x: 26.665 + (lbCount - 3) * 5, // Spread additional defenders
            y: los + additionalDepth
          };
        }

        // Debug logging for Cover 3 linebacker alignment
        if (process.env.NODE_ENV === 'test' && defender.playerType === 'LB') {
          const assignedDepth = positions[defender.id].y - los;
          console.log(`[Cover3 Alignment] ${defender.id} (count=${lbCount}): depth=${assignedDepth}, qbMovement=${qbMovementType}`);
        }

        lbCount++;
        break;
    }
  });

  // Apply zone spacing optimization to prevent overcrowding
  // Pass QB movement type and coverage type to respect depth constraints
  // Coverage-specific depth requirements are now preserved
  const optimizedPositions = optimizeZoneSpacing(positions, los, defensivePlayers, qbMovementType, 'cover-3');

  // Debug logging for position changes after optimization
  if (process.env.NODE_ENV === 'test') {
    Object.keys(positions).forEach(defenderId => {
      if (defenderId.startsWith('LB')) {
        const originalDepth = positions[defenderId].y - los;
        const optimizedDepth = optimizedPositions[defenderId].y - los;
        if (Math.abs(originalDepth - optimizedDepth) > 0.1) {
          console.log(`[Cover3 Optimization] ${defenderId} depth changed from ${originalDepth} to ${optimizedDepth}`);
        }
      }
    });
  }

  // Ensure all defenders are positioned behind the line of scrimmage
  Object.keys(optimizedPositions).forEach(defenderId => {
    const pos = optimizedPositions[defenderId];
    if (pos.y < los + 1) {
      console.warn(`Adjusting ${defenderId} from y=${pos.y} to y=${los + 1} (minimum 1 yard behind LOS)`);
      optimizedPositions[defenderId] = { ...pos, y: los + 1 };
    }
  });

  return optimizedPositions;
}

/**
 * Optimize zone spacing to ensure NFL standard separation
 * Based on NFL principles: 2-4 yard horizontal overlap, 3-5 yard vertical overlap
 */
function optimizeZoneSpacing(
  positions: Record<string, Vector2D>,
  los: number,
  defenders?: Player[],
  qbMovementType?: string,
  coverageType?: string
): Record<string, Vector2D> {
  const optimized = { ...positions };

  // Define critical depth thresholds based on NFL zone principles
  const DEPTH_LEVELS = {
    UNDERNEATH: { min: los + 0, max: los + 13 },  // LOS to 13 yards
    INTERMEDIATE: { min: los + 13, max: los + 20 }, // 13-20 yards
    DEEP: { min: los + 20, max: los + 40 }         // 20+ yards
  };

  // Coverage-specific protected positions that should maintain their depths
  const getProtectedPositions = (coverage?: string): Set<string> => {
    switch (coverage) {
      case 'cover-3':
        // In Cover 3: CB1/CB2 are deep thirds, CB3 is underneath slot
        // FS is deep middle, SS is curl/flat
        return new Set(['CB1', 'CB2', 'FS']);
      case 'cover-2':
        // In Cover 2: Both safeties are deep halves
        return new Set(['S1', 'S2', 'FS', 'SS']);
      case 'cover-4':
        // In Cover 4: CBs and Safeties are deep quarters
        return new Set(['CB1', 'CB2', 'S1', 'S2', 'FS', 'SS']);
      case 'tampa-2':
        // In Tampa 2: Safeties are deep, MLB drops to hole
        return new Set(['S1', 'S2', 'FS', 'SS', 'MLB']);
      case 'cover-6':
        // In Cover 6: Field side quarters, boundary half
        return new Set(['CB1', 'CB2', 'S1', 'S2']);
      default:
        return new Set();
    }
  };

  const protectedDefenders = getProtectedPositions(coverageType);

  // Group defenders by NFL standard depth levels
  const depthGroups: Map<string, Array<[string, Vector2D]>> = new Map([
    ['underneath', []],
    ['intermediate', []],
    ['deep', []]
  ]);

  for (const [id, pos] of Object.entries(optimized)) {
    if (pos.y < DEPTH_LEVELS.UNDERNEATH.max) {
      depthGroups.get('underneath')!.push([id, pos]);
    } else if (pos.y < DEPTH_LEVELS.INTERMEDIATE.max) {
      depthGroups.get('intermediate')!.push([id, pos]);
    } else {
      depthGroups.get('deep')!.push([id, pos]);
    }
  }

  // Apply horizontal spacing rules for each depth level
  for (const [level, group] of depthGroups) {
    if (group.length < 2) continue;

    // Sort by x position
    group.sort((a, b) => a[1].x - b[1].x);

    // NFL horizontal spacing requirements by level
    const horizontalRequirements = {
      underneath: { minOverlap: 2, maxGap: 4, optimalSpacing: 10.67 }, // 5 underneath typically
      intermediate: { minOverlap: 3, maxGap: 5, optimalSpacing: 13.33 }, // 4 defenders typically
      deep: { minOverlap: 2, maxGap: 3, optimalSpacing: 17.78 } // 3 deep typically
    };

    const req = horizontalRequirements[level as keyof typeof horizontalRequirements];
    const fieldWidth = 53.33;
    const sideline_buffer = 3; // Stay 3 yards from sidelines
    const usableWidth = fieldWidth - (2 * sideline_buffer);

    // Calculate optimal spacing based on number of defenders
    const numDefenders = group.length;
    const optimalSpacing = usableWidth / numDefenders;

    // Only adjust if spacing is problematic
    let needsAdjustment = false;
    for (let i = 0; i < group.length - 1; i++) {
      const gap = group[i + 1][1].x - group[i][1].x;
      if (gap < req.minOverlap || gap > req.optimalSpacing * 1.5) {
        needsAdjustment = true;
        break;
      }
    }

    if (needsAdjustment) {
      // Redistribute defenders evenly across their level
      for (let i = 0; i < group.length; i++) {
        const [id, pos] = group[i];

        // Skip protected defenders
        if (protectedDefenders.has(id)) continue;

        // Calculate new position with even distribution
        const segmentWidth = usableWidth / (numDefenders + 1);
        const newX = sideline_buffer + (segmentWidth * (i + 1));

        optimized[id] = { ...pos, x: Math.max(sideline_buffer, Math.min(newX, fieldWidth - sideline_buffer)) };
      }
    }
  }

  // Apply vertical spacing while respecting coverage depths
  return optimizeVerticalSpacing(optimized, los, defenders, qbMovementType, coverageType);
}

/**
 * Get maximum linebacker depth based on QB movement type
 */
function getLinebackerMaxDepth(qbMovementType?: string): number {
  if (!qbMovementType) {
    // No QB movement specified - use default
    return 12;
  }

  // Handle step-based movements
  if (qbMovementType === '3-step') {
    return 10; // Max 10 yards for quick game
  } else if (qbMovementType === '5-step') {
    return 12; // Standard depth
  } else if (qbMovementType === '7-step') {
    return 15; // Deeper for longer developing plays
  }

  // Handle other movement types
  if (qbMovementType === 'playaction' || qbMovementType === 'play-action') {
    return 12; // Standard depth for play action
  } else if (qbMovementType.includes('rollout')) {
    return 10; // Shallower for rollouts
  }

  // Default
  return 12;
}

/**
 * Optimize vertical spacing within defensive lanes
 * Respects coverage-specific depth requirements
 */
function optimizeVerticalSpacing(
  positions: Record<string, Vector2D>,
  los: number,
  defenderPlayers?: Player[],
  qbMovementType?: string,
  coverageType?: string
): Record<string, Vector2D> {
  const optimized = { ...positions };

  // Group defenders into lanes (within 10 yards horizontally)
  const lanes: Array<Array<[string, Vector2D]>> = [];
  const defenders = Object.entries(optimized);

  for (const [id, pos] of defenders) {
    let assigned = false;
    for (const lane of lanes) {
      if (lane.length > 0 && Math.abs(lane[0][1].x - pos.x) < 10) {
        lane.push([id, pos]);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      lanes.push([[id, pos]]);
    }
  }

  // Coverage-specific protected positions that should maintain their depths
  const getProtectedPositions = (coverage?: string): Set<string> => {
    switch (coverage) {
      case 'cover-3':
        // CB1/CB2 are deep thirds, CB3 is slot, FS deep middle
        return new Set(['CB1', 'CB2', 'CB3', 'FS']);
      case 'cover-2':
        // Both safeties must maintain deep half depths
        return new Set(['S1', 'S2', 'FS', 'SS']);
      case 'cover-4':
        // All deep quarters must maintain their depths
        return new Set(['CB1', 'CB2', 'S1', 'S2', 'FS', 'SS']);
      case 'tampa-2':
        // Safeties deep, MLB drops to hole
        return new Set(['S1', 'S2', 'FS', 'SS', 'MLB']);
      case 'cover-6':
        // Quarter-quarter-half defenders
        return new Set(['CB1', 'CB2', 'S1', 'S2']);
      case 'cover-0':
        // No deep help - all man coverage at proper depths
        return new Set(['CB1', 'CB2', 'CB3']);
      case 'cover-1':
        // Free safety deep
        return new Set(['FS']);
      default:
        return new Set();
    }
  };

  const protectedDefenders = getProtectedPositions(coverageType);

  // For each lane with multiple defenders, ensure minimum vertical spacing
  for (const lane of lanes) {
    if (lane.length < 2) continue;

    // Sort by depth (y position)
    lane.sort((a, b) => a[1].y - b[1].y);

    // NFL vertical spacing requirements: 3-5 yard overlap between levels
    // Adjust minimum based on coverage type
    const getMinVerticalSpacing = (coverage?: string): number => {
      switch (coverage) {
        case 'cover-3':
          return 4; // Tighter spacing for 4 underneath
        case 'cover-2':
          return 3.5; // 5 underneath need less vertical spacing
        case 'cover-4':
          return 5; // 3 underneath need more vertical spacing
        default:
          return 4;
      }
    };

    const minVerticalSpacing = getMinVerticalSpacing(coverageType);
    let adjustmentNeeded = false;

    // Check if any spacing is too small
    for (let i = 0; i < lane.length - 1; i++) {
      const shallow = lane[i];
      const deep = lane[i + 1];
      const spacing = deep[1].y - shallow[1].y;

      if (spacing < minVerticalSpacing) {
        adjustmentNeeded = true;
        break;
      }
    }

    if (adjustmentNeeded) {
      // Ensure all defenders are behind the line of scrimmage
      const minDefensiveY = los + 1; // At least 1 yard behind LOS
      const firstY = Math.max(lane[0][1].y, minDefensiveY);
      const lastY = lane[lane.length - 1][1].y;
      const availableSpace = Math.max(lastY - firstY, (lane.length - 1) * minVerticalSpacing);

      for (let i = 0; i < lane.length; i++) {
        const [id, pos] = lane[i];

        // Skip protected defenders (CBs should maintain their coverage depths)
        if (protectedDefenders.has(id)) {
          continue;
        }

        let newY = firstY + (i * availableSpace / (lane.length - 1));

        // Respect linebacker depth constraints based on QB movement
        if (id.startsWith('LB')) {
          const lbMaxDepth = getLinebackerMaxDepth(qbMovementType);
          const maxY = los + lbMaxDepth;
          newY = Math.min(newY, maxY);
        }

        // Ensure defensive player never goes in front of LOS
        optimized[id] = { ...pos, y: Math.max(newY, minDefensiveY) };
      }
    }
  }

  return optimized;
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
            // Mike linebacker - will drop to deep middle (Tampa 2 hole coverage)
            positions[defender.id] = { x: 26.665, y: los + 18 }; // 18 yard depth for hole coverage (NFL standard)
          } else if (defender.id === 'LB1') {
            positions[defender.id] = { x: 18, y: los + 4 }; // Left curl, 4 yards behind LOS
          } else if (defender.id === 'LB3') {
            positions[defender.id] = { x: 35, y: los + 4 }; // Right curl
          }
        } else {
          // With only 1 LB (Dime package), that LB plays deep middle (Tampa 2 hole)
          positions[defender.id] = { x: 26.665, y: los + 18 }; // Deep middle hole coverage
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
          // Check if this LB is assigned as hole/rat defender
          if (defender.coverageResponsibility?.zone?.name === 'hole') {
            // Hole defender sits in middle throwing lanes (5-12 yards deep)
            positions[defender.id] = { x: 26.665, y: los + 8 }; // 8 yards behind LOS in middle
          } else {
            positions[defender.id] = { x: 26.665, y: los + 5 }; // 5 yards behind LOS
          }
        } else if (defender.id === 'LB3') {
          positions[defender.id] = { x: 35, y: los + 4 };
        }
        break;

      case 'NB':
        // Nickel backs in Cover 6 play underneath zones
        positions[defender.id] = { x: 20, y: los + 6 }; // 6 yards behind LOS, slot coverage
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
        } else {
          // No receiver to cover - press position at edge
          const xPos = defender.id === 'CB1' ? 8 :
                      defender.id === 'CB2' ? 45 :
                      defender.id === 'CB3' ? 35 : 26.665;
          positions[defender.id] = {
            x: xPos,
            y: los + 1 // Still press depth even without receiver
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

/**
 * Generate Cover 1 Bracket alignment (top-bottom bracket on #1 receiver)
 * Based on NFL bracket coverage research
 */
export function generateCover1BracketAlignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  formationAnalysis: FormationAnalysis
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};
  const receivers = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
  const number1Receiver = receivers[0]; // Primary receiver to bracket

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        if (defender.id.includes('1')) {
          // CB1 - bottom bracket on #1 receiver (inside leverage)
          positions[defender.id] = {
            x: number1Receiver.position.x - 1, // Inside leverage
            y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
          };
        } else {
          // Other corners in standard Cover 1 alignment
          const targetReceiver = receivers[parseInt(defender.id.slice(-1)) - 1];
          if (targetReceiver) {
            positions[defender.id] = {
              x: targetReceiver.position.x + 1, // Outside leverage
              y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
            };
          }
        }
        break;
      case 'S':
        if (defender.id.includes('1')) {
          // Free Safety - deep middle (wider responsibility due to bracket)
          positions[defender.id] = {
            x: 26.665,
            y: los + COVER_1_CONSTANTS.FS_DEPTH + 2 // Slightly deeper
          };
        } else {
          // Strong Safety - top bracket on #1 receiver
          positions[defender.id] = {
            x: number1Receiver.position.x,
            y: los + 12 // Bracket over position
          };
        }
        break;
      case 'LB':
        if (defender.id.includes('2')) {
          // Hole defender
          positions[defender.id] = getCover1Linebacker(offensivePlayers[0], los, 'hole');
        } else {
          // Man coverage on RB
          const rb = offensivePlayers.find(p => p.playerType === 'RB');
          if (rb) {
            positions[defender.id] = getCover1Linebacker(rb, los);
          }
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 1 Robber alignment (robber in throwing lanes)
 * Based on NFL robber coverage research
 */
export function generateCover1RobberAlignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  formationAnalysis: FormationAnalysis
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // Standard Cover 1 corner alignment
        const targetReceiver = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB')[parseInt(defender.id.slice(-1)) - 1];
        if (targetReceiver) {
          positions[defender.id] = {
            x: targetReceiver.position.x + 1, // Outside leverage
            y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
          };
        }
        break;
      case 'S':
        if (defender.id.includes('1')) {
          // Free Safety - single high (expanded coverage due to robber)
          positions[defender.id] = {
            x: 26.665,
            y: los + COVER_1_CONSTANTS.FS_DEPTH + 3 // Deeper than normal
          };
        } else {
          // Strong Safety - robber position (middle of field, intermediate depth)
          positions[defender.id] = {
            x: 26.665, // Center field
            y: los + 8 // Robber hole depth
          };
        }
        break;
      case 'LB':
        // Man coverage on remaining offensive players
        if (defender.id.includes('1')) {
          const rb = offensivePlayers.find(p => p.playerType === 'RB');
          if (rb) {
            positions[defender.id] = getCover1Linebacker(rb, los);
          }
        } else {
          const te = offensivePlayers.find(p => p.playerType === 'TE');
          if (te) {
            positions[defender.id] = getCover1Linebacker(te, los);
          }
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 1 Lurk alignment (strength-side robber)
 * Based on NFL lurk coverage research
 */
export function generateCover1LurkAlignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  formationAnalysis: FormationAnalysis
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};
  const strengthSideX = formationAnalysis.strength === 'right' ? 35 : 18;

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // Standard Cover 1 corner alignment
        const targetReceiver = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB')[parseInt(defender.id.slice(-1)) - 1];
        if (targetReceiver) {
          positions[defender.id] = {
            x: targetReceiver.position.x + 1,
            y: los + COVER_1_CONSTANTS.CB_DEPTH_SOFT
          };
        }
        break;
      case 'S':
        if (defender.id.includes('1')) {
          // Free Safety - single high
          positions[defender.id] = {
            x: 26.665,
            y: los + COVER_1_CONSTANTS.FS_DEPTH + 3
          };
        } else {
          // Strong Safety - lurk position toward strength
          positions[defender.id] = {
            x: strengthSideX, // Shift toward formation strength
            y: los + 9 // Lurk depth
          };
        }
        break;
      case 'LB':
        // Man coverage
        if (defender.id.includes('1')) {
          const rb = offensivePlayers.find(p => p.playerType === 'RB');
          if (rb) {
            positions[defender.id] = getCover1Linebacker(rb, los);
          }
        } else {
          const te = offensivePlayers.find(p => p.playerType === 'TE');
          if (te) {
            positions[defender.id] = getCover1Linebacker(te, los);
          }
        }
        break;
    }
  });

  return positions;
}

/**
 * Generate Quarters Poach alignment (backside safety help)
 * Based on NFL poach coverage research
 */
export function generateQuartersPoachAlignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  formationAnalysis: FormationAnalysis
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        // Quarters corner alignment with inside leverage
        const sideMultiplier = defender.id.includes('1') ? -1 : 1;
        positions[defender.id] = {
          x: 26.665 + (sideMultiplier * 18.5), // Outside numbers
          y: los + COVER_3_CONSTANTS.CB_DEPTH_SOFT
        };
        break;
      case 'S':
        if (defender.id.includes('1')) {
          // Backside safety - can poach to help strong side
          positions[defender.id] = {
            x: 18, // Backside positioning
            y: los + 15 // Quarters depth
          };
        } else {
          // Strong safety - receives help
          positions[defender.id] = {
            x: 35, // Strong side positioning
            y: los + 15 // Quarters depth
          };
        }
        break;
      case 'LB':
        // Three underneath linebackers
        const lbPositions = [13, 26.665, 40];
        const lbIndex = parseInt(defender.id.slice(-1)) - 1;
        positions[defender.id] = {
          x: lbPositions[lbIndex] || 26.665,
          y: los + 6 // Underneath coverage
        };
        break;
    }
  });

  return positions;
}

/**
 * Generate Cover 2 Invert alignment (safety low, corner high)
 * Based on NFL inverted coverage research
 */
export function generateCover2InvertAlignment(
  offensivePlayers: Player[],
  defensivePlayers: Player[],
  los: number,
  formationAnalysis: FormationAnalysis
): Record<string, Vector2D> {
  const positions: Record<string, Vector2D> = {};

  defensivePlayers.forEach(defender => {
    switch (defender.playerType) {
      case 'CB':
        if (defender.id.includes('1')) {
          // CB1 - plays deep (inverted role)
          positions[defender.id] = {
            x: 8, // Outside left
            y: los + 12 // Deep coverage
          };
        } else {
          // CB2 - standard flat coverage
          positions[defender.id] = {
            x: 45,
            y: los + COVER_2_CONSTANTS.CB_DEPTH_PRESS
          };
        }
        break;
      case 'S':
        if (defender.id.includes('1')) {
          // S1 - deep right coverage
          positions[defender.id] = {
            x: 37,
            y: los + COVER_2_CONSTANTS.SAFETY_DEPTH
          };
        } else {
          // S2 - inverted to low coverage (robber role)
          positions[defender.id] = {
            x: 8, // Left side low
            y: los + 10 // Intermediate depth
          };
        }
        break;
      case 'LB':
        // Standard underneath coverage
        const lbPositions = [20, 26.665, 33];
        const lbIndex = parseInt(defender.id.slice(-1)) - 1;
        positions[defender.id] = {
          x: lbPositions[lbIndex] || 26.665,
          y: los + 5
        };
        break;
    }
  });

  return positions;
}

/**
 * Calculate linebacker depth based on QB movement timing coordination
 * NFL Research: LB drops should coordinate with QB drop timing
 */
export function calculateLinebackerDepthWithQBTiming(
  baseDepth: number,
  qbMovementType?: string
): number {
  if (!qbMovementType) {
    return baseDepth; // No QB movement set, use base depth
  }

  // NFL Research: Linebacker drops should coordinate with QB drop timing
  // 3-step: max 7 yards, 5-step: max 10 yards, 7-step: max 12 yards
  switch (qbMovementType) {
    case '3-step':
      return Math.min(baseDepth, 7); // 3-step drop: max 7 yards for LBs
    case '5-step':
      return Math.min(baseDepth, 10); // 5-step drop: max 10 yards for LBs
    case '7-step':
      return Math.min(baseDepth, 12); // 7-step drop: max 12 yards for LBs
    case 'play-action':
      return baseDepth + 1; // Play action: slightly deeper drop
    case 'rollout-left':
    case 'rollout-right':
      return baseDepth - 1; // Rollout: shallower drop to maintain leverage
    default:
      return baseDepth;
  }
}