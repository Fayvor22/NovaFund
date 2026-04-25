"use client";

import type { FundingStreamEvent } from "@/lib/funding-events";
import { normalizeFundingStreamEvent } from "@/lib/funding-events";

type FundingUpdateListener = (event: FundingStreamEvent) => void;

const INITIAL_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 30000;
const MAX_RECENT_EVENT_IDS = 250;

class FundingStreamClient {
  private listeners = new Set<FundingUpdateListener>();
  private socket: WebSocket | null = null;
  private eventSource: EventSource | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = INITIAL_RECONNECT_MS;
  private recentEventIds: string[] = [];
  private recentEventIdSet = new Set<string>();

  subscribe(listener: FundingUpdateListener) {
    this.listeners.add(listener);

    if (this.listeners.size === 1) {
      this.connect();
    }

    return () => {
      this.listeners.delete(listener);

      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  private connect() {
    if (typeof window === "undefined" || this.listeners.size === 0) return;
    if (this.socket || this.eventSource) return;

    const websocketUrl = process.env.NEXT_PUBLIC_FUNDING_WS_URL?.trim();

    if (websocketUrl) {
      this.connectWebSocket(websocketUrl);
      return;
    }

    this.connectEventSource(`${window.location.origin}/api/funding/stream`);
  }

  private connectWebSocket(url: string) {
    this.disconnectTransport();

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_MS;
    };

    socket.onmessage = (event) => {
      if (typeof event.data === "string") {
        this.handleMessage(event.data);
        return;
      }

      if (event.data instanceof Blob) {
        void event.data
          .text()
          .then((payload) => this.handleMessage(payload))
          .catch(() => undefined);
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.scheduleReconnect();
    };

    socket.onerror = () => {
      socket.close();
    };
  }

  private connectEventSource(url: string) {
    this.disconnectTransport();

    const eventSource = new EventSource(url);
    this.eventSource = eventSource;

    eventSource.onopen = () => {
      this.reconnectDelay = INITIAL_RECONNECT_MS;
    };

    eventSource.onmessage = (event) => {
      this.handleMessage(event.data);
    };

    eventSource.onerror = () => {
      if (this.eventSource !== eventSource) return;
      eventSource.close();
      this.eventSource = null;
      this.scheduleReconnect();
    };
  }

  private handleMessage(message: string) {
    try {
      this.handlePayload(JSON.parse(message) as unknown);
    } catch {
      return;
    }
  }

  private handlePayload(payload: unknown) {
    const event = normalizeFundingStreamEvent(payload);
    if (!event) return;

    if (event.id) {
      if (this.recentEventIdSet.has(event.id)) return;
      this.recentEventIds.push(event.id);
      this.recentEventIdSet.add(event.id);

      if (this.recentEventIds.length > MAX_RECENT_EVENT_IDS) {
        const oldestId = this.recentEventIds.shift();
        if (oldestId) this.recentEventIdSet.delete(oldestId);
      }
    }

    this.listeners.forEach((listener) => listener(event));
  }

  private scheduleReconnect() {
    if (typeof window === "undefined" || this.listeners.size === 0 || this.reconnectTimeout) {
      return;
    }

    const delay = this.reconnectDelay;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(
        MAX_RECONNECT_MS,
        Math.round(this.reconnectDelay * 1.5)
      );
      this.connect();
    }, delay);
  }

  private disconnectTransport() {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    if (this.eventSource) {
      this.eventSource.onopen = null;
      this.eventSource.onmessage = null;
      this.eventSource.onerror = null;
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private stop() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.disconnectTransport();
    this.reconnectDelay = INITIAL_RECONNECT_MS;
  }
}

declare global {
  var __novaFundingStreamClient__: FundingStreamClient | undefined;
}

function getFundingStreamClient() {
  if (!globalThis.__novaFundingStreamClient__) {
    globalThis.__novaFundingStreamClient__ = new FundingStreamClient();
  }

  return globalThis.__novaFundingStreamClient__;
}

export function subscribeToFundingUpdates(listener: FundingUpdateListener) {
  return getFundingStreamClient().subscribe(listener);
}
