'use client';

import { useState } from 'react';
import {
  usePlayers,
  useGamePhase,
  useGameMode,
  useIsMotionActive,
  useMotionPlayer,
  useSendInMotion,
  useAudiblesUsed,
  useMaxAudibles,
  useSetAudible,
} from '@/store/gameStore';

export default function CompactControls() {
  const [showMotion, setShowMotion] = useState(false);
  const [showAudibles, setShowAudibles] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedMotionType, setSelectedMotionType] = useState<string>('fly');

  const players = usePlayers();
  const gamePhase = useGamePhase();
  const gameMode = useGameMode();
  const isMotionActive = useIsMotionActive();
  const motionPlayer = useMotionPlayer();
  const sendInMotion = useSendInMotion();
  const audiblesUsed = useAudiblesUsed();
  const maxAudibles = useMaxAudibles();
  const setAudible = useSetAudible();

  const isPreSnap = gamePhase === 'pre-snap';
  const canAudible = isPreSnap && (gameMode === 'free-play' || audiblesUsed < maxAudibles);

  const eligiblePlayers = players.filter(p =>
    p.team === 'offense' &&
    p.isEligible &&
    p.playerType !== 'QB'
  );

  const motionTypes = [
    { value: 'fly', label: 'Fly' },
    { value: 'orbit', label: 'Orbit' },
    { value: 'jet', label: 'Jet' },
    { value: 'return', label: 'Return' },
    { value: 'shift', label: 'Shift' },
  ];

  const availableRoutes = [
    { type: 'go', name: 'Go' },
    { type: 'post', name: 'Post' },
    { type: 'corner', name: 'Corner' },
    { type: 'out', name: 'Out' },
    { type: 'in', name: 'In/Dig' },
    { type: 'comeback', name: 'Comeback' },
    { type: 'curl', name: 'Curl' },
    { type: 'slant', name: 'Slant' },
    { type: 'hitch', name: 'Hitch' },
    { type: 'flat', name: 'Flat' },
    { type: 'wheel', name: 'Wheel' },
    { type: 'screen', name: 'Screen' },
  ];

  const handleMotion = (playerId: string) => {
    if (!isMotionActive && isPreSnap) {
      sendInMotion(playerId, selectedMotionType);
      setShowMotion(false);
    }
  };

  const handleAudible = (routeType: string) => {
    if (selectedPlayer && canAudible) {
      setAudible(selectedPlayer, routeType);
      setSelectedPlayer(null);
      setShowAudibles(false);
    }
  };

  if (!isPreSnap) return null;

  return (
    <div className="relative">
      <div className="flex gap-2">
        {/* Motion Control */}
        <div className="relative">
          <button
            onClick={() => setShowMotion(!showMotion)}
            disabled={isMotionActive}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              isMotionActive
                ? 'bg-yellow-600 text-white cursor-not-allowed'
                : motionPlayer
                ? 'bg-green-600 text-white hover:bg-green-500'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {isMotionActive ? 'In Motion' : motionPlayer ? 'Motion Set' : 'Motion'}
          </button>

          {showMotion && !isMotionActive && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50 min-w-64">
              <div className="space-y-2">
                <select
                  value={selectedMotionType}
                  onChange={(e) => setSelectedMotionType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs"
                >
                  {motionTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-1">
                  {eligiblePlayers.map(player => (
                    <button
                      key={player.id}
                      onClick={() => handleMotion(player.id)}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    >
                      {player.playerType} {player.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audible Control */}
        <div className="relative">
          <button
            onClick={() => setShowAudibles(!showAudibles)}
            disabled={!canAudible}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              !canAudible
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : audiblesUsed > 0
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Audible ({audiblesUsed}/{maxAudibles})
          </button>

          {showAudibles && canAudible && (
            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-50 min-w-64">
              {!selectedPlayer ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Select receiver:</p>
                  <div className="grid grid-cols-3 gap-1">
                    {eligiblePlayers.map(player => (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player.id)}
                        className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                      >
                        {player.playerType} {player.id}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">Route for {selectedPlayer}:</p>
                    <button
                      onClick={() => setSelectedPlayer(null)}
                      className="text-xs text-gray-500 hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {availableRoutes.map(route => (
                      <button
                        key={route.type}
                        onClick={() => handleAudible(route.type)}
                        className="px-2 py-1 text-xs bg-blue-700 hover:bg-blue-600 rounded transition-colors"
                      >
                        {route.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop to close dropdowns */}
      {(showMotion || showAudibles) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowMotion(false);
            setShowAudibles(false);
            setSelectedPlayer(null);
          }}
        />
      )}
    </div>
  );
}