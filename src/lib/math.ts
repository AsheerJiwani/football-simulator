import type { Vector2D } from '@/engine/types';

// Vector Math Utilities for Football Simulator

export const Vector = {
  // Create a new vector
  create: (x: number, y: number): Vector2D => ({ x, y }),

  // Vector addition
  add: (a: Vector2D, b: Vector2D): Vector2D => ({
    x: a.x + b.x,
    y: a.y + b.y,
  }),

  // Vector subtraction
  subtract: (a: Vector2D, b: Vector2D): Vector2D => ({
    x: a.x - b.x,
    y: a.y - b.y,
  }),

  // Scalar multiplication
  multiply: (v: Vector2D, scalar: number): Vector2D => ({
    x: v.x * scalar,
    y: v.y * scalar,
  }),

  // Vector magnitude (length)
  magnitude: (v: Vector2D): number => {
    return Math.sqrt(v.x * v.x + v.y * v.y);
  },

  // Vector distance between two points
  distance: (a: Vector2D, b: Vector2D): number => {
    const diff = Vector.subtract(b, a);
    return Vector.magnitude(diff);
  },

  // Normalize vector to unit length
  normalize: (v: Vector2D): Vector2D => {
    const mag = Vector.magnitude(v);
    if (mag === 0) return { x: 0, y: 0 };
    return {
      x: v.x / mag,
      y: v.y / mag,
    };
  },

  // Get direction vector from point A to point B
  direction: (from: Vector2D, to: Vector2D): Vector2D => {
    const diff = Vector.subtract(to, from);
    return Vector.normalize(diff);
  },

  // Dot product
  dot: (a: Vector2D, b: Vector2D): number => {
    return a.x * b.x + a.y * b.y;
  },

  // Linear interpolation between two vectors
  lerp: (a: Vector2D, b: Vector2D, t: number): Vector2D => {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  },

  // Clamp vector magnitude to max length
  clampMagnitude: (v: Vector2D, maxLength: number): Vector2D => {
    const mag = Vector.magnitude(v);
    if (mag <= maxLength) return v;
    return Vector.multiply(Vector.normalize(v), maxLength);
  },

  // Zero vector
  zero: (): Vector2D => ({ x: 0, y: 0 }),

  // Check if two vectors are approximately equal
  approximately: (a: Vector2D, b: Vector2D, epsilon = 0.001): boolean => {
    return Math.abs(a.x - b.x) < epsilon && Math.abs(a.y - b.y) < epsilon;
  },

  // Move from one position toward another at specified distance
  moveToward: (from: Vector2D, to: Vector2D, distance: number): Vector2D => {
    const direction = Vector.direction(from, to);
    const displacement = Vector.multiply(direction, distance);
    const newPosition = Vector.add(from, displacement);

    // Don't overshoot the target
    const totalDistance = Vector.distance(from, to);
    if (distance >= totalDistance) {
      return to;
    }

    return newPosition;
  },

  // Scale vector by scalar (alias for multiply for clarity)
  scale: (v: Vector2D, scalar: number): Vector2D => {
    return Vector.multiply(v, scalar);
  },
};

// Physics and game-specific math utilities
export const Physics = {
  // Calculate time for ball to reach target at constant speed
  timeToReach: (from: Vector2D, to: Vector2D, speed: number): number => {
    const distance = Vector.distance(from, to);
    return distance / speed;
  },

  // Calculate position after time with constant velocity
  positionAfterTime: (position: Vector2D, velocity: Vector2D, deltaTime: number): Vector2D => {
    return Vector.add(position, Vector.multiply(velocity, deltaTime));
  },

  // Check if point is within radius of target
  isWithinRadius: (point: Vector2D, target: Vector2D, radius: number): boolean => {
    return Vector.distance(point, target) <= radius;
  },

  // Calculate separation between two players (useful for openness calculations)
  separation: (receiver: Vector2D, defender: Vector2D): number => {
    return Vector.distance(receiver, defender);
  },

  // Convert separation to openness percentage (closer defender = less open)
  separationToOpenness: (separation: number, tackleRadius: number): number => {
    // If defender is within tackle radius, receiver is 0% open
    if (separation <= tackleRadius) return 0;

    // Use exponential falloff for realistic openness calculation
    // At tackle radius = 0%, at 5+ yards = ~95% open
    const normalizedSeparation = Math.max(0, separation - tackleRadius);
    const openness = 100 * (1 - Math.exp(-normalizedSeparation * 0.8));
    return Math.min(100, Math.max(0, openness));
  },
};

// Field geometry utilities (VERTICAL FIELD: 53.33 yards wide x 120 yards tall)
export const Field = {
  // Convert yards to field coordinates (vertical field: 53.33 wide x 120 tall)
  yardsToCoords: (yardLine: number, hash: number): Vector2D => {
    // yardLine: 0 = own goal line, 50 = midfield, 100 = opponent goal line
    // hash: 0 = left sideline, 26.665 = middle, 53.33 = right sideline
    return {
      x: hash, // Hash marks are now along x-axis (width)
      y: yardLine + 10, // Yard lines are now along y-axis (length), add 10 for end zone
    };
  },

  // Convert field coordinates back to yard line and hash
  coordsToYards: (position: Vector2D): { yardLine: number; hash: number } => {
    return {
      yardLine: position.y - 10, // Subtract 10 for end zone
      hash: position.x,
    };
  },

  // Check if position is in bounds
  isInBounds: (position: Vector2D): boolean => {
    return (
      position.x >= 0 &&
      position.x <= 53.33 &&
      position.y >= 0 &&
      position.y <= 120
    );
  },

  // Check if position is in end zone
  isInEndZone: (position: Vector2D): boolean => {
    return position.y <= 10 || position.y >= 110;
  },

  // Get closest sideline distance
  distanceToSideline: (position: Vector2D): number => {
    return Math.min(position.x, 53.33 - position.x);
  },

  // Clamp position to field bounds
  clampToField: (position: Vector2D): Vector2D => {
    return {
      x: Math.max(0, Math.min(53.33, position.x)),
      y: Math.max(0, Math.min(120, position.y)),
    };
  },
};

// Random utilities for player variations
export const Random = {
  // Random float between min and max
  range: (min: number, max: number): number => {
    return min + Math.random() * (max - min);
  },

  // Random element from array
  element: <T>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  },

  // Random boolean with probability
  chance: (probability: number): boolean => {
    return Math.random() < probability;
  },

  // Add slight random variation to a value (within percentage)
  vary: (value: number, variationPercent: number): number => {
    const variation = value * variationPercent / 100;
    return Random.range(value - variation, value + variation);
  },
};

// Utility functions for route calculations
export const Route = {
  // Calculate total route distance
  getDistance: (waypoints: Vector2D[]): number => {
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      totalDistance += Vector.distance(waypoints[i - 1], waypoints[i]);
    }
    return totalDistance;
  },

  // Get position along route at given time
  getPositionAtTime: (waypoints: Vector2D[], timing: number[], currentTime: number): Vector2D => {
    if (waypoints.length === 0) return Vector.zero();
    if (currentTime <= 0) return waypoints[0];

    // If past the last waypoint, continue in the same direction
    if (currentTime >= timing[timing.length - 1]) {
      const lastWaypoint = waypoints[waypoints.length - 1];
      const secondLastWaypoint = waypoints[waypoints.length - 2] || waypoints[waypoints.length - 1];

      // Calculate direction from second-to-last to last waypoint
      const direction = Vector.direction(secondLastWaypoint, lastWaypoint);

      // Calculate how much time has passed since reaching the last waypoint
      const extraTime = currentTime - timing[timing.length - 1];

      // Assume player continues at 9.0 yards/second (average WR speed)
      const extraDistance = extraTime * 9.0;

      // Calculate new position
      const continuedPosition = Vector.add(lastWaypoint, Vector.multiply(direction, extraDistance));

      // Clamp to field boundaries
      return {
        x: Math.max(0, Math.min(53.33, continuedPosition.x)),
        y: Math.max(0, Math.min(120, continuedPosition.y)) // Stop at back of endzone
      };
    }

    // Find which segment we're in
    for (let i = 0; i < timing.length - 1; i++) {
      if (currentTime >= timing[i] && currentTime <= timing[i + 1]) {
        const segmentProgress = (currentTime - timing[i]) / (timing[i + 1] - timing[i]);
        return Vector.lerp(waypoints[i], waypoints[i + 1], segmentProgress);
      }
    }

    return waypoints[waypoints.length - 1];
  },
};

// Bezier curve utilities for smooth movement
export const Bezier = {
  // Calculate point on quadratic Bezier curve
  quadratic: (p0: Vector2D, p1: Vector2D, p2: Vector2D, t: number): Vector2D => {
    const oneMinusT = 1 - t;
    return {
      x: oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x,
      y: oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y,
    };
  },

  // Calculate point on cubic Bezier curve
  cubic: (p0: Vector2D, p1: Vector2D, p2: Vector2D, p3: Vector2D, t: number): Vector2D => {
    const oneMinusT = 1 - t;
    const oneMinusTSquared = oneMinusT * oneMinusT;
    const oneMinusTCubed = oneMinusTSquared * oneMinusT;
    const tSquared = t * t;
    const tCubed = tSquared * t;

    return {
      x: oneMinusTCubed * p0.x + 3 * oneMinusTSquared * t * p1.x +
         3 * oneMinusT * tSquared * p2.x + tCubed * p3.x,
      y: oneMinusTCubed * p0.y + 3 * oneMinusTSquared * t * p1.y +
         3 * oneMinusT * tSquared * p2.y + tCubed * p3.y,
    };
  },

  // Generate control point for smooth turn
  generateControlPoint: (from: Vector2D, to: Vector2D, curveFactor: number = 0.3): Vector2D => {
    const midpoint = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
    };

    // Perpendicular vector for curve
    const perpendicular = {
      x: -(to.y - from.y) * curveFactor,
      y: (to.x - from.x) * curveFactor,
    };

    return {
      x: midpoint.x + perpendicular.x,
      y: midpoint.y + perpendicular.y,
    };
  },

  // Create smooth path between two points
  createSmoothPath: (from: Vector2D, to: Vector2D, steps: number = 20): Vector2D[] => {
    const control = Bezier.generateControlPoint(from, to);
    const path: Vector2D[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      path.push(Bezier.quadratic(from, control, to, t));
    }

    return path;
  },
};