'use client';

import { useIsShowingDefense, useGameState } from '@/store/gameStore';
import type { Coverage } from '@/engine/types';

interface ZoneBubbleProps {
  coverage: Coverage;
  fieldToSvg: (x: number, y: number) => { x: number; y: number };
  width: number;
  height: number;
}

interface ZoneDefinition {
  id: string;
  center: { x: number; y: number };
  width: number;
  height: number;
  type: 'deep' | 'underneath' | 'hole';
  label?: string;
}

// Zone definitions for each coverage type
const getZoneDefinitions = (coverage: string): ZoneDefinition[] => {
  switch (coverage) {
    case 'cover-2':
      return [
        // Deep zones
        { id: 'deep-left', center: { x: 13, y: 25 }, width: 26, height: 30, type: 'deep', label: '1/2' },
        { id: 'deep-right', center: { x: 40, y: 25 }, width: 26, height: 30, type: 'deep', label: '1/2' },
        // Underneath zones
        { id: 'flat-left', center: { x: 8, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'flat-right', center: { x: 45, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'hook-left', center: { x: 18, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'hook-right', center: { x: 35, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'middle', center: { x: 26.67, y: 12 }, width: 10, height: 12, type: 'underneath', label: 'Mid' },
      ];

    case 'cover-3':
      return [
        // Deep zones
        { id: 'deep-left', center: { x: 9, y: 20 }, width: 18, height: 30, type: 'deep', label: '1/3' },
        { id: 'deep-middle', center: { x: 26.67, y: 20 }, width: 18, height: 30, type: 'deep', label: '1/3' },
        { id: 'deep-right', center: { x: 44, y: 20 }, width: 18, height: 30, type: 'deep', label: '1/3' },
        // Underneath zones
        { id: 'flat-left', center: { x: 8, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'flat-right', center: { x: 45, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'hook-left', center: { x: 20, y: 10 }, width: 12, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'hook-right', center: { x: 33, y: 10 }, width: 12, height: 12, type: 'underneath', label: 'Hook' },
      ];

    case 'cover-4':
      return [
        // Deep zones (quarters)
        { id: 'deep-1', center: { x: 7, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        { id: 'deep-2', center: { x: 20, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        { id: 'deep-3', center: { x: 33, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        { id: 'deep-4', center: { x: 46, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        // Underneath zones
        { id: 'hook-left', center: { x: 18, y: 10 }, width: 12, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'hook-middle', center: { x: 26.67, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Mid' },
        { id: 'hook-right', center: { x: 35, y: 10 }, width: 12, height: 12, type: 'underneath', label: 'Hook' },
      ];

    case 'tampa-2':
      return [
        // Deep zones
        { id: 'deep-left', center: { x: 13, y: 25 }, width: 26, height: 30, type: 'deep', label: '1/2' },
        { id: 'deep-right', center: { x: 40, y: 25 }, width: 26, height: 30, type: 'deep', label: '1/2' },
        { id: 'deep-hole', center: { x: 26.67, y: 18 }, width: 12, height: 15, type: 'hole', label: 'Hole' },
        // Underneath zones
        { id: 'flat-left', center: { x: 8, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'flat-right', center: { x: 45, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'hook-left', center: { x: 18, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'hook-right', center: { x: 35, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Hook' },
      ];

    case 'cover-6':
      return [
        // Deep zones (quarter-quarter-half)
        { id: 'deep-quarter-1', center: { x: 7, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        { id: 'deep-quarter-2', center: { x: 20, y: 20 }, width: 13, height: 30, type: 'deep', label: '1/4' },
        { id: 'deep-half', center: { x: 40, y: 25 }, width: 26, height: 30, type: 'deep', label: '1/2' },
        // Underneath zones
        { id: 'flat-left', center: { x: 8, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
        { id: 'hook-left', center: { x: 18, y: 10 }, width: 12, height: 12, type: 'underneath', label: 'Hook' },
        { id: 'hook-middle', center: { x: 26.67, y: 10 }, width: 10, height: 12, type: 'underneath', label: 'Mid' },
        { id: 'flat-right', center: { x: 45, y: 8 }, width: 12, height: 10, type: 'underneath', label: 'Flat' },
      ];

    case 'cover-1':
      // Cover 1 is man coverage with single high safety
      return [
        { id: 'deep-middle', center: { x: 26.67, y: 15 }, width: 30, height: 20, type: 'deep', label: 'FS' },
      ];

    case 'cover-0':
      // Cover 0 is pure man coverage, no zones
      return [];

    default:
      return [];
  }
};

export default function ZoneBubbles({ coverage, fieldToSvg }: ZoneBubbleProps) {
  const isShowingDefense = useIsShowingDefense();
  const gameState = useGameState();

  // Don't show bubbles if defense isn't visible or no coverage is set
  if (!isShowingDefense || !coverage) {
    return null;
  }

  // Get zone definitions for current coverage
  const zones = getZoneDefinitions(coverage.type);

  // Adjust zones based on LOS
  const los = gameState.lineOfScrimmage;

  return (
    <g className="zone-bubbles" opacity={0.3}>
      {zones.map((zone) => {
        // Adjust zone position relative to LOS
        const adjustedCenter = {
          x: zone.center.x,
          y: los + zone.center.y
        };

        // Convert to SVG coordinates
        const topLeft = fieldToSvg(
          adjustedCenter.x - zone.width / 2,
          adjustedCenter.y - zone.height / 2
        );
        const bottomRight = fieldToSvg(
          adjustedCenter.x + zone.width / 2,
          adjustedCenter.y + zone.height / 2
        );

        const svgWidth = Math.abs(bottomRight.x - topLeft.x);
        const svgHeight = Math.abs(bottomRight.y - topLeft.y);

        // Color based on zone type
        const fillColor = zone.type === 'deep'
          ? '#3B82F6' // Blue for deep zones
          : zone.type === 'hole'
          ? '#10B981' // Green for hole zones
          : '#F59E0B'; // Amber for underneath zones

        return (
          <g key={zone.id}>
            <rect
              x={Math.min(topLeft.x, bottomRight.x)}
              y={Math.min(topLeft.y, bottomRight.y)}
              width={svgWidth}
              height={svgHeight}
              fill={fillColor}
              stroke={fillColor}
              strokeWidth={1}
              rx={8}
              ry={8}
            />
            {zone.label && (
              <text
                x={Math.min(topLeft.x, bottomRight.x) + svgWidth / 2}
                y={Math.min(topLeft.y, bottomRight.y) + svgHeight / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                opacity={0.8}
              >
                {zone.label}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}