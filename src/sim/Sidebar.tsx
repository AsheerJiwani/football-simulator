'use client';

import {
  useGamePhase,
  useGameState,
  useSnap,
  useThrowTo,
  useReset,
  useAdvanceToNextPlay,
  useGameStore
} from '@/store/gameStore';
import { useState } from 'react';
import AudibleControls from './AudibleControls';
import MotionControls from './MotionControls';
import PassProtectionControls from './PassProtectionControls';
import PersonnelSelector from './PersonnelSelector';
import { DownAndDistance } from './DownAndDistance';

export default function Sidebar() {
  const snap = useSnap();
  const throwTo = useThrowTo();
  const reset = useReset();
  const advanceToNextPlay = useAdvanceToNextPlay();
  const clearCustomPositions = useGameStore(state => state.clearCustomPositions);
  const gamePhase = useGamePhase();
  const gameState = useGameState();
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');

  const eligibleReceivers = gameState.players.filter(
    p => p.team === 'offense' && p.isEligible && !p.isBlocking
  );

  const handleSnap = () => {
    clearCustomPositions();
    snap();
  };

  const handleThrow = () => {
    if (selectedReceiver) {
      throwTo(selectedReceiver);
      setSelectedReceiver('');
    }
  };

  const canThrow = gamePhase === 'post-snap' && selectedReceiver;

  return (
    <div className="bg-gray-900 border-l-2 border-gray-700 p-4 h-full flex flex-col gap-4">
      {/* Down and Distance Display */}
      <DownAndDistance />

      {/* Main Action Buttons */}
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white mb-3">Game Actions</h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleSnap}
            disabled={gamePhase !== 'pre-snap'}
            className={`py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
              gamePhase === 'pre-snap'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg'
                : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            {gamePhase === 'pre-snap' ? '🏈 SNAP' : 'Snapped'}
          </button>

          <button
            onClick={handleThrow}
            disabled={!canThrow}
            className={`py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
              canThrow
                ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg animate-pulse'
                : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            {canThrow ? '🎯 THROW' : gamePhase === 'post-snap' ? 'Select Target' : 'Throw'}
          </button>

          <button
            onClick={reset}
            className="py-3 px-4 rounded-lg font-bold text-white bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 transition-all transform hover:scale-105 shadow-lg"
          >
            🔄 RESET
          </button>

          <button
            onClick={advanceToNextPlay}
            disabled={gamePhase !== 'play-over'}
            className={`py-3 px-4 rounded-lg font-bold text-white transition-all transform hover:scale-105 ${
              gamePhase === 'play-over'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg'
                : 'bg-gray-700 opacity-50 cursor-not-allowed'
            }`}
          >
            ⏭️ NEXT PLAY
          </button>
        </div>
      </div>

      {/* Receiver Selection (only show during play) */}
      {gamePhase === 'post-snap' && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-3">Select Receiver</h3>
          <div className="grid grid-cols-2 gap-2">
            {eligibleReceivers.map(receiver => (
              <button
                key={receiver.id}
                onClick={() => setSelectedReceiver(receiver.id)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  selectedReceiver === receiver.id
                    ? 'bg-green-600 text-white ring-2 ring-green-400'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {receiver.playerType} ({receiver.id})
                {receiver.isStar && ' ⭐'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pre-Snap Controls */}
      {gamePhase === 'pre-snap' && (
        <>
          <PersonnelSelector />
          <AudibleControls />
          <MotionControls />
          <PassProtectionControls />
        </>
      )}

      {/* Play Result */}
      {gameState.outcome && gamePhase === 'play-over' && (
        <div className={`bg-gray-800 rounded-lg p-4 border-2 ${
          gameState.outcome.type === 'catch' ? 'border-green-500' :
          gameState.outcome.type === 'incomplete' ? 'border-red-500' :
          gameState.outcome.type === 'interception' ? 'border-purple-500' :
          gameState.outcome.type === 'sack' ? 'border-orange-500' :
          'border-gray-500'
        }`}>
          <h3 className="text-lg font-bold text-white mb-2">Play Result</h3>
          <div className="text-white">
            <div className="text-2xl font-bold mb-1">
              {gameState.outcome.type === 'catch' && '✅ Complete!'}
              {gameState.outcome.type === 'incomplete' && '❌ Incomplete'}
              {gameState.outcome.type === 'interception' && '🚫 Intercepted!'}
              {gameState.outcome.type === 'sack' && '💥 Sacked!'}
              {gameState.outcome.type === 'timeout' && '⏱️ Timeout'}
            </div>
            {gameState.outcome.yards !== undefined && (
              <div className="text-sm text-gray-300">
                {gameState.outcome.yards > 0
                  ? `+${gameState.outcome.yards} yards`
                  : `${gameState.outcome.yards} yards`}
              </div>
            )}
            {gameState.outcome.openness !== undefined && (
              <div className="text-sm text-gray-400 mt-1">
                Openness: {gameState.outcome.openness.toFixed(0)}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Stats */}
      <div className="bg-gray-800 rounded-lg p-4 mt-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">Session Stats</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-300">
            <span className="text-gray-500">Phase:</span> {gamePhase}
          </div>
          <div className="text-gray-300">
            <span className="text-gray-500">Mode:</span> {gameState.gameMode}
          </div>
          <div className="text-gray-300">
            <span className="text-gray-500">Time:</span> {gameState.timeElapsed?.toFixed(1)}s
          </div>
          <div className="text-gray-300">
            <span className="text-gray-500">Hash:</span> {gameState.hashPosition}
          </div>
        </div>
      </div>
    </div>
  );
}