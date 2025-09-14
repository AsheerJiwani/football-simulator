import type {
  GameState,
  Player,
  Ball,
  GameConfig,
  PlayConcept,
  Coverage,
  PlayOutcome,
  GamePhase,
  PlayerType,
  Vector2D,
} from './types';

import { Vector, Physics, Field, Random, Route } from '@/lib/math';

export class FootballEngine {
  private gameState: GameState;
  private config: GameConfig;
  private animationFrameId?: number;
  private lastTickTime: number = 0;
  private isRunning: boolean = false;

  constructor(config?: Partial<GameConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.gameState = this.initializeGameState();
  }

  private getDefaultConfig(): GameConfig {
    return {
      fieldDimensions: {
        length: 120,
        width: 53.33,
        endZoneDepth: 10,
      },
      tickRate: 60,
      physics: {
        ballSpeed: 25, // Updated from research: ~55mph average NFL QB velocity
        tackleRadius: 1.5, // Research shows 1.5 yards is standard tackling range
        catchRadius: 1.0,
        motionBoostPercent: 0.12, // Updated from research: 10-12% boost supported
        starBoostPercent: 0.10,
        motionBoostDuration: 0.35,
      },
      playerSpeeds: {
        QB: { min: 7.0, max: 8.5 }, // Updated from research: average 8.71 yd/s
        RB: { min: 8.5, max: 10.0 }, // Updated from research: average 8.87 yd/s
        WR: { min: 8.5, max: 10.5 }, // Updated from research: average 8.91 yd/s
        TE: { min: 7.5, max: 9.0 }, // Updated from research: average 8.46 yd/s
        FB: { min: 7.5, max: 8.5 }, // Conservative estimate based on TE data
        CB: { min: 8.8, max: 10.5 }, // Updated from research: average 8.99 yd/s
        S: { min: 8.2, max: 9.8 }, // Updated from research: average 8.79 yd/s
        LB: { min: 7.8, max: 9.2 }, // Updated from research: average 8.81 yd/s
        NB: { min: 8.7, max: 10.2 }, // Updated from research: between CB/S
      },
      gameplay: {
        minSackTime: 2.0,
        maxSackTime: 10.0,
        defaultSackTime: 5.0,
        challengeModeSackTime: 2.7,
        maxAudibles: 2,
      },
    };
  }

  private initializeGameState(): GameState {
    return {
      phase: 'pre-snap',
      timeElapsed: 0,
      sackTime: this.config.gameplay.defaultSackTime,
      players: [],
      ball: this.createBall(),
      isShowingDefense: true,
      audiblesUsed: 0,
      maxAudibles: this.config.gameplay.maxAudibles,
      gameMode: 'free-play',
    };
  }

  private createBall(): Ball {
    return {
      position: { x: 60, y: 26.665 }, // Start at midfield, middle hash
      velocity: { x: 0, y: 0 },
      state: 'held',
      timeInAir: 0,
      speed: this.config.physics.ballSpeed,
    };
  }

  // Public API Methods

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public setPlayConcept(concept: PlayConcept): void {
    this.gameState.playConcept = concept;
    this.setupPlayers();
  }

  public setCoverage(coverage: Coverage): void {
    this.gameState.coverage = coverage;
    this.setupDefense();
  }

  public setSackTime(seconds: number): void {
    const clampedTime = Math.max(
      this.config.gameplay.minSackTime,
      Math.min(this.config.gameplay.maxSackTime, seconds)
    );
    this.gameState.sackTime = clampedTime;
  }

  public setGameMode(mode: 'free-play' | 'challenge'): void {
    this.gameState.gameMode = mode;
    if (mode === 'challenge') {
      this.gameState.sackTime = this.config.gameplay.challengeModeSackTime;
      this.gameState.maxAudibles = 2;
      this.gameState.isShowingDefense = false;
    }
  }

  public snap(): boolean {
    if (this.gameState.phase !== 'pre-snap') return false;
    if (!this.gameState.playConcept || !this.gameState.coverage) return false;

    this.gameState.phase = 'post-snap';
    this.gameState.timeElapsed = 0;

    // Apply motion boosts to players who have them
    this.applyMotionBoosts();

    // Start the game loop
    this.startGameLoop();

    return true;
  }

  public throwTo(receiverId: string): boolean {
    if (this.gameState.phase !== 'post-snap') return false;
    if (this.gameState.ball.state !== 'held') return false;

    const receiver = this.gameState.players.find(p => p.id === receiverId && p.isEligible);
    if (!receiver) return false;

    // Calculate ball trajectory
    const qb = this.gameState.players.find(p => p.playerType === 'QB');
    if (!qb) return false;

    const throwDistance = Vector.distance(qb.position, receiver.position);
    const throwTime = Physics.timeToReach(qb.position, receiver.position, this.config.physics.ballSpeed);

    this.gameState.ball = {
      ...this.gameState.ball,
      state: 'thrown',
      targetPlayer: receiverId,
      timeInAir: 0,
      velocity: Vector.multiply(
        Vector.direction(qb.position, receiver.position),
        this.config.physics.ballSpeed
      ),
    };

    this.gameState.phase = 'ball-thrown';
    return true;
  }

  public reset(): void {
    this.stopGameLoop();
    this.gameState = this.initializeGameState();
  }

  // Game Loop Methods

  private startGameLoop(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTickTime = performance.now();

    const gameLoop = (currentTime: number) => {
      if (!this.isRunning) return;

      const deltaTime = (currentTime - this.lastTickTime) / 1000; // Convert to seconds
      this.lastTickTime = currentTime;

      this.tick(deltaTime);

      if (this.gameState.phase !== 'play-over') {
        this.animationFrameId = requestAnimationFrame(gameLoop);
      } else {
        this.stopGameLoop();
      }
    };

    this.animationFrameId = requestAnimationFrame(gameLoop);
  }

  private stopGameLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private tick(deltaTime: number): void {
    if (this.gameState.phase === 'pre-snap' || this.gameState.phase === 'play-over') {
      return;
    }

    this.gameState.timeElapsed += deltaTime;

    // Check for sack
    if (this.gameState.phase === 'post-snap' && this.gameState.timeElapsed >= this.gameState.sackTime) {
      this.endPlay({ type: 'sack', yards: 0, openness: 0, catchProbability: 0 });
      return;
    }

    // Update player positions
    this.updatePlayerPositions(deltaTime);

    // Update ball physics
    this.updateBallPhysics(deltaTime);

    // Check for catch/incompletion
    if (this.gameState.phase === 'ball-thrown') {
      this.checkForCatch();
    }
  }

  private updatePlayerPositions(deltaTime: number): void {
    this.gameState.players.forEach(player => {
      // Update motion boost
      if (player.hasMotionBoost) {
        player.motionBoostTimeLeft -= deltaTime;
        if (player.motionBoostTimeLeft <= 0) {
          player.hasMotionBoost = false;
          player.motionBoostTimeLeft = 0;
        }
      }

      // Calculate current speed with boosts
      let speed = player.maxSpeed;
      if (player.isStar) {
        speed *= (1 + this.config.physics.starBoostPercent);
      }
      if (player.hasMotionBoost) {
        speed *= (1 + this.config.physics.motionBoostPercent);
      }

      // Update position based on route or coverage
      if (player.team === 'offense' && player.route && player.playerType !== 'QB') {
        this.updateOffensivePlayerPosition(player, deltaTime, speed);
      } else if (player.team === 'defense' && player.coverageResponsibility) {
        this.updateDefensivePlayerPosition(player, deltaTime, speed);
      }

      // Clamp position to field bounds
      player.position = Field.clampToField(player.position);
    });
  }

  private updateOffensivePlayerPosition(player: Player, deltaTime: number, speed: number): void {
    if (!player.route) return;

    const targetPosition = Route.getPositionAtTime(
      player.route.waypoints,
      player.route.timing,
      this.gameState.timeElapsed
    );

    const direction = Vector.direction(player.position, targetPosition);
    const maxMovement = speed * deltaTime;
    const desiredMovement = Vector.multiply(direction, maxMovement);

    player.velocity = desiredMovement;
    player.position = Vector.add(player.position, desiredMovement);
    player.currentSpeed = Vector.magnitude(desiredMovement) / deltaTime;
  }

  private updateDefensivePlayerPosition(player: Player, deltaTime: number, speed: number): void {
    // Basic defensive AI - will be expanded later
    if (!player.coverageResponsibility) return;

    let targetPosition = player.position;

    if (player.coverageResponsibility.type === 'man' && player.coverageResponsibility.target) {
      // Man coverage - follow assigned receiver
      const target = this.gameState.players.find(p => p.id === player.coverageResponsibility?.target);
      if (target) {
        targetPosition = target.position;
      }
    } else if (player.coverageResponsibility.type === 'zone' && player.coverageResponsibility.zone) {
      // Zone coverage - stay in assigned zone (simplified)
      targetPosition = player.coverageResponsibility.zone.center;
    }

    const direction = Vector.direction(player.position, targetPosition);
    const maxMovement = speed * deltaTime * 0.9; // Slightly slower reaction

    player.velocity = Vector.multiply(direction, maxMovement);
    player.position = Vector.add(player.position, player.velocity);
    player.currentSpeed = Vector.magnitude(player.velocity) / deltaTime;
  }

  private updateBallPhysics(deltaTime: number): void {
    if (this.gameState.ball.state !== 'thrown') return;

    this.gameState.ball.timeInAir += deltaTime;
    this.gameState.ball.position = Vector.add(
      this.gameState.ball.position,
      Vector.multiply(this.gameState.ball.velocity, deltaTime)
    );

    // Clamp ball to field bounds
    this.gameState.ball.position = Field.clampToField(this.gameState.ball.position);
  }

  private checkForCatch(): void {
    if (!this.gameState.ball.targetPlayer) return;

    const receiver = this.gameState.players.find(p => p.id === this.gameState.ball.targetPlayer);
    if (!receiver) return;

    const ballToReceiver = Vector.distance(this.gameState.ball.position, receiver.position);

    if (ballToReceiver <= this.config.physics.catchRadius) {
      // Ball has reached receiver area - determine outcome
      const closestDefender = this.findClosestDefender(receiver.position);
      const separation = closestDefender
        ? Vector.distance(receiver.position, closestDefender.position)
        : 10; // No defender nearby

      const openness = Physics.separationToOpenness(separation, this.config.physics.tackleRadius);
      const catchProbability = this.calculateCatchProbability(openness, separation);

      // Determine outcome
      let outcome: PlayOutcome;

      if (separation <= this.config.physics.tackleRadius) {
        // Defender is in tackle radius - chance of interception
        if (Random.chance(0.3)) {
          outcome = {
            type: 'interception',
            defender: closestDefender?.id,
            yards: Field.coordsToYards(receiver.position).yardLine,
            openness,
            catchProbability,
          };
        } else {
          outcome = {
            type: 'incomplete',
            receiver: receiver.id,
            defender: closestDefender?.id,
            yards: 0,
            openness,
            catchProbability,
          };
        }
      } else if (Random.chance(catchProbability / 100)) {
        // Successful catch
        outcome = {
          type: 'catch',
          receiver: receiver.id,
          yards: Field.coordsToYards(receiver.position).yardLine,
          openness,
          catchProbability,
        };
      } else {
        // Dropped pass
        outcome = {
          type: 'incomplete',
          receiver: receiver.id,
          yards: 0,
          openness,
          catchProbability,
        };
      }

      this.endPlay(outcome);
    }
  }

  private findClosestDefender(position: Vector2D): Player | null {
    let closest: Player | null = null;
    let closestDistance = Infinity;

    this.gameState.players
      .filter(p => p.team === 'defense')
      .forEach(defender => {
        const distance = Vector.distance(position, defender.position);
        if (distance < closestDistance) {
          closest = defender;
          closestDistance = distance;
        }
      });

    return closest;
  }

  private calculateCatchProbability(openness: number, separation: number): number {
    // Base catch rate is high for wide open receivers
    let catchRate = Math.min(95, openness * 0.9 + 50);

    // Reduce catch rate if defender is very close
    if (separation < 2) {
      catchRate *= 0.7;
    } else if (separation < 3) {
      catchRate *= 0.85;
    }

    return Math.max(10, Math.min(95, catchRate));
  }

  private endPlay(outcome: PlayOutcome): void {
    this.gameState.outcome = outcome;
    this.gameState.phase = 'play-over';
    this.gameState.ball.state = outcome.type === 'catch' ? 'caught' :
      outcome.type === 'interception' ? 'intercepted' : 'incomplete';

    this.stopGameLoop();
  }

  // Helper methods for setup
  private setupPlayers(): void {
    if (!this.gameState.playConcept) return;

    const concept = this.gameState.playConcept;
    this.gameState.players = [];

    // Create offensive players based on formation
    Object.entries(concept.formation.positions).forEach(([playerId, position]) => {
      const playerType = this.getPlayerTypeFromId(playerId);
      const player: Player = {
        id: playerId,
        position: { ...position },
        velocity: { x: 0, y: 0 },
        team: 'offense',
        playerType,
        route: concept.routes[playerId],
        isEligible: this.isEligibleReceiver(playerType),
        maxSpeed: this.getPlayerSpeed(playerType),
        currentSpeed: 0,
        isStar: false,
        hasMotionBoost: false,
        motionBoostTimeLeft: 0,
      };

      this.gameState.players.push(player);
    });
  }

  private setupDefense(): void {
    if (!this.gameState.coverage) return;

    const coverage = this.gameState.coverage;

    // Create defensive players based on coverage
    coverage.responsibilities.forEach((responsibility) => {
      const position = this.getDefensivePosition(responsibility.playerId, coverage);
      const playerType = this.getPlayerTypeFromId(responsibility.playerId);

      const defender: Player = {
        id: responsibility.playerId,
        position: { ...position },
        velocity: { x: 0, y: 0 },
        team: 'defense',
        playerType,
        coverageResponsibility: responsibility,
        isEligible: false,
        maxSpeed: this.getPlayerSpeed(playerType),
        currentSpeed: 0,
        isStar: false,
        hasMotionBoost: false,
        motionBoostTimeLeft: 0,
      };

      this.gameState.players.push(defender);
    });
  }

  private getDefensivePosition(playerId: string, coverage: Coverage): Vector2D {
    // Get position from coverage data - this would come from our JSON
    // For now, return basic positions based on player type
    const playerType = this.getPlayerTypeFromId(playerId);

    switch (playerType) {
      case 'CB':
        return playerId === 'CB1' ? { x: 60, y: 8 } :
               playerId === 'CB2' ? { x: 60, y: 45 } : { x: 60, y: 38 };
      case 'S':
        return { x: 75, y: 26.665 };
      case 'LB':
        return playerId === 'LB1' ? { x: 58, y: 30 } :
               playerId === 'LB2' ? { x: 58, y: 23 } : { x: 58, y: 16 };
      default:
        return { x: 55, y: 26.665 };
    }
  }

  private applyMotionBoosts(): void {
    // Apply motion boost to players who have it
    this.gameState.players
      .filter(p => p.hasMotionBoost)
      .forEach(p => {
        p.motionBoostTimeLeft = this.config.physics.motionBoostDuration;
      });
  }

  private getPlayerTypeFromId(playerId: string): PlayerType {
    // Extract player type from ID (e.g., "QB1" -> "QB")
    const match = playerId.match(/^([A-Z]+)/);
    return (match ? match[1] : 'WR') as PlayerType;
  }

  private isEligibleReceiver(playerType: PlayerType): boolean {
    return ['WR', 'TE', 'RB'].includes(playerType);
  }

  private getPlayerSpeed(playerType: PlayerType): number {
    const speedRange = this.config.playerSpeeds[playerType];
    return Random.range(speedRange.min, speedRange.max);
  }
}