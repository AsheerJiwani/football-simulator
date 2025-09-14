import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { GameState, PlayConcept, Coverage } from '@/engine/types';
import { FootballEngine } from '@/engine/Engine';
import { DataLoader, GameData } from '@/lib/dataLoader';

interface GameStore {
  // Engine instance
  engine: FootballEngine;

  // UI State
  selectedConcept: string;
  selectedCoverage: string;
  selectedPersonnel: string;
  sackTime: number;
  gameMode: 'free-play' | 'challenge';
  isPlaying: boolean;

  // Game State (derived from engine)
  gameState: GameState;

  // Custom positions for drag-and-drop
  customPositions: Map<string, { x: number; y: number }>;

  // Update tracking for UI re-rendering
  lastRouteUpdate?: number;
  lastDefenseUpdate?: number;

  // Actions
  setConcept: (conceptName: string) => void;
  setCoverage: (coverageName: string) => void;
  setSackTime: (seconds: number) => void;
  setGameMode: (mode: 'free-play' | 'challenge') => void;
  setPersonnel: (personnel: string) => void;
  setShowDefense: (show: boolean) => void;
  setShowRoutes: (show: boolean) => void;
  setHashPosition: (hash: 'left' | 'middle' | 'right') => void;
  sendInMotion: (playerId: string, motionType?: string) => void;
  setPassProtection: (rbBlocking: boolean, teBlocking: boolean, fbBlocking: boolean) => void;
  setAudible: (playerId: string, routeType: string) => void;
  setCustomPosition: (playerId: string, position: { x: number; y: number }) => void;
  clearCustomPositions: () => void;
  snap: () => void;
  throwTo: (receiverId: string) => void;
  reset: () => void;
  advanceToNextPlay: () => void;
  updateGameState: () => void;
}

// Create a separate function to initialize the engine to avoid re-creation
// Only initialize client-side to avoid SSR issues
const createInitialEngine = () => {
  if (typeof window === 'undefined') {
    // Return minimal server-side state
    return {
      engine: null as unknown as FootballEngine,
      defaults: {
        concept: 'slant-flat',
        coverage: 'cover-1',
        personnel: '11',
        sackTime: 5.0,
        gameMode: 'free-play' as const
      }
    };
  }

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

  // Validate that both offense and defense are properly set up
  engine.validateSetup();

  return { engine, defaults };
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => {
    const { engine, defaults } = createInitialEngine();

    return {
        // Initial state
        engine,
        selectedConcept: defaults.concept,
        selectedCoverage: defaults.coverage,
        selectedPersonnel: (defaults as any).personnel || '11',
        sackTime: defaults.sackTime,
        gameMode: defaults.gameMode,
        isPlaying: false,
        gameState: engine?.getGameState() || {
          phase: 'pre-snap' as const,
          players: [],
          ball: { position: { x: 0, y: 0 }, state: 'held' as const },
          playConcept: null,
          coverage: null,
          outcome: null
        },
        customPositions: new Map(),

      // Actions
      setConcept: (conceptName: string) => {
        const concept = DataLoader.getConcept(conceptName);
        if (!concept) return;

        const { engine } = get();
        if (!engine) return;
        engine.setPlayConcept(concept);

        set((state) => ({
          ...state,
          selectedConcept: conceptName,
          gameState: engine.getGameState(),
          // Force re-render of routes and defense by updating timestamps
          lastRouteUpdate: Date.now(),
          lastDefenseUpdate: Date.now()
        }));
      },

      setCoverage: (coverageName: string) => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (!coverage) return;

        const { engine } = get();
        if (!engine) return;
        engine.setCoverage(coverage);

        set((state) => ({
          ...state,
          selectedCoverage: coverageName,
          gameState: engine.getGameState(),
          // Force re-render of defense by updating timestamp
          lastDefenseUpdate: Date.now()
        }));
      },

      setSackTime: (seconds: number) => {
        const { engine } = get();
        if (!engine) return;
        engine.setSackTime(seconds);

        set((state) => ({
          ...state,
          sackTime: seconds,
          gameState: engine.getGameState()
        }));
      },

      setGameMode: (mode: 'free-play' | 'challenge') => {
        const { engine } = get();
        if (!engine) return;
        engine.setGameMode(mode);

        set((state) => ({
          ...state,
          gameMode: mode,
          gameState: engine.getGameState()
        }));
      },

      setPersonnel: (personnel: string) => {
        const { engine } = get();
        if (!engine) return;
        engine.setPersonnel(personnel as any);

        set((state) => ({
          ...state,
          selectedPersonnel: personnel,
          gameState: engine.getGameState(),
          // Personnel changes affect both offense and defense
          lastRouteUpdate: Date.now(),
          lastDefenseUpdate: Date.now()
        }));
      },

      setShowDefense: (show: boolean) => {
        const { engine } = get();
        if (!engine) return;
        engine.setShowDefense(show);

        set((state) => ({
          ...state,
          gameState: engine.getGameState()
        }));
      },

      setShowRoutes: (show: boolean) => {
        const { engine } = get();
        if (!engine) return;
        engine.setShowRoutes(show);

        set((state) => ({
          ...state,
          gameState: engine.getGameState(),
          // Force route recalculation when showing routes
          lastRouteUpdate: show ? Date.now() : state.lastRouteUpdate
        }));
      },

      setHashPosition: (hash: 'left' | 'middle' | 'right') => {
        const { engine } = get();
        if (!engine) return;
        engine.setHashPosition(hash);

        set((state) => ({
          ...state,
          gameState: engine.getGameState()
        }));
      },

      sendInMotion: (playerId: string, motionType?: string) => {
        const { engine } = get();
        if (!engine) return;
        const success = engine.sendInMotion(playerId, motionType as any);

        if (success) {
          set((state) => ({
            ...state,
            gameState: engine.getGameState(),
            // Force re-render of routes and defense by updating timestamps
            lastRouteUpdate: Date.now(),
            lastDefenseUpdate: Date.now()
          }));
        }
      },

      setPassProtection: (rbBlocking: boolean, teBlocking: boolean, fbBlocking: boolean) => {
        const { engine } = get();
        if (!engine) return;
        engine.setPassProtection(rbBlocking, teBlocking, fbBlocking);

        set((state) => ({
          ...state,
          gameState: engine.getGameState()
        }));
      },

      setAudible: (playerId: string, routeType: string) => {
        const { engine } = get();
        if (!engine) return;
        const success = engine.audibleRoute(playerId, routeType as any);

        if (success) {
          set((state) => ({
            ...state,
            gameState: engine.getGameState(),
            // Force re-render of routes and potentially defense by updating timestamps
            lastRouteUpdate: Date.now(),
            // Defensive adjustments may be needed for route changes in some coverages
            lastDefenseUpdate: Date.now()
          }));
        }
      },

      setCustomPosition: (playerId: string, position: { x: number; y: number }) => {
        set((state) => {
          const newPositions = new Map(state.customPositions);
          newPositions.set(playerId, position);

          // Update engine with custom position
          const { engine } = get();
          if (engine) {
            const players = engine.getGameState().players;
            const player = players.find(p => p.id === playerId);
            if (player) {
              player.position = position;
              engine.updatePlayerPosition(playerId, position);
            }
          }

          return {
            ...state,
            customPositions: newPositions,
            gameState: engine?.getGameState() || state.gameState,
            // Force re-render when player positions change
            lastDefenseUpdate: Date.now()
          };
        });
      },

      clearCustomPositions: () => {
        set((state) => ({
          ...state,
          customPositions: new Map()
        }));
      },

      snap: () => {
        const { engine } = get();
        if (!engine) return;
        const success = engine.snap();

        if (success) {
          set((state) => ({
            ...state,
            isPlaying: true,
            gameState: engine.getGameState()
          }));

          // Use a more stable polling mechanism with setInterval
          const pollInterval = setInterval(() => {
            const currentState = engine.getGameState();

            set((state) => {
              // Only update if state has actually changed
              if (state.gameState.phase !== currentState.phase ||
                  state.gameState !== currentState) {
                return {
                  ...state,
                  gameState: currentState,
                  isPlaying: currentState.phase !== 'play-over'
                };
              }
              return state;
            });

            // Stop polling when play is over
            if (currentState.phase === 'play-over') {
              clearInterval(pollInterval);
            }
          }, 16); // ~60fps
        }
      },

      throwTo: (receiverId: string) => {
        const { engine } = get();
        if (!engine) return;
        const success = engine.throwTo(receiverId);

        if (success) {
          set((state) => ({ ...state, gameState: engine.getGameState() }));
        }
      },

      reset: () => {
        const { engine, selectedConcept, selectedCoverage, sackTime, gameMode } = get();
        if (!engine) return;

        engine.reset();
        engine.setGameMode(gameMode);
        engine.setSackTime(sackTime);

        // Reload concept and coverage
        const concept = DataLoader.getConcept(selectedConcept);
        const coverage = DataLoader.getCoverage(selectedCoverage);

        if (concept) engine.setPlayConcept(concept);
        if (coverage) engine.setCoverage(coverage);

        set((state) => ({
          ...state,
          isPlaying: false,
          gameState: engine.getGameState(),
          // Force route and defense refresh on reset
          lastRouteUpdate: Date.now(),
          lastDefenseUpdate: Date.now()
        }));
      },

      advanceToNextPlay: () => {
        const { engine, selectedConcept, selectedCoverage } = get();
        if (!engine) return;

        engine.advanceToNextPlay();

        // Reload concept and coverage with new field position
        const concept = DataLoader.getConcept(selectedConcept);
        const coverage = DataLoader.getCoverage(selectedCoverage);

        if (concept) engine.setPlayConcept(concept);
        if (coverage) engine.setCoverage(coverage);

        set((state) => ({
          ...state,
          isPlaying: false,
          gameState: engine.getGameState(),
          // Force route and defense refresh on new play
          lastRouteUpdate: Date.now(),
          lastDefenseUpdate: Date.now()
        }));
      },

      updateGameState: () => {
        const { engine } = get();
        if (!engine) return;
        set((state) => ({ ...state, gameState: engine.getGameState() }));
      },
    };
  })
);

// Selector hooks for optimized re-renders
export const useGameState = () => useGameStore(state => state.gameState);
export const useGamePhase = () => useGameStore(state => state.gameState.phase);
export const usePlayers = () => useGameStore(state => state.gameState.players);
export const useBall = () => useGameStore(state => state.gameState.ball);
export const useIsShowingDefense = () => useGameStore(state => state.gameState.isShowingDefense);
export const useIsShowingRoutes = () => useGameStore(state => state.gameState.isShowingRoutes);

// Computed selectors
export const usePlayOutcome = () => useGameStore(state => state.gameState.outcome);
export const usePlayOutcomeText = () => {
  const outcome = usePlayOutcome();
  if (!outcome) return null;

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
};

export const useCanSnap = () => useGameStore(state =>
  state.gameState.phase === 'pre-snap' &&
  !!state.gameState.playConcept &&
  !!state.gameState.coverage
);

export const useCanThrow = () => useGameStore(state =>
  state.gameState.phase === 'post-snap' &&
  state.gameState.ball.state === 'held'
);

export const useEligibleReceivers = () => {
  const players = useGameStore(state => state.gameState.players);
  return players
    .filter(player => player.team === 'offense' && player.isEligible)
    .map(player => player.id);
};

// Action hooks - individual selectors to avoid re-creating objects
export const useSetConcept = () => useGameStore(state => state.setConcept);
export const useSetCoverage = () => useGameStore(state => state.setCoverage);
export const useSetSackTime = () => useGameStore(state => state.setSackTime);
export const useSetGameMode = () => useGameStore(state => state.setGameMode);
export const useSetPersonnel = () => useGameStore(state => state.setPersonnel);
export const useSetShowDefense = () => useGameStore(state => state.setShowDefense);
export const useSetShowRoutes = () => useGameStore(state => state.setShowRoutes);
export const useSendInMotion = () => useGameStore(state => state.sendInMotion);
export const useSetPassProtection = () => useGameStore(state => state.setPassProtection);
export const useSetAudible = () => useGameStore(state => state.setAudible);
export const useSnap = () => useGameStore(state => state.snap);
export const useThrowTo = () => useGameStore(state => state.throwTo);
export const useReset = () => useGameStore(state => state.reset);

// UI state hooks - individual selectors to avoid re-creating objects
export const useSelectedConcept = () => useGameStore(state => state.selectedConcept);
export const useSelectedCoverage = () => useGameStore(state => state.selectedCoverage);
export const useSelectedPersonnel = () => useGameStore(state => state.selectedPersonnel);
export const useSackTime = () => useGameStore(state => state.sackTime);
export const useGameMode = () => useGameStore(state => state.gameMode);
export const useIsPlaying = () => useGameStore(state => state.isPlaying);

// Game state selectors
export const useMotionPlayer = () => useGameStore(state => state.gameState.motionPlayer);
export const useIsMotionActive = () => useGameStore(state => state.gameState.isMotionActive);
export const usePassProtection = () => useGameStore(state => state.gameState.passProtection);
export const useAudiblesUsed = () => useGameStore(state => state.gameState.audiblesUsed);
export const useMaxAudibles = () => useGameStore(state => state.gameState.maxAudibles);

// Drive state selectors
export const useLineOfScrimmage = () => useGameStore(state => state.gameState.lineOfScrimmage);
export const useCurrentDown = () => useGameStore(state => state.gameState.currentDown);
export const useYardsToGo = () => useGameStore(state => state.gameState.yardsToGo);
export const useBallOn = () => useGameStore(state => state.gameState.ballOn);
export const useIsFirstDown = () => useGameStore(state => state.gameState.isFirstDown);
export const useAdvanceToNextPlay = () => useGameStore(state => state.advanceToNextPlay);
export const useHashPosition = () => useGameStore(state => state.gameState.hashPosition);
export const useSetHashPosition = () => useGameStore(state => state.setHashPosition);

