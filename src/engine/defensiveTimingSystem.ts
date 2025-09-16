import { Player, Vector2D, CoverageType } from './types';

/**
 * NFL-realistic defensive timing system for human-like adjustments
 * Implements recognition delays, execution phases, and natural movement patterns
 */

export interface DefensiveAdjustment {
  id: string;
  type: 'motion' | 'formation' | 'coverage' | 'playAction' | 'audible' | 'shift';
  defenderId: string;
  targetPosition?: Vector2D;
  targetResponsibility?: any;
  recognitionTime: number;  // Time to recognize (0.2-0.3s typical)
  executionTime: number;    // Time to execute (0.3-1.5s depending on complexity)
  priority: number;         // Order of precedence (1-10, lower = higher priority)
  state: 'pending' | 'recognizing' | 'executing' | 'complete' | 'cancelled';
  startTime?: number;
  completionCallback?: () => void;
}

export class DefensiveTimingSystem {
  private adjustments: Map<string, DefensiveAdjustment> = new Map();
  private currentTime: number = 0;

  // NFL-researched timing windows (in seconds)
  private readonly TIMING_WINDOWS = {
    recognition: {
      motion: 0.2,        // Quick recognition of motion
      formation: 0.3,     // Slightly longer for formation shifts
      coverage: 0.25,     // Coverage audible recognition
      playAction: 0.15,   // Initial PA recognition (bite happens fast)
      audible: 0.2,       // Offensive audible recognition
      shift: 0.15         // Defensive shift recognition
    },
    execution: {
      motion: {
        lock: 0.5,          // Simple follow in man coverage
        'rock-roll': 1.1,   // Safety exchange
        buzz: 1.2,          // Safety rotation down
        spin: 1.4,          // Full coverage rotation
        bump: 0.6,          // Zone bump over
        'pattern-match': 0.8 // Pattern match adjustment
      },
      formation: {
        trips: 0.9,         // Adjust to trips
        bunch: 1.0,         // Bunch adjustments
        spread: 0.7,        // Spread adjustments
        compressed: 0.8     // Compressed/heavy adjustments
      },
      coverage: {
        simple: 0.6,        // Simple coverage change
        complex: 1.2        // Complex rotation
      },
      playAction: {
        lbFreeze: 0.5,      // LB freeze duration
        safetyPause: 0.3,   // Safety hesitation
        recovery: 0.4       // Recovery from bite
      }
    }
  };

  // Priority levels (lower number = higher priority)
  private readonly PRIORITY_LEVELS = {
    blitz: 1,           // Blitz adjustments are highest priority
    motion: 2,          // Motion adjustments are critical
    coverage: 3,        // Coverage changes
    formation: 4,       // Formation adjustments
    playAction: 5,      // Play action responses
    shift: 6            // Minor shifts are lowest
  };

  /**
   * Queue a defensive adjustment with realistic timing
   */
  queueAdjustment(adjustment: Omit<DefensiveAdjustment, 'id' | 'state' | 'startTime'>): string {
    const id = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullAdjustment: DefensiveAdjustment = {
      ...adjustment,
      id,
      state: 'pending',
      startTime: undefined
    };

    // Cancel conflicting adjustments for the same defender
    this.cancelConflictingAdjustments(fullAdjustment);

    this.adjustments.set(id, fullAdjustment);
    return id;
  }

  /**
   * Queue a motion response with appropriate timing
   */
  queueMotionResponse(
    coverage: CoverageType,
    responseType: string,
    defenderId: string,
    targetPosition: Vector2D
  ): string {
    const recognitionTime = this.TIMING_WINDOWS.recognition.motion;
    const executionTime = this.TIMING_WINDOWS.execution.motion[responseType] || 0.8;

    return this.queueAdjustment({
      type: 'motion',
      defenderId,
      targetPosition,
      recognitionTime,
      executionTime,
      priority: this.PRIORITY_LEVELS.motion
    });
  }

  /**
   * Queue a play action freeze response
   */
  queuePlayActionResponse(
    defenderId: string,
    defenderType: 'LB' | 'S',
    currentPosition: Vector2D
  ): string {
    const recognitionTime = this.TIMING_WINDOWS.recognition.playAction;
    const freezeTime = defenderType === 'LB'
      ? this.TIMING_WINDOWS.execution.playAction.lbFreeze
      : this.TIMING_WINDOWS.execution.playAction.safetyPause;

    return this.queueAdjustment({
      type: 'playAction',
      defenderId,
      targetPosition: currentPosition, // Freeze in place
      recognitionTime,
      executionTime: freezeTime,
      priority: this.PRIORITY_LEVELS.playAction
    });
  }

  /**
   * Queue a formation adjustment (trips, bunch, etc.)
   */
  queueFormationAdjustment(
    formationType: 'trips' | 'bunch' | 'spread' | 'compressed',
    defenderId: string,
    targetPosition: Vector2D
  ): string {
    const recognitionTime = this.TIMING_WINDOWS.recognition.formation;
    const executionTime = this.TIMING_WINDOWS.execution.formation[formationType];

    return this.queueAdjustment({
      type: 'formation',
      defenderId,
      targetPosition,
      recognitionTime,
      executionTime,
      priority: this.PRIORITY_LEVELS.formation
    });
  }

  /**
   * Update all adjustments based on elapsed time
   */
  tick(deltaTime: number): void {
    this.currentTime += deltaTime;

    for (const [id, adjustment] of this.adjustments.entries()) {
      this.updateAdjustment(adjustment, deltaTime);
    }

    // Clean up completed adjustments
    this.cleanupCompletedAdjustments();
  }

  /**
   * Update a single adjustment's state machine
   */
  private updateAdjustment(adjustment: DefensiveAdjustment, deltaTime: number): void {
    switch (adjustment.state) {
      case 'pending':
        // Check if we should start recognizing (priority queue logic could go here)
        if (this.canStartAdjustment(adjustment)) {
          adjustment.state = 'recognizing';
          adjustment.startTime = this.currentTime;
        }
        break;

      case 'recognizing':
        // Check if recognition phase is complete
        if (adjustment.startTime &&
            this.currentTime - adjustment.startTime >= adjustment.recognitionTime) {
          adjustment.state = 'executing';
        }
        break;

      case 'executing':
        // Check if execution phase is complete
        if (adjustment.startTime &&
            this.currentTime - adjustment.startTime >=
            adjustment.recognitionTime + adjustment.executionTime) {
          adjustment.state = 'complete';

          // Call completion callback if provided
          if (adjustment.completionCallback) {
            adjustment.completionCallback();
          }
        }
        break;

      case 'complete':
      case 'cancelled':
        // These states are terminal
        break;
    }
  }

  /**
   * Check if an adjustment can start based on priority and conflicts
   */
  private canStartAdjustment(adjustment: DefensiveAdjustment): boolean {
    // Check if any higher priority adjustments are pending for the same defender
    for (const [id, otherAdj] of this.adjustments.entries()) {
      if (otherAdj.defenderId === adjustment.defenderId &&
          otherAdj.priority < adjustment.priority &&
          (otherAdj.state === 'recognizing' || otherAdj.state === 'executing')) {
        return false; // Wait for higher priority adjustment
      }
    }
    return true;
  }

  /**
   * Cancel conflicting adjustments for a defender
   */
  private cancelConflictingAdjustments(newAdjustment: DefensiveAdjustment): void {
    for (const [id, adjustment] of this.adjustments.entries()) {
      if (adjustment.defenderId === newAdjustment.defenderId &&
          adjustment.state !== 'complete' &&
          adjustment.state !== 'cancelled') {

        // Cancel if same type or lower priority
        if (adjustment.type === newAdjustment.type ||
            adjustment.priority > newAdjustment.priority) {
          adjustment.state = 'cancelled';
        }
      }
    }
  }

  /**
   * Clean up completed and cancelled adjustments
   */
  private cleanupCompletedAdjustments(): void {
    const toRemove: string[] = [];

    for (const [id, adjustment] of this.adjustments.entries()) {
      if (adjustment.state === 'complete' || adjustment.state === 'cancelled') {
        // Keep for a short time for debugging, then remove
        if (adjustment.startTime &&
            this.currentTime - adjustment.startTime > 2.0) {
          toRemove.push(id);
        }
      }
    }

    toRemove.forEach(id => this.adjustments.delete(id));
  }

  /**
   * Get the current position for a defender accounting for in-progress adjustments
   */
  getAdjustedPosition(defenderId: string, currentPosition: Vector2D): Vector2D {
    // Find active adjustment for this defender
    for (const adjustment of this.adjustments.values()) {
      if (adjustment.defenderId === defenderId &&
          adjustment.state === 'executing' &&
          adjustment.targetPosition &&
          adjustment.startTime) {

        // Calculate execution progress
        const elapsedExecution = this.currentTime - adjustment.startTime - adjustment.recognitionTime;
        const progress = Math.min(1, Math.max(0, elapsedExecution / adjustment.executionTime));

        // Apply easing for natural movement (ease-in-out)
        const easedProgress = this.easeInOutQuad(progress);

        // Interpolate position
        return {
          x: currentPosition.x + (adjustment.targetPosition.x - currentPosition.x) * easedProgress,
          y: currentPosition.y + (adjustment.targetPosition.y - currentPosition.y) * easedProgress
        };
      }
    }

    return currentPosition;
  }

  /**
   * Get adjustment state for a defender (for UI/debugging)
   */
  getDefenderAdjustmentState(defenderId: string): string {
    for (const adjustment of this.adjustments.values()) {
      if (adjustment.defenderId === defenderId &&
          (adjustment.state === 'recognizing' || adjustment.state === 'executing')) {
        return `${adjustment.type}:${adjustment.state}`;
      }
    }
    return 'ready';
  }

  /**
   * Check if a defender is frozen (play action)
   */
  isDefenderFrozen(defenderId: string): boolean {
    for (const adjustment of this.adjustments.values()) {
      if (adjustment.defenderId === defenderId &&
          adjustment.type === 'playAction' &&
          adjustment.state === 'executing') {
        return true;
      }
    }
    return false;
  }

  /**
   * Easing function for natural movement
   */
  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Reset all adjustments (for play reset)
   */
  reset(): void {
    this.adjustments.clear();
    this.currentTime = 0;
  }

  /**
   * Get all active adjustments (for debugging)
   */
  getActiveAdjustments(): DefensiveAdjustment[] {
    return Array.from(this.adjustments.values()).filter(adj =>
      adj.state === 'recognizing' || adj.state === 'executing'
    );
  }
}