import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { useMemo } from 'react';
import type { GameState, PlayConcept, Coverage } from '@/engine/types';
import { FootballEngine } from '@/engine/Engine';
import { DataLoader, GameData } from '@/lib/dataLoader';

interface GameStore {
  // Engine instance
  engine: FootballEngine | null;

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
  stateVersion: number;

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
  resetToPlayStart: () => void;
  advanceToNextPlay: () => void;
  updateGameState: () => void;
  initializeEngine: () => void;
}

// Create a separate function to get initial defaults
const getInitialDefaults = () => {
  const defaults = {
    concept: 'slant-flat',
    coverage: 'cover-1',
    personnel: '11',
    sackTime: 5.0,
    gameMode: 'free-play' as const
  };

  // Try to get defaults from GameData if available
  try {
    if (typeof window !== 'undefined') {
      const gameDefaults = GameData.getDefaults();
      return gameDefaults;
    }
  } catch (error) {
    // Fallback to hardcoded defaults
  }

  return defaults;
};

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => {
    const defaults = getInitialDefaults();

    return {
        // Initial state - engine starts as null and is initialized client-side
        engine: null,
        selectedConcept: defaults.concept,
        selectedCoverage: defaults.coverage,
        selectedPersonnel: (defaults as any).personnel || '11',
        sackTime: defaults.sackTime,
        gameMode: defaults.gameMode,
        isPlaying: false,
        gameState: {
          phase: 'pre-snap' as const,
          timeElapsed: 0,
          sackTime: 5.0,
          players: [],
          ball: { position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, state: 'held' as const, timeInAir: 0, speed: 16 },
          playConcept: undefined,
          coverage: undefined,
          currentCoverage: undefined,
          outcome: undefined,
          isShowingDefense: false,
          isShowingRoutes: false,
          audiblesUsed: 0,
          maxAudibles: 2,
          gameMode: 'free-play' as const,
          motionPlayer: undefined,
          isMotionActive: false,
          motion: undefined,
          personnel: '11',
          passProtection: { rbBlocking: false, teBlocking: false, fbBlocking: false },
          lineOfScrimmage: 30,
          currentDown: 1,
          yardsToGo: 10,
          driveStartPosition: 30,
          ballOn: 30,
          isFirstDown: true,
          hashPosition: 'middle' as const
        },
        customPositions: new Map(),
        stateVersion: 0,

      // Actions
      setConcept: (conceptName: string) => {
        const concept = DataLoader.getConcept(conceptName);
        if (!concept) {
          console.warn(`Concept ${conceptName} not found`);
          return;
        }

        const { engine } = get();
        if (!engine) {
          console.warn('Engine not initialized, skipping action');
          return;
        }

        engine.setPlayConcept(concept);
        const newState = engine.getGameState();

        set({
          selectedConcept: conceptName,
          gameState: newState,
          stateVersion: get().stateVersion + 1,
          // Force re-render of routes and defense by updating timestamps
          lastRouteUpdate: Date.now(),
          lastDefenseUpdate: Date.now()
        });
      },

      setCoverage: (coverageName: string) => {
        const coverage = DataLoader.getCoverage(coverageName);
        if (!coverage) {
          console.warn(`Coverage ${coverageName} not found`);
          return;
        }

        const { engine } = get();
        if (!engine) {
          console.warn('Engine not initialized, skipping action');
          return;
        }

        engine.setCoverage(coverage);
        const newState = engine.getGameState();

        set({
          selectedCoverage: coverageName,
          gameState: newState,
          stateVersion: get().stateVersion + 1,
          // Force re-render of defense by updating timestamp
          lastDefenseUpdate: Date.now()
        });
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

        // Force immediate validation of defensive setup after personnel change
        engine.validateSetup();

        set((state) => ({
          ...state,
          selectedPersonnel: personnel,
          gameState: engine.getGameState(),
          // Personnel changes affect both offense and defense - force complete re-render
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
          // Enhanced: Ensure defensive adjustments are applied immediately after motion
          engine.validateSetup();

          set((state) => ({
            ...state,
            gameState: engine.getGameState(),
            // Enhanced: Motion affects all aspects of the game - force complete re-render
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
          // Enhanced: Some route changes may require defensive adjustments
          // Especially in pattern-matching coverages like Cover 4
          const gameState = engine.getGameState();
          const coverage = gameState.coverage;
          if (coverage && (coverage.type === 'cover-4' || coverage.type === 'quarters')) {
            // Pattern-matching coverages may need to adjust to route changes
            engine.validateSetup();
          }

          set((state) => ({
            ...state,
            gameState: engine.getGameState(),
            // Enhanced: Route changes can affect defensive reads
            lastRouteUpdate: Date.now(),
            lastDefenseUpdate: Date.now()
          }));
        }
      },

      setCustomPosition: (playerId: string, position: { x: number; y: number }) => {
        set((state) => {
          const newPositions = new Map(state.customPositions);
          newPositions.set(playerId, position);

          // Enhanced: Update engine with custom position and trigger defensive analysis
          const { engine } = get();
          if (engine) {
            const players = engine.getGameState().players;
            const player = players.find(p => p.id === playerId);
            if (player) {
              player.position = position;
              // This will trigger formation analysis and defensive realignment
              const success = engine.updatePlayerPosition(playerId, position);

              if (success && player.team === 'offense') {
                // Force immediate defensive re-evaluation for offensive position changes
                engine.validateSetup();
              }
            }
          }

          return {
            ...state,
            customPositions: newPositions,
            gameState: engine?.getGameState() || state.gameState,
            // Enhanced: Force both route and defense updates for position changes
            lastRouteUpdate: Date.now(),
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
          // Store the interval ID to ensure proper cleanup
          let pollInterval: NodeJS.Timeout | null = null;

          const startPolling = () => {
            if (pollInterval) {
              clearInterval(pollInterval);
            }

            pollInterval = setInterval(() => {
              const currentState = engine.getGameState();
              const currentStore = get();

              // Skip update if engine is no longer available
              if (!currentStore.engine) {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
                return;
              }

              // Only update if specific state properties have actually changed
              const hasPhaseChanged = currentStore.gameState.phase !== currentState.phase;
              const hasTimeChanged = Math.abs((currentStore.gameState.timeElapsed || 0) - (currentState.timeElapsed || 0)) > 0.01;
              const hasBallStateChanged = currentStore.gameState.ball.state !== currentState.ball.state;
              const hasPositionChanged = JSON.stringify(currentStore.gameState.players.map(p => p.position)) !== JSON.stringify(currentState.players.map(p => p.position));

              if (hasPhaseChanged || hasTimeChanged || hasBallStateChanged || hasPositionChanged) {
                set((state) => ({
                  ...state,
                  gameState: currentState,
                  isPlaying: currentState.phase !== 'play-over',
                  stateVersion: state.stateVersion + 1
                }));
              }

              // Stop polling when play is over
              if (currentState.phase === 'play-over') {
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = null;
                }
              }
            }, 33); // ~30fps (reduced from 60fps to prevent excessive updates)
          };

          startPolling();
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

      resetToPlayStart: () => {
        const { engine } = get();
        if (!engine) return;

        engine.resetToPlayStart();

        set((state) => ({
          ...state,
          isPlaying: false,
          gameState: engine.getGameState(),
          stateVersion: state.stateVersion + 1
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

      initializeEngine: () => {
        const state = get();

        // Multiple safeguards to prevent double initialization
        if (state.engine) {
          return; // Already initialized, no need to log
        }

        if (typeof window === 'undefined') {
          return; // Server-side, skip silently
        }

        // Use a more robust locking mechanism
        const globalKey = '__footballEngineInit';
        const globalState = (globalThis as any)[globalKey] || {};

        if (globalState.initialized || globalState.initializing) {
          return; // Already initialized or in progress
        }

        try {
          (globalThis as any)[globalKey] = { ...globalState, initializing: true };

          const newEngine = new FootballEngine();
          const { selectedConcept, selectedCoverage, sackTime } = state;

          // Load default data
          const concept = DataLoader.getConcept(selectedConcept);
          const coverage = DataLoader.getCoverage(selectedCoverage);

          // Initialize engine with current selections
          if (concept) {
            newEngine.setPlayConcept(concept);
          }
          if (coverage) {
            newEngine.setCoverage(coverage);
          }
          newEngine.setSackTime(sackTime);

          // Validate that both offense and defense are properly set up
          newEngine.validateSetup();

          set((currentState) => {
            // Double-check that engine is still null before setting
            if (currentState.engine) {
              return currentState;
            }

            return {
              ...currentState,
              engine: newEngine,
              gameState: newEngine.getGameState(),
              lastRouteUpdate: Date.now(),
              lastDefenseUpdate: Date.now(),
              stateVersion: currentState.stateVersion + 1
            };
          });

          (globalThis as any)[globalKey] = { initialized: true, initializing: false };
        } catch (error) {
          console.error('Failed to initialize engine on client:', error);
          (globalThis as any)[globalKey] = { initialized: false, initializing: false };
        }
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

// Enhanced selector that includes stateVersion for forcing re-renders
// Use shallow equality check to prevent unnecessary re-renders
export const usePlayersWithUpdate = () => {
  const players = useGameStore(state => state.gameState.players);
  const stateVersion = useGameStore(state => state.stateVersion);
  return useMemo(() => ({ players, lastUpdate: stateVersion }), [players, stateVersion]);
};

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
export const useResetToPlayStart = () => useGameStore(state => state.resetToPlayStart);
export const useInitializeEngine = () => useGameStore(state => state.initializeEngine);

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

