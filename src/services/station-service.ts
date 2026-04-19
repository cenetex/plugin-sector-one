// Thin client for Signal: Sector One's station control API.
// REST + WS surface is defined in cenetex/signal#317 and #318.

import { Service, type IAgentRuntime } from "@elizaos/core";
import {
  SignalApiError,
  type BindRequest,
  type BindResponse,
  type SetPricesRequest,
  type StationEvent,
  type StationEventEnvelope,
  type StationState,
  type UpgradeRequest,
  type UpgradeResponse,
  type VoiceRequest,
} from "../types.js";

export interface StationServiceConfig {
  apiUrl: string;
  token?: string;
  fetch?: typeof fetch;
  webSocketCtor?: typeof WebSocket;
  subscribe?: boolean;
}

type EventListener = (event: StationEvent) => void;

export class SignalStationService extends Service {
  static serviceType = "sector-one-station";
  capabilityDescription =
    "Operate a station in Signal: Sector One via the agent control API.";

  apiUrl: string;
  private token: string | undefined;
  private fetchImpl: typeof fetch;
  private webSocketCtor: typeof WebSocket | undefined;
  private ws: WebSocket | undefined;
  private listeners = new Set<EventListener>();
  private lastCursor: string | undefined;
  private shouldSubscribe: boolean;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private stopped = false;

  constructor(runtime?: IAgentRuntime, config?: StationServiceConfig) {
    super(runtime);
    const resolved = resolveConfig(runtime, config);
    this.apiUrl = resolved.apiUrl;
    this.token = resolved.token;
    this.fetchImpl = resolved.fetch ?? globalThis.fetch.bind(globalThis);
    this.webSocketCtor =
      resolved.webSocketCtor ??
      (typeof globalThis.WebSocket === "function"
        ? globalThis.WebSocket
        : undefined);
    this.shouldSubscribe = resolved.subscribe ?? true;
  }

  static async start(runtime: IAgentRuntime): Promise<SignalStationService> {
    const service = new SignalStationService(runtime);
    if (service.token && service.shouldSubscribe) service.connectWs();
    return service;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore — socket may already be closed
      }
      this.ws = undefined;
    }
    this.listeners.clear();
  }

  setToken(token: string): void {
    this.token = token;
    if (this.shouldSubscribe) this.connectWs();
  }

  onEvent(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async bind(req: BindRequest): Promise<BindResponse> {
    const res = await this.request<BindResponse>("POST", "/agent/v1/bind", req, {
      auth: false,
    });
    this.setToken(res.token);
    return res;
  }

  async release(): Promise<void> {
    await this.request<void>("POST", "/agent/v1/release", {});
    this.token = undefined;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = undefined;
    }
  }

  getStation(): Promise<StationState> {
    return this.request<StationState>("GET", "/agent/v1/station");
  }

  setPrices(req: SetPricesRequest): Promise<StationState> {
    return this.request<StationState>("POST", "/agent/v1/prices", req);
  }

  sendVoice(req: VoiceRequest): Promise<void> {
    return this.request<void>("POST", "/agent/v1/voice", req);
  }

  upgrade(req: UpgradeRequest): Promise<UpgradeResponse> {
    return this.request<UpgradeResponse>("POST", "/agent/v1/upgrade", req);
  }

  async pollEvents(since?: string): Promise<StationEventEnvelope[]> {
    const cursor = since ?? this.lastCursor;
    const path = cursor
      ? `/agent/v1/events?since=${encodeURIComponent(cursor)}`
      : "/agent/v1/events";
    const envelopes = await this.request<StationEventEnvelope[]>("GET", path);
    if (envelopes.length > 0) {
      this.lastCursor = envelopes[envelopes.length - 1].cursor;
    }
    return envelopes;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    opts: { auth?: boolean } = {},
  ): Promise<T> {
    const auth = opts.auth ?? true;
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (auth) {
      if (!this.token) {
        throw new SignalApiError(
          401,
          path,
          "no bearer token — call bind() or set SIGNAL_AGENT_TOKEN",
        );
      }
      headers.authorization = `Bearer ${this.token}`;
    }

    const res = await this.fetchImpl(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
      let parsed: unknown;
      try {
        parsed = await res.json();
      } catch {
        parsed = await res.text().catch(() => undefined);
      }
      const message =
        (parsed && typeof parsed === "object" && "error" in parsed
          ? String((parsed as { error: unknown }).error)
          : undefined) ?? res.statusText;
      throw new SignalApiError(res.status, path, message, parsed);
    }

    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) return (await res.json()) as T;
    return undefined as T;
  }

  private connectWs(): void {
    if (!this.webSocketCtor || !this.token || this.stopped) return;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    const wsUrl = this.apiUrl.replace(/^http/, "ws") + "/agent/v1/events";
    const url = this.lastCursor
      ? `${wsUrl}?since=${encodeURIComponent(this.lastCursor)}`
      : wsUrl;
    // Signal accepts bearer via `token` query param for WS handshake — some
    // environments can't set Authorization on upgrade requests.
    const authed = `${url}${url.includes("?") ? "&" : "?"}token=${encodeURIComponent(this.token)}`;
    const ws = new this.webSocketCtor(authed);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempt = 0;
    });
    ws.addEventListener("message", (ev: MessageEvent) => {
      const raw = typeof ev.data === "string" ? ev.data : ev.data?.toString();
      if (!raw) return;
      try {
        const env = JSON.parse(raw) as StationEventEnvelope;
        this.lastCursor = env.cursor;
        for (const fn of this.listeners) fn(env.event);
      } catch {
        // drop malformed frames; server is expected to send JSON envelopes
      }
    });
    ws.addEventListener("close", () => {
      this.ws = undefined;
      this.scheduleReconnect();
    });
    ws.addEventListener("error", () => {
      try {
        ws.close();
      } catch {
        // close() may throw if already closed
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || !this.token) return;
    const delay = Math.min(30_000, 500 * 2 ** this.reconnectAttempt++);
    this.reconnectTimer = setTimeout(() => this.connectWs(), delay);
  }
}

function resolveConfig(
  runtime: IAgentRuntime | undefined,
  override: StationServiceConfig | undefined,
): StationServiceConfig {
  const getSetting = (key: string): string | undefined => {
    const v = runtime?.getSetting?.(key);
    return typeof v === "string" && v.length > 0 ? v : undefined;
  };
  const apiUrl =
    override?.apiUrl ?? getSetting("SIGNAL_API_URL") ?? "https://signal.ratimics.com";
  const token = override?.token ?? getSetting("SIGNAL_AGENT_TOKEN");
  return {
    apiUrl: apiUrl.replace(/\/$/, ""),
    token,
    fetch: override?.fetch,
    webSocketCtor: override?.webSocketCtor,
    subscribe: override?.subscribe,
  };
}
