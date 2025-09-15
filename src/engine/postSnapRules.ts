import { Player, CoverageType, GamePhase, Vector2D, Zone } from './types';

export interface RouteDistribution {
  pattern: 'vertical' | 'horizontal' | 'flood' | 'spacing' | 'mirrored';
  threats: {
    deep: string[];
    intermediate: string[];
    shallow: string[];
  };
}

export interface PatternMatchTrigger {
  defenderId: string;
  trigger: string;
  action: 'convert-to-man' | 'carry-vertical' | 'pass-off' | 'collision' | 'wall';
  targetPlayer?: string;
}

export class PostSnapRules {
  // Pattern match depth triggers
  private readonly VERTICAL_TRIGGER_DEPTH = 12; // yards
  private readonly INTERMEDIATE_DEPTH = 10; // yards
  private readonly SHORT_ROUTE_DEPTH = 5; // yards
  private readonly COLLISION_DISTANCE = 2; // yards

  // ROBOT principles (Route distribution)
  private readonly ROBOT = {
    Rhythm: 3, // Quick rhythm routes (3-step)
    Over: 7, // Routes over linebackers
    Between: 12, // Routes between zones
    Outside: 15, // Outside breaking routes
    Through: 20 // Deep routes through coverage
  };

  /**
   * Analyze route distribution for defensive adjustments
   */
  analyzeRouteDistribution(offensivePlayers: Player[]): RouteDistribution {
    const receivers = offensivePlayers.filter(p =>
      p.team === 'offense' &&
      p.isEligible &&
      p.playerType !== 'QB'
    );

    const threats = {
      deep: [] as string[],
      intermediate: [] as string[],
      shallow: [] as string[]
    };

    // Categorize routes by depth
    for (const receiver of receivers) {
      if (!receiver.route) continue;

      const routeDepth = receiver.route.depth;

      if (routeDepth >= this.ROBOT.Through) {
        threats.deep.push(receiver.id);
      } else if (routeDepth >= this.ROBOT.Between) {
        threats.intermediate.push(receiver.id);
      } else {
        threats.shallow.push(receiver.id);
      }
    }

    // Determine pattern type
    const pattern = this.determinePattern(receivers, threats);

    return { pattern, threats };
  }

  /**
   * Get pattern match triggers based on coverage and routes
   */
  getPatternMatchTriggers(
    coverage: CoverageType,
    defenders: Player[],
    offensivePlayers: Player[]
  ): PatternMatchTrigger[] {
    const triggers: PatternMatchTrigger[] = [];
    const receivers = offensivePlayers.filter(p => p.isEligible && p.team === 'offense');

    switch (coverage) {
      case 'cover-4':
      case 'quarters':
        triggers.push(...this.getQuartersPatternMatch(defenders, receivers));
        break;
      case 'cover-3':
        triggers.push(...this.getCover3PatternMatch(defenders, receivers));
        break;
      case 'cover-2':
        triggers.push(...this.getCover2PatternMatch(defenders, receivers));
        break;
      default:
        // Man coverages don't use pattern matching
        break;
    }

    return triggers;
  }

  /**
   * Calculate leverage maintenance for man coverage
   */
  calculateManLeverage(
    defender: Player,
    receiver: Player,
    hasHelp: boolean
  ): 'inside' | 'outside' | 'trail' {
    const xDiff = receiver.position.x - defender.position.x;
    const yDiff = receiver.position.y - defender.position.y;

    // Trail technique when receiver has separation
    if (Math.abs(yDiff) > 3) {
      return 'trail';
    }

    // Outside leverage with safety help
    if (hasHelp) {
      return 'outside';
    }

    // Inside leverage without help (force to boundary)
    return 'inside';
  }

  /**
   * Determine zone handoff points
   */
  getZoneHandoffTriggers(
    defenders: Player[],
    receiver: Player
  ): { from: string; to: string; point: Vector2D }[] {
    const handoffs: { from: string; to: string; point: Vector2D }[] = [];

    // Find defenders in adjacent zones
    for (let i = 0; i < defenders.length - 1; i++) {
      for (let j = i + 1; j < defenders.length; j++) {
        const def1 = defenders[i];
        const def2 = defenders[j];

        if (!def1.coverageResponsibility?.zone || !def2.coverageResponsibility?.zone) {
          continue;
        }

        // Check if zones are adjacent
        const zone1 = def1.coverageResponsibility.zone;
        const zone2 = def2.coverageResponsibility.zone;

        if (this.areZonesAdjacent(zone1, zone2)) {
          // Calculate handoff point (midpoint between zones)
          const handoffPoint: Vector2D = {
            x: (zone1.center.x + zone2.center.x) / 2,
            y: (zone1.center.y + zone2.center.y) / 2
          };

          // Check if receiver is near handoff point
          const distance = this.calculateDistance(receiver.position, handoffPoint);
          if (distance < 5) {
            handoffs.push({
              from: def1.id,
              to: def2.id,
              point: handoffPoint
            });
          }
        }
      }
    }

    return handoffs;
  }

  /**
   * Calculate pursuit angles for defenders
   */
  calculatePursuitAngle(
    defender: Player,
    ballCarrier: Player,
    ballVelocity: Vector2D
  ): number {
    // Project ball carrier's future position
    const timeToIntercept = this.estimateInterceptTime(defender, ballCarrier);
    const futurePosition: Vector2D = {
      x: ballCarrier.position.x + (ballVelocity.x * timeToIntercept),
      y: ballCarrier.position.y + (ballVelocity.y * timeToIntercept)
    };

    // Calculate angle to future position
    const dx = futurePosition.x - defender.position.x;
    const dy = futurePosition.y - defender.position.y;

    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * Determine if defender should convert from zone to man
   */
  shouldConvertToMan(
    defender: Player,
    receiver: Player,
    coverage: CoverageType
  ): boolean {
    if (!defender.coverageResponsibility?.zone) return false;

    const distance = this.calculateDistance(defender.position, receiver.position);
    const receiverDepth = Math.abs(receiver.position.y);

    // Coverage-specific conversion rules
    switch (coverage) {
      case 'cover-4':
      case 'quarters':
        // #2 vertical trigger
        if (receiver.id.includes('2') && receiverDepth > this.VERTICAL_TRIGGER_DEPTH) {
          return true;
        }
        break;
      case 'cover-3':
        // Seam route in zone
        if (receiverDepth > this.INTERMEDIATE_DEPTH && distance < 5) {
          return true;
        }
        break;
      default:
        break;
    }

    return false;
  }

  // Private helper methods

  private determinePattern(
    receivers: Player[],
    threats: RouteDistribution['threats']
  ): RouteDistribution['pattern'] {
    // Vertical pattern (4 verts, etc.)
    if (threats.deep.length >= 3) {
      return 'vertical';
    }

    // Horizontal pattern (all hitches, all curls)
    if (threats.shallow.length >= 3 && threats.deep.length === 0) {
      return 'horizontal';
    }

    // Flood pattern (3 receivers at different levels to one side)
    const leftReceivers = receivers.filter(r => r.position.x < 26.67);
    const rightReceivers = receivers.filter(r => r.position.x >= 26.67);

    if (leftReceivers.length >= 3 || rightReceivers.length >= 3) {
      // Check if they're at different levels
      const hasDeep = threats.deep.length > 0;
      const hasIntermediate = threats.intermediate.length > 0;
      const hasShallow = threats.shallow.length > 0;

      if (hasDeep && hasIntermediate && hasShallow) {
        return 'flood';
      }
    }

    // Spacing pattern (receivers evenly distributed)
    if (this.areReceiversSpaced(receivers)) {
      return 'spacing';
    }

    // Mirrored pattern (same routes on both sides)
    return 'mirrored';
  }

  private getQuartersPatternMatch(defenders: Player[], receivers: Player[]): PatternMatchTrigger[] {
    const triggers: PatternMatchTrigger[] = [];

    // Find safeties reading #2 to #1
    const safeties = defenders.filter(d => d.playerType === 'S');

    for (const safety of safeties) {
      // Find #2 receiver on safety's side
      const sideReceivers = receivers.filter(r =>
        Math.abs(r.position.x - safety.position.x) < 15
      );

      if (sideReceivers.length >= 2) {
        const number2 = sideReceivers[1]; // Second receiver from outside

        // Check if #2 goes vertical
        if (number2.route && number2.route.depth > this.VERTICAL_TRIGGER_DEPTH) {
          triggers.push({
            defenderId: safety.id,
            trigger: '#2 vertical',
            action: 'convert-to-man',
            targetPlayer: number2.id
          });
        }

        // Check if #2 goes inside
        if (number2.velocity && number2.velocity.x * (safety.position.x - 26.67) < 0) {
          triggers.push({
            defenderId: safety.id,
            trigger: '#2 inside',
            action: 'carry-vertical',
            targetPlayer: sideReceivers[0].id // Help on #1
          });
        }
      }
    }

    return triggers;
  }

  private getCover3PatternMatch(defenders: Player[], receivers: Player[]): PatternMatchTrigger[] {
    const triggers: PatternMatchTrigger[] = [];

    // Find curl/flat defenders
    const underneath = defenders.filter(d =>
      d.coverageResponsibility?.zone?.name?.includes('curl') ||
      d.coverageResponsibility?.zone?.name?.includes('flat')
    );

    for (const defender of underneath) {
      // Find receivers in defender's zone
      const zoneReceivers = receivers.filter(r => {
        if (!defender.coverageResponsibility?.zone) return false;
        return this.isInZone(r.position, defender.coverageResponsibility.zone);
      });

      // Pattern match on vertical routes
      for (const receiver of zoneReceivers) {
        if (receiver.route && receiver.route.depth > this.INTERMEDIATE_DEPTH) {
          triggers.push({
            defenderId: defender.id,
            trigger: 'vertical in zone',
            action: 'carry-vertical',
            targetPlayer: receiver.id
          });
        }
      }
    }

    return triggers;
  }

  private getCover2PatternMatch(defenders: Player[], receivers: Player[]): PatternMatchTrigger[] {
    const triggers: PatternMatchTrigger[] = [];

    // Palms technique for corners
    const corners = defenders.filter(d => d.playerType === 'CB');

    for (const corner of corners) {
      // Find #1 and #2 on corner's side
      const sideReceivers = receivers.filter(r =>
        Math.abs(r.position.x - corner.position.x) < 20
      );

      if (sideReceivers.length >= 2) {
        const number1 = sideReceivers[0];
        const number2 = sideReceivers[1];

        // If #2 goes to flat, corner jumps it
        if (number2.route && number2.route.depth < this.SHORT_ROUTE_DEPTH) {
          triggers.push({
            defenderId: corner.id,
            trigger: '#2 flat',
            action: 'pass-off',
            targetPlayer: number2.id
          });
        }
      }
    }

    return triggers;
  }

  private areZonesAdjacent(zone1: Zone, zone2: Zone): boolean {
    // Check if zones overlap or are within 3 yards of each other
    const xOverlap = Math.abs(zone1.center.x - zone2.center.x) < (zone1.width + zone2.width) / 2 + 3;
    const yOverlap = Math.abs(zone1.center.y - zone2.center.y) < (zone1.height + zone2.height) / 2 + 3;

    return xOverlap && yOverlap;
  }

  private isInZone(position: Vector2D, zone: Zone): boolean {
    const xInZone = Math.abs(position.x - zone.center.x) <= zone.width / 2;
    const yInZone = Math.abs(position.y - zone.center.y) <= zone.height / 2;

    return xInZone && yInZone;
  }

  private areReceiversSpaced(receivers: Player[]): boolean {
    if (receivers.length < 3) return false;

    // Sort by x position
    const sorted = [...receivers].sort((a, b) => a.position.x - b.position.x);

    // Check spacing between consecutive receivers
    let totalSpacing = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      totalSpacing += sorted[i + 1].position.x - sorted[i].position.x;
    }

    const averageSpacing = totalSpacing / (sorted.length - 1);

    // Check if spacing is relatively even (within 3 yards variance)
    for (let i = 0; i < sorted.length - 1; i++) {
      const spacing = sorted[i + 1].position.x - sorted[i].position.x;
      if (Math.abs(spacing - averageSpacing) > 3) {
        return false;
      }
    }

    return true;
  }

  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private estimateInterceptTime(defender: Player, target: Player): number {
    const distance = this.calculateDistance(defender.position, target.position);
    const relativeSpeed = defender.maxSpeed - target.currentSpeed;

    if (relativeSpeed <= 0) {
      // Can't catch up
      return Infinity;
    }

    return distance / relativeSpeed;
  }

  /**
   * Update defender behavior based on post-snap rules
   */
  applyPostSnapRules(
    defenders: Player[],
    offensivePlayers: Player[],
    coverage: CoverageType,
    gamePhase: GamePhase
  ): void {
    if (gamePhase !== 'post-snap' && gamePhase !== 'ball-thrown') {
      return;
    }

    // Get pattern match triggers
    const triggers = this.getPatternMatchTriggers(coverage, defenders, offensivePlayers);

    // Apply triggers to defenders
    for (const trigger of triggers) {
      const defender = defenders.find(d => d.id === trigger.defenderId);
      if (!defender) continue;

      switch (trigger.action) {
        case 'convert-to-man':
          if (defender.coverageResponsibility) {
            defender.coverageResponsibility.type = 'man';
            defender.coverageResponsibility.target = trigger.targetPlayer;
          }
          break;

        case 'carry-vertical':
          // Defender carries the vertical route
          if (trigger.targetPlayer) {
            const target = offensivePlayers.find(p => p.id === trigger.targetPlayer);
            if (target) {
              defender.coverageAssignment = trigger.targetPlayer;
            }
          }
          break;

        case 'pass-off':
          // Pass receiver to another defender
          defender.coverageAssignment = undefined;
          break;

        case 'collision':
          // Collision route - re-route receiver
          break;

        case 'wall':
          // Wall off crossing route
          defender.velocity = { x: 0, y: 0 };
          break;
      }
    }

    // Update zone handoffs
    const eligibleReceivers = offensivePlayers.filter(p => p.isEligible && p.team === 'offense');
    for (const receiver of eligibleReceivers) {
      const handoffs = this.getZoneHandoffTriggers(defenders, receiver);

      for (const handoff of handoffs) {
        const fromDefender = defenders.find(d => d.id === handoff.from);
        const toDefender = defenders.find(d => d.id === handoff.to);

        if (fromDefender && toDefender) {
          // Transfer coverage responsibility
          fromDefender.coverageAssignment = undefined;
          toDefender.coverageAssignment = receiver.id;
        }
      }
    }
  }
}