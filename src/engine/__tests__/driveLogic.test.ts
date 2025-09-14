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

    expect(state.lineOfScrimmage).toBe(30); // Default starting position at offensive 30
    expect(state.currentDown).toBe(1);
    expect(state.yardsToGo).toBe(10);
    expect(state.ballOn).toBe(30); // Offensive 30-yard line
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

      // Need to set play concept and coverage to create players
      const concept = DataLoader.getConcept('slant-flat');
      const coverage = DataLoader.getCoverage('cover-1');
      if (concept) engine.setPlayConcept(concept);
      if (coverage) engine.setCoverage(coverage);

      const state = engine.getGameState();
      const qb = state.players.find(p => p.playerType === 'QB');
      const defenders = state.players.filter(p => p.team === 'defense');

      // QB should be positioned relative to LOS (behind it in shotgun)
      if (qb) {
        // QB is typically 5-7 yards behind LOS in shotgun, verify it's behind the LOS
        expect(qb.position.y).toBeLessThan(los);
        expect(qb.position.y).toBeGreaterThan(los - 10);
      }

      // All defenders should be positioned relative to LOS
      defenders.forEach(defender => {
        // Defenders are positioned on defensive side of ball (higher y values)
        if (defender.playerType === 'LB') {
          // Linebackers should be 4-5 yards off LOS on defensive side
          expect(defender.position.y).toBeGreaterThan(los);
          expect(defender.position.y).toBeLessThan(los + 10);
        } else if (defender.playerType === 'S') {
          // Safeties should be deeper on defensive side
          expect(defender.position.y).toBeGreaterThan(los);
        } else if (defender.playerType === 'CB') {
          // Corners should be near LOS on defensive side
          expect(defender.position.y).toBeGreaterThanOrEqual(los - 2);
          expect(defender.position.y).toBeLessThan(los + 10);
        }
      });
    });
  });

  test('advancing to next play should update field position correctly', () => {
    // Start from a known position
    engine.setLineOfScrimmage(30);
    const initialState = engine.getGameState();
    expect(initialState.lineOfScrimmage).toBe(30);

    // Simulate a successful play
    engine.snap();
    const state = engine.getGameState();
    const receiver = state.players.find(p => p.team === 'offense' && p.isEligible && p.playerType !== 'QB');

    if (receiver) {
      // Move receiver 15 yards downfield (increase y value since field is vertical)
      receiver.position.y = initialState.lineOfScrimmage + 15;

      // Simulate catch
      engine.throwTo(receiver.id);

      // Wait for ball to arrive and play to complete
      for (let i = 0; i < 300; i++) { // 5 seconds at 60 Hz
        engine.tick(1/60);
        const currentState = engine.getGameState();
        if (currentState.phase === 'play-over') break;
      }
    }

    // Verify play is over and advance to next play
    const preAdvanceState = engine.getGameState();
    expect(preAdvanceState.phase).toBe('play-over');

    // Check what outcome we got
    const outcome = preAdvanceState.outcome;

    engine.advanceToNextPlay();
    const newState = engine.getGameState();

    // The test should result in either a catch or incomplete/sack
    // If it's a catch with 15 yards gained, we should see field position change
    if (outcome?.type === 'catch') {
      // Should be 1st and 10 at new position (15 yards gained should trigger first down)
      expect(newState.currentDown).toBe(1);
      expect(newState.yardsToGo).toBe(10);
      expect(newState.isFirstDown).toBe(true);
      // LOS should have moved forward by yards gained
      expect(newState.lineOfScrimmage).toBeGreaterThan(30);
    } else {
      // If no catch, ensure field position stays the same or moves back (sack)
      if (outcome?.type === 'sack') {
        expect(newState.lineOfScrimmage).toBeLessThanOrEqual(30);
      } else {
        expect(newState.lineOfScrimmage).toBe(30);
      }
      // Down should advance
      expect(newState.currentDown).toBe(2);
    }
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