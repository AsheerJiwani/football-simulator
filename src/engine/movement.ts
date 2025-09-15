import type { Player, Vector2D, Coverage } from './types';
import { Bezier } from '@/lib/math';

export interface MovementConfig {
  pressCushion: number;
  offCushion: number;
  bailCushion: number;
  trailDistance: number;
  cushionBreakThreshold: number;
  cushionThreatThreshold: number;
  breakReactionDelay: number;
  backpedalSpeedRatio: number;
  controlPedalRatio: number;
  speedPedalRatio: number;
  zoneDropSpeedRatio: number;
  hipFlipDuration: number;
  patternMatchTriggerTime: number;
  rallyAngle: number;
  jamWindow: number;
  jamSuccessRate: number;
  rerouteDistance: number;
}

export const DEFAULT_MOVEMENT_CONFIG: MovementConfig = {
  pressCushion: 1.0,
  offCushion: 7.5,  // NFL standard off-man depth
  bailCushion: 10.0, // Deep zone bail technique
  trailDistance: 1.5,
  cushionBreakThreshold: 2.0,  // Hip turn trigger
  cushionThreatThreshold: 3.0, // Speed pedal trigger
  breakReactionDelay: 0.3,  // Elite DB reaction time
  backpedalSpeedRatio: 0.55, // 55% of forward speed
  controlPedalRatio: 0.75,   // Control pedal speed
  speedPedalRatio: 1.0,      // Full speed when threatened
  zoneDropSpeedRatio: 0.85,
  hipFlipDuration: 0.25,
  patternMatchTriggerTime: 1.25,
  rallyAngle: 45,
  jamWindow: 0.5,  // Press jam timing window
  jamSuccessRate: 0.7, // 70% success rate
  rerouteDistance: 2.0, // Push receiver outside
};

export interface DefenderState {
  technique: 'press' | 'off' | 'bail' | 'trail' | 'zone' | 'blitz';
  leverage: 'inside' | 'outside' | 'head-up';
  pedalType: 'control' | 'speed' | 'sprint';
  isBackpedaling: boolean;
  isTransitioning: boolean;
  transitionTimeLeft: number;
  reactionTimeLeft: number;
  hasReactedToBreak: boolean;
  cushionDistance: number;
  currentCushion: number;
  targetPosition?: Vector2D;
  assignedReceiver?: string;
  zoneResponsibility?: string;
  hasSafetyHelp: boolean;
  jamAttempted?: boolean;
  visionFocus?: 'receiver_hips' | 'quarterback_eyes' | 'zone_scan';
}

export class DefensiveMovement {
  private config: MovementConfig;
  private defenderStates: Map<string, DefenderState> = new Map();

  constructor(config?: Partial<MovementConfig>) {
    this.config = { ...DEFAULT_MOVEMENT_CONFIG, ...config };
  }

  public initializeDefender(
    defender: Player,
    coverage: Coverage,
    assignedReceiver?: Player
  ): void {
    // Determine if defender has safety help for leverage decisions
    const hasSafetyHelp = this.checkSafetyHelp(defender, coverage);

    const state: DefenderState = {
      technique: this.determineTechnique(defender, coverage),
      leverage: this.determineLeverage(defender, assignedReceiver, hasSafetyHelp),
      pedalType: 'control', // Start with control pedal
      isBackpedaling: defender.coverageResponsibility?.type === 'zone' || this.shouldBackpedal(defender),
      isTransitioning: false,
      transitionTimeLeft: 0,
      reactionTimeLeft: 0,
      hasReactedToBreak: false,
      cushionDistance: this.getInitialCushion(defender, coverage),
      currentCushion: this.getInitialCushion(defender, coverage),
      assignedReceiver: assignedReceiver?.id,
      zoneResponsibility: defender.coverageAssignment,
      hasSafetyHelp,
      jamAttempted: false,
      visionFocus: defender.coverageResponsibility?.type === 'man' ? 'receiver_hips' : 'quarterback_eyes'
    };

    this.defenderStates.set(defender.id, state);
  }

  private determineTechnique(defender: Player, coverage: Coverage): DefenderState['technique'] {
    if (defender.coverageAssignment === 'blitz') return 'blitz';

    // Check if defender has zone responsibility
    if (defender.coverageResponsibility?.type === 'zone') {
      // Deep zones use bail technique
      if (defender.coverageResponsibility.zone?.name?.includes('deep')) {
        return 'bail';
      }
      return 'zone';
    }

    // Man coverage techniques based on coverage and position
    if (coverage.name === 'Cover 0') {
      return 'press'; // Always press in Cover 0
    } else if (coverage.name === 'Cover 1') {
      return defender.playerType === 'CB' ? 'press' : 'off';
    }

    return 'off';
  }

  private determineLeverage(defender: Player, receiver?: Player, hasSafetyHelp?: boolean): DefenderState['leverage'] {
    if (!receiver) return 'head-up';

    const fieldCenter = 26.665; // Center of field
    const receiverTowardsBoundary = Math.abs(receiver.position.x - fieldCenter) > 15;

    // NFL leverage rules based on help
    if (hasSafetyHelp) {
      // With safety help, take outside leverage to funnel receiver inside
      return 'outside';
    } else {
      // Without safety help, take inside leverage to protect deep
      if (receiverTowardsBoundary) {
        // Near boundary, can use sideline as extra defender
        return 'inside';
      }
      return 'inside';
    }
  }

  private shouldBackpedal(defender: Player): boolean {
    return defender.playerType === 'CB' || defender.playerType === 'S';
  }

  private getInitialCushion(defender: Player, coverage: Coverage): number {
    const technique = this.determineTechnique(defender, coverage);

    if (technique === 'press') return this.config.pressCushion;
    if (technique === 'bail') return this.config.bailCushion;
    if (technique === 'zone') return 8.0;

    if (defender.playerType === 'LB') return 7.0;

    return this.config.offCushion;
  }

  // Check if defender has safety help for leverage decisions
  private checkSafetyHelp(defender: Player, coverage: Coverage): boolean {
    // Cover 2, Cover 3, Cover 4, Tampa 2 provide safety help
    const helpCoverages = ['Cover 2', 'Cover 3', 'Cover 4', 'Tampa 2', 'Quarters'];

    // Cover 0 and man-only Cover 1 have no deep help
    if (coverage.name === 'Cover 0') return false;
    if (coverage.name === 'Cover 1' && defender.playerType === 'CB') return false;

    return helpCoverages.includes(coverage.name || '');
  }

  // Update cushion management based on threat assessment
  private updateCushionManagement(state: DefenderState, separation: number): void {
    if (separation <= this.config.cushionBreakThreshold) {
      // Cushion broken - need to turn and run
      state.pedalType = 'sprint';
      state.isBackpedaling = false;
    } else if (separation <= this.config.cushionThreatThreshold) {
      // Cushion threatened - speed pedal
      state.pedalType = 'speed';
    } else {
      // Comfortable cushion - control pedal
      state.pedalType = 'control';
    }
  }

  // Apply jam effect (doesn't prevent catches, just affects positioning)
  private applyJamEffect(receiver: Player): void {
    // Jam reroutes receiver but QB can still throw to them
    // This only affects the receiver's route efficiency, not catchability
    if (receiver.velocity) {
      receiver.velocity.x *= 0.8; // Slight disruption
      // Note: receiver remains eligible and catchable
    }
  }

  public updateManCoverage(
    defender: Player,
    receiver: Player,
    deltaTime: number
  ): Vector2D {
    const state = this.defenderStates.get(defender.id);
    if (!state) return defender.position;

    const separation = this.calculateSeparation(defender.position, receiver.position);
    const receiverSpeed = this.calculateSpeed(receiver.velocity);

    if (state.reactionTimeLeft > 0) {
      state.reactionTimeLeft -= deltaTime;
      return defender.position;
    }

    if (this.hasReceiverBroken(receiver) && !state.hasReactedToBreak) {
      state.reactionTimeLeft = this.config.breakReactionDelay;
      state.hasReactedToBreak = true;
      state.isTransitioning = true;
      state.transitionTimeLeft = this.config.hipFlipDuration;
      return defender.position;
    }

    if (state.isTransitioning) {
      state.transitionTimeLeft -= deltaTime;
      if (state.transitionTimeLeft <= 0) {
        state.isTransitioning = false;
        state.isBackpedaling = false;
        state.technique = 'trail';
      }
    }

    if (state.technique === 'press' && separation <= this.config.pressCushion) {
      return this.maintainPress(defender, receiver, state);
    }

    if (state.technique === 'off' && separation <= this.config.cushionBreakThreshold) {
      state.technique = 'trail';
      state.isBackpedaling = false;
      state.isTransitioning = true;
      state.transitionTimeLeft = this.config.hipFlipDuration;
    }

    if (state.technique === 'trail') {
      return this.maintainTrail(defender, receiver, state);
    }

    return this.maintainCushion(defender, receiver, state);
  }

  private calculateSeparation(pos1: Vector2D, pos2: Vector2D): number {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateSpeed(velocity: Vector2D): number {
    return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
  }

  private hasReceiverBroken(receiver: Player): boolean {
    if (!receiver.route || !receiver.route.points) return false;

    const currentSegmentIndex = receiver.routeSegmentIndex || 0;
    const hasBreakPoint = receiver.route.points.some(p => p.isBreak);

    return hasBreakPoint && currentSegmentIndex > 0;
  }

  private maintainPress(
    defender: Player,
    receiver: Player,
    state: DefenderState
  ): Vector2D {
    const leverageOffset = state.leverage === 'inside' ? -1 : 1;

    return {
      x: receiver.position.x + leverageOffset,
      y: receiver.position.y - this.config.pressCushion,
    };
  }

  private maintainTrail(
    defender: Player,
    receiver: Player,
    state: DefenderState
  ): Vector2D {
    const direction = this.normalizeVector({
      x: receiver.velocity.x,
      y: receiver.velocity.y,
    });

    const leverageOffset = state.leverage === 'inside' ? -0.5 : 0.5;

    return {
      x: receiver.position.x + leverageOffset - direction.x * this.config.trailDistance,
      y: receiver.position.y - direction.y * this.config.trailDistance,
    };
  }

  private maintainCushion(
    defender: Player,
    receiver: Player,
    state: DefenderState
  ): Vector2D {
    const leverageOffset = state.leverage === 'inside' ? -1 : 1;
    const cushion = state.cushionDistance;

    return {
      x: receiver.position.x + leverageOffset,
      y: receiver.position.y - cushion,
    };
  }

  private normalizeVector(vec: Vector2D): Vector2D {
    const magnitude = Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    if (magnitude === 0) return { x: 0, y: 0 };
    return { x: vec.x / magnitude, y: vec.y / magnitude };
  }

  public getMovementSpeed(defender: Player, baseSpeed: number): number {
    const state = this.defenderStates.get(defender.id);
    if (!state) return baseSpeed;

    if (state.isTransitioning) {
      return baseSpeed * 0.5;
    }

    if (state.isBackpedaling) {
      return baseSpeed * this.config.backpedalSpeedRatio;
    }

    if (state.technique === 'zone') {
      return baseSpeed * this.config.zoneDropSpeedRatio;
    }

    return baseSpeed;
  }

  public updateZoneCoverage(
    defender: Player,
    zoneLandmark: Vector2D,
    deltaTime: number,
    ball?: Player
  ): Vector2D {
    const state = this.defenderStates.get(defender.id);
    if (!state) return defender.position;

    state.targetPosition = zoneLandmark;

    if (ball && ball.hasBall) {
      const ballDistance = this.calculateSeparation(defender.position, ball.position);
      if (ballDistance < 10) {
        return this.rallyToBall(defender, ball, state);
      }
    }

    const distanceToLandmark = this.calculateSeparation(defender.position, zoneLandmark);
    if (distanceToLandmark < 1) {
      state.isBackpedaling = false;
      return zoneLandmark;
    }

    // Use Bezier curve for smooth movement
    const speed = this.getMovementSpeed(defender, defender.speed || 8.0);
    const frameDistance = speed * deltaTime;

    if (distanceToLandmark > 5) {
      // Use smooth curve for longer movements
      const path = Bezier.createSmoothPath(defender.position, zoneLandmark, 10);
      const segmentLength = distanceToLandmark / path.length;
      const stepsToMove = Math.min(Math.floor(frameDistance / segmentLength), path.length - 1);
      return path[Math.max(1, stepsToMove)];
    } else {
      // Direct movement for short distances
      return this.moveTowardsTarget(defender.position, zoneLandmark, speed * deltaTime);
    }
  }

  private rallyToBall(defender: Player, ball: Player, state: DefenderState): Vector2D {
    const angle = Math.atan2(
      ball.position.y - defender.position.y,
      ball.position.x - defender.position.x
    );

    const rallyAngleRad = (this.config.rallyAngle * Math.PI) / 180;
    const adjustedAngle = angle + (defender.position.x > ball.position.x ? rallyAngleRad : -rallyAngleRad);

    const targetX = ball.position.x + Math.cos(adjustedAngle) * 2;
    const targetY = ball.position.y + Math.sin(adjustedAngle) * 2;

    return { x: targetX, y: targetY };
  }

  private moveTowardsTarget(current: Vector2D, target: Vector2D, speed: number): Vector2D {
    const direction = {
      x: target.x - current.x,
      y: target.y - current.y,
    };

    const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (distance < 0.1) return target;

    const normalized = this.normalizeVector(direction);
    const frameDistance = speed / 60;

    if (frameDistance >= distance) {
      return target;
    }

    return {
      x: current.x + normalized.x * frameDistance,
      y: current.y + normalized.y * frameDistance,
    };
  }

  public reset(): void {
    this.defenderStates.clear();
  }
}