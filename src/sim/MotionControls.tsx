'use client';

import {
  usePlayers,
  useIsMotionActive,
  useMotionPlayer,
  useSendInMotion,
  useGamePhase,
} from '@/store/gameStore';

export default function MotionControls() {
  const players = usePlayers();
  const isMotionActive = useIsMotionActive();
  const motionPlayer = useMotionPlayer();
  const sendInMotion = useSendInMotion();
  const gamePhase = useGamePhase();

  const isPreSnap = gamePhase === 'pre-snap';

  // Get eligible players for motion (offensive skill players except QB)
  const eligiblePlayers = players.filter(p =>
    p.team === 'offense' &&
    p.isEligible &&
    p.playerType !== 'QB'
  );

  const handleMotion = (playerId: string) => {
    if (!isMotionActive && isPreSnap) {
      sendInMotion(playerId);
    }
  };

  if (!isPreSnap) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-300">Motion</h4>
      {isMotionActive ? (
        <div className="text-sm text-yellow-400">
          {motionPlayer} is in motion...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
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
      )}
    </div>
  );
}