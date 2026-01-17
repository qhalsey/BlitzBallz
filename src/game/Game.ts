import {
  Vector2,
  Ball,
  Brick,
  Pickup,
  GameState,
  SpeedMultiplier,
  GameSettings,
  HighScores,
  CollectEffect,
  TrajectoryPoint,
} from '../types';
import { Renderer } from '../rendering/Renderer';
import { Physics } from '../physics/Physics';
import { TrajectoryCalculator } from '../physics/TrajectoryCalculator';
import { GridManager } from '../managers/GridManager';
import { InputHandler, InputEvent } from '../input/InputHandler';
import {
  BALL_SPEED,
  BALL_LAUNCH_DELAY,
  MIN_LAUNCH_ANGLE,
  GRID_GAP,
  PICKUP_VALUES,
  PICKUP_COLORS,
  DESTROY_ANIMATION_DURATION,
  COLLECT_ANIMATION_DURATION,
  BRICK_MOVE_DURATION,
  STORAGE_KEYS,
} from '../constants';
export class Game {
  private _canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private physics: Physics;
  private trajectoryCalculator: TrajectoryCalculator;
  private gridManager: GridManager;
  private inputHandler: InputHandler;

  // Game state
  private state: GameState = 'menu';
  private previousState: GameState = 'menu';
  private level: number = 1;
  private ballCount: number = 1;
  private speedMultiplier: SpeedMultiplier = 1;
  private settings: GameSettings = {
    easyMode: false,
    soundEnabled: true,
    vibrationEnabled: true,
  };
  private highScores: HighScores = { normal: 0, easy: 0 };

  // Entity collections
  private balls: Ball[] = [];
  private bricks: Brick[] = [];
  private pickups: Pickup[] = [];
  private collectEffects: CollectEffect[] = [];

  // Launch state
  private launchPosition: Vector2 = { x: 0, y: 0 };
  private nextLaunchPosition: Vector2 | null = null;
  private aimDirection: Vector2 | null = null;
  private trajectoryPoints: TrajectoryPoint[] = [];
  private isMovingLaunchPoint: boolean = false;

  // Animation state
  private ballsLaunched: number = 0;
  private ballsReturned: number = 0;
  private lastLaunchTime: number = 0;
  private isAnimatingBricks: boolean = false;
  private brickAnimationProgress: number = 0;

  // Dimensions
  private gameWidth: number = 0;
  private gameHeight: number = 0;
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;
  private launchZoneTop: number = 0;
  private ballRadius: number = 8;
  private pickupRadius: number = 12;

  // Timing
  private lastFrameTime: number = 0;
  private nextBallId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.physics = new Physics();
    this.trajectoryCalculator = new TrajectoryCalculator(this.physics);
    this.gridManager = new GridManager();
    this.inputHandler = new InputHandler(canvas);

    this.loadSettings();
    this.setupInput();
    this.resize();

    window.addEventListener('resize', this.resize.bind(this));
  }

  private loadSettings(): void {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      if (savedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
      }

      const savedScores = localStorage.getItem(STORAGE_KEYS.highScores);
      if (savedScores) {
        this.highScores = { ...this.highScores, ...JSON.parse(savedScores) };
      }
    } catch {
      // Use defaults if loading fails
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(this.settings));
    } catch {
      // Ignore save failures
    }
  }

  private saveHighScores(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.highScores, JSON.stringify(this.highScores));
    } catch {
      // Ignore save failures
    }
  }

  private resize(): void {
    const dims = this.renderer.resize();
    this.gameWidth = dims.width;
    this.gameHeight = dims.height;
    this.cellWidth = dims.cellWidth;
    this.cellHeight = dims.cellHeight;
    this.gridOffsetX = dims.gridOffsetX;
    this.gridOffsetY = dims.gridOffsetY;
    this.launchZoneTop = dims.launchZoneTop;
    this.ballRadius = dims.ballRadius;
    this.pickupRadius = dims.pickupRadius;

    this.physics.updateDimensions(
      this.gameWidth,
      this.gameHeight,
      this.ballRadius,
      this.launchZoneTop
    );

    // Center launch position if not set
    if (this.launchPosition.x === 0) {
      this.launchPosition = { x: this.gameWidth / 2, y: this.launchZoneTop };
    }
  }

  private setupInput(): void {
    this.inputHandler.onInput(this.handleInput.bind(this));
  }

  private handleInput(event: InputEvent): void {
    const { type, position } = event;

    switch (this.state) {
      case 'menu':
        this.handleMenuInput(type, position);
        break;

      case 'aiming':
        this.handleAimingInput(type, position);
        break;

      case 'animating':
        this.handleAnimatingInput(type, position);
        break;

      case 'paused':
        this.handlePausedInput(type, position);
        break;

      case 'settings':
        this.handleSettingsInput(type, position);
        break;

      case 'gameOver':
        this.handleGameOverInput(type, position);
        break;
    }
  }

  private handleMenuInput(type: string, position: Vector2): void {
    if (type !== 'tap' && type !== 'aimEnd') return;

    const bounds = this.renderer.getMenuButtonBounds();

    if (this.isPointInBounds(position, bounds.play)) {
      this.startGame();
    } else if (this.isPointInBounds(position, bounds.settings)) {
      this.previousState = 'menu';
      this.state = 'settings';
    }
  }

  private handleAimingInput(type: string, position: Vector2): void {
    const launchY = this.renderer.getLaunchZoneY();

    if (type === 'aimStart') {
      // Check if clicking on launch point in easy mode
      if (this.settings.easyMode) {
        const distToLaunch = Math.sqrt(
          (position.x - this.launchPosition.x) ** 2 +
          (position.y - launchY) ** 2
        );
        if (distToLaunch < 30 * this.renderer.getScale()) {
          this.isMovingLaunchPoint = true;
          return;
        }
      }
      this.isMovingLaunchPoint = false;
    }

    if (type === 'aimMove') {
      if (this.isMovingLaunchPoint && this.settings.easyMode) {
        // Move launch point horizontally
        this.launchPosition.x = Math.max(
          this.ballRadius,
          Math.min(this.gameWidth - this.ballRadius, position.x)
        );
      } else {
        // Calculate aim direction (inverted for natural feel)
        const dx = this.launchPosition.x - position.x;
        const dy = launchY - position.y;

        // Only aim upward
        if (dy > 10) {
          const angle = Math.atan2(-dy, dx);
          const minAngleRad = (MIN_LAUNCH_ANGLE * Math.PI) / 180;

          // Clamp angle
          let clampedAngle = angle;
          if (clampedAngle > Math.PI / 2 - minAngleRad) {
            clampedAngle = Math.PI / 2 - minAngleRad;
          } else if (clampedAngle < -Math.PI / 2 + minAngleRad) {
            clampedAngle = -Math.PI / 2 + minAngleRad;
          }

          this.aimDirection = {
            x: Math.cos(clampedAngle),
            y: -Math.abs(Math.sin(clampedAngle)),
          };

          // Calculate trajectory preview
          this.trajectoryPoints = this.trajectoryCalculator.calculateTrajectory(
            { x: this.launchPosition.x, y: launchY },
            this.aimDirection,
            this.bricks,
            this.cellWidth,
            this.cellHeight,
            this.gridOffsetX,
            this.gridOffsetY,
            GRID_GAP * this.renderer.getScale(),
            this.launchZoneTop
          );
        }
      }
    }

    if (type === 'aimEnd' && this.aimDirection && !this.isMovingLaunchPoint) {
      this.launchBalls();
    }

    if (type === 'tap') {
      // Check for pause (escape key sends tap at -1, -1)
      if (position.x === -1 && position.y === -1) {
        this.previousState = 'aiming';
        this.state = 'paused';
      }
    }

    this.isMovingLaunchPoint = false;
  }

  private handleAnimatingInput(type: string, position: Vector2): void {
    if (type !== 'tap') return;

    // Check speed button
    const speedBounds = this.renderer.getSpeedButtonBounds();
    if (this.isPointInBounds(position, speedBounds)) {
      this.cycleSpeed();
      return;
    }

    // Check for pause
    if (position.x === -1 && position.y === -1) {
      this.previousState = 'animating';
      this.state = 'paused';
    }
  }

  private handlePausedInput(type: string, position: Vector2): void {
    if (type !== 'tap' && type !== 'aimEnd') return;

    const bounds = this.renderer.getPauseButtonBounds();

    if (this.isPointInBounds(position, bounds.resume)) {
      this.state = this.previousState;
    } else if (this.isPointInBounds(position, bounds.restart)) {
      this.startGame();
    } else if (this.isPointInBounds(position, bounds.settings)) {
      this.previousState = 'paused';
      this.state = 'settings';
    }
  }

  private handleSettingsInput(type: string, position: Vector2): void {
    if (type !== 'tap' && type !== 'aimEnd') return;

    const bounds = this.renderer.getSettingsButtonBounds();

    if (this.isPointInBounds(position, bounds.toggle)) {
      this.settings.easyMode = !this.settings.easyMode;
      this.saveSettings();
    } else if (this.isPointInBounds(position, bounds.back)) {
      this.state = this.previousState;
    }
  }

  private handleGameOverInput(type: string, position: Vector2): void {
    if (type !== 'tap' && type !== 'aimEnd') return;

    const bounds = this.renderer.getGameOverButtonBounds();

    if (this.isPointInBounds(position, bounds.playAgain)) {
      this.startGame();
    }
  }

  private isPointInBounds(
    point: Vector2,
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      point.x >= bounds.x - bounds.width / 2 &&
      point.x <= bounds.x + bounds.width / 2 &&
      point.y >= bounds.y - bounds.height / 2 &&
      point.y <= bounds.y + bounds.height / 2
    );
  }

  private cycleSpeed(): void {
    switch (this.speedMultiplier) {
      case 1:
        this.speedMultiplier = 2;
        break;
      case 2:
        this.speedMultiplier = 4;
        break;
      case 4:
        this.speedMultiplier = 1;
        break;
    }
  }

  private startGame(): void {
    this.level = 1;
    this.ballCount = 1;
    this.balls = [];
    this.bricks = [];
    this.pickups = [];
    this.collectEffects = [];
    this.speedMultiplier = 1;
    this.nextBallId = 0;

    this.launchPosition = { x: this.gameWidth / 2, y: this.launchZoneTop };
    this.nextLaunchPosition = null;
    this.aimDirection = null;
    this.trajectoryPoints = [];

    // Spawn initial row
    this.spawnNewRow();

    this.state = 'aiming';
  }

  private spawnNewRow(): void {
    const { bricks, pickups } = this.gridManager.spawnNewRow(
      this.level,
      this.bricks,
      this.pickups
    );

    this.bricks.push(...bricks);
    this.pickups.push(...pickups);
  }

  private launchBalls(): void {
    if (!this.aimDirection) return;

    this.state = 'launching';
    this.ballsLaunched = 0;
    this.ballsReturned = 0;
    this.nextLaunchPosition = null;
    this.lastLaunchTime = 0;

    // Create balls but don't activate them yet
    const launchY = this.renderer.getLaunchZoneY();
    const speed = BALL_SPEED * this.renderer.getScale();

    for (let i = 0; i < this.ballCount; i++) {
      this.balls.push({
        id: this.nextBallId++,
        position: { x: this.launchPosition.x, y: launchY },
        velocity: {
          x: this.aimDirection.x * speed,
          y: this.aimDirection.y * speed,
        },
        active: false,
      });
    }

    this.state = 'animating';
  }

  private update(deltaTime: number): void {
    if (this.state === 'animating') {
      this.updateAnimating(deltaTime);
    }

    // Update collect effects
    this.updateCollectEffects(deltaTime);

    // Update destroying bricks
    this.updateDestroyingBricks(deltaTime);

    // Update collected pickups
    this.updateCollectedPickups(deltaTime);

    // Update brick movement animation
    if (this.isAnimatingBricks) {
      this.brickAnimationProgress += deltaTime / BRICK_MOVE_DURATION;
      if (this.brickAnimationProgress >= 1) {
        this.isAnimatingBricks = false;
        this.brickAnimationProgress = 0;
      }
    }
  }

  private updateAnimating(deltaTime: number): void {
    const currentTime = performance.now();
    const launchDelay = BALL_LAUNCH_DELAY / this.speedMultiplier;

    // Launch balls sequentially
    if (this.ballsLaunched < this.balls.length) {
      if (currentTime - this.lastLaunchTime >= launchDelay) {
        this.balls[this.ballsLaunched].active = true;
        this.ballsLaunched++;
        this.lastLaunchTime = currentTime;
      }
    }

    // Update active balls
    const gap = GRID_GAP * this.renderer.getScale();

    for (const ball of this.balls) {
      if (!ball.active) continue;

      // Update position
      this.physics.updateBall(ball, deltaTime, this.speedMultiplier);

      // Check wall collisions
      this.physics.checkWallCollision(ball);

      // Check brick collisions
      for (const brick of this.bricks) {
        if (brick.destroying) continue;

        const bounds = this.physics.getBrickBounds(
          brick,
          this.cellWidth,
          this.cellHeight,
          this.gridOffsetX,
          this.gridOffsetY,
          gap
        );

        const collision = this.physics.checkBrickCollision(ball, bounds);
        if (collision.collided) {
          brick.hits--;
          if (brick.hits <= 0) {
            brick.destroying = true;
            brick.destroyProgress = 0;
          }
        }
      }

      // Check pickup collisions
      for (const pickup of this.pickups) {
        if (pickup.collected) continue;

        const pickupX = pickup.gridX * this.cellWidth + this.cellWidth / 2;
        const pickupY = this.gridOffsetY + pickup.gridY * this.cellHeight + this.cellHeight / 2;

        if (this.physics.checkPickupCollision(ball, pickupX, pickupY, this.pickupRadius)) {
          pickup.collected = true;
          pickup.collectProgress = 0;

          // Add balls
          const value = PICKUP_VALUES[pickup.type];
          this.ballCount += value;

          // Create collect effect
          this.collectEffects.push({
            x: pickupX,
            y: pickupY,
            text: `+${value}`,
            progress: 0,
            color: PICKUP_COLORS[pickup.type],
          });
        }
      }

      // Check bottom collision
      if (this.physics.checkBottomCollision(ball)) {
        ball.active = false;
        this.ballsReturned++;

        // First ball sets next launch position
        if (this.nextLaunchPosition === null) {
          this.nextLaunchPosition = {
            x: Math.max(
              this.ballRadius,
              Math.min(this.gameWidth - this.ballRadius, ball.position.x)
            ),
            y: this.launchZoneTop,
          };
        }
      }
    }

    // Check if all balls returned
    if (this.ballsReturned >= this.balls.length && this.balls.length > 0) {
      this.endTurn();
    }
  }

  private endTurn(): void {
    // Clear balls
    this.balls = [];

    // Update launch position
    if (this.nextLaunchPosition) {
      this.launchPosition = this.nextLaunchPosition;
    }

    // Remove destroyed bricks
    this.bricks = this.bricks.filter((b) => !b.destroying || b.destroyProgress < 1);

    // Remove collected pickups
    this.pickups = this.pickups.filter((p) => !p.collected || p.collectProgress < 1);

    // Move bricks and pickups down
    this.gridManager.moveBricksDown(this.bricks);
    this.gridManager.movePickupsDown(this.pickups);

    // Remove pickups that fell off bottom
    this.pickups = this.gridManager.removeBottomPickups(this.pickups);

    // Check game over
    if (this.gridManager.checkGameOver(this.bricks)) {
      this.handleGameOver();
      return;
    }

    // Increment level
    this.level++;

    // Spawn new row
    this.spawnNewRow();

    // Reset state
    this.aimDirection = null;
    this.trajectoryPoints = [];
    this.speedMultiplier = 1;

    this.state = 'aiming';
  }

  private handleGameOver(): void {
    const scoreKey = this.settings.easyMode ? 'easy' : 'normal';
    const isHighScore = this.level > this.highScores[scoreKey];

    if (isHighScore) {
      this.highScores[scoreKey] = this.level;
      this.saveHighScores();
    }

    this.state = 'gameOver';
  }

  private updateCollectEffects(deltaTime: number): void {
    for (const effect of this.collectEffects) {
      effect.progress += deltaTime / (COLLECT_ANIMATION_DURATION / 1000);
    }
    this.collectEffects = this.collectEffects.filter((e) => e.progress < 1);
  }

  private updateDestroyingBricks(deltaTime: number): void {
    for (const brick of this.bricks) {
      if (brick.destroying) {
        brick.destroyProgress += deltaTime / (DESTROY_ANIMATION_DURATION / 1000);
      }
    }
  }

  private updateCollectedPickups(deltaTime: number): void {
    for (const pickup of this.pickups) {
      if (pickup.collected) {
        pickup.collectProgress += deltaTime / (COLLECT_ANIMATION_DURATION / 1000);
      }
    }
  }

  private render(): void {
    this.renderer.clear();

    switch (this.state) {
      case 'menu':
        this.renderer.drawStartScreen(this.highScores.normal, this.highScores.easy);
        break;

      case 'aiming':
      case 'launching':
      case 'animating':
        this.renderGameplay();
        break;

      case 'paused':
        this.renderGameplay();
        this.renderer.drawPauseScreen();
        break;

      case 'settings':
        if (this.previousState === 'menu') {
          this.renderer.drawStartScreen(this.highScores.normal, this.highScores.easy);
        } else {
          this.renderGameplay();
        }
        this.renderer.drawSettingsScreen(this.settings.easyMode);
        break;

      case 'gameOver':
        this.renderGameplay();
        const scoreKey = this.settings.easyMode ? 'easy' : 'normal';
        const isHighScore = this.level >= this.highScores[scoreKey];
        this.renderer.drawGameOverScreen(this.level, isHighScore, this.highScores[scoreKey]);
        break;
    }
  }

  private renderGameplay(): void {
    this.renderer.drawBackground();

    const currentHighScore = this.settings.easyMode
      ? this.highScores.easy
      : this.highScores.normal;
    this.renderer.drawHeader(this.level, this.ballCount, currentHighScore, this.settings.easyMode);

    // Get max hits for color scaling
    const maxHits = Math.max(...this.bricks.map((b) => b.hits), 1);

    // Draw bricks
    for (const brick of this.bricks) {
      this.renderer.drawBrick(brick, maxHits);
    }

    // Draw pickups
    for (const pickup of this.pickups) {
      this.renderer.drawPickup(pickup);
    }

    // Draw balls
    for (const ball of this.balls) {
      this.renderer.drawBall(ball);
    }

    // Draw collect effects
    this.renderer.drawCollectEffects(this.collectEffects);

    // Draw launch point
    this.renderer.drawLaunchPoint(
      this.launchPosition,
      this.settings.easyMode,
      this.isMovingLaunchPoint
    );

    // Draw trajectory preview when aiming
    if (this.state === 'aiming' && this.trajectoryPoints.length > 0) {
      this.renderer.drawTrajectory(this.trajectoryPoints);
    }

    // Draw speed button during animation
    const isAnimating = this.state === 'animating' || this.state === 'launching';
    this.renderer.drawSpeedButton(this.speedMultiplier, isAnimating);

    // Draw balls in flight counter
    if (isAnimating) {
      const inFlight = this.balls.filter((b) => b.active).length;
      this.renderer.drawBallsInFlightCounter(inFlight);
    }
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1); // Cap at 100ms
    this.lastFrameTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  };
}
