'use client';

import { usePlayers, useBall, useGamePhase, useIsShowingDefense, useIsShowingRoutes, useGameState } from '@/store/gameStore';
import type { Player, Ball } from '@/engine/types';
import ZoneBubbles from './ZoneBubbles';

interface FieldCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function FieldCanvas({
  width = 400,
  height = 800,
  className = ''
}: FieldCanvasProps) {
  const players = usePlayers();
  const ball = useBall();
  const gamePhase = useGamePhase();
  const isShowingDefense = useIsShowingDefense();
  const isShowingRoutes = useIsShowingRoutes();
  const gameState = useGameState();

  // Scale factors for field dimensions (VERTICAL FIELD)
  // NFL field: 53.33 yards wide × 120 yards long (vertical)
  // SVG canvas: width × height
  const scaleX = width / 53.33; // Width represents sideline to sideline
  const scaleY = height / 120;  // Height represents endzone to endzone

  // Convert field coordinates to SVG coordinates
  // Invert Y-axis so offensive endzone (Y=0) is at bottom of screen
  const fieldToSvg = (fieldX: number, fieldY: number) => ({
    x: fieldX * scaleX,
    y: (120 - fieldY) * scaleY,  // Invert Y to put offense at bottom
  });

  // Render field markings (VERTICAL FIELD)
  const renderFieldMarkings = () => {
    const markings = [];

    // Field boundaries
    markings.push(
      <rect
        key="field-boundary"
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#2d5a27"
        stroke="#ffffff"
        strokeWidth="2"
      />
    );

    // Yard lines every 10 yards (now horizontal lines)
    for (let yard = 10; yard <= 110; yard += 10) {
      const y = fieldToSvg(0, yard).y;
      const yardNumber = yard <= 50 ? yard : 110 - yard;

      markings.push(
        <g key={`yard-${yard}`}>
          {/* Main yard line (horizontal) */}
          <line
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            stroke="#ffffff"
            strokeWidth={yard % 50 === 0 ? "3" : "1"}
          />
          {/* Yard numbers */}
          <text
            x={width * 0.1}
            y={y - 5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="bold"
          >
            {yardNumber}
          </text>
          <text
            x={width * 0.9}
            y={y - 5}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="bold"
          >
            {yardNumber}
          </text>
        </g>
      );
    }

    // Goal lines (horizontal)
    const goalLine1 = fieldToSvg(0, 10).y;
    const goalLine2 = fieldToSvg(0, 110).y;

    markings.push(
      <line key="goal-line-1" x1={0} y1={goalLine1} x2={width} y2={goalLine1} stroke="#ffff00" strokeWidth="2" />,
      <line key="goal-line-2" x1={0} y1={goalLine2} x2={width} y2={goalLine2} stroke="#ffff00" strokeWidth="2" />
    );

    // Hash marks (now vertical lines)
    const leftHash = fieldToSvg(18.5, 0).x;
    const rightHash = fieldToSvg(34.83, 0).x;
    const centerX = fieldToSvg(26.665, 0).x;

    // Center line (vertical)
    markings.push(
      <line
        key="center-line"
        x1={centerX}
        y1={0}
        x2={centerX}
        y2={height}
        stroke="#ffffff"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );

    // Hash mark lines (vertical)
    markings.push(
      <line key="left-hash" x1={leftHash} y1={0} x2={leftHash} y2={height} stroke="#ffffff" strokeWidth="0.5" />,
      <line key="right-hash" x1={rightHash} y1={0} x2={rightHash} y2={height} stroke="#ffffff" strokeWidth="0.5" />
    );

    // Line of Scrimmage (blue line)
    const losY = fieldToSvg(0, gameState.lineOfScrimmage).y;
    markings.push(
      <line
        key="line-of-scrimmage"
        x1={0}
        y1={losY}
        x2={width}
        y2={losY}
        stroke="#0066ff"
        strokeWidth="3"
        opacity="0.8"
      />
    );

    // First Down Marker (yellow line) - only show if not in red zone
    const firstDownYard = gameState.lineOfScrimmage + gameState.yardsToGo;
    if (firstDownYard < 110) { // Don't show if we're inside the 10-yard line (red zone)
      const firstDownY = fieldToSvg(0, firstDownYard).y;
      markings.push(
        <line
          key="first-down-marker"
          x1={0}
          y1={firstDownY}
          x2={width}
          y2={firstDownY}
          stroke="#ffff00"
          strokeWidth="3"
          opacity="0.8"
          strokeDasharray="10,5"
        />
      );
    }

    return markings;
  };

  // Render a single player
  const renderPlayer = (player: Player) => {
    const position = fieldToSvg(player.position.x, player.position.y);
    const isOffense = player.team === 'offense';
    const color = isOffense ? '#0066cc' : '#cc0000';
    const strokeColor = isOffense ? '#003d7a' : '#800000';

    // Player dot with position label
    return (
      <g key={player.id}>
        {/* Player dot */}
        <circle
          cx={position.x}
          cy={position.y}
          r={isOffense ? "8" : "6"}
          fill={color}
          stroke={strokeColor}
          strokeWidth="2"
          opacity={gamePhase === 'play-over' ? 0.6 : 1.0}
        />
        {/* Player ID label */}
        <text
          x={position.x}
          y={position.y + 20}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="10"
          fontWeight="bold"
        >
          {player.id}
        </text>
        {/* Star player indicator */}
        {player.isStar && (
          <text
            x={position.x}
            y={position.y - 12}
            textAnchor="middle"
            fill="#ffff00"
            fontSize="12"
          >
            ⭐
          </text>
        )}
        {/* Motion boost indicator */}
        {player.hasMotionBoost && (
          <circle
            cx={position.x}
            cy={position.y}
            r="12"
            fill="none"
            stroke="#ffff00"
            strokeWidth="2"
            strokeDasharray="3,3"
          />
        )}
      </g>
    );
  };

  // Render the ball
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

        // For display, we need to ensure routes show properly from player position
        // Skip the first waypoint if it's the same as player position to avoid doubling
        const routeWaypoints = route.waypoints.filter((wp, idx) => {
          if (idx === 0) {
            // Skip first waypoint if it's at the player's position (avoid duplicate)
            const dist = Math.abs(wp.x - player.position.x) + Math.abs(wp.y - player.position.y);
            return dist > 0.5; // Only include if it's not the same position
          }
          return true;
        });

        const pathPoints = routeWaypoints.map(waypoint =>
          fieldToSvg(waypoint.x, waypoint.y)
        );

        // Add continuation path after final waypoint
        if (routeWaypoints.length >= 2) {
          const lastWaypoint = routeWaypoints[routeWaypoints.length - 1];
          const secondLastWaypoint = routeWaypoints[routeWaypoints.length - 2];

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
            endY = Math.max(lastWaypoint.y, Math.min(120, endY)); // Don't go backward, max at back of endzone

            // Add the continuation point
            const continuationPoint = fieldToSvg(endX, endY);
            pathPoints.push(continuationPoint);
          }
        }

        // Create SVG path string starting from player position
        const pathString = pathPoints.reduce((path, point, index) => {
          if (index === 0) return `M ${startPos.x} ${startPos.y} L ${point.x} ${point.y}`;
          return `${path} L ${point.x} ${point.y}`;
        }, '');

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
            {/* Add route depth indicator at the break point (second to last) */}
            {pathPoints.length >= 2 && (
              <circle
                cx={pathPoints[pathPoints.length - 2]?.x}
                cy={pathPoints[pathPoints.length - 2]?.y}
                r="4"
                fill="#00FF00"
                opacity="0.8"
              />
            )}
          </g>
        );
      });
  };

  // Render coverage zones for defense (if showing defense)
  const renderCoverageZones = () => {
    if (!isShowingDefense) return null;

    // Render basic zone indicators for zone defenders
    return players
      .filter(player =>
        player.team === 'defense' &&
        player.coverageResponsibility?.type === 'zone'
      )
      .map(player => {
        const position = fieldToSvg(player.position.x, player.position.y);
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

  return (
    <div className={`relative ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="border border-gray-300 bg-green-800"
      >
        {/* Field markings */}
        {renderFieldMarkings()}

        {/* Coverage zones (behind players) */}
        {renderCoverageZones()}

        {/* Route paths */}
        {renderRoutes()}

        {/* Zone bubbles - render before players so they appear behind */}
        {gameState.coverage && (
          <ZoneBubbles
            coverage={gameState.coverage}
            fieldToSvg={fieldToSvg}
            width={width}
            height={height}
          />
        )}

        {/* Players */}
        {players.map(renderPlayer)}

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
    </div>
  );
}