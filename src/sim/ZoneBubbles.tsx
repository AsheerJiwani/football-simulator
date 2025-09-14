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
  shape: 'oval' | 'rectangle' | 'circle' | 'rounded_rectangle';
  center: { x: number; y: number }; // Relative to LOS
  dimensions: { width: number; height: number; radius?: number };
  type: 'deep' | 'underneath' | 'hole';
  label?: string;
  opacity: number;
  color: string;
}

// Zone definitions based on NFL playbook research
const getZoneDefinitions = (coverage: string): ZoneDefinition[] => {
  switch (coverage) {
    case 'cover-2':
      return [
        // Deep halves - elongated ovals
        {
          id: 'deep-left',
          shape: 'oval',
          center: { x: 13.3, y: 20 },
          dimensions: { width: 26.65, height: 30 },
          type: 'deep',
          label: '1/2',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-right',
          shape: 'oval',
          center: { x: 40, y: 20 },
          dimensions: { width: 26.65, height: 30 },
          type: 'deep',
          label: '1/2',
          opacity: 0.35,
          color: '#4A90E2'
        },
        // Underneath zones - rounded rectangles
        {
          id: 'flat-left',
          shape: 'rounded_rectangle',
          center: { x: 9, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'flat-right',
          shape: 'rounded_rectangle',
          center: { x: 44.3, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-left',
          shape: 'oval',
          center: { x: 19, y: 8 },
          dimensions: { width: 9.5, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-right',
          shape: 'oval',
          center: { x: 34.3, y: 8 },
          dimensions: { width: 9.5, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hole',
          shape: 'oval',
          center: { x: 26.665, y: 10 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'M',
          opacity: 0.45,
          color: '#7ED321'
        },
      ];

    case 'cover-3':
      return [
        // Deep thirds - rounded rectangles
        {
          id: 'deep-left',
          shape: 'rounded_rectangle',
          center: { x: 8.88, y: 18 },
          dimensions: { width: 17.76, height: 30 },
          type: 'deep',
          label: '1/3',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-middle',
          shape: 'rounded_rectangle',
          center: { x: 26.665, y: 18 },
          dimensions: { width: 17.76, height: 30 },
          type: 'deep',
          label: '1/3',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-right',
          shape: 'rounded_rectangle',
          center: { x: 44.42, y: 18 },
          dimensions: { width: 17.76, height: 30 },
          type: 'deep',
          label: '1/3',
          opacity: 0.35,
          color: '#4A90E2'
        },
        // Underneath zones
        {
          id: 'curl-flat-left',
          shape: 'rounded_rectangle',
          center: { x: 10, y: 6 },
          dimensions: { width: 12, height: 12 },
          type: 'underneath',
          label: 'C/F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'curl-flat-right',
          shape: 'rounded_rectangle',
          center: { x: 43.3, y: 6 },
          dimensions: { width: 12, height: 12 },
          type: 'underneath',
          label: 'C/F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-left',
          shape: 'oval',
          center: { x: 20, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-right',
          shape: 'oval',
          center: { x: 33.3, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
      ];

    case 'cover-4':
    case 'quarters':
      return [
        // Deep quarters - rectangles
        {
          id: 'deep-1',
          shape: 'rectangle',
          center: { x: 6.66, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-2',
          shape: 'rectangle',
          center: { x: 19.99, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-3',
          shape: 'rectangle',
          center: { x: 33.34, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-4',
          shape: 'rectangle',
          center: { x: 46.67, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        // Underneath zones
        {
          id: 'hook-left',
          shape: 'oval',
          center: { x: 18, y: 8 },
          dimensions: { width: 10, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-middle',
          shape: 'oval',
          center: { x: 26.665, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'M',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-right',
          shape: 'oval',
          center: { x: 35.3, y: 8 },
          dimensions: { width: 10, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
      ];

    case 'tampa-2':
      return [
        // Deep halves - truncated ovals
        {
          id: 'deep-left',
          shape: 'oval',
          center: { x: 11, y: 22 },
          dimensions: { width: 22, height: 28 },
          type: 'deep',
          label: '1/2',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-right',
          shape: 'oval',
          center: { x: 42.3, y: 22 },
          dimensions: { width: 22, height: 28 },
          type: 'deep',
          label: '1/2',
          opacity: 0.35,
          color: '#4A90E2'
        },
        // Robber/hole zone - circle
        {
          id: 'deep-hole',
          shape: 'circle',
          center: { x: 26.665, y: 15 },
          dimensions: { width: 10, height: 10, radius: 5 },
          type: 'hole',
          label: 'Rob',
          opacity: 0.6,
          color: '#F5A623'
        },
        // Underneath zones
        {
          id: 'flat-left',
          shape: 'rounded_rectangle',
          center: { x: 9, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'flat-right',
          shape: 'rounded_rectangle',
          center: { x: 44.3, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-left',
          shape: 'oval',
          center: { x: 18, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-right',
          shape: 'oval',
          center: { x: 35.3, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
      ];

    case 'cover-6':
      return [
        // Quarter-quarter-half combination
        {
          id: 'deep-quarter-1',
          shape: 'rectangle',
          center: { x: 6.66, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-quarter-2',
          shape: 'rectangle',
          center: { x: 19.99, y: 16 },
          dimensions: { width: 13.32, height: 30 },
          type: 'deep',
          label: '1/4',
          opacity: 0.35,
          color: '#4A90E2'
        },
        {
          id: 'deep-half',
          shape: 'oval',
          center: { x: 40, y: 20 },
          dimensions: { width: 26.65, height: 30 },
          type: 'deep',
          label: '1/2',
          opacity: 0.35,
          color: '#4A90E2'
        },
        // Underneath zones
        {
          id: 'flat-left',
          shape: 'rounded_rectangle',
          center: { x: 9, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-left',
          shape: 'oval',
          center: { x: 18, y: 8 },
          dimensions: { width: 10, height: 6 },
          type: 'underneath',
          label: 'H',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'hook-middle',
          shape: 'oval',
          center: { x: 26.665, y: 8 },
          dimensions: { width: 8, height: 6 },
          type: 'underneath',
          label: 'M',
          opacity: 0.45,
          color: '#7ED321'
        },
        {
          id: 'flat-right',
          shape: 'rounded_rectangle',
          center: { x: 44.3, y: 6 },
          dimensions: { width: 9, height: 12 },
          type: 'underneath',
          label: 'F',
          opacity: 0.45,
          color: '#7ED321'
        },
      ];

    case 'cover-1':
      // Cover 1 is man coverage with single high safety
      return [
        {
          id: 'deep-middle',
          shape: 'circle',
          center: { x: 26.665, y: 15 },
          dimensions: { width: 20, height: 20, radius: 10 },
          type: 'deep',
          label: 'FS',
          opacity: 0.3,
          color: '#4A90E2'
        },
      ];

    case 'cover-0':
      // Cover 0 is pure man coverage, no zones
      return [];

    default:
      return [];
  }
};

// Helper to render different shapes
const renderZoneShape = (
  zone: ZoneDefinition,
  topLeft: { x: number; y: number },
  bottomRight: { x: number; y: number },
  svgWidth: number,
  svgHeight: number
) => {
  const centerX = (topLeft.x + bottomRight.x) / 2;
  const centerY = (topLeft.y + bottomRight.y) / 2;

  switch (zone.shape) {
    case 'circle':
      return (
        <circle
          cx={centerX}
          cy={centerY}
          r={zone.dimensions.radius! * (svgWidth / zone.dimensions.width)}
          fill={zone.color}
          fillOpacity={zone.opacity}
          stroke={zone.color}
          strokeWidth={2}
        />
      );

    case 'oval':
      return (
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={svgWidth / 2}
          ry={svgHeight / 2}
          fill={zone.color}
          fillOpacity={zone.opacity}
          stroke={zone.color}
          strokeWidth={2}
        />
      );

    case 'rounded_rectangle':
      return (
        <rect
          x={Math.min(topLeft.x, bottomRight.x)}
          y={Math.min(topLeft.y, bottomRight.y)}
          width={svgWidth}
          height={svgHeight}
          fill={zone.color}
          fillOpacity={zone.opacity}
          stroke={zone.color}
          strokeWidth={2}
          rx={Math.min(8, svgWidth * 0.1)}
          ry={Math.min(8, svgHeight * 0.1)}
        />
      );

    case 'rectangle':
    default:
      return (
        <rect
          x={Math.min(topLeft.x, bottomRight.x)}
          y={Math.min(topLeft.y, bottomRight.y)}
          width={svgWidth}
          height={svgHeight}
          fill={zone.color}
          fillOpacity={zone.opacity}
          stroke={zone.color}
          strokeWidth={2}
        />
      );
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
    <g className="zone-bubbles">
      {zones.map((zone) => {
        // Adjust zone position relative to LOS
        const adjustedCenter = {
          x: zone.center.x,
          y: los + zone.center.y // Zones are positioned on defensive side
        };

        // Convert to SVG coordinates
        const topLeft = fieldToSvg(
          adjustedCenter.x - zone.dimensions.width / 2,
          adjustedCenter.y - zone.dimensions.height / 2
        );
        const bottomRight = fieldToSvg(
          adjustedCenter.x + zone.dimensions.width / 2,
          adjustedCenter.y + zone.dimensions.height / 2
        );

        const svgWidth = Math.abs(bottomRight.x - topLeft.x);
        const svgHeight = Math.abs(bottomRight.y - topLeft.y);

        return (
          <g key={zone.id}>
            {renderZoneShape(zone, topLeft, bottomRight, svgWidth, svgHeight)}
            {zone.label && (
              <text
                x={(topLeft.x + bottomRight.x) / 2}
                y={(topLeft.y + bottomRight.y) / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
                opacity={1}
                style={{ pointerEvents: 'none' }}
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