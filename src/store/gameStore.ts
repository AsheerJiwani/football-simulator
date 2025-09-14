import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameState, PlayConcept, Coverage } from '@/engine/types';
import { FootballEngine } from '@/engine/Engine';
import { DataLoader } from '@/lib/dataLoader';

interface GameStore {
  // Engine instance
  engine: FootballEngine;

  // UI State
  selectedConcept: string;
  selectedCoverage: string;
  sackTime: number;
  gameMode: 'free-play' | 'challenge';
  isPlaying: boolean;

  // Game State (derived from engine)
  gameState: GameState;

  // Actions
  setConcept: (conceptName: string) => void;
  setCoverage: (coverageName: string) => void;
  setSackTime: (seconds: number) => void;
  setGameMode: (mode: 'free-play' | 'challenge') => void;
  snap: () => void;
  throwTo: (receiverId: string) => void;
  reset: () => void;
  updateGameState: () => void;
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => {
    const engine = new FootballEngine();

    // Load default data
    const defaults = GameData.getDefaults();
    const defaultConcept = DataLoader.getConcept(defaults.concept);
    const defaultCoverage = DataLoader.getCoverage(defaults.coverage);

    // Initialize engine with defaults
    if (defaultConcept) {
      engine.setPlayConcept(defaultConcept);
    }
    if (defaultCoverage) {
      engine.setCoverage(defaultCoverage);
    }
    engine.setSackTime(defaults.sackTime);

    return {
      // Initial state
      engine,
      selectedConcept: defaults.concept,
      selectedCoverage: defaults.coverage,
      sackTime: defaults.sackTime,
      gameMode: defaults.gameMode,
      isPlaying: false,
      gameState: engine.getGameState(),

      // Actions
      setConcept: (conceptName: string) => {
        const concept = DataLoader.getConcept(conceptName);
        if (!concept) return;

        const { engine } = get();
        engine.setPlayConcept(concept);

        set({
          selectedConcept: conceptName,
          gameState: engine.getGameState()
        });
      },

      setCoverage: (coverageName: string) => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (!coverage) return;

        const { engine } = get();
        engine.setCoverage(coverage);

        set({
          selectedCoverage: coverageName,
          gameState: engine.getGameState()
        });
      },

      setSackTime: (seconds: number) => {
        const { engine } = get();
        engine.setSackTime(seconds);

        set({
          sackTime: seconds,
          gameState: engine.getGameState()
        });
      },

      setGameMode: (mode: 'free-play' | 'challenge') => {
        const { engine } = get();
        engine.setGameMode(mode);

        set({
          gameMode: mode,
          gameState: engine.getGameState()
        });
      },

      snap: () => {
        const { engine } = get();
        const success = engine.snap();

        if (success) {
          set({
            isPlaying: true,
            gameState: engine.getGameState()
          });

          // Start polling for game state updates during play
          const pollInterval = setInterval(() => {
            const currentState = engine.getGameState();
            const { isPlaying } = get();

            set({ gameState: currentState });

            if (currentState.phase === 'play-over') {
              set({ isPlaying: false });
              clearInterval(pollInterval);
            } else if (!isPlaying) {
              clearInterval(pollInterval);
            }
          }, 33);
        }
      },

      throwTo: (receiverId: string) => {
        const { engine } = get();
        const success = engine.throwTo(receiverId);

        if (success) {
          set({ gameState: engine.getGameState() });
        }
      },

      reset: () => {
        const { engine, selectedConcept, selectedCoverage, sackTime, gameMode } = get();

        engine.reset();
        engine.setGameMode(gameMode);
        engine.setSackTime(sackTime);

        // Reload concept and coverage
        const concept = DataLoader.getConcept(selectedConcept);
        const coverage = DataLoader.getCoverage(selectedCoverage);

        if (concept) engine.setPlayConcept(concept);
        if (coverage) engine.setCoverage(coverage);

        set({
          isPlaying: false,
          gameState: engine.getGameState()
        });
      },

      updateGameState: () => {
        const { engine } = get();
        set({ gameState: engine.getGameState() });
      },
    };
  })
);

// Selector hooks for optimized re-renders
export const useGameState = () => useGameStore(state => state.gameState);
export const useGamePhase = () => useGameStore(state => state.gameState.phase);
export const usePlayers = () => useGameStore(state => state.gameState.players);
export const useBall = () => useGameStore(state => state.gameState.ball);

// Computed selectors
export const usePlayOutcome = () => useGameStore(state => {
  if (!state.gameState.outcome) return null;
  const outcome = state.gameState.outcome;
  switch (outcome.type) {
    case 'catch':
      return `CATCH: ${outcome.yards} yards (${outcome.openness.toFixed(1)}% open)`;
    case 'incomplete':
      return `INCOMPLETE (${outcome.openness.toFixed(1)}% open)`;
    case 'interception':
      return `INTERCEPTION by ${outcome.defender}`;
    case 'sack':
      return 'SACKED';
    case 'timeout':
      return 'OUT OF TIME';
    default:
      return 'PLAY OVER';
  }
});

export const useCanSnap = () => useGameStore(state =>
  state.gameState.phase === 'pre-snap' &&
  !!state.gameState.playConcept &&
  !!state.gameState.coverage
);

export const useCanThrow = () => useGameStore(state =>
  state.gameState.phase === 'post-snap' &&
  state.gameState.ball.state === 'held'
);

export const useEligibleReceivers = () => useGameStore(state =>
  state.gameState.players
    .filter(player => player.team === 'offense' && player.isEligible)
    .map(player => player.id)
);

// Action hooks
export const useGameActions = () => useGameStore(state => ({
  setConcept: state.setConcept,
  setCoverage: state.setCoverage,
  setSackTime: state.setSackTime,
  setGameMode: state.setGameMode,
  snap: state.snap,
  throwTo: state.throwTo,
  reset: state.reset,
}));

// UI state hooks
export const useUIState = () => useGameStore(state => ({
  selectedConcept: state.selectedConcept,
  selectedCoverage: state.selectedCoverage,
  sackTime: state.sackTime,
  gameMode: state.gameMode,
  isPlaying: state.isPlaying,
}));

// Import GameData for the store
import { GameData } from '@/lib/dataLoader';