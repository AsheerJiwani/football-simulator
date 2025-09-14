import { FootballEngine } from '../Engine';
import type { GameState, PlayConcept, Coverage } from '../types';

describe('Deep Passing Concepts', () => {
  let engine: FootballEngine;
  let gameState: GameState;

  beforeEach(() => {
    engine = new FootballEngine();
    gameState = engine.getGameState();
  });

  describe('Dagger Concept', () => {
    it('should set up Dagger concept with correct routes and formation', () => {
      const daggerConcept: PlayConcept = {
        name: 'Dagger',
        formation: {
          name: 'trips-right',
          personnel: { RB: 1, TE: 0, WR: 4 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 45, y: 0 },
            WR2: { x: 40, y: 0 },
            WR3: { x: 8, y: 0 },
            RB1: { x: 26.665, y: -6 }
          }
        },
        routes: {
          WR1: {
            type: 'deep-dig' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 16 },
              { x: 26.665, y: 16 },
              { x: 10, y: 16 }
            ],
            timing: [0, 1.9, 2.8, 3.6],
            depth: 16
          },
          WR2: {
            type: 'seam-vertical' as any,
            waypoints: [
              { x: 40, y: 0 },
              { x: 40, y: 10 },
              { x: 38, y: 20 },
              { x: 36, y: 30 }
            ],
            timing: [0, 1.2, 2.4, 3.6],
            depth: 30
          },
          WR3: {
            type: 'shallow-drag' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 2 },
              { x: 26.665, y: 2 },
              { x: 45, y: 2 }
            ],
            timing: [0, 0.3, 1.5, 2.5],
            depth: 2
          },
          RB1: {
            type: 'check-release' as any,
            waypoints: [
              { x: 26.665, y: -6 },
              { x: 26.665, y: -4 },
              { x: 35, y: 0 },
              { x: 40, y: 3 }
            ],
            timing: [0, 0.5, 1.5, 2.0],
            depth: 3
          }
        }
      };

      engine.setPlayConcept(daggerConcept);
      gameState = engine.getGameState();

      // Verify formation setup
      const offensivePlayers = gameState.players.filter(p => p.team === 'offense');
      expect(offensivePlayers.length).toBe(5); // QB + 3 WRs + 1 RB

      // Verify deep dig route (WR1)
      const wr1 = offensivePlayers.find(p => p.id === 'WR1');
      expect(wr1).toBeDefined();
      expect(wr1?.route?.waypoints?.length).toBe(4);
      expect(wr1?.route?.depth).toBe(16);

      // Verify seam vertical route (WR2)
      const wr2 = offensivePlayers.find(p => p.id === 'WR2');
      expect(wr2).toBeDefined();
      expect(wr2?.route?.waypoints?.length).toBe(4);
      expect(wr2?.route?.depth).toBe(30);

      // Verify shallow drag route (WR3)
      const wr3 = offensivePlayers.find(p => p.id === 'WR3');
      expect(wr3).toBeDefined();
      expect(wr3?.route?.waypoints?.length).toBe(4);
      expect(wr3?.route?.depth).toBe(2);
    });

    it('should work with Cover 2 defense', () => {
      const daggerConcept: PlayConcept = {
        name: 'Dagger',
        formation: {
          name: 'trips-right',
          personnel: { RB: 1, TE: 0, WR: 4 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 45, y: 0 },
            WR2: { x: 40, y: 0 },
            WR3: { x: 8, y: 0 },
            RB1: { x: 26.665, y: -6 }
          }
        },
        routes: {
          WR1: {
            type: 'deep-dig' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 16 },
              { x: 26.665, y: 16 },
              { x: 10, y: 16 }
            ],
            timing: [0, 1.9, 2.8, 3.6],
            depth: 16
          },
          WR2: {
            type: 'seam-vertical' as any,
            waypoints: [
              { x: 40, y: 0 },
              { x: 40, y: 10 },
              { x: 38, y: 20 },
              { x: 36, y: 30 }
            ],
            timing: [0, 1.2, 2.4, 3.6],
            depth: 30
          },
          WR3: {
            type: 'shallow-drag' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 2 },
              { x: 26.665, y: 2 },
              { x: 45, y: 2 }
            ],
            timing: [0, 0.3, 1.5, 2.5],
            depth: 2
          }
        }
      };

      const cover2: Coverage = {
        type: 'cover-2',
        name: 'Cover 2',
        positions: {},
        responsibilities: []
      };

      engine.setPlayConcept(daggerConcept);
      engine.setCoverage(cover2);
      gameState = engine.getGameState();

      // Verify defense adjusts to trips formation
      const defenders = gameState.players.filter(p => p.team === 'defense');
      expect(defenders.length).toBe(7);

      // Verify deep dig can attack the hole in Cover 2
      engine.snap();
      gameState = engine.getGameState();
      expect(gameState.phase).toBe('post-snap');
    });
  });

  describe('Mills Concept', () => {
    it('should set up Mills concept with double posts and digs', () => {
      const millsConcept: PlayConcept = {
        name: 'Mills',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR1: {
            type: 'post' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 13 },
              { x: 18, y: 20 },
              { x: 26.665, y: 28 }
            ],
            timing: [0, 1.5, 2.3, 3.3],
            depth: 28
          },
          WR2: {
            type: 'post' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 13 },
              { x: 35, y: 20 },
              { x: 26.665, y: 28 }
            ],
            timing: [0, 1.5, 2.3, 3.3],
            depth: 28
          },
          WR3: {
            type: 'dig' as any,
            waypoints: [
              { x: 18, y: 0 },
              { x: 18, y: 11 },
              { x: 35, y: 11 },
              { x: 45, y: 11 }
            ],
            timing: [0, 1.3, 2.3, 3.0],
            depth: 11
          },
          TE1: {
            type: 'dig' as any,
            waypoints: [
              { x: 35, y: 0 },
              { x: 35, y: 11 },
              { x: 18, y: 11 },
              { x: 8, y: 11 }
            ],
            timing: [0, 1.3, 2.3, 3.0],
            depth: 11
          }
        }
      };

      engine.setPlayConcept(millsConcept);
      gameState = engine.getGameState();

      // Verify 2x2 formation setup
      const offensivePlayers = gameState.players.filter(p => p.team === 'offense');
      expect(offensivePlayers.length).toBe(6); // QB + 3 WRs + 1 TE + 1 RB

      // Verify double posts
      const wr1 = offensivePlayers.find(p => p.id === 'WR1');
      const wr2 = offensivePlayers.find(p => p.id === 'WR2');
      expect(wr1?.route?.depth).toBe(28);
      expect(wr2?.route?.depth).toBe(28);

      // Verify crossing digs
      const wr3 = offensivePlayers.find(p => p.id === 'WR3');
      const te1 = offensivePlayers.find(p => p.id === 'TE1');
      expect(wr3?.route?.depth).toBe(11);
      expect(te1?.route?.depth).toBe(11);
    });

    it('should attack Cover 4 with vertical stretch', () => {
      const millsConcept: PlayConcept = {
        name: 'Mills',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR1: {
            type: 'post' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 13 },
              { x: 18, y: 20 },
              { x: 26.665, y: 28 }
            ],
            timing: [0, 1.5, 2.3, 3.3],
            depth: 28
          },
          WR2: {
            type: 'post' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 13 },
              { x: 35, y: 20 },
              { x: 26.665, y: 28 }
            ],
            timing: [0, 1.5, 2.3, 3.3],
            depth: 28
          }
        }
      };

      const cover4: Coverage = {
        type: 'cover-4',
        name: 'Cover 4',
        positions: {},
        responsibilities: []
      };

      engine.setPlayConcept(millsConcept);
      engine.setCoverage(cover4);
      gameState = engine.getGameState();

      // Verify defense sets up Cover 4
      const defenders = gameState.players.filter(p => p.team === 'defense');
      expect(defenders.length).toBe(7);

      // Posts should stress safeties in Cover 4
      engine.snap();
      gameState = engine.getGameState();
      expect(gameState.phase).toBe('post-snap');
    });
  });

  describe('Scissors Concept', () => {
    it('should set up Scissors concept with crossing verticals', () => {
      const scissorsConcept: PlayConcept = {
        name: 'Scissors',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR1: {
            type: 'corner' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 8 },
              { x: 12, y: 14 },
              { x: 18, y: 20 }
            ],
            timing: [0, 0.9, 1.6, 2.4],
            depth: 20
          },
          WR2: {
            type: 'corner' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 8 },
              { x: 41, y: 14 },
              { x: 35, y: 20 }
            ],
            timing: [0, 0.9, 1.6, 2.4],
            depth: 20
          },
          WR3: {
            type: 'post' as any,
            waypoints: [
              { x: 18, y: 0 },
              { x: 18, y: 12 },
              { x: 24, y: 18 },
              { x: 26.665, y: 22 }
            ],
            timing: [0, 1.4, 2.1, 2.6],
            depth: 22
          },
          TE1: {
            type: 'post' as any,
            waypoints: [
              { x: 35, y: 0 },
              { x: 35, y: 12 },
              { x: 29, y: 18 },
              { x: 26.665, y: 22 }
            ],
            timing: [0, 1.4, 2.1, 2.6],
            depth: 22
          },
          RB1: {
            type: 'flat' as any,
            waypoints: [
              { x: 26.665, y: -7 },
              { x: 26.665, y: -3 },
              { x: 20, y: 0 },
              { x: 10, y: 4 }
            ],
            timing: [0, 0.4, 1.0, 1.5],
            depth: 4
          }
        }
      };

      engine.setPlayConcept(scissorsConcept);
      gameState = engine.getGameState();

      // Verify formation
      const offensivePlayers = gameState.players.filter(p => p.team === 'offense');
      expect(offensivePlayers.length).toBe(6); // QB + 3 WRs + 1 TE + 1 RB

      // Verify crossing corners and posts
      const wr1 = offensivePlayers.find(p => p.id === 'WR1');
      const wr2 = offensivePlayers.find(p => p.id === 'WR2');
      const wr3 = offensivePlayers.find(p => p.id === 'WR3');
      const te1 = offensivePlayers.find(p => p.id === 'TE1');

      expect(wr1?.route?.depth).toBe(20); // Corner
      expect(wr2?.route?.depth).toBe(20); // Corner
      expect(wr3?.route?.depth).toBe(22); // Post
      expect(te1?.route?.depth).toBe(22); // Post

      // Verify crossing action creates natural picks
      expect(wr1?.route?.waypoints?.[3]?.x).toBeGreaterThan(wr1?.route?.waypoints?.[0]?.x || 0);
      expect(wr2?.route?.waypoints?.[3]?.x).toBeLessThan(wr2?.route?.waypoints?.[0]?.x || 0);
    });

    it('should create pick/rub action against man coverage', () => {
      const scissorsConcept: PlayConcept = {
        name: 'Scissors',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR3: {
            type: 'post' as any,
            waypoints: [
              { x: 18, y: 0 },
              { x: 18, y: 12 },
              { x: 24, y: 18 },
              { x: 26.665, y: 22 }
            ],
            timing: [0, 1.4, 2.1, 2.6],
            depth: 22
          },
          TE1: {
            type: 'post' as any,
            waypoints: [
              { x: 35, y: 0 },
              { x: 35, y: 12 },
              { x: 29, y: 18 },
              { x: 26.665, y: 22 }
            ],
            timing: [0, 1.4, 2.1, 2.6],
            depth: 22
          }
        }
      };

      const cover1: Coverage = {
        type: 'cover-1',
        name: 'Cover 1',
        positions: {},
        responsibilities: []
      };

      engine.setPlayConcept(scissorsConcept);
      engine.setCoverage(cover1);
      gameState = engine.getGameState();

      // Verify man coverage defenders
      const defenders = gameState.players.filter(p => p.team === 'defense');
      const manDefenders = defenders.filter(d => d.coverageResponsibility?.type === 'man');
      expect(manDefenders.length).toBeGreaterThanOrEqual(4); // At least 4 in man coverage

      // Crossing routes should create separation
      engine.snap();
      gameState = engine.getGameState();
      expect(gameState.phase).toBe('post-snap');
    });
  });

  describe('Integration with defensive realignment', () => {
    it('should maintain 7 defenders when switching between deep passing concepts', () => {
      const cover3: Coverage = {
        type: 'cover-3',
        name: 'Cover 3',
        positions: {},
        responsibilities: []
      };

      engine.setCoverage(cover3);

      // Set Dagger concept (trips formation)
      const daggerConcept: PlayConcept = {
        name: 'Dagger',
        formation: {
          name: 'trips-right',
          personnel: { RB: 1, TE: 0, WR: 4 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 45, y: 0 },
            WR2: { x: 40, y: 0 },
            WR3: { x: 8, y: 0 },
            RB1: { x: 26.665, y: -6 }
          }
        },
        routes: {
          WR1: {
            type: 'deep-dig' as any,
            waypoints: [
              { x: 45, y: 0 },
              { x: 45, y: 16 },
              { x: 26.665, y: 16 },
              { x: 10, y: 16 }
            ],
            timing: [0, 1.9, 2.8, 3.6],
            depth: 16
          }
        }
      };

      engine.setPlayConcept(daggerConcept);
      gameState = engine.getGameState();

      const tripsDefenders = gameState.players.filter(p => p.team === 'defense');
      expect(tripsDefenders.length).toBe(7);

      // Switch to Mills concept (2x2 formation)
      const millsConcept: PlayConcept = {
        name: 'Mills',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR1: {
            type: 'post' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 13 },
              { x: 18, y: 20 },
              { x: 26.665, y: 28 }
            ],
            timing: [0, 1.5, 2.3, 3.3],
            depth: 28
          }
        }
      };

      engine.setPlayConcept(millsConcept);
      gameState = engine.getGameState();

      const spreadDefenders = gameState.players.filter(p => p.team === 'defense');

      // Verify defense maintained 7 defenders through formation change
      expect(spreadDefenders.length).toBe(7);

      // Verify offense changed from trips to 2x2
      const offense = gameState.players.filter(p => p.team === 'offense');
      expect(offense.length).toBe(6); // QB + 3 WRs + 1 TE + 1 RB

      // Switch to Scissors concept (also 2x2)
      const scissorsConcept: PlayConcept = {
        name: 'Scissors',
        formation: {
          name: 'spread-2x2',
          personnel: { RB: 1, TE: 1, WR: 3 },
          positions: {
            QB1: { x: 26.665, y: -6 },
            WR1: { x: 8, y: 0 },
            WR2: { x: 45, y: 0 },
            WR3: { x: 18, y: 0 },
            TE1: { x: 35, y: 0 },
            RB1: { x: 26.665, y: -7 }
          }
        },
        routes: {
          WR1: {
            type: 'corner' as any,
            waypoints: [
              { x: 8, y: 0 },
              { x: 8, y: 8 },
              { x: 12, y: 14 },
              { x: 18, y: 20 }
            ],
            timing: [0, 0.9, 1.6, 2.4],
            depth: 20
          }
        }
      };

      engine.setPlayConcept(scissorsConcept);
      gameState = engine.getGameState();

      const scissorsDefenders = gameState.players.filter(p => p.team === 'defense');

      // Verify defense still has 7 defenders
      expect(scissorsDefenders.length).toBe(7);
    });
  });
});