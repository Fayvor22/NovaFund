import type { FundingStreamEvent } from "@/lib/funding-events";
import { normalizeFundingStreamEvent } from "@/lib/funding-events";

const MAX_HISTORY = 100;

const encoder = new TextEncoder();

const store = {
  history: [] as FundingStreamEvent[],
  clients: new Set<ReadableStreamDefaultController<Uint8Array>>(),

  add(update: unknown): FundingStreamEvent | null {
    const normalized = normalizeFundingStreamEvent(update);
    if (!normalized) return null;

    const item: FundingStreamEvent = {
      ...normalized,
      id: normalized.id ?? `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: normalized.timestamp ?? new Date().toISOString(),
    };

    this.history.push(item);
    if (this.history.length > MAX_HISTORY) this.history.shift();
    this.broadcast(item);

    return item;
  },

  broadcast(update: FundingStreamEvent) {
    const payload = encoder.encode(`data: ${JSON.stringify(update)}\n\n`);

    this.clients.forEach((controller) => {
      try {
        controller.enqueue(payload);
      } catch {
        this.clients.delete(controller);
      }
    });
  },

  subscribe(controller: ReadableStreamDefaultController<Uint8Array>) {
    this.clients.add(controller);
    return () => this.clients.delete(controller);
  },

  getHistory(limit = 50): FundingStreamEvent[] {
    return this.history.slice(-limit);
  },
};

export default store;
