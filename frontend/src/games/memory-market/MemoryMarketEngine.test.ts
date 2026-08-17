import assert from "node:assert/strict";
import { CustomerEngine } from "./CustomerEngine";
import { InventoryEngine } from "./InventoryEngine";
import { levelAt } from "./Levels";
import { MarketEngine } from "./MarketEngine";
import { OrderEngine } from "./OrderEngine";
import { PlayerEngine } from "./PlayerEngine";
import { ProductEngine } from "./ProductEngine";
import { scoreMemoryMarket } from "./ScoringEngine";

const order = new OrderEngine(() => 0).create(2, 1000, 3000);
assert.equal(order.items.length, 2);
assert.equal(new Set(order.items).size, 2);
assert.equal(order.shownUntil, 4000);

const customers = new CustomerEngine(new OrderEngine(() => 0), () => 0);
customers.reset(0);
customers.update(0.016, 0, levelAt(60000), 1000, 700);
assert.equal(customers.activeCount(), 1);
customers.update(0.016, 10000, levelAt(60000), 1000, 700);
assert.equal(customers.activeCount(), 2);
assert.ok(customers.totalItemsRequested >= 4);

const player = new PlayerEngine();
player.reset(1000, 700);
player.target(800, 300, 1000, 700);
for (let index = 0; index < 120; index++) player.update(1 / 60);
assert.ok(player.state.x > 600);
assert.ok(player.state.movementDistance > 0);

const inventory = new InventoryEngine();
inventory.add("apple");
inventory.add("milk");
assert.equal(inventory.containsOrder(["apple", "milk"]), true);
assert.equal(inventory.containsOrder(["apple", "bread"]), false);
inventory.add("bread");
assert.equal(inventory.extras(["apple", "milk"]), 1);

const products = new ProductEngine();
products.reset(1000, 700);
const firstX = products.products[0].x;
const secondX = products.products[1].x;
const originalRandom = Math.random;
Math.random = (() => {
  const values = [0, 0.2];
  return () => values.shift() ?? 0;
})();
products.relocate();
Math.random = originalRandom;
assert.equal(products.products[0].x, secondX);
assert.equal(products.products[1].x, firstX);

const market = new MarketEngine(new ProductEngine(), () => 0.9);
market.reset(1000, 700, 0);
market.update(13000, levelAt(70000));
assert.equal(market.unavailableEvents, 1);
assert.ok(market.products.products.some((product) => !product.available));
market.update(16000, levelAt(70000));
assert.ok(market.products.products.every((product) => product.available));

assert.equal(levelAt(0).stage, 1);
assert.equal(levelAt(119000).stage, 7);

const metrics = scoreMemoryMarket(
  [
    {
      kind: "pickup",
      at: 1000,
      product: "apple",
      correct: true,
      responseTime: 800,
    },
    {
      kind: "delivery",
      at: 4000,
      customerId: "one",
      correct: true,
      responseTime: 3000,
    },
  ],
  {
    sessionDuration: 120,
    customersArrived: 1,
    customersCompleted: 1,
    ordersPresented: 1,
    itemsRequested: 1,
    itemsCollected: 1,
    playerMovementDistance: 500,
    taskSwitches: 0,
    priorityDecisions: 0,
    multipleCustomerEvents: 0,
    shelfChanges: 0,
    productRelocations: 0,
    unavailableProductEvents: 0,
    adaptationEvents: 0,
    highestDifficulty: 7,
    completionStatus: "COMPLETED",
  },
);
assert.equal(metrics.orderRecallAccuracy, 100);
assert.equal(metrics.ordersCompleted, 1);
assert.ok(metrics.overallScore > 0 && metrics.overallScore <= 100);

console.log("Memory Market engine tests passed");
