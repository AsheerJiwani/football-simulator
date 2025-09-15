import type { Player, Vector2D, Route, RouteType } from './types';

// Research-based NFL receiver movement mechanics
export interface ReceiversMovementConfig {
  // Break angles (degrees)
  breakAngles: Record<RouteType, number>;

  // Speed transition phases
  speedTransitions: {
    acceleration: {
      offLine: { multiplier: number; duration: number };
      stem: { multiplier: number; duration: number };
      fullSpeed: { multiplier: number };
    };
    deceleration: {
      preBreak: { multiplier: number; duration: number };
      plantStep: { multiplier: number; duration: number };
      postBreak: { multiplier: number; duration: number };
    };
  };

  // Timing windows for QB-WR synchronization
  timingWindows: {
    rhythm: number; // 1.8s - quick game
    read: number;   // 2.2s - intermediate
    extended: number; // 2.6s - deep/scramble
  };

  // Route-specific movement data
  routeData: Record<RouteType, {
    steps: number;
    depth: number;
    breakAngle: number;
    timing: number;
    speedPattern: 'accelerate-plant-explode' | 'accelerate-decelerate-cut' | 'accelerate-maintain' | 'accelerate-decelerate-comeback' | 'accelerate-stop-return' | 'accelerate-decelerate-break' | 'accelerate-decelerate-return' | 'accelerate-plant-angle' | 'accelerate-maintain-adjust' | 'accelerate-cut-accelerate' | 'accelerate-plant-drive' | 'quick-cut-accelerate' | 'delay-accelerate-drag' | 'accelerate-plant-return';
    leverage: 'attack_inside_shoulder' | 'threaten_vertical_first' | 'sit_in_hole' | 'stack_defender' | 'create_separation_at_top' | 'sell_post_first' | 'sell_corner_first' | 'attack_cushion' | 'stack_outside_shoulder' | 'sell_flat_first' | 'threaten_seam' | 'immediate_width' | 'read_leverage' | 'find_soft_spot' | 'delay_pattern' | 'backside_comeback' | 'immediate_availability';
  }>;
}

export const NFL_RECEIVER_CONFIG: ReceiversMovementConfig = {
  breakAngles: {
    'slant': 45,
    'out': 90,
    'in': 90,
    'curl': 45,
    'comeback': 45,
    'post': 45,
    'fade': 15,
    'go': 0,
    'flat': 90,
    'hitch': 180,
    'wheel': 90,
    'corner': 45,
    'dig': 90,
    'mesh_cross': 90,
    'speed_out': 90,
    'seam': 0,
    'option_in_out': 90,
    'choice_break': 45,
    'delayed_drag': 90,
    'bootleg_comeback': 45,
    'quick_hitch': 180,
    'drag': 90
  },

  speedTransitions: {
    acceleration: {
      offLine: { multiplier: 0.6, duration: 0.3 },
      stem: { multiplier: 0.85, duration: 0.8 },
      fullSpeed: { multiplier: 1.0 }
    },
    deceleration: {
      preBreak: { multiplier: 0.7, duration: 0.2 },
      plantStep: { multiplier: 0.4, duration: 0.1 },
      postBreak: { multiplier: 0.8, duration: 0.3 }
    }
  },

  timingWindows: {
    rhythm: 1.8,
    read: 2.2,
    extended: 2.6
  },

  routeData: {
    'slant': {
      steps: 3,
      depth: 3,
      breakAngle: 45,
      timing: 1.8,
      speedPattern: 'accelerate-plant-explode',
      leverage: 'attack_inside_shoulder'
    },
    'out': {
      steps: 12,
      depth: 12,
      breakAngle: 90,
      timing: 2.2,
      speedPattern: 'accelerate-decelerate-cut',
      leverage: 'threaten_vertical_first'
    },
    'curl': {
      steps: 11,
      depth: 11,
      breakAngle: 45,
      timing: 2.2,
      speedPattern: 'accelerate-decelerate-comeback',
      leverage: 'sit_in_hole'
    },
    'go': {
      steps: 20,
      depth: 20,
      breakAngle: 0,
      timing: 1.8,
      speedPattern: 'accelerate-maintain',
      leverage: 'stack_defender'
    },
    'comeback': {
      steps: 14,
      depth: 14,
      breakAngle: 45,
      timing: 2.2,
      speedPattern: 'accelerate-decelerate-return',
      leverage: 'create_separation_at_top'
    },
    'post': {
      steps: 12,
      depth: 12,
      breakAngle: 45,
      timing: 2.2,
      speedPattern: 'accelerate-plant-angle',
      leverage: 'threaten_seam'
    },
    'fade': {
      steps: 18,
      depth: 18,
      breakAngle: 15,
      timing: 2.6,
      speedPattern: 'accelerate-maintain-adjust',
      leverage: 'stack_outside_shoulder'
    },
    'flat': {
      steps: 2,
      depth: 2,
      breakAngle: 90,
      timing: 1.8,
      speedPattern: 'quick-cut-accelerate',
      leverage: 'immediate_width'
    },
    'in': {
      steps: 11,
      depth: 11,
      breakAngle: 90,
      timing: 2.2,
      speedPattern: 'accelerate-plant-drive',
      leverage: 'threaten_seam'
    },
    'hitch': {
      steps: 7,
      depth: 7,
      breakAngle: 180,
      timing: 1.8,
      speedPattern: 'accelerate-stop-return',
      leverage: 'attack_cushion'
    },
    'wheel': {
      steps: 16,
      depth: 16,
      breakAngle: 90,
      timing: 2.6,
      speedPattern: 'accelerate-cut-accelerate',
      leverage: 'sell_flat_first'
    },
    'corner': {
      steps: 14,
      depth: 14,
      breakAngle: 45,
      timing: 2.2,
      speedPattern: 'accelerate-decelerate-break',
      leverage: 'sell_post_first'
    },
    'dig': {
      steps: 13,
      depth: 13,
      breakAngle: 90,
      timing: 2.2,
      speedPattern: 'accelerate-plant-drive',
      leverage: 'threaten_seam'
    },
    'mesh_cross': {
      steps: 8,
      depth: 4,
      breakAngle: 90,
      timing: 1.8,
      speedPattern: 'accelerate-plant-explode',
      leverage: 'attack_inside_shoulder'
    },
    'speed_out': {
      steps: 8,
      depth: 8,
      breakAngle: 90,
      timing: 1.8,
      speedPattern: 'accelerate-plant-explode',
      leverage: 'immediate_width'
    },
    'seam': {
      steps: 18,
      depth: 18,
      breakAngle: 0,
      timing: 2.2,
      speedPattern: 'accelerate-maintain',
      leverage: 'stack_defender'
    },
    'option_in_out': {
      steps: 10,
      depth: 10,
      breakAngle: 90,
      timing: 2.0,
      speedPattern: 'accelerate-decelerate-cut',
      leverage: 'read_leverage'
    },
    'choice_break': {
      steps: 12,
      depth: 12,
      breakAngle: 45,
      timing: 2.2,
      speedPattern: 'accelerate-decelerate-break',
      leverage: 'find_soft_spot'
    },
    'delayed_drag': {
      steps: 6,
      depth: 2,
      breakAngle: 90,
      timing: 2.5,
      speedPattern: 'delay-accelerate-drag',
      leverage: 'delay_pattern'
    },
    'bootleg_comeback': {
      steps: 12,
      depth: 12,
      breakAngle: 45,
      timing: 2.4,
      speedPattern: 'accelerate-decelerate-return',
      leverage: 'backside_comeback'
    },
    'quick_hitch': {
      steps: 5,
      depth: 5,
      breakAngle: 180,
      timing: 1.6,
      speedPattern: 'accelerate-plant-return',
      leverage: 'immediate_availability'
    },
    'drag': {
      steps: 3,
      depth: 3,
      breakAngle: 90,
      timing: 2.2,
      speedPattern: 'delay-accelerate-drag',
      leverage: 'find_soft_spot'
    }
  }
};

export interface ReceiverState {
  routePhase: 'acceleration' | 'stem' | 'pre-break' | 'break' | 'post-break' | 'completion';
  currentSpeedMultiplier: number;
  phaseTimeElapsed: number;
  hasExecutedBreak: boolean;
  breakPoint?: Vector2D;
  stemDirection?: Vector2D;
  leverageAdjustment: Vector2D;
  separationTechnique?: 'speed-cut' | 'plant-and-cut' | 'stacking';
}

export class ReceiverMovement {
  private config: ReceiversMovementConfig;
  private receiverStates: Map<string, ReceiverState> = new Map();

  constructor(config?: Partial<ReceiversMovementConfig>) {
    this.config = { ...NFL_RECEIVER_CONFIG, ...config };
  }

  public initializeReceiver(player: Player): void {
    if (!player.route) return;

    const routeData = this.config.routeData[player.route.type];
    if (!routeData) return;

    const state: ReceiverState = {
      routePhase: 'acceleration',
      currentSpeedMultiplier: this.config.speedTransitions.acceleration.offLine.multiplier,
      phaseTimeElapsed: 0,
      hasExecutedBreak: false,
      leverageAdjustment: { x: 0, y: 0 },
      separationTechnique: this.getSeparationTechnique(player.route.type)
    };

    this.receiverStates.set(player.id, state);
  }

  private getSeparationTechnique(routeType: RouteType): 'speed-cut' | 'plant-and-cut' | 'stacking' {
    const fastBreakRoutes: RouteType[] = ['slant', 'flat'];
    const plantRoutes: RouteType[] = ['out', 'in', 'curl', 'comeback'];

    if (fastBreakRoutes.includes(routeType)) return 'speed-cut';
    if (plantRoutes.includes(routeType)) return 'plant-and-cut';
    return 'stacking';
  }

  public updateReceiverMovement(
    player: Player,
    deltaTime: number,
    timeElapsed: number,
    defenderPositions?: Player[]
  ): Vector2D {
    if (!player.route) return player.position;

    const state = this.receiverStates.get(player.id);
    if (!state) {
      this.initializeReceiver(player);
      return player.position;
    }

    const routeData = this.config.routeData[player.route.type];
    state.phaseTimeElapsed += deltaTime;

    // Update route phase based on timing
    this.updateRoutePhase(state, timeElapsed, routeData);

    // Calculate target position with enhanced mechanics
    const basePosition = this.getRoutePosition(player, timeElapsed);

    // Apply leverage adjustments if defenders are nearby
    const adjustedPosition = this.applyLeverageAdjustment(basePosition, state, defenderPositions);

    // Apply speed-based movement with proper break mechanics
    return this.executeMovement(player, adjustedPosition, state, deltaTime);
  }

  private updateRoutePhase(state: ReceiverState, timeElapsed: number, routeData: any): void {
    const offLineTime = this.config.speedTransitions.acceleration.offLine.duration;
    const stemTime = this.config.speedTransitions.acceleration.stem.duration;
    const preBreakTime = this.config.speedTransitions.deceleration.preBreak.duration;

    if (timeElapsed <= offLineTime) {
      state.routePhase = 'acceleration';
      state.currentSpeedMultiplier = this.config.speedTransitions.acceleration.offLine.multiplier;
    } else if (timeElapsed <= offLineTime + stemTime) {
      state.routePhase = 'stem';
      state.currentSpeedMultiplier = this.config.speedTransitions.acceleration.stem.multiplier;
    } else if (timeElapsed >= routeData.timing - preBreakTime && !state.hasExecutedBreak) {
      state.routePhase = 'pre-break';
      state.currentSpeedMultiplier = this.config.speedTransitions.deceleration.preBreak.multiplier;
    } else if (timeElapsed >= routeData.timing && !state.hasExecutedBreak) {
      state.routePhase = 'break';
      state.currentSpeedMultiplier = this.config.speedTransitions.deceleration.plantStep.multiplier;
      state.hasExecutedBreak = true;
    } else if (state.hasExecutedBreak && timeElapsed <= routeData.timing + this.config.speedTransitions.deceleration.postBreak.duration) {
      state.routePhase = 'post-break';
      state.currentSpeedMultiplier = this.config.speedTransitions.deceleration.postBreak.multiplier;
    } else {
      state.routePhase = 'completion';
      state.currentSpeedMultiplier = this.config.speedTransitions.acceleration.fullSpeed.multiplier;
    }
  }

  private getRoutePosition(player: Player, timeElapsed: number): Vector2D {
    if (!player.route || !player.route.waypoints) return player.position;

    // Enhanced route calculation with precise break points
    const waypoints = player.route.waypoints;
    const timing = player.route.timing;

    if (timeElapsed <= 0) return waypoints[0] || player.position;
    if (timeElapsed >= timing[timing.length - 1]) return waypoints[waypoints.length - 1] || player.position;

    // Find current segment
    let segmentIndex = 0;
    for (let i = 0; i < timing.length - 1; i++) {
      if (timeElapsed >= timing[i] && timeElapsed <= timing[i + 1]) {
        segmentIndex = i;
        break;
      }
    }

    const startTime = timing[segmentIndex];
    const endTime = timing[segmentIndex + 1];
    const progress = (timeElapsed - startTime) / (endTime - startTime);

    const startPos = waypoints[segmentIndex];
    const endPos = waypoints[segmentIndex + 1];

    // Linear interpolation with enhanced break mechanics
    return {
      x: startPos.x + (endPos.x - startPos.x) * progress,
      y: startPos.y + (endPos.y - startPos.y) * progress
    };
  }

  private applyLeverageAdjustment(
    basePosition: Vector2D,
    state: ReceiverState,
    defenderPositions?: Player[]
  ): Vector2D {
    if (!defenderPositions || defenderPositions.length === 0) {
      return basePosition;
    }

    // Only apply leverage adjustments during early route phases
    if (state.routePhase !== 'acceleration' && state.routePhase !== 'stem') {
      return basePosition;
    }

    // Find closest defender
    let closestDefender: Player | null = null;
    let closestDistance = Infinity;

    for (const defender of defenderPositions) {
      const distance = Math.sqrt(
        Math.pow(defender.position.x - basePosition.x, 2) +
        Math.pow(defender.position.y - basePosition.y, 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestDefender = defender;
      }
    }

    if (!closestDefender || closestDistance > 5) {
      return basePosition;
    }

    // Apply stem adjustments based on defender leverage
    const defenderLeverage = this.determineDefenderLeverage(basePosition, closestDefender.position);
    const stemAdjustment = this.calculateStemAdjustment(defenderLeverage, state);

    return {
      x: basePosition.x + stemAdjustment.x,
      y: basePosition.y + stemAdjustment.y
    };
  }

  private determineDefenderLeverage(receiverPos: Vector2D, defenderPos: Vector2D): 'inside' | 'outside' | 'head-up' {
    const xDiff = defenderPos.x - receiverPos.x;
    const fieldCenter = 26.665;

    if (Math.abs(xDiff) < 1) {
      return 'head-up';
    }

    // Inside leverage = defender between receiver and middle of field
    if (receiverPos.x < fieldCenter) {
      return xDiff > 0 ? 'inside' : 'outside';
    } else {
      return xDiff < 0 ? 'inside' : 'outside';
    }
  }

  private calculateStemAdjustment(leverage: 'inside' | 'outside' | 'head-up', state: ReceiverState): Vector2D {
    const stemAmount = 1.5; // yards

    switch (leverage) {
      case 'inside':
        // Stem outside to neutralize inside leverage
        return { x: stemAmount, y: 0 };
      case 'outside':
        // Stem inside to neutralize outside leverage
        return { x: -stemAmount, y: 0 };
      case 'head-up':
        // Create leverage based on route concept
        return { x: 0.5, y: 0 }; // Slight movement to create space
      default:
        return { x: 0, y: 0 };
    }
  }

  private executeMovement(
    player: Player,
    targetPosition: Vector2D,
    state: ReceiverState,
    deltaTime: number
  ): Vector2D {
    const baseSpeed = player.maxSpeed * state.currentSpeedMultiplier;
    const distance = Math.sqrt(
      Math.pow(targetPosition.x - player.position.x, 2) +
      Math.pow(targetPosition.y - player.position.y, 2)
    );

    if (distance < 0.1) return targetPosition;

    // Apply separation technique effects
    const speed = this.applySeparationTechnique(baseSpeed, state, distance);
    const frameDistance = speed * deltaTime;

    if (frameDistance >= distance) {
      return targetPosition;
    }

    const direction = {
      x: (targetPosition.x - player.position.x) / distance,
      y: (targetPosition.y - player.position.y) / distance
    };

    return {
      x: player.position.x + direction.x * frameDistance,
      y: player.position.y + direction.y * frameDistance
    };
  }

  private applySeparationTechnique(
    baseSpeed: number,
    state: ReceiverState,
    distanceToTarget: number
  ): number {
    switch (state.separationTechnique) {
      case 'speed-cut':
        // Maintain speed through cuts
        if (state.routePhase === 'break') return baseSpeed * 0.95;
        return baseSpeed;

      case 'plant-and-cut':
        // Significant deceleration for sharp cuts
        if (state.routePhase === 'break') return baseSpeed * 0.4;
        if (state.routePhase === 'post-break') return baseSpeed * 1.1; // Explosive acceleration
        return baseSpeed;

      case 'stacking':
        // Consistent speed with slight acceleration when gaining leverage
        if (distanceToTarget < 2 && state.routePhase === 'completion') return baseSpeed * 1.05;
        return baseSpeed;

      default:
        return baseSpeed;
    }
  }

  public getRouteTiming(routeType: RouteType): number {
    return this.config.routeData[routeType]?.timing || 2.2;
  }

  public getBreakAngle(routeType: RouteType): number {
    return this.config.breakAngles[routeType] || 45;
  }

  public reset(): void {
    this.receiverStates.clear();
  }
}