import type { Player, Coverage, Vector2D } from './types';

/**
 * NFL Pattern Match Coverage System
 * Implements 2-Read (Palms), Quarters Match, and other pattern-match concepts
 */

export interface PatternMatchDecision {
  technique: 'man' | 'zone' | 'pattern-match';
  assignment: string;
  landmark?: Vector2D;
  targetPlayer?: string;
}

export class PatternMatchEngine {
  // Vertical route threshold for pattern matching (NFL standard)
  private readonly VERTICAL_THRESHOLD = 10; // yards
  private readonly SMASH_THRESHOLD = 8;    // yards for corner routes
  private readonly CROSSING_THRESHOLD = 6; // yards for crossing routes

  /**
   * Execute 2-Read (Palms) Coverage
   * Corner reads #2 receiver, Safety reads #1
   * Used in Cover 2 and Cover 4 variations
   */
  public executePalms(
    corner: Player,
    safety: Player,
    receivers: Player[],
    los: number
  ): { corner: PatternMatchDecision; safety: PatternMatchDecision } {
    // Sort receivers by alignment (outside to inside)
    const sorted = this.sortReceiversByAlignment(receivers, corner.position.x < 26.665);
    const receiver1 = sorted[0]; // #1 receiver (outside)
    const receiver2 = sorted[1]; // #2 receiver (slot/inside)

    // Default assignments
    let cornerDecision: PatternMatchDecision = {
      technique: 'zone',
      assignment: 'deep-quarter',
      landmark: { x: corner.position.x, y: los - 15 }
    };

    let safetyDecision: PatternMatchDecision = {
      technique: 'zone',
      assignment: 'deep-quarter',
      landmark: { x: safety.position.x, y: los - 15 }
    };

    if (receiver2) {
      const depth2 = Math.abs(receiver2.position.y - los);

      // Check if #2 breaks out (corner route, out route)
      if (this.isOutBreaking(receiver2) && depth2 > 5) {
        // Corner takes #2 to flat
        cornerDecision = {
          technique: 'man',
          assignment: 'match-#2-flat',
          targetPlayer: receiver2.id
        };

        // Safety rotates over #1 deep
        if (receiver1) {
          safetyDecision = {
            technique: 'man',
            assignment: 'rotate-to-#1',
            targetPlayer: receiver1.id
          };
        }
      } else if (this.isVertical(receiver2, los)) {
        // #2 vertical - safety matches
        safetyDecision = {
          technique: 'man',
          assignment: 'match-#2-vertical',
          targetPlayer: receiver2.id
        };

        // Corner stays on #1
        if (receiver1) {
          cornerDecision = {
            technique: 'man',
            assignment: 'match-#1',
            targetPlayer: receiver1.id
          };
        }
      }
    }

    return { corner: cornerDecision, safety: safetyDecision };
  }

  /**
   * Execute Quarters Match (4-Read) Coverage
   * MOD (Man Only Deep) rules - only attach on vertical routes
   */
  public executeQuartersMatch(
    defender: Player,
    assignedReceiver: Player | null,
    los: number
  ): PatternMatchDecision {
    if (!assignedReceiver) {
      // No receiver in zone - maintain deep position
      return {
        technique: 'zone',
        assignment: 'deep-quarter',
        landmark: { x: defender.position.x, y: los - 15 }
      };
    }

    const depth = Math.abs(assignedReceiver.position.y - los);

    // MOD rules - Man Only Deep
    if (depth >= this.VERTICAL_THRESHOLD && this.isVertical(assignedReceiver, los)) {
      // Convert to man coverage on vertical route
      return {
        technique: 'man',
        assignment: 'match-vertical',
        targetPlayer: assignedReceiver.id
      };
    }

    // MEG (Man Everywhere he Goes) in red zone or specific situations
    if (los > 80) { // Red zone
      return {
        technique: 'man',
        assignment: 'meg-lock',
        targetPlayer: assignedReceiver.id
      };
    }

    // Maintain zone if receiver runs shallow
    return {
      technique: 'zone',
      assignment: 'sink-to-quarter',
      landmark: { x: defender.position.x, y: los - 12 }
    };
  }

  /**
   * Execute Rip/Liz Match Concept
   * Used in Cover 3 and Cover 1 variations
   */
  public executeRipLizMatch(
    defenders: Player[],
    receivers: Player[],
    los: number,
    strength: 'left' | 'right'
  ): Map<string, PatternMatchDecision> {
    const decisions = new Map<string, PatternMatchDecision>();

    // Rip = Right, Liz = Left (to the strength)
    const isRip = strength === 'right';

    // Find the apex defender (usually a linebacker or nickel)
    const apexDefender = defenders.find(d =>
      d.playerType === 'LB' || d.playerType === 'NB'
    );

    if (apexDefender) {
      // Check for #3 receiver (RB or inside slot)
      const receiver3 = receivers.find(r =>
        r.playerType === 'RB' || this.isInsideReceiver(r, receivers)
      );

      if (receiver3 && this.isReceiver3Threatening(receiver3, los)) {
        // Apex takes #3
        decisions.set(apexDefender.id, {
          technique: 'man',
          assignment: 'carry-#3',
          targetPlayer: receiver3.id
        });
      } else {
        // Apex walls off crossers
        decisions.set(apexDefender.id, {
          technique: 'zone',
          assignment: 'wall-crossers',
          landmark: { x: 26.665, y: los - 8 }
        });
      }
    }

    return decisions;
  }

  /**
   * Check for Smash concept (corner + hitch)
   * Triggers special coverage rules
   */
  public detectSmashConcept(receivers: Player[], los: number): boolean {
    // Look for high-low combination
    const deep = receivers.find(r =>
      Math.abs(r.position.y - los) > this.SMASH_THRESHOLD
    );
    const shallow = receivers.find(r =>
      Math.abs(r.position.y - los) < 6 && Math.abs(r.position.y - los) > 2
    );

    return !!(deep && shallow && Math.abs(deep.position.x - shallow.position.x) < 5);
  }

  // Helper functions

  private sortReceiversByAlignment(
    receivers: Player[],
    isLeftSide: boolean
  ): Player[] {
    return receivers.sort((a, b) => {
      if (isLeftSide) {
        return a.position.x - b.position.x; // Left to right
      } else {
        return b.position.x - a.position.x; // Right to left
      }
    });
  }

  private isVertical(receiver: Player, los: number): boolean {
    const depth = Math.abs(receiver.position.y - los);
    const horizontalMovement = Math.abs(receiver.velocity?.x || 0);
    const verticalMovement = Math.abs(receiver.velocity?.y || 0);

    // Vertical if moving more up/down than side-to-side
    return depth > 8 && verticalMovement > horizontalMovement * 1.5;
  }

  private isOutBreaking(receiver: Player): boolean {
    if (!receiver.velocity) return false;

    const movingOut = Math.abs(receiver.velocity.x) > Math.abs(receiver.velocity.y) * 0.5;
    const towardsSideline = (
      (receiver.position.x < 26.665 && receiver.velocity.x < 0) ||
      (receiver.position.x > 26.665 && receiver.velocity.x > 0)
    );

    return movingOut && towardsSideline;
  }

  private isInsideReceiver(receiver: Player, allReceivers: Player[]): boolean {
    const sameSideReceivers = allReceivers.filter(r =>
      (r.position.x < 26.665) === (receiver.position.x < 26.665)
    );

    // Inside if there's a receiver more outside
    return sameSideReceivers.some(r =>
      Math.abs(r.position.x - 26.665) > Math.abs(receiver.position.x - 26.665)
    );
  }

  private isReceiver3Threatening(receiver: Player, los: number): boolean {
    // #3 is threatening if releasing past 5 yards
    const depth = Math.abs(receiver.position.y - los);
    return depth > 5 || (receiver.velocity && Math.abs(receiver.velocity.y) > 2);
  }

  /**
   * Zone distribution rules - how defenders distribute in zone coverage
   * Based on receiver distribution and formation
   */
  public distributeZones(
    defenders: Player[],
    receivers: Player[],
    coverage: Coverage,
    los: number
  ): Map<string, Vector2D> {
    const distribution = new Map<string, Vector2D>();

    // Count receivers to each side
    const leftReceivers = receivers.filter(r => r.position.x < 26.665).length;
    const rightReceivers = receivers.filter(r => r.position.x > 26.665).length;

    // Adjust zone spacing based on formation
    const isTrips = leftReceivers >= 3 || rightReceivers >= 3;
    const strongSide = rightReceivers > leftReceivers ? 'right' : 'left';

    defenders.forEach(defender => {
      if (defender.coverageResponsibility?.type === 'zone') {
        const zone = defender.coverageResponsibility.zone;
        if (zone) {
          let adjustedPosition = { ...zone.center };

          // Adjust for trips formations
          if (isTrips) {
            if (strongSide === 'right' && zone.center.x > 26.665) {
              // Tighten spacing to trips side
              adjustedPosition.x -= 2;
            } else if (strongSide === 'left' && zone.center.x < 26.665) {
              adjustedPosition.x += 2;
            }
          }

          distribution.set(defender.id, adjustedPosition);
        }
      }
    });

    return distribution;
  }
}

export default PatternMatchEngine;