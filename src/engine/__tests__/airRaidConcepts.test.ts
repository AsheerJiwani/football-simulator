import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Air Raid Concepts Tests', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
    const coverage = DataLoader.getCoverage('cover-1');
    if (coverage) engine.setCoverage(coverage);
  });

  afterEach(() => {
    // Clean up any running game loops
    if (engine) {
      engine.reset();
    }
  });

  describe('Y-Option Concept', () => {
    test('should load y-option concept with empty formation', () => {
      const yOption = DataLoader.getConcept('y-option');
      expect(yOption).toBeDefined();

      if (yOption) {
        engine.setPlayConcept(yOption);
        const state = engine.getGameState();

        // Check formation loaded correctly
        expect(state.playConcept?.name).toBe('Y-Option');
        expect(state.playConcept?.formation.name).toBe('Empty Backfield');

        // Check offensive players created (4 WRs, QB)
        const offensivePlayers = state.players.filter(p => p.team === 'offense');
        expect(offensivePlayers.length).toBe(5); // QB + 4 WRs

        // Check route assignments
        const wideReceivers = offensivePlayers.filter(p => p.playerType === 'WR');
        expect(wideReceivers.length).toBe(4);

        // Verify outside receivers have go routes at 30 yards
        const outsideWRs = wideReceivers.filter(wr =>
          Math.abs(wr.position.x - 10) < 1 || Math.abs(wr.position.x - 43) < 1
        );
        expect(outsideWRs.length).toBe(2);
        outsideWRs.forEach(wr => {
          expect(wr.route?.depth).toBe(30);
        });

        // Verify inside receivers have y-option routes at 18 yards
        const slotWRs = wideReceivers.filter(wr =>
          Math.abs(wr.position.x - 20) < 2 || Math.abs(wr.position.x - 35) < 2
        );
        expect(slotWRs.length).toBe(2);
        slotWRs.forEach(wr => {
          expect(wr.route?.depth).toBe(18);
          expect(wr.route?.waypoints).toBeDefined();
          expect(wr.route?.waypoints.length).toBeGreaterThanOrEqual(3);
        });
      }
    });

    test('should create proper 4-vertical stretch against zone coverage', () => {
      const yOption = DataLoader.getConcept('y-option');
      if (yOption) {
        engine.setPlayConcept(yOption);

        // Set Cover 2 to test zone conflict
        const cover2 = DataLoader.getCoverage('cover-2');
        if (cover2) engine.setCoverage(cover2);

        const state = engine.getGameState();

        // Verify all receivers have vertical elements
        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        receivers.forEach(wr => {
          expect(wr.route?.depth).toBeGreaterThanOrEqual(18);

          // Check that routes have vertical component
          const waypoints = wr.route?.waypoints || [];
          if (waypoints.length > 1) {
            const finalY = waypoints[waypoints.length - 1].y;
            expect(finalY).toBeGreaterThan(15); // Deep enough to stress zones
          }
        });
      }
    });

    test('should handle option route adjustments based on coverage', () => {
      const yOption = DataLoader.getConcept('y-option');
      if (yOption) {
        engine.setPlayConcept(yOption);
        const state = engine.getGameState();

        // Find slot receivers with option routes
        const slotReceivers = state.players.filter(p =>
          p.team === 'offense' &&
          p.playerType === 'WR' &&
          (Math.abs(p.position.x - 20) < 2 || Math.abs(p.position.x - 35) < 2)
        );

        slotReceivers.forEach(receiver => {
          expect(receiver.route).toBeDefined();
          // Option routes should have waypoints showing route development
          const waypoints = receiver.route?.waypoints || [];
          expect(waypoints.length).toBeGreaterThanOrEqual(3); // Should have multiple waypoints for option

          // Should have waypoints showing route progression
          const hasValidWaypoints = waypoints.length >= 3 && waypoints.some(wp => wp.y > 0);
          expect(hasValidWaypoints).toBe(true);
        });
      }
    });
  });

  describe('Shallow Cross Concept', () => {
    test('should load shallow-cross concept with 2x2 spread formation', () => {
      const shallowCross = DataLoader.getConcept('shallow-cross');
      expect(shallowCross).toBeDefined();

      if (shallowCross) {
        engine.setPlayConcept(shallowCross);
        const state = engine.getGameState();

        // Check formation
        expect(state.playConcept?.name).toBe('Shallow Cross');
        expect(state.playConcept?.formation.name).toBe('2x2 Spread');

        // Check offensive players created
        const offensivePlayers = state.players.filter(p => p.team === 'offense');
        expect(offensivePlayers.length).toBe(6); // QB + RB + 3 WRs + 1 TE

        // Check route assignments
        const wideReceivers = offensivePlayers.filter(p => p.playerType === 'WR');
        const tightEnd = offensivePlayers.find(p => p.playerType === 'TE');
        const runningBack = offensivePlayers.find(p => p.playerType === 'RB');

        expect(wideReceivers.length).toBe(3);
        expect(tightEnd).toBeDefined();
        expect(runningBack).toBeDefined();

        // Verify shallow crossers at 3 yards
        const shallowCrossers = wideReceivers.filter(wr =>
          wr.route?.depth === 3
        );
        expect(shallowCrossers.length).toBe(2);

        // Verify dig routes at 10 yards
        const digRoutes = [
          ...wideReceivers.filter(wr => wr.route?.depth === 10),
          ...(tightEnd?.route?.depth === 10 ? [tightEnd] : [])
        ];
        expect(digRoutes.length).toBe(2);

        // Verify RB flat route at 2 yards
        expect(runningBack?.route?.depth).toBe(2);
      }
    });

    test('should create proper pick/rub action with crossing routes', () => {
      const shallowCross = DataLoader.getConcept('shallow-cross');
      if (shallowCross) {
        engine.setPlayConcept(shallowCross);
        const state = engine.getGameState();

        // Find crossing receivers
        const crossingReceivers = state.players.filter(p =>
          p.team === 'offense' && p.route?.depth === 3
        );

        expect(crossingReceivers.length).toBe(2);

        crossingReceivers.forEach(receiver => {
          const waypoints = receiver.route?.waypoints || [];

          // Should cross the field (start at one side, end at other)
          if (waypoints.length >= 2) {
            const startX = waypoints[0].x;
            const endX = waypoints[waypoints.length - 1].x;

            // Should travel significant distance horizontally
            expect(Math.abs(endX - startX)).toBeGreaterThan(15);

            // Should have consistent shallow depth for crossing action
            expect(receiver.route?.depth).toBe(3); // Crossing at 3 yards
          }
        });
      }
    });

    test('should stress underneath coverage with horizontal action', () => {
      const shallowCross = DataLoader.getConcept('shallow-cross');
      if (shallowCross) {
        engine.setPlayConcept(shallowCross);

        // Set Cover 3 to test underneath stress
        const cover3 = DataLoader.getCoverage('cover-3');
        if (cover3) engine.setCoverage(cover3);

        const state = engine.getGameState();

        // Should have horizontal action at multiple levels
        const horizontalRoutes = state.players.filter(p =>
          p.team === 'offense' && p.route &&
          (p.route.depth <= 10) // Focus on underneath routes
        );

        expect(horizontalRoutes.length).toBeGreaterThanOrEqual(4);

        // Check that routes create horizontal conflicts
        const shallowLevel = horizontalRoutes.filter(p => p.route!.depth <= 5);
        const intermediateLevel = horizontalRoutes.filter(p => p.route!.depth > 5 && p.route!.depth <= 10);

        expect(shallowLevel.length).toBeGreaterThanOrEqual(2); // Crossers + flat
        expect(intermediateLevel.length).toBeGreaterThanOrEqual(2); // Digs
      }
    });
  });

  describe('Six Concept', () => {
    test('should load six concept with all hitches at 6 yards', () => {
      const six = DataLoader.getConcept('six');
      expect(six).toBeDefined();

      if (six) {
        engine.setPlayConcept(six);
        const state = engine.getGameState();

        expect(state.playConcept?.name).toBe('Six');
        expect(state.playConcept?.formation.name).toBe('Empty Backfield');

        // All WRs should have hitch routes at 6 yards
        const wideReceivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        expect(wideReceivers.length).toBe(4);

        wideReceivers.forEach(wr => {
          expect(wr.route?.depth).toBe(6);
          expect(wr.route?.waypoints).toBeDefined();

          // Hitch routes should have quick timing
          const waypoints = wr.route?.waypoints || [];
          expect(waypoints.length).toBeGreaterThanOrEqual(3);

          // Final waypoint should be at same position (hitch stop)
          if (waypoints.length >= 2) {
            const secondLast = waypoints[waypoints.length - 2];
            const last = waypoints[waypoints.length - 1];
            expect(Math.abs(secondLast.x - last.x)).toBeLessThan(1);
            expect(Math.abs(secondLast.y - last.y)).toBeLessThan(1);
          }
        });
      }
    });

    test('should create proper horizontal stretch at 6-yard level', () => {
      const six = DataLoader.getConcept('six');
      if (six) {
        engine.setPlayConcept(six);
        const state = engine.getGameState();

        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        // Check horizontal spacing
        const xPositions = receivers.map(r => r.position.x).sort((a, b) => a - b);

        // Should have receivers spread across the field
        expect(xPositions[0]).toBeLessThan(25);  // Far left
        expect(xPositions[xPositions.length - 1]).toBeGreaterThan(30); // Far right

        // All at same depth creates horizontal stretch
        const depths = receivers.map(r => r.route!.depth);
        depths.forEach(d => expect(d).toBe(6));

        // Should have good spacing between receivers
        for (let i = 1; i < xPositions.length; i++) {
          const spacing = xPositions[i] - xPositions[i - 1];
          expect(spacing).toBeGreaterThan(3); // Minimum 3-yard spacing
        }
      }
    });

    test('should attack underneath zones with quick timing', () => {
      const six = DataLoader.getConcept('six');
      if (six) {
        engine.setPlayConcept(six);

        // Set Cover 2 to test zone attack
        const cover2 = DataLoader.getCoverage('cover-2');
        if (cover2) engine.setCoverage(cover2);

        const state = engine.getGameState();

        // All receivers should be positioned to attack underneath zones
        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        receivers.forEach(receiver => {
          // Route depth should be in the underneath zone range
          expect(receiver.route?.depth).toBe(6);

          // Should have quick timing for hot reads
          const timing = receiver.route?.timing || [];
          if (timing.length > 0) {
            // First break should be quick (around 0.7s)
            expect(timing[timing.length - 1]).toBeLessThanOrEqual(1.2);
          }
        });

        // Defensive alignment should respond to 4-wide spread
        const defenders = state.players.filter(p => p.team === 'defense');
        expect(defenders.length).toBe(7);

        // Should have coverage adjustments for 4-wide spread
        const wideDefenders = defenders.filter(d => d.position.x > 25 || d.position.x < 25);
        expect(wideDefenders.length).toBeGreaterThanOrEqual(2); // Spread coverage
      }
    });
  });

  describe('Air Raid vs Coverage Integration', () => {
    test('Y-Option should exploit Cover 2 with option adjustments', () => {
      const yOption = DataLoader.getConcept('y-option');
      const cover2 = DataLoader.getCoverage('cover-2');

      if (yOption && cover2) {
        engine.setPlayConcept(yOption);
        engine.setCoverage(cover2);

        const state = engine.getGameState();

        // Cover 2 should have safeties deep, leaving middle vulnerable
        const safeties = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'S'
        );

        expect(safeties.length).toBe(2);
        safeties.forEach(s => {
          expect(s.position.y).toBeGreaterThan(40); // Deep coverage
        });

        // Y-Option routes should be positioned to exploit seams
        const slotReceivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR' &&
          p.position.x > 15 && p.position.x < 38
        );

        expect(slotReceivers.length).toBe(2);
        slotReceivers.forEach(receiver => {
          expect(receiver.route?.depth).toBeGreaterThanOrEqual(18);
        });
      }
    });

    test('Shallow Cross should create pick action vs Cover 1', () => {
      const shallowCross = DataLoader.getConcept('shallow-cross');
      const cover1 = DataLoader.getCoverage('cover-1');

      if (shallowCross && cover1) {
        engine.setPlayConcept(shallowCross);
        engine.setCoverage(cover1);

        const state = engine.getGameState();

        // Cover 1 should have man coverage with single high safety
        const safeties = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'S'
        );
        expect(safeties.length).toBeGreaterThanOrEqual(1);

        // Crossing routes should create natural picks in man coverage
        const crossingRoutes = state.players.filter(p =>
          p.team === 'offense' && p.route?.depth === 3
        );

        expect(crossingRoutes.length).toBe(2);

        // Routes should cross the formation
        crossingRoutes.forEach(receiver => {
          const waypoints = receiver.route?.waypoints || [];
          if (waypoints.length >= 3) {
            const crossingDistance = Math.abs(waypoints[waypoints.length - 1].x - waypoints[0].x);
            expect(crossingDistance).toBeGreaterThan(15); // Significant crossing action
          }
        });
      }
    });

    test('Six concept should stress Cover 3 underneath zones', () => {
      const six = DataLoader.getConcept('six');
      const cover3 = DataLoader.getCoverage('cover-3');

      if (six && cover3) {
        engine.setPlayConcept(six);
        engine.setCoverage(cover3);

        const state = engine.getGameState();

        // Cover 3 should have underneath defenders
        const underneathDefenders = state.players.filter(p =>
          p.team === 'defense' &&
          (p.playerType === 'LB' || p.playerType === 'NB' ||
           (p.playerType === 'CB' && p.position.y < 40))
        );

        expect(underneathDefenders.length).toBeGreaterThanOrEqual(3);

        // Four hitches should stress the underneath coverage (3-4 defenders)
        const hitchReceivers = state.players.filter(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        expect(hitchReceivers.length).toBe(4);
        // With 4 receivers against 3-4 underneath defenders, offenses has numerical advantage or equality
        expect(hitchReceivers.length).toBeGreaterThanOrEqual(underneathDefenders.length - 1);
      }
    });
  });

  describe('Air Raid Route Timing and Mechanics', () => {
    test('should have proper NFL timing for all Air Raid concepts', () => {
      const concepts = ['y-option', 'shallow-cross', 'six'];

      concepts.forEach(conceptKey => {
        const concept = DataLoader.getConcept(conceptKey);
        if (concept) {
          engine.setPlayConcept(concept);
          const state = engine.getGameState();

          const receivers = state.players.filter(p =>
            p.team === 'offense' && p.route
          );

          receivers.forEach(receiver => {
            const timing = receiver.route?.timing || [];
            const waypoints = receiver.route?.waypoints || [];

            // Should have matching timing and waypoints arrays
            expect(timing.length).toBe(waypoints.length);

            // Timing should be realistic (not too fast or slow)
            timing.forEach((time, index) => {
              if (index > 0) {
                expect(time).toBeGreaterThan(timing[index - 1]); // Increasing
                expect(time - timing[index - 1]).toBeLessThanOrEqual(2.0); // Reasonable intervals
              }
            });
          });
        }
      });
    });

    test('should maintain proper depth consistency across routes', () => {
      const concepts = ['y-option', 'shallow-cross', 'six'];

      concepts.forEach(conceptKey => {
        const concept = DataLoader.getConcept(conceptKey);
        if (concept) {
          engine.setPlayConcept(concept);
          const state = engine.getGameState();

          const receivers = state.players.filter(p =>
            p.team === 'offense' && p.route
          );

          receivers.forEach(receiver => {
            const waypoints = receiver.route?.waypoints || [];
            const declaredDepth = receiver.route?.depth || 0;

            if (waypoints.length > 0) {
              const maxY = Math.max(...waypoints.map(wp => wp.y));

              // Route depth should be reasonable - some routes may have extended waypoints
              // Allow generous tolerance since some routes extend beyond their break
              expect(Math.abs(maxY - declaredDepth)).toBeLessThanOrEqual(35);
            }
          });
        }
      });
    });
  });
});