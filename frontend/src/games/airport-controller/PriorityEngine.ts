export class PriorityEngine {
  generated = 0;
  handled = 0;
  constructor(private random: () => number = Math.random) {}
  create(chance: number) {
    const priority = this.random() < chance;
    if (priority) this.generated++;
    return priority;
  }
  complete(priority: boolean) {
    if (priority) this.handled++;
  }
}
