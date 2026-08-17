import type { Order, ProductKind } from "./Types";

const PRODUCT_KINDS: ProductKind[] = [
  "apple",
  "banana",
  "milk",
  "cheese",
  "bread",
  "pretzel",
];

export class OrderEngine {
  constructor(private random: () => number = Math.random) {}

  create(size: number, now: number, showMs: number): Order {
    const pool = [...PRODUCT_KINDS];
    const items: ProductKind[] = [];
    while (items.length < Math.min(size, pool.length)) {
      const index = Math.floor(this.random() * pool.length);
      items.push(pool.splice(index, 1)[0]);
    }
    return { items, createdAt: now, shownUntil: now + showMs };
  }
}
