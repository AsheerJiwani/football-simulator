'use client';

import {
  useSetConcept,
  useSetCoverage,
  useSetSackTime,
  useSetGameMode,
  useSetShowDefense,
  useSetShowRoutes,
  useSnap,
  useThrowTo,
  useReset,
  useSelectedConcept,
  useSelectedCoverage,
  useSackTime,
  useGameMode,
  useIsPlaying,
  useCanSnap,
  useCanThrow,
  useEligibleReceivers,
  usePlayOutcomeText,
  useIsShowingDefense,
  useIsShowingRoutes
} from '@/store/gameStore';
import { DataLoader } from '@/lib/dataLoader';
import MotionControls from './MotionControls';
import AudibleControls from './AudibleControls';
import PassProtectionControls from './PassProtectionControls';
import PersonnelSelector from './PersonnelSelector';

export default function ControlsPanel() {
  const setConcept = useSetConcept();
  const setCoverage = useSetCoverage();
  const setSackTime = useSetSackTime();
  const setGameMode = useSetGameMode();
  const setShowDefense = useSetShowDefense();
  const setShowRoutes = useSetShowRoutes();
  const snap = useSnap();
  const throwTo = useThrowTo();
  const reset = useReset();

  const selectedConcept = useSelectedConcept();
  const selectedCoverage = useSelectedCoverage();
  const sackTime = useSackTime();
  const gameMode = useGameMode();
  const isPlaying = useIsPlaying();
  const isShowingDefense = useIsShowingDefense();
  const isShowingRoutes = useIsShowingRoutes();

  const canSnap = useCanSnap();
  const canThrow = useCanThrow();
  const eligibleReceivers = useEligibleReceivers();
  const playOutcome = usePlayOutcomeText();

  // Get available options
  const concepts = DataLoader.getConceptNames();
  const coverages = DataLoader.getCoverageNames();

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Football Simulator Controls</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-300">Mode:</span>
          <select
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as 'free-play' | 'challenge')}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm"
            disabled={isPlaying}
          >
            <option value="free-play">Free Play</option>
            <option value="challenge">Challenge</option>
          </select>
        </div>
      </div>

      {/* Play Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 text-blue-300">Offensive Play</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Concept
              </label>
              <select
                value={selectedConcept}
                onChange={(e) => setConcept(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                disabled={isPlaying}
              >
                {concepts.map(concept => (
                  <option key={concept} value={concept}>
                    {DataLoader.getConcept(concept)?.name || concept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
                {DataLoader.getConcept(selectedConcept)?.description || 'No description available'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3 text-red-300">Defensive Coverage</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Coverage
              </label>
              <select
                value={selectedCoverage}
                onChange={(e) => setCoverage(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2"
                disabled={isPlaying}
              >
                {coverages.map(coverage => (
                  <option key={coverage} value={coverage}>
                    {DataLoader.getCoverage(coverage)?.name || coverage}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <p className="text-sm text-gray-400 bg-gray-700 p-2 rounded">
                {DataLoader.getCoverage(selectedCoverage)?.description || 'Single high safety with man coverage'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Game Settings */}
      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-lg font-semibold mb-3">Game Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Sack Time: {sackTime.toFixed(1)}s
            </label>
            <input
              type="range"
              min={gameMode === 'challenge' ? '2.7' : '2.0'}
              max="10.0"
              step="0.1"
              value={sackTime}
              onChange={(e) => setSackTime(parseFloat(e.target.value))}
              className="w-full"
              disabled={isPlaying || gameMode === 'challenge'}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>2.0s</span>
              <span>10.0s</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={reset}
              className="bg-gray-600 hover:bg-gray-500 px-4 py-2 rounded-md transition-colors"
              disabled={isPlaying}
            >
              Reset Play
            </button>
          </div>
        </div>

        {/* Visual Toggles */}
        <div className="flex space-x-4 mt-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isShowingDefense}
              onChange={(e) => setShowDefense(e.target.checked)}
              disabled={gameMode === 'challenge'}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className={gameMode === 'challenge' ? 'text-gray-500' : 'text-gray-300'}>
              Show Defense
            </span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isShowingRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-300">Show Routes</span>
          </label>
        </div>
      </div>

      {/* Pre-snap Adjustments */}
      {!isPlaying && (
        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-lg font-semibold mb-3">Pre-Snap Adjustments</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <PersonnelSelector />
            <MotionControls />
            <AudibleControls />
            <PassProtectionControls />
          </div>
        </div>
      )}

      {/* Game Controls */}
      <div className="border-t border-gray-600 pt-4">
        <h3 className="text-lg font-semibold mb-3">Play Controls</h3>

        {/* Pre-snap controls */}
        {!isPlaying && (
          <div className="space-y-3">
            <button
              onClick={snap}
              disabled={!canSnap}
              className={`w-full py-3 px-6 rounded-lg font-semibold text-lg transition-colors ${
                canSnap
                  ? 'bg-green-600 hover:bg-green-500 text-white'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canSnap ? 'SNAP THE BALL!' : 'Select Play & Coverage'}
            </button>
          </div>
        )}

        {/* Post-snap controls */}
        {isPlaying && canThrow && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300 text-center">Choose a receiver to throw to:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {eligibleReceivers.map(receiverId => (
                <button
                  key={receiverId}
                  onClick={() => throwTo(receiverId)}
                  className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-md font-semibold transition-colors"
                >
                  Throw to {receiverId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Play in progress indicator */}
        {isPlaying && !canThrow && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span className="text-lg">Ball in the air...</span>
            </div>
          </div>
        )}
      </div>

      {/* Play Outcome */}
      {playOutcome && (
        <div className="border-t border-gray-600 pt-4">
          <h3 className="text-lg font-semibold mb-3">Play Result</h3>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-xl font-bold text-center">{playOutcome}</p>
            <button
              onClick={reset}
              className="w-full mt-3 bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md transition-colors"
            >
              Run Another Play
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="border-t border-gray-600 pt-4">
        <details className="text-sm text-gray-400">
          <summary className="cursor-pointer font-medium text-gray-300 hover:text-white">
            How to Use the Simulator
          </summary>
          <div className="mt-2 space-y-2">
            <p>1. Select an offensive play concept (e.g., Slant-Flat)</p>
            <p>2. Choose a defensive coverage (e.g., Cover 1)</p>
            <p>3. Adjust sack time if desired (how long QB has to throw)</p>
            <p>4. Click &quot;SNAP THE BALL!&quot; to start the play</p>
            <p>5. Watch players run their routes, then throw to a receiver</p>
            <p>6. See the outcome based on separation and coverage!</p>
            <p className="text-yellow-400">
              💡 Challenge Mode: 2.7s sack time, limited audibles, no defense preview
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}