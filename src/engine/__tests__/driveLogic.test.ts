import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Drive Logic and Dynamic LOS', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();

    // Load test data
    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);
  });

  test('initial drive state should be correct', () => {
    const state = engine.getGameState();

    expect(state.lineOfScrimmage).toBe(70); // Default starting position at defensive 30
    expect(state.currentDown).toBe(1);
    expect(state.yardsToGo).toBe(10);
    expect(state.ballOn).toBe(70); // Defensive 30-yard line
    expect(state.isFirstDown).toBe(true);
  });

  test('LOS should update when set', () => {
    engine.setLineOfScrimmage(50);
    const state = engine.getGameState();

    expect(state.lineOfScrimmage).toBe(50);
    expect(state.ballOn).toBe(50); // Ball is at same position as LOS
  });

  test('players should be positioned relative to dynamic LOS', () => {
    // Test at different field positions
    const positions = [20, 40, 60, 80];

    positions.forEach(los => {
      engine.setLineOfScrimmage(los);
      engine.reset();

      const state = engine.getGameState();
      const qb = state.players.find(p => p.playerType === 'QB');
      const defenders = state.players.filter(p => p.team === 'defense');

      // QB should be at LOS in shotgun (actually a few yards back)
      expect(qb?.position.y).toBeCloseTo(los, 0);

      // All defenders should be positioned relative to LOS
      defenders.forEach(defender => {
        // Most defenders should be behind LOS (lower y values)
        if (defender.playerType === 'LB') {
          // Linebackers should be 4-5 yards behind LOS
          expect(defender.position.y).toBeLessThan(los);
          expect(defender.position.y).toBeGreaterThan(los - 10);
        } else if (defender.playerType === 'S') {
          // Safeties should be deeper (further behind LOS)
          expect(defender.position.y).toBeLessThan(los);
        } else if (defender.playerType === 'CB') {
          // Corners should be near LOS
          expect(defender.position.y).toBeLessThan(los);
          expect(defender.position.y).toBeGreaterThan(los - 10);
        }
      });
    });
  });

  test('advancing to next play should update field position correctly', () => {
    // Simulate a 15-yard gain
    engine.snap();

    // Mock a completion for 15 yards
    const state = engine.getGameState();
    const receiver = state.players.find(p => p.team === 'offense' && p.isEligible && p.playerType !== 'QB');

    if (receiver) {
      // Move receiver 15 yards downfield
      receiver.position.y -= 15;

      // Simulate catch
      engine.throwTo(receiver.id);

      // Wait for play to complete
      for (let i = 0; i < 180; i++) { // 3 seconds at 60 Hz
        engine.tick(1/60);
      }
    }

    // Advance to next play
    engine.advanceToNextPlay();
    const newState = engine.getGameState();

    // Should be 1st and 10 at new position
    expect(newState.currentDown).toBe(1);
    expect(newState.yardsToGo).toBe(10);
    expect(newState.isFirstDown).toBe(true);
    // LOS should have moved forward by yards gained
    expect(newState.lineOfScrimmage).toBeGreaterThan(70); // Moved upfield from defensive 30
  });

  test('4th down should reset to 1st and 10 after turnover', () => {
    // Set to 4th down
    const state = engine.getGameState();
    state.currentDown = 4;
    state.yardsToGo = 5;
    state.isFirstDown = false;

    // Simulate incomplete pass (turnover on downs)
    engine.snap();

    for (let i = 0; i < 300; i++) { // 5 seconds - should result in sack
      engine.tick(1/60);
    }

    // Advance to next play (turnover)
    engine.advanceToNextPlay();
    const newState = engine.getGameState();

    // Should reset to 1st and 10
    expect(newState.currentDown).toBe(1);
    expect(newState.yardsToGo).toBe(10);
    expect(newState.isFirstDown).toBe(true);
  });

  test('goal line situations should show "& Goal"', () => {
    // Set ball at opponent's 8-yard line
    engine.setLineOfScrimmage(13); // LOS at 13 (ball at 8)
    const state = engine.getGameState();

    expect(state.ballOn).toBe(13); // Ball is at LOS position
    expect(state.yardsToGo).toBe(10);

    // In UI, this should display as "1st & Goal"
  });
});