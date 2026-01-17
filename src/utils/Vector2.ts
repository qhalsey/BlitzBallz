import { Vector2 } from '../types';

export function createVector(x: number = 0, y: number = 0): Vector2 {
  return { x, y };
}

export function addVectors(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function subtractVectors(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scaleVector(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

export function normalizeVector(v: Vector2): Vector2 {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

export function magnitude(v: Vector2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function dotProduct(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y;
}

export function distance(a: Vector2, b: Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function cloneVector(v: Vector2): Vector2 {
  return { x: v.x, y: v.y };
}

export function reflectVector(v: Vector2, normal: Vector2): Vector2 {
  const d = dotProduct(v, normal);
  return {
    x: v.x - 2 * d * normal.x,
    y: v.y - 2 * d * normal.y,
  };
}

export function rotateVector(v: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function angleFromDirection(v: Vector2): number {
  return Math.atan2(v.y, v.x);
}

export function directionFromAngle(angle: number): Vector2 {
  return {
    x: Math.cos(angle),
    y: Math.sin(angle),
  };
}
