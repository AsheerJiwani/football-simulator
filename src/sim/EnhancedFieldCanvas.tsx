'use client';

import { useState } from 'react';
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { usePlayers, useBall, useGamePhase, useIsShowingDefense, useIsShowingRoutes, useGameState, useGameStore, usePlayersWithUpdate } from '@/store/gameStore';
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

  // Enhanced selector to force re-renders when state changes
  const { players: playersWithUpdate, lastUpdate } = usePlayersWithUpdate();

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

  // Render the ball with proper states and trajectory
  const renderBall = (ball: Ball) => {
    const position = fieldToSvg(ball.position.x, ball.position.y);

    let ballColor = '#8B4513'; // Brown for held ball
    let ballSize = 4;

    if (ball.state === 'thrown') {
      ballColor = '#FF4500'; // Orange for thrown ball
      ballSize = 6;
    } else if (ball.state === 'caught') {
      ballColor = '#32CD32'; // Green for caught ball
    } else if (ball.state === 'incomplete' || ball.state === 'intercepted') {
      ballColor = '#DC143C'; // Red for incomplete/intercepted
    }

    return (
      <g key="ball">
        <circle
          cx={position.x}
          cy={position.y}
          r={ballSize}
          fill={ballColor}
          stroke="#000000"
          strokeWidth="1"
        />
        {/* Ball trajectory line for thrown balls */}
        {ball.state === 'thrown' && ball.targetPlayer && (
          <g>
            {/* Find target player and draw trajectory line */}
            {players
              .filter(p => p.id === ball.targetPlayer)
              .map(target => {
                const targetPos = fieldToSvg(target.position.x, target.position.y);
                return (
                  <line
                    key="trajectory"
                    x1={position.x}
                    y1={position.y}
                    x2={targetPos.x}
                    y2={targetPos.y}
                    stroke="#FF4500"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.7"
                  />
                );
              })}
          </g>
        )}
      </g>
    );
  };

  // Render route paths for offensive players
  const renderRoutes = () => {
    if (!isShowingRoutes) return null;

    return players
      .filter(player => player.team === 'offense' && player.isEligible)
      .map(player => {
        // Get the route from the player object (includes audibles and adjustments)
        const route = player.route;
        if (!route || !route.waypoints || route.waypoints.length === 0) return null;

        // Start from player's current position (accounts for motion)
        const startPos = fieldToSvg(player.position.x, player.position.y);

        // Transform route waypoints to display coordinates
        const pathPoints = route.waypoints.map(waypoint =>
          fieldToSvg(waypoint.x, waypoint.y)
        );

        // Add continuation path after final waypoint
        if (route.waypoints.length >= 2) {
          const lastWaypoint = route.waypoints[route.waypoints.length - 1];
          const secondLastWaypoint = route.waypoints[route.waypoints.length - 2];

          // Calculate direction from second-to-last to last waypoint
          const dx = lastWaypoint.x - secondLastWaypoint.x;
          const dy = lastWaypoint.y - secondLastWaypoint.y;
          const magnitude = Math.sqrt(dx * dx + dy * dy);

          if (magnitude > 0) {
            const dirX = dx / magnitude;
            const dirY = dy / magnitude;

            // Extend the route 30 yards in the same direction or to boundary
            let endX = lastWaypoint.x + dirX * 30;
            let endY = lastWaypoint.y + dirY * 30;

            // Clamp to field boundaries
            endX = Math.max(0, Math.min(53.33, endX));
            endY = Math.max(lastWaypoint.y, Math.min(120, endY));

            // Add the continuation point
            const continuationPoint = fieldToSvg(endX, endY);
            pathPoints.push(continuationPoint);
          }
        }

        // Create SVG path string
        let pathString = `M ${startPos.x} ${startPos.y}`;
        pathPoints.forEach(point => {
          pathString += ` L ${point.x} ${point.y}`;
        });

        return (
          <g key={`route-${player.id}`}>
            <path
              d={pathString}
              stroke="#00FF00"
              strokeWidth="2"
              strokeDasharray="4,2"
              fill="none"
              opacity="0.7"
            />
            {/* Add route depth indicator at the final break point */}
            {pathPoints.length >= 1 && (
              <circle
                cx={pathPoints[pathPoints.length - 2]?.x || pathPoints[0].x}
                cy={pathPoints[pathPoints.length - 2]?.y || pathPoints[0].y}
                r="4"
                fill="#00FF00"
                opacity="0.8"
              />
            )}
            {/* Add starting position indicator */}
            <circle
              cx={startPos.x}
              cy={startPos.y}
              r="3"
              fill="#00FF00"
              opacity="0.6"
            />
          </g>
        );
      });
  };

  // Render coverage zones for defense
  const renderCoverageZones = () => {
    if (!isShowingDefense) return null;

    return players
      .filter(player =>
        player.team === 'defense' &&
        player.coverageResponsibility?.type === 'zone'
      )
      .map(player => {
        const zone = player.coverageResponsibility?.zone;
        if (!zone) return null;

        const zoneTopLeft = fieldToSvg(zone.center.x - zone.width/2, zone.center.y - zone.height/2);
        const zoneX = zoneTopLeft.x;
        const zoneY = zoneTopLeft.y;
        const zoneWidth = zone.width * scaleX;
        const zoneHeight = zone.height * scaleY;

        return (
          <rect
            key={`zone-${player.id}`}
            x={zoneX}
            y={zoneY}
            width={zoneWidth}
            height={zoneHeight}
            fill="rgba(255, 0, 0, 0.1)"
            stroke="#cc0000"
            strokeWidth="1"
            strokeDasharray="3,3"
          />
        );
      });
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

          {/* Coverage zones (behind players) */}
          {renderCoverageZones()}

          {/* Routes */}
          {renderRoutes()}

          {/* Players */}
          {players.map((player) => (
            <g key={`${player.id}-${player.team}-${player.playerType}`}>
              {renderEnhancedPlayer(player)}
            </g>
          ))}

          {/* Ball */}
          {renderBall(ball)}
        </svg>

        {/* Game phase indicator */}
        <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          Phase: {gamePhase}
        </div>

        {/* Ball state indicator */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
          Ball: {ball.state}
        </div>

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