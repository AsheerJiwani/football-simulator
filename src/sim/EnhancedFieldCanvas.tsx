'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { usePlayers, useBall, useGamePhase, useIsShowingDefense, useIsShowingRoutes, useGameState, useGameStore } from '@/store/gameStore';
import type { Player, Ball } from '@/engine/types';
import ZoneBubbles from './ZoneBubbles';
import DraggablePlayer from './DraggablePlayer';
import { DroppableAnchor, generateFormationAnchors, validateFormation, FormationAnchor } from './FormationAnchors';

interface EnhancedFieldCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function EnhancedFieldCanvas({
  width = 600,
  height = 900,
  className = ''
}: EnhancedFieldCanvasProps) {
  const players = usePlayers();
  const ball = useBall();
  const gamePhase = useGamePhase();
  const isShowingDefense = useIsShowingDefense();
  const isShowingRoutes = useIsShowingRoutes();
  const gameState = useGameState();
  const { setCustomPosition, clearCustomPositions } = useGameStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [formationErrors, setFormationErrors] = useState<string[]>([]);

  // Scale factors for field dimensions (VERTICAL FIELD)
  const scaleX = width / 53.33;
  const scaleY = height / 120;

  // Convert field coordinates to SVG coordinates
  const fieldToSvg = (fieldX: number, fieldY: number) => ({
    x: fieldX * scaleX,
    y: (120 - fieldY) * scaleY,
  });

  // Get formation anchors
  const anchors = generateFormationAnchors(
    gameState.hashPosition || 'middle',
    gameState.lineOfScrimmage
  );

  // Mark occupied anchors
  const occupiedAnchors = new Set<string>();
  players.forEach(player => {
    if (player.team === 'offense') {
      const nearestAnchor = findNearestAnchor(player.position, anchors);
      if (nearestAnchor) {
        occupiedAnchors.add(nearestAnchor.id);
      }
    }
  });

  function findNearestAnchor(position: { x: number; y: number }, anchors: FormationAnchor[]): FormationAnchor | null {
    let nearest: FormationAnchor | null = null;
    let minDistance = Infinity;

    anchors.forEach(anchor => {
      const dist = Math.sqrt(
        Math.pow(position.x - anchor.position.x, 2) +
        Math.pow(position.y - anchor.position.y, 2)
      );
      if (dist < minDistance && dist < 2) { // Within 2 yards
        minDistance = dist;
        nearest = anchor;
      }
    });

    return nearest;
  }

  const handleDragStart = (event: DragStartEvent) => {
    const playerId = event.active.id as string;
    setActiveId(playerId);
    const player = players.find(p => p.id === playerId);
    if (player) {
      setDraggedPlayer(player);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    setActiveId(null);
    setDraggedPlayer(null);

    const playerId = active.id as string;
    const player = players.find(p => p.id === playerId);
    if (!player || player.team !== 'offense') return;

    // Calculate the dropped position in field coordinates
    const currentSvgPos = fieldToSvg(player.position.x, player.position.y);
    const droppedSvgX = currentSvgPos.x + (delta?.x || 0);
    const droppedSvgY = currentSvgPos.y + (delta?.y || 0);

    // Convert back to field coordinates
    const droppedFieldX = droppedSvgX / scaleX;
    const droppedFieldY = 120 - (droppedSvgY / scaleY);
    const droppedPosition = { x: droppedFieldX, y: droppedFieldY };

    // Find the nearest available anchor within snapping distance
    let nearestAnchor: FormationAnchor | null = null;
    let minDistance = Infinity;
    const snapDistance = 3; // Snap within 3 yards

    anchors.forEach(anchor => {
      // Skip occupied anchors
      if (occupiedAnchors.has(anchor.id)) return;

      const dist = Math.sqrt(
        Math.pow(droppedPosition.x - anchor.position.x, 2) +
        Math.pow(droppedPosition.y - anchor.position.y, 2)
      );

      if (dist < snapDistance && dist < minDistance) {
        minDistance = dist;
        nearestAnchor = anchor;
      }
    });

    // If we found a nearby anchor, snap to it
    if (nearestAnchor !== null) {
      // Update the custom position which will trigger engine update
      const foundAnchor = nearestAnchor as FormationAnchor;
      const anchorPosition = foundAnchor.position;
      setCustomPosition(playerId, anchorPosition);

      // Trigger defensive realignment after offensive position change
      // This will be handled by the engine when updatePlayerPosition is called

      // Validate formation
      const offensePlayers = players
        .filter(p => p.team === 'offense')
        .map(p => {
          if (p.id === playerId) {
            return { position: anchorPosition, isEligible: p.isEligible };
          }
          return { position: p.position, isEligible: p.isEligible };
        });

      const validation = validateFormation(offensePlayers);
      setFormationErrors(validation.errors);
    } else {
      // If no anchor is near enough, snap back to original position
      // This is handled automatically by not updating the position
    }
  };

  // Enhanced field markings with 3D effects
  const renderEnhancedFieldMarkings = () => {
    const markings = [];

    // Field gradient background
    markings.push(
      <defs key="defs">
        <linearGradient id="fieldGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2d5a27" stopOpacity="1" />
          <stop offset="50%" stopColor="#3a6f33" stopOpacity="1" />
          <stop offset="100%" stopColor="#2d5a27" stopOpacity="1" />
        </linearGradient>
        <pattern id="grassPattern" patternUnits="userSpaceOnUse" width="20" height="20">
          <rect width="20" height="20" fill="#2d5a27" />
          <rect width="10" height="10" fill="#3a6f33" opacity="0.3" />
          <rect x="10" y="10" width="10" height="10" fill="#3a6f33" opacity="0.3" />
        </pattern>
      </defs>
    );

    // Field with gradient and pattern
    markings.push(
      <rect
        key="field-boundary"
        x={0}
        y={0}
        width={width}
        height={height}
        fill="url(#grassPattern)"
        stroke="#ffffff"
        strokeWidth="3"
      />
    );

    // Endzones with red lines
    const endzone1Y = fieldToSvg(0, 10).y;
    const endzone2Y = fieldToSvg(0, 110).y;

    markings.push(
      <g key="endzones">
        <rect x={0} y={endzone2Y} width={width} height={fieldToSvg(0, 0).y - endzone2Y} fill="#1a3d1a" opacity="0.5" />
        <rect x={0} y={0} width={width} height={endzone1Y} fill="#1a3d1a" opacity="0.5" />
        <line x1={0} y1={endzone1Y} x2={width} y2={endzone1Y} stroke="#ff0000" strokeWidth="4" />
        <line x1={0} y1={endzone2Y} x2={width} y2={endzone2Y} stroke="#ff0000" strokeWidth="4" />
      </g>
    );

    // Enhanced yard lines with 3D effect
    for (let yard = 10; yard <= 110; yard += 10) {
      const y = fieldToSvg(0, yard).y;
      const yardNumber = yard <= 60 ? yard - 10 : 110 - yard;

      if (yard > 10 && yard < 110) {
        markings.push(
          <g key={`yard-${yard}`}>
            <line x1={0} y1={y} x2={width} y2={y} stroke="#ffffff" strokeWidth={yard % 50 === 10 ? "3" : "2"} opacity="0.9" />
            <line x1={0} y1={y + 1} x2={width} y2={y + 1} stroke="#000000" strokeWidth="1" opacity="0.2" />

            {yardNumber > 0 && (
              <>
                <text x={width * 0.15} y={y - 5} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold" opacity="0.9">
                  {yardNumber}
                </text>
                <text x={width * 0.85} y={y - 5} textAnchor="middle" fill="#ffffff" fontSize="16" fontWeight="bold" opacity="0.9">
                  {yardNumber}
                </text>
              </>
            )}
          </g>
        );
      }
    }

    // Hash marks with enhanced visibility
    const leftHash = fieldToSvg(18.5, 0).x;
    const rightHash = fieldToSvg(34.83, 0).x;

    for (let yard = 11; yard < 110; yard++) {
      const y = fieldToSvg(0, yard).y;
      if (yard % 10 !== 0) {
        markings.push(
          <g key={`hash-${yard}`}>
            <line x1={leftHash - 2} y1={y} x2={leftHash + 2} y2={y} stroke="#ffffff" strokeWidth="1" opacity="0.6" />
            <line x1={rightHash - 2} y1={y} x2={rightHash + 2} y2={y} stroke="#ffffff" strokeWidth="1" opacity="0.6" />
          </g>
        );
      }
    }

    // Line of Scrimmage (enhanced blue line)
    const losY = fieldToSvg(0, gameState.lineOfScrimmage).y;
    markings.push(
      <g key="los">
        <line x1={0} y1={losY} x2={width} y2={losY} stroke="#0099ff" strokeWidth="4" opacity="0.9" />
        <line x1={0} y1={losY + 2} x2={width} y2={losY + 2} stroke="#003366" strokeWidth="2" opacity="0.4" />
      </g>
    );

    // First Down Marker (enhanced yellow line)
    const firstDownYard = gameState.lineOfScrimmage + gameState.yardsToGo;
    if (firstDownYard < 110) {
      const firstDownY = fieldToSvg(0, firstDownYard).y;
      markings.push(
        <g key="first-down">
          <line x1={0} y1={firstDownY} x2={width} y2={firstDownY} stroke="#ffdd00" strokeWidth="4" opacity="0.9" strokeDasharray="15,5" />
          <line x1={0} y1={firstDownY + 2} x2={width} y2={firstDownY + 2} stroke="#aa8800" strokeWidth="2" opacity="0.4" strokeDasharray="15,5" />
        </g>
      );
    }

    // Field goal posts (decorative)
    markings.push(
      <g key="goalposts">
        <rect x={width/2 - 2} y={0} width={4} height={10} fill="#ffcc00" />
        <rect x={width/2 - 30} y={8} width={60} height={2} fill="#ffcc00" />
      </g>
    );

    return markings;
  };

  // Enhanced player rendering
  const renderEnhancedPlayer = (player: Player) => {
    const position = fieldToSvg(player.position.x, player.position.y);
    const isOffense = player.team === 'offense';
    const isDraggable = isOffense && gamePhase === 'pre-snap';

    const playerElement = (
      <g>
        <circle
          cx={0}
          cy={0}
          r={isOffense ? 10 : 8}
          fill={isOffense ? '#0066cc' : '#cc0000'}
          stroke={isOffense ? '#004499' : '#990000'}
          strokeWidth="2"
          filter="url(#playerShadow)"
        />
        <text
          x={0}
          y={4}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontWeight="bold"
        >
          {player.playerType}
        </text>
        {player.isStar && (
          <text x={0} y={-14} textAnchor="middle" fill="#ffdd00" fontSize="14">⭐</text>
        )}
      </g>
    );

    if (isDraggable) {
      return (
        <DraggablePlayer
          key={player.id}
          player={player}
          svgCoords={position}
          disabled={gamePhase !== 'pre-snap'}
        >
          {playerElement}
        </DraggablePlayer>
      );
    }

    return (
      <g key={player.id} transform={`translate(${position.x}, ${position.y})`}>
        {playerElement}
      </g>
    );
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`relative ${className}`}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="border-4 border-gray-700 rounded-lg shadow-2xl"
        >
          <defs>
            <filter id="playerShadow">
              <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
          </defs>

          {renderEnhancedFieldMarkings()}

          {/* Connection lines when dragging */}
          {activeId && draggedPlayer && gamePhase === 'pre-snap' && (
            <g opacity="0.6">
              {anchors
                .filter(anchor => !occupiedAnchors.has(anchor.id))
                .map(anchor => {
                  const fromPos = fieldToSvg(draggedPlayer.position.x, draggedPlayer.position.y);
                  const toPos = fieldToSvg(anchor.position.x, anchor.position.y);
                  return (
                    <line
                      key={`line-${anchor.id}`}
                      x1={fromPos.x}
                      y1={fromPos.y}
                      x2={toPos.x}
                      y2={toPos.y}
                      stroke="#00ff00"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      opacity="0.5"
                    />
                  );
                })}
            </g>
          )}

          {/* Formation anchors (only show pre-snap) */}
          {gamePhase === 'pre-snap' && anchors.map(anchor => {
            const pos = fieldToSvg(anchor.position.x, anchor.position.y);
            const isAvailable = !occupiedAnchors.has(anchor.id);
            return (
              <DroppableAnchor
                key={anchor.id}
                anchor={{ ...anchor, isOccupied: !isAvailable }}
                svgCoords={pos}
                isHighlighted={activeId !== null && isAvailable}
              />
            );
          })}

          {/* Zone bubbles */}
          {gameState.coverage && (
            <ZoneBubbles
              coverage={gameState.coverage}
              fieldToSvg={fieldToSvg}
              width={width}
              height={height}
            />
          )}

          {/* Routes */}
          {isShowingRoutes && gameState.playConcept && players
            .filter(p => p.team === 'offense' && p.isEligible)
            .map(player => {
              const route = gameState.playConcept?.routes[player.id];
              if (!route?.waypoints) return null;

              const startPos = fieldToSvg(player.position.x, player.position.y);
              const pathPoints = route.waypoints.map(w => fieldToSvg(w.x, w.y));
              const pathString = `M ${startPos.x} ${startPos.y} ${pathPoints.map(p => `L ${p.x} ${p.y}`).join(' ')}`;

              return (
                <path
                  key={`route-${player.id}`}
                  d={pathString}
                  stroke="#00ff00"
                  strokeWidth="3"
                  strokeDasharray="6,3"
                  fill="none"
                  opacity="0.7"
                />
              );
            })}

          {/* Players */}
          {players.map(renderEnhancedPlayer)}

          {/* Ball */}
          <circle
            cx={fieldToSvg(ball.position.x, ball.position.y).x}
            cy={fieldToSvg(ball.position.x, ball.position.y).y}
            r={ball.state === 'thrown' ? 8 : 5}
            fill={ball.state === 'thrown' ? '#ff6600' : '#8b4513'}
            stroke="#000000"
            strokeWidth="2"
          />
        </svg>

        {/* Formation validation errors */}
        {formationErrors.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4 bg-red-900 bg-opacity-90 text-white p-2 rounded">
            <div className="text-sm font-bold mb-1">Formation Issues:</div>
            {formationErrors.map((error, i) => (
              <div key={i} className="text-xs">• {error}</div>
            ))}
          </div>
        )}

      </div>
    </DndContext>
  );
}