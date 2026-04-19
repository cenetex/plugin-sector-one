import type { Action, ActionResult, IAgentRuntime, Memory } from "@elizaos/core";
import type { CommodityPrice } from "../types.js";
import { errorText, getService } from "./_helpers.js";

export const setPricesAction: Action = {
  name: "SET_STATION_PRICES",
  description:
    "Update buy/sell prices for commodities at the bound station. Input: an array of {commodity, buy, sell}. Partial updates are allowed.",
  similes: ["UPDATE_PRICES", "PRICE_STATION", "ADJUST_PRICES"],
  validate: async (runtime) => !!runtime.getSetting("SIGNAL_AGENT_TOKEN"),
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state,
    options,
  ): Promise<ActionResult> => {
    const params = (options?.parameters ?? options ?? {}) as Record<string, unknown>;
    const raw = params.prices;
    if (!Array.isArray(raw) || raw.length === 0) {
      return { success: false, error: "SET_STATION_PRICES requires prices: CommodityPrice[]" };
    }
    const prices = raw as CommodityPrice[];

    try {
      const state = await getService(runtime).setPrices({ prices });
      return {
        success: true,
        text: `Updated prices for ${prices.length} commodit${prices.length === 1 ? "y" : "ies"} at slot ${state.slot}.`,
        data: { prices: state.prices },
      };
    } catch (err) {
      return { success: false, error: errorText(err) };
    }
  },
  parameters: [
    {
      name: "prices",
      description: "Array of {commodity, buy, sell} entries to update",
      required: true,
      schema: { type: "array" },
    },
  ],
};
