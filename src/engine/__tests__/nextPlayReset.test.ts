import { FootballEngine } from '../Engine';
import type { PlayOutcome } from '../types';
import { DataLoader } from '@/lib/dataLoader';

describe('Next Play and Reset Integration', () => {
  let engine: FootballEngine;

  beforeEach(() => {
    engine = new FootballEngine();
  });

  describe('nextPlay functionality', () => {
    it('should advance to next play after completion', () => {
      // Setup and snap
      const concept = DataLoader.getConcept('slant-flat');
      const coverage = DataLoader.getCoverage('cover-1');
      if (concept) engine.setPlayConcept(concept);
      if (coverage) engine.setCoverage(coverage);
      engine.snap();

      // Simulate play completion
      const outcome: PlayOutcome = {
        type: 'catch',
        yards: 5,
        openness: 50,
        catchProbability: 75,
        endPosition: { x: 26.67, y: 35 }
      };

      // Force end play
      engine['endPlay'](outcome);

      const initialDown = engine.getGameState().currentDown;
      const initialYardsToGo = engine.getGameState().yardsToGo;
      const initialLOS = engine.getGameState().lineOfScrimmage;

      // Call nextPlay
      engine.nextPlay();

      const newState = engine.getGameState();

      // Verify drive progression
      expect(newState.currentDown).toBe(initialDown + 1);
      expect(newState.yardsToGo).toBe(initialYardsToGo - 5);
      expect(newState.lineOfScrimmage).toBe(initialLOS + 5);
      expect(newState.phase).toBe('pre-snap');
      expect(newState.outcome).toBeUndefined();
    });

    it('should handle first down correctly', () => {
      // Setup for first down scenario
      engine.setPlayConcept('four-verts');
      engine.setCoverage('cover-2');
      engine.snap();

      // Simulate big gain
      const outcome: PlayOutcome = {
        type: 'catch',
        yards: 15,
        openness: 70,
        catchProbability: 85,
        endPosition: { x: 26.67, y: 45 }
      };

      engine['endPlay'](outcome);
      engine.nextPlay();

      const newState = engine.getGameState();

      // Should be 1st and 10
      expect(newState.currentDown).toBe(1);
      expect(newState.yardsToGo).toBe(10);
      expect(newState.lineOfScrimmage).toBe(45);
    });

    it('should handle touchdown correctly', () => {
      // Move close to endzone
      engine['gameState'].lineOfScrimmage = 95;
      engine['gameState'].ballOn = 95;

      const smashConcept = DataLoader.getConcept('smash');
      const cover3 = DataLoader.getCoverage('cover-3');
      if (smashConcept) engine.setPlayConcept(smashConcept);
      if (cover3) engine.setCoverage(cover3);
      engine.snap();

      // Simulate touchdown
      const outcome: PlayOutcome = {
        type: 'touchdown',
        yards: 25,
        openness: 80,
        catchProbability: 90,
        endPosition: { x: 26.67, y: 120 }
      };

      engine['endPlay'](outcome);
      engine.nextPlay();

      const newState = engine.getGameState();

      // Should reset to 30 yard line after TD
      expect(newState.currentDown).toBe(1);
      expect(newState.yardsToGo).toBe(10);
      expect(newState.lineOfScrimmage).toBe(30);
      expect(newState.isTouchdown).toBe(false);
    });

    it('should handle safety correctly', () => {
      // Move to own 1 yard line
      engine['gameState'].lineOfScrimmage = 1;
      engine['gameState'].ballOn = 1;

      const meshConcept = DataLoader.getConcept('mesh');
      if (meshConcept) engine.setPlayConcept(meshConcept);
      const cover0 = DataLoader.getCoverage('cover-0');
      if (cover0) engine.setCoverage(cover0);
      engine.snap();

      // Simulate sack in endzone
      const outcome: PlayOutcome = {
        type: 'sack',
        yards: -2,
        openness: 0,
        catchProbability: 0,
        endPosition: { x: 26.67, y: -1 }
      };

      engine['endPlay'](outcome);
      engine.nextPlay();

      const newState = engine.getGameState();

      // Should reset to 30 after safety
      expect(newState.currentDown).toBe(1);
      expect(newState.yardsToGo).toBe(10);
      expect(newState.lineOfScrimmage).toBe(30);
    });

    it('should not advance if play not over', () => {
      const concept = DataLoader.getConcept('slant-flat');
      const coverage = DataLoader.getCoverage('cover-1');
      if (concept) engine.setPlayConcept(concept);
      if (coverage) engine.setCoverage(coverage);

      const initialState = { ...engine.getGameState() };

      // Try to advance without play being over
      engine.nextPlay();

      const newState = engine.getGameState();

      // State should not change
      expect(newState.currentDown).toBe(initialState.currentDown);
      expect(newState.lineOfScrimmage).toBe(initialState.lineOfScrimmage);
    });
  });

  describe('resetPlay functionality', () => {
    it('should reset play state but preserve drive state', () => {
      // Setup and complete a play
      engine.setPlayConcept('flood');
      engine.setCoverage('cover-3');
      engine.snap();

      const outcome: PlayOutcome = {
        type: 'catch',
        yards: 7,
        openness: 60,
        catchProbability: 80,
        endPosition: { x: 26.67, y: 37 }
      };

      engine['endPlay'](outcome);
      engine.nextPlay();

      // Now on 2nd down, reset current play
      const driveState = {
        down: engine.getGameState().currentDown,
        yardsToGo: engine.getGameState().yardsToGo,
        los: engine.getGameState().lineOfScrimmage
      };

      // Start and reset a play
      engine.snap();

      // Advance time
      for (let i = 0; i < 10; i++) {
        engine.tick(0.016);
      }

      engine.resetPlay();

      const newState = engine.getGameState();

      // Play state should be reset
      expect(newState.phase).toBe('pre-snap');
      expect(newState.timeElapsed).toBe(0);
      expect(newState.outcome).toBeUndefined();

      // Drive state should be preserved
      expect(newState.currentDown).toBe(driveState.down);
      expect(newState.yardsToGo).toBe(driveState.yardsToGo);
      expect(newState.lineOfScrimmage).toBe(driveState.los);
    });

  });

  describe('Drive progression', () => {
    it('should handle turnover on downs', () => {
      // Set up 4th down
      engine['gameState'].currentDown = 4;
      engine['gameState'].yardsToGo = 5;

      engine.setPlayConcept('slant-flat');
      engine.setCoverage('cover-2');
      engine.snap();

      // Incomplete pass on 4th down
      const outcome: PlayOutcome = {
        type: 'incomplete',
        yards: 0,
        openness: 30,
        catchProbability: 40,
        endPosition: { x: 26.67, y: 35 }
      };

      engine['endPlay'](outcome);
      engine.nextPlay();

      const newState = engine.getGameState();

      // Should reset to 1st and 10 at same spot (turnover)
      expect(newState.currentDown).toBe(1);
      expect(newState.yardsToGo).toBe(10);
      expect(newState.lineOfScrimmage).toBe(30); // Same spot
    });

    it('should track consecutive plays correctly', () => {
      const plays = [
        { yards: 3, expectedDown: 2, expectedToGo: 7 },
        { yards: 4, expectedDown: 3, expectedToGo: 3 },
        { yards: 2, expectedDown: 4, expectedToGo: 1 },
        { yards: 5, expectedDown: 1, expectedToGo: 10 } // First down
      ];

      plays.forEach((play, index) => {
        engine.setPlayConcept('slant-flat');
        engine.setCoverage('cover-1');
        engine.snap();

        const outcome: PlayOutcome = {
          type: 'catch',
          yards: play.yards,
          openness: 50,
          catchProbability: 70,
          endPosition: { x: 26.67, y: 30 + play.yards }
        };

        engine['endPlay'](outcome);
        engine.nextPlay();

        const state = engine.getGameState();

        expect(state.currentDown).toBe(play.expectedDown);
        expect(state.yardsToGo).toBe(play.expectedToGo);
      });
    });
  });
});