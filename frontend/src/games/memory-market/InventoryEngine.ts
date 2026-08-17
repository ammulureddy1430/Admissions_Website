import type { ProductKind } from "./Types";
export class InventoryEngine {
  items: ProductKind[] = [];
  add(k: ProductKind) {
    if (this.items.length < 6) this.items.push(k);
  }
  clear() {
    this.items = [];
  }
  containsOrder(order: ProductKind[]) {
    const copy = [...this.items];
    return order.every((k) => {
      const i = copy.indexOf(k);
      if (i < 0) return false;
      copy.splice(i, 1);
      return true;
    });
  }
  extras(order: ProductKind[]) {
    const copy = [...order];
    return this.items.filter((k) => {
      const i = copy.indexOf(k);
      if (i < 0) return true;
      copy.splice(i, 1);
      return false;
    }).length;
  }
}
