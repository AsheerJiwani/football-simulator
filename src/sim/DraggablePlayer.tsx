'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
      originalPosition: player.position
    }
  });

  // Cast the ref to the correct type for SVG elements
  const svgNodeRef = setNodeRef as unknown as React.Ref<SVGGElement>;

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled || player.team === 'defense' ? 'default' : 'grab',
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? 'none' : 'transform 200ms ease'
  } : {
    cursor: disabled || player.team === 'defense' ? 'default' : 'grab'
  };

  return (
    <g
      ref={svgNodeRef}
      style={style}
      {...(disabled || player.team === 'defense' ? {} : listeners)}
      {...(disabled || player.team === 'defense' ? {} : attributes)}
      transform={`translate(${svgCoords.x}, ${svgCoords.y})`}
    >
      {children}
    </g>
  );
}