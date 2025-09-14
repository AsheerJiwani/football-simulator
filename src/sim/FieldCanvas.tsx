'use client';

import { usePlayers, useBall, useGamePhase } from '@/store/gameStore';
import type { Player, Ball } from '@/engine/types';

interface FieldCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function FieldCanvas({
  width = 800,
  height = 400,
  className = ''
}: FieldCanvasProps) {
  const players = usePlayers();
  const ball = useBall();
  const gamePhase = useGamePhase();

  // Scale factors for field dimensions
  // NFL field: 120 yards long × 53.33 yards wide
  // SVG canvas: width × height
  const scaleX = width / 120;
  const scaleY = height / 53.33;

  // Convert field coordinates to SVG coordinates
  const fieldToSvg = (fieldX: number, fieldY: number) => ({
    x: fieldX * scaleX,
    y: fieldY * scaleY,
  });

  // Render field markings
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

    // Yard lines every 10 yards
    for (let yard = 10; yard <= 110; yard += 10) {
      const x = fieldToSvg(yard, 0).x;
      const yardNumber = yard <= 50 ? yard : 110 - yard;

      markings.push(
        <g key={`yard-${yard}`}>
          {/* Main yard line */}
          <line
            x1={x}
            y1={0}
            x2={x}
            y2={height}
            stroke="#ffffff"
            strokeWidth={yard % 50 === 0 ? "3" : "1"}
          />
          {/* Yard numbers */}
          <text
            x={x}
            y={height * 0.2}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="bold"
          >
            {yardNumber}
          </text>
          <text
            x={x}
            y={height * 0.8}
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

    // Goal lines
    const goalLine1 = fieldToSvg(10, 0).x;
    const goalLine2 = fieldToSvg(110, 0).x;

    markings.push(
      <line key="goal-line-1" x1={goalLine1} y1={0} x2={goalLine1} y2={height} stroke="#ffff00" strokeWidth="2" />,
      <line key="goal-line-2" x1={goalLine2} y1={0} x2={goalLine2} y2={height} stroke="#ffff00" strokeWidth="2" />
    );

    // Hash marks
    const leftHash = fieldToSvg(0, 18.5).y;
    const rightHash = fieldToSvg(0, 34.83).y;
    const centerY = fieldToSvg(0, 26.665).y;

    // Center line
    markings.push(
      <line
        key="center-line"
        x1={0}
        y1={centerY}
        x2={width}
        y2={centerY}
        stroke="#ffffff"
        strokeWidth="1"
        strokeDasharray="5,5"
      />
    );

    // Hash mark lines
    markings.push(
      <line key="left-hash" x1={0} y1={leftHash} x2={width} y2={leftHash} stroke="#ffffff" strokeWidth="0.5" />,
      <line key="right-hash" x1={0} y1={rightHash} x2={width} y2={rightHash} stroke="#ffffff" strokeWidth="0.5" />
    );

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
    if (gamePhase === 'pre-snap') return null;

    return players
      .filter(player => player.team === 'offense' && player.route)
      .map(player => {
        const route = player.route!;
        const pathPoints = route.waypoints.map(waypoint =>
          fieldToSvg(waypoint.x, waypoint.y)
        );

        // Create SVG path string
        const pathString = pathPoints.reduce((path, point, index) => {
          if (index === 0) return `M ${point.x} ${point.y}`;
          return `${path} L ${point.x} ${point.y}`;
        }, '');

        return (
          <path
            key={`route-${player.id}`}
            d={pathString}
            stroke="#87CEEB"
            strokeWidth="2"
            strokeDasharray="2,2"
            fill="none"
            opacity="0.6"
          />
        );
      });
  };

  // Render coverage zones for defense (if showing defense)
  const renderCoverageZones = () => {
    // This would be implemented when we have zone coverage visualization
    // For now, just render basic zone indicators for zone defenders
    return players
      .filter(player =>
        player.team === 'defense' &&
        player.coverageResponsibility?.type === 'zone'
      )
      .map(player => {
        const position = fieldToSvg(player.position.x, player.position.y);
        const zone = player.coverageResponsibility?.zone;

        if (!zone) return null;

        const zoneX = fieldToSvg(zone.center.x - zone.width/2, zone.center.y - zone.height/2).x;
        const zoneY = fieldToSvg(zone.center.x - zone.width/2, zone.center.y - zone.height/2).y;
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