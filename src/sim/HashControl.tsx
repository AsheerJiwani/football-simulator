'use client';

import { useHashPosition, useSetHashPosition, useGamePhase } from '@/store/gameStore';

export default function HashControl() {
  const hashPosition = useHashPosition();
  const setHashPosition = useSetHashPosition();
  const gamePhase = useGamePhase();

  const isPreSnap = gamePhase === 'pre-snap';

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-300 mb-3">HASH POSITION</h4>

      <div className="flex gap-2">
        <button
          onClick={() => setHashPosition('left')}
          disabled={!isPreSnap}
          className={`
            flex-1 px-3 py-2 rounded text-sm font-medium transition-all
            ${hashPosition === 'left'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${!isPreSnap ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Left
        </button>

        <button
          onClick={() => setHashPosition('middle')}
          disabled={!isPreSnap}
          className={`
            flex-1 px-3 py-2 rounded text-sm font-medium transition-all
            ${hashPosition === 'middle'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${!isPreSnap ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Middle
        </button>

        <button
          onClick={() => setHashPosition('right')}
          disabled={!isPreSnap}
          className={`
            flex-1 px-3 py-2 rounded text-sm font-medium transition-all
            ${hashPosition === 'right'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${!isPreSnap ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          Right
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-400">
        {isPreSnap
          ? 'Select hash mark for ball placement'
          : 'Hash position locked during play'
        }
      </div>
    </div>
  );
}