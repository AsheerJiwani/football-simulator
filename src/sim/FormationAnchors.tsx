'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Vector2D } from '@/engine/types';

export interface FormationAnchor {
  id: string;
  position: Vector2D;
  type: 'los' | 'backfield' | 'slot';
  isValid: boolean;
  isOccupied: boolean;
}

interface DroppableAnchorProps {
  anchor: FormationAnchor;
  svgCoords: { x: number; y: number };
  isHighlighted?: boolean;
}

export function DroppableAnchor({
  anchor,
  svgCoords,
  isHighlighted = false
}: DroppableAnchorProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: anchor.id,
    data: { anchor }
  });

  const strokeColor = isOver ? '#22c55e' : isHighlighted ? '#00ff00' : '#10b981';
  const opacity = anchor.isOccupied ? 0 : isOver ? 1 : isHighlighted ? 0.9 : 0.6;
  const radius = isOver ? 6 : isHighlighted ? 5 : 4;
  const strokeWidth = isOver ? 3 : isHighlighted ? 2 : 1.5;

  // Cast the ref to the correct type for SVG elements
  const svgNodeRef = setNodeRef as unknown as React.Ref<SVGCircleElement>;

  return (
    <g>
      <circle
        ref={svgNodeRef}
        cx={svgCoords.x}
        cy={svgCoords.y}
        r={radius}
        fill="transparent"
        opacity={opacity}
        strokeWidth={strokeWidth}
        stroke={strokeColor}
      />
      {isHighlighted && !anchor.isOccupied && (
        <circle
          cx={svgCoords.x}
          cy={svgCoords.y}
          r={radius + 4}
          fill="none"
          stroke="#00ff00"
          strokeWidth="1"
          opacity="0.4"
          strokeDasharray="2,2"
        />
      )}
    </g>
  );
}

export function generateFormationAnchors(
  hashPosition: 'left' | 'middle' | 'right',
  losY: number = 30
): FormationAnchor[] {
  const anchors: FormationAnchor[] = [];

  // Hash offset based on position
  const hashOffset = hashPosition === 'left' ? -5 : hashPosition === 'right' ? 5 : 0;

  // Line of Scrimmage positions (7 required)
  const losPositions = [
    { x: 10 + hashOffset, spacing: 'wide' },
    { x: 15 + hashOffset, spacing: 'slot' },
    { x: 20 + hashOffset, spacing: 'tight' },
    { x: 26.665 + hashOffset, spacing: 'center' }, // Center position
    { x: 33 + hashOffset, spacing: 'tight' },
    { x: 38 + hashOffset, spacing: 'slot' },
    { x: 43 + hashOffset, spacing: 'wide' }
  ];

  losPositions.forEach((pos, i) => {
    anchors.push({
      id: `los-${i}`,
      position: { x: pos.x, y: losY },
      type: 'los',
      isValid: true,
      isOccupied: false
    });
  });

  // Add stacking positions for each LOS receiver position (1 yard behind)
  // These allow for bunched formations, trips, and stacks
  losPositions.forEach((pos, i) => {
    // Skip center position for stacking
    if (i === 3) return;

    // Direct stack (1 yard behind)
    anchors.push({
      id: `stack-${i}-behind`,
      position: { x: pos.x, y: losY - 1 },
      type: 'slot',
      isValid: true,
      isOccupied: false
    });

    // Stack behind and left (for bunch formations)
    if (pos.x > 5) { // Ensure we don't go out of bounds
      anchors.push({
        id: `stack-${i}-behind-left`,
        position: { x: pos.x - 1, y: losY - 1 },
        type: 'slot',
        isValid: true,
        isOccupied: false
      });
    }

    // Stack behind and right (for bunch formations)
    if (pos.x < 48) { // Ensure we don't go out of bounds
      anchors.push({
        id: `stack-${i}-behind-right`,
        position: { x: pos.x + 1, y: losY - 1 },
        type: 'slot',
        isValid: true,
        isOccupied: false
      });
    }

    // Additional depth stacking (2 yards behind for deeper routes)
    anchors.push({
      id: `stack-${i}-deep`,
      position: { x: pos.x, y: losY - 2 },
      type: 'slot',
      isValid: true,
      isOccupied: false
    });
  });

  // Backfield positions (RB, FB)
  const backfieldPositions = [
    { x: 26.665 + hashOffset, y: losY - 5 },  // Behind QB
    { x: 20 + hashOffset, y: losY - 7 },       // Offset back left
    { x: 33 + hashOffset, y: losY - 7 },       // Offset back right
    { x: 26.665 + hashOffset, y: losY - 3 },  // Pistol RB position
  ];

  backfieldPositions.forEach((pos, i) => {
    anchors.push({
      id: `backfield-${i}`,
      position: { x: pos.x, y: pos.y },
      type: 'backfield',
      isValid: true,
      isOccupied: false
    });
  });

  // Slot positions (just off LOS) - Additional flexibility
  const slotPositions = [
    { x: 12 + hashOffset, y: losY - 1.5 },
    { x: 41 + hashOffset, y: losY - 1.5 },
    { x: 8 + hashOffset, y: losY - 1 },  // Wide slot left
    { x: 45 + hashOffset, y: losY - 1 }, // Wide slot right
  ];

  slotPositions.forEach((pos, i) => {
    anchors.push({
      id: `slot-flex-${i}`,
      position: { x: pos.x, y: pos.y },
      type: 'slot',
      isValid: true,
      isOccupied: false
    });
  });

  return anchors;
}

export function validateFormation(players: { position: Vector2D; isEligible: boolean }[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const losY = 30;
  const losThreshold = 1.5; // Within 1.5 yards of LOS

  // Count players on LOS
  const playersOnLOS = players.filter(p =>
    Math.abs(p.position.y - losY) <= losThreshold
  );

  if (playersOnLOS.length !== 7) {
    errors.push(`Must have exactly 7 players on the line of scrimmage (currently ${playersOnLOS.length})`);
  }

  // Check eligible receiver rules
  const eligibleOnLOS = playersOnLOS.filter(p => p.isEligible);
  if (eligibleOnLOS.length > 2) {
    errors.push('Maximum 2 eligible receivers allowed on the line of scrimmage');
  }

  // Check for players too close to each other
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const dist = Math.sqrt(
        Math.pow(players[i].position.x - players[j].position.x, 2) +
        Math.pow(players[i].position.y - players[j].position.y, 2)
      );
      if (dist < 0.5) {
        errors.push('Players are too close together');
        break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}