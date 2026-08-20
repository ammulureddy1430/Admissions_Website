export type SurfaceType = "ASPHALT" | "WET" | "GRAVEL" | "SAND" | "OFF_TRACK";

export type CarState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  angle: number;
  angularVelocity: number;
  driftState: "DRY_GRIP" | "SLIDING" | "SPINNING" | "RECOVERING";
  grip: number;
  driftAngle: number;
  driftDuration: number;
  brakeState: boolean;
  handbrakeState: boolean;
  accelerating: boolean;
  spinTimer: number;
};

export type Waypoint = {
  x: number;
  y: number;
  surface: SurfaceType;
  width: number;
};

export type ObstacleType = "CONE" | "PUDDLE" | "OIL";
export type Obstacle = {
  id: number;
  x: number;
  y: number;
  type: ObstacleType;
  radius: number;
  active: boolean;
  vx?: number;
  vy?: number;
};

export type AICarState = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  targetWaypointIndex: number;
  speed: number;
  color: string;
};

export type SmokeParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  alpha: number;
};

export type SkidMark = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  alpha: number;
};

// Continuous track points defining the race track circuit loop
export const TRACK_WAYPOINTS: Waypoint[] = [
  { x: 300, y: 300, surface: "ASPHALT", width: 160 },   // Start / Finish Line
  { x: 700, y: 300, surface: "ASPHALT", width: 160 },   // Main Straight
  { x: 1100, y: 300, surface: "ASPHALT", width: 160 },  // End of Straight
  { x: 1400, y: 400, surface: "WET", width: 150 },      // Wet corner entrance
  { x: 1600, y: 700, surface: "WET", width: 150 },      // Sharp wet curve
  { x: 1500, y: 1100, surface: "ASPHALT", width: 145 }, // Transition back to Asphalt
  { x: 1100, y: 1200, surface: "GRAVEL", width: 130 },  // Gravel S-curve 1
  { x: 800, y: 1000, surface: "GRAVEL", width: 130 },   // Gravel S-curve 2
  { x: 500, y: 1200, surface: "SAND", width: 115 },     // Sand hairpin entrance
  { x: 250, y: 1000, surface: "SAND", width: 100 },     // Tight sand hairpin apex
  { x: 200, y: 650, surface: "ASPHALT", width: 140 },   // Narrow recovery straight
  { x: 250, y: 450, surface: "ASPHALT", width: 150 },   // Final corner before finish
];

const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val));

export function difficultyFor(seconds: number) {
  // Returns difficulty level from 1 to 5 based on elapsed session time
  return clamp(1 + Math.floor(seconds / 36), 1, 5);
}

export function createCar(x = 300, y = 300): CarState {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    speed: 0,
    angle: 0,
    angularVelocity: 0,
    driftState: "DRY_GRIP",
    grip: 1.0,
    driftAngle: 0,
    driftDuration: 0,
    brakeState: false,
    handbrakeState: false,
    accelerating: false,
    spinTimer: 0,
  };
}

export function createAICars(): AICarState[] {
  return [
    {
      id: 1,
      x: 260,
      y: 340,
      vx: 0,
      vy: 0,
      angle: 0,
      targetWaypointIndex: 1,
      speed: 130,
      color: "#fbbf24", // Yellow
    },
    {
      id: 2,
      x: 220,
      y: 280,
      vx: 0,
      vy: 0,
      angle: 0,
      targetWaypointIndex: 1,
      speed: 115,
      color: "#3b82f6", // Blue
    },
  ];
}

// Projection of point (cx, cy) onto segment P1 -> P2
export function getClosestPointOnSegment(
  cx: number,
  cy: number,
  p1: Waypoint,
  p2: Waypoint,
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const ab2 = dx * dx + dy * dy;
  if (ab2 === 0) return { x: p1.x, y: p1.y, t: 0 };

  const acx = cx - p1.x;
  const acy = cy - p1.y;
  let t = (acx * dx + acy * dy) / ab2;
  t = clamp(t, 0, 1);

  return {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
    t,
  };
}

export function getTrackPositionInfo(x: number, y: number) {
  let minDistance = Infinity;
  let closestPoint = { x: 0, y: 0 };
  let surface: SurfaceType = "OFF_TRACK";
  let trackWidth = 140;
  let closestSegmentIndex = 0;

  for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
    const p1 = TRACK_WAYPOINTS[i];
    const p2 = TRACK_WAYPOINTS[(i + 1) % TRACK_WAYPOINTS.length];
    const closest = getClosestPointOnSegment(x, y, p1, p2);
    const distSq = (x - closest.x) ** 2 + (y - closest.y) ** 2;
    const dist = Math.sqrt(distSq);

    if (dist < minDistance) {
      minDistance = dist;
      closestPoint = closest;
      closestSegmentIndex = i;
      // Interpolate width and surface
      trackWidth = p1.width + closest.t * (p2.width - p1.width);
      surface = p1.surface;
    }
  }

  const onTrack = minDistance <= trackWidth / 2;
  return {
    onTrack,
    distanceToCenter: minDistance,
    surface: onTrack ? surface : ("OFF_TRACK" as SurfaceType),
    closestPoint,
    trackWidth,
    closestSegmentIndex,
  };
}

export function stepCarPhysics(
  car: CarState,
  throttle: number,
  brake: number,
  steer: number,
  handbrake: number,
  dt: number,
  surface: SurfaceType,
) {
  // 1. Surface grip coefficients
  let maxGrip = 1.0;
  let dragMultiplier = 1.0;

  switch (surface) {
    case "ASPHALT":
      maxGrip = 1.0;
      dragMultiplier = 1.0;
      break;
    case "WET":
      maxGrip = 0.65;
      dragMultiplier = 1.1;
      break;
    case "GRAVEL":
      maxGrip = 0.45;
      dragMultiplier = 1.4;
      break;
    case "SAND":
      maxGrip = 0.3;
      dragMultiplier = 2.2;
      break;
    case "OFF_TRACK":
    default:
      maxGrip = 0.25;
      dragMultiplier = 3.5;
      break;
  }

  car.brakeState = brake > 0;
  car.handbrakeState = handbrake > 0;
  car.accelerating = throttle > 0;

  // 2. Handle spin states (from oil slicks, etc.)
  if (car.spinTimer > 0) {
    car.spinTimer -= dt;
    car.driftState = "SPINNING";
    car.angularVelocity = 8.0; // Spin rate
    car.angle += car.angularVelocity * dt;
    // Keep slowing down during spin
    car.vx *= 0.95;
    car.vy *= 0.95;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    car.speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
    return;
  }

  // 3. Local velocities relative to car rotation heading
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  const forwardX = cos;
  const forwardY = sin;
  const rightX = -sin;
  const rightY = cos;

  const speedF = car.vx * forwardX + car.vy * forwardY;
  const speedL = car.vx * rightX + car.vy * rightY;
  car.speed = speedF;

  // 4. Drift state logic
  const slipSpeed = Math.abs(speedL);
  const driftThreshold = 90; // Sideways slip trigger speed
  let isDrifting = car.driftState === "SLIDING" || car.driftState === "RECOVERING";

  const intentionalDrift = handbrake > 0 && Math.abs(steer) > 0.15 && Math.abs(speedF) > 55;
  if (intentionalDrift) {
    isDrifting = true;
    car.driftState = "SLIDING";
  } else if (slipSpeed > driftThreshold && Math.abs(speedF) > 60) {
    isDrifting = true;
    car.driftState = "SLIDING";
  }

  if (isDrifting) {
    // Slideway drift has lower lateral grip, allowing continuous slide
    // Preserve enough lateral grip for an arcade-style controlled drift.
    // A full grip release made a single button press launch the car off-track.
    car.grip = maxGrip * 0.56;
    car.driftDuration += dt;
    car.driftAngle = Math.abs(Math.atan2(speedL, Math.max(1, Math.abs(speedF))));

    // Recover if handbrake released, steering stable, and slide slows down
    if (handbrake === 0 && slipSpeed < 35) {
      car.driftState = "RECOVERING";
      // Gradually regain full grip
      car.grip = maxGrip * 0.75;
      if (slipSpeed < 10) {
        car.driftState = "DRY_GRIP";
        car.driftDuration = 0;
        car.driftAngle = 0;
      }
    }
  } else {
    car.grip = maxGrip;
    car.driftState = "DRY_GRIP";
    car.driftDuration = 0;
    car.driftAngle = 0;
  }

  // 5. Steering calculations
  // Arcade steering: responsive as soon as the car rolls, stable at high speed.
  // The previous implementation applied dt to angular acceleration and again to
  // heading, which made arrow-button steering almost imperceptible.
  const normSpeed = Math.min(1.0, Math.abs(speedF) / 105.0);
  let steerEffect = Math.abs(speedF) > 2 ? Math.max(0.2, normSpeed) : 0;
  if (speedF < 0) steerEffect = -steerEffect; // Reverse steering direction

  const steerRate = 2.35 * (isDrifting ? 1.16 : 1.0);
  const targetAngularVelocity = steer * steerRate * steerEffect;
  const steeringResponse = Math.min(1, dt * (isDrifting ? 8 : 11));
  car.angularVelocity += (targetAngularVelocity - car.angularVelocity) * steeringResponse;
  car.angularVelocity = clamp(car.angularVelocity, -1.75, 1.75);
  if (steer === 0) car.angularVelocity *= Math.exp(-9 * dt);
  car.angle += car.angularVelocity * dt;

  // 6. Longitudinal forces (Throttle & Brake)
  let forceF = 0;
  if (throttle > 0) {
    const maxSpeedLimit = surface === "OFF_TRACK" ? 95 : 360;
    if (speedF < maxSpeedLimit) {
      forceF = throttle * 480;
    }
  }
  if (brake > 0) {
    // Down/S first brakes forward motion, then becomes reverse when nearly stopped.
    if (speedF > 12) forceF -= brake * 620;
    else if (speedF > -110) forceF -= brake * 300;
  }
  if (intentionalDrift) {
    // Bleed speed while rotating so the car remains inside a normal corner.
    forceF -= speedF * 1.65;
  }

  // Aerodynamic drag + Rolling friction
  const dragF = -speedF * 0.72 * dragMultiplier;
  // Transverse drag opposing sliding (much stronger unless drifting)
  const dragL = -speedL * (isDrifting ? 3.1 : 7.2) * car.grip;

  const totalF = forceF + dragF;
  const totalL = dragL;

  // 7. Accelerations to world space
  const ax = totalF * forwardX + totalL * rightX;
  const ay = totalF * forwardY + totalL * rightY;

  car.vx += ax * dt;
  car.vy += ay * dt;

  // Update physical coordinates
  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // Update speed representing velocity component along forward heading
  car.speed = car.vx * forwardX + car.vy * forwardY;
}

export function stepAICars(aiCars: AICarState[], dt: number) {
  for (const ai of aiCars) {
    const target = TRACK_WAYPOINTS[ai.targetWaypointIndex];
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 110) {
      // Advance to next waypoint target
      ai.targetWaypointIndex = (ai.targetWaypointIndex + 1) % TRACK_WAYPOINTS.length;
    }

    // Determine target heading angle
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - ai.angle;

    // Normalize angle difference to [-PI, PI]
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

    // Smoothly turn AI car
    ai.angle += clamp(angleDiff * 4.5, -3.2, 3.2) * dt;

    // Base speed on waypoint surface
    let speedMult = 1.0;
    if (target.surface === "WET") speedMult = 0.8;
    else if (target.surface === "GRAVEL") speedMult = 0.65;
    else if (target.surface === "SAND") speedMult = 0.5;

    const currentTargetSpeed = ai.speed * speedMult;
    // Step forward along heading
    ai.vx = Math.cos(ai.angle) * currentTargetSpeed;
    ai.vy = Math.sin(ai.angle) * currentTargetSpeed;

    ai.x += ai.vx * dt;
    ai.y += ai.vy * dt;
  }
}

export function generateObstacles(seed: number): Obstacle[] {
  // Deterministically place cones and oil/puddles along curves of the track
  const obstacles: Obstacle[] = [];
  let idCount = 1;

  for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
    const p = TRACK_WAYPOINTS[i];
    const next = TRACK_WAYPOINTS[(i + 1) % TRACK_WAYPOINTS.length];
    
    // Middle point of track segment
    const midX = (p.x + next.x) / 2;
    const midY = (p.y + next.y) / 2;

    // Place based on waypoint surface
    if (p.surface === "WET") {
      // Spawn puddle
      obstacles.push({
        id: idCount++,
        x: midX + (noise(seed + i) - 0.5) * 60,
        y: midY + (noise(seed + i + 1) - 0.5) * 60,
        type: "PUDDLE",
        radius: 35,
        active: true,
      });
    } else if (p.surface === "GRAVEL" || p.surface === "SAND") {
      // Spawn traffic cones near the boundaries
      const offsetFactor = noise(seed + i * 2) > 0.5 ? 1 : -1;
      // Perpendicular vector for offset placement
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len > 0) {
        const px = (-dy / len) * (p.width * 0.35) * offsetFactor;
        const py = (dx / len) * (p.width * 0.35) * offsetFactor;

        obstacles.push({
          id: idCount++,
          x: midX + px,
          y: midY + py,
          type: "CONE",
          radius: 12,
          active: true,
          vx: 0,
          vy: 0,
        });
      }
    } else {
      // Spawn an oil slick on asphalt segments (every 3rd)
      if (i % 3 === 1) {
        obstacles.push({
          id: idCount++,
          x: midX + (noise(seed + i * 5) - 0.5) * 40,
          y: midY + (noise(seed + i * 7) - 0.5) * 40,
          type: "OIL",
          radius: 28,
          active: true,
        });
      }
    }
  }

  return obstacles;
}

export function handleObstacleCollisions(
  car: CarState,
  obstacles: Obstacle[],
  onCollision: (type: ObstacleType) => void,
) {
  for (const obs of obstacles) {
    if (!obs.active) continue;

    const dx = car.x - obs.x;
    const dy = car.y - obs.y;
    const distSq = dx * dx + dy * dy;
    const minDist = obs.radius + 14; // Approximate car radius

    if (distSq < minDist * minDist) {
      if (obs.type === "CONE") {
        // Hitting a cone knocks it away
        obs.vx = car.vx * 1.2 + (Math.random() - 0.5) * 50;
        obs.vy = car.vy * 1.2 + (Math.random() - 0.5) * 50;
        onCollision("CONE");
      } else if (obs.type === "OIL") {
        // Oil causes instantaneous slip / spin
        car.spinTimer = 1.1; // Spin out for 1.1s
        obs.active = false;  // Deactivate so it only triggers once
        onCollision("OIL");
      } else if (obs.type === "PUDDLE") {
        // Puddles cause a temporary drop in lateral friction/speed
        car.vx *= 0.88;
        car.vy *= 0.88;
        car.angularVelocity += (Math.random() - 0.5) * 2.0;
        onCollision("PUDDLE");
      }
    }
  }
}

export function stepCones(obstacles: Obstacle[], dt: number) {
  // Cones that have been knocked away slide with friction
  for (const obs of obstacles) {
    if (obs.type === "CONE" && obs.vx !== undefined && obs.vy !== undefined) {
      obs.x += obs.vx * dt;
      obs.y += obs.vy * dt;
      obs.vx *= 0.92; // Friction damping
      obs.vy *= 0.92;
    }
  }
}

// LCG noise generator
function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
