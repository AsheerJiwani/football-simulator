import { FootballEngine } from '../Engine';
import { DataLoader } from '../../lib/dataLoader';

describe('Line of Scrimmage Adjustment Tests', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-3');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  afterEach(() => {
    if (engine) {
      engine.reset();
    }
  });

  describe('Defensive Alignment with LOS Changes', () => {
    test('Cover 3 defenders should maintain proper depth relative to new LOS', () => {
      // Test at different field positions
      const testPositions = [20, 30, 50, 70, 90];

      testPositions.forEach(losPosition => {
        // Reset engine for each position to ensure clean state
        engine.reset();
        const concept = DataLoader.getConcept('slant-flat');
        const coverage = DataLoader.getCoverage('cover-3');
        if (concept) engine.setPlayConcept(concept);
        if (coverage) engine.setCoverage(coverage);

        engine.setLineOfScrimmage(losPosition);
        const state = engine.getGameState();

        const defenders = state.players.filter(p => p.team === 'defense');

        // Check that all defenders are positioned relative to the new LOS
        defenders.forEach(defender => {
          const depth = defender.position.y - losPosition;

          // Debug log for failures
          if (depth < 1) {
            console.log(`[LOS Test] ${defender.id} (${defender.playerType}) at depth ${depth} from LOS ${losPosition} (y=${defender.position.y})`);
          }

          // All defenders should be behind the LOS (positive depth)
          expect(depth).toBeGreaterThanOrEqual(1);

          // Check specific position depths based on coverage
          if (defender.playerType === 'CB') {
            // Corners in Cover 3 should be 6-8 yards deep
            if (depth < 6 || depth > 8) {
              console.log(`[LOS Test] CB ${defender.id} depth issue: ${depth} at LOS ${losPosition}`);
            }
            expect(depth).toBeGreaterThanOrEqual(6);
            expect(depth).toBeLessThanOrEqual(8);
          } else if (defender.playerType === 'S' && defender.id === 'FS') {
            // Free safety should be deep (12-15 yards)
            expect(depth).toBeGreaterThanOrEqual(12);
            expect(depth).toBeLessThanOrEqual(15);
          } else if (defender.playerType === 'LB') {
            // Linebackers should be 5-12 yards deep
            expect(depth).toBeGreaterThanOrEqual(5);
            expect(depth).toBeLessThanOrEqual(12);
          }
        });
      });
    });

    test('Motion adjustments should use current LOS after field position change', () => {
      // Start at one position
      engine.setLineOfScrimmage(40);

      const beforeMotion = engine.getGameState();
      const receiver = beforeMotion.players.find(p =>
        p.team === 'offense' && p.isEligible && p.playerType === 'WR'
      );

      if (receiver) {
        // Send receiver in motion
        engine.sendInMotion(receiver.id);

        const afterMotion = engine.getGameState();
        const defenders = afterMotion.players.filter(p => p.team === 'defense');

        // All defenders should still be positioned relative to LOS 40
        defenders.forEach(defender => {
          const depth = defender.position.y - 40;
          expect(depth).toBeGreaterThanOrEqual(1);
          expect(depth).toBeLessThanOrEqual(35);
        });
      }

      // Now change LOS and try motion again
      engine.reset();
      engine.setLineOfScrimmage(70);

      const newState = engine.getGameState();
      const newReceiver = newState.players.find(p =>
        p.team === 'offense' && p.isEligible && p.playerType === 'WR'
      );

      if (newReceiver) {
        engine.sendInMotion(newReceiver.id);

        const afterNewMotion = engine.getGameState();
        const newDefenders = afterNewMotion.players.filter(p => p.team === 'defense');

        // All defenders should now be positioned relative to LOS 70
        newDefenders.forEach(defender => {
          const depth = defender.position.y - 70;
          expect(depth).toBeGreaterThanOrEqual(1);
          expect(depth).toBeLessThanOrEqual(35);
        });
      }
    });

    test('Coverage changes should respect current LOS', () => {
      const coverages = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4', 'tampa-2', 'cover-6'];
      const losPosition = 60;

      engine.setLineOfScrimmage(losPosition);

      coverages.forEach(coverageType => {
        const coverage = DataLoader.getCoverage(coverageType);
        if (coverage) {
          engine.setCoverage(coverage);
          const state = engine.getGameState();

          const defenders = state.players.filter(p => p.team === 'defense');

          // All defenders should be positioned relative to current LOS
          defenders.forEach(defender => {
            const depth = defender.position.y - losPosition;

            // Basic sanity check - all defenders behind LOS
            expect(depth).toBeGreaterThanOrEqual(0.5);

            // No defender should be unreasonably deep
            expect(depth).toBeLessThanOrEqual(40);

            // Coverage-specific checks
            if (coverageType === 'cover-0' && defender.playerType === 'CB') {
              // Press coverage - should be very close to LOS
              expect(depth).toBeLessThanOrEqual(5);
            } else if (coverageType === 'cover-2' && defender.playerType === 'S') {
              // Deep safeties in Cover 2
              expect(depth).toBeGreaterThanOrEqual(12);
            }
          });
        }
      });
    });

    test('Next play should properly update defensive alignment to new LOS', () => {
      // Simulate a play and advance
      engine.setLineOfScrimmage(30);
      engine.snap();

      // Simulate a completion for 15 yards
      const receiver = engine.getGameState().players.find(p =>
        p.team === 'offense' && p.isEligible && p.playerType === 'WR'
      );

      if (receiver) {
        // Mock a catch outcome
        engine['gameState'].outcome = {
          type: 'catch',
          receiver: receiver.id,
          yards: 15,
          openness: 50,
          catchProbability: 75,
          endPosition: { x: 26.665, y: 45 }
        };

        // Advance to next play
        engine.advanceToNextPlay();

        const newState = engine.getGameState();
        const defenders = newState.players.filter(p => p.team === 'defense');

        // New LOS should be at 45 (30 + 15)
        expect(newState.lineOfScrimmage).toBe(45);

        // All defenders should be positioned relative to new LOS (45)
        defenders.forEach(defender => {
          const depth = defender.position.y - 45;
          expect(depth).toBeGreaterThanOrEqual(1);
          expect(depth).toBeLessThanOrEqual(35);
        });
      }
    });

    test('Safety scenario should reset defensive alignment to 30-yard line', () => {
      // Set LOS very close to offensive endzone
      engine.setLineOfScrimmage(1);

      const state = engine.getGameState();

      // Should trigger safety and reset to 30
      expect(state.lineOfScrimmage).toBe(30);

      const defenders = state.players.filter(p => p.team === 'defense');

      // All defenders should be positioned relative to LOS 30
      defenders.forEach(defender => {
        const depth = defender.position.y - 30;
        expect(depth).toBeGreaterThanOrEqual(1);
        expect(depth).toBeLessThanOrEqual(35);
      });
    });
  });
});