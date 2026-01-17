# BallBlitz

A Ballz-inspired arcade game built with TypeScript and HTML5 Canvas. Players launch balls at numbered bricks, with each brick requiring multiple hits to destroy. Features include multiplier ball pickups, advanced trajectory prediction, animation speed controls, and an Easy Mode.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Overview](#project-overview)
- [How to Play](#how-to-play)
- [Codebase Structure](#codebase-structure)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Key Technical Decisions](#key-technical-decisions)
- [Game Mechanics Implementation](#game-mechanics-implementation)
- [Configuration & Constants](#configuration--constants)
- [Development Notes](#development-notes)
- [Build & Deployment](#build--deployment)
- [Future Considerations](#future-considerations)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run development server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs at `http://localhost:5173` by default.

---

## Project Overview

### Tech Stack

| Component        | Technology           |
|------------------|----------------------|
| Language         | TypeScript 5.x       |
| Rendering        | HTML5 Canvas 2D      |
| Build Tool       | Vite 6.x             |
| State Management | Custom game classes  |
| Persistence      | LocalStorage         |

### Key Features

1. **Ball Physics** - Elastic collisions with walls and bricks
2. **Brick System** - 7x10 grid with hit counters and color-coded difficulty
3. **Pickup System** - Standard (+1) and multiplier pickups (x2, x3, x5, x10)
4. **Trajectory Preview** - Shows up to 4 bounces for strategic planning
5. **Speed Control** - 1x/2x/4x animation speed during ball phase
6. **Easy Mode** - Movable launch position with separate high scores
7. **Mobile-First** - Touch controls with responsive canvas

### Build Stats

- Bundle size: ~9 KB gzipped
- Target: 60 FPS on mid-range mobile devices
- Browser support: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## How to Play

1. **Aim**: Touch/click and drag to aim. The trajectory preview shows where balls will bounce.
2. **Launch**: Release to launch all balls sequentially from the launch point.
3. **Collect**: Balls collect pickups (+1, x2, x3, x5, x10) to increase ball count.
4. **Destroy**: Each ball hit reduces a brick's counter. Bricks are destroyed at zero.
5. **Survive**: After each turn, bricks move down. Game ends if any brick reaches the bottom.

### Controls

| Action | Touch | Mouse | Keyboard |
|--------|-------|-------|----------|
| Aim | Drag anywhere | Click and drag | - |
| Launch | Release drag | Release click | - |
| Speed toggle | Tap speed button | Click speed button | Space |
| Pause | - | - | Escape |
| Move launch (Easy Mode) | Drag launch point | Drag launch point | - |

---

## Codebase Structure

```
BlitzBallz/
├── index.html              # Entry HTML with canvas container
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── src/
│   ├── main.ts             # Application entry point
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── constants.ts        # Game configuration values
│   │
│   ├── game/
│   │   └── Game.ts         # Main game controller & loop
│   │
│   ├── physics/
│   │   ├── Physics.ts      # Collision detection & ball movement
│   │   └── TrajectoryCalculator.ts  # 4-bounce preview calculation
│   │
│   ├── rendering/
│   │   └── Renderer.ts     # All canvas drawing & UI
│   │
│   ├── managers/
│   │   └── GridManager.ts  # Brick & pickup spawning logic
│   │
│   ├── input/
│   │   └── InputHandler.ts # Touch/mouse/keyboard events
│   │
│   └── utils/
│       └── Vector2.ts      # 2D vector math utilities
│
└── dist/                   # Production build output
```

---

## Architecture Deep Dive

### Game Loop (`Game.ts`)

The game uses a standard requestAnimationFrame loop with delta time for frame-rate independent physics:

```typescript
private gameLoop = (): void => {
  const currentTime = performance.now();
  const deltaTime = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
  this.lastFrameTime = currentTime;

  this.update(deltaTime);
  this.render();

  requestAnimationFrame(this.gameLoop);
};
```

Delta time is capped at 100ms to prevent physics explosions when tab is backgrounded.

### State Machine

The game uses a simple state machine with these states:

```
menu → aiming → launching → animating → (back to aiming or gameOver)
         ↓          ↓           ↓
       paused     paused      paused
         ↓          ↓           ↓
      settings   settings    settings
```

States are managed in `Game.ts` via the `state` and `previousState` properties.

### Rendering Pipeline (`Renderer.ts`)

The renderer handles all canvas drawing with these responsibilities:

1. **Dimension management** - Responsive sizing with high-DPI support
2. **Background** - Grid lines and play area
3. **Entities** - Bricks, pickups, balls with animations
4. **UI overlays** - Menus, buttons, trajectory preview
5. **Effects** - Collection particles, destruction animations

Key scaling approach:
```typescript
// Handle high DPI displays
const dpr = window.devicePixelRatio || 1;
this.canvas.width = width * dpr;
this.canvas.height = height * dpr;
this.canvas.style.width = `${width}px`;
this.canvas.style.height = `${height}px`;
this.ctx.scale(dpr, dpr);
```

### Physics System (`Physics.ts`)

The physics engine handles:

1. **Ball movement** - Position updates based on velocity and delta time
2. **Wall collisions** - Perfect elastic reflection (angle in = angle out)
3. **Brick collisions** - Face detection (top/bottom/left/right/corner)
4. **Raycasting** - For trajectory preview calculations

Collision detection uses expanded bounding boxes that account for ball radius:

```typescript
// Expand brick bounds by ball radius for collision detection
const expandedLeft = brickBounds.left - r;
const expandedRight = brickBounds.right + r;
const expandedTop = brickBounds.top - r;
const expandedBottom = brickBounds.bottom + r;
```

### Trajectory Calculator (`TrajectoryCalculator.ts`)

Calculates the preview line by:

1. Starting from launch position with aim direction
2. Raycasting to find closest wall or brick intersection
3. Calculating reflection vector at collision point
4. Repeating for up to 4 bounces
5. Returning array of trajectory points with bounce markers

---

## Key Technical Decisions

### Why Canvas over DOM/WebGL?

- **Canvas 2D** provides sufficient performance for this game's complexity
- Simpler than WebGL while being faster than DOM manipulation
- Better control over rendering pipeline
- Easy to implement custom effects (glow, transparency)

### Why Vite?

- Fast development server with hot module replacement
- Excellent TypeScript support out of the box
- Small production bundles with tree-shaking
- Simple configuration

### Collision Detection Approach

We use **AABB (Axis-Aligned Bounding Box)** collision with ball radius expansion rather than circle-rectangle intersection. This is:

- Simpler to implement
- Computationally efficient
- Accurate enough for this game's visual fidelity

### Input Handling

Touch controls use **inverted drag direction** for natural feel:
- Dragging down-left aims the balls up-right
- This mimics "pulling back a slingshot" which feels intuitive

---

## Game Mechanics Implementation

### Ball Launching

Balls launch sequentially with configurable delay:

```typescript
const launchDelay = BALL_LAUNCH_DELAY / this.speedMultiplier; // 50ms base

if (currentTime - this.lastLaunchTime >= launchDelay) {
  this.balls[this.ballsLaunched].active = true;
  this.ballsLaunched++;
  this.lastLaunchTime = currentTime;
}
```

### Pickup Spawn Weights

Pickups spawn with weighted probabilities:

| Type | Weight | Normalized Probability |
|------|--------|------------------------|
| +1   | 1.0    | 67.0% |
| x2   | 0.2    | 13.4% |
| x3   | 0.143  | 9.6% |
| x5   | 0.1    | 6.7% |
| x10  | 0.05   | 3.3% |

### Brick Difficulty Scaling

Brick hit counts scale with level:

```typescript
const baseHits = level;
const variance = Math.floor(baseHits * BRICK_HIT_VARIANCE); // +/- 20%
const hits = Math.max(1, baseHits + randomInRange(-variance, variance));
```

### Animation Speed

Speed multiplier affects:
- Ball velocity (multiplied)
- Ball launch delay (divided)
- Physics remain stable at all speeds

---

## Configuration & Constants

All game configuration lives in `src/constants.ts`:

### Grid Configuration
```typescript
GRID_COLS = 7          // Play area columns
GRID_ROWS = 10         // Play area rows
GRID_GAP = 2           // Pixels between cells
```

### Ball Configuration
```typescript
BASE_BALL_RADIUS = 8   // Pixels at base resolution
BALL_SPEED = 800       // Pixels per second
BALL_LAUNCH_DELAY = 50 // Milliseconds between launches
MIN_LAUNCH_ANGLE = 10  // Degrees from horizontal
```

### Trajectory Preview
```typescript
MAX_TRAJECTORY_BOUNCES = 4
TRAJECTORY_DASH_LENGTH = 10
TRAJECTORY_GAP_LENGTH = 5
```

### Colors
```typescript
COLORS = {
  background: '#1a1a2e',
  ball: '#ffffff',
  brickLow: '#22c55e',   // Green - easy
  brickMid: '#eab308',   // Yellow - medium
  brickHigh: '#ef4444',  // Red - hard
  // ... more in constants.ts
}
```

---

## Development Notes

### TypeScript Configuration

We use strict mode with some relaxations for game development:

```json
{
  "strict": true,
  "noUnusedLocals": false,      // Allow unused vars (common in games)
  "noUnusedParameters": false   // Allow unused params (event handlers)
}
```

### Adding New Features

1. **New pickup type**: Add to `PickupType` in `types.ts`, add weight/value/color in `constants.ts`
2. **New brick behavior**: Extend `Brick` interface, modify `GridManager` spawning
3. **New UI screen**: Add state to `GameState`, implement in `Game.ts` and `Renderer.ts`

### Common Patterns

**Entity updates follow this pattern:**
```typescript
for (const entity of this.entities) {
  if (entity.destroying) {
    entity.destroyProgress += deltaTime / ANIMATION_DURATION;
  }
}
this.entities = this.entities.filter(e => e.destroyProgress < 1);
```

**Input handling pattern:**
```typescript
private handleInput(event: InputEvent): void {
  switch (this.state) {
    case 'aiming':
      this.handleAimingInput(event.type, event.position);
      break;
    // ... other states
  }
}
```

### Debugging Tips

1. **Slow down time**: Set `speedMultiplier = 0.1` in Game.ts
2. **Visualize collisions**: Add colored rectangles in Renderer for brick bounds
3. **Log trajectory**: Console.log the trajectory points array
4. **Freeze state**: Comment out state transitions in endTurn()

---

## Build & Deployment

### Development
```bash
npm run dev
```
Opens at http://localhost:5173 with hot reload.

### Production Build
```bash
npm run build
```
Outputs to `dist/` folder. The build:
1. Runs TypeScript compiler for type checking
2. Bundles with Vite/Rollup
3. Minifies and tree-shakes
4. Outputs ~9KB gzipped

### Deployment

The `dist/` folder contains static files that can be deployed to any static host:
- GitHub Pages
- Netlify
- Vercel
- Any web server

---

## Future Considerations

These features are documented for potential future versions (out of scope for V1):

### Gameplay Enhancements
- **Special brick types**: Explosive, reinforced, moving
- **Power-ups**: Laser, wide ball, slow motion
- **Daily challenges**: Seeded random levels

### Social Features
- **Leaderboards**: Requires backend service
- **Achievement system**: Track milestones

### Polish
- **Sound effects and music**: Use Web Audio API
- **Themes/skins**: Color palette customization
- **Haptic feedback**: Vibration API for mobile

### Technical Improvements
- **Object pooling**: Reuse ball objects to reduce GC
- **Spatial partitioning**: Optimize collision detection for many bricks
- **Web Workers**: Offload physics calculations

---

## License

See LICENSE file for details.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify
5. Submit a pull request

---

*Built with TypeScript, Canvas, and Vite*
