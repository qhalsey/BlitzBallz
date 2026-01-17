import { Vector2, Brick, TrajectoryPoint } from '../types';
import { Physics } from './Physics';
import { normalizeVector, reflectVector } from '../utils/Vector2';
import { MAX_TRAJECTORY_BOUNCES } from '../constants';

export class TrajectoryCalculator {
  private physics: Physics;

  constructor(physics: Physics) {
    this.physics = physics;
  }

  calculateTrajectory(
    startPosition: Vector2,
    direction: Vector2,
    bricks: Brick[],
    cellWidth: number,
    cellHeight: number,
    gridOffsetX: number,
    gridOffsetY: number,
    gap: number,
    launchZoneTop: number
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const normalizedDir = normalizeVector(direction);

    let currentPos = { ...startPosition };
    let currentDir = { ...normalizedDir };
    let bounceCount = 0;

    // Add starting point
    points.push({ position: { ...currentPos }, isBounce: false });

    while (bounceCount < MAX_TRAJECTORY_BOUNCES) {
      // Find closest collision (wall or brick)
      let closestHit: { point: Vector2; normal: Vector2; distance: number } | null = null;

      // Check wall collisions
      const wallHit = this.physics.raycastWall(currentPos, currentDir);
      if (wallHit && wallHit.distance > 0.1) {
        closestHit = wallHit;
      }

      // Check brick collisions
      for (const brick of bricks) {
        if (brick.destroying) continue;

        const bounds = this.physics.getBrickBounds(
          brick,
          cellWidth,
          cellHeight,
          gridOffsetX,
          gridOffsetY,
          gap
        );

        const brickHit = this.physics.raycastBrick(currentPos, currentDir, bounds);
        if (brickHit && brickHit.distance > 0.1) {
          if (!closestHit || brickHit.distance < closestHit.distance) {
            closestHit = brickHit;
          }
        }
      }

      // Check if trajectory goes to bottom (launch zone)
      if (currentDir.y > 0) {
        const tBottom = (launchZoneTop - currentPos.y) / currentDir.y;
        if (tBottom > 0) {
          const bottomPoint = {
            x: currentPos.x + currentDir.x * tBottom,
            y: launchZoneTop,
          };

          if (!closestHit || tBottom < closestHit.distance) {
            // Trajectory ends at bottom
            points.push({ position: bottomPoint, isBounce: false });
            break;
          }
        }
      }

      if (!closestHit) {
        // No collision found, extend line far
        const farPoint = {
          x: currentPos.x + currentDir.x * 2000,
          y: currentPos.y + currentDir.y * 2000,
        };
        points.push({ position: farPoint, isBounce: false });
        break;
      }

      // Add bounce point
      points.push({ position: { ...closestHit.point }, isBounce: true });

      // Calculate reflection
      currentPos = { ...closestHit.point };
      currentDir = reflectVector(currentDir, closestHit.normal);
      bounceCount++;
    }

    // If we hit max bounces, add one more segment
    if (bounceCount >= MAX_TRAJECTORY_BOUNCES && points.length > 0) {
      const lastPoint = points[points.length - 1];
      const farPoint = {
        x: lastPoint.position.x + currentDir.x * 500,
        y: lastPoint.position.y + currentDir.y * 500,
      };
      points.push({ position: farPoint, isBounce: false });
    }

    return points;
  }
}
