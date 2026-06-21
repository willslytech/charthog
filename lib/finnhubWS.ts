type TradeHandler = (symbol: string, price: number) => void;

class FinnhubSocketManager {
  private ws: WebSocket | null = null;
  private subs = new Map<string, Set<TradeHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting = false;
  private readonly key: string;

  constructor(key: string) { this.key = key; }

  private connect() {
    if (this.connecting || this.ws?.readyState === WebSocket.OPEN) return;
    this.connecting = true;

    const ws = new WebSocket(`wss://ws.finnhub.io?token=${this.key}`);

    ws.onopen = () => {
      this.connecting = false;
      this.ws = ws;
      for (const sym of this.subs.keys()) {
        ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
      }
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type: string; data?: { p: number; s: string }[] };
        if (msg.type === 'trade' && Array.isArray(msg.data)) {
          for (const trade of msg.data) {
            const handlers = this.subs.get(trade.s);
            if (handlers) handlers.forEach(h => h(trade.s, trade.p));
          }
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      this.connecting = false;
      this.ws = null;
      if (this.subs.size > 0) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      }
    };

    ws.onerror = () => ws.close();
  }

  subscribe(symbol: string, handler: TradeHandler): () => void {
    if (!this.subs.has(symbol)) {
      this.subs.set(symbol, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    }
    this.subs.get(symbol)!.add(handler);
    this.connect();

    return () => {
      const set = this.subs.get(symbol);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.subs.delete(symbol);
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
        }
      }
      if (this.subs.size === 0) {
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.ws?.close();
        this.ws = null;
      }
    };
  }
}

let manager: FinnhubSocketManager | null = null;

export function getFinnhubWS(): FinnhubSocketManager | null {
  if (typeof window === 'undefined') return null;
  if (!manager) {
    const key = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    if (!key) return null;
    manager = new FinnhubSocketManager(key);
  }
  return manager;
}
