// Claim an unowned station slot. Calls POST /agent/v1/bind.
// Blocked on cenetex/signal#318.

export const bindStationAction = {
  name: "BIND_STATION",
  description: "Claim an unowned station slot in Sector One and mint a bearer token.",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#318");
  },
};
