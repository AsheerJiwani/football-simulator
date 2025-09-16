import { Player, Vector2D, Motion, MotionType, CoverageType } from './types';

/**
 * NFL-authentic motion mechanics based on research
 * Implements realistic speeds, timing, and defensive responses
 */
export class MotionMechanics {
  private readonly FIELD_CENTER = 26.67;
  private readonly FIELD_WIDTH = 53.33;

  // NFL-researched motion speeds (yards per second)
  private readonly MOTION_SPEEDS = {
    jet: { base: 9.2, variance: 0.3 },      // Fastest - full speed across
    fly: { base: 9.0, variance: 0.5 },      // Fast across formation
    orbit: { base: 8.7, variance: 0.3 },    // Circular behind QB
    across: { base: 8.5, variance: 0.5 },   // Complete across formation
    glide: { base: 8.0, variance: 0.5 },    // Toward ball from outside
    return: { base: 8.0, variance: 0.5 },   // Out and back
    shift: { base: 6.5, variance: 1.0 }     // Position change with set
  };

  // Motion timing based on NFL research (seconds)
  private readonly MOTION_TIMING = {
    jet: { duration: 1.3, snapWindow: 0.2 },     // Snap just before QB
    fly: { duration: 1.4, snapWindow: 0.3 },     // At full speed
    orbit: { duration: 1.7, snapWindow: 0.5 },   // During circular path
    across: { duration: 2.0, snapWindow: 0.2 },  // After crossing
    glide: { duration: 1.2, snapWindow: 0.3 },   // Halfway to attachment
    return: { duration: 1.8, snapWindow: 0.4 },  // After returning
    shift: { duration: 1.2, setTime: 1.0 }       // Plus 1s set requirement
  };

  // Motion boost effects (applied at snap)
  private readonly MOTION_BOOST = {
    speedMultiplier: 1.09,  // 9% speed boost
    duration: 0.35,         // 0.35 seconds
    fadeTime: 0.1          // Gradual fade over 0.1s
  };

  /**
   * Calculate motion path based on type and player position
   */
  calculateMotionPath(
    player: Player,
    motionType: MotionType,
    los: number = 30
  ): { path: Vector2D[], duration: number, speed: number } {
    const startPos = { ...player.position };
    const speed = this.getMotionSpeed(motionType, player.playerType);
    const timing = this.MOTION_TIMING[motionType];

    let path: Vector2D[] = [];

    switch (motionType) {
      case 'jet':
        path = this.calculateJetMotion(startPos, los);
        break;
      case 'fly':
        path = this.calculateFlyMotion(startPos, los);
        break;
      case 'orbit':
        path = this.calculateOrbitMotion(startPos, los);
        break;
      case 'across':
        path = this.calculateAcrossMotion(startPos, los);
        break;
      case 'glide':
        path = this.calculateGlideMotion(startPos, los);
        break;
      case 'return':
        path = this.calculateReturnMotion(startPos, los);
        break;
      case 'shift':
        path = this.calculateShiftMotion(startPos, los);
        break;
    }

    return {
      path,
      duration: timing.duration,
      speed
    };
  }

  /**
   * Get coverage-specific motion response type
   */
  getCoverageMotionResponse(
    coverage: CoverageType,
    motionType: MotionType,
    crossesFormation: boolean
  ): string {
    const responses: Record<CoverageType, string> = {
      'cover-0': 'lock',           // Pure man - follow tight
      'cover-1': crossesFormation ? 'rock-roll' : 'lock',  // Exchange or follow
      'cover-2': crossesFormation ? 'robber' : 'bump',     // Safety rotation
      'cover-3': crossesFormation ? 'buzz' : 'sky',        // Rotation types
      'cover-4': 'pattern-match',  // Pattern matching rules
      'quarters': 'pattern-match',  // Same as Cover 4
      'cover-6': 'split-field',    // Weak side adjustment
      'tampa-2': 'mlb-adjust',     // MLB depth adjustment
      'cover-1-bracket': 'bracket-slide',
      'cover-1-robber': 'robber-trigger',
      'cover-1-lurk': 'lurk-adjust',
      'cover-2-roll-to-1': crossesFormation ? 'roll' : 'bump',  // Cover 2 rolling to Cover 1
      'quarters-poach': 'poach-trigger',
      'cover-2-invert': 'invert-roll'
    };

    return responses[coverage] || 'minimal';
  }

  /**
   * Apply motion boost to player at snap
   */
  applyMotionBoost(player: Player): void {
    if (!player.hasMotion) return;

    // Apply speed boost
    player.currentSpeed *= this.MOTION_BOOST.speedMultiplier;
    player.maxSpeed *= this.MOTION_BOOST.speedMultiplier;

    // Set boost timer
    player.motionBoostRemaining = this.MOTION_BOOST.duration;
  }

  /**
   * Update motion boost over time
   */
  updateMotionBoost(player: Player, deltaTime: number): void {
    if (!player.motionBoostRemaining || player.motionBoostRemaining <= 0) return;

    player.motionBoostRemaining -= deltaTime;

    // Gradually fade boost in last 0.1s
    if (player.motionBoostRemaining <= this.MOTION_BOOST.fadeTime) {
      const fadePercent = player.motionBoostRemaining / this.MOTION_BOOST.fadeTime;
      const boostReduction = (this.MOTION_BOOST.speedMultiplier - 1) * fadePercent;

      // Reset to base speed as boost fades
      const baseSpeed = this.getBaseSpeed(player.playerType);
      player.maxSpeed = baseSpeed * (1 + boostReduction);
    }

    // Remove boost when expired
    if (player.motionBoostRemaining <= 0) {
      player.motionBoostRemaining = undefined;
      const baseSpeed = this.getBaseSpeed(player.playerType);
      player.maxSpeed = player.isStar ? baseSpeed * 1.1 : baseSpeed;
    }
  }

  // Private path calculation methods

  private calculateJetMotion(start: Vector2D, los: number): Vector2D[] {
    // Jet sweep - fast across formation, snap before reaching QB
    const isRight = start.x > this.FIELD_CENTER;
    const qbX = this.FIELD_CENTER;

    return [
      start,
      { x: start.x + (isRight ? -5 : 5), y: los - 0.5 },  // Slight forward motion
      { x: qbX + (isRight ? -2 : 2), y: los - 0.5 },      // Near QB but not past
      { x: isRight ? 8 : 45, y: los }                      // Continue to edge
    ];
  }

  private calculateFlyMotion(start: Vector2D, los: number): Vector2D[] {
    // Straight across at full speed
    const isRight = start.x > this.FIELD_CENTER;
    const targetX = isRight ? 10 : 43;

    return [
      start,
      { x: this.FIELD_CENTER, y: start.y },  // Through center
      { x: targetX, y: start.y }             // To opposite side
    ];
  }

  private calculateOrbitMotion(start: Vector2D, los: number): Vector2D[] {
    // Circular path behind QB
    const isRight = start.x > this.FIELD_CENTER;
    const qbDepth = los - 5;  // QB in shotgun

    return [
      start,
      { x: start.x + (isRight ? -3 : 3), y: los - 2 },
      { x: this.FIELD_CENTER + (isRight ? -1 : 1), y: qbDepth - 2 },
      { x: this.FIELD_CENTER + (isRight ? -8 : 8), y: qbDepth - 1 },
      { x: isRight ? 18 : 35, y: los - 1 }
    ];
  }

  private calculateAcrossMotion(start: Vector2D, los: number): Vector2D[] {
    // Complete across formation
    const isRight = start.x > this.FIELD_CENTER;
    const targetX = isRight ? 5 : 48;

    return [
      start,
      { x: this.FIELD_CENTER, y: start.y },
      { x: targetX, y: start.y }
    ];
  }

  private calculateGlideMotion(start: Vector2D, los: number): Vector2D[] {
    // Glide toward ball from outside
    const isRight = start.x > this.FIELD_CENTER;
    const targetX = this.FIELD_CENTER + (isRight ? -3 : 3);

    return [
      start,
      { x: (start.x + targetX) / 2, y: los - 0.5 },
      { x: targetX, y: los }
    ];
  }

  private calculateReturnMotion(start: Vector2D, los: number): Vector2D[] {
    // Out and back
    const isRight = start.x > this.FIELD_CENTER;
    const outX = start.x + (isRight ? -8 : 8);

    return [
      start,
      { x: outX, y: start.y },
      { x: start.x + (isRight ? -2 : 2), y: start.y }  // Not quite original spot
    ];
  }

  private calculateShiftMotion(start: Vector2D, los: number): Vector2D[] {
    // Short position adjustment
    const isRight = start.x > this.FIELD_CENTER;
    const targetX = start.x + (isRight ? -5 : 5);

    return [
      start,
      { x: targetX, y: start.y }
    ];
  }

  private getMotionSpeed(motionType: MotionType, playerType: string): number {
    const speedConfig = this.MOTION_SPEEDS[motionType];
    const baseSpeed = speedConfig.base;
    const variance = speedConfig.variance;

    // Add slight randomization for realism
    const randomFactor = (Math.random() - 0.5) * variance;
    let speed = baseSpeed + randomFactor;

    // Adjust for player type
    if (playerType === 'RB' || playerType === 'WR') {
      speed *= 1.02;  // Slightly faster skill players
    } else if (playerType === 'TE' || playerType === 'FB') {
      speed *= 0.95;  // Slightly slower bigger players
    }

    return Math.max(6.0, Math.min(10.0, speed));
  }

  private getBaseSpeed(playerType: string): number {
    const speeds: Record<string, number> = {
      'QB': 7.5,
      'RB': 9.0,
      'WR': 9.2,
      'TE': 8.0,
      'FB': 7.8,
      'CB': 9.1,
      'S': 8.8,
      'LB': 8.3,
      'NB': 9.0
    };

    return speeds[playerType] || 8.5;
  }

  /**
   * Check if motion crosses formation center
   */
  doesMotionCrossFormation(motion: Motion): boolean {
    const startSide = motion.startPosition.x < this.FIELD_CENTER ? 'left' : 'right';
    const endSide = motion.endPosition.x < this.FIELD_CENTER ? 'left' : 'right';

    return startSide !== endSide;
  }

  /**
   * Calculate defensive response positions for motion
   */
  calculateDefensiveMotionResponse(
    coverage: CoverageType,
    motion: Motion,
    defenders: Player[],
    offensivePlayers: Player[]
  ): Map<string, Vector2D> {
    const adjustments = new Map<string, Vector2D>();
    const response = this.getCoverageMotionResponse(
      coverage,
      motion.type,
      this.doesMotionCrossFormation(motion)
    );

    switch (response) {
      case 'lock':
        this.calculateLockResponse(motion, defenders, adjustments);
        break;
      case 'rock-roll':
        this.calculateRockRollResponse(motion, defenders, adjustments);
        break;
      case 'buzz':
        this.calculateBuzzResponse(motion, defenders, adjustments);
        break;
      case 'robber':
        this.calculateRobberResponse(motion, defenders, adjustments);
        break;
      case 'pattern-match':
        this.calculatePatternMatchResponse(motion, defenders, offensivePlayers, adjustments);
        break;
      case 'split-field':
        this.calculateSplitFieldResponse(motion, defenders, adjustments);
        break;
      case 'mlb-adjust':
        this.calculateMLBAdjustment(motion, defenders, adjustments);
        break;
    }

    return adjustments;
  }

  private calculateLockResponse(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Find defender assigned to motion player
    const assignedDefender = defenders.find(d =>
      d.coverageResponsibility?.type === 'man' &&
      d.coverageResponsibility?.target === motion.playerId
    );

    if (assignedDefender) {
      // Follow with outside leverage
      const leverage = motion.endPosition.x < this.FIELD_CENTER ? -1.5 : 1.5;
      adjustments.set(assignedDefender.id, {
        x: motion.endPosition.x + leverage,
        y: motion.endPosition.y + 1
      });
    }
  }

  private calculateRockRollResponse(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Safeties exchange assignments
    const fs = defenders.find(d => d.id === 'FS');
    const ss = defenders.find(d => d.id === 'SS');

    if (fs && ss) {
      // Swap positions for coverage exchange
      adjustments.set(fs.id, { ...ss.position });
      adjustments.set(ss.id, { ...fs.position });
    }
  }

  private calculateBuzzResponse(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Strong safety comes down to motion side
    const ss = defenders.find(d => d.id === 'SS');
    if (ss) {
      const motionSide = motion.endPosition.x < this.FIELD_CENTER ? 'left' : 'right';
      adjustments.set(ss.id, {
        x: motionSide === 'left' ? 15 : 38,
        y: ss.position.y - 8  // Come down from deep
      });
    }
  }

  private calculateRobberResponse(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Safety reads QB eyes and adjusts
    const safeties = defenders.filter(d => d.playerType === 'S');
    const motionSide = motion.endPosition.x < this.FIELD_CENTER ? -1 : 1;

    safeties.forEach(safety => {
      const currentPos = safety.position;
      adjustments.set(safety.id, {
        x: currentPos.x + (motionSide * 4),
        y: currentPos.y
      });
    });
  }

  private calculatePatternMatchResponse(
    motion: Motion,
    defenders: Player[],
    offensive: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Prepare for pattern matching based on motion
    const deepDefenders = defenders.filter(d =>
      d.playerType === 'CB' || d.playerType === 'S'
    );

    const motionShift = motion.endPosition.x < this.FIELD_CENTER ? -2 : 2;
    deepDefenders.forEach(defender => {
      adjustments.set(defender.id, {
        x: defender.position.x + motionShift,
        y: defender.position.y
      });
    });
  }

  private calculateSplitFieldResponse(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // Weak safety may rotate based on motion
    const weakSafety = defenders.find(d =>
      d.playerType === 'S' &&
      d.position.x < this.FIELD_CENTER
    );

    if (weakSafety && this.doesMotionCrossFormation(motion)) {
      adjustments.set(weakSafety.id, {
        x: this.FIELD_CENTER,
        y: weakSafety.position.y - 3
      });
    }
  }

  private calculateMLBAdjustment(
    motion: Motion,
    defenders: Player[],
    adjustments: Map<string, Vector2D>
  ): void {
    // MLB adjusts for potential seam threat
    const mlb = defenders.find(d => d.id === 'MLB');
    if (mlb) {
      const motionSide = motion.endPosition.x < this.FIELD_CENTER ? -2 : 2;
      adjustments.set(mlb.id, {
        x: this.FIELD_CENTER + motionSide,
        y: mlb.position.y
      });
    }
  }
}