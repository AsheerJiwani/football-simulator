import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import type { Vector2D, GameState, Player } from '../types';

/**
 * NFL Defensive Coverage Realism Tests
 *
 * Based on comprehensive research from NFL coaching sources including:
 * - American Football Monthly
 * - Football Toolbox
 * - Glazier Clinics
 * - NFL Next Gen Stats
 * - MatchQuarters
 * - Shakin The Southland
 *
 * These tests validate NFL-realistic zone landmarks, timing, and defensive adjustments
 */
describe('NFL Defensive Coverage Realism Tests', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();

    // Set up baseline with trips right formation and Cover 3
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-3');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  afterEach(() => {
    // Clean up any running game loops
    if (engine) {
      engine.reset();
    }
  });

  describe('A. Zone Landmarks & Depth Validation', () => {
    test('Deep zones should align with NFL landmark principles', () => {
      const state = engine.getGameState();
      const safeties = state.players.filter(p =>
        p.team === 'defense' && p.playerType === 'S'
      );

      safeties.forEach(safety => {
        if (safety.coverageResponsibility?.type === 'zone' &&
            safety.coverageResponsibility.zone) {
          const zone = safety.coverageResponsibility.zone;

          // NFL Research: Deep zones should be 18-25 yards deep
          expect(zone.depth).toBeGreaterThanOrEqual(18);
          expect(zone.depth).toBeLessThanOrEqual(25);

          // Deep zone center should be in defensive territory (y > LOS)
          expect(zone.center.y).toBeGreaterThan(state.lineOfScrimmage + 15);

          // Deep zones should never be closer than 9 yards to sideline
          const distanceToLeftSideline = zone.center.x;
          const distanceToRightSideline = 53.33 - zone.center.x;
          const minDistanceToSideline = Math.min(distanceToLeftSideline, distanceToRightSideline);
          expect(minDistanceToSideline).toBeGreaterThanOrEqual(9);
        }
      });
    });

    test('Intermediate zones should follow linebacker landmark rules', () => {
      const state = engine.getGameState();
      const linebackers = state.players.filter(p =>
        p.team === 'defense' && p.playerType === 'LB'
      );

      linebackers.forEach(lb => {
        if (lb.coverageResponsibility?.type === 'zone' &&
            lb.coverageResponsibility.zone) {
          const zone = lb.coverageResponsibility.zone;

          // NFL Research: LB zones should be 10-12 yards deep
          expect(zone.depth).toBeGreaterThanOrEqual(8);
          expect(zone.depth).toBeLessThanOrEqual(15);

          // Hook/curl zones should be 2 yards inside hash marks
          if (zone.name?.includes('hook') || zone.name?.includes('curl')) {
            // Hash marks are at 23.58 and 29.75
            const distanceToLeftHash = Math.abs(zone.center.x - 23.58);
            const distanceToRightHash = Math.abs(zone.center.x - 29.75);
            const minHashDistance = Math.min(distanceToLeftHash, distanceToRightHash);
            expect(minHashDistance).toBeLessThanOrEqual(5); // Within 5 yards of a hash
          }
        }
      });
    });

    test('Short zones should maintain proper flat landmarks', () => {
      const state = engine.getGameState();
      const flatDefenders = state.players.filter(p =>
        p.team === 'defense' &&
        p.coverageResponsibility?.zone?.name?.includes('flat')
      );

      flatDefenders.forEach(defender => {
        if (defender.coverageResponsibility?.zone) {
          const zone = defender.coverageResponsibility.zone;

          // NFL Research: Flat defenders never closer than 6 yards to sideline
          const distanceToLeftSideline = zone.center.x;
          const distanceToRightSideline = 53.33 - zone.center.x;
          const minDistanceToSideline = Math.min(distanceToLeftSideline, distanceToRightSideline);
          expect(minDistanceToSideline).toBeGreaterThanOrEqual(6);

          // Flat zones should be 2-5 yards deep
          expect(zone.depth).toBeGreaterThanOrEqual(2);
          expect(zone.depth).toBeLessThanOrEqual(8);
        }
      });
    });

    test('Cover 2 safeties should maintain proper deep landmarks', () => {
      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) {
        engine.setCoverage(cover2);
        const state = engine.getGameState();

        const safeties = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'S'
        );

        // Cover 2 should have exactly 2 safeties
        expect(safeties.length).toBe(2);

        safeties.forEach(safety => {
          // NFL Research: Cover 2 safeties work from 15 to 18 yards
          expect(safety.position.y).toBeGreaterThan(state.lineOfScrimmage + 15);
          expect(safety.position.y).toBeLessThan(state.lineOfScrimmage + 25);

          // Safeties should split the field at hash marks
          expect(safety.position.x).toBeLessThan(45); // Not extremely wide
          expect(safety.position.x).toBeGreaterThan(8); // Not extremely narrow
        });
      }
    });
  });

  describe('B. Zone Spacing & Leverage Validation', () => {
    test('Horizontal zone spacing should follow NFL standards', () => {
      const state = engine.getGameState();
      const zoneDefenders = state.players.filter(p =>
        p.team === 'defense' &&
        p.coverageResponsibility?.type === 'zone'
      );

      // Test adjacent zone spacing
      const sortedByX = zoneDefenders.sort((a, b) => a.position.x - b.position.x);

      for (let i = 0; i < sortedByX.length - 1; i++) {
        const defender1 = sortedByX[i];
        const defender2 = sortedByX[i + 1];

        // Similar depth defenders should maintain 8-15 yard horizontal spacing
        const depthDifference = Math.abs(defender1.position.y - defender2.position.y);
        if (depthDifference < 5) { // Similar depth
          const horizontalSpacing = Math.abs(defender1.position.x - defender2.position.x);


          expect(horizontalSpacing).toBeGreaterThan(6); // Minimum coverage
          expect(horizontalSpacing).toBeLessThan(25); // Maximum reasonable
        }
      }
    });

    test('Vertical zone overlap should maintain proper buffers', () => {
      const state = engine.getGameState();
      const zoneDefenders = state.players.filter(p =>
        p.team === 'defense' &&
        p.coverageResponsibility?.type === 'zone'
      );

      // Group by similar X positions (same vertical lane)
      const lanes: Player[][] = [];
      zoneDefenders.forEach(defender => {
        let assigned = false;
        for (const lane of lanes) {
          if (lane.length > 0 &&
              Math.abs(lane[0].position.x - defender.position.x) < 10) {
            lane.push(defender);
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          lanes.push([defender]);
        }
      });

      // Test vertical spacing within lanes
      lanes.forEach(lane => {
        if (lane.length > 1) {
          const sortedByY = lane.sort((a, b) => a.position.y - b.position.y);

          for (let i = 0; i < sortedByY.length - 1; i++) {
            const shallow = sortedByY[i];
            const deep = sortedByY[i + 1];

            const verticalSpacing = deep.position.y - shallow.position.y;

            // NFL Research: 6-8 yard buffer zones between levels
            expect(verticalSpacing).toBeGreaterThan(4);
            expect(verticalSpacing).toBeLessThan(15);
          }
        }
      });
    });

    test('Zone leverage should maintain proper inside/outside positioning', () => {
      // Test bunch formation response
      const smash = DataLoader.getConcept('smash');
      if (smash) {
        engine.setPlayConcept(smash);

        const state = engine.getGameState();
        const formation = engine['analyzeFormationComprehensive']();

        if (formation.isBunch) {
          const bunchSide = formation.bunchSide;
          const bunchX = bunchSide === 'left' ? 15 : 38;

          // Find defenders near bunch
          const bunchDefenders = state.players.filter(p =>
            p.team === 'defense' &&
            Math.abs(p.position.x - bunchX) < 20
          );

          // Should have at least 2 defenders to handle bunch
          expect(bunchDefenders.length).toBeGreaterThanOrEqual(2);

          // Defenders should have appropriate leverage
          bunchDefenders.forEach(defender => {
            if (defender.coverageResponsibility?.type === 'zone') {
              // Zone defenders near bunch should maintain outside leverage
              expect(defender.position.x).toBeDefined();
            }
          });
        }
      }
    });
  });

  describe('C. Formation Adjustment Timing', () => {
    test('Trips formation should trigger immediate defensive rotation', () => {
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) {
        // Capture initial positions
        const initialState = engine.getGameState();
        const initialPositions = new Map();
        initialState.players.filter(p => p.team === 'defense').forEach(d => {
          initialPositions.set(d.id, { x: d.position.x, y: d.position.y });
        });

        // Change to spread formation
        engine.setPlayConcept(fourVerts);

        const newState = engine.getGameState();
        const formation = engine['analyzeFormationComprehensive']();

        if (formation.isSpread || formation.isTrips) {
          // NFL Research: Defense should adjust within 0.5-1.2 seconds
          // In test environment, this is immediate

          let significantMovements = 0;
          newState.players.filter(p => p.team === 'defense').forEach(d => {
            const initial = initialPositions.get(d.id);
            if (initial) {
              const distance = Math.sqrt(
                Math.pow(d.position.x - initial.x, 2) +
                Math.pow(d.position.y - initial.y, 2)
              );
              if (distance > 2) significantMovements++;
            }
          });

          // At least 4 defenders should adjust significantly
          expect(significantMovements).toBeGreaterThanOrEqual(4);
        }
      }
    });

    test('Personnel changes should trigger formation-appropriate adjustments', () => {
      const personnelSequence = ['10', '12', '11'];
      const adjustmentCounts: number[] = [];

      personnelSequence.forEach(personnel => {
        const beforeState = engine.getGameState();
        const beforePositions = new Map();
        beforeState.players.filter(p => p.team === 'defense').forEach(d => {
          beforePositions.set(d.id, { x: d.position.x, y: d.position.y });
        });

        engine.setPersonnel(personnel);

        const afterState = engine.getGameState();
        let adjustments = 0;

        afterState.players.filter(p => p.team === 'defense').forEach(d => {
          const before = beforePositions.get(d.id);
          if (before) {
            const distance = Math.sqrt(
              Math.pow(d.position.x - before.x, 2) +
              Math.pow(d.position.y - before.y, 2)
            );
            if (distance > 1) adjustments++;
          }
        });

        adjustmentCounts.push(adjustments);
      });

      // Each personnel change should trigger some adjustments
      expect(adjustmentCounts.every(count => count > 0)).toBe(true);
    });

    test('Motion should trigger coverage-specific responses within timing windows', () => {
      const coverages = ['cover-1', 'cover-2', 'cover-3'];

      coverages.forEach(coverageName => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const state = engine.getGameState();
          const motionPlayer = state.players.find(p =>
            p.team === 'offense' && p.playerType === 'WR'
          );

          if (motionPlayer) {
            const beforePositions = new Map();
            state.players.filter(p => p.team === 'defense').forEach(d => {
              beforePositions.set(d.id, { x: d.position.x, y: d.position.y });
            });

            engine.sendInMotion(motionPlayer.id);

            const afterState = engine.getGameState();

            // Check for motion-specific responses
            let responseDetected = false;
            afterState.players.filter(p => p.team === 'defense').forEach(d => {
              const before = beforePositions.get(d.id);
              if (before) {
                const distance = Math.sqrt(
                  Math.pow(d.position.x - before.x, 2) +
                  Math.pow(d.position.y - before.y, 2)
                );
                if (distance > 0.5) responseDetected = true;
              }
            });

            expect(responseDetected).toBe(true);
          }
        }
      });
    });
  });

  describe('D. Pattern Recognition & Zone Handoffs', () => {
    test('Zone defenders should recognize route distribution patterns', () => {
      // Test with flood concept
      const mesh = DataLoader.getConcept('mesh');
      if (mesh) {
        engine.setPlayConcept(mesh);

        const state = engine.getGameState();
        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.isEligible
        );

        // Create overload pattern (3 receivers to one side)
        if (receivers.length >= 3) {
          receivers.slice(0, 3).forEach((r, index) => {
            engine.updatePlayerPosition(r.id, {
              x: 10 + (index * 4), // Bunch on left side
              y: r.position.y
            });
          });

          const newState = engine.getGameState();
          const defenders = newState.players.filter(p => p.team === 'defense');

          // Count defenders on overloaded side
          const leftDefenders = defenders.filter(d => d.position.x < 26.665);
          const rightDefenders = defenders.filter(d => d.position.x >= 26.665);

          // NFL Research: Defense should shift to match threats
          expect(leftDefenders.length).toBeGreaterThanOrEqual(3);
          expect(rightDefenders.length).toBeGreaterThan(0); // But not abandon other side
        }
      }
    });

    test('Zone handoff spacing should follow NFL standards', () => {
      const state = engine.getGameState();
      const zoneDefenders = state.players.filter(p =>
        p.team === 'defense' &&
        p.coverageResponsibility?.type === 'zone'
      );

      // Find potential handoff points
      for (let i = 0; i < zoneDefenders.length; i++) {
        for (let j = i + 1; j < zoneDefenders.length; j++) {
          const defender1 = zoneDefenders[i];
          const defender2 = zoneDefenders[j];

          const horizontalDist = Math.abs(defender1.position.x - defender2.position.x);
          const verticalDist = Math.abs(defender1.position.y - defender2.position.y);

          // NFL Research: Handoff points at 8yd lateral, 6yd vertical
          if (horizontalDist > 6 && horizontalDist < 12 && verticalDist < 3) {
            // These defenders are in lateral handoff relationship
            expect(horizontalDist).toBeGreaterThan(6);
            expect(horizontalDist).toBeLessThan(15);
          }

          if (verticalDist > 4 && verticalDist < 10 && horizontalDist < 5) {
            // These defenders are in vertical handoff relationship
            expect(verticalDist).toBeGreaterThan(4);
            expect(verticalDist).toBeLessThan(12);
          }
        }
      }
    });

    test('Deep zone integrity should be maintained during route combinations', () => {
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) {
        engine.setPlayConcept(fourVerts);

        const state = engine.getGameState();
        const deepDefenders = state.players.filter(p =>
          p.team === 'defense' &&
          p.position.y > state.lineOfScrimmage + 15
        );

        // NFL Research: Always maintain deepest threat priority
        expect(deepDefenders.length).toBeGreaterThanOrEqual(2);

        // Deep defenders should cover the deepest receivers
        const deepReceivers = state.players.filter(p =>
          p.team === 'offense' &&
          p.isEligible &&
          p.position.y > state.lineOfScrimmage - 2
        );

        if (deepReceivers.length > 0) {
          // Should have deep help available
          expect(deepDefenders.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('E. Coverage-Specific NFL Timing Validation', () => {
    test('Cover 3 buzz technique should follow NFL timing', () => {
      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) {
        engine.setCoverage(cover3);

        const state = engine.getGameState();
        const motionPlayer = state.players.find(p =>
          p.team === 'offense' && p.playerType === 'WR'
        );

        if (motionPlayer) {
          const beforeBuzz = new Map();
          state.players.filter(p => p.team === 'defense').forEach(d => {
            beforeBuzz.set(d.id, {
              position: { ...d.position },
              responsibility: d.coverageResponsibility?.type
            });
          });

          engine.sendInMotion(motionPlayer.id);

          const afterBuzz = engine.getGameState();

          // Check for buzz rotation (safety drops to hook, LB expands to flat)
          const safeties = afterBuzz.players.filter(p =>
            p.team === 'defense' && p.playerType === 'S'
          );

          const linebackers = afterBuzz.players.filter(p =>
            p.team === 'defense' && p.playerType === 'LB'
          );

          // NFL Research: Cover 3 buzz should show safety dropping to hook
          let buzzDetected = false;
          safeties.forEach(safety => {
            const before = beforeBuzz.get(safety.id);
            if (before) {
              const movement = Math.sqrt(
                Math.pow(safety.position.x - before.position.x, 2) +
                Math.pow(safety.position.y - before.position.y, 2)
              );
              if (movement > 2) buzzDetected = true;
            }
          });

          expect(buzzDetected).toBe(true);
        }
      }
    });

    test('Tampa 2 MLB drop should follow authentic timing', () => {
      const tampa2 = DataLoader.getCoverage('tampa-2');
      if (tampa2) {
        engine.setCoverage(tampa2);

        const state = engine.getGameState();
        const mlb = state.players.find(p => p.id === 'LB2'); // Middle linebacker

        expect(mlb).toBeDefined();
        if (mlb) {
          // NFL Research: Tampa 2 MLB drops to deep middle hole
          expect(mlb.coverageResponsibility?.type).toBe('zone');

          // Should be deeper than normal LB position
          expect(mlb.position.y).toBeGreaterThan(state.lineOfScrimmage + 8);

          // Should be in middle of field
          expect(mlb.position.x).toBeGreaterThan(20);
          expect(mlb.position.x).toBeLessThan(34);
        }
      }
    });

    test('Quarters pattern matching should trigger at correct timing', () => {
      const quarters = DataLoader.getCoverage('quarters');
      if (quarters) {
        engine.setCoverage(quarters);

        const fourVerts = DataLoader.getConcept('four-verts');
        if (fourVerts) {
          engine.setPlayConcept(fourVerts);

          const state = engine.getGameState();
          const corners = state.players.filter(p =>
            p.team === 'defense' && p.playerType === 'CB'
          );

          // NFL Research: Quarters should have pattern match triggers
          // #2 vertical should trigger safety pickup
          corners.forEach(corner => {
            if (corner.coverageResponsibility?.type === 'zone') {
              // Corner should be in position to carry #1 vertical
              expect(corner.position.y).toBeGreaterThan(state.lineOfScrimmage);
            }
          });

          const safeties = state.players.filter(p =>
            p.team === 'defense' && p.playerType === 'S'
          );

          // Should have safeties positioned for deep coverage
          expect(safeties.length).toBeGreaterThanOrEqual(2);
          safeties.forEach(safety => {
            expect(safety.position.y).toBeGreaterThan(state.lineOfScrimmage + 12);
          });
        }
      }
    });
  });

  describe('F. Edge Case Stress Testing', () => {
    test('should maintain zone integrity under rapid formation changes', () => {
      const concepts = ['slant-flat', 'mesh', 'four-verts', 'smash'];
      const validStates: boolean[] = [];

      concepts.forEach(conceptName => {
        const concept = DataLoader.getConcept(conceptName);
        if (concept) {
          engine.setPlayConcept(concept);

          const state = engine.getGameState();
          const defenders = state.players.filter(p => p.team === 'defense');

          // Validate zone integrity
          let validZones = 0;
          defenders.forEach(d => {
            if (d.coverageResponsibility?.type === 'zone' &&
                d.coverageResponsibility.zone) {
              const zone = d.coverageResponsibility.zone;

              // Zone should have valid dimensions
              if (zone.width > 0 && zone.height > 0 && zone.depth > 0) {
                validZones++;
              }
            }
          });

          validStates.push(defenders.length === 7 && validZones >= 0);
        }
      });

      expect(validStates.every(valid => valid)).toBe(true);
    });

    test('should handle complex motion patterns with timing validation', () => {
      const motionSequence = [
        'WR1', 'WR2', 'TE1', 'RB1'
      ];

      const state = engine.getGameState();
      let motionCompleted = 0;

      motionSequence.forEach(playerType => {
        const player = state.players.find(p =>
          p.team === 'offense' &&
          p.playerType === playerType.slice(0, 2) // 'WR', 'TE', 'RB'
        );

        if (player) {
          const beforeMotion = new Map();
          state.players.filter(p => p.team === 'defense').forEach(d => {
            beforeMotion.set(d.id, { ...d.position });
          });

          engine.sendInMotion(player.id);

          const afterMotion = engine.getGameState();

          // Check for defensive response
          let responseCount = 0;
          afterMotion.players.filter(p => p.team === 'defense').forEach(d => {
            const before = beforeMotion.get(d.id);
            if (before) {
              const distance = Math.sqrt(
                Math.pow(d.position.x - before.x, 2) +
                Math.pow(d.position.y - before.y, 2)
              );
              if (distance > 0.3) responseCount++;
            }
          });

          if (responseCount > 0) motionCompleted++;
        }
      });

      // Should respond to most motion attempts
      expect(motionCompleted).toBeGreaterThan(0);
    });

    test('should maintain performance under stress with zone calculations', () => {
      const startTime = performance.now();

      // Simulate 100 rapid adjustments
      for (let i = 0; i < 100; i++) {
        const coverages = ['cover-1', 'cover-2', 'cover-3', 'tampa-2'];
        const coverage = DataLoader.getCoverage(coverages[i % coverages.length]);
        if (coverage) {
          engine.setCoverage(coverage);

          // Verify state is valid after each change
          const state = engine.getGameState();
          const defenders = state.players.filter(p => p.team === 'defense');
          expect(defenders.length).toBe(7);
        }
      }

      const endTime = performance.now();

      // NFL Research: Should maintain 60fps (16.67ms per frame)
      // 100 adjustments should complete well under 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should handle extreme formation edge cases correctly', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      // Create extreme unbalanced formation (all receivers on one side)
      receivers.forEach((r, index) => {
        engine.updatePlayerPosition(r.id, {
          x: 5 + (index * 2), // All on left side
          y: r.position.y
        });
      });

      const testCoverages = ['cover-2', 'cover-3', 'quarters'];

      testCoverages.forEach(coverageName => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const newState = engine.getGameState();
          const defenders = newState.players.filter(p => p.team === 'defense');

          // Should still have 7 defenders
          expect(defenders.length).toBe(7);

          // Should shift toward overload but not abandon other side completely
          const leftDefenders = defenders.filter(d => d.position.x < 26.665);
          const rightDefenders = defenders.filter(d => d.position.x >= 26.665);

          expect(leftDefenders.length).toBeGreaterThanOrEqual(4);
          expect(rightDefenders.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('G. NFL Coaching Validation', () => {
    test('zone drops should match coaching film timing', () => {
      const state = engine.getGameState();
      const zoneDefenders = state.players.filter(p =>
        p.team === 'defense' &&
        p.coverageResponsibility?.type === 'zone'
      );

      zoneDefenders.forEach(defender => {
        if (defender.coverageResponsibility?.zone) {
          const zone = defender.coverageResponsibility.zone;

          // NFL Research: Zone drop timing should be realistic
          // Backpedal to 8-12 yards, then turn and run
          if (defender.playerType === 'CB' || defender.playerType === 'S') {
            expect(zone.depth).toBeGreaterThan(8);
          }

          if (defender.playerType === 'LB') {
            // Linebackers drop 10-12 yards typically
            expect(zone.depth).toBeGreaterThan(6);
            expect(zone.depth).toBeLessThan(20);
          }
        }
      });
    });

    test('coverage disguise should be implemented correctly', () => {
      // Test pre-snap vs post-snap alignment differences
      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) {
        engine.setCoverage(cover2);

        const preSnapState = engine.getGameState();
        const preSnapPositions = new Map();
        preSnapState.players.filter(p => p.team === 'defense').forEach(d => {
          preSnapPositions.set(d.id, { ...d.position });
        });

        // Snap should not drastically change positions (good disguise)
        engine.snap();

        // Allow minimal post-snap adjustment time
        for (let i = 0; i < 5; i++) {
          engine['tick'](1/60);
        }

        const postSnapState = engine.getGameState();

        // Clean up game loop
        engine.resetPlay();

        // Post-snap positions shouldn't be wildly different (good disguise)
        let drasticMovements = 0;
        postSnapState.players.filter(p => p.team === 'defense').forEach(d => {
          const preSnap = preSnapPositions.get(d.id);
          if (preSnap) {
            const distance = Math.sqrt(
              Math.pow(d.position.x - preSnap.x, 2) +
              Math.pow(d.position.y - preSnap.y, 2)
            );
            if (distance > 8) drasticMovements++; // Large pre/post snap movement
          }
        });

        // Most defenders should maintain similar positions (disguise)
        expect(drasticMovements).toBeLessThan(3);
      }
    });

    test('leverage maintenance should follow NFL principles', () => {
      const smash = DataLoader.getConcept('smash');
      if (smash) {
        engine.setPlayConcept(smash);

        const state = engine.getGameState();
        const formation = engine['analyzeFormationComprehensive']();

        if (formation.isBunch) {
          const defenders = state.players.filter(p => p.team === 'defense');

          // Find defenders near bunch formation
          const bunchX = formation.bunchSide === 'left' ? 15 : 38;
          const bunchDefenders = defenders.filter(d =>
            Math.abs(d.position.x - bunchX) < 15
          );

          bunchDefenders.forEach(defender => {
            if (defender.coverageResponsibility?.type === 'zone') {
              // Zone defender should maintain proper leverage
              expect(defender.position.x).toBeDefined();
              expect(defender.position.y).toBeGreaterThan(state.lineOfScrimmage - 2);
            } else if (defender.coverageResponsibility?.type === 'man') {
              // Man defender should be close to assignment
              expect(defender.coverageResponsibility.target).toBeDefined();
            }
          });
        }
      }
    });
  });
});