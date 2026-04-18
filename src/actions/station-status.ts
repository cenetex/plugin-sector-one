// Report current station state. Calls GET /agent/v1/station.
// Blocked on cenetex/signal#317.

export const stationStatusAction = {
  name: "STATION_STATUS",
  description: "Report inventory, hull, credits, prices, and docked pilots for the bound station.",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#317");
  },
};
