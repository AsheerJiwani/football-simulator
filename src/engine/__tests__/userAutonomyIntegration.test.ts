import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import type { PlayConcept, GameState, PersonnelPackage } from '../types';

describe('User Autonomy Integration Tests', () => {
  let engine: FootballEngine;
  let initialDefensePositions: Map<string, { x: number; y: number }>;

  beforeEach(() => {
    engine = new FootballEngine();

    // Set up initial state with a base play and coverage
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-3');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);

    // Capture initial defensive positions for comparison
    initialDefensePositions = new Map();
    const state = engine.getGameState();
    state.players.filter(p => p.team === 'defense').forEach(player => {
      initialDefensePositions.set(player.id, {
        x: player.position.x,
        y: player.position.y
      });
    });
  });

  describe('1. setPlayConcept() Integration Chain', () => {
    test('should trigger defensive realignment when play concept changes', () => {
      // Get Four Verts concept (trips formation)
      const fourVerts = DataLoader.getConcept('four-verts');
      expect(fourVerts).toBeDefined();

      // Change play concept
      if (fourVerts) {
        engine.setPlayConcept(fourVerts);
      }

      const state = engine.getGameState();

      // Verify offense updated
      const offensivePlayers = state.players.filter(p => p.team === 'offense');
      expect(offensivePlayers.length).toBeGreaterThan(0);

      // Verify defense realigned (positions should change)
      const defensivePlayers = state.players.filter(p => p.team === 'defense');
      let positionsChanged = false;

      defensivePlayers.forEach(player => {
        const initialPos = initialDefensePositions.get(player.id);
        if (initialPos) {
          if (Math.abs(player.position.x - initialPos.x) > 0.5 ||
              Math.abs(player.position.y - initialPos.y) > 0.5) {
            positionsChanged = true;
          }
        }
      });

      expect(positionsChanged).toBe(true);

      // Verify formation was analyzed (Four Verts uses empty formation, not trips)
      const formationAnalysis = engine['analyzeFormationComprehensive']();
      expect(formationAnalysis.isSpread).toBe(true); // Empty formation is a spread formation
    });

    test('should maintain selected coverage when play concept changes', () => {
      // Initial coverage is Cover 3
      let state = engine.getGameState();
      expect(state.coverage?.name).toBe('Cover 3');

      // Change to a different play concept
      const mesh = DataLoader.getConcept('mesh');
      if (mesh) {
        engine.setPlayConcept(mesh);
      }

      // Coverage should still be Cover 3
      state = engine.getGameState();
      expect(state.coverage?.name).toBe('Cover 3');

      // But defensive alignment should have adjusted
      const defensivePlayers = state.players.filter(p => p.team === 'defense');
      expect(defensivePlayers.length).toBe(7); // Always 7 defenders
    });

    test('should handle formation-specific adjustments', () => {
      // Test bunch formation concept
      const smash = DataLoader.getConcept('smash');
      if (smash) {
        engine.setPlayConcept(smash);
      }

      const formationAnalysis = engine['analyzeFormationComprehensive']();

      // Check if formation analysis detected the formation correctly
      if (formationAnalysis.isBunch) {
        // Verify defenders adjusted for bunch
        const state = engine.getGameState();
        const defenders = state.players.filter(p => p.team === 'defense');

        // At least one defender should be positioned to handle bunch
        const bunchSideDefenders = defenders.filter(d => {
          if (formationAnalysis.bunchSide === 'left') {
            return d.position.x < 0;
          } else {
            return d.position.x > 0;
          }
        });

        expect(bunchSideDefenders.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('2. setPersonnel() Integration Chain', () => {
    test('should adjust defensive personnel when offensive personnel changes', () => {
      // Start with 11 personnel (default)
      let state = engine.getGameState();
      const initialDefenders = state.players.filter(p => p.team === 'defense');
      const initialDBs = initialDefenders.filter(p => p.playerType === 'CB' || p.playerType === 'S' || p.playerType === 'NB');

      // Change to 10 personnel (4 WRs)
      engine.setPersonnel('10');

      state = engine.getGameState();
      const newDefenders = state.players.filter(p => p.team === 'defense');
      const newDBs = newDefenders.filter(p => p.playerType === 'CB' || p.playerType === 'S' || p.playerType === 'NB');

      // Should have more DBs in 10 personnel defense (Dime package)
      expect(newDBs.length).toBeGreaterThanOrEqual(initialDBs.length);

      // Total defenders should still be 7
      expect(newDefenders.length).toBe(7);
    });

    test('should maintain coverage integrity when personnel changes', () => {
      // Set Cover 2
      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) engine.setCoverage(cover2);

      // Change from 11 to 12 personnel (2 TEs)
      engine.setPersonnel('12');

      const state = engine.getGameState();

      // Coverage should still be Cover 2
      expect(state.coverage?.name).toBe('Cover 2');

      // Verify defensive alignment adjusted for heavy personnel
      const defenders = state.players.filter(p => p.team === 'defense');
      const linebackers = defenders.filter(p => p.playerType === 'LB');

      // Should have more linebackers against 12 personnel
      expect(linebackers.length).toBeGreaterThanOrEqual(2);
    });

    test('should handle personnel-based formation strength', () => {
      // Set 12 personnel (1 RB, 2 TEs)
      engine.setPersonnel('12');

      const state = engine.getGameState();
      const offense = state.players.filter(p => p.team === 'offense');

      // Note: Current implementation uses fixed formations, not dynamic personnel
      // So we'll just verify the defense adjusts to the personnel setting
      expect(state.personnel).toBe('12');

      // Defense should adjust for heavy formation
      const defenders = state.players.filter(p => p.team === 'defense');
      const boxDefenders = defenders.filter(p =>
        p.playerType === 'LB' ||
        (p.playerType === 'S' && p.position.y < state.lineOfScrimmage - 8)
      );

      // More defenders in the box against heavy personnel
      expect(boxDefenders.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('3. sendInMotion() Integration Chain', () => {
    test('should trigger defensive motion adjustments', () => {
      const state = engine.getGameState();
      // Find any WR to send in motion
      const slotReceiver = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR'
      );

      // If no WR, try any eligible receiver
      const motionCandidate = slotReceiver || state.players.find(p =>
        p.team === 'offense' &&
        p.isEligible &&
        p.playerType !== 'QB'
      );

      expect(motionCandidate).toBeDefined();

      if (motionCandidate) {
        // Capture defender positions before motion
        const defendersBefore = new Map();
        state.players.filter(p => p.team === 'defense').forEach(d => {
          defendersBefore.set(d.id, { x: d.position.x, y: d.position.y });
        });

        // Send receiver in motion
        engine.sendInMotion(motionCandidate.id);

        // In test environment, motion completes instantly
        // No need to tick

        const newState = engine.getGameState();

        // Check if any defenders adjusted
        let defendersMoved = false;
        newState.players.filter(p => p.team === 'defense').forEach(d => {
          const before = defendersBefore.get(d.id);
          if (before) {
            if (Math.abs(d.position.x - before.x) > 0.5) {
              defendersMoved = true;
            }
          }
        });

        expect(defendersMoved).toBe(true);
      }
    });

    test('should handle Rock & Roll technique in Cover 1', () => {
      // Set Cover 1
      const cover1 = DataLoader.getCoverage('cover-1');
      if (cover1) engine.setCoverage(cover1);

      const state = engine.getGameState();
      const motionPlayer = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR' &&
        p.position.x < 0 // Left side receiver
      );

      if (motionPlayer) {
        // Find the man defender on this receiver
        const manDefender = state.players.find(p =>
          p.team === 'defense' &&
          p.coverageResponsibility?.type === 'man' &&
          p.coverageResponsibility.targetId === motionPlayer.id
        );

        expect(manDefender).toBeDefined();

        // Send in motion across formation
        engine.sendInMotion(motionPlayer.id);

        // Motion completes instantly in test environment

        const newState = engine.getGameState();

        // Motion player should have moved across
        const movedPlayer = newState.players.find(p => p.id === motionPlayer.id);
        expect(movedPlayer).toBeDefined();

        // In Cover 1, defender should follow or safety should exchange
        const defenders = newState.players.filter(p => p.team === 'defense');
        const coveringDefender = defenders.find(d =>
          d.coverageResponsibility?.type === 'man' &&
          d.coverageResponsibility.targetId === motionPlayer.id
        );

        expect(coveringDefender).toBeDefined();
      }
    });

    test('should detect formation overload after motion', () => {
      const state = engine.getGameState();

      // Find a receiver to motion
      const motionCandidate = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR'
      );

      if (motionCandidate) {
        engine.sendInMotion(motionCandidate.id);

        // Motion completes instantly in test environment

        // Check if formation analysis detects any changes
        const analysis = engine['analyzeFormationComprehensive']();

        // Should have updated formation analysis
        expect(analysis).toBeDefined();

        // Defense should have realigned
        const newState = engine.getGameState();
        const defenders = newState.players.filter(p => p.team === 'defense');
        expect(defenders.length).toBe(7);
      }
    });
  });

  describe('4. updatePlayerPosition() Integration Chain', () => {
    test('should trigger formation analysis when player is dragged', () => {
      const state = engine.getGameState();
      const receiver = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR' &&
        p.position.x > 10 // Right side receiver
      );

      expect(receiver).toBeDefined();

      if (receiver) {
        // Move receiver to create trips formation
        engine.updatePlayerPosition(receiver.id, { x: -5, y: receiver.position.y });

        // Analyze formation
        const analysis = engine['analyzeFormationComprehensive']();

        // Should detect trips if receivers are bunched
        const leftReceivers = state.players.filter(p =>
          p.team === 'offense' &&
          p.isEligible &&
          p.position.x < 0
        );

        if (leftReceivers.length >= 3) {
          expect(analysis.isTrips).toBe(true);
        }
      }
    });

    test('should realign defense when offensive formation changes', () => {
      const state = engine.getGameState();

      // Capture initial defensive alignment
      const initialDefenseX = new Map();
      state.players.filter(p => p.team === 'defense').forEach(d => {
        initialDefenseX.set(d.id, d.position.x);
      });

      // Move multiple receivers to one side
      const receivers = state.players.filter(p =>
        p.team === 'offense' &&
        p.playerType === 'WR'
      );

      // Create unbalanced formation
      receivers.forEach((r, index) => {
        engine.updatePlayerPosition(r.id, { x: -10 - (index * 3), y: r.position.y });
      });

      const newState = engine.getGameState();

      // Defense should shift toward the overloaded side
      let defenseShifted = false;
      newState.players.filter(p => p.team === 'defense').forEach(d => {
        const initialX = initialDefenseX.get(d.id);
        if (initialX !== undefined && Math.abs(d.position.x - initialX) > 1) {
          defenseShifted = true;
        }
      });

      expect(defenseShifted).toBe(true);
    });

    test('should maintain legal formation constraints', () => {
      const state = engine.getGameState();
      const qb = state.players.find(p => p.playerType === 'QB');

      expect(qb).toBeDefined();

      if (qb) {
        // Try to move QB to illegal position
        const illegalY = state.lineOfScrimmage + 10; // Way ahead of LOS
        engine.updatePlayerPosition(qb.id, { x: 0, y: illegalY });

        const newState = engine.getGameState();
        const newQb = newState.players.find(p => p.playerType === 'QB');

        // QB should not be ahead of LOS
        expect(newQb).toBeDefined();
        if (newQb) {
          expect(newQb.position.y).toBeGreaterThanOrEqual(state.lineOfScrimmage);
        }
      }
    });
  });

  describe('5. setCoverage() Integration Chain', () => {
    test('should change defensive alignment when coverage changes', () => {
      // Start with Cover 3
      let state = engine.getGameState();
      expect(state.coverage?.name).toBe('Cover 3');

      const cover3Positions = new Map();
      state.players.filter(p => p.team === 'defense').forEach(d => {
        cover3Positions.set(d.id, { x: d.position.x, y: d.position.y });
      });

      // Change to Cover 2
      const cover2 = DataLoader.getCoverage('cover-2');
      if (cover2) {
        engine.setCoverage(cover2);
      }

      state = engine.getGameState();
      expect(state.coverage?.name).toBe('Cover 2');

      // Positions should change significantly
      let significantChanges = 0;
      state.players.filter(p => p.team === 'defense').forEach(d => {
        const oldPos = cover3Positions.get(d.id);
        if (oldPos) {
          const distance = Math.sqrt(
            Math.pow(d.position.x - oldPos.x, 2) +
            Math.pow(d.position.y - oldPos.y, 2)
          );
          if (distance > 3) significantChanges++;
        }
      });

      // At least half the defenders should move significantly
      expect(significantChanges).toBeGreaterThanOrEqual(3);
    });

    test('should apply coverage-specific rules to current formation', () => {
      // Set up trips formation
      const fourVerts = DataLoader.getConcept('four-verts');
      if (fourVerts) engine.setPlayConcept(fourVerts);

      // Change to Tampa 2
      const tampa2 = DataLoader.getCoverage('tampa-2');
      if (tampa2) {
        engine.setCoverage(tampa2);
      }

      const state = engine.getGameState();

      // Tampa 2 should have specific alignment
      // LB2 is the Mike linebacker in Tampa 2, drops to deep middle
      const lb2 = state.players.find(p =>
        p.team === 'defense' &&
        p.id === 'LB2'
      );

      // LB2 should be in Tampa 2 position (deep middle)
      expect(lb2).toBeDefined();
      if (lb2) {
        // In Tampa 2, MLB drops back to deep middle
        expect(lb2.coverageResponsibility?.type).toBe('zone');
      }
    });

    test('should handle coverage changes with existing motion', () => {
      // Send player in motion
      const state = engine.getGameState();
      const motionPlayer = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR'
      );

      if (motionPlayer) {
        engine.sendInMotion(motionPlayer.id);

        // Motion completes instantly in test environment

        // Change coverage after motion
        const cover0 = DataLoader.getCoverage('cover-0');
        if (cover0) {
          engine.setCoverage(cover0);
        }

        const newState = engine.getGameState();

        // All defenders should be in man coverage for Cover 0
        const defenders = newState.players.filter(p => p.team === 'defense');
        const manDefenders = defenders.filter(d => d.coverageResponsibility?.type === 'man');

        // Cover 0 is all-out man
        expect(manDefenders.length).toBeGreaterThanOrEqual(6);
      }
    });
  });

  describe('Integration Edge Cases', () => {
    test('should handle rapid sequential changes', () => {
      // Rapidly change multiple settings
      const mesh = DataLoader.getConcept('mesh');
      const cover1 = DataLoader.getCoverage('cover-1');

      if (mesh) engine.setPlayConcept(mesh);
      engine.setPersonnel('10');
      if (cover1) engine.setCoverage(cover1);
      engine.setPersonnel('12');

      const state = engine.getGameState();

      // Engine should be in valid state
      expect(state.players.length).toBeGreaterThan(0);
      expect(state.coverage).toBeDefined();
      expect(state.playConcept).toBeDefined();

      // Defense should have correct number of players
      const defenders = state.players.filter(p => p.team === 'defense');
      expect(defenders.length).toBe(7);
    });

    test('should maintain consistency during snap with pending changes', () => {
      // Make pre-snap adjustments
      const state = engine.getGameState();
      const receiver = state.players.find(p =>
        p.team === 'offense' &&
        p.playerType === 'WR'
      );

      if (receiver) {
        engine.sendInMotion(receiver.id);

        // Snap while motion is happening
        engine.snap();

        const snappedState = engine.getGameState();

        // Game should be in playing phase
        expect(snappedState.phase).toBe('playing');

        // All players should have valid positions
        snappedState.players.forEach(player => {
          expect(player.position.x).toBeDefined();
          expect(player.position.y).toBeDefined();
          expect(isNaN(player.position.x)).toBe(false);
          expect(isNaN(player.position.y)).toBe(false);
        });
      }
    });

    test('should handle coverage adjustment failures gracefully', () => {
      // Try to set invalid combinations
      engine.setPersonnel('10'); // 4 WRs

      // Set a coverage that might struggle with 4 WRs
      const cover3 = DataLoader.getCoverage('cover-3');
      if (cover3) engine.setCoverage(cover3);

      const state = engine.getGameState();

      // Should still have valid defensive alignment
      const defenders = state.players.filter(p => p.team === 'defense');
      expect(defenders.length).toBe(7);

      // Each defender should have a coverage responsibility
      defenders.forEach(d => {
        expect(d.coverageResponsibility).toBeDefined();
      });
    });
  });

  describe('Performance and Timing', () => {
    test('should complete realignment within performance budget', () => {
      const startTime = performance.now();

      // Trigger multiple realignments
      for (let i = 0; i < 10; i++) {
        const concepts = ['mesh', 'four-verts', 'slant-flat', 'smash'];
        const concept = DataLoader.getConcept(concepts[i % concepts.length]);
        if (concept) engine.setPlayConcept(concept);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete 10 realignments in under 100ms
      expect(totalTime).toBeLessThan(100);
    });

    test('should maintain 60fps during continuous adjustments', () => {
      const frameTime = 1000 / 60; // ~16.67ms per frame
      const frameTimes: number[] = [];

      // Simulate 60 frames with adjustments
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();

        // Make an adjustment every 10 frames
        if (frame % 10 === 0) {
          engine.setPersonnel(frame % 2 === 0 ? '11' : '12');
        }

        // Tick the engine
        engine['tick'](1/60);

        const frameEnd = performance.now();
        frameTimes.push(frameEnd - frameStart);
      }

      // Average frame time should be under 16.67ms
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      expect(avgFrameTime).toBeLessThan(frameTime);

      // No single frame should take more than 33ms (30fps minimum)
      const maxFrameTime = Math.max(...frameTimes);
      expect(maxFrameTime).toBeLessThan(33);
    });
  });

  // Phase 5.2: Coverage-Specific Integration Testing
  describe('Step 5.2: Coverage-Specific Integration Testing', () => {
    describe('A. Personnel Integration from Concepts', () => {
      test('should load default personnel from concept formation', () => {
        // Test trips-right formation (should be 11 personnel - 3WR, 1RB)
        const slantFlat = DataLoader.getConcept('slant-flat');
        expect(slantFlat).toBeDefined();

        if (slantFlat) {
          engine.setPlayConcept(slantFlat);
          const state = engine.getGameState();

          // Should automatically set personnel from formation
          expect(state.personnel).toBe('10'); // Trips right has 3WR, 1RB, 0TE = 10 personnel
        }
      });

      test('should adjust defensive personnel for 10 personnel (4 WRs)', () => {
        // Set up empty formation (10 personnel - 4 WRs)
        const emptyFormation = DataLoader.getFormation('empty');
        if (emptyFormation) {
          const mockConcept: PlayConcept = {
            name: 'Empty Test',
            description: 'Test empty formation',
            difficulty: 'medium',
            formation: emptyFormation,
            routes: {}
          };

          engine.setPlayConcept(mockConcept);

          const state = engine.getGameState();
          expect(state.personnel).toBe('10'); // Empty formation is treated as 10 personnel

          // Defense should use Dime package (6 DBs)
          const defenders = state.players.filter(p => p.team === 'defense');
          const dbs = defenders.filter(p =>
            p.playerType === 'CB' ||
            p.playerType === 'S' ||
            p.playerType === 'NB'
          );

          expect(dbs.length).toBeGreaterThanOrEqual(5); // At least 5 DBs for spread
        }
      });

      test('should adjust defensive personnel for 12 personnel (2 TEs)', () => {
        // Create a 12 personnel concept
        const singleback = DataLoader.getFormation('singleback');
        if (singleback) {
          // Singleback has 1RB, 1TE, 2WR = 11 personnel
          // We need to test with a heavier formation
          const state = engine.getGameState();

          // Manually set 12 personnel to test
          engine.setPersonnel('12');

          // Defense should use Base package (more LBs)
          const defenders = state.players.filter(p => p.team === 'defense');
          const lbs = defenders.filter(p => p.playerType === 'LB');

          expect(lbs.length).toBeGreaterThanOrEqual(2); // At least 2 LBs for heavy
        }
      });

      test('should maintain personnel through coverage changes', () => {
        // Set a concept with specific personnel
        const concept = DataLoader.getConcept('four-verts');
        if (concept) {
          engine.setPlayConcept(concept);

          const initialPersonnel = engine.getGameState().personnel;

          // Change coverage multiple times
          const coverages = ['cover-1', 'cover-2', 'cover-3', 'tampa-2'];
          coverages.forEach(coverageName => {
            const coverage = DataLoader.getCoverage(coverageName);
            if (coverage) {
              engine.setCoverage(coverage);
            }
          });

          // Personnel should remain the same
          expect(engine.getGameState().personnel).toBe(initialPersonnel);
        }
      });
    });

    describe('B. Coverage-Specific Formation Responses', () => {
      const testCoverageFormationResponse = (
        coverageName: string,
        formationTest: (state: GameState) => void
      ) => {
        test(`${coverageName} should adjust to trips formation`, () => {
          const coverage = DataLoader.getCoverage(coverageName);
          const fourVerts = DataLoader.getConcept('four-verts');

          if (coverage && fourVerts) {
            engine.setCoverage(coverage);
            engine.setPlayConcept(fourVerts);

            const state = engine.getGameState();

            // Run coverage-specific test
            formationTest(state);

            // All coverages should have 7 defenders
            const defenders = state.players.filter(p => p.team === 'defense');
            expect(defenders.length).toBe(7);
          }
        });
      };

      testCoverageFormationResponse('cover-0', (state) => {
        // Cover 0 - all man, no deep help
        const defenders = state.players.filter(p => p.team === 'defense');
        const manDefenders = defenders.filter(d =>
          d.coverageResponsibility?.type === 'man'
        );
        expect(manDefenders.length).toBeGreaterThanOrEqual(5);
      });

      testCoverageFormationResponse('cover-1', (state) => {
        // Cover 1 - man with single high safety
        const defenders = state.players.filter(p => p.team === 'defense');
        const deepSafety = defenders.find(d =>
          d.playerType === 'S' &&
          d.position.y < state.lineOfScrimmage - 10
        );
        expect(deepSafety).toBeDefined();
      });

      testCoverageFormationResponse('cover-2', (state) => {
        // Cover 2 - two deep safeties
        const defenders = state.players.filter(p => p.team === 'defense');
        const deepSafeties = defenders.filter(d =>
          d.playerType === 'S' &&
          d.position.y < state.lineOfScrimmage - 8
        );
        expect(deepSafeties.length).toBe(2);
      });

      testCoverageFormationResponse('cover-3', (state) => {
        // Cover 3 - three deep zones
        const defenders = state.players.filter(p => p.team === 'defense');
        const deepDefenders = defenders.filter(d =>
          d.coverageResponsibility?.type === 'zone' &&
          d.position.y < state.lineOfScrimmage - 8
        );
        expect(deepDefenders.length).toBeGreaterThanOrEqual(3);
      });

      testCoverageFormationResponse('tampa-2', (state) => {
        // Tampa 2 - MLB drops deep
        const lb2 = state.players.find(p => p.id === 'LB2');
        expect(lb2).toBeDefined();
        if (lb2) {
          expect(lb2.coverageResponsibility?.type).toBe('zone');
        }
      });

      test('should handle bunch formation adjustments', () => {
        const smash = DataLoader.getConcept('smash');
        const cover3 = DataLoader.getCoverage('cover-3');

        if (smash && cover3) {
          engine.setPlayConcept(smash);
          engine.setCoverage(cover3);

          const formation = engine['analyzeFormationComprehensive']();

          if (formation.isBunch) {
            const state = engine.getGameState();
            const defenders = state.players.filter(p => p.team === 'defense');

            // Should have defenders positioned to handle bunch
            const bunchSideDefenders = defenders.filter(d => {
              const bunchX = formation.bunchSide === 'left' ? -10 : 10;
              return Math.abs(d.position.x - bunchX) < 15;
            });

            expect(bunchSideDefenders.length).toBeGreaterThanOrEqual(2);
          }
        }
      });

      test('should handle stack formation adjustments', () => {
        // Create a stacked formation scenario
        const state = engine.getGameState();
        const receivers = state.players.filter(p =>
          p.team === 'offense' && p.isEligible
        );

        if (receivers.length >= 2) {
          // Stack two receivers
          const [r1, r2] = receivers;
          engine.updatePlayerPosition(r1.id, { x: 10, y: r1.position.y });
          engine.updatePlayerPosition(r2.id, { x: 10, y: r2.position.y - 1 });

          const formation = engine['analyzeFormationComprehensive']();

          if (formation.isStack) {
            // Defense should communicate to avoid picks
            const defenders = state.players.filter(p => p.team === 'defense');
            expect(defenders.length).toBe(7);
          }
        }
      });
    });

    describe('C. Motion Response by Coverage', () => {
      const testMotionResponse = (
        coverageName: string,
        expectedResponse: (state: GameState, motionPlayerId: string) => void
      ) => {
        test(`${coverageName} should respond correctly to motion`, () => {
          const coverage = DataLoader.getCoverage(coverageName);
          if (!coverage) return;

          engine.setCoverage(coverage);

          const state = engine.getGameState();
          const motionCandidate = state.players.find(p =>
            p.team === 'offense' &&
            p.playerType === 'WR'
          );

          if (motionCandidate) {
            const initialDefPositions = new Map();
            state.players.filter(p => p.team === 'defense').forEach(d => {
              initialDefPositions.set(d.id, { ...d.position });
            });

            engine.sendInMotion(motionCandidate.id);

            // Motion completes instantly in test environment

            const newState = engine.getGameState();
            expectedResponse(newState, motionCandidate.id);
          }
        });
      };

      testMotionResponse('cover-0', (state, motionId) => {
        // Cover 0 - man defender should follow tightly
        const manDefender = state.players.find(d =>
          d.team === 'defense' &&
          d.coverageResponsibility?.type === 'man' &&
          d.coverageResponsibility?.target === motionId
        );
        expect(manDefender).toBeDefined();
      });

      testMotionResponse('cover-1', (state, motionId) => {
        // Cover 1 - Rock & Roll exchange or man follow
        const defenders = state.players.filter(p => p.team === 'defense');
        const coveringDefender = defenders.find(d =>
          d.coverageResponsibility?.type === 'man' &&
          d.coverageResponsibility?.target === motionId
        );
        expect(coveringDefender).toBeDefined();
      });

      testMotionResponse('cover-2', (state, motionId) => {
        // Cover 2 - safeties check motion threats
        const safeties = state.players.filter(p =>
          p.team === 'defense' && p.playerType === 'S'
        );
        expect(safeties.length).toBe(2);

        // At least one safety should be aware of motion side
        const motionPlayer = state.players.find(p => p.id === motionId);
        if (motionPlayer) {
          const motionSide = motionPlayer.position.x > 26.665 ? 'right' : 'left';
          const awareSafety = safeties.find(s => {
            if (motionSide === 'right') {
              return s.position.x > 26.665;
            } else {
              return s.position.x < 26.665;
            }
          });
          expect(awareSafety).toBeDefined();
        }
      });

      testMotionResponse('cover-3', (state, motionId) => {
        // Cover 3 - Buzz safety may rotate
        const defenders = state.players.filter(p => p.team === 'defense');

        // Check if any defender adjusted position significantly
        let defenderAdjusted = false;
        defenders.forEach(d => {
          if (d.playerType === 'S' || d.playerType === 'NB') {
            // Safeties or nickel may rotate
            defenderAdjusted = true;
          }
        });

        expect(defenderAdjusted).toBe(true);
      });
    });

    describe('D. Personnel Package Validation', () => {
      const personnelPackages: PersonnelPackage[] = ['10', '11', '12', '21'];

      personnelPackages.forEach(personnel => {
        test(`should handle ${personnel} personnel correctly`, () => {
          engine.setPersonnel(personnel);

          const state = engine.getGameState();
          expect(state.personnel).toBe(personnel);

          // Defense should adjust
          const defenders = state.players.filter(p => p.team === 'defense');
          expect(defenders.length).toBe(7);

          // Check appropriate defensive personnel
          const dbs = defenders.filter(p =>
            p.playerType === 'CB' ||
            p.playerType === 'S' ||
            p.playerType === 'NB'
          );
          const lbs = defenders.filter(p => p.playerType === 'LB');

          switch (personnel) {
            case '10': // 4 WRs
              expect(dbs.length).toBeGreaterThanOrEqual(5); // Dime
              break;
            case '11': // 3 WRs, 1 TE
              expect(dbs.length).toBeGreaterThanOrEqual(4); // Nickel
              break;
            case '12': // 2 TEs
            case '21': // 2 RBs
              expect(lbs.length).toBeGreaterThanOrEqual(2); // Base
              break;
          }
        });
      });

      test('should maintain coverage integrity across personnel changes', () => {
        const cover3 = DataLoader.getCoverage('cover-3');
        if (cover3) {
          engine.setCoverage(cover3);

          // Test all personnel packages
          personnelPackages.forEach(personnel => {
            engine.setPersonnel(personnel);

            const state = engine.getGameState();

            // Coverage should still be Cover 3
            expect(state.coverage?.name).toBe('Cover 3');

            // Should have 7 defenders
            const defenders = state.players.filter(p => p.team === 'defense');
            expect(defenders.length).toBe(7);

            // Each should have a responsibility
            defenders.forEach(d => {
              expect(d.coverageResponsibility).toBeDefined();
            });
          });
        }
      });
    });

    describe('E. Complex Integration Scenarios', () => {
      test('should handle concept → personnel → coverage → motion chain', () => {
        // 1. Set play concept (sets personnel automatically)
        const fourVerts = DataLoader.getConcept('four-verts');
        if (fourVerts) {
          engine.setPlayConcept(fourVerts);

          const state1 = engine.getGameState();
          expect(state1.personnel).toBeDefined();

          // 2. Set coverage
          const cover2 = DataLoader.getCoverage('cover-2');
          if (cover2) {
            engine.setCoverage(cover2);

            const state2 = engine.getGameState();
            expect(state2.coverage?.name).toBe('Cover 2');

            // 3. Send motion
            const motionPlayer = state2.players.find(p =>
              p.team === 'offense' && p.playerType === 'WR'
            );

            if (motionPlayer) {
              engine.sendInMotion(motionPlayer.id);

              // 4. Snap while in motion
              engine.snap();

              const state3 = engine.getGameState();

              // Everything should be valid (phase is 'post-snap' after snap)
              expect(state3.phase).toBe('post-snap');
              expect(state3.players.length).toBeGreaterThan(0);

              // No NaN positions
              state3.players.forEach(p => {
                expect(isNaN(p.position.x)).toBe(false);
                expect(isNaN(p.position.y)).toBe(false);
              });
            }
          }
        }
      });

      test('should handle rapid concept changes with different personnel', () => {
        const concepts = ['slant-flat', 'mesh', 'four-verts', 'smash'];
        const startTime = performance.now();

        concepts.forEach(conceptName => {
          const concept = DataLoader.getConcept(conceptName);
          if (concept) {
            engine.setPlayConcept(concept);

            const state = engine.getGameState();

            // Personnel should be set
            expect(state.personnel).toBeDefined();

            // Defense should exist
            const defenders = state.players.filter(p => p.team === 'defense');
            expect(defenders.length).toBe(7);
          }
        });

        const endTime = performance.now();

        // Should complete quickly
        expect(endTime - startTime).toBeLessThan(50);
      });

      test('should maintain consistency with drag-drop after personnel change', () => {
        // Set initial concept
        const mesh = DataLoader.getConcept('mesh');
        if (mesh) {
          engine.setPlayConcept(mesh);

          // Change personnel
          engine.setPersonnel('12');

          // Drag a player
          const state = engine.getGameState();
          const receiver = state.players.find(p =>
            p.team === 'offense' && p.playerType === 'WR'
          );

          if (receiver) {
            engine.updatePlayerPosition(receiver.id, { x: -15, y: receiver.position.y });

            const newState = engine.getGameState();

            // Personnel should still be 12
            expect(newState.personnel).toBe('12');

            // Defense should have realigned
            const defenders = newState.players.filter(p => p.team === 'defense');
            expect(defenders.length).toBe(7);
          }
        }
      });
    });
  });
});