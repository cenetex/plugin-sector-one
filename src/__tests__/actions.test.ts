import { describe, expect, it, vi } from "vitest";
import { bindStationAction } from "../actions/bind-station.js";
import { greetPilotAction } from "../actions/greet-pilot.js";
import { respondToRadioAction } from "../actions/respond-to-radio.js";
import { setPricesAction } from "../actions/set-prices.js";
import { stationStatusAction } from "../actions/station-status.js";
import { upgradeStationAction } from "../actions/upgrade-station.js";
import { SignalStationService } from "../services/station-service.js";

type AnyRuntime = Parameters<typeof bindStationAction.handler>[0];

function mkRuntime(service: Partial<SignalStationService> | null) {
  const settings: Record<string, string> = {
    SIGNAL_API_URL: "https://signal.test",
    SIGNAL_AGENT_TOKEN: "T",
  };
  return {
    getSetting: (k: string) => settings[k] ?? null,
    getService: () => service,
  } as unknown as AnyRuntime;
}

const msg = {} as Parameters<typeof bindStationAction.handler>[1];

describe("actions", () => {
  it("BIND_STATION validates required params", async () => {
    const runtime = mkRuntime({ bind: vi.fn() });
    const res = await bindStationAction.handler(runtime, msg, undefined, {
      parameters: { slot: 1 },
    });
    expect(res?.success).toBe(false);
    expect(res?.error).toContain("slot, pubkey, signature, challenge");
  });

  it("BIND_STATION calls service.bind() and returns token data", async () => {
    const bind = vi.fn().mockResolvedValue({ token: "TOK", slot: 2, expires_at: 123 });
    const runtime = mkRuntime({ bind } as unknown as Partial<SignalStationService>);
    const res = await bindStationAction.handler(runtime, msg, undefined, {
      parameters: {
        slot: 2, pubkey: "PK", signature: "S", challenge: "C", owner_label: "Kyro's Works",
      },
    });
    expect(res?.success).toBe(true);
    expect(bind).toHaveBeenCalledWith({
      slot: 2, pubkey: "PK", signature: "S", challenge: "C", owner_label: "Kyro's Works",
    });
    expect(res?.data?.slot).toBe(2);
  });

  it("SET_STATION_PRICES rejects empty prices", async () => {
    const runtime = mkRuntime({ setPrices: vi.fn() });
    const res = await setPricesAction.handler(runtime, msg, undefined, {
      parameters: { prices: [] },
    });
    expect(res?.success).toBe(false);
  });

  it("SET_STATION_PRICES forwards payload", async () => {
    const setPrices = vi.fn().mockResolvedValue({
      slot: 1, archetype: "prospect_refinery", owner_pubkey: null, owner_label: null,
      hull: 1, hull_max: 1, credits: 0, inventory: [],
      prices: [{ commodity: "ore", buy: 5, sell: 7 }],
      docked_pilots: [], available_upgrades: [],
    });
    const runtime = mkRuntime({ setPrices } as unknown as Partial<SignalStationService>);
    const res = await setPricesAction.handler(runtime, msg, undefined, {
      parameters: { prices: [{ commodity: "ore", buy: 5, sell: 7 }] },
    });
    expect(res?.success).toBe(true);
    expect(setPrices).toHaveBeenCalledWith({
      prices: [{ commodity: "ore", buy: 5, sell: 7 }],
    });
  });

  it("GREET_PILOT requires a line and hits the dock channel", async () => {
    const sendVoice = vi.fn().mockResolvedValue(undefined);
    const runtime = mkRuntime({ sendVoice } as unknown as Partial<SignalStationService>);
    const empty = await greetPilotAction.handler(runtime, msg, undefined, {
      parameters: { line: "" },
    });
    expect(empty?.success).toBe(false);

    const ok = await greetPilotAction.handler(runtime, msg, undefined, {
      parameters: { pilot_handle: "kyro", line: "welcome" },
    });
    expect(ok?.success).toBe(true);
    expect(sendVoice).toHaveBeenCalledWith({
      channel: "dock", pilot_handle: "kyro", line: "welcome",
    });
  });

  it("RESPOND_TO_RADIO uses the radio channel", async () => {
    const sendVoice = vi.fn().mockResolvedValue(undefined);
    const runtime = mkRuntime({ sendVoice } as unknown as Partial<SignalStationService>);
    await respondToRadioAction.handler(runtime, msg, undefined, {
      parameters: { pilot_handle: "p1", line: "copy that" },
    });
    expect(sendVoice).toHaveBeenCalledWith({
      channel: "radio", pilot_handle: "p1", line: "copy that",
    });
  });

  it("UPGRADE_STATION rejects invalid kinds", async () => {
    const runtime = mkRuntime({ upgrade: vi.fn() });
    const res = await upgradeStationAction.handler(runtime, msg, undefined, {
      parameters: { kind: "warp_core" },
    });
    expect(res?.success).toBe(false);
  });

  it("UPGRADE_STATION accepts valid kind", async () => {
    const upgrade = vi.fn().mockResolvedValue({
      kind: "hull", new_level: 2, credits_remaining: 120,
    });
    const runtime = mkRuntime({ upgrade } as unknown as Partial<SignalStationService>);
    const res = await upgradeStationAction.handler(runtime, msg, undefined, {
      parameters: { kind: "hull" },
    });
    expect(res?.success).toBe(true);
    expect(res?.data?.level).toBe(2);
  });

  it("STATION_STATUS summarises key fields", async () => {
    const getStation = vi.fn().mockResolvedValue({
      slot: 1,
      archetype: "kepler_yard",
      owner_pubkey: "PK",
      owner_label: "Kyro's Yard",
      hull: 80,
      hull_max: 100,
      credits: 250,
      inventory: [{ commodity: "ore", quantity: 40 }],
      prices: [],
      docked_pilots: [{ handle: "p1", ship_class: "miner", cargo: [], docked_at: 1 }],
      available_upgrades: [],
    });
    const runtime = mkRuntime({ getStation } as unknown as Partial<SignalStationService>);
    const res = await stationStatusAction.handler(runtime, msg);
    expect(res?.success).toBe(true);
    expect(res?.text).toContain("kepler_yard");
    expect(res?.text).toContain("80/100");
    expect(res?.text).toContain("40 ore");
  });

  it("fails gracefully when the service is not registered", async () => {
    const runtime = mkRuntime(null);
    const res = await stationStatusAction.handler(runtime, msg);
    expect(res?.success).toBe(false);
    expect(res?.error).toContain("SignalStationService not registered");
  });
});
