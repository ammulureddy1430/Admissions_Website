import { VehicleState } from "./Types";

export class VehicleEngine {
  public state: VehicleState;

  constructor(startX = 200, startY = 150) {
    this.state = {
      x: startX,
      y: startY,
      vx: 0,
      vy: 0,
      heading: 0, // 0 is pointing straight up (0 degrees)
      speed: 0,
      accelerating: false,
      braking: false,
      steering: 0, // -1 (left) to 1 (right)
      width: 20,
      height: 38,
      currentLane: 2,
    };
  }

  public update(isWet = false) {
    const maxSpeed = 3.6;
    const accelRate = 0.05;
    const brakeRate = 0.22;
    const coastFriction = 0.035;
    const baseTurnSpeed = 0.04;

    const maxReverseSpeed = -1.5;

    // Apply speed changes (including reverse gear)
    if (this.state.accelerating) {
      if (this.state.speed < 0) {
        // Braking in reverse
        this.state.speed = Math.min(maxSpeed, this.state.speed + brakeRate);
      } else {
        // Accelerating forward
        this.state.speed = Math.min(maxSpeed, this.state.speed + accelRate);
      }
    } else if (this.state.braking) {
      if (this.state.speed > 0) {
        // Braking forward
        this.state.speed = Math.max(maxReverseSpeed, this.state.speed - brakeRate);
      } else {
        // Accelerating in reverse
        this.state.speed = Math.max(maxReverseSpeed, this.state.speed - accelRate * 0.7);
      }
    } else {
      // Coast friction decelerates towards 0
      if (this.state.speed > 0) {
        this.state.speed = Math.max(0, this.state.speed - coastFriction);
      } else if (this.state.speed < 0) {
        this.state.speed = Math.min(0, this.state.speed + coastFriction);
      }
    }

    // Steer angle change (turn faster at medium speeds, allow steering when stopped)
    const turnScale = Math.max(0.6, Math.min(1.0, Math.abs(this.state.speed) / 1.5));
    
    if (this.state.steering !== 0) {
      this.state.heading += this.state.steering * baseTurnSpeed * turnScale;
      // Clamp heading to [-PI / 4.5, PI / 4.5] (approx -40 to +40 degrees) so it always faces forward
      const maxHeading = Math.PI / 4.5;
      this.state.heading = Math.max(-maxHeading, Math.min(maxHeading, this.state.heading));
    } else {
      // Auto-center heading back to 0 (straight up) when not steering
      this.state.heading += (0 - this.state.heading) * 0.12;
    }

    // Slip/Traction Interpolation
    // Normal asphalt: lateral drift is resolved rapidly (0.35)
    // Wet section: lateral drift is slow to resolve (0.05), creating sliding behavior
    const lateralTraction = isWet ? 0.05 : 0.35;

    // Adjust horizontal velocity direction for reverse steering intuition
    const headingVx = this.state.speed * Math.sin(this.state.speed < 0 ? -this.state.heading : this.state.heading);
    const headingVy = this.state.speed * Math.cos(this.state.heading);

    this.state.vx += (headingVx - this.state.vx) * lateralTraction;
    this.state.vy += (headingVy - this.state.vy) * lateralTraction;

    // Update absolute coordinates
    this.state.x += this.state.vx;
    this.state.y += this.state.vy;
  }

  public reset(startX = 200, startY = 150) {
    this.state.x = startX;
    this.state.y = startY;
    this.state.vx = 0;
    this.state.vy = 0;
    this.state.heading = 0;
    this.state.speed = 0;
    this.state.accelerating = false;
    this.state.braking = false;
    this.state.steering = 0;
    this.state.currentLane = 2;
  }
}
