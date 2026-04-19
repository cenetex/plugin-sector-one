import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import { errorText, getService } from "./_helpers.js";

export const stationStatusAction: Action = {
  name: "STATION_STATUS",
  description:
    "Report inventory, hull, credits, prices, and docked pilots for the bound station. Use to brief the character on current station state before making decisions.",
  similes: ["READ_STATION", "CHECK_STATION", "GET_STATION_STATE"],
  validate: async (runtime) => !!runtime.getSetting("SIGNAL_AGENT_TOKEN"),
  handler: async (runtime: IAgentRuntime, _message: Memory): Promise<ActionResult> => {
    try {
      const s = await getService(runtime).getStation();
      const summary = [
        `Slot ${s.slot} (${s.archetype})`,
        `hull ${s.hull}/${s.hull_max}`,
        `credits ${s.credits}`,
        `inventory ${s.inventory.map((i) => `${i.quantity} ${i.commodity}`).join(", ") || "empty"}`,
        `docked ${s.docked_pilots.length} pilot${s.docked_pilots.length === 1 ? "" : "s"}`,
      ].join(" · ");
      return { success: true, text: summary, data: { station: s } };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
};
