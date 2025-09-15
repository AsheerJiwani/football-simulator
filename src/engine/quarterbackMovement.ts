import type { Player, Vector2D, HashPosition } from './types';

/**
 * NFL Quarterback Movement Mechanics
 *
 * Implements authentic quarterback dropback, Play Action, and rollout mechanics
 * based on NFL coaching research and timing data.
 *
 * Research sources: vIQtory Sports, Football Tutorials, Throw Deep Publishing,
 * FantasyPros, Mile High Report
 */

export interface QBMovementConfig {
  type: 'dropback' | 'playaction' | 'rollout';
  steps: number;
  timing: number; // seconds to complete movement
  depth: number; // yards behind LOS
  pattern: Vector2D[]; // movement waypoints
  accuracyModifier: number; // 0.8-1.0 based on movement type
  fakeHandoffDuration?: number; // for Play Action only
  lateral?: number; // lateral movement for rollouts
}

export interface PlayActionConcept {
  name: string;
  qbMovement: QBMovementConfig;
  defensiveResponseTrigger: number; // ms when PA response begins
  timingWindow: number; // optimal throw window in seconds
}

export class QuarterbackMovement {
  // Speed modifiers during movement
  private static readonly MOVEMENT_SPEEDS = {
    dropback: 0.85, // 85% of max speed during drop
    playaction: 0.80, // Slower during PA fake
    rollout: 0.90, // Near full speed on rollout
    scramble: 0.95 // Full mobility when escaping
  };

  // Accuracy modifiers based on movement state
  private static readonly ACCURACY_MODIFIERS = {
    stationary: 1.00, // Perfect accuracy when set
    dropback_incomplete: 0.95, // 5% penalty mid-drop
    rollout_right: 0.88, // 12% penalty rolling right
    rollout_left: 0.85, // 15% penalty rolling left (for right-handed QB)
    scrambling: 0.75, // 25% penalty when scrambling
    backfoot: 0.82 // 18% penalty throwing off back foot
  };

  /**
   * Get dropback configuration based on step count
   */
  public static getDropbackConfig(steps: 3 | 5 | 7, startPosition: Vector2D): QBMovementConfig {
    const configs: Record<number, Omit<QBMovementConfig, 'pattern'>> = {
      3: {
        type: 'dropback',
        steps: 3,
        timing: 1.2,
        depth: 5,
        accuracyModifier: 1.0
      },
      5: {
        type: 'dropback',
        steps: 5,
        timing: 1.8,
        depth: 7,
        accuracyModifier: 1.0
      },
      7: {
        type: 'dropback',
        steps: 7,
        timing: 2.4,
        depth: 9,
        accuracyModifier: 1.0
      }
    };

    const baseConfig = configs[steps];

    // Generate movement pattern
    const pattern = this.generateDropbackPattern(steps, startPosition, baseConfig.depth);

    return {
      ...baseConfig,
      pattern
    };
  }

  /**
   * Generate movement pattern for dropback
   */
  private static generateDropbackPattern(steps: number, startPos: Vector2D, totalDepth: number): Vector2D[] {
    const pattern: Vector2D[] = [];

    if (steps === 3) {
      pattern.push(
        { x: startPos.x, y: startPos.y - 2.5 }, // Big first step
        { x: startPos.x, y: startPos.y - 4.0 }, // Balance step
        { x: startPos.x, y: startPos.y - 5.0 }  // Set position
      );
    } else if (steps === 5) {
      pattern.push(
        { x: startPos.x, y: startPos.y - 2.0 }, // Explosive first step
        { x: startPos.x, y: startPos.y - 3.5 }, // Big step
        { x: startPos.x, y: startPos.y - 5.0 }, // Big step
        { x: startPos.x, y: startPos.y - 6.2 }, // Gather step
        { x: startPos.x, y: startPos.y - 7.0 }  // Set position
      );
    } else { // 7 steps
      pattern.push(
        { x: startPos.x, y: startPos.y - 1.8 }, // Long steps 1-4
        { x: startPos.x, y: startPos.y - 3.2 },
        { x: startPos.x, y: startPos.y - 4.8 },
        { x: startPos.x, y: startPos.y - 6.2 },
        { x: startPos.x, y: startPos.y - 7.5 }, // Balance step
        { x: startPos.x, y: startPos.y - 8.2 }, // Choppy steps
        { x: startPos.x, y: startPos.y - 9.0 }  // Set position
      );
    }

    return pattern;
  }

  /**
   * Get Play Action Boot Right concept configuration
   */
  public static getPlayActionBootConfig(startPosition: Vector2D): PlayActionConcept {
    const pattern: Vector2D[] = [
      { x: startPosition.x, y: startPosition.y - 1.0 }, // Step to RB (fake)
      { x: startPosition.x + 1.5, y: startPosition.y - 1.0 }, // Mesh point
      { x: startPosition.x + 3.0, y: startPosition.y - 2.0 }, // Boot right
      { x: startPosition.x + 5.0, y: startPosition.y - 4.0 }, // Continue boot
      { x: startPosition.x + 6.0, y: startPosition.y - 6.0 }  // Set to throw
    ];

    return {
      name: "PA Boot Right",
      qbMovement: {
        type: 'playaction',
        steps: 5,
        timing: 2.2, // Includes fake time
        depth: 6,
        pattern,
        accuracyModifier: 0.92, // 8% penalty for movement
        fakeHandoffDuration: 0.6, // Time selling fake
        lateral: 6 // Lateral movement distance
      },
      defensiveResponseTrigger: 600, // Matches existing LB timing
      timingWindow: 2.8 // Optimal throw window
    };
  }

  /**
   * Get Play Action Boot Left concept configuration
   */
  public static getPlayActionBootLeftConfig(startPosition: Vector2D): PlayActionConcept {
    const pattern: Vector2D[] = [
      { x: startPosition.x, y: startPosition.y - 1.0 }, // Step to RB (fake)
      { x: startPosition.x - 1.5, y: startPosition.y - 1.0 }, // Mesh point
      { x: startPosition.x - 3.0, y: startPosition.y - 2.0 }, // Boot left
      { x: startPosition.x - 5.0, y: startPosition.y - 4.0 }, // Continue boot
      { x: startPosition.x - 6.0, y: startPosition.y - 6.0 }  // Set to throw
    ];

    return {
      name: "PA Boot Left",
      qbMovement: {
        type: 'playaction',
        steps: 5,
        timing: 2.2, // Includes fake time
        depth: 6,
        pattern,
        accuracyModifier: 0.90, // 10% penalty for movement (left side worse)
        fakeHandoffDuration: 0.6, // Time selling fake
        lateral: -6 // Lateral movement distance (negative for left)
      },
      defensiveResponseTrigger: 600, // Matches existing LB timing
      timingWindow: 2.8 // Optimal throw window
    };
  }

  /**
   * Get Play Action Pocket Drop concept configuration
   */
  public static getPlayActionPocketConfig(startPosition: Vector2D): PlayActionConcept {
    const pattern: Vector2D[] = [
      { x: startPosition.x, y: startPosition.y - 1.0 }, // Step to RB (fake)
      { x: startPosition.x + 0.5, y: startPosition.y - 1.0 }, // Mesh point
      { x: startPosition.x, y: startPosition.y - 2.0 }, // Reset to pocket
      { x: startPosition.x, y: startPosition.y - 5.0 }, // Drop to pocket
      { x: startPosition.x, y: startPosition.y - 7.0 }  // Set to throw
    ];

    return {
      name: "PA Pocket Drop",
      qbMovement: {
        type: 'playaction',
        steps: 5,
        timing: 2.0, // Slightly faster than bootleg
        depth: 7,
        pattern,
        accuracyModifier: 0.95, // Better accuracy staying in pocket
        fakeHandoffDuration: 0.6, // Time selling fake
        lateral: 0 // No lateral movement
      },
      defensiveResponseTrigger: 600, // Matches existing LB timing
      timingWindow: 3.2 // Longer window in pocket
    };
  }

  /**
   * Get Play Action Deep Cross concept configuration
   */
  public static getPlayActionDeepCrossConfig(startPosition: Vector2D): PlayActionConcept {
    const pattern: Vector2D[] = [
      { x: startPosition.x, y: startPosition.y - 1.0 }, // Step to RB (fake)
      { x: startPosition.x + 1.0, y: startPosition.y - 1.0 }, // Mesh point
      { x: startPosition.x + 1.5, y: startPosition.y - 3.0 }, // Slide right
      { x: startPosition.x + 2.0, y: startPosition.y - 6.0 }, // Deep drop
      { x: startPosition.x + 3.0, y: startPosition.y - 8.0 }  // Set for deep throw
    ];

    return {
      name: "PA Deep Cross",
      qbMovement: {
        type: 'playaction',
        steps: 5,
        timing: 2.4, // Longer setup for deep routes
        depth: 8,
        pattern,
        accuracyModifier: 0.93, // 7% penalty for slight movement
        fakeHandoffDuration: 0.6, // Time selling fake
        lateral: 3 // Slight lateral movement
      },
      defensiveResponseTrigger: 600, // Matches existing LB timing
      timingWindow: 3.5 // Extended window for deep developing routes
    };
  }

  /**
   * Get Play Action Naked Boot concept configuration
   */
  public static getPlayActionNakedBootConfig(startPosition: Vector2D): PlayActionConcept {
    const pattern: Vector2D[] = [
      { x: startPosition.x, y: startPosition.y - 1.0 }, // Step to RB (fake)
      { x: startPosition.x + 2.0, y: startPosition.y - 1.0 }, // Quick mesh
      { x: startPosition.x + 4.0, y: startPosition.y - 1.5 }, // Naked boot right
      { x: startPosition.x + 7.0, y: startPosition.y - 2.0 }, // Continue boot
      { x: startPosition.x + 9.0, y: startPosition.y - 2.5 }  // Wide set
    ];

    return {
      name: "PA Naked Boot",
      qbMovement: {
        type: 'playaction',
        steps: 5,
        timing: 1.9, // Faster to get outside pocket
        depth: 2.5,
        pattern,
        accuracyModifier: 0.89, // 11% penalty for aggressive movement
        fakeHandoffDuration: 0.4, // Shorter fake for quicker action
        lateral: 9 // Maximum lateral movement
      },
      defensiveResponseTrigger: 400, // Faster trigger due to shorter fake
      timingWindow: 2.5 // Shorter window due to pressure
    };
  }

  /**
   * Get rollout configuration
   */
  public static getRolloutConfig(startPosition: Vector2D, direction: 'left' | 'right'): QBMovementConfig {
    const multiplier = direction === 'right' ? 1 : -1;
    const pattern: Vector2D[] = [
      { x: startPosition.x + (2.0 * multiplier), y: startPosition.y - 1.5 },
      { x: startPosition.x + (4.5 * multiplier), y: startPosition.y - 2.5 },
      { x: startPosition.x + (7.0 * multiplier), y: startPosition.y - 3.5 },
      { x: startPosition.x + (8.0 * multiplier), y: startPosition.y - 4.0 }
    ];

    return {
      type: 'rollout',
      steps: 4,
      timing: 1.8,
      depth: 4,
      lateral: 8,
      pattern,
      accuracyModifier: direction === 'right' ?
        this.ACCURACY_MODIFIERS.rollout_right :
        this.ACCURACY_MODIFIERS.rollout_left
    };
  }

  /**
   * Update quarterback position during movement
   */
  public static updateQuarterbackMovement(
    qb: Player,
    config: QBMovementConfig,
    timeElapsed: number,
    deltaTime: number
  ): void {
    if (!config.pattern || !config.pattern.length) {
      console.warn('QB Movement: No pattern defined in config');
      return;
    }

    if (config.pattern.length < 2) {
      console.warn('QB Movement: Pattern must have at least 2 waypoints');
      return;
    }

    // Calculate movement progress (0 to 1)
    const progress = Math.min(timeElapsed / config.timing, 1.0);

    // Safety check for invalid timing or progress
    if (!Number.isFinite(progress) || progress < 0) {
      console.warn('QB Movement: Invalid progress calculated', { timeElapsed, timing: config.timing, progress });
      return;
    }

    // Find current segment in pattern
    const segmentCount = config.pattern.length;
    const segmentProgress = progress * (segmentCount - 1);
    const currentSegment = Math.min(Math.floor(segmentProgress), segmentCount - 2); // Ensure never exceeds valid range
    const segmentT = segmentProgress - currentSegment;

    // Safety check for NaN values
    if (!Number.isFinite(currentSegment) || !Number.isFinite(segmentT)) {
      console.warn('QB Movement: Invalid segment calculations', { progress, segmentProgress, currentSegment, segmentT, segmentCount });
      return;
    }

    if (currentSegment >= segmentCount - 1 || progress >= 1.0) {
      // Movement complete - set to final position
      qb.position = { ...config.pattern[segmentCount - 1] };
      qb.velocity = { x: 0, y: 0 };
      qb.currentSpeed = 0;
    } else {
      // Interpolate between current and next waypoint
      const current = config.pattern[currentSegment];
      const next = config.pattern[currentSegment + 1];

      // Safety check for valid waypoints
      if (!current || !next) {
        console.warn(`QB Movement: Invalid waypoints at segment ${currentSegment}`, { current, next, segmentCount });
        return;
      }

      qb.position = {
        x: current.x + (next.x - current.x) * segmentT,
        y: current.y + (next.y - current.y) * segmentT
      };

      // Calculate velocity based on movement
      const distance = Math.sqrt(
        Math.pow(next.x - current.x, 2) +
        Math.pow(next.y - current.y, 2)
      );

      const segmentDuration = config.timing / segmentCount;
      const speed = (distance / segmentDuration) * this.MOVEMENT_SPEEDS[config.type];

      qb.currentSpeed = Math.min(speed, qb.maxSpeed);

      // Update velocity direction
      if (distance > 0.1) {
        const direction = {
          x: (next.x - current.x) / distance,
          y: (next.y - current.y) / distance
        };

        qb.velocity = {
          x: direction.x * qb.currentSpeed,
          y: direction.y * qb.currentSpeed
        };
      }
    }
  }

  /**
   * Get accuracy modifier based on QB movement state
   */
  public static getAccuracyModifier(
    qb: Player,
    config?: QBMovementConfig,
    timeElapsed?: number
  ): number {
    if (!config || !timeElapsed) {
      return this.ACCURACY_MODIFIERS.stationary;
    }

    // If movement is complete and QB is set
    if (timeElapsed >= config.timing) {
      return config.accuracyModifier;
    }

    // Movement in progress - apply in-motion penalties
    switch (config.type) {
      case 'dropback':
        return this.ACCURACY_MODIFIERS.dropback_incomplete;
      case 'playaction':
        // During fake handoff phase
        if (config.fakeHandoffDuration && timeElapsed < config.fakeHandoffDuration) {
          return this.ACCURACY_MODIFIERS.backfoot;
        }
        return config.accuracyModifier;
      case 'rollout':
        return config.accuracyModifier;
      default:
        return this.ACCURACY_MODIFIERS.stationary;
    }
  }

  /**
   * Check if QB movement should trigger defensive Play Action response
   */
  public static shouldTriggerPlayActionResponse(
    config: QBMovementConfig,
    timeElapsed: number
  ): boolean {
    return config.type === 'playaction' &&
           config.fakeHandoffDuration !== undefined &&
           timeElapsed >= config.fakeHandoffDuration;
  }

  /**
   * Determine if QB is in optimal throwing position
   */
  public static isInThrowingPosition(
    config: QBMovementConfig,
    timeElapsed: number
  ): boolean {
    // QB is set and ready to throw
    return timeElapsed >= config.timing;
  }

  /**
   * Get quarterback starting position based on formation and hash
   */
  public static getQBStartPosition(
    formation: 'shotgun' | 'under-center',
    hashPosition: HashPosition,
    lineOfScrimmage: number
  ): Vector2D {
    // Hash positioning
    const centerX = 26.665; // Center of field
    const hashOffset = 3.08; // Distance from center to hash

    let x = centerX;
    if (hashPosition === 'left') {
      x = centerX - hashOffset;
    } else if (hashPosition === 'right') {
      x = centerX + hashOffset;
    }

    // Y positioning based on formation
    const y = formation === 'shotgun' ?
      lineOfScrimmage - 6 : // 6 yards behind LOS
      lineOfScrimmage - 1;   // 1 yard behind LOS

    return { x, y };
  }
}