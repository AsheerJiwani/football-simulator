import type {
  HotRoute,
  SightAdjustment,
  HotRouteSystem,
  RouteType,
  CoverageType,
  Player,
  GameState,
  Vector2D,
  Route
} from './types';

/**
 * Hot Routes and Sight Adjustments System
 * Implements NFL-realistic route adjustments based on defensive alignment and pressure
 */
export class HotRoutesSystem {
  private hotRoutePatterns: Partial<Record<RouteType, HotRoute[]>> = {
    // Basic hot routes vs blitz
    'slant': [
      { trigger: 'blitz', fromRoute: 'slant', toRoute: 'slant', timing: 1.2, depth: 3 }
    ],
    'flat': [
      { trigger: 'blitz', fromRoute: 'flat', toRoute: 'flat', timing: 1.2, depth: 2 }
    ],
    'go': [
      { trigger: 'blitz', fromRoute: 'go', toRoute: 'quick_hitch', timing: 1.5, depth: 6 },
      { trigger: 'coverage', fromRoute: 'go', toRoute: 'comeback', timing: 2.2, depth: 14 }
    ],
    'curl': [
      { trigger: 'blitz', fromRoute: 'curl', toRoute: 'quick_hitch', timing: 1.5, depth: 6 }
    ],
    'out': [
      { trigger: 'blitz', fromRoute: 'out', toRoute: 'speed_out', timing: 1.5, depth: 6 }
    ],
    'in': [
      { trigger: 'blitz', fromRoute: 'in', toRoute: 'slant', timing: 1.2, depth: 3 }
    ],
    'post': [
      { trigger: 'blitz', fromRoute: 'post', toRoute: 'quick_hitch', timing: 1.5, depth: 6 }
    ],
    'comeback': [
      { trigger: 'blitz', fromRoute: 'comeback', toRoute: 'quick_hitch', timing: 1.5, depth: 6 }
    ],
    'fade': [
      { trigger: 'coverage', fromRoute: 'fade', toRoute: 'comeback', timing: 2.2, depth: 14 }
    ],
    'hitch': [
      { trigger: 'blitz', fromRoute: 'hitch', toRoute: 'quick_hitch', timing: 1.2, depth: 4 }
    ],
    'wheel': [
      { trigger: 'blitz', fromRoute: 'wheel', toRoute: 'flat', timing: 1.2, depth: 2 }
    ],
    'corner': [
      { trigger: 'blitz', fromRoute: 'corner', toRoute: 'speed_out', timing: 1.5, depth: 6 }
    ],
    'dig': [
      { trigger: 'blitz', fromRoute: 'dig', toRoute: 'slant', timing: 1.2, depth: 3 }
    ],
    // Advanced routes
    'mesh_cross': [],
    'speed_out': [],
    'seam': [
      { trigger: 'blitz', fromRoute: 'seam', toRoute: 'quick_hitch', timing: 1.5, depth: 6 }
    ],
    'option_in_out': [],
    'choice_break': [],
    'delayed_drag': [],
    'bootleg_comeback': [],
    'quick_hitch': []
  };

  private sightAdjustments: SightAdjustment[] = [
    // Cover 3 adjustments - Attack underneath zones, avoid deep safeties
    {
      coverage: 'cover-3',
      receiverPosition: 'outside',
      adjustment: { routeType: 'comeback', depthChange: -2, breakDirection: 'in' }
    },
    {
      coverage: 'cover-3',
      receiverPosition: 'slot',
      adjustment: { routeType: 'seam', depthChange: 3, breakDirection: 'up' }
    },
    {
      coverage: 'cover-3',
      receiverPosition: 'tight',
      adjustment: { routeType: 'drag', depthChange: -1, breakDirection: 'in' }
    },

    // Cover 2 adjustments - Attack deep middle hole, corners underneath
    {
      coverage: 'cover-2',
      receiverPosition: 'outside',
      adjustment: { routeType: 'corner', depthChange: 5, breakDirection: 'out' }
    },
    {
      coverage: 'cover-2',
      receiverPosition: 'slot',
      adjustment: { routeType: 'seam', depthChange: 8, breakDirection: 'up' }
    },
    {
      coverage: 'cover-2',
      receiverPosition: 'tight',
      adjustment: { routeType: 'drag', depthChange: 1, breakDirection: 'out' }
    },

    // Cover 1 adjustments - Beat single safety with speed and vertical routes
    {
      coverage: 'cover-1',
      receiverPosition: 'outside',
      adjustment: { routeType: 'fade', depthChange: 3, breakDirection: 'out' }
    },
    {
      coverage: 'cover-1',
      receiverPosition: 'slot',
      adjustment: { routeType: 'seam', depthChange: 2, breakDirection: 'up' }
    },
    {
      coverage: 'cover-1',
      receiverPosition: 'tight',
      adjustment: { routeType: 'corner', depthChange: 4, breakDirection: 'out' }
    },

    // Cover 4/Quarters adjustments - Attack collision points
    {
      coverage: 'cover-4',
      receiverPosition: 'outside',
      adjustment: { routeType: 'comeback', depthChange: -1, breakDirection: 'in' }
    },
    {
      coverage: 'cover-4',
      receiverPosition: 'slot',
      adjustment: { routeType: 'option_in_out', depthChange: 0, breakDirection: 'in' }
    },
    {
      coverage: 'cover-4',
      receiverPosition: 'tight',
      adjustment: { routeType: 'seam', depthChange: 2, breakDirection: 'up' }
    },

    // Cover 0 adjustments - Quick game only vs blitz
    {
      coverage: 'cover-0',
      receiverPosition: 'outside',
      adjustment: { routeType: 'slant', depthChange: -3, breakDirection: 'in' }
    },
    {
      coverage: 'cover-0',
      receiverPosition: 'slot',
      adjustment: { routeType: 'quick_hitch', depthChange: -2, breakDirection: 'in' }
    },
    {
      coverage: 'cover-0',
      receiverPosition: 'tight',
      adjustment: { routeType: 'flat', depthChange: -4, breakDirection: 'out' }
    },

    // Cover 6 adjustments - Attack weak side, avoid strong side bracket
    {
      coverage: 'cover-6',
      receiverPosition: 'outside',
      adjustment: { routeType: 'comeback', depthChange: 0, breakDirection: 'in' }
    },
    {
      coverage: 'cover-6',
      receiverPosition: 'slot',
      adjustment: { routeType: 'drag', depthChange: -1, breakDirection: 'weak' }
    },
    {
      coverage: 'cover-6',
      receiverPosition: 'tight',
      adjustment: { routeType: 'seam', depthChange: 3, breakDirection: 'up' }
    },

    // Tampa 2 adjustments - Attack Mike hole, avoid Tampa linebacker
    {
      coverage: 'tampa-2',
      receiverPosition: 'outside',
      adjustment: { routeType: 'corner', depthChange: 3, breakDirection: 'out' }
    },
    {
      coverage: 'tampa-2',
      receiverPosition: 'slot',
      adjustment: { routeType: 'comeback', depthChange: -2, breakDirection: 'in' }
    },
    {
      coverage: 'tampa-2',
      receiverPosition: 'tight',
      adjustment: { routeType: 'drag', depthChange: 0, breakDirection: 'out' }
    }
  ];

  private hotRouteSystem: HotRouteSystem = {
    blitzDetection: {
      triggerCount: 6, // In 7-defender system, 6 rushers = blitz
      autoConvert: ['go', 'post', 'corner', 'comeback', 'curl'],
      timingReduction: 1.5 // Reduce available time by 1.5 seconds
    },
    coverageAudibles: {
      preSnapReads: ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4'],
      routeConversions: {
        'cover-3': {
          'go': 'comeback',
          'post': 'seam',
          'corner': 'speed_out'
        },
        'cover-2': {
          'slant': 'seam',
          'curl': 'corner',
          'hitch': 'speed_out'
        },
        'cover-1': {
          'slant': 'fade',
          'out': 'corner'
        },
        'cover-4': {
          'go': 'option_in_out',
          'post': 'choice_break'
        },
        'cover-0': {}, // No coverage adjustments needed vs all-out blitz
        'cover-6': {},
        'quarters': {},
        'tampa-2': {},
        'cover-1-bracket': {},
        'cover-1-robber': {},
        'cover-1-lurk': {},
        'cover-2-roll-to-1': {},
        'quarters-poach': {},
        'cover-2-invert': {}
      } as Record<CoverageType, Partial<Record<RouteType, RouteType>>>
    }
  };

  /**
   * Detect if blitz conditions are met
   */
  public detectBlitz(gameState: GameState): boolean {
    const defenders = gameState.players.filter(p => p.team === 'defense');
    const blitzers = defenders.filter(p =>
      p.coverageResponsibility?.type === 'blitz'
    ).length;

    return blitzers >= this.hotRouteSystem.blitzDetection.triggerCount;
  }

  /**
   * Get hot route adjustment for a specific route vs pressure
   */
  public getHotRoute(fromRoute: RouteType, trigger: 'blitz' | 'coverage' | 'pressure'): HotRoute | null {
    const availableHotRoutes = this.hotRoutePatterns[fromRoute];
    if (!availableHotRoutes) return null;

    return availableHotRoutes.find(hr => hr.trigger === trigger) || null;
  }

  /**
   * Apply sight adjustment based on coverage and receiver position
   */
  public applySightAdjustment(
    player: Player,
    coverage: CoverageType,
    receiverPosition: 'outside' | 'slot' | 'tight'
  ): Route | null {
    const adjustment = this.sightAdjustments.find(sa =>
      sa.coverage === coverage && sa.receiverPosition === receiverPosition
    );

    if (!adjustment) return null;

    // Generate adjusted route
    return this.generateAdjustedRoute(player, adjustment);
  }

  /**
   * Auto-convert routes based on blitz detection
   */
  public autoConvertForBlitz(players: Player[]): Player[] {
    const convertedPlayers = [...players];

    convertedPlayers.forEach(player => {
      if (player.team === 'offense' && player.route &&
          this.hotRouteSystem.blitzDetection.autoConvert.includes(player.route.type)) {

        const hotRoute = this.getHotRoute(player.route.type, 'blitz');
        if (hotRoute) {
          player.route = this.generateRouteFromType(hotRoute.toRoute, player.position);
        }
      }
    });

    return convertedPlayers;
  }

  /**
   * Get timing adjustment for pressure situations
   */
  public getPressureTimingAdjustment(hasBlitz: boolean): number {
    return hasBlitz ? this.hotRouteSystem.blitzDetection.timingReduction : 0;
  }

  /**
   * Generate adjusted route based on sight adjustment
   */
  private generateAdjustedRoute(player: Player, adjustment: SightAdjustment): Route {
    if (!player.route) throw new Error('Player has no route to adjust');

    const baseRoute = player.route;
    const adjustedWaypoints = baseRoute.waypoints.map(wp => ({
      x: wp.x,
      y: wp.y + adjustment.adjustment.depthChange
    }));

    return {
      type: adjustment.adjustment.routeType,
      waypoints: adjustedWaypoints,
      timing: baseRoute.timing,
      depth: baseRoute.depth + adjustment.adjustment.depthChange
    };
  }

  /**
   * Generate route from route type (simplified version)
   */
  private generateRouteFromType(routeType: RouteType, startPos: Vector2D): Route {
    const routeTemplates: Record<RouteType, Partial<Route>> = {
      'slant': {
        waypoints: [{ x: 0, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 2 }],
        timing: [0, 0.6, 1.8],
        depth: 3
      },
      'quick_hitch': {
        waypoints: [{ x: 0, y: 0 }, { x: 0, y: 4 }, { x: 0, y: 2 }],
        timing: [0, 1.2, 1.5],
        depth: 4
      },
      'speed_out': {
        waypoints: [{ x: 0, y: 0 }, { x: 6, y: 6 }],
        timing: [0, 1.5],
        depth: 6
      },
      'seam': {
        waypoints: [{ x: 0, y: 0 }, { x: 2, y: 25 }],
        timing: [0, 3.5],
        depth: 25
      },
      'comeback': {
        waypoints: [{ x: 0, y: 0 }, { x: 14, y: 0 }, { x: 12, y: 2 }],
        timing: [0, 2.0, 2.2],
        depth: 14
      },
      'corner': {
        waypoints: [{ x: 0, y: 0 }, { x: 8, y: 12 }, { x: 15, y: 18 }],
        timing: [0, 2.0, 2.8],
        depth: 18
      },
      'fade': {
        waypoints: [{ x: 0, y: 0 }, { x: 18, y: 2 }, { x: 25, y: 4 }],
        timing: [0, 2.3, 2.6],
        depth: 18
      },
      'flat': {
        waypoints: [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 6, y: 0 }],
        timing: [0, 0.4, 1.8],
        depth: 2
      },
      // Default patterns for other routes
      'go': { waypoints: [{ x: 0, y: 0 }, { x: 20, y: 0 }], timing: [0, 3.5], depth: 25 },
      'curl': { waypoints: [{ x: 0, y: 0 }, { x: 11, y: 0 }, { x: 9, y: -2 }], timing: [0, 1.9, 2.2], depth: 11 },
      'out': { waypoints: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 8 }], timing: [0, 2.0, 2.2], depth: 12 },
      'in': { waypoints: [{ x: 0, y: 0 }, { x: 11, y: 0 }, { x: 11, y: -8 }], timing: [0, 1.9, 2.2], depth: 11 },
      'post': { waypoints: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: -6 }], timing: [0, 1.9, 2.2], depth: 12 },
      'hitch': { waypoints: [{ x: 0, y: 0 }, { x: 0, y: 6 }, { x: 0, y: 4 }], timing: [0, 1.5, 1.8], depth: 6 },
      'wheel': { waypoints: [{ x: 0, y: 0 }, { x: 8, y: 3 }, { x: 8, y: 20 }], timing: [0, 1.5, 3.0], depth: 20 },
      'dig': { waypoints: [{ x: 0, y: 0 }, { x: 11, y: 0 }, { x: 11, y: -8 }], timing: [0, 1.9, 2.2], depth: 11 },
      // Advanced routes (basic implementations)
      'mesh_cross': { waypoints: [{ x: 0, y: 0 }, { x: 8, y: 8 }], timing: [0, 1.8], depth: 8 },
      'option_in_out': { waypoints: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 6 }], timing: [0, 1.5, 2.0], depth: 8 },
      'choice_break': { waypoints: [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 12, y: 0 }], timing: [0, 1.5, 2.0], depth: 8 },
      'delayed_drag': { waypoints: [{ x: 0, y: 0 }, { x: -8, y: 8 }], timing: [0, 2.0], depth: 8 },
      'bootleg_comeback': { waypoints: [{ x: 0, y: 0 }, { x: -3, y: 15 }], timing: [0, 2.8], depth: 15 },
      'drag': { waypoints: [{ x: 0, y: 0 }, { x: 2, y: 3 }, { x: -6, y: 3 }], timing: [0, 1.0, 2.2], depth: 3 }
    };

    const template = routeTemplates[routeType];
    if (!template) {
      throw new Error(`No template found for route type: ${routeType}`);
    }

    return {
      type: routeType,
      waypoints: template.waypoints || [],
      timing: template.timing || [0],
      depth: template.depth || 0
    };
  }

  /**
   * Check if route should be auto-converted vs coverage
   */
  public shouldAutoConvert(routeType: RouteType, coverage: CoverageType): RouteType | null {
    const conversions = this.hotRouteSystem.coverageAudibles.routeConversions[coverage];
    return conversions?.[routeType] || null;
  }

  /**
   * Apply automatic sight adjustments for all receivers based on coverage and formation
   */
  public applyAutomaticSightAdjustments(
    players: Player[],
    coverage: CoverageType,
    formationStrength: 'left' | 'right' | 'balanced'
  ): Player[] {
    const updatedPlayers = [...players];
    const eligibleReceivers = updatedPlayers.filter(p =>
      p.team === 'offense' && p.isEligible && p.playerType !== 'QB' && p.route
    );

    eligibleReceivers.forEach(receiver => {
      const receiverPosition = this.classifyReceiverPosition(receiver, formationStrength);
      const adjustment = this.sightAdjustments.find(sa =>
        sa.coverage === coverage && sa.receiverPosition === receiverPosition
      );

      if (adjustment) {
        const adjustedRoute = this.generateAdjustedRoute(receiver, adjustment);
        receiver.route = adjustedRoute;
      }
    });

    return updatedPlayers;
  }

  /**
   * Get quarterback pre-snap read progression based on coverage
   */
  public getQBReadProgression(
    coverage: CoverageType,
    formationStrength: 'left' | 'right' | 'balanced'
  ): {
    primaryRead: 'slot' | 'outside' | 'tight';
    secondaryRead: 'slot' | 'outside' | 'tight';
    checkDown: 'slot' | 'outside' | 'tight' | 'RB';
    timing: number[];
  } {
    const progressions = {
      'cover-1': {
        primaryRead: 'outside', // Attack single safety
        secondaryRead: 'slot',
        checkDown: 'RB',
        timing: [1.8, 2.5, 3.2]
      },
      'cover-2': {
        primaryRead: 'slot', // Attack middle hole
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.2, 2.8, 3.5]
      },
      'cover-3': {
        primaryRead: 'slot', // Underneath window
        secondaryRead: 'tight',
        checkDown: 'outside',
        timing: [1.8, 2.4, 3.0]
      },
      'cover-4': {
        primaryRead: 'slot', // Pattern match opportunity
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.0, 2.6, 3.2]
      },
      'cover-0': {
        primaryRead: 'slot', // Quick game
        secondaryRead: 'tight',
        checkDown: 'RB',
        timing: [1.2, 1.6, 2.0]
      },
      'cover-6': {
        primaryRead: formationStrength === 'right' ? 'outside' : 'slot', // Attack weak side
        secondaryRead: 'tight',
        checkDown: 'RB',
        timing: [2.0, 2.6, 3.2]
      },
      'quarters': {
        primaryRead: 'slot',
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.0, 2.6, 3.2]
      },
      'tampa-2': {
        primaryRead: 'outside', // Attack corners
        secondaryRead: 'tight',
        checkDown: 'slot',
        timing: [2.2, 2.8, 3.5]
      },
      'cover-1-bracket': {
        primaryRead: 'outside',
        secondaryRead: 'slot',
        checkDown: 'RB',
        timing: [1.8, 2.5, 3.2]
      },
      'cover-1-robber': {
        primaryRead: 'outside',
        secondaryRead: 'slot',
        checkDown: 'RB',
        timing: [1.8, 2.5, 3.2]
      },
      'cover-1-lurk': {
        primaryRead: 'outside',
        secondaryRead: 'slot',
        checkDown: 'RB',
        timing: [1.8, 2.5, 3.2]
      },
      'cover-2-roll-to-1': {
        primaryRead: 'slot',
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.2, 2.8, 3.5]
      },
      'quarters-poach': {
        primaryRead: 'slot',
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.0, 2.6, 3.2]
      },
      'cover-2-invert': {
        primaryRead: 'slot',
        secondaryRead: 'outside',
        checkDown: 'tight',
        timing: [2.2, 2.8, 3.5]
      }
    };

    return (progressions as any)[coverage] || progressions['cover-3'];
  }

  /**
   * Classify receiver position more accurately based on formation
   */
  private classifyReceiverPosition(
    receiver: Player,
    formationStrength: 'left' | 'right' | 'balanced'
  ): 'outside' | 'slot' | 'tight' {
    const fieldCenter = 26.665;
    const distanceFromCenter = Math.abs(receiver.position.x - fieldCenter);

    // Tight End identification
    if (receiver.playerType === 'TE') {
      return 'tight';
    }

    // Outside receiver - beyond numbers
    if (distanceFromCenter > 12) {
      return 'outside';
    }

    // Slot receiver - between numbers and center
    if (distanceFromCenter > 6 && distanceFromCenter <= 12) {
      return 'slot';
    }

    // Default to slot for close to center
    return 'slot';
  }
}