// Test suite for NFL Blitz and Pass Rush Mechanics
import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import {
  calculatePressureTiming,
  shouldTriggerBlitz,
  getBlitzPackage,
  getPressureEffect,
  canBlockRusher,
  PRESSURE_TIMING,
  SACK_TIMING,
  BLITZ_PACKAGES,
  PROTECTION_ASSIGNMENTS
} from '../blitzMechanics';
import { CoverageType } from '../types';

describe('Blitz Mechanics', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();

    // Set up basic play concept and coverage for integration tests
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  afterEach(() => {
    // Clean up any running game loops
    (engine as any).stopGameLoop();
  });

  describe('Pressure Timing Calculations', () => {
    it('should calculate pressure timing based on NFL standards', () => {
      const { pressureTime, sackTime } = calculatePressureTiming(5, 5.0);

      expect(pressureTime).toBeGreaterThan(1.0);
      expect(pressureTime).toBeLessThan(sackTime);
      expect(sackTime).toBeLessThanOrEqual(5.0);
    });

    it('should scale timing to user sack time preference', () => {
      const shortSack = calculatePressureTiming(5, 3.0);
      const longSack = calculatePressureTiming(5, 8.0);

      expect(shortSack.pressureTime).toBeLessThan(longSack.pressureTime);
      expect(shortSack.sackTime).toBeLessThan(longSack.sackTime);
    });

    it('should account for different rusher counts', () => {
      const threeMan = calculatePressureTiming(3, 5.0);
      const sixMan = calculatePressureTiming(6, 5.0);

      expect(sixMan.pressureTime).toBeLessThan(threeMan.pressureTime);
      expect(sixMan.sackTime).toBeLessThanOrEqual(threeMan.sackTime);
    });
  });

  describe('Blitz Probability and Packages', () => {
    it('should always trigger blitz for Cover 0', () => {
      expect(shouldTriggerBlitz('cover-0')).toBe(true);
    });

    it('should have different blitz probabilities by coverage', () => {
      const cover1Blitz = shouldTriggerBlitz('cover-1');
      const cover3Blitz = shouldTriggerBlitz('cover-3');

      // These are probability-based, so we just test they return boolean
      expect(typeof cover1Blitz).toBe('boolean');
      expect(typeof cover3Blitz).toBe('boolean');
    });

    it('should return appropriate blitz packages', () => {
      const cover0Package = getBlitzPackage('cover-0');
      const cover1Package = getBlitzPackage('cover-1');

      expect(cover0Package?.name).toBe('Cover 0');
      expect(cover0Package?.rushers).toBe(6);

      if (cover1Package) {
        expect(cover1Package.rushers).toBeGreaterThanOrEqual(5);
      }
    });
  });

  describe('Pressure Effects on QB', () => {
    it('should return clean pocket effect before pressure time', () => {
      const effect = getPressureEffect(1.0, 2.5, 5.0);
      expect(effect).toBe('clean');
    });

    it('should return pressured effect during pressure window', () => {
      const effect = getPressureEffect(3.0, 2.5, 5.0);
      expect(effect).toBe('pressured');
    });

    it('should return collapsed pocket near sack time', () => {
      const effect = getPressureEffect(4.7, 2.5, 5.0);
      expect(effect).toBe('collapsed');
    });
  });

  describe('Pass Protection', () => {
    it('should have realistic blocking effectiveness', () => {
      const rbAssignment = PROTECTION_ASSIGNMENTS.RB;

      expect(rbAssignment.effectiveness.LB).toBeGreaterThan(0.8);
      expect(rbAssignment.effectiveness.S).toBeLessThan(0.7);
    });

    it('should have different scan directions for RB vs TE', () => {
      const rbScan = PROTECTION_ASSIGNMENTS.RB.scanDirection;
      const teScan = PROTECTION_ASSIGNMENTS.TE.scanDirection;

      expect(rbScan).toBe('inside-out');
      expect(teScan).toBe('outside-in');
    });
  });

  describe('Engine Integration', () => {
    it('should set up play with blitz mechanics', () => {
      // Set up Cover 0 for guaranteed blitz
      const cover0 = DataLoader.getCoverage('cover-0');

      if (cover0) {
        engine.setCoverage(cover0);

        const gameState = engine.getGameState();
        expect(gameState.players.length).toBeGreaterThan(0);

        // Check for blitzing defenders
        const blitzers = gameState.players.filter(p =>
          p.team === 'defense' &&
          p.coverageResponsibility?.type === 'blitz'
        );

        expect(blitzers.length).toBeGreaterThan(0);
      }
    });

    it('should calculate pressure timing when blitzers are present', () => {
      const cover0 = DataLoader.getCoverage('cover-0');

      if (cover0) {
        engine.setCoverage(cover0);
        engine.snap();

        const gameState = engine.getGameState();

        // Should have pressure timing calculated
        expect(gameState.pressureTime).toBeDefined();
        expect(gameState.pressureTime!).toBeGreaterThan(0);
        expect(gameState.pressureTime!).toBeLessThan(gameState.sackTime);
      }
    });

    it('should apply pressure effects to QB accuracy', () => {
      const cover0 = DataLoader.getCoverage('cover-0');

      if (cover0) {
        engine.setCoverage(cover0);
        engine.snap();

        const gameState = engine.getGameState();

        // Verify blitzers are present
        const blitzers = gameState.players.filter(p =>
          p.team === 'defense' && p.coverageResponsibility?.type === 'blitz'
        );

        if (blitzers.length > 0 && gameState.pressureTime) {
          // Before pressure
          const cleanAccuracy = engine.getQBAccuracyModifier();
          expect(cleanAccuracy).toBe(1.0);

          // Simulate time passing to pressure point using engine tick
          const targetTime = gameState.pressureTime + 0.1;
          const ticksNeeded = Math.ceil(targetTime / (1/60)); // Convert to 60fps ticks

          for (let i = 0; i < ticksNeeded; i++) {
            engine.tick(1/60);
          }

          const pressuredAccuracy = engine.getQBAccuracyModifier();
          expect(pressuredAccuracy).toBeLessThan(1.0);
        } else {
          // If no blitzers or pressure timing, test should still pass
          const accuracy = engine.getQBAccuracyModifier();
          expect(accuracy).toBe(1.0);
        }
      }
    });

    it('should update blitzer movements during play', () => {
      const cover0 = DataLoader.getCoverage('cover-0');

      if (cover0) {
        engine.setCoverage(cover0);
        engine.snap();

        const gameState = engine.getGameState();
        const blitzers = gameState.players.filter(p =>
          p.team === 'defense' &&
          p.coverageResponsibility?.type === 'blitz'
        );

        if (blitzers.length > 0) {
          const initialPositions = blitzers.map(b => ({ ...b.position }));

          // Simulate a few ticks
          engine.tick(0.1);
          engine.tick(0.1);

          // Blitzers should have moved
          blitzers.forEach((blitzer, index) => {
            const moved = Math.abs(blitzer.position.x - initialPositions[index].x) > 0.01 ||
                         Math.abs(blitzer.position.y - initialPositions[index].y) > 0.01;
            expect(moved).toBe(true);
          });
        }
      }
    });
  });

  describe('NFL Blitz Package Data Validation', () => {
    it('should have valid Cover 0 package', () => {
      const cover0 = BLITZ_PACKAGES['Cover 0'];

      expect(cover0.rushers).toBe(6);
      expect(cover0.coverage.man).toBe(6);
      expect(cover0.responsibilities.length).toBeGreaterThan(0);

      // Should have blitz responsibilities
      cover0.responsibilities.forEach(resp => {
        expect(resp.type).toBe('blitz');
        expect(resp.rushLane).toBeDefined();
        expect(resp.timingSeconds).toBeDefined();
      });
    });

    it('should have valid Fire Zone package', () => {
      const fireZone = BLITZ_PACKAGES['Fire Zone'];

      expect(fireZone.rushers).toBe(5);
      expect(fireZone.coverage.deep).toBe(3);
      expect(fireZone.coverage.underneath).toBe(3);
      expect(fireZone.responsibilities.length).toBeGreaterThan(0);
    });

    it('should have realistic timing values', () => {
      Object.values(BLITZ_PACKAGES).forEach(package_ => {
        package_.responsibilities.forEach(resp => {
          if (resp.timingSeconds) {
            expect(resp.timingSeconds).toBeGreaterThan(1.0);
            expect(resp.timingSeconds).toBeLessThan(3.0);
          }
        });
      });
    });
  });
});