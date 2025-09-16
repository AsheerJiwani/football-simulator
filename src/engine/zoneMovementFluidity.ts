import { Player, Vector2D, Zone, CoverageResponsibility } from './types';

/**
 * NFL-authentic zone coverage movement mechanics
 * Implements fluid zone drops, pattern matching, and handoff rules
 */
export class ZoneMovementFluidity {
  private readonly FIELD_CENTER = 26.67;
  private readonly HASH_LEFT = 23.58;
  private readonly HASH_RIGHT = 29.75;

  // Zone depth parameters (yards from LOS)
  private readonly ZONE_DEPTHS = {
    flat: { min: 0, max: 5, optimal: 3 },
    curl: { min: 8, max: 12, optimal: 10 },
    hook: { min: 10, max: 15, optimal: 12 },
    hole: { min: 12, max: 18, optimal: 15 },
    deepThird: { min: 18, max: 25, optimal: 22 },
    deepHalf: { min: 18, max: 25, optimal: 22 },
    deepMiddle: { min: 20, max: 30, optimal: 25 }
  };

  // Zone width parameters
  private readonly ZONE_WIDTHS = {
    flat: 15,        // Sideline to numbers
    curl: 12,        // Numbers width
    hook: 10,        // Hash to hash
    hole: 8,         // Middle hole
    deepThird: 17.78,  // Field divided by 3
    deepHalf: 26.67,   // Field divided by 2
    deepMiddle: 15     // Hash to hash deep
  };

  // Movement timing parameters (seconds)
  private readonly MOVEMENT_TIMING = {
    initialDrop: 0.5,      // Time to start backpedal
    zoneSettle: 1.2,       // Time to reach zone center
    patternRecognition: 0.3,  // Time to identify route
    conversionTrigger: 0.25,  // Time to switch coverage
    pursuitAngleCalc: 0.15    // Time to calculate pursuit
  };

  // Pattern matching triggers
  private readonly PATTERN_MATCH_RULES = {
    verticalDepth: 12,     // Yards before converting to man
    insideBreakDistance: 3, // Yards for inside handoff
    outsideBreakDistance: 3, // Yards for outside handoff
    seamTriggerDepth: 8,    // Depth to trigger seam coverage
    crossoverDepth: 10      // Depth for crossing routes
  };

  /**
   * Calculate fluid zone drop path for defender
   */
  calculateZoneDrop(
    defender: Player,
    zone: Zone,
    los: number,
    elapsedTime: number
  ): { position: Vector2D, velocity: Vector2D, technique: string } {
    const dropPhase = this.getDropPhase(elapsedTime);
    const targetPosition = this.getZoneCenter(zone, los);

    let technique = 'backpedal';
    let position = { ...defender.position };
    let velocity = { x: 0, y: 0 };

    switch (dropPhase) {
      case 'initial':
        // Initial backpedal with eyes on QB
        technique = 'backpedal';
        velocity = this.calculateBackpedalVelocity(defender, targetPosition);
        break;

      case 'transition':
        // Transition to zone with hips open
        technique = 'hip-turn';
        velocity = this.calculateTransitionVelocity(defender, targetPosition);
        break;

      case 'settle':
        // Settling in zone, reading QB
        technique = 'zone-settle';
        velocity = this.calculateSettleVelocity(defender, targetPosition);
        break;

      case 'pattern-match':
        // Ready for pattern matching
        technique = 'pattern-read';
        velocity = this.calculatePatternMatchVelocity(defender, targetPosition);
        break;
    }

    // Apply velocity with proper deceleration
    position.x += velocity.x * 0.016; // 60fps tick
    position.y += velocity.y * 0.016;

    return { position, velocity, technique };
  }

  /**
   * Handle zone handoff mechanics between defenders
   */
  handleZoneHandoff(
    defender: Player,
    receiver: Player,
    otherDefenders: Player[],
    zone: Zone
  ): { shouldHandoff: boolean, newResponsibility?: CoverageResponsibility } {
    const distance = this.calculateDistance(defender.position, receiver.position);
    const receiverDepth = Math.abs(receiver.position.y - defender.position.y);

    // Check if receiver is leaving zone
    const leavingZone = this.isLeavingZone(receiver, zone);
    if (!leavingZone) return { shouldHandoff: false };

    // Find potential defender to hand off to
    const handoffTarget = this.findHandoffTarget(
      receiver,
      otherDefenders,
      defender
    );

    if (!handoffTarget) return { shouldHandoff: false };

    // Apply 3-yard rule
    if (distance <= this.PATTERN_MATCH_RULES.insideBreakDistance) {
      // Inside break - pass off to inside defender
      if (this.isInsideDefender(handoffTarget, defender)) {
        return {
          shouldHandoff: true,
          newResponsibility: this.maintainZoneResponsibility(zone)
        };
      }
    } else if (distance <= this.PATTERN_MATCH_RULES.outsideBreakDistance) {
      // Outside break - may convert to man
      if (receiverDepth >= this.PATTERN_MATCH_RULES.verticalDepth) {
        return {
          shouldHandoff: false,
          newResponsibility: this.convertToManCoverage(receiver.id)
        };
      }
    }

    return { shouldHandoff: false };
  }

  /**
   * Calculate pattern matching trigger
   */
  shouldTriggerPatternMatch(
    defender: Player,
    receiver: Player,
    route: { waypoints: Vector2D[] },
    elapsedTime: number
  ): boolean {
    // Check vertical stem
    if (route.waypoints.length > 1) {
      const currentWaypoint = this.getCurrentWaypoint(route.waypoints, elapsedTime);
      const depth = Math.abs(currentWaypoint.y - defender.position.y);

      if (depth >= this.PATTERN_MATCH_RULES.verticalDepth) {
        // Receiver running vertical - trigger pattern match
        return true;
      }
    }

    // Check for seam threat
    const isSeam = this.isSeamRoute(receiver.position, route.waypoints);
    if (isSeam && Math.abs(receiver.position.y - defender.position.y) >= this.PATTERN_MATCH_RULES.seamTriggerDepth) {
      return true;
    }

    return false;
  }

  /**
   * Calculate pursuit angle for zone defender
   */
  calculatePursuitAngle(
    defender: Player,
    ballCarrier: Player,
    predictedPath?: Vector2D[]
  ): { angle: number, speed: number, technique: string } {
    const distance = this.calculateDistance(defender.position, ballCarrier.position);

    // Calculate intercept point
    const interceptPoint = this.calculateInterceptPoint(
      defender,
      ballCarrier,
      predictedPath
    );

    // Calculate angle to intercept
    const angle = Math.atan2(
      interceptPoint.y - defender.position.y,
      interceptPoint.x - defender.position.x
    );

    // Determine pursuit technique
    let technique = 'zone-pursuit';
    let speed = defender.maxSpeed * 0.9; // Controlled speed

    if (distance < 10) {
      technique = 'close-pursuit';
      speed = defender.maxSpeed; // Full speed
    } else if (distance > 20) {
      technique = 'deep-pursuit';
      speed = defender.maxSpeed * 0.85; // Maintain leverage
    }

    return { angle, speed, technique };
  }

  /**
   * Apply zone integrity rules
   */
  maintainZoneIntegrity(
    defenders: Player[],
    zones: Map<string, Zone>,
    offensivePlayers: Player[]
  ): Map<string, Vector2D> {
    const adjustments = new Map<string, Vector2D>();

    // Check for zone vacancies
    zones.forEach((zone, defenderId) => {
      const defender = defenders.find(d => d.id === defenderId);
      if (!defender) return;

      // Check if zone is threatened
      const threats = this.getZoneThreats(zone, offensivePlayers);

      if (threats.length === 0) {
        // No threats - maintain optimal position
        const optimal = this.getZoneCenter(zone, 30);
        if (this.calculateDistance(defender.position, optimal) > 3) {
          adjustments.set(defenderId, optimal);
        }
      } else if (threats.length === 1) {
        // Single threat - leverage position
        const leveragePos = this.calculateLeveragePosition(
          zone,
          threats[0],
          defender
        );
        adjustments.set(defenderId, leveragePos);
      } else {
        // Multiple threats - split difference
        const splitPos = this.calculateSplitPosition(zone, threats);
        adjustments.set(defenderId, splitPos);
      }
    });

    // Ensure no gaps between zones
    this.preventZoneGaps(defenders, zones, adjustments);

    return adjustments;
  }

  /**
   * Calculate smooth zone transitions
   */
  calculateZoneTransition(
    defender: Player,
    fromZone: Zone,
    toZone: Zone,
    transitionTime: number
  ): { position: Vector2D, velocity: Vector2D } {
    const fromCenter = this.getZoneCenter(fromZone, 30);
    const toCenter = this.getZoneCenter(toZone, 30);

    // Use easing function for smooth transition
    const t = this.easeInOutCubic(Math.min(transitionTime / 1.5, 1));

    const position = {
      x: fromCenter.x + (toCenter.x - fromCenter.x) * t,
      y: fromCenter.y + (toCenter.y - fromCenter.y) * t
    };

    const velocity = {
      x: (toCenter.x - fromCenter.x) / 1.5,
      y: (toCenter.y - fromCenter.y) / 1.5
    };

    return { position, velocity };
  }

  // Private helper methods

  private getDropPhase(elapsedTime: number): string {
    if (elapsedTime < this.MOVEMENT_TIMING.initialDrop) {
      return 'initial';
    } else if (elapsedTime < this.MOVEMENT_TIMING.zoneSettle) {
      return 'transition';
    } else if (elapsedTime < this.MOVEMENT_TIMING.zoneSettle + 0.5) {
      return 'settle';
    } else {
      return 'pattern-match';
    }
  }

  private getZoneCenter(zone: Zone, los: number): Vector2D {
    return {
      x: zone.center.x,
      y: los + (zone.depth || 10)
    };
  }

  private calculateBackpedalVelocity(defender: Player, target: Vector2D): Vector2D {
    const dx = target.x - defender.position.x;
    const dy = target.y - defender.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Backpedal speed is about 70% of max speed
    const speed = defender.maxSpeed * 0.7;

    return {
      x: (dx / distance) * speed * 0.3, // Lateral movement is slower
      y: (dy / distance) * speed
    };
  }

  private calculateTransitionVelocity(defender: Player, target: Vector2D): Vector2D {
    const dx = target.x - defender.position.x;
    const dy = target.y - defender.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Transition speed is about 85% of max
    const speed = defender.maxSpeed * 0.85;

    return {
      x: (dx / distance) * speed * 0.6, // More lateral movement
      y: (dy / distance) * speed
    };
  }

  private calculateSettleVelocity(defender: Player, target: Vector2D): Vector2D {
    const dx = target.x - defender.position.x;
    const dy = target.y - defender.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      // Close to zone center - minimal movement
      return { x: dx * 0.2, y: dy * 0.2 };
    }

    // Settling speed
    const speed = defender.maxSpeed * 0.4;

    return {
      x: (dx / distance) * speed,
      y: (dy / distance) * speed
    };
  }

  private calculatePatternMatchVelocity(defender: Player, target: Vector2D): Vector2D {
    // Ready position - minimal drift
    const dx = target.x - defender.position.x;
    const dy = target.y - defender.position.y;

    return {
      x: dx * 0.1,
      y: dy * 0.1
    };
  }

  private calculateDistance(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isLeavingZone(player: Player, zone: Zone): boolean {
    const distance = this.calculateDistance(player.position, zone.center);
    const maxDistance = Math.max(zone.width, zone.height) / 2;

    return distance > maxDistance * 1.2; // 20% buffer
  }

  private findHandoffTarget(
    receiver: Player,
    defenders: Player[],
    currentDefender: Player
  ): Player | undefined {
    return defenders.find(d =>
      d.id !== currentDefender.id &&
      d.coverageResponsibility?.type === 'zone' &&
      this.calculateDistance(d.position, receiver.position) < 10
    );
  }

  private isInsideDefender(defender1: Player, defender2: Player): boolean {
    return Math.abs(defender1.position.x - this.FIELD_CENTER) <
           Math.abs(defender2.position.x - this.FIELD_CENTER);
  }

  private maintainZoneResponsibility(zone: Zone): CoverageResponsibility {
    return {
      defenderId: '',
      type: 'zone',
      zone: { ...zone }
    };
  }

  private convertToManCoverage(targetId: string): CoverageResponsibility {
    return {
      defenderId: '',
      type: 'man',
      target: targetId
    };
  }

  private getCurrentWaypoint(waypoints: Vector2D[], elapsedTime: number): Vector2D {
    // Simplified - would need route timing data
    const index = Math.min(
      Math.floor(elapsedTime / 0.5),
      waypoints.length - 1
    );
    return waypoints[index];
  }

  private isSeamRoute(position: Vector2D, waypoints: Vector2D[]): boolean {
    if (waypoints.length < 2) return false;

    // Check if route goes vertical between hashes
    const isVertical = waypoints[waypoints.length - 1].y - waypoints[0].y > 15;
    const betweenHashes = position.x > this.HASH_LEFT && position.x < this.HASH_RIGHT;

    return isVertical && betweenHashes;
  }

  private calculateInterceptPoint(
    defender: Player,
    ballCarrier: Player,
    predictedPath?: Vector2D[]
  ): Vector2D {
    // Calculate where defender can intercept ball carrier
    const defenderSpeed = defender.maxSpeed;
    const carrierSpeed = ballCarrier.currentSpeed || ballCarrier.maxSpeed * 0.8;

    // Simple intercept calculation
    const distance = this.calculateDistance(defender.position, ballCarrier.position);
    const timeToIntercept = distance / (defenderSpeed - carrierSpeed);

    if (predictedPath && predictedPath.length > 0) {
      // Use predicted path if available
      const pathIndex = Math.min(
        Math.floor(timeToIntercept),
        predictedPath.length - 1
      );
      return predictedPath[pathIndex];
    }

    // Estimate based on current velocity
    return {
      x: ballCarrier.position.x + (ballCarrier.velocity?.x || 0) * timeToIntercept,
      y: ballCarrier.position.y + (ballCarrier.velocity?.y || 0) * timeToIntercept
    };
  }

  private getZoneThreats(zone: Zone, offensivePlayers: Player[]): Player[] {
    return offensivePlayers.filter(player => {
      const distance = this.calculateDistance(player.position, zone.center);
      return distance < Math.max(zone.width, zone.height);
    });
  }

  private calculateLeveragePosition(
    zone: Zone,
    threat: Player,
    defender: Player
  ): Vector2D {
    // Position between threat and endzone
    const leverageY = threat.position.y + 2;
    const leverageX = threat.position.x + (threat.position.x < this.FIELD_CENTER ? -1 : 1);

    return {
      x: Math.max(zone.center.x - zone.width/2, Math.min(zone.center.x + zone.width/2, leverageX)),
      y: Math.max(zone.center.y - zone.height/2, Math.min(zone.center.y + zone.height/2, leverageY))
    };
  }

  private calculateSplitPosition(zone: Zone, threats: Player[]): Vector2D {
    // Average position of all threats
    const avgX = threats.reduce((sum, t) => sum + t.position.x, 0) / threats.length;
    const avgY = threats.reduce((sum, t) => sum + t.position.y, 0) / threats.length;

    return {
      x: Math.max(zone.center.x - zone.width/2, Math.min(zone.center.x + zone.width/2, avgX)),
      y: Math.max(zone.center.y - zone.height/2, Math.min(zone.center.y + zone.height/2, avgY))
    };
  }

  private preventZoneGaps(
    defenders: Player[],
    zones: Map<string, Zone>,
    adjustments: Map<string, Vector2D>
  ): void {
    // Ensure zones overlap properly
    const sortedDefenders = [...defenders].sort((a, b) => a.position.x - b.position.x);

    for (let i = 0; i < sortedDefenders.length - 1; i++) {
      const current = sortedDefenders[i];
      const next = sortedDefenders[i + 1];

      const gap = next.position.x - current.position.x;
      const maxGap = 15; // Maximum allowed gap

      if (gap > maxGap) {
        // Adjust positions to close gap
        const midpoint = (current.position.x + next.position.x) / 2;

        adjustments.set(current.id, {
          ...current.position,
          x: midpoint - maxGap / 2
        });

        adjustments.set(next.id, {
          ...next.position,
          x: midpoint + maxGap / 2
        });
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}