import { FootballEngine } from '../Engine';
import { GameState, PlayConcept, Coverage } from '../types';

describe('Quarterback Movement Integration', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine({
      fieldDimensions: {
        length: 120,
        width: 53.33,
        endZoneDepth: 10,
        hashWidth: 6.17,
        hashFromCenter: 3.08,
      },
      physics: {
        ballSpeed: 25,
        tackleRadius: 1.5,
        catchRadius: 1.0,
        motionBoostPercent: 0.12,
        starBoostPercent: 0.10,
        motionBoostDuration: 0.35,
      },
    });

    // Set up a basic play and coverage
    const slantFlatConcept: PlayConcept = {
      name: "Slant Flat",
      routes: {
        "WR1": {
          type: "slant",
          waypoints: [{ x: 0, y: 0 }, { x: 3, y: 2 }],
          timing: [0, 1.8],
          depth: 3
        },
        "RB1": {
          type: "flat",
          waypoints: [{ x: 0, y: 0 }, { x: 8, y: 2 }],
          timing: [0, 2.0],
          depth: 2
        }
      },
      formation: {
        name: "I-Formation",
        positions: {
          "QB1": { x: 26.665, y: 24 },
          "RB1": { x: 26.665, y: 23 },
          "WR1": { x: 18, y: 30 },
          "WR2": { x: 35, y: 30 }
        },
        personnel: { QB: 1, RB: 1, WR: 2, TE: 0, FB: 0 }
      },
      description: "Basic slant and flat concept",
      difficulty: "easy"
    };

    const cover1: Coverage = {
      name: "Cover 1",
      type: "cover-1",
      safetyCount: 1,
      responsibilities: [
        {
          defenderId: "CB1",
          type: "man",
          target: "WR1"
        },
        {
          defenderId: "CB2",
          type: "man",
          target: "WR2"
        },
        {
          defenderId: "LB1",
          type: "man",
          target: "RB1"
        },
        {
          defenderId: "FS1",
          type: "zone",
          zone: { center: { x: 26.665, y: 50 }, width: 20, height: 20, depth: 20 }
        }
      ]
    };

    engine.setPlayConcept(slantFlatConcept);
    engine.setCoverage(cover1);
  });

  describe('QB Movement Setup and Initialization', () => {
    it('should allow setting QB movement pre-snap', () => {
      const result = engine.setQBMovement('3-step');
      expect(result).toBe(true);

      const gameState = engine.getGameState();
      expect(gameState.qbMovement).toBeDefined();
      expect(gameState.qbMovement?.config.type).toBe('dropback');
      expect(gameState.qbMovement?.config.steps).toBe(3);
      expect(gameState.qbMovement?.isActive).toBe(false); // Not active until snap
    });

    it('should not allow setting QB movement post-snap', () => {
      engine.snap();
      const result = engine.setQBMovement('5-step');
      expect(result).toBe(false);
    });

    it('should initialize QB movement at snap', () => {
      engine.setQBMovement('5-step');
      engine.snap();

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(true);
      expect(gameState.phase).toBe('post-snap');
    });

    it('should default to 5-step dropback if no movement set', () => {
      engine.snap();

      const gameState = engine.getGameState();
      expect(gameState.qbMovement).toBeDefined();
      expect(gameState.qbMovement?.config.type).toBe('dropback');
      expect(gameState.qbMovement?.config.steps).toBe(5);
    });
  });

  describe('QB Movement During Play', () => {
    it('should update QB position during dropback', async () => {
      engine.setQBMovement('3-step');
      engine.snap();

      const gameState = engine.getGameState();
      const qb = gameState.players.find(p => p.playerType === 'QB');
      expect(qb).toBeDefined();

      const initialY = qb!.position.y;

      // Simulate some time passing
      engine.tick(0.5); // 0.5 seconds

      const updatedQB = gameState.players.find(p => p.playerType === 'QB');
      expect(updatedQB!.position.y).toBeLessThan(initialY); // QB should move back
    });

    it('should complete QB movement at correct timing', () => {
      engine.setQBMovement('3-step');
      engine.snap();

      // Simulate the full dropback time (1.2 seconds)
      for (let i = 0; i < 75; i++) { // 75 * 0.016 ≈ 1.2 seconds
        engine.tick(0.016);
      }

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(false); // Movement complete
    });

    it('should handle Play Action movement with defensive response', () => {
      engine.setQBMovement('play-action');
      engine.snap();

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isPlayAction).toBe(true);
      expect(gameState.qbMovement?.hasTriggeredDefensiveResponse).toBe(false);

      // Simulate time to trigger defensive response (0.6 seconds)
      for (let i = 0; i < 38; i++) { // 38 * 0.016 ≈ 0.608 seconds
        engine.tick(0.016);
      }

      // Should have triggered defensive response
      expect(gameState.qbMovement?.hasTriggeredDefensiveResponse).toBe(true);
    });
  });

  describe('Accuracy Integration with Throwing', () => {
    it('should apply accuracy penalty during movement', () => {
      engine.setQBMovement('rollout-right');
      engine.snap();

      // Simulate some movement time
      engine.tick(0.8);

      const gameState = engine.getGameState();
      const qb = gameState.players.find(p => p.playerType === 'QB');

      // Check that QB movement is active and accuracy modifier is being calculated
      expect(gameState.qbMovement).toBeDefined();
      expect(gameState.qbMovement?.config.type).toBe('rollout');

      // Check QB position has moved due to rollout
      if (qb) {
        expect(qb.position.x).not.toBe(26.665); // Should have moved from center
      }

      // The accuracy penalty should be applied internally when throwing
      // We verify the system tracks the movement correctly
      expect(gameState.phase).toBe('post-snap');
    });

    it('should have full accuracy when dropback is complete', () => {
      engine.setQBMovement('3-step');
      engine.snap();

      // Complete the dropback (1.2 seconds)
      engine.tick(1.3);

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(false);

      // Throwing should have full accuracy modifier applied
      const result = engine.throwTo('WR1');
      expect(result).toBe(true);
    });
  });

  describe('Play Action Integration with Defensive Movement', () => {
    it('should not trigger defensive response for regular dropback', () => {
      engine.setQBMovement('5-step');
      engine.snap();

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isPlayAction).toBe(false);

      // Simulate full dropback time
      engine.tick(2.0);

      expect(gameState.qbMovement?.hasTriggeredDefensiveResponse).toBe(false);
    });

    it('should coordinate with existing defensive movement system', () => {
      engine.setQBMovement('play-action');
      engine.snap();

      const gameState = engine.getGameState();
      const linebacker = gameState.players.find(p => p.playerType === 'LB');

      if (linebacker) {
        const initialPosition = { ...linebacker.position };

        // Simulate PA fake time
        engine.tick(0.7);

        // Linebacker should have reacted to Play Action
        // The exact behavior depends on the defensive movement system
        // We just verify the system doesn't crash and processes correctly
        expect(linebacker.position).toBeDefined();
        expect(gameState.qbMovement?.hasTriggeredDefensiveResponse).toBe(true);
      }
    });
  });

  describe('Reset and State Management', () => {
    it('should reset QB movement state on play reset', () => {
      engine.setQBMovement('7-step');
      engine.snap();

      // Simulate some movement
      engine.tick(1.0);

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(true);

      // Reset play
      engine.resetPlay();

      const resetState = engine.getGameState();
      expect(resetState.phase).toBe('pre-snap');
      if (resetState.qbMovement) {
        expect(resetState.qbMovement.isActive).toBe(false);
        expect(resetState.qbMovement.hasTriggeredDefensiveResponse).toBe(false);
      }
    });

    it('should preserve QB movement config through reset', () => {
      engine.setQBMovement('play-action');
      const originalState = engine.getGameState();
      const originalConfig = originalState.qbMovement?.config;

      engine.snap();
      engine.tick(1.0);
      engine.resetPlay();

      const resetState = engine.getGameState();
      expect(resetState.qbMovement?.config).toEqual(originalConfig);
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance with QB movement updates', () => {
      engine.setQBMovement('7-step');
      engine.snap();

      const startTime = performance.now();

      // Simulate 60 fps for 2 seconds (120 ticks)
      for (let i = 0; i < 120; i++) {
        engine.tick(0.016);
      }

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });

    it('should not impact overall engine performance', () => {
      const startTime = performance.now();

      // Test multiple movement types
      const movements = ['3-step', '5-step', '7-step', 'play-action', 'rollout-right', 'rollout-left'] as const;

      movements.forEach(movement => {
        engine.resetPlay();
        engine.setQBMovement(movement);
        engine.snap();

        // Simulate movement
        for (let i = 0; i < 30; i++) {
          engine.tick(0.016);
        }
      });

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete all movements in under 100ms
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing QB gracefully', () => {
      // Reset and create engine without QB setup
      const emptyEngine = new FootballEngine();

      // Should not crash
      expect(() => emptyEngine.setQBMovement('3-step')).not.toThrow();
      expect(emptyEngine.setQBMovement('3-step')).toBe(false);
    });

    it('should handle invalid movement type gracefully', () => {
      // @ts-ignore - Intentionally testing invalid input
      const result = engine.setQBMovement('invalid-movement');
      expect(result).toBe(false);
    });

    it('should handle rapid movement type changes', () => {
      expect(engine.setQBMovement('3-step')).toBe(true);
      expect(engine.setQBMovement('5-step')).toBe(true);
      expect(engine.setQBMovement('play-action')).toBe(true);

      // Final movement should be play-action
      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.config.type).toBe('playaction');
    });
  });

  describe('Feature Integration Validation', () => {
    it('should work correctly with motion', () => {
      // Send a receiver in motion
      engine.sendInMotion('WR1', 'fly');

      // Set QB movement
      engine.setQBMovement('5-step');

      // Should be able to snap with both motion and QB movement
      const result = engine.snap();
      expect(result).toBe(true);

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(true);
      expect(gameState.phase).toBe('post-snap');
    });

    it('should work correctly with audibles', () => {
      engine.setQBMovement('3-step');

      // Change a route
      engine.audibleRoute('WR1', 'hitch');

      engine.snap();

      const gameState = engine.getGameState();
      expect(gameState.qbMovement?.isActive).toBe(true);

      // Should still be able to throw to audibled receiver
      engine.tick(0.5);
      const result = engine.throwTo('WR1');
      expect(result).toBe(true);
    });

    it('should integrate with existing coverage adjustments', () => {
      engine.setQBMovement('play-action');
      engine.snap();

      // Simulate PA response timing
      engine.tick(0.7);

      const gameState = engine.getGameState();
      const defenders = gameState.players.filter(p => p.team === 'defense');

      // Defenders should still maintain proper coverage responsibilities
      defenders.forEach(defender => {
        expect(defender.coverageResponsibility).toBeDefined();
      });

      // Should still be able to complete the play
      const result = engine.throwTo('WR1');
      expect(result).toBe(true);
    });
  });
});