import type {
  Player,
  Vector2D,
  CoverageResponsibility,
  GameState
} from './types';
import { Vector } from '@/lib/math';

/**
 * Advanced Defensive Behavior System
 * Implements robber/lurk techniques, bracket coordination, and pattern matching
 * Based on NFL research from Phase 4.3
 */
export class AdvancedDefensiveBehavior {

  /**
   * Update robber defender behavior - reads QB eyes and jumping routes
   * Based on NFL robber coverage research from coaching clinics
   */
  static updateRobberBehavior(
    robber: Player,
    qb: Player,
    receivers: Player[],
    gameTime: number,
    gameState: GameState
  ): void {
    const responsibility = robber.coverageResponsibility;
    if (!responsibility?.qbKeyRules) return;

    const { readEyes, jumpThreshold, pursuitAngle } = responsibility.qbKeyRules;
    const timeSinceSnap = gameTime - (gameState.snapTime || 0);

    // Read QB eyes and find his target
    const qbTarget = this.getQBTarget(qb, receivers);
    if (!qbTarget || timeSinceSnap < jumpThreshold) return;

    // Check if target is in robber's pattern reads
    const targetRoute = qbTarget.route?.type;
    const shouldJump = responsibility.patternReads?.includes(targetRoute || '') || false;

    if (shouldJump && readEyes) {
      // Jump the route based on pursuit angle
      const targetPosition = this.calculateInterceptionPoint(
        robber.position,
        qbTarget.position,
        qb.position,
        pursuitAngle
      );

      // Move robber toward interception point
      robber.position = Vector.moveToward(
        robber.position,
        targetPosition,
        robber.maxSpeed * (1/60) // 60fps
      );

      // Update coverage assignment to show jumping route
      robber.coverageAssignment = `jumping-${targetRoute}`;
    }
  }

  /**
   * Update lurk defender behavior - positioned toward formation strength
   * Based on NFL lurk coverage research
   */
  static updateLurkBehavior(
    lurker: Player,
    offensivePlayers: Player[],
    formationStrength: 'left' | 'right' | 'balanced',
    gameTime: number,
    gameState: GameState
  ): void {
    const responsibility = lurker.coverageResponsibility;
    if (!responsibility?.strengthAdjustment) return;

    // Adjust position based on formation strength changes
    const strengthSideX = formationStrength === 'right' ? 35 : 18;
    const targetX = formationStrength === 'balanced' ? 26.67 : strengthSideX;

    // Gradually shift toward strength
    if (Math.abs(lurker.position.x - targetX) > 1) {
      const direction = targetX > lurker.position.x ? 1 : -1;
      lurker.position.x += direction * 0.5; // Gradual shift
    }

    // Read pattern triggers
    const receivers = offensivePlayers.filter(p => p.isEligible && p.playerType !== 'QB');
    const patterns = this.analyzeRoutePatterns(receivers);

    if (responsibility.patternReads) {
      for (const pattern of patterns) {
        if (responsibility.patternReads.includes(pattern)) {
          // Move toward pattern area
          const patternCenter = this.getPatternCenter(receivers, pattern);
          if (patternCenter) {
            lurker.position = Vector.moveToward(
              lurker.position,
              patternCenter,
              lurker.maxSpeed * 0.7 * (1/60) // Slower movement for lurk
            );
          }
        }
      }
    }
  }

  /**
   * Update bracket coverage behavior - coordinate between two defenders
   * Based on NFL bracket coverage research
   */
  static updateBracketBehavior(
    defender: Player,
    bracketPartner: Player,
    target: Player,
    gameTime: number,
    gameState: GameState
  ): void {
    const responsibility = defender.coverageResponsibility;
    if (!responsibility?.bracketType || !responsibility?.bracketPartner) return;

    const { bracketType, maxDepth, triggerDepth } = responsibility;
    const targetDepth = target.position.y;
    const los = gameState.lineOfScrimmage;

    if (bracketType === 'top-bottom') {
      // Top-bottom bracket coordination
      if (responsibility.type === 'man' && maxDepth) {
        // Bottom bracket defender
        if (targetDepth >= los + maxDepth) {
          // Hand off to top bracket defender
          defender.coverageAssignment = `handed-off-${target.id}`;
          // Move to underneath coverage
          const flatPosition = {
            x: target.position.x,
            y: los + 8 // Flat coverage depth
          };
          defender.position = Vector.moveToward(
            defender.position,
            flatPosition,
            defender.maxSpeed * (1/60)
          );
        } else {
          // Continue man coverage with inside leverage
          const leverageOffset = { x: -1, y: 0 }; // Inside leverage
          const targetPosition = Vector.add(target.position, leverageOffset);
          defender.position = Vector.moveToward(
            defender.position,
            targetPosition,
            defender.maxSpeed * (1/60)
          );
        }
      } else if (responsibility.type === 'zone' && triggerDepth) {
        // Top bracket defender
        if (targetDepth >= los + triggerDepth) {
          // Take over bracket responsibility
          defender.coverageAssignment = `bracket-over-${target.id}`;
          // Move to bracket over position
          const overPosition = {
            x: target.position.x,
            y: target.position.y - 2 // Over the receiver
          };
          defender.position = Vector.moveToward(
            defender.position,
            overPosition,
            defender.maxSpeed * 0.9 * (1/60) // Slightly slower for over coverage
          );
        }
      }
    } else if (bracketType === 'inside-outside') {
      // Inside-outside bracket coordination
      const isInsideBracket = responsibility.leverage === 'inside';

      if (isInsideBracket) {
        // Inside bracket - force receiver outside
        const insidePosition = {
          x: target.position.x - 1.5, // Inside leverage
          y: target.position.y - 0.5 // Trail technique
        };
        defender.position = Vector.moveToward(
          defender.position,
          insidePosition,
          defender.maxSpeed * (1/60)
        );
      } else {
        // Outside bracket - help from outside
        const outsidePosition = {
          x: target.position.x + 2, // Outside help
          y: target.position.y + 1 // Over the top
        };
        defender.position = Vector.moveToward(
          defender.position,
          outsidePosition,
          defender.maxSpeed * 0.8 * (1/60)
        );
      }
    }
  }

  /**
   * Update poach coverage behavior - safety helping strong side
   * Based on NFL poach coverage research
   */
  static updatePoachBehavior(
    poacher: Player,
    keyPlayer: Player,
    strongSideDefender: Player,
    gameTime: number,
    gameState: GameState
  ): void {
    const responsibility = poacher.coverageResponsibility;
    if (!responsibility?.poachRules) return;

    const { keyPlayer: keyPlayerType, helpStrong, trigger } = responsibility.poachRules;

    // Check trigger condition
    let shouldPoach = false;
    if (trigger === 'te-block-or-flat' && keyPlayer.playerType === 'TE') {
      // TE blocking or running flat route
      const teRoute = keyPlayer.route?.type;
      const isBlocking = keyPlayer.isBlocking;
      shouldPoach = isBlocking || teRoute === 'flat';
    }

    if (shouldPoach && helpStrong) {
      // Move to help strong side defender
      const helpPosition = {
        x: strongSideDefender.position.x + 3, // Help position
        y: strongSideDefender.position.y - 2 // Slightly behind
      };

      poacher.position = Vector.moveToward(
        poacher.position,
        helpPosition,
        poacher.maxSpeed * 0.8 * (1/60) // Measured approach
      );

      poacher.coverageAssignment = `poach-help-${strongSideDefender.id}`;
    }
  }

  /**
   * Update inverted coverage behavior - safety low, corner high
   * Based on NFL inverted coverage research
   */
  static updateInvertedBehavior(
    defender: Player,
    coveragePartner: Player,
    gameTime: number,
    gameState: GameState
  ): void {
    const responsibility = defender.coverageResponsibility;
    if (!responsibility?.invertedRole) return;

    // Coordinate inverted assignments
    if (defender.playerType === 'CB' && responsibility.invertedRole) {
      // Corner playing deep (inverted)
      const deepPosition = {
        x: defender.position.x,
        y: Math.max(defender.position.y, gameState.lineOfScrimmage + 15) // Stay deep
      };

      defender.position = Vector.moveToward(
        defender.position,
        deepPosition,
        defender.maxSpeed * 0.7 * (1/60) // Slower deep coverage
      );

    } else if (defender.playerType === 'S' && responsibility.invertedRole) {
      // Safety playing low (inverted)
      const lowPosition = {
        x: defender.position.x,
        y: Math.min(defender.position.y, gameState.lineOfScrimmage + 12) // Stay low
      };

      defender.position = Vector.moveToward(
        defender.position,
        lowPosition,
        defender.maxSpeed * (1/60) // Normal speed for robber role
      );
    }
  }

  /**
   * Get QB's current target based on eye reading
   */
  private static getQBTarget(qb: Player, receivers: Player[]): Player | null {
    // Simplified QB target detection - in reality would use more complex eye tracking
    // For now, assume QB is looking at closest receiver in his field of view
    const qbForward = { x: 0, y: 1 }; // QB facing downfield

    let closestReceiver: Player | null = null;
    let closestDistance = Infinity;

    for (const receiver of receivers) {
      const toReceiver = Vector.subtract(receiver.position, qb.position);
      const distance = Vector.magnitude(toReceiver);
      const dot = Vector.dot(Vector.normalize(toReceiver), qbForward);

      // Receiver must be in front of QB and within reasonable distance
      if (dot > 0.5 && distance < 30 && distance < closestDistance) {
        closestReceiver = receiver;
        closestDistance = distance;
      }
    }

    return closestReceiver;
  }

  /**
   * Calculate optimal interception point for robber
   */
  private static calculateInterceptionPoint(
    robberPos: Vector2D,
    targetPos: Vector2D,
    qbPos: Vector2D,
    pursuitAngle: 'undercut' | 'overthrow' | 'collision'
  ): Vector2D {
    const toTarget = Vector.subtract(targetPos, qbPos);
    const targetDirection = Vector.normalize(toTarget);

    switch (pursuitAngle) {
      case 'undercut':
        // Position between QB and receiver
        return Vector.add(qbPos, Vector.scale(targetDirection, Vector.magnitude(toTarget) * 0.7));

      case 'overthrow':
        // Position beyond receiver
        return Vector.add(targetPos, Vector.scale(targetDirection, 3));

      case 'collision':
        // Position at receiver's location
        return targetPos;

      default:
        return targetPos;
    }
  }

  /**
   * Analyze route patterns for lurk defender
   */
  private static analyzeRoutePatterns(receivers: Player[]): string[] {
    const patterns: string[] = [];
    const routes = receivers.map(r => r.route?.type).filter(Boolean) as string[];

    // Check for specific patterns
    if (routes.includes('hitch') && routes.includes('corner')) {
      patterns.push('smash-low');
    }

    if (routes.filter(r => ['slant', 'hitch', 'curl'].includes(r)).length >= 2) {
      patterns.push('flood-underneath');
    }

    if (routes.includes('dig') || routes.includes('in')) {
      patterns.push('stick');
    }

    if (routes.includes('hitch')) {
      patterns.push('hitch');
    }

    return patterns;
  }

  /**
   * Get center position of a route pattern
   */
  private static getPatternCenter(receivers: Player[], pattern: string): Vector2D | null {
    const patternReceivers = receivers.filter(r => {
      const route = r.route?.type;
      switch (pattern) {
        case 'smash-low':
          return route === 'hitch';
        case 'flood-underneath':
          return ['slant', 'hitch', 'curl'].includes(route || '');
        case 'stick':
          return ['dig', 'in'].includes(route || '');
        case 'hitch':
          return route === 'hitch';
        default:
          return false;
      }
    });

    if (patternReceivers.length === 0) return null;

    // Calculate center position
    const totalX = patternReceivers.reduce((sum, r) => sum + r.position.x, 0);
    const totalY = patternReceivers.reduce((sum, r) => sum + r.position.y, 0);

    return {
      x: totalX / patternReceivers.length,
      y: totalY / patternReceivers.length
    };
  }
}