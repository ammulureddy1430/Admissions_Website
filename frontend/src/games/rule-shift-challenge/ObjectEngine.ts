import { GameObject, ObjectColor, ObjectShape } from './Types';

export class ObjectEngine {
  public objects: GameObject[] = [];

  constructor() {}

  /**
   * Generates a new game object.
   */
  public spawnObject(
    color: ObjectColor,
    shape: ObjectShape,
    isDistractor: boolean,
    speed: number
  ): GameObject {
    const newObj: GameObject = {
      id: Math.random().toString(36).substring(2, 9),
      color,
      shape,
      isDistractor,
      x: 50, // Conveyor belt is centered horizontally
      y: 0,  // Starts at the top
      speed,
      spawnedAt: Date.now(),
      status: 'moving',
      opacity: 1.0,
    };
    this.objects.push(newObj);
    return newObj;
  }

  /**
   * Updates coordinates of all objects.
   */
  public update(deltaTime: number) {
    // Find active and pending (unsorted) objects
    const unsortedObjects = this.objects.filter(
      (obj) => obj.status === 'moving' || obj.status === 'active'
    );

    // Update their target positions in the conveyor queue
    unsortedObjects.forEach((obj, index) => {
      // The active object (index 0) sits in the Decision Box at y = 65%
      // Subsequent queued objects sit further back (y = 45%, 25%, 5%...)
      const targetY = 65 - index * 20;
      
      if (index === 0 && Math.abs(obj.y - 65) < 1.0) {
        obj.status = 'active';
      }

      // Smoothly slide the object down towards its queue target
      const lerpSpeed = 0.12 * (deltaTime / 16.6); // Normalize to ~60fps
      obj.y += (targetY - obj.y) * Math.min(lerpSpeed, 1.0);
    });

    // Update sorted / animating objects
    this.objects.forEach((obj) => {
      if (obj.status === 'sorted') {
        const destX = obj.decision === 'left' ? 15 : 85;
        const destY = 80;
        
        // Move towards final sorting bins
        const lerpSpeed = 0.15 * (deltaTime / 16.6);
        obj.x += (destX - obj.x) * Math.min(lerpSpeed, 1.0);
        obj.y += (destY - obj.y) * Math.min(lerpSpeed, 1.0);
        
        // Fade out
        if (obj.opacity !== undefined) {
          obj.opacity -= 0.08 * (deltaTime / 16.6);
        }
      } else if (obj.status === 'missed') {
        // Fall straight down and fade
        obj.y += obj.speed * 2.0 * (deltaTime / 16.6);
        if (obj.opacity !== undefined) {
          obj.opacity -= 0.08 * (deltaTime / 16.6);
        }
      }
    });

    // Remove objects that have faded out completely
    this.objects = this.objects.filter((obj) => (obj.opacity ?? 1.0) > 0.05);
  }

  /**
   * Sorts the active object to the chosen side.
   */
  public sortActive(side: 'left' | 'right') {
    const active = this.getActiveObject();
    if (active) {
      active.status = 'sorted';
      active.decision = side;
      active.decidedAt = Date.now();
    }
  }

  /**
   * Marks the active object as missed.
   */
  public missActive() {
    const active = this.getActiveObject();
    if (active) {
      active.status = 'missed';
      active.decidedAt = Date.now();
    }
  }

  /**
   * Helper to retrieve the current active object in the decision box.
   */
  public getActiveObject(): GameObject | null {
    const active = this.objects.find((obj) => obj.status === 'active');
    return active || null;
  }
}
