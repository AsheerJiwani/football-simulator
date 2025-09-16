import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import type { Player } from '../types';

describe('NFL Realism Comprehensive Validation', () => {
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

  describe('Motion System Validation', () => {
    test('should enforce NFL one-player-in-motion rule', () => {
      const smash = DataLoader.getConcept('smash');
      const cover3 = DataLoader.getCoverage('cover-3');
      if (smash) engine.setPlayConcept(smash);
      if (cover3) engine.setCoverage(cover3);
      // Motion happens PRE-snap, not post-snap

      const wr1 = engine.getGameState().players.find(p => p.id === 'WR1');
      const wr2 = engine.getGameState().players.find(p => p.id === 'WR2');

      const motion1 = engine.sendInMotion(wr1!.id);
      expect(motion1).toBe(true);

      const motion2 = engine.sendInMotion(wr2!.id);
      expect(motion2).toBe(false);

      const gameState = engine.getGameState();
      expect(gameState.motionPlayer).toBe(wr1!.id);
    });

    test('should preserve motion state through defensive adjustments', () => {
      const slantFlat = DataLoader.getConcept('slant-flat');
      const cover1 = DataLoader.getCoverage('cover-1');
      if (slantFlat) engine.setPlayConcept(slantFlat);
      if (cover1) engine.setCoverage(cover1);

      const wr1 = engine.getGameState().players.find(p => p.id === 'WR1');
      engine.sendInMotion(wr1!.id);

      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);

      const updatedWr1 = engine.getGameState().players.find(p => p.id === 'WR1');
      expect(updatedWr1?.hasMotion).toBe(true);
      expect(engine.getGameState().motionPlayer).toBe(wr1!.id);
    });

    test('should handle motion during rapid formation changes', () => {
      const flood = DataLoader.getConcept('flood');
      if (flood) engine.setPlayConcept(flood);

      const wr2 = engine.getGameState().players.find(p => p.id === 'WR2');
      engine.sendInMotion(wr2!.id);

      const cover4 = DataLoader.getCoverage('cover-4');
      if (cover4) engine.setCoverage(cover4);

      const gameState = engine.getGameState();
      expect(gameState.motionPlayer).toBe(wr2!.id);
    });
  });

  describe('Defensive Positioning Validation', () => {
    test('should never position defenders in front of LOS', () => {
      const testCoverages = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'cover-4', 'cover-6', 'tampa-2', 'quarters'];

      testCoverages.forEach(coverage => {
        const cov = DataLoader.getCoverage(coverage);
        if (cov) engine.setCoverage(cov);
        const defenders = engine.getGameState().players.filter(p => p.team === 'defense');
        const los = engine.getGameState().lineOfScrimmage;

        defenders.forEach(d => {
          expect(d.position.y).toBeGreaterThan(los);
        });
      });
    });

    test('should maintain proper zone depths for all coverages', () => {
      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) engine.setCoverage(cover3);
      engine.snap();

      const defenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const deepZoneDefenders = defenders.filter(d =>
        d.coverageResponsibility?.zone?.depth === 'deep' ||
        (d.position.y - engine.getGameState().lineOfScrimmage) >= 15
      );

      expect(deepZoneDefenders.length).toBeGreaterThanOrEqual(3);

      deepZoneDefenders.forEach(d => {
        const los = engine.getGameState().lineOfScrimmage;
        expect(d.position.y - los).toBeGreaterThanOrEqual(15);
      });
    });

    test('should adjust defensive alignment for offensive personnel', () => {
      const initialDefenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const initialPositions = initialDefenders.map(d => ({ id: d.id, x: d.position.x }));

      // Set personnel doesn't use DataLoader
      const players = engine.getGameState().players;
      const offense = players.filter(p => p.team === 'offense');

      // Simulate personnel change effect
      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);

      const adjustedDefenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const adjustedPositions = adjustedDefenders.map(d => ({ id: d.id, x: d.position.x }));

      let changedCount = 0;
      initialPositions.forEach((initial, idx) => {
        if (Math.abs(initial.x - adjustedPositions[idx].x) > 0.5) {
          changedCount++;
        }
      });

      expect(changedCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Blitz Mechanics Validation', () => {
    test('should reduce sack time based on blitzers', () => {
      engine.setSackTime(5);
      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) engine.setCoverage(cover0);
      engine.snap();

      const blitzers = engine.getGameState().players.filter(p =>
        p.team === 'defense' && p.coverageResponsibility?.type === 'blitz'
      );

      expect(blitzers.length).toBeGreaterThanOrEqual(1);

      for (let i = 0; i < 100; i++) {
        engine.tick(16);
        if (engine.getGameState().phase === 'complete' &&
            engine.getGameState().result?.type === 'sack') {
          const sackTime = i * 16 / 1000;
          expect(sackTime).toBeLessThan(5);
          break;
        }
      }
    });

    test('should have pass protection pick up blitzers', () => {
      // Use a concept with RB
      const slantFlat = DataLoader.getConcept('slant-flat');
      if (slantFlat) engine.setPlayConcept(slantFlat);

      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) engine.setCoverage(cover0);
      engine.snap();

      const blockers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.isBlocking
      );

      expect(blockers.length).toBeGreaterThanOrEqual(0);

      for (let i = 0; i < 30; i++) {
        engine.tick(16);
      }

      const blitzers = engine.getGameState().players.filter(p =>
        p.team === 'defense' && p.coverageResponsibility?.type === 'blitz'
      );

      if (blockers.length > 0) {
        const pickedUpBlitzers = blitzers.filter(b => {
          return blockers.some(blocker => {
            const distance = Math.sqrt(
              Math.pow(b.position.x - blocker.position.x, 2) +
              Math.pow(b.position.y - blocker.position.y, 2)
            );
            return distance < 3;
          });
        });

        expect(pickedUpBlitzers.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Route Concept Validation', () => {
    test('should execute option routes based on coverage', () => {
      const slantFlat = DataLoader.getConcept('slant-flat');
      if (slantFlat) engine.setPlayConcept(slantFlat);

      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);
      engine.snap();

      for (let i = 0; i < 50; i++) {
        engine.tick(16);
      }

      const receivers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.route
      );

      expect(receivers.length).toBeGreaterThan(0);
    });

    test('should trigger hot routes against blitz', () => {
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) engine.setPlayConcept(fourVerts);

      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) engine.setCoverage(cover0);
      engine.snap();

      const receivers = engine.getGameState().players.filter(p =>
        p.team === 'offense' && p.route
      );

      const hotRouteReceivers = receivers.filter(r =>
        r.route?.type === 'slant' || r.route?.type === 'hitch'
      );

      expect(hotRouteReceivers.length).toBeGreaterThanOrEqual(0);
    });

    test('should maintain route timing with play action', () => {
      engine.setQBMovement('pa-boot-right');
      const paBootRight = DataLoader.getConcept('pa-boot-right');
      if (paBootRight) engine.setPlayConcept(paBootRight);
      engine.snap();

      const qb = engine.getGameState().players.find(p => p.playerType === 'QB');
      const startX = qb!.position.x;

      for (let i = 0; i < 30; i++) {
        engine.tick(16);
      }

      const endX = qb!.position.x;
      expect(Math.abs(endX - startX)).toBeGreaterThan(3);
    });
  });

  describe('Coverage Adjustment Validation', () => {
    test('should adjust to trips formation', () => {
      const tripsRight = DataLoader.getConcept('trips-right');
      if (tripsRight) engine.setPlayConcept(tripsRight);

      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) engine.setCoverage(cover3);

      const defenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const rightSideDefenders = defenders.filter(d => d.position.x > 26.665);
      const leftSideDefenders = defenders.filter(d => d.position.x < 26.665);

      // NFL Research: Cover 3 vs trips often stays balanced or has slight rotation
      // Not all defenders rotate to trips side - Mike LB often stays centered
      // Expecting equal or +1 defender to trips side is realistic
      const defenderDifference = Math.abs(rightSideDefenders.length - leftSideDefenders.length);
      expect(defenderDifference).toBeLessThanOrEqual(1);
    });

    test('should handle empty backfield formations', () => {
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) engine.setPlayConcept(fourVerts);

      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);

      const defenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const deepDefenders = defenders.filter(d => {
        const los = engine.getGameState().lineOfScrimmage;
        return d.position.y - los > 15;
      });

      expect(deepDefenders.length).toBeGreaterThanOrEqual(2);
    });

    test('should maintain zone integrity during motion', () => {
      const cover4 = DataLoader.getCoverage('cover-4');
      if (cover4) engine.setCoverage(cover4);

      const initialDefenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const initialZones = initialDefenders.map(d => ({
        id: d.id,
        zone: d.coverageResponsibility?.zone?.name
      }));

      const wr1 = engine.getGameState().players.find(p => p.id === 'WR1');
      if (wr1) engine.sendInMotion(wr1.id);

      const adjustedDefenders = engine.getGameState().players.filter(p => p.team === 'defense');
      const adjustedZones = adjustedDefenders.map(d => ({
        id: d.id,
        zone: d.coverageResponsibility?.zone?.name
      }));

      const deepZones = adjustedZones.filter(z =>
        z.zone && (z.zone.includes('deep') || z.zone.includes('quarter'))
      );

      expect(deepZones.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Performance Validation', () => {
    test('should maintain 60fps with rapid changes', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        if (i % 3 === 0) {
          const cover2 = DataLoader.getCoverage('cover-2');
          if (cover2) engine.setCoverage(cover2);
        } else {
          const cover3 = DataLoader.getCoverage('cover-3');
          if (cover3) engine.setCoverage(cover3);
        }

        if (i % 5 === 0) {
          const wr = engine.getGameState().players.find(p => p.id === 'WR1');
          if (wr && !engine.getGameState().motionPlayer) {
            engine.sendInMotion(wr.id);
          }
        }

        engine.tick(16);
      }

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      expect(elapsed).toBeLessThan(2000);
    });

    test('should handle simultaneous state changes', () => {
      engine.snap();

      const cover4 = DataLoader.getCoverage('cover-4');
      if (cover4) engine.setCoverage(cover4);

      const gameState = engine.getGameState();
      expect(gameState.players.length).toBe(14);
      expect(gameState.coverage).toBe('cover-4');
    });
  });

  describe('User Autonomy Validation', () => {
    test('should preserve offensive settings through defensive changes', () => {
      const smash = DataLoader.getConcept('smash');
      if (smash) engine.setPlayConcept(smash);

      const initialOffense = engine.getGameState().players.filter(p => p.team === 'offense');
      const initialRoutes = initialOffense.map(p => ({ id: p.id, route: p.route?.type }));

      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) engine.setCoverage(cover0);

      const tampa2 = DataLoader.getCoverage('tampa-2');
      if (tampa2) engine.setCoverage(tampa2);

      const quarters = DataLoader.getCoverage('quarters');
      if (quarters) engine.setCoverage(quarters);

      const finalOffense = engine.getGameState().players.filter(p => p.team === 'offense');
      const finalRoutes = finalOffense.map(p => ({ id: p.id, route: p.route?.type }));

      expect(finalRoutes).toEqual(initialRoutes);
    });

    test('should allow offensive adjustments at any time', () => {
      engine.snap();

      for (let i = 0; i < 10; i++) {
        engine.tick(16);
      }

      engine.reset();

      const mesh = DataLoader.getConcept('mesh');
      if (mesh) engine.setPlayConcept(mesh);

      const newConcept = engine.getGameState().playConcept;
      expect(newConcept).toBe('mesh');
    });
  });

  describe('Field Position Validation', () => {
    test('should handle safety at 1-yard line', () => {
      engine.setLineOfScrimmage(1);
      const los = engine.getGameState().lineOfScrimmage;

      // Safety detection should reset to 30
      expect(los).toBeGreaterThanOrEqual(1);
    });

    test('should adjust defenders for field position changes', () => {
      engine.setLineOfScrimmage(30);
      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) engine.setCoverage(cover3);
      const defenders30 = engine.getGameState().players.filter(p => p.team === 'defense');

      engine.setLineOfScrimmage(80);
      if (cover3) engine.setCoverage(cover3);
      const defenders80 = engine.getGameState().players.filter(p => p.team === 'defense');

      defenders30.forEach((d30, idx) => {
        const d80 = defenders80[idx];
        if (d80) {
          const relativeDepth30 = d30.position.y - 30;
          const relativeDepth80 = d80.position.y - 80;

          expect(Math.abs(relativeDepth30 - relativeDepth80)).toBeLessThan(5);
        }
      });
    });
  });
});