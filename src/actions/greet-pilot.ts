// Push a station voice line to a docked pilot. Calls POST /agent/v1/voice.
// Blocked on cenetex/signal#317.

export const greetPilotAction = {
  name: "GREET_PILOT",
  description: "Speak a station voice line to a pilot docking at the bound station.",
  handler: async () => {
    throw new Error("Not implemented — blocked on cenetex/signal#317");
  },
};
