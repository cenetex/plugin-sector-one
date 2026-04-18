// Set buy/sell prices per commodity. Calls POST /agent/v1/prices.
// Blocked on cenetex/signal#317.

export const setPricesAction = {
  name: "SET_STATION_PRICES",
  description: "Update buy/sell prices for commodities at the bound station.",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#317");
  },
};
