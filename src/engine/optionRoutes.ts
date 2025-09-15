import type {
  Player,
  Vector2D,
  Route,
  RouteType,
  CoverageType
} from './types';

/**
 * Option Routes System
 * Implements NFL-style choice routes where receivers make decisions based on coverage
 */
export class OptionRoutesSystem {

  /**
   * Decision point for option routes (8 yards from LOS)
   */
  private readonly DECISION_POINT_DEPTH = 8;

  /**
   * Choice route decision matrix
   */
  private choiceRouteDecisions: Record<string, {
    vsMan: { leverageInside: RouteType; leverageOutside: RouteType; },
    vsZone: { openArea: RouteType; defenderPosition: RouteType; }
  }> = {
    'slot_option': {
      vsMan: {
        leverageInside: 'out',      // Break out if defender has inside leverage
        leverageOutside: 'in'       // Break in if defender has outside leverage
      },
      vsZone: {
        openArea: 'choice_break',   // Find soft spot in zone
        defenderPosition: 'hitch'   // Sit in hole away from defender
      }
    },
    'outside_option': {
      vsMan: {
        leverageInside: 'corner',   // Up and out vs inside leverage
        leverageOutside: 'comeback' // Come back vs outside leverage
      },
      vsZone: {
        openArea: 'option_in_out',  // Read the safety
        defenderPosition: 'fade'    // Go vertical if safety jumps
      }
    }
  };

  /**
   * Option route triggers based on coverage
   */
  private optionTriggers = {
    'cover-1': {
      slotReads: ['find_soft_spot_vs_zone', 'use_leverage_vs_man'],
      outsideReads: ['attack_safety_help', 'use_speed_advantage'],
      timing: 2.0
    },
    'cover-2': {
      slotReads: ['attack_seam_vs_safeties', 'sit_in_hole'],
      outsideReads: ['corner_route_vs_cb_jump', 'comeback_vs_safety'],
      timing: 2.2
    },
    'cover-3': {
      slotReads: ['seam_through_coverage', 'find_window_underneath'],
      outsideReads: ['comeback_under_safety', 'speed_out_vs_cb'],
      timing: 1.8
    },
    'cover-4': {
      slotReads: ['option_based_on_lb', 'attack_collision_point'],
      outsideReads: ['read_safety_rotation', 'exploit_pattern_match'],
      timing: 2.0
    },
    'cover-0': {
      slotReads: ['quick_game_only', 'use_natural_leverage'],
      outsideReads: ['fade_vs_press', 'slant_vs_off'],
      timing: 1.5
    },
    'cover-6': {
      slotReads: ['read_split_coverage', 'attack_weak_side'],
      outsideReads: ['identify_coverage_side', 'adjust_accordingly'],
      timing: 2.0
    },
    'quarters': {
      slotReads: ['seam_adjustment', 'underneath_option'],
      outsideReads: ['pattern_match_awareness', 'leverage_decision'],
      timing: 2.0
    },
    'tampa-2': {
      slotReads: ['avoid_mike_drop', 'attack_hole'],
      outsideReads: ['corner_vs_cb_sink', 'comeback_timing'],
      timing: 2.2
    },
    'cover-1-bracket': {
      slotReads: ['find_soft_spot_vs_zone', 'use_leverage_vs_man'],
      outsideReads: ['attack_safety_help', 'use_speed_advantage'],
      timing: 2.0
    },
    'cover-1-robber': {
      slotReads: ['find_soft_spot_vs_zone', 'use_leverage_vs_man'],
      outsideReads: ['attack_safety_help', 'use_speed_advantage'],
      timing: 2.0
    },
    'cover-1-lurk': {
      slotReads: ['find_soft_spot_vs_zone', 'use_leverage_vs_man'],
      outsideReads: ['attack_safety_help', 'use_speed_advantage'],
      timing: 2.0
    },
    'cover-2-roll-to-1': {
      slotReads: ['attack_seam_vs_safeties', 'sit_in_hole'],
      outsideReads: ['corner_route_vs_cb_jump', 'comeback_vs_safety'],
      timing: 2.2
    },
    'quarters-poach': {
      slotReads: ['seam_adjustment', 'underneath_option'],
      outsideReads: ['pattern_match_awareness', 'leverage_decision'],
      timing: 2.0
    },
    'cover-2-invert': {
      slotReads: ['attack_seam_vs_safeties', 'sit_in_hole'],
      outsideReads: ['corner_route_vs_cb_jump', 'comeback_vs_safety'],
      timing: 2.2
    }
  } as const;

  /**
   * Evaluate option route decision for a receiver
   */
  public evaluateOptionRoute(
    receiver: Player,
    nearestDefender: Player,
    coverage: CoverageType,
    timeElapsed: number
  ): RouteType | null {

    if (!receiver.route || timeElapsed < this.DECISION_POINT_DEPTH / 9.0) {
      return null; // Too early to make decision
    }

    // Determine receiver position type
    const receiverType = this.classifyReceiverPosition(receiver);

    // Get decision matrix for this receiver type
    const decisionMatrix = this.choiceRouteDecisions[receiverType];
    if (!decisionMatrix) return null;

    // Determine if facing man or zone coverage
    const isManCoverage = this.isManCoverage(nearestDefender);

    if (isManCoverage) {
      const leverage = this.getDefenderLeverage(receiver, nearestDefender);
      return leverage === 'inside'
        ? decisionMatrix.vsMan.leverageInside
        : decisionMatrix.vsMan.leverageOutside;
    } else {
      // Zone coverage - find soft spot
      const hasOpenArea = this.findOpenArea(receiver, nearestDefender);
      return hasOpenArea
        ? decisionMatrix.vsZone.openArea
        : decisionMatrix.vsZone.defenderPosition;
    }
  }

  /**
   * Update route waypoints based on option decision
   */
  public updateRouteForOption(
    receiver: Player,
    newRouteType: RouteType,
    currentPosition: Vector2D
  ): Route {

    const baseRoute = receiver.route!;

    // Create new waypoints starting from current position
    const newWaypoints = this.generateOptionWaypoints(
      newRouteType,
      currentPosition,
      receiver.position // original start position
    );

    return {
      type: newRouteType,
      waypoints: newWaypoints,
      timing: this.adjustTimingForOption(baseRoute.timing, newRouteType),
      depth: this.calculateNewDepth(newWaypoints)
    };
  }

  /**
   * Check if receiver should make option decision
   */
  public shouldMakeOptionDecision(
    receiver: Player,
    timeElapsed: number,
    coverage: CoverageType
  ): boolean {

    const trigger = this.optionTriggers[coverage as keyof typeof this.optionTriggers];
    if (!trigger) return false;

    // Check if we're at the decision point timing
    return timeElapsed >= trigger.timing && timeElapsed <= trigger.timing + 0.2;
  }

  /**
   * Get all available options for a receiver at decision point
   */
  public getAvailableOptions(
    receiver: Player,
    coverage: CoverageType
  ): RouteType[] {

    const receiverType = this.classifyReceiverPosition(receiver);
    const options: RouteType[] = [];

    const decisionMatrix = this.choiceRouteDecisions[receiverType];
    if (decisionMatrix) {
      options.push(
        decisionMatrix.vsMan.leverageInside,
        decisionMatrix.vsMan.leverageOutside,
        decisionMatrix.vsZone.openArea,
        decisionMatrix.vsZone.defenderPosition
      );
    }

    return [...new Set(options)]; // Remove duplicates
  }

  /**
   * Classify receiver position for decision making
   */
  private classifyReceiverPosition(receiver: Player): string {
    // Simplified classification - would be enhanced with formation analysis
    const fieldCenter = 26.665; // Half field width
    const distanceFromCenter = Math.abs(receiver.position.x - fieldCenter);

    if (distanceFromCenter < 8) {
      return 'slot_option';
    } else {
      return 'outside_option';
    }
  }

  /**
   * Determine if defender is in man coverage
   */
  private isManCoverage(defender: Player): boolean {
    return defender.coverageResponsibility?.type === 'man';
  }

  /**
   * Get defender leverage relative to receiver
   */
  private getDefenderLeverage(receiver: Player, defender: Player): 'inside' | 'outside' {
    const fieldCenter = 26.665;
    const receiverFromCenter = receiver.position.x - fieldCenter;
    const defenderFromCenter = defender.position.x - fieldCenter;

    // If defender is between receiver and center, he has inside leverage
    if (Math.abs(defenderFromCenter) < Math.abs(receiverFromCenter)) {
      return 'inside';
    }
    return 'outside';
  }

  /**
   * Find open area in zone coverage
   */
  private findOpenArea(receiver: Player, defender: Player): boolean {
    const distance = Math.sqrt(
      Math.pow(receiver.position.x - defender.position.x, 2) +
      Math.pow(receiver.position.y - defender.position.y, 2)
    );

    // If defender is more than 6 yards away, consider it an open area
    return distance > 6;
  }

  /**
   * Generate waypoints for option route
   */
  private generateOptionWaypoints(
    routeType: RouteType,
    currentPos: Vector2D,
    originalStart: Vector2D
  ): Vector2D[] {

    const waypoints: Vector2D[] = [currentPos];

    switch (routeType) {
      case 'out':
        waypoints.push({ x: currentPos.x + 6, y: currentPos.y + 2 });
        break;
      case 'in':
        waypoints.push({ x: currentPos.x - 6, y: currentPos.y + 2 });
        break;
      case 'corner':
        waypoints.push(
          { x: currentPos.x + 3, y: currentPos.y + 6 },
          { x: currentPos.x + 8, y: currentPos.y + 12 }
        );
        break;
      case 'comeback':
        waypoints.push({ x: currentPos.x, y: currentPos.y - 3 });
        break;
      case 'hitch':
        waypoints.push({ x: currentPos.x, y: currentPos.y - 2 });
        break;
      case 'fade':
        waypoints.push({ x: currentPos.x + 2, y: currentPos.y + 10 });
        break;
      case 'choice_break':
        // Decision-based break (implementation would be more complex)
        waypoints.push({ x: currentPos.x + 4, y: currentPos.y + 2 });
        break;
      case 'option_in_out':
        // Read-based option (implementation would be more complex)
        waypoints.push({ x: currentPos.x + 5, y: currentPos.y + 1 });
        break;
      default:
        waypoints.push({ x: currentPos.x, y: currentPos.y + 3 });
    }

    return waypoints;
  }

  /**
   * Adjust timing for option routes
   */
  private adjustTimingForOption(originalTiming: number[], newRouteType: RouteType): number[] {
    const baseTime = originalTiming[originalTiming.length - 1] || 2.0;

    // Quick routes have faster timing
    const quickRoutes: RouteType[] = ['hitch', 'out', 'in', 'comeback'];
    const timingMultiplier = quickRoutes.includes(newRouteType) ? 0.8 : 1.2;

    return [0, baseTime * timingMultiplier];
  }

  /**
   * Calculate depth for new route
   */
  private calculateNewDepth(waypoints: Vector2D[]): number {
    if (waypoints.length < 2) return 0;

    const start = waypoints[0];
    const end = waypoints[waypoints.length - 1];

    return Math.abs(end.y - start.y);
  }
}