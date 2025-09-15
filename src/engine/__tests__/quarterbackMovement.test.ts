import { QuarterbackMovement, type QBMovementConfig } from '../quarterbackMovement';
import { Player, Vector2D, HashPosition } from '../types';

describe('QuarterbackMovement', () => {
  const createTestQB = (position: Vector2D): Player => ({
    id: 'QB1',
    position: { ...position },
    velocity: { x: 0, y: 0 },
    team: 'offense',
    playerType: 'QB',
    isEligible: true,
    maxSpeed: 7.5,
    currentSpeed: 0,
    isStar: false,
    hasMotion: false,
    hasMotionBoost: false,
    motionBoostTimeLeft: 0,
    isBlocking: false,
    acceleration: 10,
    isAccelerating: false,
    isDecelerating: false
  });

  describe('Dropback Configurations', () => {
    const startPosition = { x: 26.665, y: 30 };

    it('should create correct 3-step dropback config', () => {
      const config = QuarterbackMovement.getDropbackConfig(3, startPosition);

      expect(config.type).toBe('dropback');
      expect(config.steps).toBe(3);
      expect(config.timing).toBe(1.2);
      expect(config.depth).toBe(5);
      expect(config.accuracyModifier).toBe(1.0);
      expect(config.pattern).toHaveLength(3);

      // Verify final position is 5 yards behind LOS
      const finalPosition = config.pattern[config.pattern.length - 1];
      expect(finalPosition.y).toBe(startPosition.y - 5);
      expect(finalPosition.x).toBe(startPosition.x);
    });

    it('should create correct 5-step dropback config', () => {
      const config = QuarterbackMovement.getDropbackConfig(5, startPosition);

      expect(config.type).toBe('dropback');
      expect(config.steps).toBe(5);
      expect(config.timing).toBe(1.8);
      expect(config.depth).toBe(7);
      expect(config.accuracyModifier).toBe(1.0);
      expect(config.pattern).toHaveLength(5);

      // Verify final position is 7 yards behind LOS
      const finalPosition = config.pattern[config.pattern.length - 1];
      expect(finalPosition.y).toBe(startPosition.y - 7);
      expect(finalPosition.x).toBe(startPosition.x);
    });

    it('should create correct 7-step dropback config', () => {
      const config = QuarterbackMovement.getDropbackConfig(7, startPosition);

      expect(config.type).toBe('dropback');
      expect(config.steps).toBe(7);
      expect(config.timing).toBe(2.4);
      expect(config.depth).toBe(9);
      expect(config.accuracyModifier).toBe(1.0);
      expect(config.pattern).toHaveLength(7);

      // Verify final position is 9 yards behind LOS
      const finalPosition = config.pattern[config.pattern.length - 1];
      expect(finalPosition.y).toBe(startPosition.y - 9);
      expect(finalPosition.x).toBe(startPosition.x);
    });

    it('should create progressive movement pattern', () => {
      const config = QuarterbackMovement.getDropbackConfig(5, startPosition);

      // Each step should move QB further back
      for (let i = 1; i < config.pattern.length; i++) {
        expect(config.pattern[i].y).toBeLessThan(config.pattern[i - 1].y);
        expect(config.pattern[i].x).toBe(startPosition.x); // No lateral movement
      }
    });
  });

  describe('Play Action Configuration', () => {
    const startPosition = { x: 26.665, y: 30 };

    it('should create correct Play Action Boot config', () => {
      const paConfig = QuarterbackMovement.getPlayActionBootConfig(startPosition);

      expect(paConfig.name).toBe('PA Boot Right');
      expect(paConfig.qbMovement.type).toBe('playaction');
      expect(paConfig.qbMovement.steps).toBe(5);
      expect(paConfig.qbMovement.timing).toBe(2.2);
      expect(paConfig.qbMovement.depth).toBe(6);
      expect(paConfig.qbMovement.accuracyModifier).toBe(0.92);
      expect(paConfig.qbMovement.fakeHandoffDuration).toBe(0.6);
      expect(paConfig.qbMovement.lateral).toBe(6);
      expect(paConfig.defensiveResponseTrigger).toBe(600);
      expect(paConfig.timingWindow).toBe(2.8);
    });

    it('should create movement pattern with fake handoff and boot', () => {
      const paConfig = QuarterbackMovement.getPlayActionBootConfig(startPosition);
      const pattern = paConfig.qbMovement.pattern;

      expect(pattern).toHaveLength(5);

      // First position should be toward RB (fake handoff)
      expect(pattern[0].y).toBe(startPosition.y - 1.0);
      expect(pattern[0].x).toBe(startPosition.x);

      // Should include lateral movement to the right
      expect(pattern[pattern.length - 1].x).toBeGreaterThan(startPosition.x);

      // Final position should be deeper than start
      expect(pattern[pattern.length - 1].y).toBe(startPosition.y - 6);
    });
  });

  describe('Rollout Configuration', () => {
    const startPosition = { x: 26.665, y: 30 };

    it('should create correct rollout right config', () => {
      const config = QuarterbackMovement.getRolloutConfig(startPosition, 'right');

      expect(config.type).toBe('rollout');
      expect(config.steps).toBe(4);
      expect(config.timing).toBe(1.8);
      expect(config.depth).toBe(4);
      expect(config.lateral).toBe(8);
      expect(config.accuracyModifier).toBe(0.88); // Right rollout penalty
      expect(config.pattern).toHaveLength(4);

      // Should move right and back
      const finalPosition = config.pattern[config.pattern.length - 1];
      expect(finalPosition.x).toBeGreaterThan(startPosition.x);
      expect(finalPosition.y).toBe(startPosition.y - 4);
    });

    it('should create correct rollout left config', () => {
      const config = QuarterbackMovement.getRolloutConfig(startPosition, 'left');

      expect(config.type).toBe('rollout');
      expect(config.accuracyModifier).toBe(0.85); // Left rollout penalty (worse for right-handed QB)

      // Should move left and back
      const finalPosition = config.pattern[config.pattern.length - 1];
      expect(finalPosition.x).toBeLessThan(startPosition.x);
      expect(finalPosition.y).toBe(startPosition.y - 4);
    });
  });

  describe('QB Movement Updates', () => {
    const startPosition = { x: 26.665, y: 30 };

    it('should update QB position during dropback movement', () => {
      const qb = createTestQB(startPosition);
      const config = QuarterbackMovement.getDropbackConfig(3, startPosition);

      // At start (0% progress) - should move to first waypoint
      QuarterbackMovement.updateQuarterbackMovement(qb, config, 0, 0.016);
      expect(qb.position.x).toBe(startPosition.x);
      expect(qb.position.y).toBeCloseTo(startPosition.y - 2.5); // First waypoint

      // At mid-movement (50% progress)
      QuarterbackMovement.updateQuarterbackMovement(qb, config, 0.6, 0.016);
      expect(qb.position.y).toBeLessThan(startPosition.y);
      expect(qb.position.y).toBeGreaterThan(startPosition.y - 5);

      // At completion (100% progress)
      QuarterbackMovement.updateQuarterbackMovement(qb, config, 1.2, 0.016);
      expect(qb.position.y).toBe(startPosition.y - 5);
      expect(qb.velocity.x).toBe(0);
      expect(qb.velocity.y).toBe(0);
      expect(qb.currentSpeed).toBe(0);
    });

    it('should calculate correct velocity during movement', () => {
      const qb = createTestQB(startPosition);
      const config = QuarterbackMovement.getDropbackConfig(3, startPosition);

      // During movement, QB should have velocity
      QuarterbackMovement.updateQuarterbackMovement(qb, config, 0.3, 0.016);
      expect(qb.currentSpeed).toBeGreaterThan(0);
      expect(qb.currentSpeed).toBeLessThanOrEqual(qb.maxSpeed);

      // Velocity should be pointing backward (negative y)
      expect(qb.velocity.y).toBeLessThan(0);
    });

    it('should handle Play Action movement with lateral component', () => {
      const qb = createTestQB(startPosition);
      const paConfig = QuarterbackMovement.getPlayActionBootConfig(startPosition);

      // At fake handoff phase
      QuarterbackMovement.updateQuarterbackMovement(qb, paConfig.qbMovement, 0.3, 0.016);
      expect(qb.position.y).toBeLessThan(startPosition.y);

      // At boot phase - should have lateral movement
      QuarterbackMovement.updateQuarterbackMovement(qb, paConfig.qbMovement, 1.5, 0.016);
      expect(qb.position.x).toBeGreaterThan(startPosition.x);
      expect(qb.velocity.x).toBeGreaterThan(0); // Moving right
    });
  });

  describe('Accuracy Modifiers', () => {
    const qb = createTestQB({ x: 26.665, y: 30 });

    it('should return full accuracy when stationary', () => {
      const accuracy = QuarterbackMovement.getAccuracyModifier(qb);
      expect(accuracy).toBe(1.0);
    });

    it('should return reduced accuracy during dropback movement', () => {
      const config = QuarterbackMovement.getDropbackConfig(5, qb.position);
      const accuracy = QuarterbackMovement.getAccuracyModifier(qb, config, 0.5); // Mid-drop
      expect(accuracy).toBe(0.95); // 5% penalty
    });

    it('should return full accuracy when dropback is complete', () => {
      const config = QuarterbackMovement.getDropbackConfig(5, qb.position);
      const accuracy = QuarterbackMovement.getAccuracyModifier(qb, config, 1.8); // Complete
      expect(accuracy).toBe(1.0);
    });

    it('should return Play Action accuracy modifier', () => {
      const paConfig = QuarterbackMovement.getPlayActionBootConfig(qb.position);
      const accuracy = QuarterbackMovement.getAccuracyModifier(qb, paConfig.qbMovement, 1.5);
      expect(accuracy).toBe(0.92); // 8% penalty for movement
    });

    it('should return different penalties for left vs right rollouts', () => {
      const rightConfig = QuarterbackMovement.getRolloutConfig(qb.position, 'right');
      const leftConfig = QuarterbackMovement.getRolloutConfig(qb.position, 'left');

      const rightAccuracy = QuarterbackMovement.getAccuracyModifier(qb, rightConfig, 1.0);
      const leftAccuracy = QuarterbackMovement.getAccuracyModifier(qb, leftConfig, 1.0);

      expect(rightAccuracy).toBe(0.88);
      expect(leftAccuracy).toBe(0.85);
      expect(leftAccuracy).toBeLessThan(rightAccuracy); // Left is worse for right-handed QB
    });
  });

  describe('Play Action Triggers', () => {
    it('should trigger defensive response at correct timing', () => {
      const paConfig = QuarterbackMovement.getPlayActionBootConfig({ x: 26.665, y: 30 });

      // Should not trigger before fake handoff is complete
      expect(
        QuarterbackMovement.shouldTriggerPlayActionResponse(paConfig.qbMovement, 0.3)
      ).toBe(false);

      // Should trigger after fake handoff duration
      expect(
        QuarterbackMovement.shouldTriggerPlayActionResponse(paConfig.qbMovement, 0.7)
      ).toBe(true);
    });

    it('should not trigger for non-Play Action movements', () => {
      const dropbackConfig = QuarterbackMovement.getDropbackConfig(5, { x: 26.665, y: 30 });

      expect(
        QuarterbackMovement.shouldTriggerPlayActionResponse(dropbackConfig, 1.0)
      ).toBe(false);
    });
  });

  describe('Throwing Position Detection', () => {
    it('should detect when QB is in throwing position', () => {
      const config = QuarterbackMovement.getDropbackConfig(3, { x: 26.665, y: 30 });

      // Not ready during movement
      expect(QuarterbackMovement.isInThrowingPosition(config, 0.5)).toBe(false);

      // Ready when movement is complete
      expect(QuarterbackMovement.isInThrowingPosition(config, 1.2)).toBe(true);
      expect(QuarterbackMovement.isInThrowingPosition(config, 1.5)).toBe(true);
    });
  });

  describe('QB Starting Position Calculations', () => {
    const lineOfScrimmage = 30;

    it('should calculate correct shotgun position', () => {
      const position = QuarterbackMovement.getQBStartPosition('shotgun', 'middle', lineOfScrimmage);

      expect(position.x).toBe(26.665); // Center of field
      expect(position.y).toBe(24); // 6 yards behind LOS
    });

    it('should calculate correct under center position', () => {
      const position = QuarterbackMovement.getQBStartPosition('under-center', 'middle', lineOfScrimmage);

      expect(position.x).toBe(26.665); // Center of field
      expect(position.y).toBe(29); // 1 yard behind LOS
    });

    it('should handle hash positioning correctly', () => {
      const leftHash = QuarterbackMovement.getQBStartPosition('shotgun', 'left', lineOfScrimmage);
      const rightHash = QuarterbackMovement.getQBStartPosition('shotgun', 'right', lineOfScrimmage);
      const center = QuarterbackMovement.getQBStartPosition('shotgun', 'middle', lineOfScrimmage);

      expect(leftHash.x).toBeLessThan(center.x);
      expect(rightHash.x).toBeGreaterThan(center.x);
      expect(leftHash.x).toBe(center.x - 3.08); // Hash offset
      expect(rightHash.x).toBe(center.x + 3.08); // Hash offset

      // Y positions should be the same
      expect(leftHash.y).toBe(center.y);
      expect(rightHash.y).toBe(center.y);
    });
  });

  describe('Performance Requirements', () => {
    const startPosition = { x: 26.665, y: 30 };

    it('should complete movement calculations under 1ms', () => {
      const qb = createTestQB(startPosition);
      const config = QuarterbackMovement.getDropbackConfig(7, startPosition);

      const start = performance.now();

      // Simulate multiple position updates (typical for 60fps)
      for (let i = 0; i < 60; i++) {
        QuarterbackMovement.updateQuarterbackMovement(qb, config, i * 0.016, 0.016);
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1.0); // Should complete in under 1ms for 60 updates
    });

    it('should handle configuration generation efficiently', () => {
      const start = performance.now();

      // Generate all movement types
      for (let i = 0; i < 100; i++) {
        QuarterbackMovement.getDropbackConfig(3, startPosition);
        QuarterbackMovement.getDropbackConfig(5, startPosition);
        QuarterbackMovement.getDropbackConfig(7, startPosition);
        QuarterbackMovement.getPlayActionBootConfig(startPosition);
        QuarterbackMovement.getRolloutConfig(startPosition, 'right');
        QuarterbackMovement.getRolloutConfig(startPosition, 'left');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10.0); // Should complete in under 10ms for 600 configs
    });
  });

  describe('NFL Realism Validation', () => {
    it('should use authentic NFL timing windows', () => {
      // 3-step: Quick game (1.2s)
      const threeStep = QuarterbackMovement.getDropbackConfig(3, { x: 26.665, y: 30 });
      expect(threeStep.timing).toBe(1.2);

      // 5-step: Timing routes (1.8s)
      const fiveStep = QuarterbackMovement.getDropbackConfig(5, { x: 26.665, y: 30 });
      expect(fiveStep.timing).toBe(1.8);

      // 7-step: Deep routes (2.4s)
      const sevenStep = QuarterbackMovement.getDropbackConfig(7, { x: 26.665, y: 30 });
      expect(sevenStep.timing).toBe(2.4);
    });

    it('should use authentic NFL dropback depths', () => {
      const threeStep = QuarterbackMovement.getDropbackConfig(3, { x: 26.665, y: 30 });
      const fiveStep = QuarterbackMovement.getDropbackConfig(5, { x: 26.665, y: 30 });
      const sevenStep = QuarterbackMovement.getDropbackConfig(7, { x: 26.665, y: 30 });

      expect(threeStep.depth).toBe(5); // 5 yards
      expect(fiveStep.depth).toBe(7);  // 7 yards
      expect(sevenStep.depth).toBe(9); // 9 yards
    });

    it('should match Play Action defensive response timing with existing system', () => {
      const paConfig = QuarterbackMovement.getPlayActionBootConfig({ x: 26.665, y: 30 });

      // Should match existing LB response timing (600ms)
      expect(paConfig.defensiveResponseTrigger).toBe(600);
    });

    it('should apply realistic accuracy penalties', () => {
      const startPos = { x: 26.665, y: 30 };

      // Penalties should match NFL research
      const rolloutRight = QuarterbackMovement.getRolloutConfig(startPos, 'right');
      const rolloutLeft = QuarterbackMovement.getRolloutConfig(startPos, 'left');

      expect(rolloutRight.accuracyModifier).toBe(0.88); // 12% penalty
      expect(rolloutLeft.accuracyModifier).toBe(0.85);  // 15% penalty (worse for right-handed QB)
    });
  });
});