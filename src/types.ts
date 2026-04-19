// Types mirror the API contracts in cenetex/signal#317 and #318.
// Keep these in sync with `server/sim_agent_api.h` once it lands.

export type Commodity =
  | "ore"
  | "ice"
  | "scrap"
  | "fuel"
  | "refined_metal"
  | "components"
  | "exotic";

export type ShipClass =
  | "scout"
  | "miner"
  | "hauler"
  | "courier"
  | "frigate"
  | "capital";

export type StationArchetype =
  | "prospect_refinery"
  | "kepler_yard"
  | "helios_works";

export interface CommodityPrice {
  commodity: Commodity;
  buy: number;
  sell: number;
}

export interface CargoItem {
  commodity: Commodity;
  quantity: number;
}

export interface DockedPilot {
  handle: string;
  ship_class: ShipClass;
  cargo: CargoItem[];
  docked_at: number;
}

export interface StationState {
  slot: number;
  archetype: StationArchetype;
  owner_pubkey: string | null;
  owner_label: string | null;
  hull: number;
  hull_max: number;
  credits: number;
  inventory: CargoItem[];
  prices: CommodityPrice[];
  docked_pilots: DockedPilot[];
  available_upgrades: StationUpgrade[];
}

export type UpgradeKind =
  | "hull"
  | "tractor"
  | "capacity"
  | "voice_module"
  | "radar";

export interface StationUpgrade {
  kind: UpgradeKind;
  level: number;
  cost_credits: number;
  description: string;
}

export type VoiceChannel = "dock" | "radio";

export interface BindRequest {
  slot: number;
  pubkey: string;
  signature: string;
  challenge: string;
  owner_label?: string;
}

export interface BindResponse {
  token: string;
  slot: number;
  expires_at: number;
}

export interface SetPricesRequest {
  prices: CommodityPrice[];
}

export interface VoiceRequest {
  channel: VoiceChannel;
  pilot_handle?: string;
  line: string;
}

export interface UpgradeRequest {
  kind: UpgradeKind;
}

export interface UpgradeResponse {
  kind: UpgradeKind;
  new_level: number;
  credits_remaining: number;
}

export interface DockEvent {
  type: "dock";
  slot: number;
  at: number;
  pilot: DockedPilot;
}

export interface UndockEvent {
  type: "undock";
  slot: number;
  at: number;
  pilot_handle: string;
}

export interface TradeEvent {
  type: "trade";
  slot: number;
  at: number;
  pilot_handle: string;
  commodity: Commodity;
  quantity: number;
  side: "buy" | "sell";
  credits_delta: number;
}

export interface RadioEvent {
  type: "radio";
  slot: number;
  at: number;
  pilot_handle: string;
  line: string;
}

export interface RepairEvent {
  type: "repair";
  slot: number;
  at: number;
  pilot_handle: string;
  hull_repaired: number;
  cost: number;
}

export type StationEvent =
  | DockEvent
  | UndockEvent
  | TradeEvent
  | RadioEvent
  | RepairEvent;

export interface StationEventEnvelope {
  cursor: string;
  event: StationEvent;
}

export class SignalApiError extends Error {
  constructor(
    public status: number,
    public endpoint: string,
    message: string,
    public body?: unknown,
  ) {
    super(`[${status}] ${endpoint}: ${message}`);
    this.name = "SignalApiError";
  }
}
