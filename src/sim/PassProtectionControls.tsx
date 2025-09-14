'use client';

import {
  usePassProtection,
  useSetPassProtection,
  useGamePhase,
  usePlayers,
} from '@/store/gameStore';

export default function PassProtectionControls() {
  const passProtection = usePassProtection();
  const setPassProtection = useSetPassProtection();
  const gamePhase = useGamePhase();
  const players = usePlayers();

  const isPreSnap = gamePhase === 'pre-snap';

  // Check which blockers are available
  const hasRB = players.some(p => p.playerType === 'RB' && p.team === 'offense');
  const hasTE = players.some(p => p.playerType === 'TE' && p.team === 'offense');
  const hasFB = players.some(p => p.playerType === 'FB' && p.team === 'offense');

  const handleToggle = (type: 'rb' | 'te' | 'fb') => {
    if (!isPreSnap) return;

    const newProtection = { ...passProtection };
    switch (type) {
      case 'rb':
        newProtection.rbBlocking = !newProtection.rbBlocking;
        break;
      case 'te':
        newProtection.teBlocking = !newProtection.teBlocking;
        break;
      case 'fb':
        newProtection.fbBlocking = !newProtection.fbBlocking;
        break;
    }
    setPassProtection(newProtection.rbBlocking, newProtection.teBlocking, newProtection.fbBlocking);
  };

  if (!isPreSnap) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-300">Pass Protection</h4>
      <div className="space-y-2">
        {hasRB && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={passProtection.rbBlocking}
              onChange={() => handleToggle('rb')}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">RB Blocks</span>
          </label>
        )}
        {hasTE && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={passProtection.teBlocking}
              onChange={() => handleToggle('te')}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">TE Blocks</span>
          </label>
        )}
        {hasFB && (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={passProtection.fbBlocking}
              onChange={() => handleToggle('fb')}
              className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">FB Blocks</span>
          </label>
        )}
        {!hasRB && !hasTE && !hasFB && (
          <p className="text-xs text-gray-500">No eligible blockers in formation</p>
        )}
      </div>
    </div>
  );
}