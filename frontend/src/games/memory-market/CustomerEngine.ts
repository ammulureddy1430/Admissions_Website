import { OrderEngine } from "./OrderEngine";
import type { Customer, Level } from "./Types";

export class CustomerEngine {
  customers: Customer[] = [];
  spawned = 0;
  totalItemsRequested = 0;
  private nextArrival = 0;

  constructor(
    private orders = new OrderEngine(),
    private random: () => number = Math.random,
  ) {}

  reset(now = 0) {
    this.customers = [];
    this.spawned = 0;
    this.totalItemsRequested = 0;
    this.nextArrival = now;
  }

  update(dt: number, now: number, level: Level, width: number, height: number) {
    if (now >= this.nextArrival && this.activeCount() < level.maxCustomers) {
      this.spawn(now, level, width, height);
      this.nextArrival = now + level.arrivalMs * (0.86 + this.random() * 0.28);
    }
    for (const customer of this.customers) {
      const speed = customer.state === "leaving" ? 180 : 130;
      const delta = customer.targetX - customer.x;
      customer.x += Math.sign(delta) * Math.min(Math.abs(delta), speed * dt);
      if (customer.state === "arriving" && Math.abs(delta) < 2)
        customer.state = "waiting";
    }
    this.customers = this.customers.filter(
      (customer) => customer.state !== "leaving" || customer.x < width + 100,
    );
  }

  complete(customer: Customer, width: number) {
    customer.state = "leaving";
    customer.targetX = width + 140;
  }

  activeCount() {
    return this.customers.filter((customer) => customer.state !== "leaving")
      .length;
  }

  private spawn(now: number, level: Level, width: number, height: number) {
    const waiting = this.customers.filter(
      (customer) => customer.state !== "leaving",
    );
    const slots = [width * 0.2, width * 0.5, width * 0.8];
    const targetX =
      slots.find((slot) =>
        waiting.every((customer) => Math.abs(customer.targetX - slot) > 80),
      ) ?? slots[waiting.length % slots.length];
    const order = this.orders.create(level.orderSize, now, level.showMs);
    this.totalItemsRequested += order.items.length;
    this.customers.push({
      id: `customer-${++this.spawned}`,
      x: Math.max(55, targetX - 120),
      y: height * 0.55,
      targetX,
      priority: now + this.random() * 700,
      order,
      state: "arriving",
    });
  }
}
