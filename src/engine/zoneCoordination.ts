import type { Player, Vector2D } from './types';
import { Vector } from '@/lib/math';
import {
  FormationAnalysis,
  ZONE_COORDINATION_CONSTANTS,
  COVER_2_CONSTANTS,
  COVER_3_CONSTANTS,
  ZoneLandmark,
  ZoneOverlap
} from './alignment';

/**
 * Zone Coordination System for NFL-realistic defensive coverage
 *
 * Implements modern NFL zone coordination rules including:
 * - "Deeper than deepest" principle
 * - Zone overlap responsibilities
 * - Landmark-based positioning
 * - Formation-specific adjustments
 */

/**
 * Calculate zone landmarks based on field position and coverage type
 */
export function calculateZoneLandmarks(los: number, coverageType: string): ZoneLandmark[] {
  const landmarks: ZoneLandmark[] = [];
  const fieldCenter = 26.665;

  // Add hash mark landmarks
  landmarks.push({
    name: 'left-hash',
    position: { x: fieldCenter - ZONE_COORDINATION_CONSTANTS.LANDMARK_HASH_POSITION, y: los },
    zoneType: 'intermediate'
  });

  landmarks.push({
    name: 'right-hash',
    position: { x: fieldCenter + ZONE_COORDINATION_CONSTANTS.LANDMARK_HASH_POSITION, y: los },
    zoneType: 'intermediate'
  });

  // Add numbers landmarks for deep zones
  landmarks.push({
    name: 'left-numbers',
    position: { x: fieldCenter - ZONE_COORDINATION_CONSTANTS.LANDMARK_NUMBERS_POSITION, y: los + 12 },
    zoneType: 'deep'
  });

  landmarks.push({
    name: 'right-numbers',
    position: { x: fieldCenter + ZONE_COORDINATION_CONSTANTS.LANDMARK_NUMBERS_POSITION, y: los + 12 },
    zoneType: 'deep'
  });

  // Coverage-specific landmarks
  if (coverageType === 'Cover 3') {
    // Deep thirds based on field geometry
    landmarks.push({
      name: 'left-third',
      position: { x: COVER_3_CONSTANTS.DEEP_THIRD_WIDTH / 2, y: los + 15 },
      zoneType: 'deep'
    });

    landmarks.push({
      name: 'middle-third',
      position: { x: fieldCenter, y: los + 15 },
      zoneType: 'deep'
    });

    landmarks.push({
      name: 'right-third',
      position: { x: 53.33 - (COVER_3_CONSTANTS.DEEP_THIRD_WIDTH / 2), y: los + 15 },
      zoneType: 'deep'
    });
  }

  return landmarks;
}

/**
 * Apply "deeper than deepest" principle to zone defenders
 */
export function applyDeeperThanDeepestRule(
  defenders: Player[],
  receivers: Player[],
  los: number
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};

  // Group defenders by zone responsibility - only apply to true deep zone defenders
  const deepDefenders = defenders.filter(d =>
    d.coverageResponsibility?.zone?.name?.includes('deep')
  );

  deepDefenders.forEach(defender => {
    if (!defender.position) return;

    // Find receivers in or threatening this defender's zone
    const threateningReceivers = receivers.filter(receiver => {
      if (!receiver.position || !defender.coverageResponsibility?.zone) return false;

      // Determine if receiver is in this defender's zone responsibility
      const zoneName = defender.coverageResponsibility.zone?.name;
      const isInZone = isReceiverInZone(receiver, zoneName || '', los);

      return isInZone;
    });

    if (threateningReceivers.length > 0) {
      // Find the deepest receiver in the zone
      const deepestReceiver = threateningReceivers.reduce((deepest, current) =>
        current.position.y > deepest.position.y ? current : deepest
      );

      // Position defender deeper than deepest receiver
      const requiredDepth = deepestReceiver.position.y + ZONE_COORDINATION_CONSTANTS.DEEPER_THAN_DEEPEST_CUSHION;

      adjustedPositions[defender.id] = {
        x: defender.position.x,
        y: Math.max(defender.position.y, requiredDepth)
      };
    }
  });

  return adjustedPositions;
}

/**
 * Calculate zone overlaps between adjacent defenders
 */
export function calculateZoneOverlaps(
  defenders: Player[],
  los: number
): ZoneOverlap[] {
  const overlaps: ZoneOverlap[] = [];
  const zoneDefenders = defenders.filter(d => d.coverageResponsibility?.type === 'zone');

  // Sort defenders by x position for adjacency calculation
  const sortedDefenders = [...zoneDefenders].sort((a, b) => a.position.x - b.position.x);

  for (let i = 0; i < sortedDefenders.length - 1; i++) {
    const leftDefender = sortedDefenders[i];
    const rightDefender = sortedDefenders[i + 1];

    // Calculate distance between defenders
    const distance = Vector.distance(leftDefender.position, rightDefender.position);

    // If defenders are within communication range, create overlap
    if (distance <= ZONE_COORDINATION_CONSTANTS.COMMUNICATION_RANGE) {
      const handoffPoint = {
        x: (leftDefender.position.x + rightDefender.position.x) / 2,
        y: (leftDefender.position.y + rightDefender.position.y) / 2
      };

      overlaps.push({
        defenderId: leftDefender.id,
        adjacentDefenderId: rightDefender.id,
        overlapDistance: ZONE_COORDINATION_CONSTANTS.ZONE_OVERLAP_WIDTH,
        handoffPoint
      });
    }
  }

  return overlaps;
}

/**
 * Adjust zone widths based on receiver distribution
 */
export function adjustZoneWidthsForReceiverDistribution(
  defenders: Player[],
  receivers: Player[],
  formation: FormationAnalysis
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};
  const fieldCenter = 26.665;

  // Calculate receiver spread
  const receiverXPositions = receivers.map(r => r.position.x);
  const minX = Math.min(...receiverXPositions);
  const maxX = Math.max(...receiverXPositions);
  const receiverSpread = maxX - minX;

  // Determine if formation is bunch or spread
  const isBunchFormation = receiverSpread < 15; // Less than 15 yards spread
  const isSpreadFormation = receiverSpread > 30; // More than 30 yards spread

  defenders.forEach(defender => {
    if (!defender.position || defender.coverageResponsibility?.type !== 'zone') return;

    const zone = defender.coverageResponsibility.zone;
    let adjustment = 0;

    if (isBunchFormation && zone?.name?.includes('underneath')) {
      // Contract zones for bunch formations
      const contractionAmount = (fieldCenter - defender.position.x) * ZONE_COORDINATION_CONSTANTS.ZONE_CONTRACTION_RATIO;
      adjustment = contractionAmount;
    } else if (isSpreadFormation && zone?.name?.includes('deep')) {
      // Expand zones for spread formations
      const expansionAmount = (defender.position.x - fieldCenter) * ZONE_COORDINATION_CONSTANTS.ZONE_EXPANSION_RATIO;
      adjustment = Math.sign(defender.position.x - fieldCenter) * expansionAmount;
    }

    // Apply boundary constraints
    const newX = Math.max(3, Math.min(50.33, defender.position.x + adjustment));

    adjustedPositions[defender.id] = {
      x: newX,
      y: defender.position.y
    };
  });

  return adjustedPositions;
}

/**
 * Coordinate zones for specific coverage types
 */
export function coordinateZonesByCoverage(
  defenders: Player[],
  receivers: Player[],
  coverage: string,
  formation: FormationAnalysis,
  los: number
): Record<string, Vector2D> {
  const coordinatedPositions: Record<string, Vector2D> = {};

  // Apply coverage-specific coordination rules
  switch (coverage) {
    case 'Cover 2':
      return coordinateCover2Zones(defenders, receivers, los);

    case 'Cover 3':
      return coordinateCover3Zones(defenders, receivers, formation, los);

    case 'Cover 4':
      return coordinateCover4Zones(defenders, receivers, los);

    case 'Tampa 2':
      return coordinateTampa2Zones(defenders, receivers, los);

    default:
      return coordinatedPositions;
  }
}

/**
 * Cover 2 specific zone coordination
 */
function coordinateCover2Zones(
  defenders: Player[],
  receivers: Player[],
  los: number
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};
  const fieldCenter = 26.665;

  // Deep halves coordination
  const safeties = defenders.filter(d => d.playerType === 'S');

  safeties.forEach(safety => {
    if (!safety.position) return;

    // Ensure safeties maintain proper width and depth coordination
    const isLeftSafety = safety.position.x < fieldCenter;
    const targetX = isLeftSafety ?
      fieldCenter - COVER_2_CONSTANTS.SAFETY_WIDTH :
      fieldCenter + COVER_2_CONSTANTS.SAFETY_WIDTH;

    // Apply deeper than deepest to deep halves
    const receiversInHalf = receivers.filter(r =>
      isLeftSafety ? r.position.x < fieldCenter : r.position.x >= fieldCenter
    );

    let targetY = los + COVER_2_CONSTANTS.SAFETY_DEPTH;

    if (receiversInHalf.length > 0) {
      const deepestInHalf = receiversInHalf.reduce((deepest, current) =>
        current.position.y > deepest.position.y ? current : deepest
      );

      targetY = Math.max(targetY, deepestInHalf.position.y + ZONE_COORDINATION_CONSTANTS.DEEPER_THAN_DEEPEST_CUSHION);
    }

    adjustedPositions[safety.id] = { x: targetX, y: targetY };
  });

  return adjustedPositions;
}

/**
 * Cover 3 specific zone coordination
 */
function coordinateCover3Zones(
  defenders: Player[],
  receivers: Player[],
  formation: FormationAnalysis,
  los: number
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};
  const fieldCenter = 26.665;

  // Deep thirds coordination
  const deepDefenders = defenders.filter(d =>
    d.coverageResponsibility?.zone?.name?.includes('deep-third')
  );

  deepDefenders.forEach(defender => {
    if (!defender.position) return;

    const zone = defender.coverageResponsibility?.zone;
    const zoneName = zone?.name;
    let targetX = defender.position.x;

    // Position based on third responsibility
    if (zoneName === 'deep-third-left') {
      targetX = COVER_3_CONSTANTS.DEEP_THIRD_WIDTH / 2;
    } else if (zoneName === 'deep-third-middle') {
      targetX = fieldCenter;
    } else if (zoneName === 'deep-third-right') {
      targetX = 53.33 - (COVER_3_CONSTANTS.DEEP_THIRD_WIDTH / 2);
    }

    // Apply landmark-based positioning with hash marks
    const landmarks = calculateZoneLandmarks(los, 'Cover 3');
    const relevantLandmark = landmarks.find(l =>
      l.name.includes(zoneName?.split('-')[2] || 'middle')
    );

    if (relevantLandmark) {
      targetX = relevantLandmark.position.x;
    }

    // Apply deeper than deepest in this third
    const receiversInThird = getReceiversInThird(receivers, zoneName || '', fieldCenter);
    let targetY = los + COVER_3_CONSTANTS.FS_DEPTH;

    if (receiversInThird.length > 0) {
      const deepestInThird = receiversInThird.reduce((deepest, current) =>
        current.position.y > deepest.position.y ? current : deepest
      );

      targetY = Math.max(targetY, deepestInThird.position.y + ZONE_COORDINATION_CONSTANTS.DEEPER_THAN_DEEPEST_CUSHION);
    }

    adjustedPositions[defender.id] = { x: targetX, y: targetY };
  });

  return adjustedPositions;
}

/**
 * Cover 4 specific zone coordination
 */
function coordinateCover4Zones(
  defenders: Player[],
  receivers: Player[],
  los: number
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};
  const fieldCenter = 26.665;
  const quarterWidth = 53.33 / 4;

  // Four deep quarters coordination
  const deepDefenders = defenders.filter(d =>
    d.coverageResponsibility?.zone?.name?.includes('quarter')
  );

  deepDefenders.forEach((defender, index) => {
    if (!defender.position) return;

    // Position in quarter coverage
    const quarterIndex = index % 4;
    const targetX = quarterWidth * (quarterIndex + 0.5);

    // Apply deeper than deepest in this quarter
    const quarterBoundaries = {
      left: quarterWidth * quarterIndex,
      right: quarterWidth * (quarterIndex + 1)
    };

    const receiversInQuarter = receivers.filter(r =>
      r.position.x >= quarterBoundaries.left && r.position.x < quarterBoundaries.right
    );

    let targetY = los + 12; // Standard quarters depth

    if (receiversInQuarter.length > 0) {
      const deepestInQuarter = receiversInQuarter.reduce((deepest, current) =>
        current.position.y > deepest.position.y ? current : deepest
      );

      targetY = Math.max(targetY, deepestInQuarter.position.y + ZONE_COORDINATION_CONSTANTS.DEEPER_THAN_DEEPEST_CUSHION);
    }

    adjustedPositions[defender.id] = { x: targetX, y: targetY };
  });

  return adjustedPositions;
}

/**
 * Tampa 2 specific zone coordination
 */
function coordinateTampa2Zones(
  defenders: Player[],
  receivers: Player[],
  los: number
): Record<string, Vector2D> {
  const adjustedPositions: Record<string, Vector2D> = {};
  const fieldCenter = 26.665;

  // Middle linebacker deep drop coordination
  const mlb = defenders.find(d => d.playerType === 'LB' && d.coverageResponsibility?.zone?.name === 'deep-middle');
  const safeties = defenders.filter(d => d.playerType === 'S');

  if (mlb) {
    // MLB drops deep to cover middle seams
    const middleReceivers = receivers.filter(r =>
      Math.abs(r.position.x - fieldCenter) <= 8 // 8 yards from center
    );

    let targetY = los + 15; // Deep drop for MLB

    if (middleReceivers.length > 0) {
      const deepestMiddle = middleReceivers.reduce((deepest, current) =>
        current.position.y > deepest.position.y ? current : deepest
      );

      targetY = Math.max(targetY, deepestMiddle.position.y + ZONE_COORDINATION_CONSTANTS.DEEPER_THAN_DEEPEST_CUSHION);
    }

    adjustedPositions[mlb.id] = { x: fieldCenter, y: targetY };
  }

  // Safeties take wider halves due to MLB help
  safeties.forEach(safety => {
    if (!safety.position) return;

    const isLeftSafety = safety.position.x < fieldCenter;
    const targetX = isLeftSafety ?
      fieldCenter - (COVER_2_CONSTANTS.SAFETY_WIDTH + 2) : // Wider due to MLB help
      fieldCenter + (COVER_2_CONSTANTS.SAFETY_WIDTH + 2);

    adjustedPositions[safety.id] = {
      x: targetX,
      y: los + COVER_2_CONSTANTS.SAFETY_DEPTH
    };
  });

  return adjustedPositions;
}

/**
 * Helper function to determine if a receiver is in a specific zone
 */
function isReceiverInZone(receiver: Player, zone: string, los: number): boolean {
  const fieldCenter = 26.665;
  const { x, y } = receiver.position;

  switch (zone) {
    case 'deep-third-left':
      return x < COVER_3_CONSTANTS.DEEP_THIRD_WIDTH && y > los + 8;

    case 'deep-third-middle':
      return x >= COVER_3_CONSTANTS.DEEP_THIRD_WIDTH &&
             x <= 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH &&
             y > los + 8;

    case 'deep-third-right':
      return x > 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH && y > los + 8;

    case 'deep-half-left':
      return x < fieldCenter && y > los + 12;

    case 'deep-half-right':
      return x >= fieldCenter && y > los + 12;

    case 'deep-middle':
      return Math.abs(x - fieldCenter) <= 10 && y > los + 12;

    default:
      return false;
  }
}

/**
 * Helper function to get receivers in a specific third
 */
function getReceiversInThird(receivers: Player[], zone: string, fieldCenter: number): Player[] {
  return receivers.filter(receiver => {
    const { x } = receiver.position;

    switch (zone) {
      case 'deep-third-left':
        return x < COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

      case 'deep-third-middle':
        return x >= COVER_3_CONSTANTS.DEEP_THIRD_WIDTH &&
               x <= 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

      case 'deep-third-right':
        return x > 53.33 - COVER_3_CONSTANTS.DEEP_THIRD_WIDTH;

      default:
        return false;
    }
  });
}