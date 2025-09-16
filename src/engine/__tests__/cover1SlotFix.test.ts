/**
 * Test suite to diagnose and fix Cover 1 critical issues:
 * 1. Slot WR route motion not rendering (11 personnel)
 * 2. Cover 1 man coverage not assigned to Slot WR
 * 3. Safety alignment incorrect (both safeties on weak-side instead of single high)
 */

import { FootballEngine } from '../Engine';
import { DataLoader } from '@/lib/dataLoader';

describe('Cover 1 Slot WR Issues', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine({
      config: {
        fps: 60,
        fieldWidth: 53.33,
        fieldHeight: 120,
        sackTime: 3,
        gameMode: 'free-play',
        showDefense: true,
        starPlayer: null
      }
    });
  });

  test('should properly assign man coverage to all receivers including slot WR in Cover 1', () => {
    // Setup 11 personnel with slant-flat concept
    engine.setPersonnel('11'); // 1 RB, 1 TE, 3 WRs

    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);

    // Log the current state
    const gameState = engine.getGameState();
    const offense = gameState.players?.filter(p => p.team === 'offense');
    const defense = gameState.players?.filter(p => p.team === 'defense');

    console.log('\n=== OFFENSIVE PLAYERS ===');
    offense?.forEach(player => {
      if (player.playerType !== 'QB') {
        console.log(`${player.id} (${player.playerType}): x=${player.position.x.toFixed(1)}, y=${player.position.y.toFixed(1)}, route=${player.route?.type || 'none'}`);
      }
    });

    console.log('\n=== DEFENSIVE PLAYERS ===');
    defense?.forEach(player => {
      const resp = player.coverageResponsibility;
      console.log(`${player.id} (${player.playerType}): x=${player.position.x.toFixed(1)}, y=${player.position.y.toFixed(1)}, type=${resp?.type}, target=${resp?.target || 'none'}`);
    });

    // Check that all eligible receivers have a defender assigned
    const eligibleReceivers = offense?.filter(p => p.isEligible && p.playerType !== 'QB') || [];
    const manDefenders = defense?.filter(d => d.coverageResponsibility?.type === 'man') || [];

    console.log('\n=== COVERAGE ASSIGNMENTS ===');
    eligibleReceivers.forEach(receiver => {
      const assignedDefender = manDefenders.find(d => d.coverageResponsibility?.target === receiver.id);
      console.log(`${receiver.id} (${receiver.playerType}) -> ${assignedDefender ? assignedDefender.id : 'UNASSIGNED'}`);
    });

    // Find the slot WR (typically WR3 or WR closest to center)
    const centerX = 26.665;
    const slotWR = eligibleReceivers
      .filter(p => p.playerType === 'WR')
      .sort((a, b) => Math.abs(a.position.x - centerX) - Math.abs(b.position.x - centerX))[0];

    if (slotWR) {
      console.log(`\nSlot WR identified: ${slotWR.id} at x=${slotWR.position.x.toFixed(1)}`);
      const slotDefender = manDefenders.find(d => d.coverageResponsibility?.target === slotWR.id);

      // ASSERTION 1: Slot WR should have man coverage assigned
      expect(slotDefender).toBeDefined();
      expect(slotDefender?.coverageResponsibility?.type).toBe('man');
    }

    // ASSERTION 2: All eligible receivers should have man coverage
    eligibleReceivers.forEach(receiver => {
      const defender = defense.find(d => d.coverageResponsibility?.target === receiver.id);
      expect(defender).toBeDefined();
    });
  });

  test('should have single high safety in Cover 1', () => {
    engine.setPersonnel('11');

    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);

    const gameState = engine.getGameState();
    const safeties = gameState.players?.filter(p => p.team === 'defense' && p.playerType === 'S') || [];

    console.log('\n=== SAFETY POSITIONS ===');
    safeties.forEach(s => {
      console.log(`${s.id}: x=${s.position.x.toFixed(1)}, y=${s.position.y.toFixed(1)}, resp=${s.coverageResponsibility?.type}`);
    });

    // In Cover 1, should have exactly one free safety (deep middle) and possibly one strong safety
    const freeSafety = safeties.find(s =>
      s.coverageResponsibility?.type === 'zone' ||
      s.id === 'S1' ||
      s.id === 'FS'
    );

    // ASSERTION 3: Free safety should be positioned in middle of field
    if (freeSafety) {
      const centerX = 26.665;
      const xDiff = Math.abs(freeSafety.position.x - centerX);
      console.log(`Free safety x-offset from center: ${xDiff.toFixed(1)}`);

      // Free safety should be within 5 yards of center
      expect(xDiff).toBeLessThan(5);

      // Free safety should be deep (12-15 yards from LOS)
      const los = 30; // Default LOS
      const depth = freeSafety.position.y - los;
      console.log(`Free safety depth from LOS: ${depth.toFixed(1)}`);
      expect(depth).toBeGreaterThanOrEqual(12);
      expect(depth).toBeLessThanOrEqual(18);
    } else {
      fail('No free safety found in Cover 1');
    }
  });

  test('should have all WRs with routes that execute properly', () => {
    engine.setPersonnel('11');

    const concept = DataLoader.getConcept('slant-flat');
    const coverage = DataLoader.getCoverage('cover-1');

    if (concept) engine.setPlayConcept(concept);
    if (coverage) engine.setCoverage(coverage);

    // Snap the ball
    engine.snap();

    const initialState = engine.getGameState();
    const wrs = initialState.players?.filter(p => p.team === 'offense' && p.playerType === 'WR') || [];

    const initialPositions = new Map();
    wrs.forEach(wr => {
      initialPositions.set(wr.id, { ...wr.position });
      console.log(`${wr.id} initial: x=${wr.position.x.toFixed(1)}, y=${wr.position.y.toFixed(1)}, route=${wr.route?.type}`);
    });

    // Run the engine for 2 seconds
    for (let i = 0; i < 120; i++) { // 2 seconds at 60 fps
      engine.tick(1/60);
    }

    const finalState = engine.getGameState();
    const finalWRs = finalState.players?.filter(p => p.team === 'offense' && p.playerType === 'WR') || [];

    console.log('\n=== WR MOVEMENT AFTER 2 SECONDS ===');
    finalWRs.forEach(wr => {
      const initial = initialPositions.get(wr.id);
      const deltaX = wr.position.x - initial.x;
      const deltaY = wr.position.y - initial.y;
      console.log(`${wr.id}: moved (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);

      // ASSERTION 4: All WRs should have moved from their initial position
      const totalMovement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      expect(totalMovement).toBeGreaterThan(1); // At least 1 yard of movement
    });
  });
});