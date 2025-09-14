'use client';

import {
  useCurrentDown,
  useYardsToGo,
  useBallOn,
  useIsFirstDown,
  useGamePhase,
  usePlayOutcome,
  useAdvanceToNextPlay
} from '@/store/gameStore';

export function DownAndDistance() {
  const currentDown = useCurrentDown();
  const yardsToGo = useYardsToGo();
  const ballOn = useBallOn();
  const isFirstDown = useIsFirstDown();
  const phase = useGamePhase();
  const outcome = usePlayOutcome();
  const advanceToNextPlay = useAdvanceToNextPlay();

  // Format down and distance display
  const getDownText = () => {
    if (isFirstDown) return '1st & 10';

    const downSuffix = ['st', 'nd', 'rd', 'th'][Math.min(currentDown - 1, 3)];

    if (yardsToGo >= 10 && ballOn <= 10) {
      return `${currentDown}${downSuffix} & Goal`;
    }

    return `${currentDown}${downSuffix} & ${yardsToGo}`;
  };

  // Format field position display
  const getFieldPositionText = () => {
    if (ballOn <= 50) {
      return `Own ${ballOn}`;
    } else {
      return `Opp ${100 - ballOn}`;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-3">
      <div className="text-white">
        <div className="text-sm text-gray-400 mb-1">DOWN & DISTANCE</div>
        <div className="text-2xl font-bold">{getDownText()}</div>
      </div>

      <div className="text-white">
        <div className="text-sm text-gray-400 mb-1">BALL ON</div>
        <div className="text-xl font-semibold">{getFieldPositionText()}</div>
      </div>

      {phase === 'play-over' && outcome && (
        <div className="pt-3 border-t border-gray-700">
          <button
            onClick={advanceToNextPlay}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Next Play
          </button>
        </div>
      )}
    </div>
  );
}