'use client';

import { useState } from 'react';
import {
  usePlayers,
  useAudiblesUsed,
  useMaxAudibles,
  useSetAudible,
  useGamePhase,
  useGameMode,
} from '@/store/gameStore';

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

export default function AudibleControls() {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const players = usePlayers();
  const audiblesUsed = useAudiblesUsed();
  const maxAudibles = useMaxAudibles();
  const setAudible = useSetAudible();
  const gamePhase = useGamePhase();
  const gameMode = useGameMode();

  const isPreSnap = gamePhase === 'pre-snap';
  const canAudible = isPreSnap && (gameMode === 'free-play' || audiblesUsed < maxAudibles);

  // Get eligible receivers
  const eligibleReceivers = players.filter(p =>
    p.team === 'offense' &&
    p.isEligible &&
    p.playerType !== 'QB'
  );

  const handleAudible = (routeType: string) => {
    if (selectedPlayer && canAudible) {
      setAudible(selectedPlayer, routeType);
      setSelectedPlayer(null);
    }
  };

  if (!isPreSnap) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-300">Audibles</h4>
        <span className="text-xs text-gray-400">
          {audiblesUsed}/{maxAudibles} used
        </span>
      </div>

      {!canAudible ? (
        <div className="text-sm text-red-400">
          {gameMode === 'challenge' && audiblesUsed >= maxAudibles
            ? 'Max audibles reached (Challenge Mode)'
            : 'Cannot audible'}
        </div>
      ) : (
        <>
          {!selectedPlayer ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">Select a receiver:</p>
              <div className="grid grid-cols-3 gap-2">
                {eligibleReceivers.map(player => (
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
                <p className="text-xs text-gray-400">
                  Select new route for {selectedPlayer}:
                </p>
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
        </>
      )}
    </div>
  );
}