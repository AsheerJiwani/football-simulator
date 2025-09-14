import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Coverage/Play Selection Rendering Fix', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
    const defaultConcept = DataLoader.getConcept('slant-flat');
    const defaultCoverage = DataLoader.getCoverage('cover-1');

    if (defaultConcept) engine.setPlayConcept(defaultConcept);
    if (defaultCoverage) engine.setCoverage(defaultCoverage);
  });

  test('getGameState() should return new players array reference', () => {
    const state1 = engine.getGameState();
    const players1 = state1.players;

    // Get state again without any changes
    const state2 = engine.getGameState();
    const players2 = state2.players;

    // Arrays should be different references (deep copy)
    expect(players1).not.toBe(players2);
    // But contents should be equal
    expect(players1).toEqual(players2);
  });

  test('changing coverage should create new players array', () => {
    const stateBefore = engine.getGameState();
    const playersBefore = stateBefore.players;

    // Change coverage
    const newCoverage = DataLoader.getCoverage('cover-2');
    if (newCoverage) {
      engine.setCoverage(newCoverage);
    }

    const stateAfter = engine.getGameState();
    const playersAfter = stateAfter.players;

    // Should be different array references
    expect(playersBefore).not.toBe(playersAfter);

    // Should have different defensive alignments
    const defendersBefore = playersBefore.filter(p => p.team === 'defense');
    const defendersAfter = playersAfter.filter(p => p.team === 'defense');

    // At least some defenders should have different positions
    const positionsChanged = defendersAfter.some((defender, i) => {
      const beforePos = defendersBefore[i]?.position;
      return beforePos && (
        defender.position.x !== beforePos.x ||
        defender.position.y !== beforePos.y
      );
    });

    expect(positionsChanged).toBe(true);
  });

  test('changing play concept should create new players array', () => {
    const stateBefore = engine.getGameState();
    const playersBefore = stateBefore.players;

    // Change play concept
    const newConcept = DataLoader.getConcept('mesh');
    if (newConcept) {
      engine.setPlayConcept(newConcept);
    }

    const stateAfter = engine.getGameState();
    const playersAfter = stateAfter.players;

    // Should be different array references
    expect(playersBefore).not.toBe(playersAfter);

    // Should have different offensive formations
    const offenseBefore = playersBefore.filter(p => p.team === 'offense');
    const offenseAfter = playersAfter.filter(p => p.team === 'offense');

    // At least some offensive players should have different positions
    const positionsChanged = offenseAfter.some((player, i) => {
      const beforePos = offenseBefore[i]?.position;
      return beforePos && (
        player.position.x !== beforePos.x ||
        player.position.y !== beforePos.y
      );
    });

    expect(positionsChanged).toBe(true);
  });

  test('lastUpdate timestamp should change with each getGameState() call', () => {
    const state1 = engine.getGameState();
    const time1 = state1.lastUpdate;

    // Small delay to ensure timestamp changes
    const state2 = engine.getGameState();
    const time2 = state2.lastUpdate;

    expect(time1).toBeDefined();
    expect(time2).toBeDefined();
    expect(time2).toBeGreaterThanOrEqual(time1!);
  });
});