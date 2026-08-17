"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { CustomerEngine } from "./CustomerEngine";
import { DifficultyEngine } from "./DifficultyEngine";
import { InventoryEngine } from "./InventoryEngine";
import { MarketEngine } from "./MarketEngine";
import { PlayerEngine } from "./PlayerEngine";
import { scoreMemoryMarket } from "./ScoringEngine";
import type { MarketEvent, MemoryMarketMetrics, ProductKind } from "./Types";
import "./MemoryMarketGame.css";

type Props = {
  disabled?: boolean;
  remainingSeconds?: number;
  practiceOnly?: boolean;
  onComplete: (metrics: MemoryMarketMetrics) => void | Promise<void>;
};

type PendingAction =
  { kind: "pickup"; id: string } | { kind: "delivery"; id: string };

const PRODUCT_LABELS: Record<ProductKind, string> = {
  apple: "Apple",
  banana: "Banana",
  milk: "Milk",
  cheese: "Cheese",
  bread: "Bread",
  pretzel: "Pretzel",
};

const formatTime = (seconds: number) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(
    Math.max(0, seconds) % 60,
  ).padStart(2, "0")}`;

export default function MemoryMarketGame({
  disabled = false,
  remainingSeconds,
  practiceOnly = false,
  onComplete,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const animation = useRef(0);
  const complete = useRef(onComplete);
  const startedAt = useRef(0);
  const previousFrame = useRef(0);
  const done = useRef(false);
  const ending = useRef(false);
  const finishAt = useRef(0);
  const player = useRef(new PlayerEngine());
  const customers = useRef(new CustomerEngine());
  const inventory = useRef(new InventoryEngine());
  const market = useRef(new MarketEngine());
  const difficulty = useRef(new DifficultyEngine());
  const events = useRef<MarketEvent[]>([]);
  const lastCustomer = useRef<string | null>(null);
  const lastPickupAt = useRef(0);
  const multipleCustomerEvents = useRef(0);
  const taskSwitches = useRef(0);
  const priorityDecisions = useRef(0);
  const highestDifficulty = useRef(1);
  const pendingAction = useRef<PendingAction | null>(null);
  const [started, setStarted] = useState(false);
  const [previewSeconds, setPreviewSeconds] = useState(remainingSeconds ?? 120);

  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);

  const finish = useCallback((completionStatus = "COMPLETED") => {
    if (done.current) return;
    done.current = true;
    cancelAnimationFrame(animation.current);
    const elapsed = Math.max(1, performance.now() - startedAt.current);
    const allEvents = events.current;
    void complete.current(
      scoreMemoryMarket(allEvents, {
        sessionDuration: Math.round(elapsed / 1000),
        customersArrived: customers.current.spawned,
        customersCompleted: allEvents.filter(
          (event) => event.kind === "delivery",
        ).length,
        ordersPresented: customers.current.spawned,
        itemsRequested: customers.current.totalItemsRequested,
        itemsCollected: allEvents.filter((event) => event.kind === "pickup")
          .length,
        playerMovementDistance: Math.round(
          player.current.state.movementDistance,
        ),
        taskSwitches: taskSwitches.current,
        priorityDecisions: priorityDecisions.current,
        multipleCustomerEvents: multipleCustomerEvents.current,
        shelfChanges: market.current.products.shelfChanges,
        productRelocations: market.current.products.relocations,
        unavailableProductEvents: market.current.unavailableEvents,
        adaptationEvents: market.current.adaptationEvents,
        highestDifficulty: highestDifficulty.current,
        completionStatus,
      }),
    );
  }, []);

  useEffect(() => {
    if (
      started &&
      !practiceOnly &&
      remainingSeconds !== undefined &&
      remainingSeconds <= 0 &&
      !ending.current
    ) {
      ending.current = true;
      finishAt.current = performance.now() + 700;
    }
  }, [practiceOnly, remainingSeconds, started]);

  useEffect(() => {
    if (!started || !practiceOnly || disabled) return;
    const interval = window.setInterval(
      () => setPreviewSeconds((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [disabled, practiceOnly, started]);

  useEffect(() => {
    if (started && practiceOnly && previewSeconds <= 0 && !ending.current) {
      ending.current = true;
      finishAt.current = performance.now() + 700;
    }
  }, [practiceOnly, previewSeconds, started]);

  useEffect(() => {
    if (!started || disabled || done.current) return;
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;

    startedAt.current = performance.now();
    previousFrame.current = startedAt.current;
    customers.current.reset(startedAt.current);
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      const scale = Math.min(devicePixelRatio || 1, 2);
      element.width = bounds.width * scale;
      element.height = bounds.height * scale;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      player.current.reset(bounds.width, bounds.height);
      market.current.reset(bounds.width, bounds.height, performance.now());
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const pickUp = (productId: string, now: number) => {
      const product = market.current.products.products.find(
        (item) => item.id === productId && item.available,
      );
      if (!product) return;
      const correct = customers.current.customers.some(
        (customer) =>
          customer.state !== "leaving" &&
          customer.order.items.includes(product.kind),
      );
      const before = inventory.current.items.length;
      inventory.current.add(product.kind);
      if (inventory.current.items.length === before) return;
      events.current.push({
        kind: "pickup",
        at: now - startedAt.current,
        product: product.kind,
        correct,
        responseTime: lastPickupAt.current
          ? now - lastPickupAt.current
          : now - startedAt.current,
      });
      lastPickupAt.current = now;
    };

    const deliver = (customerId: string, now: number) => {
      const customer = customers.current.customers.find(
        (item) => item.id === customerId && item.state !== "leaving",
      );
      if (!customer) return;
      if (lastCustomer.current && lastCustomer.current !== customer.id)
        taskSwitches.current++;
      lastCustomer.current = customer.id;
      const waiting = customers.current.customers
        .filter((item) => item.state !== "leaving")
        .sort((a, b) => a.priority - b.priority);
      if (waiting.length > 1) {
        priorityDecisions.current++;
        if (waiting[0].id !== customer.id) taskSwitches.current++;
      }
      const elapsed = now - startedAt.current;
      if (inventory.current.containsOrder(customer.order.items)) {
        const extras = inventory.current.extras(customer.order.items);
        events.current.push({
          kind: "delivery",
          at: elapsed,
          customerId: customer.id,
          correct: extras === 0,
          responseTime: now - customer.order.createdAt,
        });
        if (extras)
          events.current.push({
            kind: "extra",
            at: elapsed,
            customerId: customer.id,
            correct: false,
            responseTime: 0,
          });
        inventory.current.clear();
        const bounds = element.getBoundingClientRect();
        customers.current.complete(customer, bounds.width);
        player.current.target(
          bounds.width / 2,
          bounds.height * 0.76,
          bounds.width,
          bounds.height,
        );
      } else {
        events.current.push({
          kind: "incomplete",
          at: elapsed,
          customerId: customer.id,
          correct: false,
          responseTime: now - customer.order.createdAt,
        });
      }
    };

    const interact = (event: PointerEvent) => {
      if (ending.current || done.current) return;
      event.preventDefault();
      const bounds = element.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const product = market.current.products.products.find(
        (item) => item.available && Math.hypot(item.x - x, item.y - y) < 52,
      );
      if (product) {
        pendingAction.current = { kind: "pickup", id: product.id };
        player.current.target(
          product.x,
          product.y,
          bounds.width,
          bounds.height,
        );
        return;
      }
      const customer = customers.current.customers.find(
        (item) =>
          item.state !== "leaving" && Math.hypot(item.x - x, item.y - y) < 66,
      );
      if (customer) {
        pendingAction.current = { kind: "delivery", id: customer.id };
        player.current.target(
          customer.x,
          customer.y,
          bounds.width,
          bounds.height,
        );
        return;
      }
      pendingAction.current = null;
      player.current.target(x, y, bounds.width, bounds.height);
    };
    element.addEventListener("pointerdown", interact);

    let previousActiveCount = 0;
    const draw = (now: number) => {
      const bounds = element.getBoundingClientRect();
      const delta = Math.min(0.035, (now - previousFrame.current) / 1000);
      previousFrame.current = now;
      const elapsed = now - startedAt.current;
      const level = difficulty.current.get(elapsed);
      highestDifficulty.current = Math.max(
        highestDifficulty.current,
        level.stage,
      );
      if (!ending.current) {
        player.current.update(delta);
        customers.current.update(
          delta,
          now,
          level,
          bounds.width,
          bounds.height,
        );
        market.current.update(now, level);
        const pending = pendingAction.current;
        if (pending?.kind === "pickup") {
          const product = market.current.products.products.find(
            (item) => item.id === pending.id && item.available,
          );
          if (!product) pendingAction.current = null;
          else {
            player.current.target(
              product.x,
              product.y,
              bounds.width,
              bounds.height,
            );
            if (player.current.near(product.x, product.y, 70)) {
              pickUp(product.id, now);
              pendingAction.current = null;
            }
          }
        } else if (pending?.kind === "delivery") {
          const customer = customers.current.customers.find(
            (item) => item.id === pending.id && item.state !== "leaving",
          );
          if (!customer) pendingAction.current = null;
          else {
            player.current.target(
              customer.x,
              customer.y,
              bounds.width,
              bounds.height,
            );
            if (player.current.near(customer.x, customer.y, 78)) {
              deliver(customer.id, now);
              pendingAction.current = null;
            }
          }
        }
      }
      const activeCount = customers.current.activeCount();
      if (activeCount > 1 && previousActiveCount <= 1)
        multipleCustomerEvents.current++;
      previousActiveCount = activeCount;

      context.clearRect(0, 0, bounds.width, bounds.height);
      drawMarket(context, bounds.width, bounds.height);
      drawProducts(
        context,
        market.current.products.products,
        pendingAction.current?.kind === "pickup"
          ? pendingAction.current.id
          : null,
      );
      drawCustomers(
        context,
        customers.current.customers,
        now,
        pendingAction.current?.kind === "delivery"
          ? pendingAction.current.id
          : null,
      );
      drawPlayer(context, player.current.state.x, player.current.state.y);
      drawBasket(context, inventory.current.items, bounds.width, bounds.height);
      drawControls(context, bounds.width, bounds.height, elapsed);

      if (ending.current && now >= finishAt.current) {
        finish();
        return;
      }
      animation.current = requestAnimationFrame(draw);
    };
    animation.current = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      element.removeEventListener("pointerdown", interact);
      cancelAnimationFrame(animation.current);
    };
  }, [disabled, finish, started]);

  return (
    <div className="memory-market">
      <div className="mm-timer" aria-label="Time remaining">
        <span aria-hidden>⏱</span>
        {formatTime(
          practiceOnly ? previewSeconds : (remainingSeconds ?? previewSeconds),
        )}
      </div>
      <canvas
        ref={canvas}
        aria-label="Memory Market. Tap a product to walk and collect it. Tap a customer to walk over and deliver the basket."
      />
      {!started && (
        <div className="mm-intro">
          <div className="mm-how-to" aria-label="How to play">
            <div className="mm-demo-order">
              🧑‍🦱 <span>🍎 🥛</span>
            </div>
            <div className="mm-demo-steps">
              <span>🧑‍🍳</span>
              <b>→</b>
              <span>🍎</span>
              <b>→</b>
              <span>🥛</span>
              <b>→</b>
              <span>🧑‍🦱</span>
            </div>
            <div className="mm-instructions">
              <span>
                <b>1</b> Remember
              </span>
              <span>
                <b>2</b> Tap items
              </span>
              <span>
                <b>3</b> Tap customer
              </span>
            </div>
            <button
              onClick={() => setStarted(true)}
              aria-label="Start Memory Market"
            >
              <Play fill="currentColor" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function drawMarket(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = "#eef8e8";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#d9edcf";
  context.fillRect(0, height * 0.62, width, height * 0.38);
  context.fillStyle = "#fff8da";
  context.fillRect(0, 0, width, height * 0.34);
  context.strokeStyle = "#26766c";
  context.lineWidth = 7;
  context.strokeRect(20, 22, width - 40, height * 0.29);
  context.font = "700 14px system-ui";
  context.fillStyle = "#14544d";
  context.textAlign = "center";
  ["FRUIT", "DAIRY", "BAKERY"].forEach((label, index) =>
    context.fillText(label, width * (0.2 + index * 0.3), 50),
  );
  context.setLineDash([10, 12]);
  context.strokeStyle = "#86b9a8";
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(0, height * 0.67);
  context.lineTo(width, height * 0.67);
  context.stroke();
  context.setLineDash([]);
}

function drawProducts(
  context: CanvasRenderingContext2D,
  products: MarketEngine["products"]["products"],
  selectedId: string | null,
) {
  context.textAlign = "center";
  for (const product of products) {
    context.globalAlpha = product.available ? 1 : 0.22;
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(product.x - 34, product.y - 35, 68, 78, 18);
    context.fill();
    context.strokeStyle = "#55a89a";
    context.lineWidth = product.id === selectedId ? 8 : 4;
    context.stroke();
    context.font = "38px system-ui";
    context.fillText(product.emoji, product.x, product.y + 10);
    context.font = "600 10px system-ui";
    context.fillStyle = "#194d49";
    context.fillText(PRODUCT_LABELS[product.kind], product.x, product.y + 31);
    context.globalAlpha = 1;
  }
}

function drawCustomers(
  context: CanvasRenderingContext2D,
  customers: CustomerEngine["customers"],
  now: number,
  selectedId: string | null,
) {
  for (const [index, customer] of customers.entries()) {
    context.save();
    context.translate(customer.x, customer.y);
    if (customer.id === selectedId) {
      context.strokeStyle = "#0b7165";
      context.lineWidth = 8;
      context.beginPath();
      context.arc(0, 4, 52, 0, Math.PI * 2);
      context.stroke();
    }
    context.fillStyle = index % 2 ? "#8268d7" : "#f28c69";
    context.beginPath();
    context.roundRect(-34, -30, 68, 70, 24);
    context.fill();
    context.font = "42px system-ui";
    context.textAlign = "center";
    context.fillText(index % 2 ? "👦" : "👧", 0, 5);
    if (now < customer.order.shownUntil && customer.state !== "leaving") {
      const bubbleWidth = 34 + customer.order.items.length * 40;
      context.fillStyle = "#ffffff";
      context.strokeStyle = "#15584f";
      context.lineWidth = 4;
      context.beginPath();
      context.roundRect(-bubbleWidth / 2, -105, bubbleWidth, 55, 18);
      context.fill();
      context.stroke();
      context.font = "27px system-ui";
      context.fillText(
        customer.order.items
          .map(
            (kind) =>
              ({
                apple: "🍎",
                banana: "🍌",
                milk: "🥛",
                cheese: "🧀",
                bread: "🍞",
                pretzel: "🥨",
              })[kind],
          )
          .join(" "),
        0,
        -69,
      );
    }
    context.restore();
  }
}

function drawPlayer(context: CanvasRenderingContext2D, x: number, y: number) {
  context.save();
  context.translate(x, y);
  context.shadowColor = "#136b63";
  context.shadowBlur = 18;
  context.fillStyle = "#1abda9";
  context.beginPath();
  context.roundRect(-37, -34, 74, 72, 24);
  context.fill();
  context.shadowBlur = 0;
  context.font = "44px system-ui";
  context.textAlign = "center";
  context.fillText("🧑‍🍳", 0, 9);
  context.restore();
}

function drawBasket(
  context: CanvasRenderingContext2D,
  items: ProductKind[],
  width: number,
  height: number,
) {
  const emojis: Record<ProductKind, string> = {
    apple: "🍎",
    banana: "🍌",
    milk: "🥛",
    cheese: "🧀",
    bread: "🍞",
    pretzel: "🥨",
  };
  context.fillStyle = "#123e4ddd";
  context.beginPath();
  context.roundRect(width / 2 - 155, height - 70, 310, 52, 18);
  context.fill();
  context.font = "25px system-ui";
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.fillText(
    `🛒  ${items.map((item) => emojis[item]).join("  ")}`,
    width / 2,
    height - 36,
  );
}

function drawControls(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
) {
  if (elapsed > 10000) return;
  context.save();
  context.globalAlpha = elapsed < 8000 ? 0.96 : (10000 - elapsed) / 2000;
  context.fillStyle = "#123e4d";
  context.beginPath();
  context.roundRect(width / 2 - 230, height * 0.4, 460, 48, 20);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 16px system-ui";
  context.textAlign = "center";
  context.fillText(
    "Tap item to collect  •  Tap customer to deliver",
    width / 2,
    height * 0.4 + 30,
  );
  context.restore();
}
