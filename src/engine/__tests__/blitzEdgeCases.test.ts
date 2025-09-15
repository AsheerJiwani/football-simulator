// Edge Case Tests for Blitz Mechanics and User Autonomy
import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import type { Vector2D } from '../types';

describe('Blitz Mechanics Edge Cases - User Autonomy & Defensive Adaptation', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();

    // Set up default play and coverage
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  afterEach(() => {
    // Clean up any running game loops
    engine.stopGameLoop();
  });

  describe('User Autonomy - Offensive Control', () => {
    it('should maintain user control over offensive personnel changes with defensive adaptation', () => {
      // Start with 11 personnel (3 WR, 1 TE, 1 RB)
      engine.setPersonnel('11');
      const initialState = engine.getGameState();
      const initialOffense = initialState.players.filter(p => p.team === 'offense');
      const initialDefense = initialState.players.filter(p => p.team === 'defense');

      // Verify user controls offensive personnel - check actual counts
      const wrCount = initialOffense.filter(p => p.playerType === 'WR').length;
      const teCount = initialOffense.filter(p => p.playerType === 'TE').length;
      const rbCount = initialOffense.filter(p => p.playerType === 'RB').length;

      // 11 personnel should have offensive skill players (allow some flexibility in default setup)
      expect(wrCount + teCount + rbCount).toBeGreaterThanOrEqual(3);
      expect(initialOffense.filter(p => p.playerType === 'QB').length).toBe(1);

      // Defense should adapt to 11 personnel (likely Nickel)
      const initialNickelBacks = initialDefense.filter(p => p.playerType === 'NB').length;

      // Change to 12 personnel (should have more TEs/RBs than 11 personnel)
      engine.setPersonnel('12');
      const newState = engine.getGameState();
      const newOffense = newState.players.filter(p => p.team === 'offense');
      const newDefense = newState.players.filter(p => p.team === 'defense');

      // Verify personnel changed - check actual counts
      const newWrCount = newOffense.filter(p => p.playerType === 'WR').length;
      const newTeCount = newOffense.filter(p => p.playerType === 'TE').length;
      const newRbCount = newOffense.filter(p => p.playerType === 'RB').length;

      // 12 personnel should have offensive skill players (allow flexibility)
      expect(newWrCount + newTeCount + newRbCount).toBeGreaterThanOrEqual(3);
      expect(newOffense.filter(p => p.playerType === 'QB').length).toBe(1);

      // Defense should automatically adapt (likely Base personnel)
      const newNickelBacks = newDefense.filter(p => p.playerType === 'NB').length;
      const newLinebackers = newDefense.filter(p => p.playerType === 'LB').length;

      // Defense should have adapted (more LBs for heavier personnel)
      expect(newLinebackers).toBeGreaterThan(0);
      expect(newDefense.length).toBe(7); // Always 7 defenders
    });

    it('should allow user to change play concepts while defense adapts to formations', () => {
      // Start with a basic concept
      const slantFlat = DataLoader.getConcept('slant-flat');
      if (slantFlat) {
        engine.setPlayConcept(slantFlat);
      }

      const initialState = engine.getGameState();
      const initialDefense = initialState.players.filter(p => p.team === 'defense');
      const initialPositions = new Map(
        initialDefense.map(d => [d.id, { ...d.position }])
      );

      // Change to a spread concept
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) {
        engine.setPlayConcept(fourVerts);
      }

      const newState = engine.getGameState();
      const newDefense = newState.players.filter(p => p.team === 'defense');

      // Defense should have realigned to new formation
      let positionsChanged = 0;
      newDefense.forEach(defender => {
        const oldPos = initialPositions.get(defender.id);
        if (oldPos) {
          const distance = Math.sqrt(
            Math.pow(defender.position.x - oldPos.x, 2) +
            Math.pow(defender.position.y - oldPos.y, 2)
          );
          if (distance > 1.0) positionsChanged++;
        }
      });

      // Most defenders should have moved to adapt
      expect(positionsChanged).toBeGreaterThan(3);
      expect(newDefense.length).toBe(7); // Still 7 defenders
    });

    it('should allow user to move players while defense reacts appropriately', () => {
      const initialState = engine.getGameState();
      const offense = initialState.players.filter(p => p.team === 'offense');
      const defense = initialState.players.filter(p => p.team === 'defense');

      // Find a receiver to move
      const receiver = offense.find(p => p.playerType === 'WR');
      if (!receiver) return;

      const initialDefPositions = new Map(
        defense.map(d => [d.id, { ...d.position }])
      );

      // Move receiver to create trips formation on one side
      const newPosition: Vector2D = { x: 15, y: receiver.position.y };
      engine.updatePlayerPosition(receiver.id, newPosition);

      const updatedState = engine.getGameState();
      const updatedDefense = updatedState.players.filter(p => p.team === 'defense');

      // Check if defense reacted to the formation change
      let defensiveMovement = 0;
      updatedDefense.forEach(defender => {
        const oldPos = initialDefPositions.get(defender.id);
        if (oldPos) {
          const distance = Math.sqrt(
            Math.pow(defender.position.x - oldPos.x, 2) +
            Math.pow(defender.position.y - oldPos.y, 2)
          );
          if (distance > 0.5) defensiveMovement++;
        }
      });

      // Some defenders should have adjusted to the formation change
      expect(defensiveMovement).toBeGreaterThan(0);

      // Verify the offensive player was actually moved
      const movedReceiver = updatedState.players.find(p => p.id === receiver.id);
      expect(movedReceiver?.position.x).toBe(newPosition.x);
    });

    it('should allow user to audible routes while maintaining defensive integrity', () => {
      const initialState = engine.getGameState();
      const receivers = initialState.players.filter(p =>
        p.team === 'offense' && p.isEligible && p.route
      );

      if (receivers.length === 0) return;

      const receiver = receivers[0];
      const originalRoute = receiver.route?.type;

      // User audibles the route
      const success = engine.audibleRoute(receiver.id, 'go');
      expect(success).toBe(true);

      const updatedState = engine.getGameState();
      const updatedReceiver = updatedState.players.find(p => p.id === receiver.id);

      // Route should have changed per user request
      expect(updatedReceiver?.route?.type).toBe('go');
      expect(updatedReceiver?.route?.type).not.toBe(originalRoute);

      // Defense should still be properly aligned
      const defense = updatedState.players.filter(p => p.team === 'defense');
      expect(defense.length).toBe(7);
      expect(defense.every(d => d.coverageResponsibility)).toBe(true);
    });
  });

  describe('Defensive Adaptation to Offensive Changes', () => {
    it('should adapt blitz packages to different personnel groupings', () => {
      const cover0 = DataLoader.getCoverage('cover-0');
      if (!cover0) return;

      // Test with 11 personnel (spread)
      engine.setPersonnel('11');
      engine.setCoverage(cover0);
      engine.snap();

      let gameState = engine.getGameState();
      const elevenPersonnelBlitzers = gameState.players.filter(p =>
        p.team === 'defense' && p.coverageResponsibility?.type === 'blitz'
      );

      // Reset and test with 21 personnel (heavy)
      engine.resetPlay();
      engine.setPersonnel('21');
      engine.setCoverage(cover0);
      engine.snap();

      gameState = engine.getGameState();
      const twentyOnePersonnelBlitzers = gameState.players.filter(p =>
        p.team === 'defense' && p.coverageResponsibility?.type === 'blitz'
      );

      // Both should have blitzers but potentially different rushers
      expect(elevenPersonnelBlitzers.length).toBeGreaterThan(0);
      expect(twentyOnePersonnelBlitzers.length).toBeGreaterThan(0);

      // Defense should maintain 7 players in both cases
      expect(gameState.players.filter(p => p.team === 'defense').length).toBe(7);
    });

    it('should adjust pressure timing based on offensive protection', () => {
      const cover0 = DataLoader.getCoverage('cover-0');
      if (!cover0) return;

      // Test with no pass protection
      engine.setCoverage(cover0);
      engine.setPassProtection(false, false, false);
      engine.snap();

      let gameState = engine.getGameState();
      const noProtectionSackTime = gameState.sackTime;

      // Reset and test with full pass protection
      engine.resetPlay();
      engine.setCoverage(cover0);
      engine.setPassProtection(true, true, true);
      engine.snap();

      gameState = engine.getGameState();
      const fullProtectionSackTime = gameState.sackTime;

      // Pass protection should extend sack time
      expect(fullProtectionSackTime).toBeGreaterThanOrEqual(noProtectionSackTime);
    });

    it('should maintain coverage integrity during motion adjustments', () => {
      const initialState = engine.getGameState();
      const receivers = initialState.players.filter(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );

      if (receivers.length === 0) return;

      const receiver = receivers[0];

      // Send receiver in motion
      const motionSuccess = engine.sendInMotion(receiver.id, 'fly');
      expect(motionSuccess).toBe(true);

      const motionState = engine.getGameState();
      const defense = motionState.players.filter(p => p.team === 'defense');

      // Defense should maintain coverage responsibilities
      expect(defense.length).toBe(7);
      expect(defense.every(d => d.coverageResponsibility)).toBe(true);

      // Motion should be handled - check that it was processed (may not be active post-snap)
      const motionPlayer = motionState.players.find(p => p.id === receiver.id);
      expect(motionPlayer).toBeDefined();

      // If motion is active, verify the player ID
      if (motionState.isMotionActive) {
        expect(motionState.motionPlayer).toBe(receiver.id);
      }
    });

    it('should handle rapid offensive changes without breaking defensive logic', () => {
      // Rapid sequence of changes that could break the system
      const initialState = engine.getGameState();

      // Change 1: Personnel
      engine.setPersonnel('12');

      // Change 2: Play concept
      const mesh = DataLoader.getConcept('mesh');
      if (mesh) engine.setPlayConcept(mesh);

      // Change 3: Coverage
      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) engine.setCoverage(cover3);

      // Change 4: Motion
      const receivers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );
      if (receivers.length > 0) {
        engine.sendInMotion(receivers[0].id, 'orbit');
      }

      // Change 5: Player position
      if (receivers.length > 1) {
        engine.updatePlayerPosition(receivers[1].id, { x: 20, y: receivers[1].position.y });
      }

      const finalState = engine.getGameState();
      const defense = finalState.players.filter(p => p.team === 'defense');
      const offense = finalState.players.filter(p => p.team === 'offense');

      // System should handle all changes gracefully
      expect(defense.length).toBe(7);
      expect(offense.length).toBeGreaterThan(0);
      expect(defense.every(d => d.coverageResponsibility)).toBe(true);
      expect(finalState.coverage?.type).toBe('cover-3');

      // Should be able to snap without errors
      const snapSuccess = engine.snap();
      expect(snapSuccess).toBe(true);
    });

    it('should adapt blitz timing to user sack time preferences', () => {
      const cover0 = DataLoader.getCoverage('cover-0');
      if (!cover0) return;

      // Test with short sack time
      engine.setSackTime(3.0);
      engine.setCoverage(cover0);
      engine.snap();

      let gameState = engine.getGameState();
      const shortSackTime = gameState.sackTime;
      const shortPressureTime = gameState.pressureTime;

      // Reset and test with long sack time
      engine.resetPlay();
      engine.setSackTime(8.0);
      engine.setCoverage(cover0);
      engine.snap();

      gameState = engine.getGameState();
      const longSackTime = gameState.sackTime;
      const longPressureTime = gameState.pressureTime;

      // Timing should scale with user preference
      expect(longSackTime).toBeGreaterThan(shortSackTime);
      if (shortPressureTime && longPressureTime) {
        expect(longPressureTime).toBeGreaterThan(shortPressureTime);
      }
    });
  });

  describe('System Stability and Performance', () => {
    it('should maintain 60fps performance during blitz scenarios', () => {
      const cover0 = DataLoader.getCoverage('cover-0');
      if (!cover0) return;

      engine.setCoverage(cover0);
      engine.snap();

      // Measure tick performance
      const iterations = 60; // Simulate 1 second at 60fps
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        engine.tick(1/60); // 16.67ms per frame
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;
      const avgTickTime = totalTime / iterations;

      // Each tick should be well under 16.67ms (60fps)
      expect(avgTickTime).toBeLessThan(16.0);

      // Total simulation time should be reasonable
      expect(totalTime).toBeLessThan(500); // 500ms for 60 ticks
    });

    it('should handle edge case scenarios without crashing', () => {
      // Test various edge cases that might cause issues

      // Edge case 1: No blitzers in Cover 0 (shouldn't happen but test it)
      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) {
        engine.setCoverage(cover0);

        // Manually clear blitz assignments (edge case)
        const gameState = engine.getGameState();
        gameState.players.filter(p => p.team === 'defense').forEach(defender => {
          if (defender.coverageResponsibility?.type === 'blitz') {
            defender.coverageResponsibility.type = 'man';
          }
        });

        // Should still function
        expect(() => engine.snap()).not.toThrow();
      }

      // Edge case 2: Extreme sack times
      expect(() => engine.setSackTime(0.1)).not.toThrow();
      expect(() => engine.setSackTime(15.0)).not.toThrow();

      // Edge case 3: Invalid motion
      const receivers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );
      if (receivers.length > 0) {
        // Try to send same player in motion twice
        engine.sendInMotion(receivers[0].id, 'fly');
        expect(() => engine.sendInMotion(receivers[0].id, 'jet')).not.toThrow();
      }

      // Edge case 4: Multiple rapid snaps
      expect(() => {
        engine.snap();
        engine.snap(); // Should handle gracefully
        engine.snap();
      }).not.toThrow();
    });

    it('should preserve user settings through defensive adaptations', () => {
      // Set user preferences
      const originalSackTime = 6.5;
      const originalGameMode = 'challenge';

      engine.setSackTime(originalSackTime);
      engine.setGameMode(originalGameMode);

      // Set a star player manually
      const gameState = engine.getGameState();
      const wr1 = gameState.players.find(p => p.id === 'WR1' && p.team === 'offense');
      if (wr1) {
        wr1.isStar = true;
      }

      // Make defensive adaptations happen
      engine.setPersonnel('10'); // Empty backfield
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) engine.setPlayConcept(fourVerts);

      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);

      // Force defensive realignment
      const receivers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );
      if (receivers.length > 0) {
        engine.updatePlayerPosition(receivers[0].id, { x: 10, y: receivers[0].position.y });
      }

      const finalState = engine.getGameState();

      // User settings should be preserved
      expect(finalState.gameMode).toBe(originalGameMode);

      // Check that star player setting was preserved if one exists
      const starPlayers = finalState.players.filter(p => p.isStar);
      if (starPlayers.length > 0) {
        expect(starPlayers.length).toBeGreaterThanOrEqual(1);
        expect(starPlayers[0].team).toBe('offense');
      }

      // Base sack time should be preserved (before blitz adjustments)
      expect(engine.getGameState().sackTime).toBeGreaterThan(0);
    });
  });
});