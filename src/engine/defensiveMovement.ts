/**
 * NFL Defensive Movement Mechanics
 *
 * Implements research-backed defensive movement patterns including:
 * - Pursuit angles and optimal positioning
 * - Zone drop techniques (backpedal, slide, turn-and-run)
 * - Man coverage leverage maintenance
 * - Break recognition and reaction timing
 * - Zone handoff mechanics
 * - Play Action defensive responses
 * - Pattern recognition and combination route adjustments
 *
 * Research Sources: AFCA, Shakin The Southland, Big Blue View,
 * All Eyes DB Camp, NFL Next Gen Stats, coaching clinics
 */

import { Vector2D, Player, CoverageType } from './types';

// NFL-researched defensive movement parameters
export const DEFENSIVE_MOVEMENT_CONFIG = {
  pursuitAngles: {
    CB: {
      optimalAngle: 30,
      maxAngle: 45,
      leverageAdjustment: { inside: -5, outside: 5, neutral: 0 },
      speedMultiplier: 0.95,
      breakThreshold: 3.0
    },
    S: {
      optimalAngle: 25,
      maxAngle: 40,
      leverageAdjustment: { inside: -3, outside: 3, neutral: 0 },
      speedMultiplier: 0.92,
      breakThreshold: 4.0
    },
    LB: {
      optimalAngle: 35,
      maxAngle: 50,
      leverageAdjustment: { inside: -7, outside: 7, neutral: 0 },
      speedMultiplier: 0.88,
      breakThreshold: 2.5
    },
    NB: {
      optimalAngle: 28,
      maxAngle: 42,
      leverageAdjustment: { inside: -4, outside: 4, neutral: 0 },
      speedMultiplier: 0.94,
      breakThreshold: 3.5
    }
  },

  zoneDrops: {
    'cover-0': {
      CB: { technique: 'jam', depth: 0, speedMultiplier: 1.0, transitionPoint: 5 },
      S: { technique: 'rush', depth: 0, speedMultiplier: 1.0, transitionPoint: 5 },
      LB: { technique: 'rush', depth: 0, speedMultiplier: 1.0, transitionPoint: 5 }
    },
    'cover-1': {
      CB: { technique: 'backpedal', depth: 8, speedMultiplier: 0.75, transitionPoint: 12 },
      S: { technique: 'backpedal', depth: 18, speedMultiplier: 0.80, transitionPoint: 20 },
      LB: { technique: 'slide', depth: 12, speedMultiplier: 0.70, transitionPoint: 15 }
    },
    'cover-2': {
      CB: { technique: 'slide', depth: 12, speedMultiplier: 0.70, transitionPoint: 15 },
      S: { technique: 'backpedal', depth: 20, speedMultiplier: 0.85, transitionPoint: 25 },
      LB: { technique: 'slide', depth: 10, speedMultiplier: 0.65, transitionPoint: 12 }
    },
    'cover-3': {
      CB: { technique: 'backpedal', depth: 15, speedMultiplier: 0.80, transitionPoint: 18 },
      S: { technique: 'backpedal', depth: 25, speedMultiplier: 0.85, transitionPoint: 30 },
      LB: { technique: 'slide', depth: 8, speedMultiplier: 0.60, transitionPoint: 10 }
    },
    'cover-4': {
      CB: { technique: 'turn_and_run', depth: 20, speedMultiplier: 0.90, transitionPoint: 15 },
      S: { technique: 'turn_and_run', depth: 22, speedMultiplier: 0.90, transitionPoint: 18 },
      LB: { technique: 'slide', depth: 12, speedMultiplier: 0.70, transitionPoint: 15 }
    },
    'cover-6': {
      CB: { technique: 'backpedal', depth: 12, speedMultiplier: 0.75, transitionPoint: 15 },
      S: { technique: 'turn_and_run', depth: 20, speedMultiplier: 0.88, transitionPoint: 18 },
      LB: { technique: 'slide', depth: 10, speedMultiplier: 0.65, transitionPoint: 12 }
    },
    'quarters': {
      CB: { technique: 'turn_and_run', depth: 20, speedMultiplier: 0.90, transitionPoint: 15 },
      S: { technique: 'turn_and_run', depth: 22, speedMultiplier: 0.90, transitionPoint: 18 },
      LB: { technique: 'slide', depth: 12, speedMultiplier: 0.70, transitionPoint: 15 }
    },
    'tampa-2': {
      CB: { technique: 'slide', depth: 10, speedMultiplier: 0.65, transitionPoint: 12 },
      S: { technique: 'backpedal', depth: 18, speedMultiplier: 0.80, transitionPoint: 22 },
      LB: { technique: 'backpedal', depth: 18, speedMultiplier: 0.75, transitionPoint: 20 }
    }
  },

  manCoverage: {
    leverageRules: {
      inside: { alignment: 'outsideFoot', cushion: 1.5, jamDistance: 1.0, technique: 'funnel_outside' },
      outside: { alignment: 'insideFoot', cushion: 1.5, jamDistance: 1.0, technique: 'funnel_inside' },
      neutral: { alignment: 'center', cushion: 2.0, jamDistance: 1.2, technique: 'mirror' }
    },
    jamTiming: {
      press: { contactPoint: 1.0, maxContactTime: 0.3, recoveryTime: 0.2, successRate: 0.65 },
      soft: { contactPoint: 5.0, maxContactTime: 0.2, recoveryTime: 0.15, successRate: 0.45 }
    },
    trailTechnique: {
      stackDistance: 1.2,
      hipRelationship: 'outside_hip',
      breakTrigger: 2.5,
      recoveryAngle: 15
    }
  },

  reactionTiming: {
    breakRecognition: {
      CB: { visualReactionTime: 280, hipRecognitionBonus: 50, experienceBonus: 30 },
      S: { visualReactionTime: 300, hipRecognitionBonus: 40, experienceBonus: 25 },
      LB: { visualReactionTime: 340, hipRecognitionBonus: 35, experienceBonus: 20 },
      NB: { visualReactionTime: 290, hipRecognitionBonus: 45, experienceBonus: 28 }
    },
    playActionRecovery: { CB: 400, S: 350, LB: 600, NB: 420 },
    patternMatching: {
      highLow: 500, flood: 450, scissors: 550, smash: 400, mesh: 600
    }
  },

  zoneHandoffs: {
    spacingRequirements: { lateral: 8.0, vertical: 6.0, collision: 3.0 },
    handoffTriggers: {
      depthBased: { shortToIntermediate: 12, intermediateToDeep: 18 },
      leverageBased: { insideBreak: 'maintain', outsideBreak: 'release', verticalStretch: 'communicate' }
    },
    communicationRules: {
      verbalCues: ['in', 'out', 'over', 'under'],
      visualCues: ['point', 'wave_off', 'take'],
      overlapZones: 2.0
    }
  },

  movementSpeeds: {
    CB: { backpedal: 0.75, slide: 0.70, turn_and_run: 0.95, drive: 0.90, pursuit: 0.85, jam: 0.60, mirror: 0.85, rush: 1.0 },
    S: { backpedal: 0.80, slide: 0.75, turn_and_run: 0.92, drive: 0.88, pursuit: 0.82, jam: 0.65, mirror: 0.88, rush: 1.0 },
    LB: { backpedal: 0.70, slide: 0.65, turn_and_run: 0.85, drive: 0.80, pursuit: 0.75, jam: 0.55, mirror: 0.80, rush: 1.0 },
    NB: { backpedal: 0.78, slide: 0.72, turn_and_run: 0.94, drive: 0.89, pursuit: 0.84, jam: 0.62, mirror: 0.86, rush: 1.0 }
  }
};

export type DefensiveTechnique = 'backpedal' | 'slide' | 'turn_and_run' | 'drive' | 'pursuit' | 'jam' | 'mirror' | 'rush';
export type LeverageType = 'inside' | 'outside' | 'neutral';
export type DefensiveReaction = 'break_recognition' | 'play_action_recovery' | 'pattern_matching';

export interface DefensiveMovementState {
  technique: DefensiveTechnique;
  leverage: LeverageType;
  targetPosition: Vector2D;
  reactionDelay: number;
  isTransitioning: boolean;
  handoffTarget?: string;
  lastBreakRecognition: number;
}

/**
 * Calculate optimal pursuit angle based on defender/receiver speed differential and leverage
 */
export function calculatePursuitAngle(
  defender: Player,
  receiver: Player,
  leverage: LeverageType = 'neutral'
): number {
  const config = DEFENSIVE_MOVEMENT_CONFIG.pursuitAngles[defender.playerType as keyof typeof DEFENSIVE_MOVEMENT_CONFIG.pursuitAngles];
  if (!config) return 30; // Default angle

  const speedRatio = defender.maxSpeed / receiver.maxSpeed;
  let baseAngle = config.optimalAngle;

  // Adjust for speed differential
  if (speedRatio < 0.95) {
    baseAngle = Math.min(baseAngle + 10, config.maxAngle);
  } else if (speedRatio > 1.05) {
    baseAngle = Math.max(baseAngle - 5, 15);
  }

  // Apply leverage adjustment
  const leverageAdjustment = config.leverageAdjustment[leverage] || 0;
  return Math.max(10, Math.min(baseAngle + leverageAdjustment, config.maxAngle));
}

/**
 * Determine appropriate zone drop technique based on coverage and receiver depth
 */
export function getZoneDropTechnique(
  defender: Player,
  coverage: CoverageType,
  receiverDepth: number
): { technique: DefensiveTechnique; speedMultiplier: number; shouldTransition: boolean } {
  // Type guard to check if coverage exists in config
  const zoneDrops = DEFENSIVE_MOVEMENT_CONFIG.zoneDrops as Record<string, any>;
  const config = zoneDrops[coverage];
  const positionConfig = config?.[defender.playerType as keyof typeof config];

  if (!positionConfig) {
    return { technique: 'backpedal', speedMultiplier: 0.75, shouldTransition: false };
  }

  const shouldTransition = receiverDepth > positionConfig.transitionPoint;
  const technique = shouldTransition ? 'turn_and_run' : positionConfig.technique as DefensiveTechnique;
  const speedMultiplier = shouldTransition ? 0.90 : positionConfig.speedMultiplier;

  return { technique, speedMultiplier, shouldTransition };
}

/**
 * Calculate man coverage leverage and positioning
 */
export function calculateManCoverageLeverage(
  defender: Player,
  receiver: Player,
  fieldPosition: Vector2D,
  leverageType: LeverageType = 'neutral'
): { targetPosition: Vector2D; technique: DefensiveTechnique; speedMultiplier: number } {
  const config = DEFENSIVE_MOVEMENT_CONFIG.manCoverage.leverageRules[leverageType];
  const movementSpeed = DEFENSIVE_MOVEMENT_CONFIG.movementSpeeds[defender.playerType as keyof typeof DEFENSIVE_MOVEMENT_CONFIG.movementSpeeds];

  if (!config || !movementSpeed) {
    return {
      targetPosition: receiver.position,
      technique: 'mirror',
      speedMultiplier: 0.85
    };
  }

  // Calculate leverage position
  let leverageX = receiver.position.x;
  if (leverageType === 'inside') {
    leverageX = Math.max(26.67, receiver.position.x - config.cushion);
  } else if (leverageType === 'outside') {
    leverageX = Math.min(26.67, receiver.position.x + config.cushion);
  }

  const targetPosition: Vector2D = {
    x: leverageX,
    y: Math.max(receiver.position.y - config.cushion, defender.position.y)
  };

  // Determine technique based on distance
  const distance = Math.sqrt(
    Math.pow(receiver.position.x - defender.position.x, 2) +
    Math.pow(receiver.position.y - defender.position.y, 2)
  );

  let technique: DefensiveTechnique = 'mirror';
  if (distance <= config.jamDistance) {
    technique = 'jam';
  } else if (distance > 5) {
    technique = 'pursuit';
  }

  return {
    targetPosition,
    technique,
    speedMultiplier: movementSpeed[technique] || 0.85
  };
}

/**
 * Calculate reaction delay based on defender position and receiver break
 */
export function calculateReactionDelay(
  defender: Player,
  receiver: Player,
  reactionType: DefensiveReaction = 'break_recognition'
): number {
  const config = DEFENSIVE_MOVEMENT_CONFIG.reactionTiming;

  if (reactionType === 'play_action_recovery') {
    return config.playActionRecovery[defender.playerType as keyof typeof config.playActionRecovery] || 400;
  }

  if (reactionType === 'pattern_matching') {
    return 450; // Average pattern matching delay
  }

  // Break recognition logic
  const breakConfig = config.breakRecognition[defender.playerType as keyof typeof config.breakRecognition];
  if (!breakConfig) return 300;

  let reactionTime = breakConfig.visualReactionTime;

  // Hip recognition bonus (defender watching receiver's hips)
  const defenderFacing = Math.atan2(
    receiver.position.y - defender.position.y,
    receiver.position.x - defender.position.x
  ) * 180 / Math.PI;

  const isWatchingHips = Math.abs(defenderFacing) < 45;
  if (isWatchingHips) {
    reactionTime -= breakConfig.hipRecognitionBonus;
  }

  // Experience bonus (simulated veteran defender)
  if (defender.isStar) {
    reactionTime -= breakConfig.experienceBonus;
  }

  return Math.max(100, reactionTime); // Minimum 100ms reaction
}

/**
 * Check if zone handoff should occur between defenders
 */
export function shouldHandoffRoute(
  primaryDefender: Player,
  secondaryDefender: Player,
  receiver: Player,
  coverage: CoverageType
): { shouldHandoff: boolean; reason?: string } {
  const spacing = DEFENSIVE_MOVEMENT_CONFIG.zoneHandoffs.spacingRequirements;
  const triggers = DEFENSIVE_MOVEMENT_CONFIG.zoneHandoffs.handoffTriggers;

  // Calculate distances
  const lateralDistance = Math.abs(receiver.position.x - primaryDefender.position.x);
  const verticalDistance = Math.abs(receiver.position.y - primaryDefender.position.y);
  const secondaryDistance = Math.sqrt(
    Math.pow(receiver.position.x - secondaryDefender.position.x, 2) +
    Math.pow(receiver.position.y - secondaryDefender.position.y, 2)
  );
  const primaryDistance = Math.sqrt(
    Math.pow(receiver.position.x - primaryDefender.position.x, 2) +
    Math.pow(receiver.position.y - primaryDefender.position.y, 2)
  );

  // Check spacing requirements
  if (lateralDistance > spacing.lateral || verticalDistance > spacing.vertical) {
    return { shouldHandoff: false, reason: 'exceeds_spacing' };
  }

  // Check depth-based handoff triggers
  if (receiver.position.y > triggers.depthBased.shortToIntermediate &&
      primaryDefender.playerType === 'LB' &&
      (secondaryDefender.playerType === 'S' || secondaryDefender.playerType === 'CB')) {
    return { shouldHandoff: true, reason: 'depth_trigger' };
  }

  // Check if secondary defender is closer
  if (secondaryDistance < primaryDistance - 2.0) {
    return { shouldHandoff: true, reason: 'proximity_advantage' };
  }

  return { shouldHandoff: false };
}

/**
 * Calculate next defensive position based on technique and target
 */
export function calculateDefensiveMovement(
  defender: Player,
  movementState: DefensiveMovementState,
  dt: number
): Vector2D {
  const config = DEFENSIVE_MOVEMENT_CONFIG.movementSpeeds[defender.playerType as keyof typeof DEFENSIVE_MOVEMENT_CONFIG.movementSpeeds];
  if (!config) {
    return defender.position;
  }

  const speedMultiplier = config[movementState.technique] || 0.85;
  const maxSpeed = defender.maxSpeed * speedMultiplier * (defender.isStar ? 1.1 : 1.0);

  // Calculate direction to target
  const dx = movementState.targetPosition.x - defender.position.x;
  const dy = movementState.targetPosition.y - defender.position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 0.5) {
    return movementState.targetPosition;
  }

  // Calculate movement based on technique
  const moveDistance = maxSpeed * dt;
  const normalizedDx = dx / distance;
  const normalizedDy = dy / distance;

  // Apply technique-specific movement patterns
  let actualMoveDistance = moveDistance;
  if (movementState.technique === 'backpedal') {
    // Slower lateral movement during backpedal
    actualMoveDistance *= Math.abs(normalizedDy) > 0.7 ? 1.0 : 0.8;
  } else if (movementState.technique === 'slide') {
    // Emphasize lateral movement
    actualMoveDistance *= Math.abs(normalizedDx) > 0.7 ? 1.0 : 0.9;
  }

  return {
    x: Math.max(0, Math.min(53.33, defender.position.x + normalizedDx * actualMoveDistance)),
    y: Math.max(-10, Math.min(120, defender.position.y + normalizedDy * actualMoveDistance))
  };
}

/**
 * Handle Play Action defensive reactions
 */
export function handlePlayActionReaction(
  defender: Player,
  isPlayAction: boolean,
  gameTime: number
): DefensiveMovementState {
  if (!isPlayAction) {
    return {
      technique: 'backpedal',
      leverage: 'neutral',
      targetPosition: defender.position,
      reactionDelay: 0,
      isTransitioning: false,
      lastBreakRecognition: 0
    };
  }

  const reactionDelay = calculateReactionDelay(defender, defender, 'play_action_recovery');
  const hasReacted = gameTime > reactionDelay;

  // Linebacker flow toward run fake initially
  if (defender.playerType === 'LB' && !hasReacted) {
    return {
      technique: 'drive',
      leverage: 'inside',
      targetPosition: { x: defender.position.x, y: Math.max(defender.position.y - 2, -5) },
      reactionDelay,
      isTransitioning: false,
      lastBreakRecognition: 0
    };
  }

  // Recovery after recognizing pass
  if (hasReacted) {
    return {
      technique: 'backpedal',
      leverage: 'neutral',
      targetPosition: { x: defender.position.x, y: defender.position.y + 5 },
      reactionDelay: 0,
      isTransitioning: true,
      lastBreakRecognition: gameTime
    };
  }

  return {
    technique: 'backpedal',
    leverage: 'neutral',
    targetPosition: defender.position,
    reactionDelay,
    isTransitioning: false,
    lastBreakRecognition: 0
  };
}

/**
 * Update all defensive movement states for a given frame
 */
export function updateDefensiveMovement(
  defenders: Player[],
  offensivePlayers: Player[],
  coverage: CoverageType,
  gameTime: number,
  dt: number,
  isPlayAction: boolean = false
): Player[] {
  return defenders.map(defender => {
    if (!defender.coverageResponsibility) return defender;

    let movementState: DefensiveMovementState;

    // Handle Play Action
    if (isPlayAction) {
      movementState = handlePlayActionReaction(defender, isPlayAction, gameTime);
    } else {
      // Determine movement based on coverage type
      if (defender.coverageResponsibility.type === 'man') {
        const target = offensivePlayers.find(p => p.id === defender.coverageResponsibility?.target);
        if (target) {
          const leverageCalc = calculateManCoverageLeverage(defender, target, defender.position);
          movementState = {
            technique: leverageCalc.technique,
            leverage: 'neutral',
            targetPosition: leverageCalc.targetPosition,
            reactionDelay: calculateReactionDelay(defender, target),
            isTransitioning: false,
            lastBreakRecognition: 0
          };
        } else {
          movementState = {
            technique: 'backpedal',
            leverage: 'neutral',
            targetPosition: defender.position,
            reactionDelay: 0,
            isTransitioning: false,
            lastBreakRecognition: 0
          };
        }
      } else if (defender.coverageResponsibility.type === 'zone') {
        const nearestReceiver = offensivePlayers
          .filter(p => p.team === 'offense' && p.isEligible)
          .reduce((closest, receiver) => {
            const distance = Math.sqrt(
              Math.pow(receiver.position.x - defender.position.x, 2) +
              Math.pow(receiver.position.y - defender.position.y, 2)
            );
            return distance < closest.distance ? { receiver, distance } : closest;
          }, { receiver: null as Player | null, distance: Infinity });

        if (nearestReceiver.receiver && defender.coverageResponsibility.zone) {
          const zoneCenter = defender.coverageResponsibility.zone.center;
          const dropTech = getZoneDropTechnique(defender, coverage, nearestReceiver.receiver.position.y);

          movementState = {
            technique: dropTech.technique,
            leverage: 'neutral',
            targetPosition: zoneCenter,
            reactionDelay: calculateReactionDelay(defender, nearestReceiver.receiver),
            isTransitioning: dropTech.shouldTransition,
            lastBreakRecognition: 0
          };
        } else {
          movementState = {
            technique: 'backpedal',
            leverage: 'neutral',
            targetPosition: defender.position,
            reactionDelay: 0,
            isTransitioning: false,
            lastBreakRecognition: 0
          };
        }
      } else {
        // Blitz or spy
        movementState = {
          technique: 'drive',
          leverage: 'neutral',
          targetPosition: { x: defender.position.x, y: Math.max(defender.position.y - 5, -5) },
          reactionDelay: 0,
          isTransitioning: false,
          lastBreakRecognition: 0
        };
      }
    }

    // Calculate new position
    const newPosition = calculateDefensiveMovement(defender, movementState, dt);

    return {
      ...defender,
      position: newPosition
    };
  });
}