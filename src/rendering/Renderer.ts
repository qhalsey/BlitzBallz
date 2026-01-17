import {
  Vector2,
  Ball,
  Brick,
  Pickup,
  TrajectoryPoint,
  CollectEffect,
  SpeedMultiplier,
} from '../types';
import {
  COLORS,
  GRID_COLS,
  GRID_ROWS,
  GRID_GAP,
  PICKUP_COLORS,
  PICKUP_VALUES,
  TRAJECTORY_DASH_LENGTH,
  TRAJECTORY_GAP_LENGTH,
  TRAJECTORY_LINE_WIDTH,
  TRAJECTORY_BOUNCE_RADIUS,
  HEADER_HEIGHT_RATIO,
  LAUNCH_ZONE_RATIO,
} from '../constants';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Cached dimensions
  private width: number = 0;
  private height: number = 0;
  private headerHeight: number = 0;
  private launchZoneHeight: number = 0;
  private gridHeight: number = 0;
  private gridOffsetY: number = 0;
  private cellWidth: number = 0;
  private cellHeight: number = 0;
  private ballRadius: number = 8;
  private pickupRadius: number = 12;
  private scale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  resize(): { width: number; height: number; cellWidth: number; cellHeight: number; gridOffsetX: number; gridOffsetY: number; launchZoneTop: number; ballRadius: number; pickupRadius: number } {
    const container = this.canvas.parentElement!;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Calculate aspect ratio based on grid (7 cols x ~12 rows including header/launch)
    const targetAspect = 7 / 12;
    let width: number;
    let height: number;

    if (containerWidth / containerHeight > targetAspect) {
      // Container is wider - height constrained
      height = containerHeight;
      width = height * targetAspect;
    } else {
      // Container is taller - width constrained
      width = containerWidth;
      height = width / targetAspect;
    }

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.scale(dpr, dpr);

    this.width = width;
    this.height = height;
    this.scale = width / 350; // Base width for scaling

    this.headerHeight = height * HEADER_HEIGHT_RATIO;
    this.launchZoneHeight = height * LAUNCH_ZONE_RATIO;
    this.gridHeight = height - this.headerHeight - this.launchZoneHeight;
    this.gridOffsetY = this.headerHeight;

    this.cellWidth = width / GRID_COLS;
    this.cellHeight = this.gridHeight / GRID_ROWS;

    this.ballRadius = 8 * this.scale;
    this.pickupRadius = 12 * this.scale;

    return {
      width,
      height,
      cellWidth: this.cellWidth,
      cellHeight: this.cellHeight,
      gridOffsetX: 0,
      gridOffsetY: this.gridOffsetY,
      launchZoneTop: this.headerHeight + this.gridHeight,
      ballRadius: this.ballRadius,
      pickupRadius: this.pickupRadius,
    };
  }

  clear(): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    // Grid background
    this.ctx.fillStyle = COLORS.gridBackground;
    this.ctx.fillRect(0, this.gridOffsetY, this.width, this.gridHeight);

    // Grid lines (subtle)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let i = 1; i < GRID_COLS; i++) {
      const x = i * this.cellWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.gridOffsetY);
      this.ctx.lineTo(x, this.gridOffsetY + this.gridHeight);
      this.ctx.stroke();
    }

    for (let i = 1; i < GRID_ROWS; i++) {
      const y = this.gridOffsetY + i * this.cellHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  drawHeader(level: number, ballCount: number, highScore: number, easyMode: boolean): void {
    const padding = 10 * this.scale;
    const fontSize = 14 * this.scale;

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
    this.ctx.textBaseline = 'middle';

    // Level (left)
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Level ${level}`, padding, this.headerHeight / 2);

    // Ball count (center)
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`x${ballCount}`, this.width / 2, this.headerHeight / 2);

    // High score (right)
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Best: ${highScore}`, this.width - padding, this.headerHeight / 2);

    // Easy mode badge
    if (easyMode) {
      const badgeWidth = 40 * this.scale;
      const badgeHeight = 16 * this.scale;
      const badgeX = this.width / 2 - badgeWidth / 2;
      const badgeY = this.headerHeight / 2 + fontSize;

      this.ctx.fillStyle = COLORS.easyBadge;
      this.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4 * this.scale);
      this.ctx.fill();

      this.ctx.fillStyle = '#000';
      this.ctx.font = `bold ${8 * this.scale}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.fillText('EASY', this.width / 2, badgeY + badgeHeight / 2 + 1);
    }
  }

  drawBrick(brick: Brick, maxHits: number): void {
    const gap = GRID_GAP * this.scale;
    const x = brick.gridX * this.cellWidth + gap / 2;
    const y = this.gridOffsetY + brick.gridY * this.cellHeight + gap / 2;
    const w = this.cellWidth - gap;
    const h = this.cellHeight - gap;

    // Destruction animation
    let alpha = 1;
    let scale = 1;
    if (brick.destroying) {
      alpha = 1 - brick.destroyProgress;
      scale = 1 + brick.destroyProgress * 0.3;
    }

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    if (scale !== 1) {
      const centerX = x + w / 2;
      const centerY = y + h / 2;
      this.ctx.translate(centerX, centerY);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-centerX, -centerY);
    }

    // Color based on hit count relative to max
    const ratio = brick.hits / Math.max(maxHits, 1);
    let color: string;
    if (ratio <= 0.33) {
      color = COLORS.brickLow;
    } else if (ratio <= 0.66) {
      color = COLORS.brickMid;
    } else {
      color = COLORS.brickHigh;
    }

    // Draw brick
    this.ctx.fillStyle = color;
    this.roundRect(x, y, w, h, 4 * this.scale);
    this.ctx.fill();

    // Draw hit count
    this.ctx.fillStyle = '#000';
    const fontSize = Math.min(w, h) * 0.4;
    this.ctx.font = `bold ${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(brick.hits.toString(), x + w / 2, y + h / 2);

    this.ctx.restore();
  }

  drawPickup(pickup: Pickup): void {
    const x = pickup.gridX * this.cellWidth + this.cellWidth / 2;
    const y = this.gridOffsetY + pickup.gridY * this.cellHeight + this.cellHeight / 2;

    let alpha = 1;
    let scale = 1;
    if (pickup.collected) {
      alpha = 1 - pickup.collectProgress;
      scale = 1 + pickup.collectProgress * 0.5;
    }

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    if (scale !== 1) {
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-x, -y);
    }

    const color = PICKUP_COLORS[pickup.type];
    const value = PICKUP_VALUES[pickup.type];

    // Glow effect
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 10 * this.scale;

    // Draw circle
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.pickupRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    // Draw text
    this.ctx.fillStyle = pickup.type === 'ball' ? '#000' : '#fff';
    const fontSize = this.pickupRadius * (value >= 10 ? 0.7 : 0.9);
    this.ctx.font = `bold ${fontSize}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    const text = pickup.type === 'ball' ? '+1' : `x${value}`;
    this.ctx.fillText(text, x, y);

    this.ctx.restore();
  }

  drawBall(ball: Ball): void {
    if (!ball.active) return;

    // Glow
    this.ctx.shadowColor = COLORS.ballGlow;
    this.ctx.shadowBlur = 6 * this.scale;

    this.ctx.fillStyle = COLORS.ball;
    this.ctx.beginPath();
    this.ctx.arc(ball.position.x, ball.position.y, this.ballRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  drawLaunchPoint(position: Vector2, easyMode: boolean, isMoving: boolean): void {
    const y = this.headerHeight + this.gridHeight + this.launchZoneHeight / 2;

    // Draw launch point indicator
    this.ctx.fillStyle = COLORS.launchPoint;

    if (easyMode && isMoving) {
      // Pulsing effect when in move mode
      this.ctx.shadowColor = COLORS.launchPoint;
      this.ctx.shadowBlur = 15 * this.scale;
    }

    this.ctx.beginPath();
    this.ctx.arc(position.x, y, this.ballRadius * 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    // Arrow indicator above
    this.ctx.beginPath();
    this.ctx.moveTo(position.x, y - this.ballRadius * 2.5);
    this.ctx.lineTo(position.x - 6 * this.scale, y - this.ballRadius * 3.5);
    this.ctx.lineTo(position.x + 6 * this.scale, y - this.ballRadius * 3.5);
    this.ctx.closePath();
    this.ctx.fill();
  }

  drawTrajectory(points: TrajectoryPoint[]): void {
    if (points.length < 2) return;

    this.ctx.save();
    this.ctx.lineWidth = TRAJECTORY_LINE_WIDTH * this.scale;
    this.ctx.lineCap = 'round';

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];

      // Fade opacity with each bounce
      const opacity = 1 - i * 0.25;
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.6})`;

      // Draw dashed line
      this.ctx.setLineDash([TRAJECTORY_DASH_LENGTH * this.scale, TRAJECTORY_GAP_LENGTH * this.scale]);
      this.ctx.beginPath();
      this.ctx.moveTo(start.position.x, start.position.y);
      this.ctx.lineTo(end.position.x, end.position.y);
      this.ctx.stroke();

      // Draw bounce point indicator
      if (end.isBounce) {
        this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`;
        this.ctx.beginPath();
        this.ctx.arc(end.position.x, end.position.y, TRAJECTORY_BOUNCE_RADIUS * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    this.ctx.setLineDash([]);
    this.ctx.restore();
  }

  drawCollectEffects(effects: CollectEffect[]): void {
    for (const effect of effects) {
      const alpha = 1 - effect.progress;
      const offsetY = -30 * this.scale * effect.progress;

      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = effect.color;
      this.ctx.font = `bold ${16 * this.scale}px sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(effect.text, effect.x, effect.y + offsetY);
      this.ctx.restore();
    }
  }

  drawSpeedButton(speedMultiplier: SpeedMultiplier, isAnimating: boolean): void {
    if (!isAnimating) return;

    const buttonSize = 40 * this.scale;
    const x = this.width - buttonSize - 10 * this.scale;
    const y = this.height - this.launchZoneHeight / 2 - buttonSize / 2;

    // Button background
    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    this.roundRect(x, y, buttonSize, buttonSize, 8 * this.scale);
    this.ctx.fill();

    // Speed indicator
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `bold ${14 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let text: string;
    switch (speedMultiplier) {
      case 1: text = '>'; break;
      case 2: text = '>>'; break;
      case 4: text = '>>>'; break;
    }
    this.ctx.fillText(text, x + buttonSize / 2, y + buttonSize / 2);
  }

  drawBallsInFlightCounter(count: number): void {
    if (count <= 0) return;

    const fontSize = 12 * this.scale;
    const padding = 10 * this.scale;
    const y = this.height - this.launchZoneHeight / 2;

    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.font = `${fontSize}px sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`${count} in flight`, padding, y);
  }

  drawMenuOverlay(): void {
    this.ctx.fillStyle = COLORS.overlay;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawStartScreen(highScoreNormal: number, _highScoreEasy: number): void {
    this.drawMenuOverlay();

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Title
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${32 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('BallBlitz', centerX, centerY - 80 * this.scale);

    // High scores
    this.ctx.font = `${14 * this.scale}px sans-serif`;
    this.ctx.fillStyle = COLORS.textSecondary;
    this.ctx.fillText(`Best: Level ${highScoreNormal}`, centerX, centerY - 40 * this.scale);

    // Play button
    this.drawButton(centerX, centerY + 20 * this.scale, 'Play', 120 * this.scale, 44 * this.scale);

    // Settings button
    this.drawButton(centerX, centerY + 80 * this.scale, 'Settings', 100 * this.scale, 36 * this.scale, true);
  }

  drawPauseScreen(): void {
    this.drawMenuOverlay();

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Title
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${24 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Paused', centerX, centerY - 80 * this.scale);

    // Buttons
    this.drawButton(centerX, centerY - 20 * this.scale, 'Resume', 100 * this.scale, 40 * this.scale);
    this.drawButton(centerX, centerY + 30 * this.scale, 'Restart', 100 * this.scale, 40 * this.scale, true);
    this.drawButton(centerX, centerY + 80 * this.scale, 'Settings', 100 * this.scale, 40 * this.scale, true);
  }

  drawSettingsScreen(easyMode: boolean): void {
    this.drawMenuOverlay();

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Title
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${24 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Settings', centerX, centerY - 80 * this.scale);

    // Easy mode toggle
    this.drawToggle(centerX, centerY - 20 * this.scale, 'Easy Mode', easyMode);

    // Back button
    this.drawButton(centerX, centerY + 80 * this.scale, 'Back', 100 * this.scale, 40 * this.scale);
  }

  drawGameOverScreen(level: number, isHighScore: boolean, highScore: number): void {
    this.drawMenuOverlay();

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Game Over
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${28 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Game Over', centerX, centerY - 80 * this.scale);

    // Level reached
    this.ctx.font = `${18 * this.scale}px sans-serif`;
    this.ctx.fillText(`Level ${level}`, centerX, centerY - 40 * this.scale);

    // High score indicator
    if (isHighScore) {
      this.ctx.fillStyle = COLORS.easyBadge;
      this.ctx.font = `bold ${14 * this.scale}px sans-serif`;
      this.ctx.fillText('New High Score!', centerX, centerY - 10 * this.scale);
    } else {
      this.ctx.fillStyle = COLORS.textSecondary;
      this.ctx.font = `${14 * this.scale}px sans-serif`;
      this.ctx.fillText(`Best: Level ${highScore}`, centerX, centerY - 10 * this.scale);
    }

    // Play again button
    this.drawButton(centerX, centerY + 50 * this.scale, 'Play Again', 120 * this.scale, 44 * this.scale);
  }

  private drawButton(x: number, y: number, text: string, width: number, height: number, secondary: boolean = false): void {
    const buttonX = x - width / 2;
    const buttonY = y - height / 2;

    this.ctx.fillStyle = secondary ? 'rgba(255, 255, 255, 0.1)' : COLORS.buttonPrimary;
    this.roundRect(buttonX, buttonY, width, height, 8 * this.scale);
    this.ctx.fill();

    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `bold ${14 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
  }

  private drawToggle(x: number, y: number, label: string, enabled: boolean): void {
    const toggleWidth = 50 * this.scale;
    const toggleHeight = 26 * this.scale;
    const _labelWidth = 100 * this.scale;

    // Label
    this.ctx.fillStyle = COLORS.textPrimary;
    this.ctx.font = `${14 * this.scale}px sans-serif`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(label, x - 10 * this.scale, y);

    // Toggle background
    const toggleX = x + 10 * this.scale;
    const toggleY = y - toggleHeight / 2;
    this.ctx.fillStyle = enabled ? COLORS.buttonPrimary : 'rgba(255, 255, 255, 0.2)';
    this.roundRect(toggleX, toggleY, toggleWidth, toggleHeight, toggleHeight / 2);
    this.ctx.fill();

    // Toggle knob
    const knobRadius = (toggleHeight - 4 * this.scale) / 2;
    const knobX = enabled
      ? toggleX + toggleWidth - knobRadius - 2 * this.scale
      : toggleX + knobRadius + 2 * this.scale;
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(knobX, y, knobRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private roundRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  // Hit detection for UI elements
  isPointInButton(point: Vector2, buttonX: number, buttonY: number, width: number, height: number): boolean {
    return (
      point.x >= buttonX - width / 2 &&
      point.x <= buttonX + width / 2 &&
      point.y >= buttonY - height / 2 &&
      point.y <= buttonY + height / 2
    );
  }

  getSpeedButtonBounds(): { x: number; y: number; width: number; height: number } {
    const buttonSize = 40 * this.scale;
    return {
      x: this.width - buttonSize - 10 * this.scale,
      y: this.height - this.launchZoneHeight / 2 - buttonSize / 2,
      width: buttonSize,
      height: buttonSize,
    };
  }

  getMenuButtonBounds(): { play: { x: number; y: number; width: number; height: number }; settings: { x: number; y: number; width: number; height: number } } {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      play: {
        x: centerX,
        y: centerY + 20 * this.scale,
        width: 120 * this.scale,
        height: 44 * this.scale,
      },
      settings: {
        x: centerX,
        y: centerY + 80 * this.scale,
        width: 100 * this.scale,
        height: 36 * this.scale,
      },
    };
  }

  getPauseButtonBounds(): { resume: { x: number; y: number; width: number; height: number }; restart: { x: number; y: number; width: number; height: number }; settings: { x: number; y: number; width: number; height: number } } {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const bw = 100 * this.scale;
    const bh = 40 * this.scale;

    return {
      resume: { x: centerX, y: centerY - 20 * this.scale, width: bw, height: bh },
      restart: { x: centerX, y: centerY + 30 * this.scale, width: bw, height: bh },
      settings: { x: centerX, y: centerY + 80 * this.scale, width: bw, height: bh },
    };
  }

  getSettingsButtonBounds(): { toggle: { x: number; y: number; width: number; height: number }; back: { x: number; y: number; width: number; height: number } } {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      toggle: {
        x: centerX + 35 * this.scale,
        y: centerY - 20 * this.scale,
        width: 50 * this.scale,
        height: 26 * this.scale,
      },
      back: {
        x: centerX,
        y: centerY + 80 * this.scale,
        width: 100 * this.scale,
        height: 40 * this.scale,
      },
    };
  }

  getGameOverButtonBounds(): { playAgain: { x: number; y: number; width: number; height: number } } {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      playAgain: {
        x: centerX,
        y: centerY + 50 * this.scale,
        width: 120 * this.scale,
        height: 44 * this.scale,
      },
    };
  }

  getLaunchZoneY(): number {
    return this.headerHeight + this.gridHeight + this.launchZoneHeight / 2;
  }

  getScale(): number {
    return this.scale;
  }

  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
