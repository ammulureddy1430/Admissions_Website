import type { Product, ProductKind } from "./Types";
const KINDS: [ProductKind, string][] = [
  ["apple", "🍎"],
  ["banana", "🍌"],
  ["milk", "🥛"],
  ["cheese", "🧀"],
  ["bread", "🍞"],
  ["pretzel", "🥨"],
];
export class ProductEngine {
  products: Product[] = [];
  relocations = 0;
  shelfChanges = 0;
  reset(w: number, h: number) {
    this.products = KINDS.map(([kind, emoji], i) => ({
      id: `p-${kind}`,
      kind,
      emoji,
      x: w * (0.13 + (i % 3) * 0.18 + (i > 2 ? 0.45 : 0)),
      y: h * 0.2,
      available: true,
      shelf: i,
    }));
  }
  byKind(k: ProductKind) {
    return this.products.find((p) => p.kind === k);
  }
  relocate() {
    const a = this.products[Math.floor(Math.random() * this.products.length)],
      b = this.products[Math.floor(Math.random() * this.products.length)];
    if (a === b) return;
    [a.x, b.x] = [b.x, a.x];
    [a.shelf, b.shelf] = [b.shelf, a.shelf];
    this.relocations++;
    this.shelfChanges++;
  }
  varyAvailability(chance: number) {
    for (const p of this.products) p.available = Math.random() > chance;
  }
}
