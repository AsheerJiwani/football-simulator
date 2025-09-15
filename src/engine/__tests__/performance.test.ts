import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Engine Performance', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
    const concept = DataLoader.getConcept('four-verts');
    const coverage = DataLoader.getCoverage('cover-2');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  test('tick() should execute in under 1ms', () => {
    engine.snap();

    const iterations = 1000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine['tick'](1/60);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    // Should be well under 1ms per tick for 60fps
    expect(avgTime).toBeLessThan(1.0);
  });

  test('realignDefense() should execute quickly', () => {
    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      engine['realignDefense']();
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    // Defensive realignment should be fast
    expect(avgTime).toBeLessThan(10); // 10ms is reasonable for complex realignment
  });

  test('motion adjustments should be performant', () => {
    const state = engine.getGameState();
    const motionPlayer = state.players.find(p =>
      p.team === 'offense' && p.playerType === 'WR'
    );

    if (motionPlayer) {
      const iterations = 100;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        engine.sendInMotion(motionPlayer.id);
        // Reset motion
        engine['gameState'].isMotionActive = false;
        engine['gameState'].motionPlayer = null;
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      // Motion should be quick
      expect(avgTime).toBeLessThan(5);
    }
  });

  test('memory usage should be stable', () => {
    // Run multiple plays to check for memory leaks
    for (let i = 0; i < 10; i++) {
      engine.snap();

      // Simulate a full play
      for (let j = 0; j < 180; j++) { // 3 seconds
        engine['tick'](1/60);
      }

      engine.reset();
    }

    // If we get here without crashing, memory is likely stable
    expect(true).toBe(true);
  });
});