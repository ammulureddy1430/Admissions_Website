import { ProductEngine } from "./ProductEngine";
import type { Level } from "./Types";

export class MarketEngine {
  nextChange = 0;
  restoreAt = 0;
  unavailableEvents = 0;
  adaptationEvents = 0;

  constructor(
    public products = new ProductEngine(),
    private random: () => number = Math.random,
  ) {}

  reset(width: number, height: number, now: number) {
    this.products.reset(width, height);
    this.nextChange = now + 12000;
    this.restoreAt = 0;
    this.unavailableEvents = 0;
    this.adaptationEvents = 0;
  }

  update(now: number, level: Level) {
    if (this.restoreAt && now >= this.restoreAt) {
      this.products.products.forEach((product) => (product.available = true));
      this.restoreAt = 0;
    }
    if (!level.relocation || now < this.nextChange) return;
    if (this.random() < 0.55) {
      this.products.relocate();
    } else {
      this.products.products.forEach((product) => (product.available = true));
      const product =
        this.products.products[
          Math.floor(this.random() * this.products.products.length)
        ];
      product.available = false;
      this.restoreAt = now + 2600;
      this.unavailableEvents++;
    }
    this.adaptationEvents++;
    this.nextChange = now + 10000 + this.random() * 5000;
  }
}
