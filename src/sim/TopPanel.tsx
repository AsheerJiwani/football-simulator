'use client';

import { useGameStore } from '@/store/gameStore';
import { DataLoader } from '@/lib/dataLoader';

export default function TopPanel() {
  const {
    selectedConcept,
    selectedCoverage,
    sackTime,
    gameMode,
    gameState,
    setConcept,
    setCoverage,
    setSackTime,
    setGameMode,
    setShowDefense,
    setShowRoutes,
    setHashPosition
  } = useGameStore();

  const concepts = Object.values(DataLoader.getConcepts());
  const coverages = Object.values(DataLoader.getCoverages());

  return (
    <div className="bg-gray-900 border-b-2 border-gray-700 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Play Concept Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Play Concept</label>
            <select
              value={selectedConcept}
              onChange={(e) => setConcept(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors"
            >
              {concepts.map(concept => (
                <option key={concept.name} value={concept.name}>
                  {concept.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Coverage Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Defense Coverage</label>
            <select
              value={selectedCoverage}
              onChange={(e) => setCoverage(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500 focus:outline-none transition-colors"
            >
              {coverages.map(coverage => (
                <option key={coverage.name} value={coverage.name}>
                  {coverage.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Sack Time Slider */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Sack Time: {sackTime.toFixed(1)}s
            </label>
            <input
              type="range"
              min="2.0"
              max="10.0"
              step="0.1"
              value={sackTime}
              onChange={(e) => setSackTime(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((sackTime - 2) / 8) * 100}%, #4b5563 ${((sackTime - 2) / 8) * 100}%, #4b5563 100%)`
              }}
            />
          </div>

          {/* Hash Position */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Hash Position</label>
            <div className="flex gap-1">
              <button
                onClick={() => setHashPosition('left')}
                className={`flex-1 px-2 py-2 rounded-l-lg text-xs font-medium transition-colors ${
                  gameState.hashPosition === 'left'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                L
              </button>
              <button
                onClick={() => setHashPosition('middle')}
                className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${
                  gameState.hashPosition === 'middle'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                M
              </button>
              <button
                onClick={() => setHashPosition('right')}
                className={`flex-1 px-2 py-2 rounded-r-lg text-xs font-medium transition-colors ${
                  gameState.hashPosition === 'right'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                R
              </button>
            </div>
          </div>

          {/* Toggle Switches */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Display Options</label>
            <div className="flex flex-col gap-1">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameState.isShowingRoutes}
                  onChange={(e) => setShowRoutes(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-colors ${
                  gameState.isShowingRoutes ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    gameState.isShowingRoutes ? 'translate-x-5' : ''
                  }`} />
                </div>
                <span className="ml-2 text-xs text-gray-300">Routes</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={gameState.isShowingDefense}
                  onChange={(e) => setShowDefense(e.target.checked)}
                  disabled={gameMode === 'challenge'}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-colors ${
                  gameMode === 'challenge' ? 'bg-gray-700 opacity-50' :
                  gameState.isShowingDefense ? 'bg-green-600' : 'bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    gameState.isShowingDefense ? 'translate-x-5' : ''
                  }`} />
                </div>
                <span className="ml-2 text-xs text-gray-300">Defense</span>
              </label>
            </div>
          </div>

          {/* Game Mode */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Game Mode</label>
            <div className="flex gap-1">
              <button
                onClick={() => setGameMode('free-play')}
                className={`flex-1 px-2 py-2 rounded-l-lg text-xs font-medium transition-colors ${
                  gameMode === 'free-play'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Free
              </button>
              <button
                onClick={() => setGameMode('challenge')}
                className={`flex-1 px-2 py-2 rounded-r-lg text-xs font-medium transition-colors ${
                  gameMode === 'challenge'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Challenge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}