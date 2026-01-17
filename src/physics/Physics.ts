import { Vector2, Ball, Brick } from '../types';

export interface CollisionResult {
  collision: boolean;
  position: Vector2;
  normal: Vector2;
  distance: number;
}

export interface BrickBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class Physics {
  private gameWidth: number = 0;
  private _gameHeight: number = 0;
  private ballRadius: number = 8;
  private launchZoneTop: number = 0;

  updateDimensions(
    gameWidth: number,
    gameHeight: number,
    ballRadius: number,
    launchZoneTop: number
  ): void {
    this.gameWidth = gameWidth;
    this._gameHeight = gameHeight;
    this.ballRadius = ballRadius;
    this.launchZoneTop = launchZoneTop;
  }

  updateBall(ball: Ball, deltaTime: number, speedMultiplier: number): void {
    if (!ball.active) return;

    const dt = deltaTime * speedMultiplier;
    ball.position.x += ball.velocity.x * dt;
    ball.position.y += ball.velocity.y * dt;
  }

  checkWallCollision(ball: Ball): { collided: boolean; side: 'left' | 'right' | 'top' | null } {
    const r = this.ballRadius;

    // Left wall
    if (ball.position.x - r <= 0) {
      ball.position.x = r;
      ball.velocity.x = Math.abs(ball.velocity.x);
      return { collided: true, side: 'left' };
    }

    // Right wall
    if (ball.position.x + r >= this.gameWidth) {
      ball.position.x = this.gameWidth - r;
      ball.velocity.x = -Math.abs(ball.velocity.x);
      return { collided: true, side: 'right' };
    }

    // Top wall
    if (ball.position.y - r <= 0) {
      ball.position.y = r;
      ball.velocity.y = Math.abs(ball.velocity.y);
      return { collided: true, side: 'top' };
    }

    return { collided: false, side: null };
  }

  checkBottomCollision(ball: Ball): boolean {
    return ball.position.y + this.ballRadius >= this.launchZoneTop;
  }

  checkBrickCollision(
    ball: Ball,
    brickBounds: BrickBounds
  ): { collided: boolean; face: 'top' | 'bottom' | 'left' | 'right' | 'corner' | null } {
    const r = this.ballRadius;
    const bx = ball.position.x;
    const by = ball.position.y;

    // Expand brick bounds by ball radius for collision detection
    const expandedLeft = brickBounds.left - r;
    const expandedRight = brickBounds.right + r;
    const expandedTop = brickBounds.top - r;
    const expandedBottom = brickBounds.bottom + r;

    // Check if ball center is within expanded bounds
    if (bx < expandedLeft || bx > expandedRight || by < expandedTop || by > expandedBottom) {
      return { collided: false, face: null };
    }

    // Determine which face was hit based on ball position and velocity
    const overlapLeft = bx - expandedLeft;
    const overlapRight = expandedRight - bx;
    const overlapTop = by - expandedTop;
    const overlapBottom = expandedBottom - by;

    const minOverlapX = Math.min(overlapLeft, overlapRight);
    const minOverlapY = Math.min(overlapTop, overlapBottom);

    // Check corner collision (ball in corner region)
    const inCornerX = bx < brickBounds.left || bx > brickBounds.right;
    const inCornerY = by < brickBounds.top || by > brickBounds.bottom;

    if (inCornerX && inCornerY) {
      // Corner collision - determine which corner
      const cornerX = bx < brickBounds.left ? brickBounds.left : brickBounds.right;
      const cornerY = by < brickBounds.top ? brickBounds.top : brickBounds.bottom;
      const distToCorner = Math.sqrt((bx - cornerX) ** 2 + (by - cornerY) ** 2);

      if (distToCorner <= r) {
        // Reflect both components
        ball.velocity.x *= -1;
        ball.velocity.y *= -1;

        // Push ball out of corner
        const pushAngle = Math.atan2(by - cornerY, bx - cornerX);
        ball.position.x = cornerX + Math.cos(pushAngle) * (r + 1);
        ball.position.y = cornerY + Math.sin(pushAngle) * (r + 1);

        return { collided: true, face: 'corner' };
      }
      return { collided: false, face: null };
    }

    // Face collision
    if (minOverlapX < minOverlapY) {
      // Horizontal collision
      if (overlapLeft < overlapRight) {
        ball.velocity.x = -Math.abs(ball.velocity.x);
        ball.position.x = expandedLeft - 1;
        return { collided: true, face: 'left' };
      } else {
        ball.velocity.x = Math.abs(ball.velocity.x);
        ball.position.x = expandedRight + 1;
        return { collided: true, face: 'right' };
      }
    } else {
      // Vertical collision
      if (overlapTop < overlapBottom) {
        ball.velocity.y = -Math.abs(ball.velocity.y);
        ball.position.y = expandedTop - 1;
        return { collided: true, face: 'top' };
      } else {
        ball.velocity.y = Math.abs(ball.velocity.y);
        ball.position.y = expandedBottom + 1;
        return { collided: true, face: 'bottom' };
      }
    }
  }

  getBrickBounds(
    brick: Brick,
    cellWidth: number,
    cellHeight: number,
    gridOffsetX: number,
    gridOffsetY: number,
    gap: number
  ): BrickBounds {
    const x = gridOffsetX + brick.gridX * cellWidth + gap / 2;
    const y = gridOffsetY + brick.gridY * cellHeight + gap / 2;
    const width = cellWidth - gap;
    const height = cellHeight - gap;

    return {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
    };
  }

  // For trajectory prediction - returns intersection point with wall
  raycastWall(
    origin: Vector2,
    direction: Vector2
  ): { point: Vector2; normal: Vector2; distance: number } | null {
    const r = this.ballRadius;
    type HitResult = { point: Vector2; normal: Vector2; distance: number };
    const hits: HitResult[] = [];

    // Left wall
    if (direction.x < 0) {
      const t = (r - origin.x) / direction.x;
      if (t > 0) {
        const point = { x: r, y: origin.y + direction.y * t };
        if (point.y >= r && point.y <= this.launchZoneTop - r) {
          const dist = t * Math.sqrt(direction.x ** 2 + direction.y ** 2);
          hits.push({ point, normal: { x: 1, y: 0 }, distance: dist });
        }
      }
    }

    // Right wall
    if (direction.x > 0) {
      const t = (this.gameWidth - r - origin.x) / direction.x;
      if (t > 0) {
        const point = { x: this.gameWidth - r, y: origin.y + direction.y * t };
        if (point.y >= r && point.y <= this.launchZoneTop - r) {
          const dist = t * Math.sqrt(direction.x ** 2 + direction.y ** 2);
          hits.push({ point, normal: { x: -1, y: 0 }, distance: dist });
        }
      }
    }

    // Top wall
    if (direction.y < 0) {
      const t = (r - origin.y) / direction.y;
      if (t > 0) {
        const point = { x: origin.x + direction.x * t, y: r };
        if (point.x >= r && point.x <= this.gameWidth - r) {
          const dist = t * Math.sqrt(direction.x ** 2 + direction.y ** 2);
          hits.push({ point, normal: { x: 0, y: 1 }, distance: dist });
        }
      }
    }

    if (hits.length === 0) return null;
    return hits.reduce((closest, hit) => hit.distance < closest.distance ? hit : closest);
  }

  // For trajectory prediction - returns intersection point with brick
  raycastBrick(
    origin: Vector2,
    direction: Vector2,
    bounds: BrickBounds
  ): { point: Vector2; normal: Vector2; distance: number } | null {
    const r = this.ballRadius;

    // Expand bounds by ball radius
    const expanded = {
      left: bounds.left - r,
      right: bounds.right + r,
      top: bounds.top - r,
      bottom: bounds.bottom + r,
    };

    let tMin = 0;
    let tMax = Infinity;
    let hitNormal: Vector2 = { x: 0, y: 0 };
    let _hitFace: 'left' | 'right' | 'top' | 'bottom' | null = null;

    // Check X axis
    if (direction.x !== 0) {
      const t1 = (expanded.left - origin.x) / direction.x;
      const t2 = (expanded.right - origin.x) / direction.x;

      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);

      if (tNear > tMin) {
        tMin = tNear;
        hitNormal = direction.x > 0 ? { x: -1, y: 0 } : { x: 1, y: 0 };
        _hitFace = direction.x > 0 ? 'left' : 'right';
      }
      tMax = Math.min(tMax, tFar);
    } else {
      if (origin.x < expanded.left || origin.x > expanded.right) {
        return null;
      }
    }

    // Check Y axis
    if (direction.y !== 0) {
      const t1 = (expanded.top - origin.y) / direction.y;
      const t2 = (expanded.bottom - origin.y) / direction.y;

      const tNear = Math.min(t1, t2);
      const tFar = Math.max(t1, t2);

      if (tNear > tMin) {
        tMin = tNear;
        hitNormal = direction.y > 0 ? { x: 0, y: -1 } : { x: 0, y: 1 };
        _hitFace = direction.y > 0 ? 'top' : 'bottom';
      }
      tMax = Math.min(tMax, tFar);
    } else {
      if (origin.y < expanded.top || origin.y > expanded.bottom) {
        return null;
      }
    }

    if (tMin > tMax || tMin < 0) {
      return null;
    }

    const point = {
      x: origin.x + direction.x * tMin,
      y: origin.y + direction.y * tMin,
    };

    const distance = tMin * Math.sqrt(direction.x ** 2 + direction.y ** 2);

    return { point, normal: hitNormal, distance };
  }

  checkPickupCollision(
    ball: Ball,
    pickupX: number,
    pickupY: number,
    pickupRadius: number
  ): boolean {
    const dx = ball.position.x - pickupX;
    const dy = ball.position.y - pickupY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.ballRadius + pickupRadius;
  }
}
