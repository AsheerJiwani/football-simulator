'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Player } from '@/engine/types';

interface DraggablePlayerProps {
  player: Player;
  svgCoords: { x: number; y: number };
  disabled?: boolean;
  children: React.ReactNode;
}

export default function DraggablePlayer({
  player,
  svgCoords,
  disabled = false,
  children
}: DraggablePlayerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggable({
    id: player.id,
    disabled: disabled || player.team === 'defense',
    data: {
      player,
      originalPosition: player.position,
      svgCoords
    }
  });

  // Cast the ref to the correct type for SVG elements
  const svgNodeRef = setNodeRef as unknown as React.Ref<SVGGElement>;

  // Apply transform when dragging to move the player with cursor
  const x = svgCoords.x + (transform?.x || 0);
  const y = svgCoords.y + (transform?.y || 0);

  return (
    <g
      ref={svgNodeRef}
      {...(disabled || player.team === 'defense' ? {} : listeners)}
      {...(disabled || player.team === 'defense' ? {} : attributes)}
      transform={`translate(${x}, ${y})`}
      style={{
        cursor: disabled || player.team === 'defense' ? 'default' : isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.8 : 1,
        transition: isDragging ? 'none' : 'transform 0.2s ease'
      }}
    >
      {children}
    </g>
  );
}