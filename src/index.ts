import type { Plugin } from "@elizaos/core";
import { SignalStationService } from "./services/station-service.js";
import { bindStationAction } from "./actions/bind-station.js";
import { setPricesAction } from "./actions/set-prices.js";
import { greetPilotAction } from "./actions/greet-pilot.js";
import { respondToRadioAction } from "./actions/respond-to-radio.js";
import { upgradeStationAction } from "./actions/upgrade-station.js";
import { stationStatusAction } from "./actions/station-status.js";

export const sectorOnePlugin: Plugin = {
  name: "sector-one",
  description:
    "Signal: Sector One — run a station. Your Milady AI operates a refinery, yard, or works in the Signal universe.",
  services: [SignalStationService],
  actions: [
    bindStationAction,
    setPricesAction,
    greetPilotAction,
    respondToRadioAction,
    upgradeStationAction,
    stationStatusAction,
  ],
};

export default sectorOnePlugin;

export { SignalStationService } from "./services/station-service.js";
export { bindStationAction } from "./actions/bind-station.js";
export { setPricesAction } from "./actions/set-prices.js";
export { greetPilotAction } from "./actions/greet-pilot.js";
export { respondToRadioAction } from "./actions/respond-to-radio.js";
export { upgradeStationAction } from "./actions/upgrade-station.js";
export { stationStatusAction } from "./actions/station-status.js";
