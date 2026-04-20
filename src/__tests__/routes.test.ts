import { describe, expect, it, vi } from "vitest";
import { handleAppRoutes, type RouteContext } from "../routes.js";
import { SignalStationService } from "../services/station-service.js";
import type { StationState } from "../types.js";

function mkRes() {
  const headers: Record<string, string> = {};
  const removed: string[] = [];
  let body: string | undefined;
  let statusCode = 0;
  return {
    res: {
      get statusCode() {
        return statusCode;
      },
      set statusCode(v: number) {
        statusCode = v;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader(name: string) {
        removed.push(name.toLowerCase());
        delete headers[name.toLowerCase()];
      },
      end(b?: string) {
        body = b;
      },
    },
    headers,
    removed,
    get body() {
      return body;
    },
    get status() {
      return statusCode;
    },
  };
}

function mkCtx(method: string, pathname: string, runtime: unknown, res: any, bodyJson?: unknown): RouteContext {
  const url = new URL(`http://localhost${pathname}`);
  return {
    method,
    pathname,
    url,
    runtime,
    res,
    error: vi.fn((r: any, message: string, status?: number) => {
      r.statusCode = status ?? 500;
      r.end(JSON.stringify({ error: message }));
    }),
    json: vi.fn((r: any, data: unknown, status?: number) => {
      r.statusCode = status ?? 200;
      r.setHeader("Content-Type", "application/json");
      r.end(JSON.stringify(data));
    }),
    readJsonBody: vi.fn(async () => bodyJson ?? {}),
  };
}

const STATION: StationState = {
  slot: 7,
  archetype: "prospect_refinery",
  owner_pubkey: "OWNER",
  owner_label: "Test Station",
  hull: 800,
  hull_max: 1000,
  credits: 12_345,
  inventory: [{ commodity: "ore", quantity: 42 }],
  prices: [{ commodity: "ore", buy: 10, sell: 14 }],
  docked_pilots: [],
  available_upgrades: [],
};

function mkRuntime(opts: { station?: StationState | "throw-401" | "throw-other" }) {
  const service = new SignalStationService(undefined, {
    apiUrl: "https://signal.test",
    fetch: (async () => {
      throw new Error("not used — getStation overridden");
    }) as any,
    subscribe: false,
  });
  service.getStation = vi.fn(async () => {
    if (opts.station === "throw-401") {
      const { SignalApiError } = await import("../types.js");
      throw new SignalApiError(401, "/agent/v1/station", "no token");
    }
    if (opts.station === "throw-other") {
      throw new Error("network down");
    }
    if (!opts.station) throw new Error("no station configured");
    return opts.station;
  }) as any;

  return {
    agentId: "agent-123",
    character: { name: "Kyro" },
    getSetting: (key: string) => (key === "SIGNAL_API_URL" ? "https://signal.test" : undefined),
    getService: <T>(type: string) => (type === SignalStationService.serviceType ? (service as unknown as T) : null),
  };
}

describe("handleAppRoutes — viewer", () => {
  it("serves HTML with frame-ancestors CSP and no X-Frame-Options", async () => {
    const r = mkRes();
    r.res.setHeader("X-Frame-Options", "DENY");
    const ctx = mkCtx("GET", "/api/apps/sector-one/viewer", mkRuntime({ station: STATION }), r.res);
    const handled = await handleAppRoutes(ctx);
    expect(handled).toBe(true);
    expect(r.status).toBe(200);
    expect(r.headers["content-type"]).toBe("text/html; charset=utf-8");
    expect(r.headers["content-security-policy"]).toMatch(/frame-ancestors/);
    expect(r.removed).toContain("x-frame-options");
    expect(r.body).toContain("Sector One");
    expect(r.body).toContain("Kyro");
  });

  it("returns false for unknown paths", async () => {
    const r = mkRes();
    const ctx = mkCtx("GET", "/api/apps/sector-one/nope", mkRuntime({ station: STATION }), r.res);
    const handled = await handleAppRoutes(ctx);
    expect(handled).toBe(false);
  });
});

describe("handleAppRoutes — session GET", () => {
  it("returns running AppSessionState with station telemetry", async () => {
    const r = mkRes();
    const ctx = mkCtx("GET", "/api/apps/sector-one/session/sector-one:agent-123", mkRuntime({ station: STATION }), r.res);
    const handled = await handleAppRoutes(ctx);
    expect(handled).toBe(true);
    const body = JSON.parse(r.body!);
    expect(body.appName).toBe("@cenetex/plugin-sector-one");
    expect(body.mode).toBe("spectate-and-steer");
    expect(body.status).toBe("running");
    expect(body.canSendCommands).toBe(true);
    expect(body.telemetry.slot).toBe(7);
    expect(body.telemetry.credits).toBe(12345);
  });

  it("returns unbound status on 401 from station API", async () => {
    const r = mkRes();
    const ctx = mkCtx("GET", "/api/apps/sector-one/session/sector-one:agent-123", mkRuntime({ station: "throw-401" }), r.res);
    await handleAppRoutes(ctx);
    const body = JSON.parse(r.body!);
    expect(body.status).toBe("unbound");
    expect(body.canSendCommands).toBe(false);
  });

  it("returns degraded when station API throws non-401", async () => {
    const r = mkRes();
    const ctx = mkCtx("GET", "/api/apps/sector-one/session/sector-one:agent-123", mkRuntime({ station: "throw-other" }), r.res);
    await handleAppRoutes(ctx);
    const body = JSON.parse(r.body!);
    expect(body.status).toBe("degraded");
    expect(body.summary).toContain("network down");
  });
});

describe("handleAppRoutes — control + command", () => {
  it("control returns no-op success", async () => {
    const r = mkRes();
    const ctx = mkCtx("POST", "/api/apps/sector-one/session/abc/control", mkRuntime({ station: STATION }), r.res, { action: "pause" });
    const handled = await handleAppRoutes(ctx);
    expect(handled).toBe(true);
    expect(JSON.parse(r.body!)).toMatchObject({ success: true });
  });

  it("command echoes prompt and returns refreshed session", async () => {
    const r = mkRes();
    const ctx = mkCtx(
      "POST",
      "/api/apps/sector-one/session/abc/command",
      mkRuntime({ station: STATION }),
      r.res,
      { type: "suggestion", prompt: "Greet next pilot" },
    );
    const handled = await handleAppRoutes(ctx);
    expect(handled).toBe(true);
    const body = JSON.parse(r.body!);
    expect(body.success).toBe(true);
    expect(body.message).toContain("Greet next pilot");
    expect(body.session.status).toBe("running");
  });
});
