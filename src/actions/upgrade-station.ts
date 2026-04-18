// Spend station credits on an available upgrade. Calls POST /agent/v1/upgrade.
// Blocked on cenetex/signal#317.

export const upgradeStationAction = {
  name: "UPGRADE_STATION",
  description: "Spend station credits on an upgrade (hull, tractor, capacity, voice module).",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#317");
  },
};
