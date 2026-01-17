import { Vector2 } from '../types';

export type InputEventType =
  | 'aimStart'
  | 'aimMove'
  | 'aimEnd'
  | 'tap'
  | 'moveStart'
  | 'moveEnd';

export interface InputEvent {
  type: InputEventType;
  position: Vector2;
  delta?: Vector2;
}

export type InputCallback = (event: InputEvent) => void;

export class InputHandler {
  private canvas: HTMLCanvasElement;
  private callbacks: InputCallback[] = [];
  private isDragging: boolean = false;
  private startPosition: Vector2 | null = null;
  private lastPosition: Vector2 | null = null;
  private isTouchDevice: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.isTouchDevice = 'ontouchstart' in window;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

    // Mouse events (for desktop)
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  onInput(callback: InputCallback): void {
    this.callbacks.push(callback);
  }

  private emit(event: InputEvent): void {
    for (const callback of this.callbacks) {
      callback(event);
    }
  }

  private getCanvasPosition(clientX: number, clientY: number): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    const position = this.getCanvasPosition(touch.clientX, touch.clientY);

    this.isDragging = true;
    this.startPosition = { ...position };
    this.lastPosition = { ...position };

    this.emit({ type: 'aimStart', position });
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging || e.touches.length !== 1) return;

    const touch = e.touches[0];
    const position = this.getCanvasPosition(touch.clientX, touch.clientY);

    const delta = this.lastPosition
      ? { x: position.x - this.lastPosition.x, y: position.y - this.lastPosition.y }
      : { x: 0, y: 0 };

    this.lastPosition = { ...position };

    this.emit({ type: 'aimMove', position, delta });
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging) return;

    const position = this.lastPosition || { x: 0, y: 0 };
    const wasTap = this.startPosition &&
      Math.abs(position.x - this.startPosition.x) < 10 &&
      Math.abs(position.y - this.startPosition.y) < 10;

    this.isDragging = false;

    if (wasTap) {
      this.emit({ type: 'tap', position });
    } else {
      this.emit({ type: 'aimEnd', position });
    }

    this.startPosition = null;
    this.lastPosition = null;
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.isTouchDevice) return; // Ignore mouse events on touch devices

    const position = this.getCanvasPosition(e.clientX, e.clientY);

    this.isDragging = true;
    this.startPosition = { ...position };
    this.lastPosition = { ...position };

    this.emit({ type: 'aimStart', position });
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isTouchDevice) return;
    if (!this.isDragging) return;

    const position = this.getCanvasPosition(e.clientX, e.clientY);

    const delta = this.lastPosition
      ? { x: position.x - this.lastPosition.x, y: position.y - this.lastPosition.y }
      : { x: 0, y: 0 };

    this.lastPosition = { ...position };

    this.emit({ type: 'aimMove', position, delta });
  }

  private handleMouseUp(e: MouseEvent): void {
    if (this.isTouchDevice) return;
    if (!this.isDragging) return;

    const position = this.getCanvasPosition(e.clientX, e.clientY);
    const wasTap = this.startPosition &&
      Math.abs(position.x - this.startPosition.x) < 10 &&
      Math.abs(position.y - this.startPosition.y) < 10;

    this.isDragging = false;

    if (wasTap) {
      this.emit({ type: 'tap', position });
    } else {
      this.emit({ type: 'aimEnd', position });
    }

    this.startPosition = null;
    this.lastPosition = null;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Space bar for speed toggle
    if (e.code === 'Space') {
      e.preventDefault();
      // Emit a tap at center of canvas to trigger speed toggle
      const rect = this.canvas.getBoundingClientRect();
      this.emit({
        type: 'tap',
        position: { x: rect.width - 30, y: rect.height - 30 },
      });
    }

    // Escape for pause
    if (e.code === 'Escape') {
      e.preventDefault();
      this.emit({
        type: 'tap',
        position: { x: -1, y: -1 }, // Special position for pause
      });
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.removeEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('touchcancel', this.handleTouchEnd.bind(this));
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseUp.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.callbacks = [];
  }
}
