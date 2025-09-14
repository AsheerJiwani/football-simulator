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

  // When dragging, hide the original player (DragOverlay will show it)
  // When not dragging, show the player at its current position
  if (isDragging) {
    // Return an invisible placeholder to maintain the drag reference
    return (
      <g
        ref={svgNodeRef}
        {...(disabled || player.team === 'defense' ? {} : listeners)}
        {...(disabled || player.team === 'defense' ? {} : attributes)}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
    );
  }

  return (
    <g
      ref={svgNodeRef}
      {...(disabled || player.team === 'defense' ? {} : listeners)}
      {...(disabled || player.team === 'defense' ? {} : attributes)}
      transform={`translate(${svgCoords.x}, ${svgCoords.y})`}
      style={{
        cursor: disabled || player.team === 'defense' ? 'default' : 'grab'
      }}
    >
      {children}
    </g>
  );
}