'use client';

import React from 'react';
import type { Player, CoverageResponsibility } from '@/engine/types';

interface CoverageDebugOverlayProps {
  players: Player[];
  showDebug: boolean;
  fieldScale: number;
}

export function CoverageDebugOverlay({ players, showDebug, fieldScale }: CoverageDebugOverlayProps) {
  if (!showDebug) return null;

  const defenders = players.filter(p => p.team === 'defense');
  const offensivePlayers = players.filter(p => p.team === 'offense' && p.isEligible);

  // Helper to get assignment display text
  const getAssignmentText = (responsibility?: CoverageResponsibility) => {
    if (!responsibility) return 'None';

    switch (responsibility.type) {
      case 'man':
        const target = offensivePlayers.find(p => p.id === responsibility.target);
        return `Man: ${target?.playerType || responsibility.target}`;
      case 'zone':
        return `Zone: ${responsibility.zone?.name || 'Area'}`;
      case 'spy':
        return 'Spy/Hole';
      case 'blitz':
        return 'Blitz';
      default:
        return 'Unknown';
    }
  };

  // Helper to get assignment color
  const getAssignmentColor = (type?: string) => {
    switch (type) {
      case 'man': return '#FF6B6B'; // Red for man
      case 'zone': return '#4DABF7'; // Blue for zone
      case 'spy': return '#FFD43B'; // Yellow for spy
      case 'blitz': return '#FF8787'; // Light red for blitz
      default: return '#868E96'; // Gray for unknown
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* Draw assignment lines for man coverage */}
      <svg className="absolute inset-0 w-full h-full">
        {defenders.map(defender => {
          if (defender.coverageResponsibility?.type === 'man' &&
              defender.coverageResponsibility.target) {
            const target = offensivePlayers.find(p =>
              p.id === defender.coverageResponsibility?.target
            );

            if (target) {
              return (
                <line
                  key={`${defender.id}-${target.id}`}
                  x1={defender.position.x * fieldScale}
                  y1={defender.position.y * fieldScale}
                  x2={target.position.x * fieldScale}
                  y2={target.position.y * fieldScale}
                  stroke={getAssignmentColor('man')}
                  strokeWidth="1"
                  strokeDasharray="5,5"
                  opacity="0.5"
                />
              );
            }
          }
          return null;
        })}

        {/* Draw zone areas */}
        {defenders.map(defender => {
          if (defender.coverageResponsibility?.type === 'zone' &&
              defender.coverageResponsibility.zone) {
            const zone = defender.coverageResponsibility.zone;
            return (
              <rect
                key={`zone-${defender.id}`}
                x={(zone.center.x - zone.width / 2) * fieldScale}
                y={(zone.center.y - zone.height / 2) * fieldScale}
                width={zone.width * fieldScale}
                height={zone.height * fieldScale}
                fill={getAssignmentColor('zone')}
                fillOpacity="0.1"
                stroke={getAssignmentColor('zone')}
                strokeWidth="1"
                strokeOpacity="0.3"
                strokeDasharray="3,3"
              />
            );
          }
          return null;
        })}
      </svg>

      {/* Defender labels */}
      {defenders.map(defender => (
        <div
          key={`label-${defender.id}`}
          className="absolute transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${defender.position.x * fieldScale}px`,
            top: `${defender.position.y * fieldScale - 5}px`,
          }}
        >
          <div
            className="text-xs font-mono px-1 py-0.5 rounded shadow-lg backdrop-blur-sm"
            style={{
              backgroundColor: `${getAssignmentColor(defender.coverageResponsibility?.type)}CC`,
              color: 'white',
              fontSize: '10px',
              whiteSpace: 'nowrap',
            }}
          >
            <div className="font-bold">{defender.id}</div>
            <div>{getAssignmentText(defender.coverageResponsibility)}</div>
          </div>
        </div>
      ))}

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg">
        <h3 className="text-sm font-bold mb-2">Coverage Debug</h3>
        <div className="text-xs space-y-1">
          <div>Total Defenders: {defenders.length}</div>
          <div>Man: {defenders.filter(d => d.coverageResponsibility?.type === 'man').length}</div>
          <div>Zone: {defenders.filter(d => d.coverageResponsibility?.type === 'zone').length}</div>
          <div>Spy: {defenders.filter(d => d.coverageResponsibility?.type === 'spy').length}</div>
          <div>Blitz: {defenders.filter(d => d.coverageResponsibility?.type === 'blitz').length}</div>
        </div>

        {/* Coverage validation warnings */}
        {defenders.length !== 7 && (
          <div className="mt-2 text-red-400 text-xs">
            ⚠️ Wrong defender count: {defenders.length}
          </div>
        )}

        {/* Check for duplicate assignments */}
        {(() => {
          const manTargets = defenders
            .filter(d => d.coverageResponsibility?.type === 'man')
            .map(d => d.coverageResponsibility?.target)
            .filter(t => t);

          const duplicates = manTargets.filter((t, i) =>
            manTargets.indexOf(t) !== i
          );

          if (duplicates.length > 0) {
            return (
              <div className="mt-2 text-yellow-400 text-xs">
                ⚠️ Duplicate assignments detected
              </div>
            );
          }
          return null;
        })()}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg">
        <h3 className="text-sm font-bold mb-2">Assignment Types</h3>
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF6B6B' }}></div>
            <span>Man Coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#4DABF7' }}></div>
            <span>Zone Coverage</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFD43B' }}></div>
            <span>Spy/Hole</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF8787' }}></div>
            <span>Blitz</span>
          </div>
        </div>
      </div>
    </div>
  );
}