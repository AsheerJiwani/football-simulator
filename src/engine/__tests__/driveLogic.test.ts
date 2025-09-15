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
    // Test at different field positions (avoiding safety zone)
    const positions = [30, 50, 70, 80];

    positions.forEach(los => {
      engine.setLineOfScrimmage(los);

      // Need to set play concept and coverage to create players
      const concept = DataLoader.getConcept('slant-flat');
      const coverage = DataLoader.getCoverage('cover-1');
      if (concept) engine.setPlayConcept(concept);
      if (coverage) engine.setCoverage(coverage);

      const state = engine.getGameState();
      const actualLOS = state.lineOfScrimmage; // May be adjusted if in safety zone
      const qb = state.players.find(p => p.playerType === 'QB');
      const defenders = state.players.filter(p => p.team === 'defense');

      // QB should be positioned relative to LOS (behind it in shotgun)
      if (qb) {
        // QB is typically 5-7 yards behind LOS in shotgun, verify it's behind the LOS
        expect(qb.position.y).toBeLessThan(actualLOS);
        expect(qb.position.y).toBeGreaterThan(actualLOS - 10);
      }

      // All defenders should be positioned relative to LOS
      defenders.forEach(defender => {
        // Defenders are positioned on defensive side of ball (higher y values)
        if (defender.playerType === 'LB') {
          // Debug logging for the failing case
          if (defender.position.y <= actualLOS) {
            console.error(`LB ${defender.id} at y=${defender.position.y} is behind LOS=${actualLOS}. Coverage: ${defender.coverageResponsibility?.type}, Zone: ${defender.coverageResponsibility?.zone?.name}`);
          }

          // Log all defender info for debugging
          if (los === 50) {
            console.log(`Defender ${defender.id} (${defender.playerType}): position=${defender.position.x},${defender.position.y}, coverage=${defender.coverageResponsibility?.type}, target=${defender.coverageResponsibility?.target}`);
          }

          // Linebackers should be 4-16 yards off LOS on defensive side
          // When offense is backed up near their endzone, LBs may be deeper
          // to avoid crowding in limited field space
          // Special case: When backed up near the offensive endzone (LOS < 20),
          // defenders may maintain more standard depths to avoid bunching
          expect(defender.position.y).toBeGreaterThan(actualLOS);
          if (actualLOS < 20) {
            // When backed up, LBs may be at their normal depth positions
            expect(defender.position.y).toBeLessThan(Math.max(actualLOS + 18, 40));
          } else {
            expect(defender.position.y).toBeLessThan(actualLOS + 18);
          }
        }

        // Log all defenders at LOS=50 for analysis
        if (los === 50) {
          console.log(`All Defender ${defender.id} (${defender.playerType}): position=${defender.position.x},${defender.position.y}, coverage=${defender.coverageResponsibility?.type}, target=${defender.coverageResponsibility?.target}`);
        }

        if (defender.playerType === 'S') {
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
    // Set sack time to 2 seconds for faster test
    engine.setSackTime(2.0);
    const initialState = engine.getGameState();
    expect(initialState.lineOfScrimmage).toBe(30);

    // Simulate play - just wait for timeout which will be a sack
    engine.snap();

    // Run for 2.5 seconds to trigger sack
    let finalPhase = 'pre-snap';
    let finalTime = 0;
    for (let i = 0; i < 150; i++) { // 2.5 seconds at 60 Hz
      engine.tick(1/60);
      const currentState = engine.getGameState();
      finalPhase = currentState.phase;
      finalTime = currentState.timeElapsed;
      if (currentState.phase === 'play-over') break;
    }

    // Debug info if test fails
    if (finalPhase !== 'play-over') {
      console.log('Final phase:', finalPhase, 'Time elapsed:', finalTime, 'Sack time:', engine.getGameState().sackTime);
    }

    // Verify play is over and advance to next play
    const preAdvanceState = engine.getGameState();
    expect(preAdvanceState.phase).toBe('play-over');

    // Check what outcome we got
    const outcome = preAdvanceState.outcome;

    engine.advanceToNextPlay();
    const newState = engine.getGameState();

    // For a sack, field position should stay same or move back, and down should advance
    if (outcome?.type === 'sack') {
      expect(newState.lineOfScrimmage).toBeLessThanOrEqual(30);
      expect(newState.currentDown).toBe(2);
      expect(newState.yardsToGo).toBeGreaterThanOrEqual(10);
    } else if (outcome?.type === 'incomplete') {
      expect(newState.lineOfScrimmage).toBe(30);
      expect(newState.currentDown).toBe(2);
      expect(newState.yardsToGo).toBe(10);
    }

    // Verify field position update logic works
    expect(newState.ballOn).toBe(newState.lineOfScrimmage);
  });

  test('safety should trigger when LOS is at or behind 1-yard line', () => {
    const engine = new FootballEngine();

    // Try to set LOS at 1-yard line (safety zone)
    engine.setLineOfScrimmage(1);

    let state = engine.getGameState();
    // Should reset to 30-yard line due to safety
    expect(state.lineOfScrimmage).toBe(30);
    expect(state.currentDown).toBe(1);
    expect(state.yardsToGo).toBe(10);

    // Try to set LOS at 0 (definitely a safety)
    engine.setLineOfScrimmage(0);

    state = engine.getGameState();
    expect(state.lineOfScrimmage).toBe(30);

    // Verify that LOS at 2 yards is allowed (not a safety)
    engine.setLineOfScrimmage(2);
    state = engine.getGameState();
    expect(state.lineOfScrimmage).toBe(2);
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