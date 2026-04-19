import { describe, expect, it, vi } from "vitest";
import { SignalStationService } from "../services/station-service.js";
import { SignalApiError } from "../types.js";

function mkFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
) {
  return vi.fn(async (url: string, init: RequestInit) => handler(url, init));
}

function okJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("SignalStationService — REST", () => {
  it("bind() posts to /agent/v1/bind without auth and stores token", async () => {
    const fetchImpl = mkFetch((url, init) => {
      expect(url).toBe("https://signal.test/agent/v1/bind");
      expect(init.method).toBe("POST");
      const headers = init.headers as Record<string, string>;
      expect(headers.authorization).toBeUndefined();
      expect(JSON.parse(init.body as string)).toMatchObject({ slot: 3, pubkey: "PK" });
      return okJson({ token: "TOK", slot: 3, expires_at: 999 });
    });
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    const res = await svc.bind({
      slot: 3,
      pubkey: "PK",
      signature: "SIG",
      challenge: "C",
    });
    expect(res.token).toBe("TOK");
    // Subsequent authed calls should carry the minted token
    fetchImpl.mockImplementationOnce(async (_u, init) => {
      const h = init.headers as Record<string, string>;
      expect(h.authorization).toBe("Bearer TOK");
      return okJson({
        slot: 3,
        archetype: "kepler_yard",
        owner_pubkey: "PK",
        owner_label: null,
        hull: 100,
        hull_max: 100,
        credits: 0,
        inventory: [],
        prices: [],
        docked_pilots: [],
        available_upgrades: [],
      });
    });
    await svc.getStation();
  });

  it("getStation() sends bearer token", async () => {
    const fetchImpl = mkFetch((url, init) => {
      expect(url).toBe("https://signal.test/agent/v1/station");
      expect(init.method).toBe("GET");
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer T");
      return okJson({
        slot: 1,
        archetype: "prospect_refinery",
        owner_pubkey: null,
        owner_label: null,
        hull: 80,
        hull_max: 100,
        credits: 500,
        inventory: [],
        prices: [],
        docked_pilots: [],
        available_upgrades: [],
      });
    });
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      token: "T",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    const s = await svc.getStation();
    expect(s.slot).toBe(1);
    expect(s.credits).toBe(500);
  });

  it("setPrices() posts the prices payload", async () => {
    const fetchImpl = mkFetch((url, init) => {
      expect(url).toBe("https://signal.test/agent/v1/prices");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body as string)).toEqual({
        prices: [{ commodity: "ore", buy: 10, sell: 15 }],
      });
      return okJson({
        slot: 1,
        archetype: "prospect_refinery",
        owner_pubkey: null,
        owner_label: null,
        hull: 100,
        hull_max: 100,
        credits: 0,
        inventory: [],
        prices: [{ commodity: "ore", buy: 10, sell: 15 }],
        docked_pilots: [],
        available_upgrades: [],
      });
    });
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      token: "T",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    await svc.setPrices({ prices: [{ commodity: "ore", buy: 10, sell: 15 }] });
  });

  it("throws SignalApiError when the server returns a JSON error", async () => {
    const fetchImpl = mkFetch(() => okJson({ error: "slot already owned" }, 409));
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      token: "T",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    await expect(svc.getStation()).rejects.toBeInstanceOf(SignalApiError);
    await svc.getStation().catch((err: SignalApiError) => {
      expect(err.status).toBe(409);
      expect(err.endpoint).toBe("/agent/v1/station");
      expect(err.message).toContain("slot already owned");
    });
  });

  it("throws when calling authed endpoint without a token", async () => {
    const fetchImpl = mkFetch(() => okJson({}));
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    await expect(svc.getStation()).rejects.toBeInstanceOf(SignalApiError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("pollEvents() advances cursor and passes it on subsequent calls", async () => {
    const calls: string[] = [];
    const fetchImpl = mkFetch((url) => {
      calls.push(url);
      if (calls.length === 1) {
        return okJson([
          { cursor: "c1", event: { type: "dock", slot: 1, at: 1, pilot: {
            handle: "p1", ship_class: "miner", cargo: [], docked_at: 1,
          }}},
          { cursor: "c2", event: { type: "undock", slot: 1, at: 2, pilot_handle: "p1" }},
        ]);
      }
      return okJson([]);
    });
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      token: "T",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    await svc.pollEvents();
    await svc.pollEvents();
    expect(calls[0]).toBe("https://signal.test/agent/v1/events");
    expect(calls[1]).toBe("https://signal.test/agent/v1/events?since=c2");
  });

  it("trims trailing slash from apiUrl", async () => {
    const fetchImpl = mkFetch((url) => {
      expect(url).toBe("https://signal.test/agent/v1/station");
      return okJson({
        slot: 1, archetype: "helios_works", owner_pubkey: null, owner_label: null,
        hull: 1, hull_max: 1, credits: 0, inventory: [], prices: [],
        docked_pilots: [], available_upgrades: [],
      });
    });
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test/",
      token: "T",
      fetch: fetchImpl as unknown as typeof fetch,
      subscribe: false,
    });
    await svc.getStation();
  });
});

describe("SignalStationService — WS", () => {
  it("fans out parsed events to listeners", async () => {
    const listeners: Record<string, ((ev: unknown) => void)[]> = {};
    class MockWs {
      url: string;
      constructor(url: string) {
        this.url = url;
      }
      addEventListener(ev: string, fn: (e: unknown) => void) {
        (listeners[ev] ??= []).push(fn);
      }
      close() {}
    }
    const svc = new SignalStationService(undefined, {
      apiUrl: "https://signal.test",
      token: "T",
      fetch: vi.fn() as unknown as typeof fetch,
      webSocketCtor: MockWs as unknown as typeof WebSocket,
    });
    // start() isn't called in this direct-construction path; trigger connect via setToken
    svc.setToken("T");
    const seen: unknown[] = [];
    svc.onEvent((e) => seen.push(e));
    const envelope = {
      cursor: "c42",
      event: { type: "radio", slot: 1, at: 1, pilot_handle: "p1", line: "hi" },
    };
    for (const fn of listeners.message ?? []) {
      fn({ data: JSON.stringify(envelope) });
    }
    expect(seen).toHaveLength(1);
    expect((seen[0] as { type: string }).type).toBe("radio");
    await svc.stop();
  });
});
