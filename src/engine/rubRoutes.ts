import type {
  Player,
  Vector2D,
  Route,
  RouteType,
  CoverageType,
  GameState
} from './types';

/**
 * Rub Routes and Pick Plays System
 * Implements NFL-legal pick concepts including mesh, smash, stack, and bunch formations
 */
export class RubRoutesSystem {

  /**
   * Legal pick zone - within 1 yard of LOS
   */
  private readonly LEGAL_PICK_ZONE = { y_min: 0, y_max: 1 };

  /**
   * Pick effectiveness parameters
   */
  private readonly PICK_EFFECTIVENESS = {
    mesh: 2.4, // average separation in yards
    smash_switch: 2.8,
    stack_vertical: 3.2,
    bunch_natural: 2.1,
    defender_recovery_time: 0.6, // seconds
    openness_bonus: 15 // percentage increase
  };

  /**
   * Pick play definitions
   */
  private pickConcepts: Record<string, {
    type: 'mesh' | 'smash' | 'stack' | 'bunch';
    routes: Record<string, {
      routeType: RouteType;
      depth: number;
      timing: number[];
      isPick: boolean;
    }>;
    meshPoint?: Vector2D;
    separationCreated: number;
    effectiveVsMan: number;
    effectiveVsZone: number;
  }> = {
    'mesh_concept': {
      type: 'mesh',
      routes: {
        'slot1': {
          routeType: 'mesh_cross',
          depth: 4.5,
          timing: [0, 1.2, 2.5],
          isPick: true
        },
        'slot2': {
          routeType: 'mesh_cross',
          depth: 4.5,
          timing: [0, 1.2, 2.5],
          isPick: true
        },
        'outside': {
          routeType: 'dig',
          depth: 12,
          timing: [0, 2.8, 3.5],
          isPick: false
        }
      },
      meshPoint: { x: 26.67, y: 4.5 },
      separationCreated: 2.4,
      effectiveVsMan: 85,
      effectiveVsZone: 65
    },
    'smash_concept': {
      type: 'smash',
      routes: {
        'outside': {
          routeType: 'hitch',
          depth: 6,
          timing: [0, 1.4, 1.8],
          isPick: true
        },
        'slot': {
          routeType: 'corner',
          depth: 11,
          timing: [0, 2.2, 3.0],
          isPick: false
        }
      },
      separationCreated: 2.8,
      effectiveVsMan: 88,
      effectiveVsZone: 72
    },
    'stack_vertical': {
      type: 'stack',
      routes: {
        'front': {
          routeType: 'fade',
          depth: 20,
          timing: [0, 1.0, 3.5],
          isPick: true
        },
        'back': {
          routeType: 'slant',
          depth: 6,
          timing: [0, 0.6, 1.8],
          isPick: false
        }
      },
      separationCreated: 3.2,
      effectiveVsMan: 78,
      effectiveVsZone: 45
    }
  };

  /**
   * Pick timing phases
   */
  private pickTiming = {
    setup: 0.0, // snap
    approach: 0.8, // receivers approach pick point
    contact: 1.2, // legal pick/rub occurs
    separation: 1.6, // target receiver gains separation
    throw_window: { start: 1.8, end: 2.4 }, // optimal throw timing
    late_window: 3.0 // backup read timing
  };

  /**
   * Detect if formation has pick potential
   */
  public analyzePickPotential(offensivePlayers: Player[]): {
    hasPickPotential: boolean;
    pickType: 'mesh' | 'smash' | 'stack' | 'bunch' | null;
    pickReceivers: Player[];
    legalPickZones: Vector2D[];
  } {
    const eligibleReceivers = offensivePlayers.filter(p =>
      p.isEligible && p.playerType !== 'QB'
    );

    // Check for stack alignment (receivers vertically aligned)
    const stackPairs = this.detectStackFormation(eligibleReceivers);
    if (stackPairs.length > 0) {
      return {
        hasPickPotential: true,
        pickType: 'stack',
        pickReceivers: stackPairs[0],
        legalPickZones: [{ x: stackPairs[0][0].position.x, y: 1 }]
      };
    }

    // Check for bunch formation (receivers horizontally bunched)
    const bunchGroup = this.detectBunchFormation(eligibleReceivers);
    if (bunchGroup.length >= 3) {
      return {
        hasPickPotential: true,
        pickType: 'bunch',
        pickReceivers: bunchGroup,
        legalPickZones: bunchGroup.map(p => ({ x: p.position.x, y: 1 }))
      };
    }

    // Check for mesh potential (slot receivers)
    const slotReceivers = this.identifySlotReceivers(eligibleReceivers);
    if (slotReceivers.length >= 2) {
      return {
        hasPickPotential: true,
        pickType: 'mesh',
        pickReceivers: slotReceivers.slice(0, 2),
        legalPickZones: [{ x: 26.67, y: 1 }] // field center
      };
    }

    // Check for smash potential (outside + slot)
    const outsideReceiver = this.identifyOutsideReceiver(eligibleReceivers);
    const slotReceiver = slotReceivers[0];
    if (outsideReceiver && slotReceiver) {
      return {
        hasPickPotential: true,
        pickType: 'smash',
        pickReceivers: [outsideReceiver, slotReceiver],
        legalPickZones: [{ x: outsideReceiver.position.x, y: 1 }]
      };
    }

    return {
      hasPickPotential: false,
      pickType: null,
      pickReceivers: [],
      legalPickZones: []
    };
  }

  /**
   * Execute pick play coordination
   */
  public executePickPlay(
    conceptName: string,
    pickReceivers: Player[],
    gameTime: number,
    coverage: CoverageType
  ): {
    separationCreated: number;
    opennessBonus: number;
    pickExecuted: boolean;
    throwWindow: { start: number; end: number };
  } {
    const concept = this.pickConcepts[conceptName];
    if (!concept) {
      return {
        separationCreated: 0,
        opennessBonus: 0,
        pickExecuted: false,
        throwWindow: { start: 0, end: 0 }
      };
    }

    const isInPickWindow = gameTime >= this.pickTiming.contact &&
                          gameTime <= this.pickTiming.separation;

    if (!isInPickWindow) {
      return {
        separationCreated: 0,
        opennessBonus: 0,
        pickExecuted: false,
        throwWindow: this.pickTiming.throw_window
      };
    }

    // Calculate effectiveness vs coverage
    const effectiveness = this.isManCoverage(coverage)
      ? concept.effectiveVsMan
      : concept.effectiveVsZone;

    const pickSuccess = Math.random() * 100 < effectiveness;

    if (pickSuccess) {
      return {
        separationCreated: concept.separationCreated,
        opennessBonus: this.PICK_EFFECTIVENESS.openness_bonus,
        pickExecuted: true,
        throwWindow: this.pickTiming.throw_window
      };
    }

    return {
      separationCreated: concept.separationCreated * 0.3, // reduced effectiveness
      opennessBonus: 5, // minimal bonus
      pickExecuted: false,
      throwWindow: this.pickTiming.throw_window
    };
  }

  /**
   * Update routes for pick coordination
   */
  public updateRoutesForPick(
    receivers: Player[],
    pickType: 'mesh' | 'smash' | 'stack' | 'bunch',
    gameTime: number
  ): Player[] {
    const updatedReceivers = [...receivers];

    switch (pickType) {
      case 'mesh':
        this.updateMeshRoutes(updatedReceivers, gameTime);
        break;
      case 'smash':
        this.updateSmashRoutes(updatedReceivers, gameTime);
        break;
      case 'stack':
        this.updateStackRoutes(updatedReceivers, gameTime);
        break;
      case 'bunch':
        this.updateBunchRoutes(updatedReceivers, gameTime);
        break;
    }

    return updatedReceivers;
  }

  /**
   * Apply defensive response to pick plays
   */
  public applyDefensivePickResponse(
    defenders: Player[],
    pickType: 'mesh' | 'smash' | 'stack' | 'bunch',
    coverage: CoverageType
  ): Player[] {
    const updatedDefenders = [...defenders];

    if (this.isManCoverage(coverage)) {
      // Apply banjo technique (switching assignments)
      this.applyBanjoTechnique(updatedDefenders, pickType);
    } else {
      // Apply zone pattern matching
      this.applyZonePatternMatch(updatedDefenders, pickType);
    }

    return updatedDefenders;
  }

  /**
   * Check if pick is legal (within 1 yard of LOS)
   */
  public isLegalPick(pickPosition: Vector2D, losPosition: number): boolean {
    const relativeY = pickPosition.y - losPosition;
    return relativeY >= this.LEGAL_PICK_ZONE.y_min &&
           relativeY <= this.LEGAL_PICK_ZONE.y_max;
  }

  /**
   * Private helper methods
   */
  private detectStackFormation(receivers: Player[]): Player[][] {
    const stacks: Player[][] = [];
    const threshold = 2; // yards

    for (let i = 0; i < receivers.length; i++) {
      for (let j = i + 1; j < receivers.length; j++) {
        const player1 = receivers[i];
        const player2 = receivers[j];

        const horizontalDistance = Math.abs(player1.position.x - player2.position.x);
        const verticalDistance = Math.abs(player1.position.y - player2.position.y);

        if (horizontalDistance < threshold && verticalDistance > threshold) {
          stacks.push([player1, player2]);
        }
      }
    }

    return stacks;
  }

  private detectBunchFormation(receivers: Player[]): Player[] {
    const bunched: Player[] = [];
    const threshold = 3; // yards maximum spacing

    for (const receiver of receivers) {
      const nearbyReceivers = receivers.filter(other =>
        other.id !== receiver.id &&
        Math.abs(other.position.x - receiver.position.x) < threshold &&
        Math.abs(other.position.y - receiver.position.y) < threshold
      );

      if (nearbyReceivers.length >= 2) {
        bunched.push(receiver, ...nearbyReceivers);
        break;
      }
    }

    return [...new Set(bunched)]; // Remove duplicates
  }

  private identifySlotReceivers(receivers: Player[]): Player[] {
    const fieldCenter = 26.665;
    const slotZone = 8; // yards from center

    return receivers.filter(receiver =>
      Math.abs(receiver.position.x - fieldCenter) < slotZone
    );
  }

  private identifyOutsideReceiver(receivers: Player[]): Player | null {
    const fieldCenter = 26.665;

    return receivers.find(receiver =>
      Math.abs(receiver.position.x - fieldCenter) > 12
    ) || null;
  }

  private isManCoverage(coverage: CoverageType): boolean {
    return ['cover-0', 'cover-1'].includes(coverage);
  }

  private updateMeshRoutes(receivers: Player[], gameTime: number): void {
    const slotReceivers = receivers.filter(r => r.route?.type === 'mesh_cross');

    if (slotReceivers.length >= 2 && gameTime > this.pickTiming.approach) {
      // Adjust timing for crossing at mesh point
      slotReceivers.forEach((receiver, index) => {
        if (receiver.route) {
          receiver.route.timing = receiver.route.timing.map(t => t * 0.95); // slight speed up
        }
      });
    }
  }

  private updateSmashRoutes(receivers: Player[], gameTime: number): void {
    const hitchReceiver = receivers.find(r => r.route?.type === 'hitch');
    const cornerReceiver = receivers.find(r => r.route?.type === 'corner');

    if (hitchReceiver && cornerReceiver && gameTime > this.pickTiming.approach) {
      // Adjust hitch timing to create pick
      if (hitchReceiver.route) {
        hitchReceiver.route.timing = hitchReceiver.route.timing.map(t => t * 0.9);
      }
    }
  }

  private updateStackRoutes(receivers: Player[], gameTime: number): void {
    const fadeReceiver = receivers.find(r => r.route?.type === 'fade');
    const slantReceiver = receivers.find(r => r.route?.type === 'slant');

    if (fadeReceiver && slantReceiver && gameTime > this.pickTiming.setup) {
      // Coordinate timing for legal pick at LOS
      if (fadeReceiver.route && slantReceiver.route) {
        fadeReceiver.route.timing = fadeReceiver.route.timing.map(t => t * 1.05); // slight delay
      }
    }
  }

  private updateBunchRoutes(receivers: Player[], gameTime: number): void {
    // Natural rub routes from bunch formation
    receivers.forEach(receiver => {
      if (receiver.route && gameTime > this.pickTiming.approach) {
        // Slight timing variation for natural rubs
        const variation = (Math.random() - 0.5) * 0.2; // ±0.1 second variation
        receiver.route.timing = receiver.route.timing.map(t => t + variation);
      }
    });
  }

  private applyBanjoTechnique(defenders: Player[], pickType: string): void {
    const manDefenders = defenders.filter(d =>
      d.coverageResponsibility?.type === 'man'
    );

    // Switch assignments on crossing routes
    if (pickType === 'mesh' && manDefenders.length >= 2) {
      const temp = manDefenders[0].coverageResponsibility;
      manDefenders[0].coverageResponsibility = manDefenders[1].coverageResponsibility;
      manDefenders[1].coverageResponsibility = temp;
    }
  }

  private applyZonePatternMatch(defenders: Player[], pickType: string): void {
    const zoneDefenders = defenders.filter(d =>
      d.coverageResponsibility?.type === 'zone'
    );

    // Pattern match on crossing routes
    zoneDefenders.forEach(defender => {
      if (defender.coverageResponsibility?.zone && pickType === 'mesh') {
        // Expand zone coverage to handle mesh concept
        if (defender.coverageResponsibility.zone.width) {
          defender.coverageResponsibility.zone.width *= 1.2;
        }
      }
    });
  }
}