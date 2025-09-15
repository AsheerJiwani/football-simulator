import type {
  Player,
  Vector2D,
  CoverageResponsibility,
  GameState,
  CoverageType
} from './types';
import { Vector } from '@/lib/math';

/**
 * Coverage Disguise and Rotation System
 * Implements pre-snap disguise and post-snap rotation timing
 * Based on NFL research from Phase 4.3
 */
export class CoverageDisguiseSystem {

  /**
   * Disguise configuration interface
   */
  static getDisguiseConfigs(): DisguiseConfig[] {
    return [
      {
        name: "Cover 2 Roll to 1",
        preSnapCoverage: "cover-2",
        postSnapCoverage: "cover-1",
        rotationTiming: 0.3,
        triggerType: "snap",
        safetyMovements: [
          {
            defenderId: "S1",
            preSnapPosition: { x: 18, y: 20 },
            postSnapPosition: { x: 26.67, y: 25 },
            newRole: "deep-middle",
            movementSpeed: 0.9
          },
          {
            defenderId: "S2",
            preSnapPosition: { x: 35, y: 20 },
            postSnapPosition: { x: 26.67, y: 8 },
            newRole: "robber",
            movementSpeed: 1.0
          }
        ]
      },
      {
        name: "Cover 3 to Cover 2 Buzz",
        preSnapCoverage: "cover-3",
        postSnapCoverage: "cover-2",
        rotationTiming: 0.4,
        triggerType: "route-recognition",
        safetyMovements: [
          {
            defenderId: "S1",
            preSnapPosition: { x: 26.67, y: 18 },
            postSnapPosition: { x: 35, y: 18 },
            newRole: "deep-half",
            movementSpeed: 0.8
          }
        ]
      },
      {
        name: "Late Safety Rotation",
        preSnapCoverage: "cover-1",
        postSnapCoverage: "cover-1",
        rotationTiming: 0.8,
        triggerType: "route-recognition",
        safetyMovements: [
          {
            defenderId: "S2",
            preSnapPosition: { x: 20, y: 15 },
            postSnapPosition: { x: 35, y: 12 },
            newRole: "late-help",
            movementSpeed: 0.7
          }
        ]
      }
    ];
  }

  /**
   * Process disguise rotations during play
   */
  static processDisguiseRotations(
    defensePlayers: Player[],
    gameTime: number,
    gameState: GameState,
    currentCoverage: CoverageType
  ): void {
    const configs = this.getDisguiseConfigs();
    const timeSinceSnap = gameState.timeElapsed;

    configs.forEach(config => {
      // Check if this is the right disguise for current coverage
      if (config.preSnapCoverage !== currentCoverage) return;

      // Check timing
      if (timeSinceSnap < config.rotationTiming) return;

      // Check trigger condition
      if (!this.evaluateTriggerCondition(config.triggerType, gameState, timeSinceSnap)) return;

      // Execute the rotation
      this.executeDisguiseRotation(config, defensePlayers, gameState);
    });
  }

  /**
   * Execute disguise rotation based on configuration
   */
  private static executeDisguiseRotation(
    config: DisguiseConfig,
    defensePlayers: Player[],
    gameState: GameState
  ): void {
    config.safetyMovements.forEach(movement => {
      const defender = defensePlayers.find(d => d.id === movement.defenderId);
      if (!defender) return;

      // Mark as rotating if not already
      if (!defender.coverageAssignment?.includes('rotating')) {
        defender.coverageAssignment = `rotating-${movement.newRole}`;

        // Update position toward post-snap target
        defender.position = Vector.moveToward(
          defender.position,
          movement.postSnapPosition,
          defender.maxSpeed * movement.movementSpeed * (1/60) // 60fps
        );

        // Update coverage responsibility
        if (defender.coverageResponsibility) {
          this.updateResponsibilityForRotation(
            defender.coverageResponsibility,
            movement.newRole,
            movement.postSnapPosition
          );
        }
      }
    });
  }

  /**
   * Update coverage responsibility based on rotation role
   */
  private static updateResponsibilityForRotation(
    responsibility: CoverageResponsibility,
    newRole: string,
    position: Vector2D
  ): void {
    switch (newRole) {
      case 'deep-middle':
        responsibility.type = 'zone';
        responsibility.zone = {
          name: 'deep-middle-disguise',
          center: position,
          width: 24,
          height: 20,
          depth: 25
        };
        break;

      case 'robber':
        responsibility.type = 'zone';
        responsibility.zone = {
          name: 'robber-disguise',
          center: position,
          width: 12,
          height: 8,
          depth: 8
        };
        responsibility.qbKeyRules = {
          readEyes: true,
          jumpThreshold: 0.6,
          pursuitAngle: 'undercut'
        };
        break;

      case 'deep-half':
        responsibility.type = 'zone';
        responsibility.zone = {
          name: 'deep-half-buzz',
          center: position,
          width: 26.67,
          height: 40,
          depth: 20
        };
        break;

      case 'late-help':
        responsibility.type = 'zone';
        responsibility.zone = {
          name: 'late-help-zone',
          center: position,
          width: 15,
          height: 15,
          depth: 12
        };
        break;
    }
  }

  /**
   * Evaluate if trigger condition is met
   */
  private static evaluateTriggerCondition(
    triggerType: string,
    gameState: GameState,
    timeSinceSnap: number
  ): boolean {
    switch (triggerType) {
      case 'snap':
        return timeSinceSnap >= 0.1; // Small delay after snap

      case 'route-recognition':
        return timeSinceSnap >= 0.8; // Wait for route development

      case 'ball-movement':
        // Trigger on QB movement or ball thrown
        return gameState.ball.state === 'thrown' || timeSinceSnap >= 1.0;

      default:
        return false;
    }
  }

  /**
   * Check if defender should show disguise pre-snap
   */
  static shouldShowDisguise(
    defender: Player,
    coverage: CoverageType,
    gamePhase: string
  ): boolean {
    if (gamePhase !== 'pre-snap') return false;

    const configs = this.getDisguiseConfigs();
    const applicableConfig = configs.find(c => c.preSnapCoverage === coverage);

    if (!applicableConfig) return false;

    // Check if this defender is involved in disguise
    return applicableConfig.safetyMovements.some(m => m.defenderId === defender.id);
  }

  /**
   * Get pre-snap disguise position for defender
   */
  static getDisguisePosition(
    defender: Player,
    coverage: CoverageType
  ): Vector2D | null {
    const configs = this.getDisguiseConfigs();
    const applicableConfig = configs.find(c => c.preSnapCoverage === coverage);

    if (!applicableConfig) return null;

    const movement = applicableConfig.safetyMovements.find(m => m.defenderId === defender.id);
    return movement ? movement.preSnapPosition : null;
  }

  /**
   * Handle linebacker disguise movement
   */
  static processLinebackerDisguise(
    linebackers: Player[],
    gameTime: number,
    gameState: GameState
  ): void {
    const timeSinceSnap = gameState.timeElapsed;

    linebackers.forEach(lb => {
      const responsibility = lb.coverageResponsibility;
      if (!responsibility?.disguiseType) return;

      switch (responsibility.disguiseType) {
        case 'late-break':
          if (timeSinceSnap >= 0.8 && !lb.coverageAssignment?.includes('late-break')) {
            // Late break to coverage assignment
            lb.coverageAssignment = 'late-break-executed';
            if (responsibility.postSnapMovement) {
              lb.position = Vector.moveToward(
                lb.position,
                responsibility.postSnapMovement.destination,
                lb.maxSpeed * 0.8 * (1/60)
              );
            }
          }
          break;

        case 'coverage-roll':
          if (timeSinceSnap >= 0.5 && !lb.coverageAssignment?.includes('roll')) {
            // Roll to different coverage responsibility
            lb.coverageAssignment = 'coverage-roll-executed';
            // Implementation specific to the roll direction
          }
          break;
      }
    });
  }

  /**
   * Detect if offense has recognized disguise
   */
  static hasOffenseRecognizedDisguise(
    offensePlayers: Player[],
    defensePlayers: Player[],
    gameTime: number
  ): boolean {
    // Simplified recognition - in reality would be more complex
    const qb = offensePlayers.find(p => p.playerType === 'QB');
    if (!qb) return false;

    const timeSinceSnap = gameTime;
    const rotatingDefenders = defensePlayers.filter(d =>
      d.coverageAssignment?.includes('rotating')
    );

    // If many defenders are rotating, offense likely recognizes
    return rotatingDefenders.length >= 2 && timeSinceSnap >= 0.6;
  }

  /**
   * Get rotation priority for multiple simultaneous rotations
   */
  static getRotationPriority(roleName: string): number {
    const priorities = {
      'deep-middle': 1,    // Highest priority
      'robber': 2,
      'deep-half': 3,
      'late-help': 4       // Lowest priority
    };

    return priorities[roleName as keyof typeof priorities] || 5;
  }
}

/**
 * Disguise configuration interface
 */
export interface DisguiseConfig {
  name: string;
  preSnapCoverage: CoverageType;
  postSnapCoverage: CoverageType;
  rotationTiming: number; // seconds after snap
  triggerType: 'snap' | 'route-recognition' | 'ball-movement';
  safetyMovements: SafetyMovement[];
}

/**
 * Safety movement interface for disguise
 */
export interface SafetyMovement {
  defenderId: string;
  preSnapPosition: Vector2D;
  postSnapPosition: Vector2D;
  newRole: string;
  movementSpeed: number; // multiplier for max speed
}