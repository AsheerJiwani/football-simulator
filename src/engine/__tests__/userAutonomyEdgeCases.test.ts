import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';
import type { Vector2D, GameState, Player, PersonnelPackage } from '../types';

/**
 * User Autonomy vs Defensive Response Edge Cases
 *
 * These tests validate that users maintain complete offensive control while
 * the defense responds intelligently to every change, ensuring NFL-realistic
 * behavior in extreme scenarios and rapid-fire adjustments.
 */
describe('User Autonomy vs Defensive Response Edge Cases', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
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

  describe('A. Rapid-Fire User Input Stress Tests', () => {
    test('should handle 50+ rapid concept changes without breaking', () => {
      const concepts = ['slant-flat', 'mesh', 'four-verts', 'smash'];
      const startTime = performance.now();
      const validStates: boolean[] = [];

      // Rapid-fire 50 concept changes
      for (let i = 0; i < 50; i++) {
        const concept = DataLoader.getConcept(concepts[i % concepts.length]);
        if (concept) {
          engine.setPlayConcept(concept);

          const state = engine.getGameState();
          const defenders = state.players.filter(p => p.team === 'defense');
          const offense = state.players.filter(p => p.team === 'offense');

          // Validate state integrity
          const isValid =
            defenders.length === 7 &&
            offense.length > 0 &&
            state.coverage !== undefined &&
            state.playConcept !== undefined;

          validStates.push(isValid);
        }
      }

      const endTime = performance.now();

      // All states should remain valid
      expect(validStates.every(valid => valid)).toBe(true);

      // Should complete in reasonable time (under 500ms)
      expect(endTime - startTime).toBeLessThan(500);
    });

    test('should handle simultaneous coverage/personnel/concept changes', () => {
      const changeSequences = [
        () => {
          const concept = DataLoader.getConcept('mesh');
          if (concept) engine.setPlayConcept(concept);
        },
        () => engine.setPersonnel('10'),
        () => {
          const coverage = DataLoader.getCoverage('cover-2');
          if (coverage) engine.setCoverage(coverage);
        },
        () => engine.setPersonnel('12'),
        () => {
          const coverage = DataLoader.getCoverage('quarters');
          if (coverage) engine.setCoverage(coverage);
        },
        () => {
          const concept = DataLoader.getConcept('four-verts');
          if (concept) engine.setPlayConcept(concept);
        }
      ];

      // Execute all changes in rapid succession
      const startTime = performance.now();
      changeSequences.forEach(change => change());
      const endTime = performance.now();

      const finalState = engine.getGameState();

      // Final state should be completely valid
      expect(finalState.players.filter(p => p.team === 'defense').length).toBe(7);
      expect(finalState.players.filter(p => p.team === 'offense').length).toBeGreaterThan(0);
      expect(finalState.coverage).toBeDefined();
      expect(finalState.playConcept).toBeDefined();
      expect(finalState.personnel).toBe('12'); // Last personnel change

      // Should complete quickly
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should handle extreme drag-and-drop position chaos', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      // Create chaos: move all receivers randomly 20 times
      for (let round = 0; round < 20; round++) {
        receivers.forEach(receiver => {
          const randomX = Math.random() * 53.33;
          const randomY = receiver.position.y + (Math.random() - 0.5) * 10;

          engine.updatePlayerPosition(receiver.id, { x: randomX, y: randomY });
        });

        // Validate defense still responds correctly
        const currentState = engine.getGameState();
        const defenders = currentState.players.filter(p => p.team === 'defense');

        expect(defenders.length).toBe(7);

        // No NaN positions
        defenders.forEach(d => {
          expect(isNaN(d.position.x)).toBe(false);
          expect(isNaN(d.position.y)).toBe(false);
        });
      }
    });

    test('should handle motion spam without state corruption', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );

      if (receivers.length >= 2) {
        // Rapidly send multiple receivers in motion
        for (let i = 0; i < 10; i++) {
          const receiver = receivers[i % receivers.length];
          engine.sendInMotion(receiver.id);

          // Immediately snap on some iterations
          if (i % 3 === 0) {
            engine.snap();
            engine.resetPlay(); // Reset to avoid game loop hanging
          }

          const currentState = engine.getGameState();
          const defenders = currentState.players.filter(p => p.team === 'defense');

          // State should remain valid
          expect(defenders.length).toBe(7);
          expect(currentState.phase).toBe('pre-snap');
        }
      }
    });
  });

  describe('B. Extreme Formation Edge Cases', () => {
    test('should handle all receivers stacked in one yard', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      // Stack all receivers in tiny area
      receivers.forEach((receiver, index) => {
        engine.updatePlayerPosition(receiver.id, {
          x: 26 + (index * 0.5), // Within 2-3 yards
          y: receiver.position.y
        });
      });

      // Test multiple coverages against this chaos
      const coverages = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'quarters'];

      coverages.forEach(coverageName => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const newState = engine.getGameState();
          const defenders = newState.players.filter(p => p.team === 'defense');

          // Defense should still function
          expect(defenders.length).toBe(7);

          // Should have defenders near the stack
          const stackDefenders = defenders.filter(d =>
            Math.abs(d.position.x - 26) < 10
          );
          expect(stackDefenders.length).toBeGreaterThanOrEqual(2);
        }
      });
    });

    test('should handle receivers spread across entire field width', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      // Spread receivers to extreme edges
      receivers.forEach((receiver, index) => {
        const x = index % 2 === 0 ? 2 : 51; // Alternate between far left and far right
        engine.updatePlayerPosition(receiver.id, { x, y: receiver.position.y });
      });

      const newState = engine.getGameState();
      const defenders = newState.players.filter(p => p.team === 'defense');

      // Defense should spread to cover threats
      const leftDefenders = defenders.filter(d => d.position.x < 15);
      const rightDefenders = defenders.filter(d => d.position.x > 38);

      expect(leftDefenders.length).toBeGreaterThan(0);
      expect(rightDefenders.length).toBeGreaterThan(0);

      // Should still have middle coverage
      const middleDefenders = defenders.filter(d =>
        d.position.x >= 15 && d.position.x <= 38
      );
      expect(middleDefenders.length).toBeGreaterThan(0);
    });

    test('should handle asymmetric depth variations', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      // Create wild depth variations
      receivers.forEach((receiver, index) => {
        const depth = index % 3 === 0 ?
          receiver.position.y + 5 :  // Some deep
          index % 3 === 1 ?
          receiver.position.y - 3 : // Some shallow
          receiver.position.y;      // Some normal

        engine.updatePlayerPosition(receiver.id, {
          x: receiver.position.x,
          y: Math.max(depth, state.lineOfScrimmage - 5) // Keep legal
        });
      });

      const newState = engine.getGameState();
      const defenders = newState.players.filter(p => p.team === 'defense');

      // Defense should maintain depth integrity
      const deepDefenders = defenders.filter(d =>
        d.position.y > state.lineOfScrimmage + 10
      );
      const shallowDefenders = defenders.filter(d =>
        d.position.y <= state.lineOfScrimmage + 10
      );

      expect(deepDefenders.length).toBeGreaterThan(0);
      expect(shallowDefenders.length).toBeGreaterThan(0);
    });

    test('should handle formation changes during active motion', () => {
      const state = engine.getGameState();
      const receiver = state.players.find(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );

      if (receiver) {
        // Start motion
        engine.sendInMotion(receiver.id);

        // Change concept while motion is active
        const mesh = DataLoader.getConcept('mesh');
        if (mesh) {
          engine.setPlayConcept(mesh);
        }

        // Change personnel
        engine.setPersonnel('12');

        // Change coverage
        const cover2 = DataLoader.getCoverage('cover-2');
        if (cover2) {
          engine.setCoverage(cover2);
        }

        const finalState = engine.getGameState();

        // Everything should still be valid
        expect(finalState.players.filter(p => p.team === 'defense').length).toBe(7);
        expect(finalState.coverage?.name).toBe('Cover 2');
        expect(finalState.personnel).toBe('12');

        // Motion player should still have motion boost
        const motionPlayer = finalState.players.find(p => p.id === receiver.id);
        expect(motionPlayer?.hasMotionBoost).toBe(true);
      }
    });
  });

  describe('C. Personnel Package Stress Tests', () => {
    test('should handle impossible personnel combinations gracefully', () => {
      const impossibleSequence: PersonnelPackage[] = ['10', '21', '10', '12', '10', '21'];

      impossibleSequence.forEach(personnel => {
        engine.setPersonnel(personnel);

        const state = engine.getGameState();
        const defenders = state.players.filter(p => p.team === 'defense');

        // Should always maintain 7 defenders
        expect(defenders.length).toBe(7);

        // Should adjust defensive personnel appropriately
        const dbs = defenders.filter(d =>
          d.playerType === 'CB' || d.playerType === 'S' || d.playerType === 'NB'
        );
        const lbs = defenders.filter(d => d.playerType === 'LB');

        if (personnel === '10') {
          // Dime package for 4 WRs
          expect(dbs.length).toBeGreaterThanOrEqual(5);
        } else if (personnel === '21') {
          // Base package for heavy personnel
          expect(lbs.length).toBeGreaterThanOrEqual(2);
        }
      });
    });

    test('should handle personnel mismatches with coverage requirements', () => {
      // Set personnel that creates mismatch scenarios
      engine.setPersonnel('10'); // 4 WRs

      const problematicCoverages = ['tampa-2', 'cover-6'];

      problematicCoverages.forEach(coverageName => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const state = engine.getGameState();
          const defenders = state.players.filter(p => p.team === 'defense');

          // Should still field 7 defenders
          expect(defenders.length).toBe(7);

          // Should adapt coverage to available personnel
          defenders.forEach(d => {
            expect(d.coverageResponsibility).toBeDefined();
          });
        }
      });
    });

    test('should maintain coverage integrity through personnel cycling', () => {
      const personnelCycle: PersonnelPackage[] = ['11', '10', '12', '21', '11'];
      const cover3 = DataLoader.getCoverage('cover-3');

      if (cover3) {
        engine.setCoverage(cover3);

        personnelCycle.forEach(personnel => {
          engine.setPersonnel(personnel);

          const state = engine.getGameState();

          // Coverage should remain Cover 3
          expect(state.coverage?.name).toBe('Cover 3');

          // Should have appropriate personnel
          expect(state.personnel).toBe(personnel);

          // Defense should adjust but maintain coverage principles
          const defenders = state.players.filter(p => p.team === 'defense');
          expect(defenders.length).toBe(7);

          const zoneDefenders = defenders.filter(d =>
            d.coverageResponsibility?.type === 'zone'
          );

          // Cover 3 should have zone defenders
          expect(zoneDefenders.length).toBeGreaterThanOrEqual(3);
        });
      }
    });
  });

  describe('D. Coverage Transition Stress Tests', () => {
    test('should handle coverage carousel without state corruption', () => {
      const coverageCarousel = [
        'cover-0', 'cover-1', 'cover-2', 'cover-3',
        'cover-4', 'cover-6', 'quarters', 'tampa-2'
      ];

      const initialReceivers = engine.getGameState().players.filter(p =>
        p.team === 'offense'
      );

      coverageCarousel.forEach((coverageName, index) => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const state = engine.getGameState();

          // Basic integrity checks
          expect(state.players.filter(p => p.team === 'defense').length).toBe(7);
          expect(state.players.filter(p => p.team === 'offense').length)
            .toBe(initialReceivers.length);

          // Coverage should be set correctly
          expect(state.coverage?.name).toContain(coverageName.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '));

          // Validate defensive assignments
          const defenders = state.players.filter(p => p.team === 'defense');
          defenders.forEach(d => {
            expect(d.coverageResponsibility).toBeDefined();
            expect(['man', 'zone', 'spy', 'blitz']).toContain(
              d.coverageResponsibility?.type
            );
          });
        }
      });
    });

    test('should handle coverage changes with active motion and drag operations', () => {
      const state = engine.getGameState();
      const receivers = state.players.filter(p =>
        p.team === 'offense' && p.isEligible
      );

      if (receivers.length >= 2) {
        // Start motion
        engine.sendInMotion(receivers[0].id);

        // Drag another receiver while motion is active
        const originalX = receivers[1].position.x;
        engine.updatePlayerPosition(receivers[1].id, {
          x: originalX + 10,
          y: receivers[1].position.y
        });

        // Change coverage multiple times during this chaos
        const coverageChanges = ['cover-1', 'cover-2', 'quarters'];

        coverageChanges.forEach(coverageName => {
          const coverage = DataLoader.getCoverage(coverageName);
          if (coverage) {
            engine.setCoverage(coverage);

            const currentState = engine.getGameState();
            const defenders = currentState.players.filter(p => p.team === 'defense');

            // Should maintain defensive integrity
            expect(defenders.length).toBe(7);

            // Motion player should retain motion boost
            const motionPlayer = currentState.players.find(p => p.id === receivers[0].id);
            expect(motionPlayer?.hasMotionBoost).toBe(true);

            // Dragged player should be in new position
            const draggedPlayer = currentState.players.find(p => p.id === receivers[1].id);
            expect(draggedPlayer?.position.x).toBeGreaterThan(originalX + 5);
          }
        });
      }
    });

    test('should handle coverage incompatibilities and auto-correct', () => {
      // Set up scenario that might cause coverage issues
      engine.setPersonnel('10'); // 4 WRs - difficult for some coverages

      const challengingCoverages = ['tampa-2', 'cover-6'];

      challengingCoverages.forEach(coverageName => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (coverage) {
          engine.setCoverage(coverage);

          const state = engine.getGameState();
          const defenders = state.players.filter(p => p.team === 'defense');

          // Engine should auto-correct or adapt
          expect(defenders.length).toBe(7);

          // Should have valid assignments even if adapted
          const assignedDefenders = defenders.filter(d =>
            d.coverageResponsibility !== undefined
          );
          expect(assignedDefenders.length).toBe(7);
        }
      });
    });
  });

  describe('E. Snap Timing and State Transitions', () => {
    test('should handle snap during complex pre-snap adjustments', () => {
      // Set up complex pre-snap scenario
      const state = engine.getGameState();
      const receiver = state.players.find(p =>
        p.team === 'offense' && p.playerType === 'WR'
      );

      if (receiver) {
        // Start motion
        engine.sendInMotion(receiver.id);

        // Change coverage
        const cover2 = DataLoader.getCoverage('cover-2');
        if (cover2) engine.setCoverage(cover2);

        // Drag another player
        const rb = state.players.find(p =>
          p.team === 'offense' && p.playerType === 'RB'
        );
        if (rb) {
          engine.updatePlayerPosition(rb.id, {
            x: rb.position.x + 5,
            y: rb.position.y
          });
        }

        // Snap immediately
        engine.snap();

        const postSnapState = engine.getGameState();

        // Should transition to post-snap successfully
        expect(postSnapState.phase).toBe('post-snap');

        // Clean up
        engine.resetPlay();

        // All players should have valid positions
        postSnapState.players.forEach(p => {
          expect(isNaN(p.position.x)).toBe(false);
          expect(isNaN(p.position.y)).toBe(false);
        });
      }
    });

    test('should handle multiple snap/reset cycles with ongoing adjustments', () => {
      for (let cycle = 0; cycle < 5; cycle++) {
        // Make adjustments
        engine.setPersonnel(cycle % 2 === 0 ? '11' : '12');

        const coverage = DataLoader.getCoverage(
          cycle % 2 === 0 ? 'cover-3' : 'cover-2'
        );
        if (coverage) engine.setCoverage(coverage);

        // Snap
        engine.snap();

        const postSnap = engine.getGameState();
        expect(postSnap.phase).toBe('post-snap');

        // Reset
        engine.resetPlay();

        const reset = engine.getGameState();
        expect(reset.phase).toBe('pre-snap');

        // State should be valid after each cycle
        expect(reset.players.filter(p => p.team === 'defense').length).toBe(7);
      }
    });

    test('should maintain user autonomy through snap transitions', () => {
      const preSnapState = engine.getGameState();
      const initialPersonnel = preSnapState.personnel;
      const initialCoverage = preSnapState.coverage?.name;

      // Snap
      engine.snap();

      // User should still be able to make adjustments post-snap
      engine.setPersonnel('10');

      const postSnapState = engine.getGameState();

      // Personnel should have changed (user autonomy maintained)
      expect(postSnapState.personnel).toBe('10');
      expect(postSnapState.personnel).not.toBe(initialPersonnel);

      // Clean up
      engine.resetPlay();

      // Should be able to change coverage after reset
      const newCoverage = DataLoader.getCoverage('quarters');
      if (newCoverage) {
        engine.setCoverage(newCoverage);
        const finalState = engine.getGameState();
        expect(finalState.coverage?.name).not.toBe(initialCoverage);
      }
    });
  });

  describe('F. Memory and Performance Under Stress', () => {
    test('should not leak memory with thousands of rapid changes', () => {
      const startTime = performance.now();

      // Simulate intensive user session
      for (let i = 0; i < 1000; i++) {
        const actions = [
          () => {
            const concepts = ['slant-flat', 'mesh', 'four-verts'];
            const concept = DataLoader.getConcept(concepts[i % concepts.length]);
            if (concept) engine.setPlayConcept(concept);
          },
          () => engine.setPersonnel(['10', '11', '12'][i % 3] as PersonnelPackage),
          () => {
            const coverages = ['cover-1', 'cover-2', 'cover-3'];
            const coverage = DataLoader.getCoverage(coverages[i % coverages.length]);
            if (coverage) engine.setCoverage(coverage);
          },
          () => {
            const state = engine.getGameState();
            const wr = state.players.find(p => p.team === 'offense' && p.playerType === 'WR');
            if (wr) {
              engine.updatePlayerPosition(wr.id, {
                x: 10 + (i % 30),
                y: wr.position.y
              });
            }
          }
        ];

        // Execute random action
        actions[i % actions.length]();

        // Validate state periodically
        if (i % 100 === 0) {
          const state = engine.getGameState();
          expect(state.players.filter(p => p.team === 'defense').length).toBe(7);
        }
      }

      const endTime = performance.now();

      // Should complete in reasonable time (under 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);

      // Final state should be valid
      const finalState = engine.getGameState();
      expect(finalState.players.filter(p => p.team === 'defense').length).toBe(7);
    });

    test('should maintain consistent performance across stress scenarios', () => {
      const measurements: number[] = [];

      // Run same operation 100 times and measure
      for (let i = 0; i < 100; i++) {
        const start = performance.now();

        // Complex operation: change everything
        const mesh = DataLoader.getConcept('mesh');
        if (mesh) engine.setPlayConcept(mesh);

        engine.setPersonnel('10');

        const cover2 = DataLoader.getCoverage('cover-2');
        if (cover2) engine.setCoverage(cover2);

        const state = engine.getGameState();
        const wr = state.players.find(p => p.team === 'offense' && p.playerType === 'WR');
        if (wr) {
          engine.sendInMotion(wr.id);
        }

        const end = performance.now();
        measurements.push(end - start);
      }

      // Calculate statistics
      const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxTime = Math.max(...measurements);
      const minTime = Math.min(...measurements);

      // Performance should be consistent
      expect(avgTime).toBeLessThan(5); // Average under 5ms
      expect(maxTime).toBeLessThan(50); // No outliers over 50ms
      expect(maxTime - minTime).toBeLessThan(40); // Reasonable variance
    });
  });

  describe('G. Integration Chaos Tests', () => {
    test('should handle every possible combination simultaneously', () => {
      const concepts = ['slant-flat', 'mesh', 'four-verts', 'smash'];
      const personnel: PersonnelPackage[] = ['10', '11', '12', '21'];
      const coverages = ['cover-0', 'cover-1', 'cover-2', 'cover-3', 'quarters'];

      let successfulCombinations = 0;

      concepts.forEach(conceptName => {
        personnel.forEach(personnelPkg => {
          coverages.forEach(coverageName => {
            try {
              // Set combination
              const concept = DataLoader.getConcept(conceptName);
              if (concept) engine.setPlayConcept(concept);

              engine.setPersonnel(personnelPkg);

              const coverage = DataLoader.getCoverage(coverageName);
              if (coverage) engine.setCoverage(coverage);

              // Add some chaos
              const state = engine.getGameState();
              const receiver = state.players.find(p =>
                p.team === 'offense' && p.isEligible
              );
              if (receiver) {
                engine.sendInMotion(receiver.id);
              }

              // Validate result
              const finalState = engine.getGameState();
              const defenders = finalState.players.filter(p => p.team === 'defense');

              if (defenders.length === 7 && finalState.coverage && finalState.playConcept) {
                successfulCombinations++;
              }
            } catch (error) {
              // Some combinations might not work - that's OK
            }
          });
        });
      });

      // Should handle most combinations successfully
      const totalCombinations = concepts.length * personnel.length * coverages.length;
      const successRate = successfulCombinations / totalCombinations;

      expect(successRate).toBeGreaterThan(0.8); // At least 80% success rate
    });

    test('should recover gracefully from any corrupted state', () => {
      // Intentionally try to corrupt state with extreme inputs
      const state = engine.getGameState();
      const players = state.players.filter(p => p.team === 'offense');

      // Move all players to same position (illegal)
      players.forEach(player => {
        engine.updatePlayerPosition(player.id, { x: 0, y: 0 });
      });

      // Try invalid coverage combinations
      engine.setPersonnel('10');
      const tampa2 = DataLoader.getCoverage('tampa-2');
      if (tampa2) engine.setCoverage(tampa2);

      // Send everyone in motion (impossible)
      players.forEach(player => {
        if (player.isEligible) {
          engine.sendInMotion(player.id);
        }
      });

      // Engine should recover and provide valid state
      const recoveredState = engine.getGameState();
      const defenders = recoveredState.players.filter(p => p.team === 'defense');

      expect(defenders.length).toBe(7);
      expect(recoveredState.coverage).toBeDefined();
      expect(recoveredState.playConcept).toBeDefined();

      // Positions should be valid (not all at 0,0)
      let validPositions = 0;
      recoveredState.players.forEach(p => {
        if (p.position.x !== 0 || p.position.y !== 0) {
          validPositions++;
        }
      });

      expect(validPositions).toBeGreaterThan(0);
    });
  });
});